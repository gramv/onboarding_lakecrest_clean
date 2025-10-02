"""
Voided Check OCR Processing Service using OpenAI GPT-5 Vision API
Automated extraction of banking information for direct deposit setup
Using GPT-5 models (released August 2025) for enhanced accuracy and lower hallucination rates
"""
import base64
import json
import logging
import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from openai import OpenAI

logger = logging.getLogger(__name__)

class VoidedCheckOCRService:
    """OCR service for voided check and bank letter processing using OpenAI GPT-5 Vision API"""
    
    # Available vision models - Using GPT-5 as primary with GPT-4o fallback
    PRIMARY_MODEL = "gpt-5"  # Full GPT-5 for maximum accuracy ($1.25/1M input, $10/1M output)
    FALLBACK_MODEL = "gpt-4o"  # GPT-4o as fallback (proven reliable for OCR tasks)
    
    # Known routing number patterns for major banks
    BANK_ROUTING_PATTERNS = {
        "Bank of America": r"^(026009593|063100277|111000012|111000025|121000358|122000661)",
        "Chase": r"^(021000021|021000089|021001088|022000868|071000013|111000614)",
        "Wells Fargo": r"^(021101108|062000019|062000080|091000019|102000076|121000248)",
        "Citibank": r"^(021000089|021001486|021002011|022000868|091409571|266086554)",
        "US Bank": r"^(042000013|042100175|091000022|092900383|103000648|121201694)",
        "PNC": r"^(031000053|031100089|031207607|041000124|043000096|054000030)",
        "TD Bank": r"^(011103093|031201360|036001808|211274450|211370545)",
        "Capital One": r"^(051405515|056009482|056073573|065000090)",
        "Regions": r"^(062000019|062001186|062005690|063104668|074014213)",
        "SunTrust/Truist": r"^(061000104|063100277|061019949|067014822)"
    }
    
    def __init__(self, openai_client: OpenAI):
        self.openai_client = openai_client
        
    def extract_check_data(self, image_data: str, file_name: str) -> Dict[str, Any]:
        """Extract banking information from voided check or bank letter image"""
        
        try:
            # Prepare image for Groq API
            image_base64 = self._prepare_image(image_data)
            
            # Get extraction prompt
            extraction_prompt = self._get_check_extraction_prompt()
            
            logger.info(f"Processing voided check/bank letter with OpenAI GPT-5 Vision API")
            
            # Call OpenAI Vision API with fallback support
            try:
                # Try primary model first (Full GPT-5 with standard chat completions)
                try:
                    response = self.openai_client.chat.completions.create(
                        model=self.PRIMARY_MODEL,
                        messages=[
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": extraction_prompt
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {
                                            "url": f"data:image/jpeg;base64,{image_base64}"
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature=0.1,
                        max_tokens=1000,
                        response_format={"type": "json_object"}
                    )
                    # Extract the text content from GPT-4o response
                    logger.debug(f"Full response object: {response}")
                    logger.debug(f"Response choices: {response.choices if hasattr(response, 'choices') else 'No choices'}")
                    
                    if response.choices and len(response.choices) > 0:
                        response_text = response.choices[0].message.content
                        logger.debug(f"Extracted response text length: {len(response_text) if response_text else 0}")
                    else:
                        raise ValueError("No choices in OpenAI response")
                    
                    logger.info(f"Successfully used primary model: {self.PRIMARY_MODEL}")
                except Exception as primary_error:
                    logger.warning(f"Primary model failed: {primary_error}, trying fallback")
                    # Fallback to GPT-4o
                    try:
                        response = self.openai_client.chat.completions.create(
                            model=self.FALLBACK_MODEL,
                            messages=[
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": extraction_prompt
                                        },
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{image_base64}"
                                            }
                                        }
                                    ]
                                }
                            ],
                            temperature=0.1,
                            max_tokens=1000,
                            response_format={"type": "json_object"}
                        )
                        response_text = response.choices[0].message.content
                        logger.info(f"Successfully used fallback model: {self.FALLBACK_MODEL}")
                    except Exception as fallback_error:
                        logger.error(f"Both primary and fallback models failed: {fallback_error}")
                        raise fallback_error
                
                # Parse the response
                logger.info(f"OpenAI API response received for check OCR")
                
                # Validate response text before parsing
                if not response_text:
                    raise ValueError("Empty response from OpenAI API")
                
                logger.debug(f"Response text preview: {response_text[:200]}...")
                
                # Parse JSON response with error handling
                try:
                    ocr_result = json.loads(response_text)
                except json.JSONDecodeError as json_error:
                    logger.error(f"Failed to parse JSON response: {json_error}")
                    logger.error(f"Response text was: {response_text}")
                    raise ValueError(f"Invalid JSON response from OpenAI: {json_error}")
                
                # Validate and enhance extracted data
                validation_result = self._validate_check_data(ocr_result)
                
                # Try to identify bank from routing number
                bank_name = self._identify_bank_from_routing(
                    ocr_result.get("routing_number", "")
                )
                
                # Calculate confidence scores
                confidence_scores = self._calculate_field_confidence(ocr_result)
                
                return {
                    "success": True,
                    "extracted_data": {
                        **ocr_result,
                        "suggested_bank_name": bank_name if bank_name else ocr_result.get("bank_name", "")
                    },
                    "validation": validation_result,
                    "confidence_scores": confidence_scores,
                    "requires_review": self._needs_manual_review(confidence_scores),
                    "processing_notes": self._generate_processing_notes(ocr_result, validation_result)
                }
                
            except Exception as api_error:
                logger.error(f"OpenAI Vision API error: {str(api_error)}")
                return {
                    "success": False,
                    "error": str(api_error),
                    "extracted_data": {},
                    "confidence_scores": {},
                    "requires_review": True,
                    "processing_notes": [f"OCR processing failed: {str(api_error)}"]
                }
                
        except Exception as e:
            logger.error(f"Check OCR processing error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "extracted_data": {},
                "confidence_scores": {},
                "requires_review": True,
                "processing_notes": [f"Processing error: {str(e)}"]
            }
    
    def _prepare_image(self, image_data: str) -> str:
        """Prepare image for API call"""
        # Remove data URL prefix if present
        if "base64," in image_data:
            return image_data.split("base64,")[1]
        return image_data
    
    def _get_check_extraction_prompt(self) -> str:
        """Generate optimized prompt for GPT-5 vision models with JSON mode"""
        return """You are helping with document OCR for legitimate business purposes. Please analyze this document image and extract any visible text and numbers.

This is for an HR onboarding system where employees provide banking documents for payroll setup.

Please return a JSON object with any information you can clearly read from the document:

{
    "bank_name": "name of bank if visible",
    "routing_number": "9-digit number if clearly visible",
    "account_number": "account number if visible (preserve all digits including leading zeros)",
    "check_number": "check number if visible",
    "account_holder_name": "name on document if visible",
    "bank_address": "bank address if visible",
    "account_type": "checking or savings if specified",
    "document_type": "voided_check or bank_letter or other",
    "micr_line_raw": "any numbers visible at bottom of document",
    "extraction_confidence": {
        "bank_name": "high|medium|low",
        "routing_number": "high|medium|low", 
        "account_number": "high|medium|low",
        "overall": "high|medium|low"
    }
}

If you cannot clearly read any banking information, please return null values for those fields.
Return ONLY the JSON object, no explanations."""
    
    def _validate_check_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted check data"""
        validation_results = {
            "is_valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Validate routing number
        routing_number = data.get("routing_number", "")
        if routing_number:
            if not re.match(r"^\d{9}$", routing_number):
                validation_results["errors"].append(
                    f"Invalid routing number format: {routing_number} (must be 9 digits)"
                )
                validation_results["is_valid"] = False
            elif not self._validate_routing_checksum(routing_number):
                validation_results["warnings"].append(
                    "Routing number failed checksum validation - please verify"
                )
        else:
            validation_results["errors"].append("No routing number extracted")
            validation_results["is_valid"] = False
        
        # Validate account number
        account_number = data.get("account_number", "")
        if account_number:
            if not re.match(r"^\d{4,17}$", account_number):
                validation_results["warnings"].append(
                    f"Unusual account number format: {account_number}"
                )
        else:
            validation_results["errors"].append("No account number extracted")
            validation_results["is_valid"] = False
        
        # Check for bank name
        if not data.get("bank_name"):
            validation_results["warnings"].append("Bank name not extracted")
        
        return validation_results
    
    def _validate_routing_checksum(self, routing_number: str) -> bool:
        """Validate routing number using ABA checksum algorithm"""
        if len(routing_number) != 9 or not routing_number.isdigit():
            return False
        
        # ABA routing number checksum
        weights = [3, 7, 1, 3, 7, 1, 3, 7]
        checksum = sum(int(routing_number[i]) * weights[i] for i in range(8))
        check_digit = (10 - (checksum % 10)) % 10
        
        return check_digit == int(routing_number[8])
    
    def _identify_bank_from_routing(self, routing_number: str) -> Optional[str]:
        """Identify bank name from routing number patterns"""
        if not routing_number or len(routing_number) != 9:
            return None
        
        for bank_name, pattern in self.BANK_ROUTING_PATTERNS.items():
            if re.match(pattern, routing_number):
                return bank_name
        
        return None
    
    def _calculate_field_confidence(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence scores for extracted fields"""
        confidence_scores = {}
        
        # Get extraction confidence from OCR result
        extraction_conf = data.get("extraction_confidence", {})
        
        # Convert text confidence to numeric scores
        conf_mapping = {"high": 0.95, "medium": 0.75, "low": 0.50}
        
        for field in ["bank_name", "routing_number", "account_number"]:
            text_conf = extraction_conf.get(field, "low")
            base_score = conf_mapping.get(text_conf, 0.5)
            
            # Adjust confidence based on validation
            if field == "routing_number" and data.get(field):
                if self._validate_routing_checksum(data[field]):
                    base_score = min(1.0, base_score + 0.1)
                else:
                    base_score = max(0.0, base_score - 0.2)
            
            confidence_scores[field] = base_score
        
        # Overall confidence
        if confidence_scores:
            confidence_scores["overall"] = sum(confidence_scores.values()) / len(confidence_scores)
        else:
            confidence_scores["overall"] = 0.0
        
        return confidence_scores
    
    def _needs_manual_review(self, confidence_scores: Dict[str, float]) -> bool:
        """Determine if manual review is needed based on confidence scores"""
        # Require review if any critical field has low confidence
        critical_fields = ["routing_number", "account_number"]
        for field in critical_fields:
            if confidence_scores.get(field, 0) < 0.90:
                return True
        
        # Require review if overall confidence is low
        if confidence_scores.get("overall", 0) < 0.85:
            return True
        
        return False
    
    def _generate_processing_notes(self, data: Dict[str, Any], 
                                  validation: Dict[str, Any]) -> List[str]:
        """Generate processing notes for the extraction"""
        notes = []
        
        # Add validation errors and warnings
        for error in validation.get("errors", []):
            notes.append(f"Error: {error}")
        
        for warning in validation.get("warnings", []):
            notes.append(f"Warning: {warning}")
        
        # Add extraction notes
        if data.get("document_type") == "bank_letter":
            notes.append("Extracted from bank verification letter")
        
        # Check if bank name was identified from routing
        if data.get("suggested_bank_name") and data.get("suggested_bank_name") != data.get("bank_name"):
            notes.append(f"Bank identified as {data['suggested_bank_name']} based on routing number")
        
        # Add MICR line note if present
        if data.get("micr_line_raw"):
            notes.append(f"MICR line detected: {data['micr_line_raw']}")
        
        return notes

    def validate_against_manual_entry(self, ocr_data: Dict[str, Any], 
                                     manual_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compare OCR extracted data with manually entered data"""
        comparison_result = {
            "matches": {},
            "mismatches": {},
            "suggestions": {},
            "confidence": 0.0
        }
        
        fields_to_compare = ["bank_name", "routing_number", "account_number"]
        
        for field in fields_to_compare:
            ocr_value = ocr_data.get("extracted_data", {}).get(field, "").strip()
            manual_value = manual_data.get(field, "").strip()
            
            # Skip if OCR didn't extract anything
            if not ocr_value:
                continue
            
            # If no manual value, treat it as a mismatch (suggest OCR value)
            if not manual_value:
                comparison_result["mismatches"][field] = {
                    "ocr": ocr_value,
                    "manual": ""
                }
                # Provide suggestion based on OCR confidence
                ocr_confidence = ocr_data.get("confidence_scores", {}).get(field, 0)
                if ocr_confidence >= 0.65:
                    comparison_result["suggestions"][field] = ocr_value
                continue
            
            # Normalize for comparison
            ocr_norm = re.sub(r'\D', '', ocr_value) if field in ["routing_number", "account_number"] else ocr_value.lower()
            manual_norm = re.sub(r'\D', '', manual_value) if field in ["routing_number", "account_number"] else manual_value.lower()
            
            if ocr_norm == manual_norm:
                comparison_result["matches"][field] = True
            else:
                comparison_result["mismatches"][field] = {
                    "ocr": ocr_value,
                    "manual": manual_value
                }
                
                # Provide suggestion based on OCR confidence
                ocr_confidence = ocr_data.get("confidence_scores", {}).get(field, 0)
                if ocr_confidence >= 0.65:
                    comparison_result["suggestions"][field] = ocr_value
        
        # Calculate overall confidence
        total_fields = len(comparison_result["matches"]) + len(comparison_result["mismatches"])
        if total_fields > 0:
            comparison_result["confidence"] = len(comparison_result["matches"]) / total_fields
        
        return comparison_result