"""
I-9 Section 2 Document Verification and Employer Attestation System
Federal compliance implementation per USCIS Form I-9 requirements
"""
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta, timezone
from pydantic import BaseModel, validator
from enum import Enum
import re
import json
import logging

# Configure logging for compliance tracking
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class I9DocumentList(str, Enum):
    """USCIS Acceptable Document Categories per Form I-9"""
    LIST_A = "list_a"  # Documents that establish both identity and employment authorization
    LIST_B = "list_b"  # Documents that establish identity
    LIST_C = "list_c"  # Documents that establish employment authorization

class I9DocumentType(str, Enum):
    """USCIS Acceptable Documents - Complete enumeration per federal requirements"""
    
    # LIST A - Documents that establish both identity and employment authorization
    US_PASSPORT = "us_passport"
    US_PASSPORT_CARD = "us_passport_card"
    PERMANENT_RESIDENT_CARD = "permanent_resident_card"
    FOREIGN_PASSPORT_I551 = "foreign_passport_i551"
    EMPLOYMENT_AUTHORIZATION_CARD = "employment_authorization_card"
    FOREIGN_PASSPORT_I94 = "foreign_passport_i94"
    PERMANENT_RESIDENT_CARD_I551 = "permanent_resident_card_i551"
    
    # LIST B - Documents that establish identity
    DRIVERS_LICENSE = "drivers_license"
    STATE_ID_CARD = "state_id_card"
    SCHOOL_ID_PHOTO = "school_id_photo"
    VOTER_REGISTRATION_CARD = "voter_registration_card"
    US_MILITARY_CARD = "us_military_card"
    MILITARY_DEPENDENT_CARD = "military_dependent_card"
    US_COAST_GUARD_CARD = "us_coast_guard_card"
    NATIVE_AMERICAN_TRIBAL_DOCUMENT = "native_american_tribal_document"
    CANADIAN_DRIVERS_LICENSE = "canadian_drivers_license"
    SCHOOL_RECORD = "school_record"
    CLINIC_RECORD = "clinic_record"
    DAYCARE_RECORD = "daycare_record"
    
    # LIST C - Documents that establish employment authorization
    SSN_CARD = "ssn_card"
    CERTIFICATION_BIRTH_CITIZEN = "certification_birth_citizen"
    CITIZEN_ID_CARD = "citizen_id_card"
    RESIDENT_CITIZEN_CARD = "resident_citizen_card"
    UNEXPIRED_EMPLOYMENT_AUTH = "unexpired_employment_auth"
    TEMPORARY_RESIDENT_CARD = "temporary_resident_card"

class DocumentVerificationStatus(str, Enum):
    """Document verification status per federal compliance requirements"""
    PENDING_UPLOAD = "pending_upload"
    UPLOADED = "uploaded"
    OCR_PROCESSING = "ocr_processing"
    OCR_COMPLETED = "ocr_completed"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"

class I9Section2Status(str, Enum):
    """I-9 Section 2 completion status per federal requirements"""
    NOT_STARTED = "not_started"
    EMPLOYEE_COMPLETED = "employee_completed"
    AWAITING_DOCUMENTS = "awaiting_documents"
    DOCUMENTS_UPLOADED = "documents_uploaded"
    MANAGER_REVIEWING = "manager_reviewing"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    NON_COMPLIANT = "non_compliant"

class I9UploadedDocument(BaseModel):
    """Model for uploaded I-9 Section 2 documents"""
    id: str
    employee_id: str
    session_id: str
    document_type: I9DocumentType
    document_list: I9DocumentList
    
    # File information
    file_name: str
    file_size: int
    mime_type: str
    file_data: str  # Base64 encoded
    
    # OCR extracted data
    ocr_data: Dict[str, Any] = {}
    ocr_confidence: float = 0.0
    
    # Document details extracted
    document_number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    expiration_date: Optional[date] = None
    
    # Verification status
    verification_status: DocumentVerificationStatus = DocumentVerificationStatus.PENDING_UPLOAD
    verification_notes: List[str] = []
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    
    # Compliance tracking
    uploaded_at: datetime
    compliance_issues: List[str] = []
    is_acceptable: Optional[bool] = None

