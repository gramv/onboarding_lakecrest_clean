"""
Google Document AI OCR Processing Service - Production Ready
Handles credentials from environment variables for Heroku deployment
"""
import base64
import json
import logging
import os
import tempfile
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timedelta
import re

from google.cloud import documentai_v1
from google.api_core.exceptions import GoogleAPIError
from google.oauth2 import service_account

from .i9_section2 import I9DocumentType, I9DocumentList, USCISDocumentValidator

logger = logging.getLogger(__name__)

class GoogleDocumentOCRServiceProduction:
    """Production-ready OCR service with environment-based credential handling"""
    
    def __init__(self, project_id: str = None, processor_id: str = None, location: str = "us"):
        """Initialize Google Document AI client with production credential handling
        
        Args:
            project_id: Google Cloud project ID
            processor_id: Document AI processor ID
            location: Processor location (default: "us")
        """
        self.project_id = project_id or os.getenv("GOOGLE_PROJECT_ID", "933544811759")
        self.processor_id = processor_id or os.getenv("GOOGLE_PROCESSOR_ID", "50c628033c5d5dde")
        self.location = location or os.getenv("GOOGLE_PROCESSOR_LOCATION", "us")
        
        # Handle credentials for production
        credentials = self._get_credentials()
        
        # Initialize Document AI client with credentials
        try:
            if credentials:
                self.client = documentai_v1.DocumentProcessorServiceClient(credentials=credentials)
                logger.info("✅ Using explicit Google credentials")
            else:
                # Try default credentials (for local development with gcloud auth)
                self.client = documentai_v1.DocumentProcessorServiceClient()
                logger.info("📝 Using default Google credentials")
        except Exception as e:
            logger.error(f"❌ CRITICAL: Failed to initialize Google Document AI client: {e}")
            logger.error("   NO FALLBACK AVAILABLE - I-9 OCR will not work without Google Document AI")
            logger.error("   This is a hard requirement for government ID processing")
            self.client = None
        
        # Build processor name only if client initialized
        if self.client:
            self.processor_name = self.client.processor_path(
                self.project_id, self.location, self.processor_id
            )
            logger.info(f"Initialized Google Document AI with processor: {self.processor_name}")
        else:
            self.processor_name = None
            logger.info("Google Document AI not available - will use fallback OCR")
        
        # Reuse validator from Groq service
        self.validator = USCISDocumentValidator()
    
    def _get_credentials(self):
        """Get Google credentials from environment variables
        
        Priority:
        1. GOOGLE_CREDENTIALS_BASE64 - Base64 encoded service account JSON (Heroku)
        2. GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON file (local)
        3. None - Use default credentials (gcloud auth)
        """
        # Try base64-encoded credentials first (for Heroku)
        credentials_base64 = os.getenv("GOOGLE_CREDENTIALS_BASE64")
        if credentials_base64:
            try:
                # Decode base64 to JSON string
                credentials_json = base64.b64decode(credentials_base64).decode('utf-8')
                credentials_dict = json.loads(credentials_json)
                
                # Create credentials from dict
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_dict,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
                logger.info("✅ Loaded credentials from GOOGLE_CREDENTIALS_BASE64")
                return credentials
                
            except Exception as e:
                logger.error(f"Failed to load credentials from GOOGLE_CREDENTIALS_BASE64: {e}")
                
        # Try file-based credentials (for local development)
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path and os.path.exists(credentials_path):
            try:
                credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"]
                )
                logger.info(f"✅ Loaded credentials from file: {credentials_path}")
                return credentials
                
            except Exception as e:
                logger.error(f"Failed to load credentials from file {credentials_path}: {e}")
        
        # No explicit credentials found
        logger.info("ℹ️ No explicit credentials found, will use default application credentials")
        return None
    
    def extract_document_fields(self, 
                              document_type: I9DocumentType, 
                              image_data: str,
                              file_name: str) -> Dict[str, Any]:
        """Extract fields from document image using Google Document AI
        
        Exact same interface as original service for drop-in replacement
        """
        # Check if client is available
        if not self.client:
            logger.error("❌ Google Document AI client not available - I-9 OCR DISABLED")
            logger.error("   NO FALLBACK - This is a hard requirement for government documents")
            return {
                "success": False,
                "error": "Google Document AI not configured - required for government ID processing",
                "extracted_data": {},
                "confidence_score": 0.0,
                "processing_notes": ["CRITICAL: Google Document AI is required but not available"]
            }
        
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
        
        # Log the Document AI response structure for debugging
        logger.info(f"Document AI response - Pages: {len(document.pages) if hasattr(document, 'pages') else 0}")
        
        # FIRST: Check formFields in pages (where Form Parser puts key-value pairs)
        if hasattr(document, 'pages') and document.pages:
            for page in document.pages:
                if hasattr(page, 'form_fields') and page.form_fields:
                    logger.info(f"Found {len(page.form_fields)} form fields in page")
                    
                    for form_field in page.form_fields:
                        # Get field name and value
                        field_name = ""
                        field_value = ""
                        
                        # Extract field name
                        if hasattr(form_field, 'field_name') and form_field.field_name:
                            if hasattr(form_field.field_name, 'text_anchor') and form_field.field_name.text_anchor:
                                field_name = self._get_text_from_anchor(document.text, form_field.field_name.text_anchor)
                        
                        # Extract field value
                        if hasattr(form_field, 'field_value') and form_field.field_value:
                            if hasattr(form_field.field_value, 'text_anchor') and form_field.field_value.text_anchor:
                                field_value = self._get_text_from_anchor(document.text, form_field.field_value.text_anchor)
                        
                        if field_name and field_value:
                            # Normalize field name for matching
                            field_name_lower = field_name.lower().strip()
                            logger.debug(f"Form field: '{field_name}' = '{field_value}'")
                            
                            # Map common field names to our required I-9 fields
                            # For document numbers (expanded for all document types)
                            if any(x in field_name_lower for x in [
                                # Driver's License & State ID
                                'dl', 'license number', 'license no', 'driver license', 'lic no', 'id number',
                                # Passports
                                'passport no', 'passport number', 'passport #',
                                # Green Cards & Immigration
                                'card number', 'receipt number', 'alien number', 'a-number', 'uscis number',
                                # Military IDs
                                'dod id', 'military id', 'service number', 'edipi', 'cac number',
                                # SSN
                                'social security', 'ssn', 'ss number',
                                # Birth Certificates
                                'certificate number', 'registration number', 'file number',
                                # Generic
                                'document number', 'doc number', 'doc no', 'number'
                            ]):
                                if "document_number" not in extracted:
                                    extracted["document_number"] = field_value.strip()
                                    logger.info(f"Extracted document_number: {field_value}")

                            # For SSN (specific field)
                            elif any(x in field_name_lower for x in ['social security number', 'ssn', 'ss number', 'social security no']):
                                if "ssn" not in extracted:
                                    value_clean = field_value.strip()
                                    extracted["ssn"] = value_clean
                                    masked = f"***{value_clean[-4:]}" if len(value_clean) >= 4 else "***"
                                    logger.info(f"Extracted ssn (masked): {masked}")

                            # For Alien/USCIS numbers
                            elif any(x in field_name_lower for x in ['alien number', 'a-number', 'a number', 'alien no', 'a#']):
                                if "alien_number" not in extracted:
                                    value_clean = field_value.strip()
                                    extracted["alien_number"] = value_clean
                                    masked = f"***{value_clean[-4:]}" if len(value_clean) >= 4 else "***"
                                    logger.info(f"Extracted alien_number (masked): {masked}")

                            elif any(x in field_name_lower for x in ['uscis number', 'uscis no', 'uscis #']):
                                if "uscis_number" not in extracted:
                                    value_clean = field_value.strip()
                                    extracted["uscis_number"] = value_clean
                                    masked = f"***{value_clean[-4:]}" if len(value_clean) >= 4 else "***"
                                    logger.info(f"Extracted uscis_number (masked): {masked}")

                            # For expiration dates
                            elif any(x in field_name_lower for x in ['exp', 'expires', 'expiration', 'expiry',
                                                                     'valid until', 'valid through', 'valid thru',
                                                                     'end date', 'exp date']):
                                if "expiration_date" not in extracted:
                                    extracted["expiration_date"] = field_value.strip()
                                    logger.info(f"Extracted expiration_date: {field_value}")

                            # For issuing authority (expanded for all document types)
                            elif any(x in field_name_lower for x in [
                                # States
                                'state', 'issued by', 'issuing', 'authority',
                                # Countries
                                'country', 'nation', 'nationality',
                                # Specific authorities
                                'department of', 'bureau of', 'office of',
                                # Generic
                                'iss', 'issued'
                            ]):
                                if "issuing_authority" not in extracted:
                                    extracted["issuing_authority"] = field_value.strip()
                                    logger.info(f"Extracted issuing_authority: {field_value}")

                            # For issue dates
                            elif any(x in field_name_lower for x in ['issue', 'issued', 'iss date', 'date issued',
                                                                     'issue date', 'date of issue']):
                                if "issue_date" not in extracted:
                                    extracted["issue_date"] = field_value.strip()
                                    logger.info(f"Extracted issue_date: {field_value}")

                            # For names
                            elif any(x in field_name_lower for x in ['first name', 'given name', 'fname']):
                                if "first_name" not in extracted:
                                    extracted["first_name"] = field_value.strip()
                                    logger.info(f"Extracted first_name: {field_value}")

                            elif any(x in field_name_lower for x in ['last name', 'surname', 'family name', 'lname']):
                                if "last_name" not in extracted:
                                    extracted["last_name"] = field_value.strip()
                                    logger.info(f"Extracted last_name: {field_value}")

                            # For date of birth
                            elif any(x in field_name_lower for x in ['date of birth', 'dob', 'birth date', 'birthdate', 'born']):
                                if "date_of_birth" not in extracted:
                                    extracted["date_of_birth"] = field_value.strip()
                                    logger.info(f"Extracted date_of_birth: {field_value}")
        
        # SECOND: Check entities if available (some processors use entities instead of formFields)
        if hasattr(document, 'entities') and document.entities:
            logger.info(f"Found {len(document.entities)} entities")
            for entity in document.entities:
                entity_type = entity.type_.lower() if entity.type_ else ""
                entity_text = entity.mention_text or ""
                
                logger.debug(f"Entity: type='{entity_type}', text='{entity_text}'")
                
                # Map entity types to our fields
                if "document_number" not in extracted and any(x in entity_type for x in ["document_number", "license_number", "passport_number"]):
                    extracted["document_number"] = entity_text
                elif "expiration_date" not in extracted and any(x in entity_type for x in ["expiration", "expires"]):
                    extracted["expiration_date"] = entity_text
                elif "issuing_authority" not in extracted and any(x in entity_type for x in ["state", "country", "authority"]):
                    extracted["issuing_authority"] = entity_text
        
        # THIRD: Fallback to text extraction if we don't have all required fields
        if not extracted.get("document_number") or not extracted.get("expiration_date") or not extracted.get("issuing_authority"):
            logger.info("Using text extraction fallback for missing fields")
            text_extracted = self._extract_from_text(document.text, document_type)
            
            # Only fill in missing fields
            for field in ["document_number", "expiration_date", "issuing_authority"]:
                if field not in extracted and field in text_extracted:
                    extracted[field] = text_extracted[field]
                    logger.info(f"Text extraction found {field}: {text_extracted[field]}")
        
        # Normalize dates to YYYY-MM-DD format
        if "expiration_date" in extracted:
            extracted["expiration_date"] = self._normalize_date(extracted["expiration_date"])
        if "issue_date" in extracted:
            extracted["issue_date"] = self._normalize_date(extracted["issue_date"])
        
        logger.info(f"Final extracted fields: {json.dumps(extracted)}")
        return extracted
    
    def _get_text_from_anchor(self, full_text: str, text_anchor) -> str:
        """Extract text using text anchor indices"""
        if not text_anchor or not hasattr(text_anchor, 'text_segments'):
            return ""
        
        text_segments = []
        for segment in text_anchor.text_segments:
            start_index = int(segment.start_index) if segment.start_index else 0
            end_index = int(segment.end_index) if segment.end_index else len(full_text)
            text_segments.append(full_text[start_index:end_index])
        
        return " ".join(text_segments).strip()
    
    def _extract_from_text(self, text: str, document_type: I9DocumentType) -> Dict[str, Any]:
        """Extract fields from raw text using regex patterns - Enhanced for all I-9 document types"""

        extracted = {}
        lines = text.split('\n')

        # ========== LIST A DOCUMENTS ==========

        # US Passport & Passport Card
        if document_type in [I9DocumentType.US_PASSPORT, I9DocumentType.US_PASSPORT_CARD]:
            for line in lines:
                # Passport number (letter + 8 digits or just 9 digits)
                if "document_number" not in extracted:
                    passport_patterns = [
                        r'(?:PASSPORT\s*(?:NO|NUMBER)?)[:\s]*([A-Z]?\d{8,9})',
                        r'\b([A-Z]\d{8})\b',  # Letter + 8 digits
                        r'\b(\d{9})\b'  # 9 digits
                    ]
                    for pattern in passport_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Expiration date
                if "expiration_date" not in extracted:
                    date_match = re.search(r'(?:DATE\s*OF\s*EXPIRATION|EXPIRATION\s*DATE|EXP)[:\s]*(\d{1,2}\s+\w{3}\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                    if date_match:
                        extracted["expiration_date"] = date_match.group(1)

                # Issuing authority
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["UNITED STATES", "USA", "U.S.A", "AMERICA"]):
                        extracted["issuing_authority"] = "United States of America"

        # Permanent Resident Card (Green Card)
        elif document_type in [I9DocumentType.PERMANENT_RESIDENT_CARD, I9DocumentType.PERMANENT_RESIDENT_CARD_I551]:
            for line in lines:
                # Green card number (3 letters + 10 digits or various formats)
                if "document_number" not in extracted:
                    card_patterns = [
                        r'\b([A-Z]{3}\d{10})\b',  # Standard format
                        r'(?:CARD\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{13})',
                        r'(?:RECEIPT\s*(?:NO|NUMBER)?)[:\s]*([A-Z]{3}\d{10})'
                    ]
                    for pattern in card_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Alien number (A-number)
                if "alien_number" not in extracted:
                    alien_patterns = [
                        r'(?:A-?NUMBER|ALIEN\s*(?:NO|NUMBER)?)[:\s]*([A-Z]?\d{7,9})',
                        r'\b(A\d{8,9})\b'
                    ]
                    for pattern in alien_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["alien_number"] = match.group(1)
                            break

                # USCIS number
                if "uscis_number" not in extracted:
                    uscis_match = re.search(r'(?:USCIS\s*(?:NO|NUMBER)?)[:\s]*(\d{10})', line, re.I)
                    if uscis_match:
                        extracted["uscis_number"] = uscis_match.group(1)

                # Expiration date
                if "expiration_date" not in extracted:
                    exp_match = re.search(r'(?:CARD\s*EXPIRES|EXPIRES)[:\s]*(\d{2}/\d{2}/\d{4})', line, re.I)
                    if exp_match:
                        extracted["expiration_date"] = exp_match.group(1)

                # USCIS as issuing authority
                if "issuing_authority" not in extracted and "USCIS" in line.upper():
                    extracted["issuing_authority"] = "U.S. Citizenship and Immigration Services"

        # Employment Authorization Card (EAD)
        elif document_type == I9DocumentType.EMPLOYMENT_AUTHORIZATION_CARD:
            for line in lines:
                # EAD card number
                if "document_number" not in extracted:
                    ead_patterns = [
                        r'(?:CARD\s*(?:NO|NUMBER)?)[:\s]*([A-Z]{3}\d{10})',
                        r'\b([A-Z]{3}\d{10})\b'
                    ]
                    for pattern in ead_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Alien number
                if "alien_number" not in extracted:
                    alien_match = re.search(r'(?:A-?NUMBER)[:\s]*([A-Z]?\d{7,9})', line, re.I)
                    if alien_match:
                        extracted["alien_number"] = alien_match.group(1)

                # USCIS number
                if "uscis_number" not in extracted:
                    uscis_match = re.search(r'(?:USCIS\s*(?:NO|NUMBER)?)[:\s]*(\d{10})', line, re.I)
                    if uscis_match:
                        extracted["uscis_number"] = uscis_match.group(1)

                # Category code
                if "category" not in extracted:
                    cat_match = re.search(r'(?:CATEGORY)[:\s]*([A-Z0-9]{2,5})', line, re.I)
                    if cat_match:
                        extracted["category"] = cat_match.group(1)

                if "issuing_authority" not in extracted and "USCIS" in line.upper():
                    extracted["issuing_authority"] = "U.S. Citizenship and Immigration Services"

        # Foreign Passport with I-551 stamp or I-94
        elif document_type in [I9DocumentType.FOREIGN_PASSPORT_I551, I9DocumentType.FOREIGN_PASSPORT_I94]:
            for line in lines:
                # Passport number
                if "document_number" not in extracted:
                    passport_match = re.search(r'(?:PASSPORT\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{6,12})', line, re.I)
                    if passport_match:
                        extracted["document_number"] = passport_match.group(1)

                # I-94 number
                if "i94_number" not in extracted:
                    i94_match = re.search(r'(?:I-?94\s*(?:NO|NUMBER)?)[:\s]*(\d{11})', line, re.I)
                    if i94_match:
                        extracted["i94_number"] = i94_match.group(1)

                # Look for country of issuance
                if "issuing_authority" not in extracted:
                    country_match = re.search(r'(?:COUNTRY|NATIONALITY)[:\s]*([A-Z\s]+)', line, re.I)
                    if country_match:
                        extracted["issuing_authority"] = country_match.group(1).strip()

        # ========== LIST B DOCUMENTS ==========

        # Driver's License & State ID Card
        elif document_type in [I9DocumentType.DRIVERS_LICENSE, I9DocumentType.STATE_ID_CARD,
                               I9DocumentType.CANADIAN_DRIVERS_LICENSE]:
            for line in lines:
                # Look for DL/ID number with various formats
                if "document_number" not in extracted:
                    # Common patterns: "DL 12345678", "DLN:12345678", "License No. 12345"
                    dl_patterns = [
                        r'(?:DL|DLN|LICENSE\s*(?:NO|NUMBER)?|ID\s*(?:NO|NUMBER)?)[:\s#]*([A-Z0-9]{5,20})',
                        r'(?:DRIVER\s*LICENSE|DRIVER\'S\s*LICENSE)[:\s]*([A-Z0-9]{5,20})',
                        r'\b([A-Z]{1,3}\d{5,15})\b',  # Some states use letter prefix
                        r'\b(\d{7,12})\b'  # Pure numeric license numbers
                    ]
                    for pattern in dl_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            potential_number = match.group(1).strip()
                            # Validate it looks like a license number
                            if len(potential_number) >= 5 and not potential_number.isalpha():
                                extracted["document_number"] = potential_number
                                break

                # Look for expiration date
                if "expiration_date" not in extracted:
                    exp_patterns = [
                        r'(?:EXP|EXPIRES?|EXPIRATION)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                        r'(?:VALID\s*(?:UNTIL|THROUGH|TO))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                        r'(\d{2}[/-]\d{2}[/-]\d{4})\s*(?:EXP|EXPIRES?)',
                        r'EXP[:\s]*(\d{2}/\d{2}/\d{4})'
                    ]
                    for pattern in exp_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["expiration_date"] = match.group(1)
                            break

                # Look for state/issuing authority
                if "issuing_authority" not in extracted:
                    # State abbreviations
                    state_abbr = r'\b(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b'
                    # Full state names
                    state_names = r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\b'

                    state_match = re.search(state_abbr, line)
                    if state_match:
                        extracted["issuing_authority"] = state_match.group(1)
                    else:
                        state_match = re.search(state_names, line, re.I)
                        if state_match:
                            extracted["issuing_authority"] = state_match.group(1)

        # US Military Card & Military Dependent Card
        elif document_type in [I9DocumentType.US_MILITARY_CARD, I9DocumentType.MILITARY_DEPENDENT_CARD,
                               I9DocumentType.US_COAST_GUARD_CARD]:
            for line in lines:
                # Military ID number (DoD ID / EDIPI)
                if "document_number" not in extracted:
                    mil_patterns = [
                        r'(?:DOD\s*ID|EDIPI|ID\s*(?:NO|NUMBER)?)[:\s]*(\d{10})',
                        r'(?:SERVICE\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{8,12})',
                        r'\b(\d{10})\b'  # 10-digit DoD ID
                    ]
                    for pattern in mil_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Expiration date
                if "expiration_date" not in extracted:
                    exp_match = re.search(r'(?:EXP|EXPIRES?)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                    if exp_match:
                        extracted["expiration_date"] = exp_match.group(1)

                # Issuing authority
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["DEPARTMENT OF DEFENSE", "DOD", "U.S. MILITARY",
                                                        "COAST GUARD", "ARMY", "NAVY", "AIR FORCE", "MARINES"]):
                        extracted["issuing_authority"] = "U.S. Department of Defense"

        # School ID, Voter Registration, Native American Tribal Document
        elif document_type in [I9DocumentType.SCHOOL_ID_PHOTO, I9DocumentType.VOTER_REGISTRATION_CARD,
                               I9DocumentType.NATIVE_AMERICAN_TRIBAL_DOCUMENT]:
            for line in lines:
                # Generic ID number
                if "document_number" not in extracted:
                    id_patterns = [
                        r'(?:ID\s*(?:NO|NUMBER)?|CARD\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{5,15})',
                        r'(?:REGISTRATION\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{5,15})',
                        r'\b([A-Z0-9]{6,12})\b'
                    ]
                    for pattern in id_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Look for issuing organization
                if "issuing_authority" not in extracted:
                    # School names, tribal names, county names
                    if any(x in line.upper() for x in ["UNIVERSITY", "COLLEGE", "SCHOOL", "TRIBE", "TRIBAL",
                                                        "COUNTY", "REGISTRAR", "ELECTION"]):
                        extracted["issuing_authority"] = line.strip()

        # School/Clinic/Daycare Records (for minors under 18)
        elif document_type in [I9DocumentType.SCHOOL_RECORD, I9DocumentType.CLINIC_RECORD,
                               I9DocumentType.DAYCARE_RECORD]:
            for line in lines:
                # Record number
                if "document_number" not in extracted:
                    record_match = re.search(r'(?:RECORD\s*(?:NO|NUMBER)?|FILE\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{4,15})', line, re.I)
                    if record_match:
                        extracted["document_number"] = record_match.group(1)

                # Issuing institution
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["SCHOOL", "CLINIC", "DAYCARE", "CENTER", "HOSPITAL"]):
                        extracted["issuing_authority"] = line.strip()

        # ========== LIST C DOCUMENTS ==========

        # Social Security Card
        elif document_type == I9DocumentType.SSN_CARD:
            for line in lines:
                # SSN pattern
                if "ssn" not in extracted and "document_number" not in extracted:
                    ssn_match = re.search(r'(\d{3}[-\s]?\d{2}[-\s]?\d{4})', line)
                    if ssn_match:
                        ssn_value = ssn_match.group(1)
                        extracted["ssn"] = ssn_value
                        extracted["document_number"] = ssn_value

                # SSN cards don't expire
                extracted["expiration_date"] = "N/A"

                # Look for Social Security Administration
                if "issuing_authority" not in extracted:
                    if "SOCIAL SECURITY" in line.upper():
                        extracted["issuing_authority"] = "Social Security Administration"

        # Birth Certificate / Certification of Birth Abroad
        elif document_type == I9DocumentType.CERTIFICATION_BIRTH_CITIZEN:
            for line in lines:
                # Certificate number
                if "document_number" not in extracted:
                    cert_patterns = [
                        r'(?:CERTIFICATE\s*(?:NO|NUMBER)?|REGISTRATION\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{5,20})',
                        r'(?:FILE\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{5,20})',
                        r'\b([A-Z]{2}\d{6,10})\b'
                    ]
                    for pattern in cert_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Birth certificates don't expire
                extracted["expiration_date"] = "N/A"

                # Issuing authority (state vital records office)
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["VITAL RECORDS", "REGISTRAR", "HEALTH DEPARTMENT",
                                                        "BUREAU OF VITAL STATISTICS", "STATE OF"]):
                        extracted["issuing_authority"] = line.strip()

        # Citizen ID Card / Resident Citizen Card
        elif document_type in [I9DocumentType.CITIZEN_ID_CARD, I9DocumentType.RESIDENT_CITIZEN_CARD]:
            for line in lines:
                # Card number
                if "document_number" not in extracted:
                    card_patterns = [
                        r'(?:CARD\s*(?:NO|NUMBER)?|ID\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{6,15})',
                        r'\b([A-Z]{2}\d{7,10})\b'
                    ]
                    for pattern in card_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # These typically don't expire
                if "expiration_date" not in extracted:
                    exp_match = re.search(r'(?:EXP|EXPIRES?)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                    if exp_match:
                        extracted["expiration_date"] = exp_match.group(1)
                    else:
                        extracted["expiration_date"] = "N/A"

                # Issuing authority
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["USCIS", "CITIZENSHIP", "IMMIGRATION"]):
                        extracted["issuing_authority"] = "U.S. Citizenship and Immigration Services"

        # Unexpired Employment Authorization / Temporary Resident Card
        elif document_type in [I9DocumentType.UNEXPIRED_EMPLOYMENT_AUTH, I9DocumentType.TEMPORARY_RESIDENT_CARD]:
            for line in lines:
                # Document number
                if "document_number" not in extracted:
                    doc_patterns = [
                        r'(?:CARD\s*(?:NO|NUMBER)?|DOCUMENT\s*(?:NO|NUMBER)?)[:\s]*([A-Z0-9]{8,15})',
                        r'\b([A-Z]{3}\d{10})\b'
                    ]
                    for pattern in doc_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Alien number
                if "alien_number" not in extracted:
                    alien_match = re.search(r'(?:A-?NUMBER)[:\s]*([A-Z]?\d{7,9})', line, re.I)
                    if alien_match:
                        extracted["alien_number"] = alien_match.group(1)

                # Expiration date (required for these documents)
                if "expiration_date" not in extracted:
                    exp_match = re.search(r'(?:EXP|EXPIRES?|VALID\s*(?:UNTIL|THROUGH))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                    if exp_match:
                        extracted["expiration_date"] = exp_match.group(1)

                # Issuing authority
                if "issuing_authority" not in extracted:
                    if any(x in line.upper() for x in ["USCIS", "IMMIGRATION", "DHS"]):
                        extracted["issuing_authority"] = "U.S. Citizenship and Immigration Services"

        # Generic fallback for any other document type
        else:
            logger.info(f"Using generic extraction for document type: {document_type}")
            for line in lines:
                # Try to find any document number
                if "document_number" not in extracted:
                    generic_patterns = [
                        r'(?:DOCUMENT|ID|CARD|LICENSE|NUMBER)[:\s#]*([A-Z0-9]{5,20})',
                        r'\b([A-Z]{2,3}\d{6,12})\b',
                        r'\b(\d{7,12})\b'
                    ]
                    for pattern in generic_patterns:
                        match = re.search(pattern, line, re.I)
                        if match:
                            extracted["document_number"] = match.group(1)
                            break

                # Try to find expiration date
                if "expiration_date" not in extracted:
                    exp_match = re.search(r'(?:EXP|EXPIRES?)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line, re.I)
                    if exp_match:
                        extracted["expiration_date"] = exp_match.group(1)

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
        """Get required fields for document type - Enhanced for all I-9 documents"""

        common_fields = ["document_number"]

        # LIST A - Documents that establish both identity and employment authorization
        if document_type in [I9DocumentType.US_PASSPORT, I9DocumentType.US_PASSPORT_CARD]:
            return common_fields + ["expiration_date", "issuing_authority"]

        elif document_type in [I9DocumentType.PERMANENT_RESIDENT_CARD, I9DocumentType.PERMANENT_RESIDENT_CARD_I551]:
            return common_fields + ["expiration_date", "alien_number"]

        elif document_type == I9DocumentType.EMPLOYMENT_AUTHORIZATION_CARD:
            return common_fields + ["expiration_date", "alien_number"]

        elif document_type in [I9DocumentType.FOREIGN_PASSPORT_I551, I9DocumentType.FOREIGN_PASSPORT_I94]:
            return common_fields + ["expiration_date", "issuing_authority"]

        # LIST B - Documents that establish identity
        elif document_type in [I9DocumentType.DRIVERS_LICENSE, I9DocumentType.STATE_ID_CARD,
                               I9DocumentType.CANADIAN_DRIVERS_LICENSE]:
            return common_fields + ["expiration_date", "issuing_authority"]

        elif document_type in [I9DocumentType.US_MILITARY_CARD, I9DocumentType.MILITARY_DEPENDENT_CARD,
                               I9DocumentType.US_COAST_GUARD_CARD]:
            return common_fields + ["expiration_date"]

        elif document_type in [I9DocumentType.SCHOOL_ID_PHOTO, I9DocumentType.VOTER_REGISTRATION_CARD,
                               I9DocumentType.NATIVE_AMERICAN_TRIBAL_DOCUMENT]:
            return common_fields + ["issuing_authority"]

        elif document_type in [I9DocumentType.SCHOOL_RECORD, I9DocumentType.CLINIC_RECORD,
                               I9DocumentType.DAYCARE_RECORD]:
            return common_fields + ["issuing_authority"]

        # LIST C - Documents that establish employment authorization
        elif document_type == I9DocumentType.SSN_CARD:
            return ["ssn"]  # SSN is the document number for SSN cards

        elif document_type == I9DocumentType.CERTIFICATION_BIRTH_CITIZEN:
            return common_fields + ["issuing_authority"]

        elif document_type in [I9DocumentType.CITIZEN_ID_CARD, I9DocumentType.RESIDENT_CITIZEN_CARD]:
            return common_fields

        elif document_type in [I9DocumentType.UNEXPIRED_EMPLOYMENT_AUTH, I9DocumentType.TEMPORARY_RESIDENT_CARD]:
            return common_fields + ["expiration_date"]

        # Default fallback
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
