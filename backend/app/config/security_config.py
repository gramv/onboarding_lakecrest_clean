"""
Security Configuration
Centralized security settings for the application
"""
from enum import Enum
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class DocumentType(str, Enum):
    """Document types for expiration policy"""
    # I-9 Documents (highly sensitive)
    I9_FORM = "i9_form"
    I9_SECTION_1 = "i9_section_1"
    I9_SECTION_2 = "i9_section_2"
    
    # Identity Documents (highly sensitive)
    SOCIAL_SECURITY_CARD = "social_security_card"
    US_PASSPORT = "us_passport"
    PASSPORT_CARD = "passport_card"
    DRIVERS_LICENSE = "drivers_license"
    STATE_ID = "state_id"
    
    # Work Authorization (highly sensitive)
    PERMANENT_RESIDENT_CARD = "permanent_resident_card"
    EMPLOYMENT_AUTHORIZATION = "employment_authorization"
    FOREIGN_PASSPORT = "foreign_passport"
    
    # Tax Documents (sensitive)
    W4_FORM = "w4_form"
    W4_FEDERAL = "w4_federal"
    W4_STATE = "w4_state"
    
    # Banking Documents (highly sensitive)
    DIRECT_DEPOSIT = "direct_deposit"
    VOIDED_CHECK = "voided_check"
    
    # Other Documents
    EMPLOYEE_HANDBOOK = "employee_handbook"
    POLICY_ACKNOWLEDGMENT = "policy_acknowledgment"
    EMERGENCY_CONTACT = "emergency_contact"
    PROFILE_PHOTO = "profile_photo"
    
    # Generic
    OTHER = "other"


class UserRole(str, Enum):
    """User roles for access control"""
    EMPLOYEE = "employee"
    MANAGER = "manager"
    HR = "hr"
    ADMIN = "admin"
    SYSTEM = "system"


# ============================================
# SIGNED URL EXPIRATION POLICY
# ============================================

# Base expiration times in seconds by document type
SIGNED_URL_BASE_EXPIRATION: Dict[str, int] = {
    # Highly sensitive documents - SHORT expiration (30 minutes)
    DocumentType.I9_FORM: 1800,
    DocumentType.I9_SECTION_1: 1800,
    DocumentType.I9_SECTION_2: 1800,
    DocumentType.SOCIAL_SECURITY_CARD: 1800,
    DocumentType.US_PASSPORT: 1800,
    DocumentType.PASSPORT_CARD: 1800,
    DocumentType.PERMANENT_RESIDENT_CARD: 1800,
    DocumentType.EMPLOYMENT_AUTHORIZATION: 1800,
    DocumentType.FOREIGN_PASSPORT: 1800,
    DocumentType.DIRECT_DEPOSIT: 1800,
    DocumentType.VOIDED_CHECK: 1800,
    
    # Moderately sensitive - MEDIUM expiration (1 hour)
    DocumentType.DRIVERS_LICENSE: 3600,
    DocumentType.STATE_ID: 3600,
    DocumentType.W4_FORM: 3600,
    DocumentType.W4_FEDERAL: 3600,
    DocumentType.W4_STATE: 3600,
    
    # Less sensitive - LONGER expiration (2 hours)
    DocumentType.EMPLOYEE_HANDBOOK: 7200,
    DocumentType.POLICY_ACKNOWLEDGMENT: 7200,
    DocumentType.EMERGENCY_CONTACT: 7200,
    DocumentType.PROFILE_PHOTO: 7200,
    
    # Default for unknown types
    DocumentType.OTHER: 3600,
}

# Role-based multipliers for expiration times
ROLE_EXPIRATION_MULTIPLIER: Dict[str, float] = {
    UserRole.EMPLOYEE: 1.0,      # Base expiration
    UserRole.MANAGER: 2.0,       # 2x longer (e.g., 30 min → 1 hour)
    UserRole.HR: 4.0,            # 4x longer (e.g., 30 min → 2 hours)
    UserRole.ADMIN: 8.0,         # 8x longer (e.g., 30 min → 4 hours)
    UserRole.SYSTEM: 24.0,       # 24x longer (e.g., 30 min → 12 hours)
}

# Maximum expiration time (24 hours) - safety limit
MAX_EXPIRATION_SECONDS = 86400


def get_signed_url_expiration(
    document_type: str,
    user_role: str,
    purpose: str = "view"
) -> int:
    """
    Get appropriate expiration time for a signed URL.
    
    Args:
        document_type: Type of document (e.g., 'i9_form', 'w4_form')
        user_role: Role of the user requesting access (e.g., 'employee', 'manager', 'hr')
        purpose: Purpose of access (e.g., 'view', 'download', 'manager_review')
    
    Returns:
        Expiration time in seconds
    
    Examples:
        >>> get_signed_url_expiration('i9_form', 'employee', 'view')
        1800  # 30 minutes
        
        >>> get_signed_url_expiration('i9_form', 'manager', 'manager_review')
        3600  # 1 hour (2x multiplier)
        
        >>> get_signed_url_expiration('i9_form', 'hr', 'view')
        7200  # 2 hours (4x multiplier)
    """
    # Get base expiration for document type
    base_expiration = SIGNED_URL_BASE_EXPIRATION.get(
        document_type,
        SIGNED_URL_BASE_EXPIRATION[DocumentType.OTHER]
    )
    
    # Get role multiplier
    multiplier = ROLE_EXPIRATION_MULTIPLIER.get(user_role, 1.0)
    
    # Calculate final expiration
    expiration = int(base_expiration * multiplier)
    
    # Apply maximum limit
    expiration = min(expiration, MAX_EXPIRATION_SECONDS)
    
    # Log for audit
    logger.debug(
        f"Signed URL expiration: {document_type} for {user_role} ({purpose}): "
        f"{expiration}s ({expiration // 60} minutes)"
    )
    
    return expiration


