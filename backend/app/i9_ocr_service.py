"""
I-9 Document OCR Processing Service using Groq API
Automated document field extraction for federal compliance
"""
import base64
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, date, timedelta
import re
from groq import Groq

from .i9_section2 import I9DocumentType, I9DocumentList, USCISDocumentValidator

logger = logging.getLogger(__name__)

class I9DocumentOCRService:
    """OCR service for I-9 document processing using Groq API"""
    
    def __init__(self, groq_client: Groq):
        self.groq_client = groq_client
        self.validator = USCISDocumentValidator()
    
    def extract_document_fields(self, 
                              document_type: I9DocumentType, 
                              image_data: str,
                              file_name: str) -> Dict[str, Any]:
        """Extract fields from document image using Groq vision API"""
        
        try:
            # Get document-specific extraction prompt
            extraction_prompt = self._get_extraction_prompt(document_type)
            
            # Prepare image for Groq API
            image_base64 = self._prepare_image(image_data)
            
            # Use actual Groq Vision API for OCR
            logger.info(f"Processing document type: {document_type} with Groq Vision API")
            
            # Call Groq Vision API
            try:
                completion = self.groq_client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct",
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
                
                # Parse the response
                response_text = completion.choices[0].message.content
                logger.info(f"Groq API response: {response_text}")
                
                # Parse JSON response
                ocr_result = json.loads(response_text)
                
            except Exception as api_error:
                logger.error(f"Groq Vision API error: {str(api_error)}")
                # Add more detailed error info
                error_details = {
                    "error_type": type(api_error).__name__,
                    "error_message": str(api_error),
                    "model_used": "meta-llama/llama-4-scout-17b-16e-instruct"
                }
                logger.error(f"Detailed error: {json.dumps(error_details)}")
                # Return error details instead of empty result
                return {
                    "success": False,
                    "error": str(api_error),
                    "error_details": error_details,
                    "extracted_data": {},
                    "confidence_score": 0.0,
                    "processing_notes": [f"OCR API call failed: {str(api_error)}"]
                }
                
            # Validate extracted data
            validation_result = self._validate_extracted_data(ocr_result, document_type)
            
            return {
                "success": True,
                "extracted_data": ocr_result,
                "validation": validation_result,
                "confidence_score": self._calculate_confidence(ocr_result),
                "processing_notes": []
            }
            
        except Exception as e:
            logger.error(f"OCR processing failed for {document_type}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "extracted_data": {},
                "confidence_score": 0.0,
                "processing_notes": [f"OCR processing failed: {str(e)}"]
            }
    
    def _get_extraction_prompt(self, document_type: I9DocumentType) -> str:
        """Get document-specific OCR extraction prompt"""
        
        base_prompt = """Analyze this government identification document for I-9 employment verification. 
Extract the following information in JSON format. Be extremely accurate as this is for federal compliance.
Return ONLY valid JSON with the requested fields."""
        
        if document_type == I9DocumentType.US_PASSPORT:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "passport number (9 digits)",
    "first_name": "given name", 
    "last_name": "surname",
    "date_of_birth": "YYYY-MM-DD format",
    "issue_date": "YYYY-MM-DD format", 
    "expiration_date": "YYYY-MM-DD format",
    "issuing_authority": "United States of America",
    "nationality": "USA or similar",
    "sex": "M or F"
}}"""
            
        elif document_type == I9DocumentType.DRIVERS_LICENSE:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "license number",
    "first_name": "first name",
    "last_name": "last name", 
    "date_of_birth": "YYYY-MM-DD format",
    "issue_date": "YYYY-MM-DD format",
    "expiration_date": "YYYY-MM-DD format",
    "issuing_authority": "state name",
    "address": "full address if visible",
    "class": "license class (CDL, etc)",
    "restrictions": "any restrictions",
    "height": "height if visible",
    "weight": "weight if visible",
    "eye_color": "eye color if visible"
}}"""
            
        elif document_type == I9DocumentType.STATE_ID_CARD:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "ID number",
    "first_name": "first name",
    "last_name": "last name",
    "date_of_birth": "YYYY-MM-DD format", 
    "issue_date": "YYYY-MM-DD format",
    "expiration_date": "YYYY-MM-DD format",
    "issuing_authority": "state name",
    "address": "full address if visible",
    "height": "height if visible",
    "weight": "weight if visible",
    "eye_color": "eye color if visible"
}}"""
            
        elif document_type == I9DocumentType.PERMANENT_RESIDENT_CARD:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "card number (3 letters + 9 digits)",
    "first_name": "given name",
    "last_name": "family name", 
    "date_of_birth": "YYYY-MM-DD format",
    "issue_date": "YYYY-MM-DD format",
    "expiration_date": "YYYY-MM-DD format",
    "issuing_authority": "U.S. Citizenship and Immigration Services",
    "alien_number": "A-number",
    "uscis_number": "USCIS number",
    "category": "category code",
    "country_of_birth": "birth country"
}}"""
            
        elif document_type == I9DocumentType.SSN_CARD:
            return f"""{base_prompt}
            
Required fields:
{{
    "ssn": "social security number (XXX-XX-XXXX)",
    "first_name": "first name",
    "last_name": "last name",
    "issuing_authority": "Social Security Administration"
}}"""
            
        elif document_type == I9DocumentType.EMPLOYMENT_AUTHORIZATION_CARD:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "card number (3 letters + 9 digits)",
    "first_name": "given name",
    "last_name": "family name",
    "date_of_birth": "YYYY-MM-DD format",
    "issue_date": "YYYY-MM-DD format", 
    "expiration_date": "YYYY-MM-DD format",
    "issuing_authority": "U.S. Citizenship and Immigration Services",
    "alien_number": "A-number",
    "uscis_number": "USCIS number",
    "category": "category code"
}}"""
        
        else:
            return f"""{base_prompt}
            
