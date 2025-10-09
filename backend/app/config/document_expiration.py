"""
Document Signed URL Expiration Configuration

This module defines expiration times for signed URLs based on document sensitivity.
Shorter expiration times for sensitive documents (I-9, W-4, bank info) and longer
times for less sensitive documents (policies, training materials).
"""

# Expiration times in seconds
# Updated to align with security_config.py
EXPIRATION_TIMES = {
    # Highly sensitive documents - SHORT expiration (30 minutes)
    # I-9 Documents
    'i9': 1800,
    'i9_form': 1800,
    'i9_section1': 1800,
    'i9_section2': 1800,
    'i9-section-1': 1800,
    'i9-section-2': 1800,

    # Identity Documents (highly sensitive)
    'social_security_card': 1800,
    'social-security-card': 1800,
    'us_passport': 1800,
    'us-passport': 1800,
    'passport_card': 1800,
    'passport-card': 1800,
    'drivers_license': 1800,
    'drivers-license': 1800,
    'state_id': 1800,
    'state-id': 1800,

    # Work Authorization (highly sensitive)
    'permanent_resident_card': 1800,
    'permanent-resident-card': 1800,
    'employment_authorization': 1800,
    'employment-authorization': 1800,
    'foreign_passport': 1800,
    'foreign-passport': 1800,

    # Banking Documents (highly sensitive)
    'direct-deposit': 1800,
    'direct_deposit': 1800,
    'voided_check': 1800,
    'voided-check': 1800,

    # Moderately sensitive - MEDIUM expiration (1 hour)
    # Tax Documents
    'w4': 3600,
    'w4_form': 3600,
    'w4-form': 3600,
    'w4_federal': 3600,
    'w4-federal': 3600,
    'w4_state': 3600,
    'w4-state': 3600,

    # Health insurance (medium expiration)
    'health-insurance': 3600,
    'health_insurance': 3600,
    'new_hire_summary': 3600,

    # Less sensitive - LONGER expiration (2 hours)
    # Company policies
    'company-policies': 7200,
    'company_policies': 7200,
    'trafficking-awareness': 7200,
    'trafficking_awareness': 7200,
    'weapons-policy': 7200,
    'weapons_policy': 7200,
    'employee-handbook': 7200,
    'employee_handbook': 7200,
    'policy_acknowledgment': 7200,
    'policy-acknowledgment': 7200,
    'final_onboarding_packet': 7200,
    'emergency_contact': 7200,
    'emergency-contact': 7200,

    # Employee photos (2 hours)
    'photo': 7200,
    'employee_photo': 7200,
    'profile_photo': 7200,
    'profile-photo': 7200,

    # Training materials (2 hours)
    'training': 7200,
    'training_certificate': 7200,
    'training-certificate': 7200,

    # Default (1 hour)
    'default': 3600,
    'other': 3600
}

# Role-based expiration multipliers
# Aligned with security_config.py
ROLE_EXPIRATION_MULTIPLIER = {
    'employee': 1.0,      # Base expiration
    'manager': 2.0,       # 2x longer (e.g., 30 min → 1 hour)
    'hr': 4.0,            # 4x longer (e.g., 30 min → 2 hours)
    'admin': 8.0,         # 8x longer (e.g., 30 min → 4 hours)
    'system': 24.0,       # 24x longer (e.g., 30 min → 12 hours)
}

# Maximum expiration time (24 hours) - safety limit
MAX_EXPIRATION_SECONDS = 86400

# Legacy constants for backward compatibility
MANAGER_REVIEW_EXPIRATION = 3600  # 1 hour (updated from 30 min)
HR_REVIEW_EXPIRATION = 7200       # 2 hours (updated from 1 hour)
EMPLOYEE_PREVIEW_EXPIRATION = 1800  # 30 minutes (updated from 15 min)


