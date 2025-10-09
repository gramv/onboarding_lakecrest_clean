"""
Input Validation for Sensitive Data
Provides validators for SSN, bank accounts, phone numbers, etc.
"""
import re
from typing import Optional
from pydantic import BaseModel, validator, Field
import logging

logger = logging.getLogger(__name__)


# ============================================
# VALIDATION PATTERNS
# ============================================

# SSN validation pattern (with or without dashes)
SSN_PATTERN = re.compile(r'^\d{3}-?\d{2}-?\d{4}$')

# Invalid SSN patterns (known test/invalid SSNs)
INVALID_SSN_PATTERNS = [
    '000000000', '111111111', '123456789', '987654321',
    '000-00-0000', '111-11-1111', '123-45-6789',
]

# Bank routing number validation (9 digits)
ROUTING_NUMBER_PATTERN = re.compile(r'^\d{9}$')

# Bank account number (4-17 digits)
ACCOUNT_NUMBER_PATTERN = re.compile(r'^\d{4,17}$')

# Phone number validation (US format, flexible)
PHONE_PATTERN = re.compile(r'^\+?1?\s*\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})$')

# Email validation (basic)
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

# Zip code validation (US: 5 digits or 5+4)
ZIP_CODE_PATTERN = re.compile(r'^\d{5}(-\d{4})?$')


# ============================================
# VALIDATION FUNCTIONS
# ============================================

def validate_ssn(ssn: str) -> str:
    """
    Validate and normalize SSN.
    
    Args:
        ssn: Social Security Number (with or without dashes)
    
    Returns:
        Normalized SSN (with dashes: XXX-XX-XXXX)
    
    Raises:
        ValueError: If SSN is invalid
    
    Examples:
        >>> validate_ssn("123456789")
        "123-45-6789"
        >>> validate_ssn("123-45-6789")
        "123-45-6789"
    """
    if not ssn:
        raise ValueError("SSN is required")
    
    # Remove any whitespace
    ssn = ssn.strip()
    
    # Check format
    if not SSN_PATTERN.match(ssn):
        raise ValueError("Invalid SSN format. Expected: XXX-XX-XXXX or XXXXXXXXX")
    
    # Remove dashes for validation
    clean_ssn = ssn.replace('-', '')
    
    # Check for invalid patterns
    if clean_ssn in INVALID_SSN_PATTERNS:
        raise ValueError("Invalid SSN pattern (test/placeholder SSN not allowed)")
    
    # Check for all zeros in any section
    if clean_ssn[:3] == '000' or clean_ssn[3:5] == '00' or clean_ssn[5:] == '0000':
        raise ValueError("Invalid SSN (cannot have all zeros in any section)")
    
    # Check for sequential numbers (e.g., 123456789)
    if clean_ssn == ''.join(str(i) for i in range(int(clean_ssn[0]), int(clean_ssn[0]) + 9)):
        raise ValueError("Invalid SSN pattern (sequential numbers not allowed)")
    
    # Normalize to XXX-XX-XXXX format
    normalized = f"{clean_ssn[:3]}-{clean_ssn[3:5]}-{clean_ssn[5:]}"
    
    logger.debug(f"SSN validated and normalized: {normalized[:3]}-XX-XXXX")
    return normalized


def validate_routing_number(routing_number: str) -> str:
    """
    Validate bank routing number using checksum algorithm.
    
    Args:
        routing_number: 9-digit routing number
    
    Returns:
        Validated routing number
    
    Raises:
        ValueError: If routing number is invalid
    
    Examples:
        >>> validate_routing_number("021000021")
        "021000021"
    """
    if not routing_number:
        raise ValueError("Routing number is required")
    
    # Remove any whitespace or dashes
    clean_routing = routing_number.strip().replace('-', '').replace(' ', '')
    
    # Check format
    if not ROUTING_NUMBER_PATTERN.match(clean_routing):
        raise ValueError("Invalid routing number format. Expected: 9 digits")
    
    # Validate using ABA routing number checksum algorithm
    # Formula: 3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9) must be divisible by 10
    digits = [int(d) for d in clean_routing]
    checksum = (
        3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8])
    ) % 10
    
    if checksum != 0:
        raise ValueError("Invalid routing number (checksum failed)")
    
    logger.debug(f"Routing number validated: {clean_routing[:3]}******")
    return clean_routing


def validate_account_number(account_number: str) -> str:
    """
    Validate bank account number.
    
    Args:
        account_number: Bank account number (4-17 digits)
    
    Returns:
        Validated account number
    
    Raises:
        ValueError: If account number is invalid
    
    Examples:
        >>> validate_account_number("1234567890")
        "1234567890"
    """
    if not account_number:
        raise ValueError("Account number is required")
    
    # Remove any whitespace or dashes
    clean_account = account_number.strip().replace('-', '').replace(' ', '')
    
    # Check format
    if not ACCOUNT_NUMBER_PATTERN.match(clean_account):
        raise ValueError("Invalid account number format. Expected: 4-17 digits")
    
    # Check for obviously invalid patterns
    if clean_account == '0' * len(clean_account):
        raise ValueError("Invalid account number (all zeros)")
    
    if clean_account == '1' * len(clean_account):
        raise ValueError("Invalid account number (all ones)")
    
    logger.debug(f"Account number validated: ****{clean_account[-4:]}")
    return clean_account


