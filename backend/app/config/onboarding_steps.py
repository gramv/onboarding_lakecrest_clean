"""
Onboarding Steps Configuration
Defines the 14 onboarding steps as specified in candidate-onboarding-flow.md
"""

ONBOARDING_STEPS = [
    {
        'id': 'welcome',
        'name': 'Welcome',
        'order': 1,
        'required': True,
        'estimatedMinutes': 2,
        'governmentRequired': False
    },
    {
        'id': 'personal-info',
        'name': 'Personal Information',
        'order': 2,
        'required': True,
        'estimatedMinutes': 8,
        'governmentRequired': False
    },
    {
        'id': 'job-details',
        'name': 'Job Details Confirmation',
        'order': 3,
        'required': True,
        'estimatedMinutes': 3,
        'governmentRequired': False
    },
    {
        'id': 'emergency-contacts',
        'name': 'Emergency Contacts',
        'order': 4,
        'required': True,
        'estimatedMinutes': 5,
        'governmentRequired': False
    },
    {
        'id': 'company-policies',
        'name': 'Company Policies',
        'order': 5,
        'required': True,
        'estimatedMinutes': 10,
        'governmentRequired': False
    },
    {
        'id': 'i9-complete',
        'name': 'I-9 Employment Verification',
        'order': 6,
        'required': True,
        'estimatedMinutes': 20,
        'governmentRequired': True
    },
    {
        'id': 'w4-form',
        'name': 'W-4 Tax Form',
        'order': 7,
        'required': True,
        'estimatedMinutes': 10,
        'governmentRequired': True
    },
    {
        'id': 'direct-deposit',
        'name': 'Direct Deposit',
        'order': 8,
        'required': True,
        'estimatedMinutes': 5,
        'governmentRequired': False
    },
    {
        'id': 'trafficking-awareness',
        'name': 'Human Trafficking Awareness',
        'order': 9,
        'required': True,
        'estimatedMinutes': 5,
        'governmentRequired': True
    },
    {
        'id': 'weapons-policy',
        'name': 'Weapons Policy',
        'order': 10,
        'required': True,
        'estimatedMinutes': 2,
        'governmentRequired': False
    },
    {
        'id': 'health-insurance',
        'name': 'Health Insurance',
        'order': 11,
        'required': True,
        'estimatedMinutes': 8,
        'governmentRequired': False
    },
    {
        'id': 'document-upload',
        'name': 'Document Upload',
        'order': 12,
        'required': True,
        'estimatedMinutes': 5,
        'governmentRequired': False
    },
    {
        'id': 'final-review',
        'name': 'Final Review',
        'order': 13,
        'required': True,
        'estimatedMinutes': 5,
        'governmentRequired': False
    }
]