"""
Enhanced data models for comprehensive onboarding system
"""
from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, date, timezone
from enum import Enum
import uuid

# Enhanced Enums
class UserRole(str, Enum):
    HR = "hr"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    TALENT_POOL = "talent_pool"
    WITHDRAWN = "withdrawn"

class ApplicationStatusChange(BaseModel):
    id: str
    application_id: str
    old_status: ApplicationStatus
    new_status: ApplicationStatus
    changed_by: str
    changed_at: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None

class OnboardingStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    EMPLOYEE_COMPLETED = "employee_completed"
    COMPLETED = "completed"  # ✅ Added for final onboarding completion
    MANAGER_REVIEW = "manager_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

class OnboardingStep(str, Enum):
    WELCOME = "welcome"
    PERSONAL_INFO = "personal-info"
    JOB_DETAILS = "job-details"
    DOCUMENT_UPLOAD = "document-upload"
    I9_SECTION1 = "i9-section1"
    I9_COMPLETE = "i9-complete"
    W4_FORM = "w4-form"
    DIRECT_DEPOSIT = "direct-deposit"
    EMERGENCY_CONTACTS = "emergency-contacts"
    HEALTH_INSURANCE = "health-insurance"
    COMPANY_POLICIES = "company-policies"
    TRAFFICKING_AWARENESS = "trafficking-awareness"
    HUMAN_TRAFFICKING = "human-trafficking"  # Alternative name
    WEAPONS_POLICY = "weapons-policy"
    BACKGROUND_CHECK = "background-check"
    PHOTO_CAPTURE = "photo-capture"
    EMPLOYEE_SIGNATURE = "employee-signature"
    EMPLOYEE_REVIEW = "employee-review"
    MANAGER_REVIEW = "manager-review"
    I9_SECTION2 = "i9-section2"
    MANAGER_SIGNATURE = "manager-signature"
    COMPLETED = "completed"

class DocumentType(str, Enum):
    DRIVERS_LICENSE = "drivers_license"
    STATE_ID = "state_id"
    PASSPORT = "passport"
    SSN_CARD = "ssn_card"
    WORK_AUTHORIZATION = "work_authorization"
    I9_FORM = "i9_form"
    W4_FORM = "w4_form"
    DIRECT_DEPOSIT = "direct_deposit"
    EMERGENCY_CONTACTS = "emergency_contacts"
    HEALTH_INSURANCE = "health_insurance"
    COMPANY_POLICIES = "company_policies"
    BACKGROUND_CHECK = "background_check"
    PHOTO = "photo"
    VOIDED_CHECK = "voided_check"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    PROCESSED = "processed"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVISION = "needs_revision"

class SignatureType(str, Enum):
    EMPLOYEE_I9 = "employee_i9"
    EMPLOYEE_W4 = "employee_w4"
    EMPLOYEE_POLICIES = "employee_policies"
    EMPLOYEE_FINAL = "employee_final"
    MANAGER_I9 = "manager_i9"
    MANAGER_APPROVAL = "manager_approval"

