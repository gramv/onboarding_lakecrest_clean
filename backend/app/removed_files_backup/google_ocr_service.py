"""
Google Document AI OCR Processing Service
Drop-in replacement for Groq OCR with same interface
"""
import base64
import json
import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta
import re

from google.cloud import documentai_v1
from google.api_core.exceptions import GoogleAPIError

from .i9_section2 import I9DocumentType, I9DocumentList, USCISDocumentValidator

logger = logging.getLogger(__name__)

class GoogleDocumentOCRService:
    """OCR service for I-9 document processing using Google Document AI"""
    
    def __init__(self, project_id: str = None, processor_id: str = None, location: str = "us"):
        """Initialize Google Document AI client
        
        Args:
            project_id: Google Cloud project ID
            processor_id: Document AI processor ID
            location: Processor location (default: "us")
        """
        self.project_id = project_id or os.getenv("GOOGLE_PROJECT_ID", "933544811759")
        self.processor_id = processor_id or os.getenv("GOOGLE_PROCESSOR_ID", "50c628033c5d5dde")
        self.location = location or os.getenv("GOOGLE_PROCESSOR_LOCATION", "us")
        
        # Initialize Document AI client
        self.client = documentai_v1.DocumentProcessorServiceClient()
        
        # Build processor name
        self.processor_name = self.client.processor_path(
            self.project_id, self.location, self.processor_id
        )
        
        # Reuse validator from Groq service
        self.validator = USCISDocumentValidator()
        
        logger.info(f"Initialized Google Document AI with processor: {self.processor_name}")
    
    def extract_document_fields(self, 
                              document_type: I9DocumentType, 
                              image_data: str,
                              file_name: str) -> Dict[str, Any]:
        """Extract fields from document image using Google Document AI
        
        Exact same interface as Groq service for drop-in replacement
        """
        try:
            # Prepare image for Google API
            image_bytes = self._prepare_image(image_data)
            
            # Create document object
            document = documentai_v1.Document(
                content=image_bytes,
                mime_type="image/png"  # Default to PNG, adjust if needed
            )
            
            # Configure the process request
            request = documentai_v1.ProcessRequest(
                name=self.processor_name,
                raw_document=documentai_v1.RawDocument(
                    content=image_bytes,
                    mime_type="image/png"
                )
            )
            
            logger.info(f"Processing document type: {document_type} with Google Document AI")
            
            try:
                # Process the document
                result = self.client.process_document(request=request)
                document = result.document
                
                # Extract text and entities
                ocr_result = self._extract_fields_from_document(document, document_type)
                
                logger.info(f"Google Document AI extracted: {json.dumps(ocr_result)}")
                
            except GoogleAPIError as api_error:
                logger.error(f"Google Document AI API error: {str(api_error)}")
                error_details = {
                    "error_type": type(api_error).__name__,
                    "error_message": str(api_error),
                    "processor_used": self.processor_name
                }
                logger.error(f"Detailed error: {json.dumps(error_details)}")
                
                return {
                    "success": False,
                    "error": str(api_error),
                    "error_details": error_details,
                    "extracted_data": {},
                    "confidence_score": 0.0,
                    "processing_notes": [f"OCR API call failed: {str(api_error)}"]
                }
            
            # Validate extracted data (reuse existing logic)
            validation_result = self._validate_extracted_data(ocr_result, document_type)
            
            return {
                "success": True,
                "extracted_data": ocr_result,
                "validation": validation_result,
                "confidence_score": self._calculate_confidence(ocr_result, document),
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
    
    def _prepare_image(self, image_data: str) -> bytes:
        """Prepare image data for Google API"""
        # Remove data URL prefix if present
        if image_data.startswith('data:'):
            image_data = image_data.split(',')[1]
        
        # Decode base64 to bytes
        return base64.b64decode(image_data)
    
    def _extract_fields_from_document(self, document: documentai_v1.Document, 
                                     document_type: I9DocumentType) -> Dict[str, Any]:
        """Extract specific fields from Google Document AI response"""
        
        extracted = {}
        
        # Extract from entities if available
        if hasattr(document, 'entities') and document.entities:
            for entity in document.entities:
                entity_type = entity.type_.lower() if entity.type_ else ""
                entity_text = entity.mention_text or ""
                
                # Map Google entity types to our field names
                field_mapping = {
                    "person": ["first_name", "last_name"],
                    "given_name": "first_name",
                    "family_name": "last_name",
                    "surname": "last_name",
                    "date_of_birth": "date_of_birth",
                    "dob": "date_of_birth",
                    "expiration_date": "expiration_date",
                    "expires": "expiration_date",
                    "issue_date": "issue_date",
                    "issued": "issue_date",
                    "document_number": "document_number",
                    "license_number": "document_number",
                    "passport_number": "document_number",
                    "card_number": "document_number",
                    "ssn": "ssn",
                    "social_security_number": "ssn",
                    "address": "address",
                    "issuing_authority": "issuing_authority",
                    "state": "issuing_authority",
                    "country": "issuing_authority"
                }
                
                for google_type, our_field in field_mapping.items():
                    if google_type in entity_type:
                        if isinstance(our_field, list):
                            # Handle name splitting
                            names = entity_text.split()
                            if len(names) >= 2:
                                extracted["first_name"] = names[0]
                                extracted["last_name"] = " ".join(names[1:])
                        else:
                            extracted[our_field] = entity_text
        
        # Fallback to text extraction if entities not sufficient
        if not extracted or len(extracted) < 3:
            extracted.update(self._extract_from_text(document.text, document_type))
        
        # Normalize dates
        for field in ["date_of_birth", "expiration_date", "issue_date"]:
            if field in extracted:
                extracted[field] = self._normalize_date(extracted[field])
        
        # Normalize SSN if present
        if "ssn" in extracted:
            extracted["ssn"] = self._normalize_ssn(extracted["ssn"])
        
        return extracted
    
    def _extract_from_text(self, text: str, document_type: I9DocumentType) -> Dict[str, Any]:
        """Extract fields from raw text using regex patterns"""
        
        extracted = {}
        lines = text.split('\n')
        
        # Document-specific patterns
        if document_type == I9DocumentType.DRIVERS_LICENSE:
            # License number patterns
            for line in lines:
                # Look for DL number
                dl_match = re.search(r'DL\s*(?:#|NO|NUMBER)?\s*([A-Z0-9]{5,15})', line, re.I)
                if dl_match:
                    extracted["document_number"] = dl_match.group(1)
                
                # Look for expiration
                exp_match = re.search(r'EXP(?:IRES?)?\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                if exp_match:
                    extracted["expiration_date"] = exp_match.group(1)
                
                # Look for DOB
                dob_match = re.search(r'DOB\s*[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                if dob_match:
                    extracted["date_of_birth"] = dob_match.group(1)
        
        elif document_type == I9DocumentType.US_PASSPORT:
            for line in lines:
                # Passport number (usually 9 digits)
                passport_match = re.search(r'([A-Z]?\d{8,9})', line)
                if passport_match and "document_number" not in extracted:
                    extracted["document_number"] = passport_match.group(1)
                
                # Look for USA or United States
                if "USA" in line or "United States" in line:
                    extracted["issuing_authority"] = "United States of America"
        
        elif document_type == I9DocumentType.SSN_CARD:
            for line in lines:
                # SSN pattern
                ssn_match = re.search(r'(\d{3}[-\s]?\d{2}[-\s]?\d{4})', line)
                if ssn_match:
                    extracted["ssn"] = ssn_match.group(1)
                
                # Look for Social Security Administration
                if "Social Security" in line:
                    extracted["issuing_authority"] = "Social Security Administration"
        
        # Extract names (common patterns)
        name_lines = [l for l in lines[:10] if len(l) > 3 and l[0].isupper()]
        if name_lines and "first_name" not in extracted:
            # Assume first all-caps line with spaces is the name
            for line in name_lines:
                if ' ' in line and line.replace(' ', '').isalpha():
                    parts = line.split()
                    if len(parts) >= 2:
                        extracted["first_name"] = parts[0]
                        extracted["last_name"] = " ".join(parts[1:])
                        break
        
        return extracted
    
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
    
    def _validate_extracted_data(self, extracted_data: Dict[str, Any], 
                                document_type: I9DocumentType) -> Dict[str, Any]:
        """Validate extracted data against document requirements
        (Reused from Groq service)"""
        
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
        """Get required fields for document type
        (Reused from Groq service)"""
        
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
    
    def _calculate_confidence(self, extracted_data: Dict[str, Any], 
                             document: documentai_v1.Document = None) -> float:
        """Calculate confidence score for extracted data"""
        
        if not extracted_data:
            return 0.0
        
        # Base confidence from field completeness
        total_expected = 6  # Average expected fields
        fields_found = len([v for v in extracted_data.values() if v and str(v).strip()])
        base_confidence = min(fields_found / total_expected, 1.0)
        
        # Boost confidence for key fields
        key_fields = ["document_number", "first_name", "last_name"]
        key_fields_found = sum(1 for field in key_fields if field in extracted_data and extracted_data[field])
        
        # If we have Google's confidence scores, use them
        if document and hasattr(document, 'entities'):
            entity_confidences = [e.confidence for e in document.entities if hasattr(e, 'confidence')]
            if entity_confidences:
                avg_entity_confidence = sum(entity_confidences) / len(entity_confidences)
                # Combine our confidence with Google's
                confidence = (base_confidence * 0.5 + avg_entity_confidence * 0.5)
            else:
                confidence = base_confidence * 0.7 + (key_fields_found / len(key_fields)) * 0.3
        else:
            confidence = base_confidence * 0.7 + (key_fields_found / len(key_fields)) * 0.3
        
        return round(confidence, 2)