def get_expiration_time(document_type: str, user_role: str = 'employee') -> int:
    """
    Get appropriate expiration time for document type and user role.
    Uses role-based multipliers for consistent scaling.

    Args:
        document_type: Type of document (i9, w4, direct-deposit, etc.)
        user_role: Role of user accessing (employee, manager, hr, admin, system)

    Returns:
        Expiration time in seconds (capped at MAX_EXPIRATION_SECONDS)

    Examples:
        >>> get_expiration_time('i9', 'employee')
        1800  # 30 minutes

        >>> get_expiration_time('i9', 'manager')
        3600  # 1 hour (2x multiplier)

        >>> get_expiration_time('i9', 'hr')
        7200  # 2 hours (4x multiplier)

        >>> get_expiration_time('company-policies', 'employee')
        7200  # 2 hours
    """
    # Normalize document type (handle both dash and underscore)
    doc_type = document_type.lower().replace('_', '-')

    # Get base expiration for document type
    base_expiration = EXPIRATION_TIMES.get(doc_type, EXPIRATION_TIMES['default'])

    # Get role multiplier
    multiplier = ROLE_EXPIRATION_MULTIPLIER.get(user_role.lower(), 1.0)

    # Calculate final expiration
    expiration = int(base_expiration * multiplier)

    # Apply maximum limit
    expiration = min(expiration, MAX_EXPIRATION_SECONDS)

    return expiration


def get_expiration_description(seconds: int) -> str:
    """
    Convert expiration time in seconds to human-readable description.
    
    Args:
        seconds: Expiration time in seconds
    
    Returns:
        Human-readable description
    
    Examples:
        >>> get_expiration_description(900)
        '15 minutes'
        
        >>> get_expiration_description(3600)
        '1 hour'
        
        >>> get_expiration_description(86400)
        '24 hours'
    """
    if seconds < 60:
        return f"{seconds} seconds"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''}"


# Document type categories for reporting
DOCUMENT_CATEGORIES = {
    'federal_forms': ['i9', 'i9_section1', 'i9_section2', 'w4', 'w4_form'],
    'financial': ['direct-deposit', 'direct_deposit'],
    'benefits': ['health-insurance', 'health_insurance'],
    'policies': ['company-policies', 'company_policies', 'trafficking-awareness', 
                 'trafficking_awareness', 'weapons-policy', 'weapons_policy',
                 'employee-handbook', 'employee_handbook'],
    'training': ['training', 'training_certificate'],
    'identity': ['photo', 'employee_photo']
}


def get_document_category(document_type: str) -> str:
    """
    Get category for a document type.
    
    Args:
        document_type: Type of document
    
    Returns:
        Category name or 'other'
    """
    doc_type = document_type.lower().replace('_', '-')
    
    for category, types in DOCUMENT_CATEGORIES.items():
        normalized_types = [t.replace('_', '-') for t in types]
        if doc_type in normalized_types:
            return category
    
    return 'other'


# Expiration time recommendations for different scenarios
EXPIRATION_RECOMMENDATIONS = {
    'employee_preview': {
        'description': 'Employee viewing their own document after signing',
        'recommended_time': EMPLOYEE_PREVIEW_EXPIRATION,
        'rationale': 'Short time for immediate preview, forces re-authentication for later access'
    },
    'manager_review': {
        'description': 'Manager reviewing employee documents',
        'recommended_time': MANAGER_REVIEW_EXPIRATION,
        'rationale': 'Enough time to review multiple documents, not too long to pose security risk'
    },
    'hr_review': {
        'description': 'HR reviewing employee documents',
        'recommended_time': HR_REVIEW_EXPIRATION,
        'rationale': 'Longer time for comprehensive review and compliance checks'
    },
    'sensitive_documents': {
        'description': 'Documents with PII (SSN, bank accounts)',
        'recommended_time': 900,  # 15 minutes
        'rationale': 'Minimize exposure window for sensitive personal information'
    },
    'training_materials': {
        'description': 'Training videos, manuals, policies',
        'recommended_time': 3600,  # 1 hour
        'rationale': 'Enough time to read/watch without interruption'
    }
}


if __name__ == '__main__':
    # Test the configuration
    print("Document Expiration Configuration Test")
    print("=" * 60)
    print()
    
    # Test different document types
    test_cases = [
        ('i9', 'employee'),
        ('i9', 'manager'),
        ('i9', 'hr'),
        ('w4', 'employee'),
        ('direct-deposit', 'employee'),
        ('company-policies', 'employee'),
        ('photo', 'employee'),
    ]
    
    for doc_type, role in test_cases:
        expiration = get_expiration_time(doc_type, role)
        description = get_expiration_description(expiration)
        category = get_document_category(doc_type)
        
        print(f"Document: {doc_type:20} | Role: {role:10} | "
              f"Expiration: {description:15} | Category: {category}")
    
    print()
    print("=" * 60)
    print("✅ Configuration loaded successfully")