# Base Models
class User(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    property_id: Optional[str] = None
    password_hash: Optional[str] = None  # For HR users stored in Supabase
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

class Property(BaseModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: Optional[str] = None
    manager_ids: List[str] = []
    qr_code_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime

# Enhanced Application Model
class JobApplication(BaseModel):
    id: str
    property_id: str
    department: str
    position: str
    applicant_data: Dict[str, Any]
    status: ApplicationStatus
    applied_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    talent_pool_date: Optional[datetime] = None  # When moved to talent pool
    
    # Enhanced applicant data structure
    @validator('applicant_data')
    def validate_applicant_data(cls, v):
        required_fields = [
            'first_name', 'last_name', 'email', 'phone', 'address',
            'city', 'state', 'zip_code'
        ]
        # Optional fields that may not be present in older applications
        optional_fields = ['work_authorized']

        for field in required_fields:
            if field not in v:
                raise ValueError(f'Missing required field: {field}')

        # Set default values for optional fields if missing
        for field in optional_fields:
            if field not in v:
                v[field] = 'unknown'  # Default value for missing work_authorized

        return v

# Comprehensive Onboarding Session Model
class OnboardingSession(BaseModel):
    id: str
    employee_id: str
    application_id: Optional[str] = None
    token: str
    status: OnboardingStatus
    current_step: OnboardingStep
    phase: str = "employee"  # Add missing phase attribute
    language_preference: str = "en"  # en, es
    
    # Progress tracking
    steps_completed: List[OnboardingStep] = []
    progress_percentage: float = 0.0
    
    # Form data storage
    form_data: Dict[str, Any] = {}
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    employee_completed_at: Optional[datetime] = None
    manager_review_started_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    expires_at: datetime
    
    # Review information
    reviewed_by: Optional[str] = None  # Manager ID
    manager_comments: Optional[str] = None
    rejection_reason: Optional[str] = None
    
    @property
    def is_expired(self) -> bool:
        """Check if the session has expired"""
        from datetime import timezone
        return datetime.now(timezone.utc) > self.expires_at if self.expires_at else False

# Enhanced Employee Model
class Employee(BaseModel):
    id: str
    user_id: Optional[str] = None  # Can be None for employees not yet linked to users
    employee_number: Optional[str] = None  # Generated employee number
    application_id: Optional[str] = None
    property_id: str
    manager_id: Optional[str] = None  # Manager can be assigned later
    
    # Job information
    department: str
    position: str
    hire_date: date
    start_date: Optional[date] = None
    pay_rate: Optional[float] = None
    pay_frequency: str = "biweekly"
    employment_type: str = "full_time"
    
    # Personal information
    personal_info: Optional[Dict[str, Any]] = None  # Can be None initially
    emergency_contacts: List[Dict[str, Any]] = []
    
    # Status tracking
    employment_status: str = "active"
    onboarding_status: OnboardingStatus = OnboardingStatus.NOT_STARTED
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    onboarding_completed_at: Optional[datetime] = None

# Document Models
class Document(BaseModel):
    id: str
    employee_id: str
    session_id: str
    document_type: DocumentType
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    
    # OCR and processing
    ocr_data: Dict[str, Any] = {}
    processing_status: str = "pending"
    
    # Form data (for form-based documents)
    form_data: Dict[str, Any] = {}
    
    # Status and review
    status: DocumentStatus = DocumentStatus.PENDING
    version: int = 1
    
    # Review information
    reviewed_by: Optional[str] = None
    review_comments: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

# Digital Signature Model
class DigitalSignature(BaseModel):
    id: str
    session_id: str
    employee_id: str
    document_id: Optional[str] = None
    signature_type: SignatureType
    
    # Signature data
    signature_data: str  # SVG or base64 image data
    signature_hash: str  # For integrity verification
    
    # Metadata
    signed_by: str  # User ID
    signed_by_name: str
    signed_by_role: UserRole
    
    # Legal compliance
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    
    # Verification
    is_verified: bool = False
    verification_method: Optional[str] = None

# Approval and Review Models
class ReviewAction(BaseModel):
    id: str
    session_id: str
    document_id: Optional[str] = None
    reviewer_id: str
    reviewer_name: str
    action: str  # "approve", "reject", "request_changes"
    comments: Optional[str] = None
    timestamp: datetime

class OnboardingApproval(BaseModel):
    id: str
    session_id: str
    employee_id: str
    approved_by: str  # Manager ID
    approved_by_name: str
    
    # Approval details
    approved_at: datetime
    approval_comments: Optional[str] = None
    
    # Final status
    final_status: OnboardingStatus
    next_steps: Optional[str] = None

# Form-specific Models
class PersonalInformation(BaseModel):
    first_name: str
    last_name: str
    middle_initial: Optional[str] = ""
    preferred_name: Optional[str] = None
    date_of_birth: date
    ssn: str
    phone: str
    email: EmailStr
    
    # Address
    address: str
    apt_number: Optional[str] = ""
    city: str
    state: str
    zip_code: str
    
    # Demographics
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    is_primary: bool = False

class HealthInsuranceElection(BaseModel):
    # Medical coverage
    medical_plan: Optional[str] = None  # "hra_6k", "hra_4k", "hra_2k", "minimum_essential", "declined"
    medical_tier: Optional[str] = None  # "employee", "employee_spouse", "employee_children", "family"
    medical_cost: Optional[float] = 0.0
    
    # Additional coverage
    dental_coverage: bool = False
    dental_tier: Optional[str] = None
    dental_cost: Optional[float] = 0.0
    
    vision_coverage: bool = False
    vision_tier: Optional[str] = None
    vision_cost: Optional[float] = 0.0
    
    # Dependents
    dependents: List[Dict[str, Any]] = []
    
    # Total costs
    total_biweekly_cost: float = 0.0
    
    # Waiver information
    is_waived: bool = False
    waiver_reason: Optional[str] = None
    other_coverage_details: Optional[str] = None

class DirectDepositInfo(BaseModel):
    # Bank information
    bank_name: str
    bank_address: Optional[str] = None
    routing_number: str
    account_number: str
    account_type: str  # "checking", "savings"
    
    # Deposit allocation
    deposit_type: str = "full"  # "full", "partial", "split"
    deposit_amount: Optional[float] = None
    
    # Additional accounts (for split deposits)
    additional_accounts: List[Dict[str, Any]] = []
    
    # Verification
    voided_check_uploaded: bool = False
    bank_letter_uploaded: bool = False

# Form-specific data models aligned with UI components

class I9Section1Data(BaseModel):
    """I-9 Section 1 form data matching I9Section1Form.tsx field structure"""
    # Personal Information (exact field names from UI)
    employee_last_name: str
    employee_first_name: str
    employee_middle_initial: Optional[str] = ""
    other_last_names: Optional[str] = ""
    
    # Address fields (exact field names from UI)
    address_street: str
    address_apt: Optional[str] = ""
    address_city: str
    address_state: str
    address_zip: str
    
    # Personal details (exact field names from UI)
    date_of_birth: str  # YYYY-MM-DD format from UI
    ssn: str
    email: EmailStr
    phone: str
    
    # Citizenship status (exact values from UI)
    citizenship_status: str  # 'us_citizen', 'noncitizen_national', 'permanent_resident', 'authorized_alien'
    
    # Additional fields for non-citizens (exact field names from UI)
    uscis_number: Optional[str] = ""
    i94_admission_number: Optional[str] = ""
    passport_number: Optional[str] = ""
    passport_country: Optional[str] = ""
    work_authorization_expiration: Optional[str] = ""
    
    # Completion metadata
    section_1_completed_at: Optional[str] = None
    employee_signature_date: Optional[str] = None
    
    @validator('citizenship_status')
    def validate_citizenship_status(cls, v):
        valid_statuses = ['us_citizen', 'noncitizen_national', 'permanent_resident', 'authorized_alien']
        if v not in valid_statuses:
            raise ValueError(f'FEDERAL IMMIGRATION COMPLIANCE: Invalid citizenship status. Must be one of USCIS-approved categories: {valid_statuses}')
        return v
    
    @validator('date_of_birth')
    def validate_date_of_birth(cls, v):
        try:
            from datetime import datetime, date
            birth_date = datetime.strptime(v, '%Y-%m-%d').date()
            
            # CRITICAL: Federal age validation - must be 18 or older
            today = date.today()
            age = today.year - birth_date.year
            if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
                age -= 1
            
            if age < 18:
                raise ValueError(f'FEDERAL COMPLIANCE VIOLATION: Employee must be at least 18 years old. Current age: {age}. Reference: Fair Labor Standards Act (FLSA) Section 203.')
            
        except ValueError as e:
            if 'FEDERAL COMPLIANCE' in str(e):
                raise e
            raise ValueError('Date of birth must be in YYYY-MM-DD format')
        return v
    
    @validator('address_zip')
    def validate_zip_code(cls, v):
        import re
        if not re.match(r'^\d{5}(-\d{4})?$', v):
            raise ValueError('FEDERAL COMPLIANCE: ZIP code must be in valid US Postal Service format 12345 or 12345-6789')
        return v
    
    @validator('ssn')
    def validate_ssn(cls, v):
        import re
        # Remove dashes for validation
        ssn_clean = v.replace('-', '').replace(' ', '')
        
        # Must be exactly 9 digits
        if not re.match(r'^\d{9}$', ssn_clean):
            raise ValueError('FEDERAL COMPLIANCE: SSN must be exactly 9 digits in format XXX-XX-XXXX')
        
        # Federal prohibited SSN patterns
        area = ssn_clean[:3]
        group = ssn_clean[3:5]
        serial = ssn_clean[5:9]
        
        # Invalid area numbers (000, 666, 900-999)
        if area == '000' or area == '666' or int(area) >= 900:
            raise ValueError(f'FEDERAL COMPLIANCE: Invalid SSN area number {area}. This SSN format is not issued by the Social Security Administration.')
        
        # Invalid group number (00)
        if group == '00':
            raise ValueError('FEDERAL COMPLIANCE: Invalid SSN group number 00. Group number cannot be 00.')
        
        # Invalid serial number (0000)
        if serial == '0000':
            raise ValueError('FEDERAL COMPLIANCE: Invalid SSN serial number 0000. Serial number cannot be 0000.')
        
        # Known advertising/placeholder SSNs
        known_invalid = [
            '123456789', '111111111', '222222222', '333333333', '444444444',
            '555555555', '777777777', '888888888', '999999999', '078051120',
            '219099999', '457555462'
        ]
        
        if ssn_clean in known_invalid:
            raise ValueError('FEDERAL COMPLIANCE: This SSN is a known invalid/placeholder number and cannot be used for employment.')
        
        return v

class W4FormData(BaseModel):
    """W-4 form data matching W4Form.tsx field structure"""
    # Personal Information (exact field names from UI)
    first_name: str
    middle_initial: Optional[str] = ""
    last_name: str
    address: str
    city: str
    state: str
    zip_code: str
    ssn: str
    
    # Filing Status (exact field names from UI)
    filing_status: str  # "Single", "Married filing jointly", "Head of household"
    
    # Step 2: Multiple Jobs (exact field names from UI)
    multiple_jobs_checkbox: bool = False
    spouse_works_checkbox: bool = False
    
    # Step 3: Dependents (exact field names from UI)
    dependents_amount: float = 0.0  # Number of qualifying children × $2,000
    other_credits: float = 0.0      # Number of other dependents × $500
    
    # Step 4: Other Adjustments (exact field names from UI)
    other_income: float = 0.0
    deductions: float = 0.0
    extra_withholding: float = 0.0
    
    # Signature (exact field names from UI)
    signature: str = ""
    signature_date: str
    
    @validator('filing_status')
    def validate_filing_status(cls, v):
        valid_statuses = ["Single", "Married filing jointly", "Head of household"]
        if v not in valid_statuses:
            raise ValueError(f'FEDERAL TAX COMPLIANCE: Invalid filing status. Must be one of IRS-approved categories: {valid_statuses}')
        return v
    
    @validator('signature_date')
    def validate_signature_date(cls, v):
        try:
            from datetime import datetime, date
            signature_date = datetime.strptime(v, '%Y-%m-%d').date()
            today = date.today()
            
            if signature_date > today:
                raise ValueError('FEDERAL TAX COMPLIANCE: Signature date cannot be in the future')
            
            # Warn if signature is more than 30 days old (but don't block)
            days_old = (today - signature_date).days
            if days_old > 30:
                # This is logged as a warning but doesn't block processing
                pass
                
        except ValueError as e:
            if 'FEDERAL TAX COMPLIANCE' in str(e):
                raise e
            raise ValueError('Signature date must be in YYYY-MM-DD format')
        return v
    
    @validator('zip_code')
    def validate_zip_code(cls, v):
        import re
        if not re.match(r'^\d{5}(-\d{4})?$', v):
            raise ValueError('FEDERAL TAX COMPLIANCE: ZIP code must be in valid US Postal Service format 12345 or 12345-6789')
        return v

class I9Section2Data(BaseModel):
    """I-9 Section 2 employer verification data"""
    # Employee's first day of employment
    first_day_employment: str  # YYYY-MM-DD format
    
    # Document verification (List A, B, or C)
    document_title_1: Optional[str] = ""
    issuing_authority_1: Optional[str] = ""
    document_number_1: Optional[str] = ""
    expiration_date_1: Optional[str] = ""
    
    document_title_2: Optional[str] = ""
    issuing_authority_2: Optional[str] = ""
    document_number_2: Optional[str] = ""
    expiration_date_2: Optional[str] = ""
    
    document_title_3: Optional[str] = ""
    issuing_authority_3: Optional[str] = ""
    document_number_3: Optional[str] = ""
    expiration_date_3: Optional[str] = ""
    
    # Additional information
    additional_info: Optional[str] = ""
    
    # Employer signature information
    employer_name: str
    employer_title: str = "Manager"
    employer_signature_date: str
    
    # Business information
    business_name: str = "Grand Hotel & Resort"
    business_address: str
    business_city: str
    business_state: str
    business_zip: str

# Request/Response Models
class OnboardingTokenRequest(BaseModel):
    employee_id: str
    expires_hours: Optional[int] = 72
    language_preference: Optional[str] = "en"

class OnboardingTokenResponse(BaseModel):
    token: str
    onboarding_url: str
    expires_at: datetime
    employee_info: Dict[str, Any]

class OnboardingProgressUpdate(BaseModel):
    step: OnboardingStep
    form_data: Optional[Dict[str, Any]] = None
    language_preference: Optional[str] = None

class ManagerReviewRequest(BaseModel):
    action: str  # "approve", "reject", "request_changes"
    comments: Optional[str] = None
    specific_documents: Optional[List[str]] = None  # Document IDs that need attention

# PDF Generation Request Models
class I9PDFGenerationRequest(BaseModel):
    employee_data: I9Section1Data
    employer_data: Optional[I9Section2Data] = None

class W4PDFGenerationRequest(BaseModel):
    employee_data: W4FormData

# Federal Compliance Validation Models
class FederalValidationError(BaseModel):
    field: str
    message: str
    legal_code: str
    severity: str  # "error", "warning", "info"
    compliance_note: Optional[str] = None

class FederalValidationResult(BaseModel):
    is_valid: bool
    errors: List[FederalValidationError] = []
    warnings: List[FederalValidationError] = []
    compliance_notes: List[str] = []

class ComplianceAuditEntry(BaseModel):
    timestamp: str
    form_type: str
    user_id: str
    user_email: str
    compliance_status: str  # "COMPLIANT", "NON_COMPLIANT"
    error_count: int
    warning_count: int
    legal_codes: List[str]
    compliance_notes: List[str]
    audit_id: str

# API Request/Response Models for Federal Validation
class PersonalInfoValidationRequest(BaseModel):
    date_of_birth: str
    ssn: str
    first_name: str
    last_name: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    zip_code: str

class I9ValidationRequest(BaseModel):
    form_data: I9Section1Data

class W4ValidationRequest(BaseModel):
    form_data: W4FormData

class ComprehensiveValidationRequest(BaseModel):
    personal_info: Optional[PersonalInfoValidationRequest] = None
    i9_data: Optional[I9Section1Data] = None
    w4_data: Optional[W4FormData] = None

# =====================================
# PHASE 1: DOCUMENT-SPECIFIC MODELS FOR OFFICIAL FORMS INTEGRATION
# =====================================

# Document Types from Employee Hire Packet
class DocumentCategory(str, Enum):
    EMPLOYEE_NEW_HIRE_FORM = "employee_new_hire_form"
    EMPLOYEE_NEW_HIRE_NOTIFICATION = "employee_new_hire_notification"
    I9_EMPLOYMENT_ELIGIBILITY = "i9_employment_eligibility"
    I9_SUPPLEMENT_A = "i9_supplement_a"
    I9_SUPPLEMENT_B = "i9_supplement_b"
    W4_TAX_WITHHOLDING = "w4_tax_withholding"
    DIRECT_DEPOSIT_AUTH = "direct_deposit_authorization"
    COMPANY_POLICIES_ACK = "company_policies_acknowledgment"
    HUMAN_TRAFFICKING_AWARENESS = "human_trafficking_awareness"
    WEAPONS_POLICY_ACK = "weapons_policy_acknowledgment"
    HEALTH_INSURANCE_ENROLLMENT = "health_insurance_enrollment"
    PTO_POLICY_ACK = "pto_policy_acknowledgment"

class AutoFillPermission(str, Enum):
    ALLOWED = "allowed"
    RESTRICTED = "restricted"
    PROHIBITED = "prohibited"

class DocumentFieldMapping(BaseModel):
    """Maps form fields to PDF template fields with auto-fill permissions"""
    field_name: str
    pdf_field_name: str
    auto_fill_permission: AutoFillPermission
    data_source: Optional[str] = None  # Source of auto-fill data
    validation_required: bool = True
    legal_requirement: Optional[str] = None

# Employee New Hire Form (Manager fills)
class EmployeeNewHireFormData(BaseModel):
    """Manager-completed form for new employee setup"""
    # Employee identification
    employee_name: str
    position_title: str
    department: str
    employee_id: Optional[str] = None
    hire_date: str  # YYYY-MM-DD
    start_date: str  # YYYY-MM-DD
    
    # Employment details
    employment_type: str  # "full_time", "part_time", "temporary"
    pay_rate: float
    pay_frequency: str  # "hourly", "salary", "biweekly"
    work_schedule: str
    supervisor_name: str
    reporting_location: str
    
    # Benefits eligibility
    benefits_eligible: bool
    health_insurance_eligible: bool
    pto_eligible: bool
    
    # Manager information
    manager_name: str
    manager_signature: str
    manager_signature_date: str
    
    # Special instructions
    special_instructions: Optional[str] = ""
    orientation_date: Optional[str] = None
    uniform_size: Optional[str] = None
    
    @validator('hire_date', 'start_date')
    def validate_dates(cls, v):
        try:
            from datetime import datetime
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    
    @validator('pay_rate')
    def validate_pay_rate(cls, v):
        if v <= 0:
            raise ValueError('Pay rate must be greater than 0')
        # Minimum wage validation could be added here
        return v

# Enhanced I-9 Supplement A (Preparer/Translator) - CRITICAL: No auto-fill allowed
class I9SupplementAData(BaseModel):
    """I-9 Supplement A: Preparer and/or Translator Certification - FEDERAL COMPLIANCE: NO AUTO-FILL"""
    # CRITICAL COMPLIANCE NOTE: This form MUST be filled manually by the preparer/translator
    # Auto-fill is PROHIBITED by federal law for this supplement
    
    # Preparer/Translator information (MANUAL ENTRY ONLY)
    preparer_last_name: str = ""
    preparer_first_name: str = ""
    preparer_address: str = ""
    preparer_city: str = ""
    preparer_state: str = ""
    preparer_zip_code: str = ""
    
    # Certification checkboxes (MANUAL SELECTION ONLY)
    prepared_section1: bool = False  # I prepared Section 1 of this form
    translated_section1: bool = False  # I translated the instructions and responses to Section 1
    
    # Attestation and signature (MANUAL ONLY)
    preparer_signature: str = ""  # Digital signature data
    preparer_signature_date: str = ""
    
    # Legal attestation text (read-only)
    attestation_text: str = "I attest, under penalty of perjury, that I have assisted in the completion and/or translation of Section 1 of this form and that to the best of my knowledge the information is true and correct."
    
    # Compliance metadata
    auto_fill_disabled: bool = True  # System flag to prevent auto-fill
    manual_entry_required: bool = True
    federal_compliance_note: str = "Federal law prohibits auto-filling this form. Must be completed manually by preparer/translator."
    
    @validator('preparer_signature_date')
    def validate_signature_date(cls, v):
        if v:
            try:
                from datetime import datetime, date
                sig_date = datetime.strptime(v, '%Y-%m-%d').date()
                if sig_date > date.today():
                    raise ValueError('FEDERAL COMPLIANCE: Signature date cannot be in the future')
            except ValueError as e:
                if 'FEDERAL COMPLIANCE' in str(e):
                    raise e
                raise ValueError('Signature date must be in YYYY-MM-DD format')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "preparer_last_name": "",
                "preparer_first_name": "",
                "auto_fill_disabled": True,
                "federal_compliance_note": "This form must be completed manually by the preparer or translator. Auto-fill is prohibited by federal immigration law."
            }
        }