Required fields:
{{
    "document_number": "any visible document number",
    "first_name": "first name if visible",
    "last_name": "last name if visible",
    "date_of_birth": "YYYY-MM-DD format if visible",
    "issue_date": "YYYY-MM-DD format if visible",
    "expiration_date": "YYYY-MM-DD format if visible",
    "issuing_authority": "issuing organization"
}}"""
    
    def _prepare_image(self, image_data: str) -> str:
        """Prepare image data for Groq API"""
        # Remove data URL prefix if present
        if image_data.startswith('data:'):
            image_data = image_data.split(',')[1]
        
        return image_data
    
    def _parse_ocr_response(self, response_text: str, document_type: I9DocumentType) -> Dict[str, Any]:
        """Parse OCR response from Groq API"""
        try:
            # Clean up response text
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            elif response_text.startswith('```'):
                response_text = response_text[3:]
            
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Clean up any remaining whitespace
            response_text = response_text.strip()
            
            # Parse JSON
            parsed_data = json.loads(response_text)
            
            # Normalize field names and values
            normalized_data = self._normalize_extracted_data(parsed_data, document_type)
            
            return normalized_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OCR response as JSON: {str(e)}")
            logger.error(f"Response text: {response_text}")
            
            # Attempt to extract data using regex as fallback
            return self._fallback_parse(response_text, document_type)
    
    def _normalize_extracted_data(self, data: Dict[str, Any], document_type: I9DocumentType) -> Dict[str, Any]:
        """Normalize extracted data fields"""
        normalized = {}
        
        for key, value in data.items():
            if value is None or value == "":
                continue
                
            # Normalize field names
            normalized_key = key.lower().strip()
            
            # Normalize values based on field type
            if 'date' in normalized_key:
                normalized[normalized_key] = self._normalize_date(str(value))
            elif normalized_key in ['ssn', 'social_security_number']:
                normalized['ssn'] = self._normalize_ssn(str(value))
            elif normalized_key in ['document_number', 'license_number', 'card_number']:
                normalized['document_number'] = str(value).strip()
            else:
                normalized[normalized_key] = str(value).strip()
        
        return normalized
    
    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Normalize date string to YYYY-MM-DD format"""
        if not date_str or date_str.lower() in ['n/a', 'none', 'null']:
            return None
        
        # Common date patterns
        patterns = [
            r'(\d{4})-(\d{1,2})-(\d{1,2})',  # YYYY-MM-DD
            r'(\d{1,2})/(\d{1,2})/(\d{4})',  # MM/DD/YYYY
            r'(\d{1,2})-(\d{1,2})-(\d{4})',  # MM-DD-YYYY
            r'(\d{2})/(\d{2})/(\d{2})',      # MM/DD/YY
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                groups = match.groups()
                if len(groups) == 3:
                    if len(groups[0]) == 4:  # YYYY-MM-DD
                        year, month, day = groups
                    else:  # MM/DD/YYYY or MM-DD-YYYY
                        month, day, year = groups
                        if len(year) == 2:
                            year = f"20{year}" if int(year) < 50 else f"19{year}"
                    
                    try:
                        # Validate date
                        date_obj = date(int(year), int(month), int(day))
                        return date_obj.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
        
        logger.warning(f"Could not normalize date: {date_str}")
        return date_str
    
    def _normalize_ssn(self, ssn_str: str) -> str:
        """Normalize SSN to XXX-XX-XXXX format"""
        # Remove all non-digits
        digits = re.sub(r'\D', '', ssn_str)
        
        if len(digits) == 9:
            return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
        
        return ssn_str
    
    def _fallback_parse(self, response_text: str, document_type: I9DocumentType) -> Dict[str, Any]:
        """Fallback parsing using regex when JSON parsing fails"""
        extracted = {}
        
        # Common field patterns
        patterns = {
            'document_number': r'(?:document|license|card|passport)\s*(?:number|#)?\s*:?\s*([A-Z0-9-]+)',
            'first_name': r'(?:first|given)\s*name\s*:?\s*([A-Za-z\s]+)',
            'last_name': r'(?:last|family|sur)\s*name\s*:?\s*([A-Za-z\s]+)',
            'date_of_birth': r'(?:birth|dob)\s*(?:date)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'expiration_date': r'(?:exp|expires)\s*(?:date)?\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'ssn': r'(?:ssn|social)\s*(?:security)?\s*(?:number)?\s*:?\s*(\d{3}-?\d{2}-?\d{4})'
        }
        
        for field, pattern in patterns.items():
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                extracted[field] = match.group(1).strip()
        
        return extracted
    
    def _validate_extracted_data(self, extracted_data: Dict[str, Any], document_type: I9DocumentType) -> Dict[str, Any]:
        """Validate extracted data against document requirements"""
        validation_result = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "required_fields_present": True
        }
        
        # Get document requirements
        doc_list = self.validator.get_document_list(document_type)
        doc_info = self.validator.ACCEPTABLE_DOCUMENTS[doc_list][document_type]
        
        # Check required fields
        required_fields = self._get_required_fields(document_type)
        missing_fields = []
        
        for field in required_fields:
            if field not in extracted_data or not extracted_data[field]:
                missing_fields.append(field)
        
        if missing_fields:
            validation_result["required_fields_present"] = False
            validation_result["errors"].append(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate document number format if pattern exists
        if doc_info.get("pattern") and "document_number" in extracted_data:
            doc_number = extracted_data["document_number"]
            if not re.match(doc_info["pattern"], doc_number):
                validation_result["errors"].append(f"Document number format invalid for {doc_info['title']}")
        
        # Validate expiration date
        if doc_info["requires_expiration"]:
            if "expiration_date" not in extracted_data:
                validation_result["errors"].append("Expiration date required but not found")
            else:
                exp_date_str = extracted_data["expiration_date"]
                try:
                    exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
                    if exp_date <= date.today():
                        validation_result["errors"].append(f"Document is expired (expires: {exp_date})")
                    elif exp_date <= date.today() + timedelta(days=30):
                        validation_result["warnings"].append(f"Document expires soon ({exp_date})")
                except ValueError:
                    validation_result["errors"].append("Invalid expiration date format")
        
        validation_result["is_valid"] = len(validation_result["errors"]) == 0
        
        return validation_result
    
    def _get_required_fields(self, document_type: I9DocumentType) -> List[str]:
        """Get required fields for document type"""
        
        common_fields = ["document_number", "first_name", "last_name"]
        
        if document_type in [I9DocumentType.US_PASSPORT, I9DocumentType.US_PASSPORT_CARD]:
            return common_fields + ["date_of_birth", "expiration_date", "issuing_authority"]
        elif document_type in [I9DocumentType.DRIVERS_LICENSE, I9DocumentType.STATE_ID_CARD]:
            return common_fields + ["date_of_birth", "expiration_date", "issuing_authority"]
        elif document_type == I9DocumentType.PERMANENT_RESIDENT_CARD:
            return common_fields + ["date_of_birth", "expiration_date", "alien_number"]
        elif document_type == I9DocumentType.SSN_CARD:
            return ["ssn", "first_name", "last_name"]
        elif document_type == I9DocumentType.EMPLOYMENT_AUTHORIZATION_CARD:
            return common_fields + ["date_of_birth", "expiration_date", "alien_number"]
        else:
            return common_fields
    
    def _calculate_confidence(self, extracted_data: Dict[str, Any]) -> float:
        """Calculate confidence score for extracted data"""
        if not extracted_data:
            return 0.0
        
        # Simple confidence based on field completeness
        total_expected = 6  # Average expected fields
        fields_found = len([v for v in extracted_data.values() if v and str(v).strip()])
        
        base_confidence = min(fields_found / total_expected, 1.0)
        
        # Boost confidence for key fields
        key_fields = ["document_number", "first_name", "last_name"]
        key_fields_found = sum(1 for field in key_fields if field in extracted_data and extracted_data[field])
        
        confidence = base_confidence * 0.7 + (key_fields_found / len(key_fields)) * 0.3
        
        return round(confidence, 2)
    
    def _prepare_image(self, image_data: str) -> str:
        """Prepare image for Groq API - ensure it's properly formatted base64"""
        # If the image data already includes the data URL prefix, remove it
        if image_data.startswith('data:'):
            image_data = image_data.split(',')[1]
        return image_data
    
    def _get_empty_result(self, document_type: I9DocumentType) -> Dict[str, Any]:
        """Return empty result structure for document type"""
        if document_type == I9DocumentType.SSN_CARD:
            return {
                "ssn": "",
                "first_name": "",
                "last_name": "",
                "issuing_authority": "Social Security Administration"
            }
        elif document_type == I9DocumentType.DRIVERS_LICENSE:
            return {
                "document_number": "",
                "first_name": "",
                "last_name": "",
                "date_of_birth": "",
                "expiration_date": "",
                "issuing_authority": ""
            }
        elif document_type == I9DocumentType.US_PASSPORT:
            return {
                "document_number": "",
                "first_name": "",
                "last_name": "",
                "date_of_birth": "",
                "expiration_date": "",
                "issuing_authority": "United States of America"
            }
        else:
            return {
                "document_number": "",
                "first_name": "",
                "last_name": "",
                "issuing_authority": ""
            }