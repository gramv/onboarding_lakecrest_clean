"""
PDF Generators Package
Provides centralized PDF generation with consistent employee data retrieval
"""

# Only import generators that exist
# from .w4_pdf_generator import W4PDFGenerator
# from .i9_pdf_generator import I9PDFGenerator
# from .direct_deposit_pdf_generator import DirectDepositPDFGenerator
from .health_insurance_pdf_generator import HealthInsurancePDFGenerator
# from .company_policies_pdf_generator import CompanyPoliciesPDFGenerator
# from .weapons_policy_pdf_generator import WeaponsPolicyPDFGenerator

__all__ = [
    # 'W4PDFGenerator',
    # 'I9PDFGenerator',
    # 'DirectDepositPDFGenerator',
    'HealthInsurancePDFGenerator',
    # 'CompanyPoliciesPDFGenerator',
    # 'WeaponsPolicyPDFGenerator'
]