# Enhanced I-9 Supplement B (Reverification) - LIMITED auto-fill
class I9SupplementBData(BaseModel):
    """I-9 Supplement B: Reverification and Rehires - MANAGER USE ONLY"""
    # Employee information (auto-fill from employee data allowed)
    employee_last_name: str
    employee_first_name: str
    employee_middle_initial: Optional[str] = ""
    
    # Employment dates (manager provides)
    date_of_hire: str  # Original hire date
    date_of_rehire: Optional[str] = ""  # If applicable
    date_of_termination: Optional[str] = ""  # If applicable
    
    # Name change (if applicable)
    new_name_last: Optional[str] = ""
    new_name_first: Optional[str] = ""
    new_name_middle: Optional[str] = ""
    
    # Document reverification (List A or C only)
    reverify_document_title: str
    reverify_document_number: str
    reverify_expiration_date: Optional[str] = ""
    
    # Employer information (auto-fill allowed from business data)
    employer_business_name: str
    employer_name: str
    employer_title: str = "Manager"
    employer_signature: str
    employer_signature_date: str
    
    # Compliance tracking
    reverification_reason: str  # "expiration", "rehire", "name_change"
    three_day_rule_compliant: bool = True  # Must reverify within 3 days
    
    @validator('date_of_hire', 'date_of_rehire', 'date_of_termination', 'reverify_expiration_date', 'employer_signature_date')
    def validate_dates(cls, v):
        if v and v.strip():
            try:
                from datetime import datetime
                datetime.strptime(v, '%Y-%m-%d')
                return v
            except ValueError:
                raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @validator('three_day_rule_compliant')
    def validate_three_day_rule(cls, v, values):
        # If this is a reverification due to expiration, check 3-day rule
        if values.get('reverification_reason') == 'expiration':
            # Implementation would check if reverification is within 3 business days
            pass
        return v