class I9Section2CompletionData(BaseModel):
    """Manager completion data for I-9 Section 2"""
    
    # Employee first day of employment (required)
    first_day_employment: date
    
    # Document verification results
    list_a_document: Optional[str] = None  # Document ID if List A used
    list_b_document: Optional[str] = None  # Document ID if List B used  
    list_c_document: Optional[str] = None  # Document ID if List C used
    
    # Verification details for up to 3 documents
    document_1_title: str
    document_1_issuing_authority: str
    document_1_number: str
    document_1_expiration: Optional[date] = None
    
    document_2_title: Optional[str] = None
    document_2_issuing_authority: Optional[str] = None
    document_2_number: Optional[str] = None
    document_2_expiration: Optional[date] = None
    
    document_3_title: Optional[str] = None
    document_3_issuing_authority: Optional[str] = None
    document_3_number: Optional[str] = None
    document_3_expiration: Optional[date] = None
    
    # Additional information
    additional_info: Optional[str] = None
    
    # Employer attestation
    employer_name: str
    employer_title: str
    employer_signature_date: date
    
    # Business information
    business_name: str
    business_address: str
    business_city: str
    business_state: str
    business_zip: str
    
    @validator('first_day_employment')
    def validate_employment_date(cls, v):
        """Validate first day of employment per federal requirements"""
        if v > date.today():
            raise ValueError("FEDERAL COMPLIANCE: First day of employment cannot be in the future")
        
        # Check if within reasonable timeframe (not more than 90 days ago for new hires)
        days_ago = (date.today() - v).days
        if days_ago > 90:
            logger.warning(f"First day of employment is {days_ago} days ago - may require explanation")
        
        return v

class I9Section2ValidationError(BaseModel):
    """Validation error for I-9 Section 2 compliance"""
    field: str
    message: str
    compliance_code: str
    severity: str  # "error", "warning", "info"