def validate_phone(phone: str) -> str:
    """
    Validate and normalize phone number (US format).
    
    Args:
        phone: Phone number in various formats
    
    Returns:
        Normalized phone number: (XXX) XXX-XXXX
    
    Raises:
        ValueError: If phone number is invalid
    
    Examples:
        >>> validate_phone("1234567890")
        "(123) 456-7890"
        >>> validate_phone("(123) 456-7890")
        "(123) 456-7890"
    """
    if not phone:
        raise ValueError("Phone number is required")
    
    # Remove any whitespace
    phone = phone.strip()
    
    # Check format
    match = PHONE_PATTERN.match(phone)
    if not match:
        raise ValueError("Invalid phone number format. Expected: (XXX) XXX-XXXX or similar")
    
    # Extract digits
    area_code, prefix, line = match.groups()
    
    # Validate area code (cannot start with 0 or 1)
    if area_code[0] in ['0', '1']:
        raise ValueError("Invalid area code (cannot start with 0 or 1)")
    
    # Validate prefix (cannot start with 0 or 1)
    if prefix[0] in ['0', '1']:
        raise ValueError("Invalid prefix (cannot start with 0 or 1)")
    
    # Normalize to (XXX) XXX-XXXX format
    normalized = f"({area_code}) {prefix}-{line}"
    
    logger.debug(f"Phone validated and normalized: ({area_code}) XXX-XXXX")
    return normalized


def validate_email(email: str) -> str:
    """
    Validate email address.
    
    Args:
        email: Email address
    
    Returns:
        Validated email (lowercase)
    
    Raises:
        ValueError: If email is invalid
    
    Examples:
        >>> validate_email("user@example.com")
        "user@example.com"
    """
    if not email:
        raise ValueError("Email is required")
    
    # Remove whitespace and convert to lowercase
    email = email.strip().lower()
    
    # Check format
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Invalid email format")
    
    # Check for common typos
    if email.endswith('.con') or email.endswith('.cmo'):
        raise ValueError("Invalid email domain (possible typo)")
    
    logger.debug(f"Email validated: {email}")
    return email


def validate_zip_code(zip_code: str) -> str:
    """
    Validate US zip code.
    
    Args:
        zip_code: Zip code (5 digits or 5+4)
    
    Returns:
        Validated zip code
    
    Raises:
        ValueError: If zip code is invalid
    
    Examples:
        >>> validate_zip_code("12345")
        "12345"
        >>> validate_zip_code("12345-6789")
        "12345-6789"
    """
    if not zip_code:
        raise ValueError("Zip code is required")
    
    # Remove whitespace
    zip_code = zip_code.strip()
    
    # Check format
    if not ZIP_CODE_PATTERN.match(zip_code):
        raise ValueError("Invalid zip code format. Expected: XXXXX or XXXXX-XXXX")
    
    logger.debug(f"Zip code validated: {zip_code}")
    return zip_code


# ============================================
# PYDANTIC MODELS
# ============================================

class SSNInput(BaseModel):
    """Pydantic model for SSN validation"""
    ssn: str = Field(..., description="Social Security Number")
    
    @validator('ssn')
    def validate_ssn_field(cls, v):
        return validate_ssn(v)


class BankAccountInput(BaseModel):
    """Pydantic model for bank account validation"""
    account_number: str = Field(..., description="Bank account number")
    routing_number: str = Field(..., description="Bank routing number")
    
    @validator('routing_number')
    def validate_routing_field(cls, v):
        return validate_routing_number(v)
    
    @validator('account_number')
    def validate_account_field(cls, v):
        return validate_account_number(v)


class ContactInput(BaseModel):
    """Pydantic model for contact information validation"""
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    
    @validator('email')
    def validate_email_field(cls, v):
        if v:
            return validate_email(v)
        return v
    
    @validator('phone')
    def validate_phone_field(cls, v):
        if v:
            return validate_phone(v)
        return v


class AddressInput(BaseModel):
    """Pydantic model for address validation"""
    street: str = Field(..., description="Street address")
    city: str = Field(..., description="City")
    state: str = Field(..., description="State (2-letter code)")
    zip_code: str = Field(..., description="Zip code")
    
    @validator('state')
    def validate_state_field(cls, v):
        if not v or len(v) != 2:
            raise ValueError("State must be 2-letter code (e.g., CA, NY)")
        return v.upper()
    
    @validator('zip_code')
    def validate_zip_field(cls, v):
        return validate_zip_code(v)

