"""
Encryption Configuration
Centralized encryption settings and field configurations
"""
import os
from typing import Set, Dict, Any
from enum import Enum

class EncryptionLevel(Enum):
    """Encryption level enumeration"""
    HIGH = "HIGH"       # Most sensitive data (SSN, bank accounts)
    MEDIUM = "MEDIUM"   # Sensitive but less critical
    LOW = "LOW"         # Standard PII
    NONE = "NONE"       # No encryption needed

# Get encryption key from environment
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'your-32-byte-encryption-key-here!').encode()[:32]
ENCRYPTION_ALGORITHM = 'AES-256-GCM'

# Fields that require encryption at database level
ENCRYPTED_FIELDS: Set[str] = {
    # High sensitivity - financial and government IDs
    'ssn',
    'social_security_number',
    'account_number',
    'routing_number',
    'bank_account_number',
    'bank_routing_number',
    
    # Government document numbers
    'alien_number',
    'uscis_number',
    'i94_number',
    'passport_number',
    'drivers_license_number',
    
    # Financial data
    'credit_card_number',
    'debit_card_number',
    
    # Medical information
    'medical_record_number',
    'insurance_policy_number',
}

# Field encryption levels for granular control
FIELD_ENCRYPTION_LEVELS: Dict[str, EncryptionLevel] = {
    # Highest sensitivity
    'ssn': EncryptionLevel.HIGH,
    'social_security_number': EncryptionLevel.HIGH,
    'account_number': EncryptionLevel.HIGH,
    'routing_number': EncryptionLevel.HIGH,
    'bank_account_number': EncryptionLevel.HIGH,
    'bank_routing_number': EncryptionLevel.HIGH,
    
    # Government IDs
    'alien_number': EncryptionLevel.HIGH,
    'uscis_number': EncryptionLevel.HIGH,
    'i94_number': EncryptionLevel.HIGH,
    'passport_number': EncryptionLevel.HIGH,
    'drivers_license_number': EncryptionLevel.MEDIUM,
    
    # Medium sensitivity
    'date_of_birth': EncryptionLevel.MEDIUM,
    'phone': EncryptionLevel.LOW,
    'email': EncryptionLevel.LOW,
    
    # Address information
    'address': EncryptionLevel.LOW,
    'street_address': EncryptionLevel.LOW,
    'city': EncryptionLevel.NONE,
    'state': EncryptionLevel.NONE,
    'zip_code': EncryptionLevel.LOW,
}

# Tables and their encrypted columns
ENCRYPTED_TABLES: Dict[str, Set[str]] = {
    'employees': {'ssn'},
    'job_applications': {'ssn'},
    'onboarding_form_data': {'form_data'},  # JSON field with nested encryption
    'i9_section1': {'ssn', 'alien_number', 'uscis_number', 'i94_number', 'passport_number'},
    'i9_section2': {'document_number'},
    'w4_forms': {'ssn'},
    'direct_deposit': {'account_number', 'routing_number'},
}

# Fields that should be masked in logs
MASKED_LOG_FIELDS: Set[str] = ENCRYPTED_FIELDS | {
    'password',
    'token',
    'api_key',
    'secret',
    'authorization',
}

# Encryption settings
ENCRYPTION_SETTINGS = {
    'algorithm': ENCRYPTION_ALGORITHM,
    'key_derivation': 'PBKDF2',
    'iterations': 100000,
    'salt_length': 16,
    'tag_length': 16,
    'nonce_length': 12,
}

def should_encrypt_field(field_name: str) -> bool:
    """
    Check if a field should be encrypted
    
    Args:
        field_name: Name of the field
        
    Returns:
        True if field should be encrypted
    """
    return field_name.lower() in ENCRYPTED_FIELDS

def get_field_encryption_level(field_name: str) -> EncryptionLevel:
    """
    Get encryption level for a field
    
    Args:
        field_name: Name of the field
        
    Returns:
        Encryption level for the field
    """
    return FIELD_ENCRYPTION_LEVELS.get(field_name.lower(), EncryptionLevel.NONE)

def should_mask_in_logs(field_name: str) -> bool:
    """
    Check if field should be masked in logs
    
    Args:
        field_name: Name of the field
        
    Returns:
        True if field should be masked
    """
    return field_name.lower() in MASKED_LOG_FIELDS

def get_masking_pattern(field_name: str) -> str:
    """
    Get masking pattern for a field
    
    Args:
        field_name: Name of the field
        
    Returns:
        Masking pattern (e.g., 'XXX-XX-****' for SSN)
    """
    field_lower = field_name.lower()
    if field_lower in ['ssn', 'social_security_number']:
        return 'XXX-XX-****'
    elif field_lower in ['account_number', 'routing_number']:
        return '****' 
    else:
        return '****'

def get_encryption_level(field_name: str) -> EncryptionLevel:
    """
    Get encryption level for a field (alias for get_field_encryption_level)
    
    Args:
        field_name: Name of the field
        
    Returns:
        Encryption level for the field
    """
    return get_field_encryption_level(field_name)

# Additional configuration exports
ENCRYPTION_CONFIG = ENCRYPTION_SETTINGS

AUDIT_CONFIG = {
    'enabled': True,
    'log_access': True,
    'log_modifications': True,
    'retention_days': 90
}