class USCISDocumentValidator:
    """USCIS Document Validation Service per federal requirements"""
    
    # USCIS Acceptable Documents mapping
    ACCEPTABLE_DOCUMENTS = {
        I9DocumentList.LIST_A: {
            I9DocumentType.US_PASSPORT: {
                "title": "U.S. Passport",
                "issuing_authority": "U.S. Department of State",
                "requires_expiration": True,
                "pattern": r"^\d{9}$",
                "description": "U.S. Passport Book or Card"
            },
            I9DocumentType.US_PASSPORT_CARD: {
                "title": "U.S. Passport Card",
                "issuing_authority": "U.S. Department of State", 
                "requires_expiration": True,
                "pattern": r"^C\d{8}$",
                "description": "U.S. Passport Card"
            },
            I9DocumentType.PERMANENT_RESIDENT_CARD: {
                "title": "Permanent Resident Card",
                "issuing_authority": "U.S. Citizenship and Immigration Services",
                "requires_expiration": True,
                "pattern": r"^[A-Z]{3}\d{9}$",
                "description": "Form I-551 Permanent Resident Card"
            },
            I9DocumentType.EMPLOYMENT_AUTHORIZATION_CARD: {
                "title": "Employment Authorization Document",
                "issuing_authority": "U.S. Citizenship and Immigration Services",
                "requires_expiration": True,
                "pattern": r"^[A-Z]{3}\d{9}$",
                "description": "Form I-766 Employment Authorization Document"
            }
        },
        I9DocumentList.LIST_B: {
            I9DocumentType.DRIVERS_LICENSE: {
                "title": "Driver's License",
                "issuing_authority": "State DMV",
                "requires_expiration": True,
                "pattern": None,  # Varies by state
                "description": "State-issued driver's license with photograph"
            },
            I9DocumentType.STATE_ID_CARD: {
                "title": "State ID Card", 
                "issuing_authority": "State DMV",
                "requires_expiration": True,
                "pattern": None,  # Varies by state
                "description": "State-issued identification card with photograph"
            },
            I9DocumentType.US_MILITARY_CARD: {
                "title": "U.S. Military Card",
                "issuing_authority": "U.S. Department of Defense",
                "requires_expiration": True,
                "pattern": r"^\d{10}$",
                "description": "U.S. Military identification card"
            }
        },
        I9DocumentList.LIST_C: {
            I9DocumentType.SSN_CARD: {
                "title": "Social Security Card",
                "issuing_authority": "Social Security Administration",
                "requires_expiration": False,
                "pattern": r"^\d{3}-\d{2}-\d{4}$",
                "description": "Social Security Account Number Card"
            },
            I9DocumentType.CERTIFICATION_BIRTH_CITIZEN: {
                "title": "Certification of Birth",
                "issuing_authority": "Vital Records Office",
                "requires_expiration": False,
                "pattern": None,
                "description": "Certification of Birth Abroad or Certificate of Citizenship"
            }
        }
    }
    
    @staticmethod
    def get_document_list(document_type: I9DocumentType) -> I9DocumentList:
        """Determine which list a document belongs to"""
        for list_type, documents in USCISDocumentValidator.ACCEPTABLE_DOCUMENTS.items():
            if document_type in documents:
                return list_type
        raise ValueError(f"Invalid document type: {document_type}")
    
    @staticmethod
    def validate_document_combination(documents: List[I9DocumentType]) -> Tuple[bool, List[str]]:
        """Validate document combination per USCIS requirements"""
        errors = []
        
        if not documents:
            errors.append("FEDERAL COMPLIANCE: At least one acceptable document must be provided")
            return False, errors
        
        # Categorize documents
        list_a_docs = [doc for doc in documents if USCISDocumentValidator.get_document_list(doc) == I9DocumentList.LIST_A]
        list_b_docs = [doc for doc in documents if USCISDocumentValidator.get_document_list(doc) == I9DocumentList.LIST_B]
        list_c_docs = [doc for doc in documents if USCISDocumentValidator.get_document_list(doc) == I9DocumentList.LIST_C]
        
        # Valid combinations per USCIS:
        # 1. One List A document, OR
        # 2. One List B document AND one List C document
        
        if list_a_docs:
            if len(list_a_docs) > 1:
                errors.append("FEDERAL COMPLIANCE: Only one List A document may be accepted")
            if list_b_docs or list_c_docs:
                errors.append("FEDERAL COMPLIANCE: List A documents cannot be combined with List B or C documents")
        else:
            # Must have both List B and List C
            if not list_b_docs:
                errors.append("FEDERAL COMPLIANCE: List B document required when not using List A")
            if not list_c_docs:
                errors.append("FEDERAL COMPLIANCE: List C document required when not using List A")
            if len(list_b_docs) > 1:
                errors.append("FEDERAL COMPLIANCE: Only one List B document may be accepted")
            if len(list_c_docs) > 1:
                errors.append("FEDERAL COMPLIANCE: Only one List C document may be accepted")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_document_expiration(document_type: I9DocumentType, expiration_date: Optional[date]) -> Tuple[bool, List[str]]:
        """Validate document expiration per USCIS requirements"""
        errors = []
        
        # Get document info
        doc_list = USCISDocumentValidator.get_document_list(document_type)
        doc_info = USCISDocumentValidator.ACCEPTABLE_DOCUMENTS[doc_list][document_type]
        
        if doc_info["requires_expiration"]:
            if not expiration_date:
                errors.append(f"FEDERAL COMPLIANCE: {doc_info['title']} requires expiration date")
            elif expiration_date <= date.today():
                errors.append(f"FEDERAL COMPLIANCE: {doc_info['title']} is expired (expired: {expiration_date})")
            elif expiration_date <= date.today() + timedelta(days=30):
                errors.append(f"WARNING: {doc_info['title']} expires soon ({expiration_date})")
        
        return len(errors) == 0, errors

class I9Section2ComplianceTracker:
    """Track I-9 Section 2 compliance deadlines and requirements"""
    
    @staticmethod
    def calculate_deadlines(employee_start_date: date) -> Dict[str, date]:
        """Calculate I-9 Section 2 deadlines per federal requirements"""
        
        # Section 2 must be completed by the end of the employee's third business day
        # For simplicity, using calendar days (in practice, would exclude weekends/holidays)
        section2_deadline = employee_start_date + timedelta(days=3)
        
        # Warning deadlines
        section2_warning = employee_start_date + timedelta(days=2)
        section2_urgent = employee_start_date + timedelta(days=3)
        
        return {
            "section2_deadline": section2_deadline,
            "section2_warning": section2_warning,
            "section2_urgent": section2_urgent,
            "employee_start_date": employee_start_date
        }
    
    @staticmethod
    def get_compliance_status(employee_start_date: date, section2_completed_date: Optional[date]) -> Tuple[str, str]:
        """Get current compliance status"""
        deadlines = I9Section2ComplianceTracker.calculate_deadlines(employee_start_date)
        today = date.today()
        
        if section2_completed_date:
            if section2_completed_date <= deadlines["section2_deadline"]:
                return "COMPLIANT", "I-9 Section 2 completed within federal deadline"
            else:
                return "NON_COMPLIANT", f"I-9 Section 2 completed late (deadline: {deadlines['section2_deadline']}, completed: {section2_completed_date})"
        
        # Not yet completed
        if today <= deadlines["section2_warning"]:
            return "ON_TRACK", f"I-9 Section 2 due by {deadlines['section2_deadline']}"
        elif today <= deadlines["section2_urgent"]:
            return "WARNING", f"I-9 Section 2 due by {deadlines['section2_deadline']} - URGENT"
        else:
            return "OVERDUE", f"I-9 Section 2 overdue (deadline was: {deadlines['section2_deadline']})"