# Direct Deposit Authorization Form
class DirectDepositAuthorizationData(BaseModel):
    """Direct Deposit Authorization Form with banking compliance"""
    # Employee information (auto-fill allowed)
    employee_name: str
    employee_ssn: str
    employee_email: str
    employee_address: str
    
    # Bank account information (manual entry required for security)
    bank_name: str
    bank_address: Optional[str] = ""
    bank_city: Optional[str] = ""
    bank_state: Optional[str] = ""
    bank_zip: Optional[str] = ""
    
    # Account details
    routing_number: str
    account_number: str
    account_type: str  # "checking", "savings"
    
    # Deposit allocation
    deposit_type: str = "full"  # "full", "partial", "split"
    deposit_amount: Optional[float] = None  # For partial deposits
    remaining_amount_method: Optional[str] = "check"  # "check", "other_account"
    
    # Additional accounts for split deposits
    secondary_bank_name: Optional[str] = ""
    secondary_routing_number: Optional[str] = ""
    secondary_account_number: Optional[str] = ""
    secondary_account_type: Optional[str] = ""
    secondary_deposit_amount: Optional[float] = None
    
    # Authorization and signatures
    employee_signature: str
    employee_signature_date: str
    
    # Verification documents
    voided_check_uploaded: bool = False
    bank_verification_letter: bool = False
    
    @validator('routing_number')
    def validate_routing_number(cls, v):
        import re
        routing = v.replace('-', '').replace(' ', '')
        if not re.match(r'^\d{9}$', routing):
            raise ValueError('BANKING COMPLIANCE: Routing number must be exactly 9 digits')
        return v
    
    @validator('account_number')
    def validate_account_number(cls, v):
        import re
        account = v.replace('-', '').replace(' ', '')
        if not re.match(r'^\d{4,17}$', account):
            raise ValueError('BANKING COMPLIANCE: Account number must be 4-17 digits')
        return v
    
    @validator('deposit_amount', 'secondary_deposit_amount')
    def validate_amounts(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Deposit amount must be greater than 0')
        return v

# Job Application Submission Models

# Supporting models for complex sections
class EducationEntry(BaseModel):
    """Model for education history entries"""
    school_name: str
    location: str
    years_attended: str
    graduated: bool
    degree_received: Optional[str] = None

class EmploymentHistoryEntry(BaseModel):
    """Model for employment history entries"""
    company_name: str
    phone: str
    address: str
    supervisor: str
    job_title: str
    starting_salary: str
    ending_salary: str
    from_date: str  # Accepts YYYY-MM or MM/YYYY
    to_date: str    # Accepts YYYY-MM or MM/YYYY or "Present"
    reason_for_leaving: str
    may_contact: bool

    @validator('from_date', 'to_date')
    def validate_employment_dates(cls, v):
        # Allow empty values for MVP (frontend may omit)
        if v is None or v == "":
            return v
        if isinstance(v, str) and v.lower() == 'present':
            return v
        from datetime import datetime
        # Accept both YYYY-MM and MM/YYYY
        for fmt in ('%Y-%m', '%m/%Y'):
            try:
                datetime.strptime(v, fmt)
                return v
            except ValueError:
                continue
        raise ValueError('Employment dates must be YYYY-MM or MM/YYYY or "Present"')

class PersonalReference(BaseModel):
    """Model for personal reference"""
    name: str
    years_known: str
    phone: str
    relationship: str

class ConvictionRecord(BaseModel):
    """Model for conviction record details"""
    has_conviction: bool
    explanation: Optional[str] = None

class MilitaryService(BaseModel):
    """Model for military service information"""
    branch: Optional[str] = None
    from_date: Optional[str] = None  # MM/YYYY format
    to_date: Optional[str] = None    # MM/YYYY format
    rank_at_discharge: Optional[str] = None
    type_of_discharge: Optional[str] = None
    disabilities_related: Optional[str] = None

class VoluntarySelfIdentification(BaseModel):
    """Model for voluntary self-identification information"""
    gender: Optional[str] = None  # "male", "female", "i_do_not_wish_to_disclose"
    ethnicity: Optional[str] = None  # Various options per EEOC including "i_do_not_wish_to_disclose"
    veteran_status: Optional[str] = None
    disability_status: Optional[str] = None

class JobApplicationData(BaseModel):
    """Comprehensive data model for job application submission matching PDF form"""
    # Personal Information
    first_name: str
    middle_initial: Optional[str] = None
    last_name: str
    email: EmailStr
    phone: str
    phone_is_cell: bool = False  # Checkbox for cell phone
    phone_is_home: bool = False  # Checkbox for home phone
    secondary_phone: Optional[str] = None
    secondary_phone_is_cell: bool = False  # Checkbox for secondary cell phone
    secondary_phone_is_home: bool = False  # Checkbox for secondary home phone
    address: str
    apartment_unit: Optional[str] = None
    city: str
    state: str
    zip_code: str
    
    # Position Information
    department: str
    position: str
    salary_desired: Optional[str] = None
    
    # Work Authorization & Legal
    work_authorized: str  # "yes", "no"
    sponsorship_required: str  # "yes", "no"
    age_verification: bool  # Confirms applicant is 18+ or will be by start date
    conviction_record: ConvictionRecord
    
    # Availability
    start_date: Optional[str] = None  # YYYY-MM-DD format; default to today's date if not provided
    shift_preference: str = "flexible"  # "morning", "afternoon", "evening", "night", "flexible"
    employment_type: str = "full_time"  # "full_time", "part_time", "on_call", "seasonal_temporary"
    seasonal_start_date: Optional[str] = None  # For seasonal/temporary positions
    seasonal_end_date: Optional[str] = None    # For seasonal/temporary positions
    
    # Previous Hotel Employment
    previous_hotel_employment: bool
    previous_hotel_details: Optional[str] = None  # Location and dates if applicable
    
    # How did you hear about us?
    how_heard: str  # Main category
    how_heard_detailed: Optional[str] = None  # Specific details (employee name, website, etc.)

    # Application language
    application_language: Optional[str] = None  # 'en' or 'es' - tracks the language used for submission

    # References
    personal_reference: PersonalReference
    
    # Military Service
    military_service: MilitaryService
    
    # Education History
    education_history: List[EducationEntry]
    
    # Employment History (Last 3 employers)
    employment_history: List[EmploymentHistoryEntry]
    
    # Skills, Languages, and Certifications
    skills_languages_certifications: Optional[str] = None
    
    # Voluntary Self-Identification
    voluntary_self_identification: Optional[VoluntarySelfIdentification] = None
    
    # Experience (simplified from original)
    experience_years: str  # "0-1", "2-5", "6-10", "10+"
    hotel_experience: str  # "yes", "no"
    
    # Additional Information
    additional_comments: Optional[str] = ""
    
    @validator('email')
    def validate_email_format(cls, v):
        # Additional email validation beyond EmailStr
        if not v or len(v.strip()) == 0:
            raise ValueError('Email address is required')
        return v.strip().lower()
    
    @validator('phone', 'secondary_phone')
    def validate_phone_format(cls, v):
        if v is None or v == '':
            return v
        import re
        # Remove all non-digit characters
        phone_digits = re.sub(r'\D', '', v)

        # Accept US phone numbers (10 digits) or international (7-15 digits)
        # International standard allows 7-15 digits including country code
        if len(phone_digits) == 10:
            return v  # US format without country code
        elif len(phone_digits) == 11 and phone_digits.startswith('1'):
            return v  # US format with country code
        elif 7 <= len(phone_digits) <= 15:
            return v  # International format
        else:
            raise ValueError('Phone number must be 7-15 digits (international) or 10 digits (US)')
        return v
    
    @validator('middle_initial')
    def validate_middle_initial(cls, v):
        if v is not None and len(v) > 1:
            raise ValueError('Middle initial must be a single character')
        return v.upper() if v else v
    
    @validator('start_date', pre=True, always=True)
    def default_start_date_and_validate(cls, v):
        # Default start date to today if not provided
        from datetime import datetime
        if v in (None, ""):
            return datetime.now(timezone.utc).strftime('%Y-%m-%d')
        # Validate format
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v

    @validator('seasonal_start_date', 'seasonal_end_date')
    def validate_optional_dates(cls, v):
        if v is None:
            return v
        from datetime import datetime
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
        return v
    
    @validator('work_authorized')
    def validate_work_authorized(cls, v):
        if v not in ['yes', 'no']:
            raise ValueError('Work authorization must be "yes" or "no"')
        return v
    
    @validator('sponsorship_required')
    def validate_sponsorship_required(cls, v):
        if v not in ['yes', 'no']:
            raise ValueError('Sponsorship requirement must be "yes" or "no"')
        return v
    
    @validator('employment_type')
    def validate_employment_type(cls, v):
        valid_types = ['full_time', 'part_time', 'on_call', 'seasonal_temporary']
        if v not in valid_types:
            raise ValueError(f'Employment type must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('shift_preference')
    def validate_shift_preference(cls, v):
        valid_shifts = ['morning', 'afternoon', 'evening', 'night', 'flexible']
        if v not in valid_shifts:
            raise ValueError(f'Shift preference must be one of: {", ".join(valid_shifts)}')
        return v
    
    @validator('employment_history')
    def validate_employment_history(cls, v):
        if len(v) > 3:
            raise ValueError('Please provide information for your last 3 employers only')
        return v
    
    @validator('education_history')
    def validate_education_history(cls, v):
        if len(v) > 4:
            raise ValueError('Please provide information for up to 4 educational institutions')
        return v

class JobApplicationResponse(BaseModel):
    """Response model for successful job application submission"""
    success: bool
    message: str
    application_id: str
    property_name: str
    position_applied: str
    next_steps: str

# Document metadata and tracking
class DocumentMetadata(BaseModel):
    """Metadata for document tracking and compliance"""
    document_id: str
    document_category: DocumentCategory
    document_version: str = "1.0"
    
    # Auto-fill configuration
    auto_fill_fields: List[DocumentFieldMapping] = []
    restricted_fields: List[str] = []  # Fields that cannot be auto-filled
    
    # Compliance tracking
    federal_compliance_required: bool = True
    state_compliance_required: bool = False
    legal_retention_years: int = 7  # Default I-9 retention period
    
    # Status tracking
    creation_timestamp: datetime
    last_modified: Optional[datetime] = None
    completion_status: str = "draft"  # "draft", "completed", "approved", "archived"
    
    # Approval workflow
    requires_manager_approval: bool = True
    requires_hr_approval: bool = False
    approval_deadline: Optional[datetime] = None
    
    # Digital signature requirements
    employee_signature_required: bool = True
    manager_signature_required: bool = False
    witness_signature_required: bool = False
    
    # Audit trail
    created_by: str  # User ID
    modified_by: Optional[str] = None
    approved_by: Optional[str] = None
    audit_trail: List[Dict[str, Any]] = []

# Document processing status
class DocumentProcessingStatus(BaseModel):
    """Status tracking for document processing"""
    document_id: str
    processing_stage: str  # "received", "processing", "validation", "approval", "complete"
    
    # Processing timestamps
    received_at: datetime
    processing_started_at: Optional[datetime] = None
    validation_completed_at: Optional[datetime] = None
    approval_completed_at: Optional[datetime] = None
    
    # Validation results
    validation_passed: Optional[bool] = None
    validation_errors: List[str] = []
    validation_warnings: List[str] = []
    
    # Approval status
    approval_status: str = "pending"  # "pending", "approved", "rejected", "changes_requested"
    approval_comments: Optional[str] = None
    approver_id: Optional[str] = None
    
    # Error handling
    processing_errors: List[str] = []
    retry_count: int = 0
    max_retries: int = 3
    
    # Compliance deadlines
    i9_three_day_deadline: Optional[datetime] = None  # For I-9 Section 2
    compliance_deadline_met: Optional[bool] = None
# Job Offer Data Model for Enhanced Application Approval
class JobOfferData(BaseModel):
    """Job offer details for application approval"""
    job_title: str
    start_date: date
    pay_rate: float
    pay_frequency: str  # "hourly", "weekly", "biweekly", "monthly"
    employment_type: str  # "full_time", "part_time", "temporary"
    supervisor: str
    benefits_eligible: bool = False
    
    @validator('pay_rate')
    def validate_pay_rate(cls, v):
        if v <= 0:
            raise ValueError('Pay rate must be greater than 0')
        return v
    
    @validator('pay_frequency')
    def validate_pay_frequency(cls, v):
        valid_frequencies = ["hourly", "weekly", "biweekly", "monthly"]
        if v not in valid_frequencies:
            raise ValueError(f'Pay frequency must be one of: {valid_frequencies}')
        return v
    
    @validator('employment_type')
    def validate_employment_type(cls, v):
        valid_types = ["full_time", "part_time", "temporary"]
        if v not in valid_types:
            raise ValueError(f'Employment type must be one of: {valid_types}')
        return v

# Manager Employee Setup Models (Phase 1 - Page 1-2 of packet)
class ManagerEmployeeSetup(BaseModel):
    """Manager-completed initial employee setup matching pages 1-2 of hire packet"""
    # Hotel/Property Information
    property_id: str
    property_name: str
    property_address: str
    property_city: str
    property_state: str
    property_zip: str
    property_phone: str
    
    # Employee Personal Information (from application)
    employee_first_name: str
    employee_middle_initial: Optional[str] = ""
    employee_last_name: str
    employee_email: EmailStr
    employee_phone: str
    employee_address: str
    employee_city: str
    employee_state: str
    employee_zip: str
    
    # Position and Employment Details
    department: str
    position: str
    job_title: str
    hire_date: date
    start_date: date
    employment_type: str  # "full_time", "part_time", "temporary", "seasonal"
    work_schedule: str  # e.g., "Monday-Friday 9AM-5PM"
    
    # Compensation
    pay_rate: float
    pay_frequency: str  # "hourly", "salary", "biweekly", "monthly"
    overtime_eligible: bool = True
    
    # Reporting Structure
    supervisor_name: str
    supervisor_title: str
    supervisor_email: EmailStr
    supervisor_phone: str
    reporting_location: str  # Where employee reports to work
    
    # Benefits Eligibility
    benefits_eligible: bool
    health_insurance_eligible: bool
    health_insurance_start_date: Optional[date] = None
    pto_eligible: bool
    pto_accrual_rate: Optional[str] = None  # e.g., "1 day per month"
    
    # Initial Benefits Selection (from application)
    health_plan_selection: Optional[str] = None  # "hra_6k", "hra_4k", "hra_2k", "minimum_essential", "declined"
    dental_coverage: bool = False
    vision_coverage: bool = False
    
    # Special Requirements
    uniform_required: bool = False
    uniform_size: Optional[str] = None
    parking_assigned: bool = False
    parking_location: Optional[str] = None
    locker_assigned: bool = False
    locker_number: Optional[str] = None
    
    # Orientation and Training
    orientation_date: date
    orientation_time: str
    orientation_location: str
    training_requirements: Optional[str] = None
    
    # Manager Information
    manager_id: str
    manager_name: str
    manager_signature: str  # Digital signature data
    manager_signature_date: datetime
    
    # System Metadata
    application_id: Optional[str] = None  # Link to original application
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    
    @validator('pay_rate')
    def validate_pay_rate(cls, v):
        if v <= 0:
            raise ValueError('Pay rate must be greater than 0')
        # Could add minimum wage validation here
        return v
    
    @validator('start_date')
    def validate_start_date(cls, v, values):
        if 'hire_date' in values and v < values['hire_date']:
            raise ValueError('Start date cannot be before hire date')
        return v
    
    @validator('health_insurance_start_date')
    def validate_insurance_date(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('Health insurance cannot start before employment start date')
        return v

class OnboardingToken(BaseModel):
    """Onboarding token for employee access"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    token: str
    token_type: str = "onboarding"  # "onboarding", "form_update"
    
    # Access details
    expires_at: datetime
    is_used: bool = False
    used_at: Optional[datetime] = None
    
    # Session tracking
    session_id: Optional[str] = None
    form_type: Optional[str] = None  # For form_update tokens
    
    # Security
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Manager or HR user ID
    
    def is_expired(self) -> bool:
        """Check if token has expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if token is valid for use"""
        return not self.is_used and not self.is_expired()

class OnboardingLinkGeneration(BaseModel):
    """Response model for onboarding link generation"""
    employee_id: str
    employee_name: str
    employee_email: str
    onboarding_url: str
    token: str
    expires_at: datetime
    session_id: str
    property_name: str
    position: str
    start_date: date
    
class ApplicationApprovalRequest(BaseModel):
    """Enhanced application approval request"""
    # Job offer details
    job_offer: JobOfferData
    
    # Additional setup information
    orientation_date: date
    orientation_time: str
    orientation_location: str
    uniform_size: Optional[str] = None
    parking_location: Optional[str] = None
    locker_number: Optional[str] = None
    training_requirements: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Benefits pre-selection (if provided in application)
    health_plan_selection: Optional[str] = None
    dental_coverage: bool = False
    vision_coverage: bool = False
    
    # Generate onboarding link
    send_onboarding_email: bool = True
    
class ApplicationRejectionRequest(BaseModel):
    """Application rejection request"""
    rejection_reason: str
    add_to_talent_pool: bool = True
    talent_pool_notes: Optional[str] = None
    send_rejection_email: bool = True

# Document Storage Models
class DocumentType(str, Enum):
    """Types of documents in the onboarding system"""
    I9_FORM = "i9_form"
    W4_FORM = "w4_form"
    DIRECT_DEPOSIT = "direct_deposit"
    INSURANCE_FORM = "insurance_form"
    COMPANY_POLICIES = "company_policies"
    BACKGROUND_CHECK = "background_check"
    DRIVERS_LICENSE = "drivers_license"
    PASSPORT = "passport"
    SOCIAL_SECURITY = "social_security"
    WORK_PERMIT = "work_permit"
    VOIDED_CHECK = "voided_check"
    OTHER = "other"

class DocumentCategory(str, Enum):
    """Categories for document classification"""
    FEDERAL_FORMS = "federal_forms"
    IDENTITY_DOCUMENTS = "identity_documents"
    FINANCIAL_DOCUMENTS = "financial_documents"
    COMPANY_DOCUMENTS = "company_documents"
    BACKGROUND_DOCUMENTS = "background_documents"

class DocumentMetadata(BaseModel):
    """Metadata for stored documents"""
    document_id: str
    document_type: DocumentType
    original_filename: str
    stored_filename: str
    file_path: str
    file_size: int
    file_hash: str
    mime_type: str
    employee_id: str
    property_id: str
    uploaded_by: str
    uploaded_at: datetime
    encryption_status: str = "encrypted"
    verification_status: str = "pending"
    retention_date: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
    access_log: List[Dict[str, Any]] = Field(default_factory=list)

class DocumentUploadRequest(BaseModel):
    """Request model for document upload"""
    document_type: DocumentType
    employee_id: str
    property_id: str
    metadata: Optional[Dict[str, Any]] = None

class DocumentAccessLog(BaseModel):
    """Log entry for document access"""
    document_id: str
    accessed_by: str
    accessed_at: datetime
    action: str  # view, download, print, email
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    purpose: Optional[str] = None

# ============================================================================
# Task 2: Database Schema Enhancement Models
# ============================================================================

class AuditLogAction(str, Enum):
    """Types of audit log actions"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    ASSIGN = "assign"
    UNASSIGN = "unassign"

class AuditLog(BaseModel):
    """Comprehensive audit logging model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: str
    user_email: str
    user_role: UserRole
    action: AuditLogAction
    resource_type: str  # e.g., "employee", "application", "property"
    resource_id: str
    property_id: Optional[str] = None
    description: str
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class NotificationChannel(str, Enum):
    """Notification delivery channels"""
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    WEBHOOK = "webhook"

class NotificationPriority(str, Enum):
    """Notification priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationStatus(str, Enum):
    """Notification delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    CANCELLED = "cancelled"

class NotificationType(str, Enum):
    """Types of notifications"""
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_APPROVED = "application_approved"
    APPLICATION_REJECTED = "application_rejected"
    ONBOARDING_STARTED = "onboarding_started"
    ONBOARDING_COMPLETED = "onboarding_completed"
    DOCUMENT_REQUIRED = "document_required"
    DEADLINE_REMINDER = "deadline_reminder"
    SYSTEM_ALERT = "system_alert"
    TASK_ASSIGNED = "task_assigned"
    COMPLIANCE_WARNING = "compliance_warning"
    I9_SECTION2_REQUIRED = "i9_section2_required"
    I9_DEADLINE_REMINDER = "i9_deadline_reminder"
    COMPLIANCE_ALERT = "compliance_alert"

class Notification(BaseModel):
    """Notification model for multi-channel alerts"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    status: NotificationStatus = NotificationStatus.PENDING
    channel: NotificationChannel
    recipient_id: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    sender_id: Optional[str] = None
    property_id: Optional[str] = None
    subject: str
    message: str
    html_content: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    scheduled_for: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AnalyticsEventType(str, Enum):
    """Types of analytics events"""
    PAGE_VIEW = "page_view"
    FORM_SUBMIT = "form_submit"
    BUTTON_CLICK = "button_click"
    FILE_UPLOAD = "file_upload"
    SEARCH = "search"
    FILTER = "filter"
    EXPORT = "export"
    ERROR = "error"
    PERFORMANCE = "performance"
    CUSTOM = "custom"

class AnalyticsEvent(BaseModel):
    """Analytics event tracking model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: AnalyticsEventType
    event_name: str
    user_id: Optional[str] = None
    session_id: str
    property_id: Optional[str] = None
    page_url: Optional[str] = None
    page_title: Optional[str] = None
    referrer_url: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    device_type: Optional[str] = None  # desktop, mobile, tablet
    browser: Optional[str] = None
    os: Optional[str] = None
    screen_resolution: Optional[str] = None
    duration_ms: Optional[int] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ReportType(str, Enum):
    """Types of reports"""
    EMPLOYEE_STATUS = "employee_status"
    COMPLIANCE = "compliance"
    ONBOARDING_PROGRESS = "onboarding_progress"
    APPLICATION_METRICS = "application_metrics"
    PROPERTY_SUMMARY = "property_summary"
    USER_ACTIVITY = "user_activity"
    DOCUMENT_STATUS = "document_status"
    AUDIT_LOG = "audit_log"
    CUSTOM = "custom"

class ReportFormat(str, Enum):
    """Report output formats"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"
    HTML = "html"

class ReportSchedule(str, Enum):
    """Report schedule frequencies"""
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class ReportTemplate(BaseModel):
    """Report template configuration model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    name: str
    description: Optional[str] = None
    type: ReportType
    format: ReportFormat
    schedule: Optional[ReportSchedule] = None
    schedule_config: Optional[Dict[str, Any]] = None  # cron expression, time, day of week, etc.
    filters: Dict[str, Any] = Field(default_factory=dict)
    columns: List[str] = Field(default_factory=list)
    grouping: Optional[List[str]] = None
    sorting: Optional[Dict[str, str]] = None  # column: asc/desc
    aggregations: Optional[Dict[str, str]] = None  # column: sum/avg/count/etc
    property_id: Optional[str] = None  # null for global reports
    created_by: str
    is_active: bool = True
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    recipients: List[str] = Field(default_factory=list)
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class SavedFilter(BaseModel):
    """Saved filter configuration for dashboards and lists"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    name: str
    description: Optional[str] = None
    filter_type: str  # "employee", "application", "property", etc.
    filters: Dict[str, Any]
    user_id: str
    property_id: Optional[str] = None
    is_default: bool = False
    is_shared: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)
