"""
Document Signed URL Expiration Configuration

This module defines expiration times for signed URLs based on document sensitivity.
Shorter expiration times for sensitive documents (I-9, W-4, bank info) and longer
times for less sensitive documents (policies, training materials).
"""

# Expiration times in seconds
EXPIRATION_TIMES = {
    # Federal forms with PII (short expiration - 15 minutes)
    'i9': 900,
    'i9_section1': 900,
    'i9_section2': 900,
    'w4': 900,
    'w4_form': 900,
    'direct-deposit': 900,
    'direct_deposit': 900,
    
    # Health insurance (medium expiration - 30 minutes)
    'health-insurance': 1800,
    'health_insurance': 1800,
    
    # Company policies (longer expiration - 1 hour)
    'company-policies': 3600,
    'company_policies': 3600,
    'trafficking-awareness': 3600,
    'trafficking_awareness': 3600,
    'weapons-policy': 3600,
    'weapons_policy': 3600,
    'employee-handbook': 3600,
    'employee_handbook': 3600,
    
    # Employee photos (long expiration - 24 hours)
    'photo': 86400,
    'employee_photo': 86400,
    
    # Training materials (1 hour)
    'training': 3600,
    'training_certificate': 3600,
    
    # Default (30 minutes)
    'default': 1800
}

# Role-based expiration overrides
# Managers and HR get longer access times for review workflows
MANAGER_REVIEW_EXPIRATION = 1800  # 30 minutes
HR_REVIEW_EXPIRATION = 3600       # 1 hour
EMPLOYEE_PREVIEW_EXPIRATION = 900  # 15 minutes


def get_expiration_time(document_type: str, user_role: str = 'employee') -> int:
    """
    Get appropriate expiration time for document type and user role.
    
    Args:
        document_type: Type of document (i9, w4, direct-deposit, etc.)
        user_role: Role of user accessing (employee, manager, hr)
    
    Returns:
        Expiration time in seconds
    
    Examples:
        >>> get_expiration_time('i9', 'employee')
        900  # 15 minutes
        
        >>> get_expiration_time('i9', 'manager')
        1800  # 30 minutes (manager review time)
        
        >>> get_expiration_time('company-policies', 'employee')
        3600  # 1 hour
    """
    # Normalize document type (handle both dash and underscore)
    doc_type = document_type.lower().replace('_', '-')
    
    # Get base expiration for document type
    base_expiration = EXPIRATION_TIMES.get(doc_type, EXPIRATION_TIMES['default'])
    
    # Adjust based on user role
    if user_role == 'hr':
        # HR gets at least 1 hour for review
        return max(base_expiration, HR_REVIEW_EXPIRATION)
    elif user_role == 'manager':
        # Managers get at least 30 minutes for review
        return max(base_expiration, MANAGER_REVIEW_EXPIRATION)
    else:  # employee
        # Employees get base expiration time
        return base_expiration


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