class I9Section2AuditLogger:
    """Audit logging for I-9 Section 2 compliance"""
    
    @staticmethod
    def log_document_upload(employee_id: str, document_type: I9DocumentType, user_id: str):
        """Log document upload for audit trail"""
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "I9_DOCUMENT_UPLOAD",
            "employee_id": employee_id,
            "document_type": document_type.value,
            "uploaded_by": user_id,
            "compliance_action": "DOCUMENT_SUBMITTED"
        }
        logger.info(f"I9_AUDIT: {json.dumps(audit_entry)}")
    
    @staticmethod
    def log_section2_completion(employee_id: str, manager_id: str, completion_data: I9Section2CompletionData):
        """Log I-9 Section 2 completion for audit trail"""
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "I9_SECTION2_COMPLETED",
            "employee_id": employee_id,
            "manager_id": manager_id,
            "first_day_employment": completion_data.first_day_employment.isoformat(),
            "employer_signature_date": completion_data.employer_signature_date.isoformat(),
            "business_name": completion_data.business_name,
            "compliance_action": "EMPLOYER_ATTESTATION_COMPLETED"
        }
        logger.info(f"I9_AUDIT: {json.dumps(audit_entry)}")
    
    @staticmethod
    def log_compliance_violation(employee_id: str, violation_type: str, details: str):
        """Log compliance violations for audit trail"""
        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "I9_COMPLIANCE_VIOLATION",
            "employee_id": employee_id,
            "violation_type": violation_type,
            "details": details,
            "compliance_action": "VIOLATION_DETECTED"
        }
        logger.error(f"I9_AUDIT: {json.dumps(audit_entry)}")

# Service class for I-9 Section 2 operations
class I9Section2Service:
    """Service for I-9 Section 2 operations and compliance"""
    
    def __init__(self, database: Dict[str, Any]):
        self.database = database
        self.validator = USCISDocumentValidator()
        self.compliance_tracker = I9Section2ComplianceTracker()
        self.audit_logger = I9Section2AuditLogger()
    
    def validate_document_upload(self, document_type: I9DocumentType, existing_documents: List[I9DocumentType]) -> Tuple[bool, List[str]]:
        """Validate document upload against USCIS requirements"""
        all_documents = existing_documents + [document_type]
        return self.validator.validate_document_combination(all_documents)
    
    def process_document_ocr(self, document: I9UploadedDocument, groq_client) -> Dict[str, Any]:
        """Process document OCR using Groq API"""
        # This will be implemented with the OCR processing
        pass
    
    def complete_section2(self, employee_id: str, manager_id: str, completion_data: I9Section2CompletionData) -> Tuple[bool, List[str]]:
        """Complete I-9 Section 2 with manager attestation"""
        errors = []
        
        # Validate document combination
        uploaded_docs = self._get_employee_documents(employee_id)
        doc_types = [doc.document_type for doc in uploaded_docs]
        
        is_valid, validation_errors = self.validator.validate_document_combination(doc_types)
        if not is_valid:
            errors.extend(validation_errors)
        
        # Validate deadlines
        employee = self.database["employees"].get(employee_id)
        if employee:
            status, message = self.compliance_tracker.get_compliance_status(
                completion_data.first_day_employment,
                completion_data.employer_signature_date
            )
            if status == "NON_COMPLIANT":
                errors.append(f"DEADLINE VIOLATION: {message}")
        
        if not errors:
            # Log successful completion
            self.audit_logger.log_section2_completion(employee_id, manager_id, completion_data)
        
        return len(errors) == 0, errors
    
    def _get_employee_documents(self, employee_id: str) -> List[I9UploadedDocument]:
        """Get all I-9 documents for an employee"""
        documents = []
        for doc_id, doc in self.database.get("i9_documents", {}).items():
            if doc.employee_id == employee_id:
                documents.append(doc)
        return documents