def get_expiration_for_manager_review(document_type: str) -> int:
    """
    Get expiration time for manager review context.
    Manager reviews are time-sensitive, so we use shorter expiration.
    
    Args:
        document_type: Type of document
    
    Returns:
        Expiration time in seconds (typically 1-2 hours)
    """
    return get_signed_url_expiration(document_type, UserRole.MANAGER, "manager_review")


def get_expiration_for_employee_onboarding(document_type: str) -> int:
    """
    Get expiration time for employee onboarding context.
    Employees need reasonable time to complete forms.
    
    Args:
        document_type: Type of document
    
    Returns:
        Expiration time in seconds (typically 30 minutes - 1 hour)
    """
    return get_signed_url_expiration(document_type, UserRole.EMPLOYEE, "onboarding")


def get_expiration_for_hr_access(document_type: str) -> int:
    """
    Get expiration time for HR access.
    HR needs longer access for compliance reviews.
    
    Args:
        document_type: Type of document
    
    Returns:
        Expiration time in seconds (typically 2-4 hours)
    """
    return get_signed_url_expiration(document_type, UserRole.HR, "compliance_review")


# ============================================
# RATE LIMITING CONFIGURATION
# ============================================

RATE_LIMITS = {
    # Authentication endpoints
    "auth_login": "5/minute",           # 5 login attempts per minute
    "auth_signup": "3/hour",            # 3 signups per hour
    "auth_forgot_password": "3/hour",   # 3 password reset requests per hour
    "auth_verify_otp": "10/minute",     # 10 OTP verification attempts per minute
    
    # Document endpoints
    "document_upload": "10/minute",     # 10 document uploads per minute
    "document_download": "30/minute",   # 30 document downloads per minute
    "document_delete": "5/minute",      # 5 document deletions per minute
    
    # Form submission endpoints
    "form_submit": "20/minute",         # 20 form submissions per minute
    "form_save_draft": "60/minute",     # 60 draft saves per minute
    
    # API endpoints (general)
    "api_general": "100/minute",        # 100 general API calls per minute
    "api_search": "30/minute",          # 30 search queries per minute
    
    # Manager review endpoints
    "manager_review_start": "10/minute",    # 10 review starts per minute
    "manager_review_approve": "20/minute",  # 20 approvals per minute
}


def get_rate_limit(endpoint_type: str) -> str:
    """
    Get rate limit for an endpoint type.
    
    Args:
        endpoint_type: Type of endpoint (e.g., 'auth_login', 'document_upload')
    
    Returns:
        Rate limit string (e.g., '5/minute')
    """
    return RATE_LIMITS.get(endpoint_type, RATE_LIMITS["api_general"])


# ============================================
# INPUT VALIDATION CONFIGURATION
# ============================================

# SSN validation pattern
SSN_PATTERN = r'^\d{3}-?\d{2}-?\d{4}$'

# Invalid SSN patterns (known test/invalid SSNs)
INVALID_SSN_PATTERNS = [
    '000000000',
    '111111111',
    '123456789',
    '987654321',
    '000-00-0000',
    '111-11-1111',
    '123-45-6789',
]

# Bank routing number validation
ROUTING_NUMBER_PATTERN = r'^\d{9}$'

# Phone number validation (US)
PHONE_PATTERN = r'^\+?1?\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$'

# Email validation (basic)
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

# Zip code validation (US)
ZIP_CODE_PATTERN = r'^\d{5}(-\d{4})?$'


# ============================================
# AUDIT CONFIGURATION
# ============================================

AUDIT_EVENTS = {
    # Document access
    "document_viewed": True,
    "document_downloaded": True,
    "document_uploaded": True,
    "document_deleted": True,
    
    # PII access
    "pii_accessed": True,
    "pii_modified": True,
    "pii_encrypted": True,
    "pii_decrypted": True,
    
    # Authentication
    "login_success": True,
    "login_failure": True,
    "logout": True,
    "password_changed": True,
    
    # Manager actions
    "manager_review_started": True,
    "manager_review_completed": True,
    "manager_approved_employee": True,
    "manager_rejected_employee": True,
    
    # HR actions
    "hr_accessed_employee_data": True,
    "hr_modified_employee_data": True,
}


def should_audit_event(event_type: str) -> bool:
    """
    Check if an event should be audited.
    
    Args:
        event_type: Type of event (e.g., 'document_viewed', 'pii_accessed')
    
    Returns:
        True if event should be audited
    """
    return AUDIT_EVENTS.get(event_type, False)

