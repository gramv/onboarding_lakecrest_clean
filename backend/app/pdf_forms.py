"""
PDF Form Field Mappings for Government Compliance
Maps form data to official PDF form fields for I-9, W-4, and other documents
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import io
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
try:
    import fitz  # PyMuPDF for form handling
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("Warning: PyMuPDF not available. PDF form filling will use fallback methods.")

try:
    from PIL import Image as PILImage
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("Warning: Pillow not available. Signature transparency processing will be limited.")

try:
    from PyPDF2 import PdfReader, PdfWriter
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

import asyncio
import logging
from functools import wraps
from typing import Callable
import tempfile
import os

logger = logging.getLogger(__name__)

# PDF Generation Configuration
PDF_GENERATION_CONFIG = {
    "max_retries": 3,
    "retry_delay": 2,  # seconds
    "cache_ttl": 3600,  # 1 hour
    "fallback_enabled": True,
    "track_failures": True
}

# Cache for successfully generated PDFs
pdf_cache = {}
pdf_generation_stats = {
    "total_attempts": 0,
    "successful": 0,
    "failed": 0,
    "cache_hits": 0,
    "fallback_used": 0
}

def pdf_generation_retry(func: Callable) -> Callable:
    """
    Decorator to add retry logic to PDF generation functions
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        attempts = 0
        last_error = None
        
        while attempts < PDF_GENERATION_CONFIG["max_retries"]:
            try:
                pdf_generation_stats["total_attempts"] += 1
                result = await func(*args, **kwargs)
                pdf_generation_stats["successful"] += 1
                return result
            except Exception as e:
                attempts += 1
                last_error = e
                logger.warning(f"PDF generation attempt {attempts} failed: {str(e)}")
                
                if attempts < PDF_GENERATION_CONFIG["max_retries"]:
                    await asyncio.sleep(PDF_GENERATION_CONFIG["retry_delay"] * attempts)
        
        pdf_generation_stats["failed"] += 1
        
        # Try fallback method if enabled
        if PDF_GENERATION_CONFIG["fallback_enabled"]:
            try:
                logger.info("Attempting fallback PDF generation method")
                return await _generate_fallback_pdf(*args, **kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback PDF generation also failed: {str(fallback_error)}")
        
        raise Exception(f"PDF generation failed after {attempts} attempts: {str(last_error)}")
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        attempts = 0
        last_error = None
        
        while attempts < PDF_GENERATION_CONFIG["max_retries"]:
            try:
                pdf_generation_stats["total_attempts"] += 1
                result = func(*args, **kwargs)
                pdf_generation_stats["successful"] += 1
                return result
            except Exception as e:
                attempts += 1
                last_error = e
                logger.warning(f"PDF generation attempt {attempts} failed: {str(e)}")
                
                if attempts < PDF_GENERATION_CONFIG["max_retries"]:
                    import time
                    time.sleep(PDF_GENERATION_CONFIG["retry_delay"] * attempts)
        
        pdf_generation_stats["failed"] += 1
        
        # Try fallback method if enabled
        if PDF_GENERATION_CONFIG["fallback_enabled"]:
            try:
                logger.info("Attempting fallback PDF generation method")
                return _generate_fallback_pdf_sync(*args, **kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback PDF generation also failed: {str(fallback_error)}")
        
        raise Exception(f"PDF generation failed after {attempts} attempts: {str(last_error)}")
    
    # Return appropriate wrapper based on function type
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper

async def _generate_fallback_pdf(*args, **kwargs) -> bytes:
    """
    Fallback PDF generation method using basic ReportLab
    """
    try:
        # Extract employee data from args
        if len(args) > 1 and isinstance(args[1], dict):
            employee_data = args[1]
        elif "employee_data" in kwargs:
            employee_data = kwargs["employee_data"]
        else:
            employee_data = {}
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Add basic content
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "Document Generation Notice")
        
        c.setFont("Helvetica", 12)
        c.drawString(100, 700, "This is a temporary document generated due to technical issues.")
        c.drawString(100, 680, f"Employee: {employee_data.get('firstName', '')} {employee_data.get('lastName', '')}")
        c.drawString(100, 660, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(100, 620, "Please contact HR for the official document.")
        
        c.save()
        buffer.seek(0)
        pdf_generation_stats["fallback_used"] += 1
        return buffer.read()
    except Exception as e:
        logger.error(f"Fallback PDF generation failed: {str(e)}")
        raise

def _generate_fallback_pdf_sync(*args, **kwargs) -> bytes:
    """
    Synchronous fallback PDF generation method
    """
    try:
        # Extract employee data from args
        if len(args) > 1 and isinstance(args[1], dict):
            employee_data = args[1]
        elif "employee_data" in kwargs:
            employee_data = kwargs["employee_data"]
        else:
            employee_data = {}
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Add basic content
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "Document Generation Notice")
        
        c.setFont("Helvetica", 12)
        c.drawString(100, 700, "This is a temporary document generated due to technical issues.")
        c.drawString(100, 680, f"Employee: {employee_data.get('firstName', '')} {employee_data.get('lastName', '')}")
        c.drawString(100, 660, f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.drawString(100, 620, "Please contact HR for the official document.")
        
        c.save()
        buffer.seek(0)
        pdf_generation_stats["fallback_used"] += 1
        return buffer.read()
    except Exception as e:
        logger.error(f"Fallback PDF generation failed: {str(e)}")
        raise

def cache_pdf(cache_key: str, pdf_data: bytes) -> None:
    """
    Cache successfully generated PDF
    """
    pdf_cache[cache_key] = {
        "data": pdf_data,
        "timestamp": datetime.now(),
        "ttl": PDF_GENERATION_CONFIG["cache_ttl"]
    }
    
    # Clean old cache entries
    current_time = datetime.now()
    expired_keys = []
    for key, value in pdf_cache.items():
        if (current_time - value["timestamp"]).seconds > value["ttl"]:
            expired_keys.append(key)
    
    for key in expired_keys:
        del pdf_cache[key]

def get_cached_pdf(cache_key: str) -> Optional[bytes]:
    """
    Get PDF from cache if available and not expired
    """
    if cache_key in pdf_cache:
        cached = pdf_cache[cache_key]
        if (datetime.now() - cached["timestamp"]).seconds < cached["ttl"]:
            pdf_generation_stats["cache_hits"] += 1
            logger.info(f"PDF cache hit for key: {cache_key}")
            return cached["data"]
        else:
            del pdf_cache[cache_key]
    return None

def track_pdf_generation_status(
    employee_id: str,
    document_type: str,
    status: str,
    error_message: Optional[str] = None
) -> None:
    """
    Track PDF generation status for monitoring
    """
    status_record = {
        "employee_id": employee_id,
        "document_type": document_type,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "error_message": error_message
    }
    
    # In production, this would write to a database or monitoring service
    logger.info(f"PDF Generation Status: {status_record}")

# Official I-9 Form Field Mappings (based on USCIS I-9 11/14/23 edition)
I9_FORM_FIELDS = {
    # Section 1: Employee Information and Attestation
    "employee_last_name": "form1[0].#subform[0].Pt1Line1_FamilyName[0]",
    "employee_first_name": "form1[0].#subform[0].Pt1Line1_GivenName[0]", 
    "employee_middle_initial": "form1[0].#subform[0].Pt1Line1_MI[0]",
    "other_last_names": "form1[0].#subform[0].Pt1Line2_OtherNames[0]",
    
    # Address fields
    "address_street": "form1[0].#subform[0].Pt1Line3_StreetNumberName[0]",
    "address_apt": "form1[0].#subform[0].Pt1Line3_AptNumber[0]",
    "address_city": "form1[0].#subform[0].Pt1Line3_CityTown[0]",
    "address_state": "form1[0].#subform[0].Pt1Line3_State[0]",
    "address_zip": "form1[0].#subform[0].Pt1Line3_ZipCode[0]",
    
    # Personal information
    "date_of_birth": "form1[0].#subform[0].Pt1Line4_DOB[0]",
    "ssn": "form1[0].#subform[0].Pt1Line5_SSN[0]",
    "email": "form1[0].#subform[0].Pt1Line6_Email[0]",
    "phone": "form1[0].#subform[0].Pt1Line7_TelNumber[0]",
    
    # Citizenship attestation (checkboxes)
    "citizenship_us_citizen": "form1[0].#subform[0].Pt1Line8_Checkbox[0]",
    "citizenship_noncitizen_national": "form1[0].#subform[0].Pt1Line8_Checkbox[1]", 
    "citizenship_permanent_resident": "form1[0].#subform[0].Pt1Line8_Checkbox[2]",
    "citizenship_authorized_alien": "form1[0].#subform[0].Pt1Line8_Checkbox[3]",
    
    # Additional fields for non-citizens
    "uscis_number": "form1[0].#subform[0].Pt1Line9_AlienNumber[0]",
    "i94_admission_number": "form1[0].#subform[0].Pt1Line9_I94Number[0]",
    "passport_number": "form1[0].#subform[0].Pt1Line9_PassportNumber[0]",
    "passport_country": "form1[0].#subform[0].Pt1Line9_CountryIssuance[0]",
    
    # Employee signature and date
    "employee_signature_date": "form1[0].#subform[0].Pt1Line10_DateSigned[0]",
    
    # Section 2: Employer Review and Verification
    "first_day_employment": "form1[0].#subform[1].Pt2Line1_FirstDayEmployment[0]",
    
    # Document verification
    "document_title_1": "form1[0].#subform[1].Pt2Line2a_DocumentTitle[0]",
    "issuing_authority_1": "form1[0].#subform[1].Pt2Line2a_IssuingAuthority[0]",
    "document_number_1": "form1[0].#subform[1].Pt2Line2a_DocumentNumber[0]",
    "expiration_date_1": "form1[0].#subform[1].Pt2Line2a_ExpirationDate[0]",
    
    "document_title_2": "form1[0].#subform[1].Pt2Line2b_DocumentTitle[0]",
    "issuing_authority_2": "form1[0].#subform[1].Pt2Line2b_IssuingAuthority[0]",
    "document_number_2": "form1[0].#subform[1].Pt2Line2b_DocumentNumber[0]",
    "expiration_date_2": "form1[0].#subform[1].Pt2Line2b_ExpirationDate[0]",
    
    "document_title_3": "form1[0].#subform[1].Pt2Line2c_DocumentTitle[0]",
    "issuing_authority_3": "form1[0].#subform[1].Pt2Line2c_IssuingAuthority[0]",
    "document_number_3": "form1[0].#subform[1].Pt2Line2c_DocumentNumber[0]",
    "expiration_date_3": "form1[0].#subform[1].Pt2Line2c_ExpirationDate[0]",
    
    # Additional information
    "additional_info": "form1[0].#subform[1].Pt2Line3_AdditionalInfo[0]",
    
    # Employer signature
    "employer_name": "form1[0].#subform[1].Pt2Line4_LastName[0]",
    "employer_title": "form1[0].#subform[1].Pt2Line4_Title[0]",
    "employer_signature_date": "form1[0].#subform[1].Pt2Line4_DateSigned[0]",
    
    # Business information
    "business_name": "form1[0].#subform[1].Pt2Line5_BusinessName[0]",
    "business_address": "form1[0].#subform[1].Pt2Line5_BusinessAddress[0]",
    "business_city": "form1[0].#subform[1].Pt2Line5_City[0]",
    "business_state": "form1[0].#subform[1].Pt2Line5_State[0]",
    "business_zip": "form1[0].#subform[1].Pt2Line5_ZipCode[0]"
}

# Official W-4 Form Field Mappings (based on IRS Form W-4 2025 - EXACT COMPLIANCE)
# CRITICAL: These are the EXACT field names from the official 2025 IRS W-4 PDF template
# Any deviation from these names will result in legal non-compliance
W4_FORM_FIELDS = {
    # Step 1: Personal Information (EXACT IRS field names from logs)
    "first_name_and_middle_initial": "topmostSubform[0].Page1[0].Step1a[0].f1_01[0]",  # Combined first name and middle initial field
    "last_name": "topmostSubform[0].Page1[0].Step1a[0].f1_02[0]",
    "address": "topmostSubform[0].Page1[0].Step1a[0].f1_03[0]",
    "city_state_zip": "topmostSubform[0].Page1[0].Step1a[0].f1_04[0]",  # Combined city, state, ZIP field
    "social_security_number": "topmostSubform[0].Page1[0].f1_05[0]",
    
    # Step 1: Filing Status (EXACT IRS checkbox field names)
    "filing_status_single": "topmostSubform[0].Page1[0].c1_1[0]",  # Single or Married filing separately
    "filing_status_married_jointly": "topmostSubform[0].Page1[0].c1_1[1]",  # Married filing jointly or Qualifying surviving spouse
    "filing_status_head_of_household": "topmostSubform[0].Page1[0].c1_1[2]",  # Head of household
    
    # Step 2: Multiple Jobs or Spouse Works (EXACT IRS field names)
    "step2_multiple_jobs_checkbox": "topmostSubform[0].Page1[0].c1_2[0]",  # Multiple jobs checkbox
    
    # Step 3: Claim Dependents (EXACT IRS field names)
    "step3_qualifying_children_amount": "topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]",  # Qualifying children × $2,000
    "step3_other_dependents_amount": "topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]",  # Other dependents × $500
    "step3_total_credits": "topmostSubform[0].Page1[0].f1_09[0]",  # Total credits amount
    
    # Step 4: Other Adjustments (EXACT IRS field names)
    "step4a_other_income": "topmostSubform[0].Page1[0].f1_10[0]",  # Other income
    "step4b_deductions": "topmostSubform[0].Page1[0].f1_11[0]",  # Deductions
    "step4c_extra_withholding": "topmostSubform[0].Page1[0].f1_12[0]",  # Extra withholding
    
    # Step 5: Employee Signature (EXACT IRS field names)
    "employee_signature_date": "topmostSubform[0].Page1[0].f1_14[0]",  # Date field
    
    # Employer Section (Bottom of form - EXACT IRS field names)
    "employer_name_address": "topmostSubform[0].Page1[0].f1_15[0]",  # Employer's name and address
    "first_date_employment": "topmostSubform[0].Page1[0].EmployerSection[0].f1_14[0]",  # First date of employment
    "employer_identification_number": "topmostSubform[0].Page1[0].EmployerSection[0].f1_15[0]"  # EIN
}

# Health Insurance Plan Configuration (from onboarding packet)
HEALTH_INSURANCE_PLANS = {
    "medical_plans": {
        "hra_6k": {
            "name": "UHC HRA $6K Plan",
            "costs": {
                "employee": 59.91,
                "employee_spouse": 319.29,
                "employee_children": 264.10,
                "family": 390.25
            }
        },
        "hra_4k": {
            "name": "UHC HRA $4K Plan", 
            "costs": {
                "employee": 136.84,
                "employee_spouse": 396.21,
                "employee_children": 341.02,
                "family": 467.17
            }
        },
        "hra_2k": {
            "name": "UHC HRA $2K Plan",
            "costs": {
                "employee": 213.76,
                "employee_spouse": 473.13,
                "employee_children": 417.95,
                "family": 544.09
            }
        },
        "minimum_essential": {
            "name": "ACI Minimum Essential Coverage Plan",
            "costs": {
                "employee": 7.77,
                "employee_spouse": 17.55,
                "employee_children": 19.03,
                "family": 27.61
            }
        },
        "indemnity": {
            "name": "ACI Indemnity Plan",
            "costs": {
                "employee": 19.61,
                "employee_spouse": 37.24,
                "employee_children": 31.45,
                "family": 49.12
            }
        },
        "minimum_plus_indemnity": {
            "name": "Minimum Essential + Indemnity",
            "costs": {
                "employee": 27.37,
                "employee_spouse": 54.79,
                "employee_children": 50.48,
                "family": 76.74
            }
        }
    },
    "dental_costs": {
        "employee": 13.45,
        "employee_spouse": 27.44,
        "employee_children": 31.13,
        "family": 45.63
    },
    "vision_costs": {
        "employee": 3.04,
        "employee_spouse": 5.59,
        "employee_children": 5.86,
        "family": 8.78
    }
}

# I-9 Document Lists (official USCIS requirements)
I9_DOCUMENT_LISTS = {
    "list_a": [
        "U.S. Passport or U.S. Passport Card",
        "Permanent Resident Card or Alien Registration Receipt Card (Form I-551)",
        "Foreign passport that contains a temporary I-551 stamp or temporary I-551 printed notation on a machine-readable immigrant visa",
        "Employment Authorization Document that contains a photograph (Form I-766)",
        "For a nonimmigrant alien authorized to work for a specific employer because of his or her status: Foreign passport; and Form I-94 or Form I-94A that has the following: (1) The same name as the passport; and (2) An endorsement of the individual's nonimmigrant status as long as that period of endorsement has not yet expired and the proposed employment is not in conflict with any restrictions or limitations identified on the form",
        "Passport from the Federated States of Micronesia (FSM) or the Republic of the Marshall Islands (RMI) with Form I-94 or Form I-94A indicating nonimmigrant admission under the Compact of Free Association Between the United States and the FSM or RMI"
    ],
    "list_b": [
        "Driver's license or ID card issued by a State or outlying possession of the United States provided it contains a photograph or information such as name, date of birth, gender, height, eye color, and address",
        "ID card issued by federal, state or local government agencies or entities, provided it contains a photograph or information such as name, date of birth, gender, height, eye color, and address",
        "School ID card with a photograph",
        "Voter's registration card",
        "U.S. Military card or draft record",
        "Military dependent's ID card",
        "U.S. Coast Guard Merchant Mariner Card",
        "Native American tribal document",
        "Driver's license issued by a Canadian government authority"
    ],
    "list_c": [
        "A Social Security Account Number card, unless the card includes one of the following restrictions: (1) NOT VALID FOR EMPLOYMENT (2) VALID FOR WORK ONLY WITH INS AUTHORIZATION (3) VALID FOR WORK ONLY WITH DHS AUTHORIZATION",
        "Certification of report of birth issued by the Department of State (Forms DS-1350, FS-545, FS-240)",
        "Original or certified copy of birth certificate issued by a State, county, municipal authority, or territory of the United States bearing an official seal",
        "Native American tribal document",
        "U.S. Citizen ID Card (Form I-197)",
        "Identification Card for Use of Resident Citizen in the United States (Form I-179)",
        "Employment authorization document issued by the Department of Homeland Security"
    ]
}

class PDFFormFiller:
    """Handles filling of official government PDF forms with user data"""
    
    def __init__(self):
        # CRITICAL: Only use official government form templates for federal compliance
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.form_templates = {
            "i9": os.path.join(base_dir, "static", "i9-form-template.pdf"),
            "w4": os.path.join(base_dir, "static", "w4-form-template.pdf")
        }
        
        # Validate template files exist
        self._validate_template_files()
    
    def _safe_numeric(self, value, default=0):
        """Safely convert value to numeric type"""
        try:
            if value is None or value == '':
                return default
            return float(str(value))
        except (ValueError, TypeError):
            return default
    
    def _validate_template_files(self):
        """Validate that required official form templates exist"""
        import os
        for form_type, template_path in self.form_templates.items():
            if not os.path.exists(template_path):
                print(f"⚠️ WARNING: Official {form_type.upper()} template not found at {template_path}")
                print(f"Federal compliance requires official templates. Will use fallback generation if needed.")
                # Don't try to create files on read-only filesystems (like Heroku)
                # The static folder should contain these files
            else:
                print(f"✅ Official {form_type.upper()} template found: {template_path}")
    
    def fill_i9_form(self, employee_data: Dict[str, Any], employer_data: Optional[Dict[str, Any]] = None) -> bytes:
        """Fill I-9 form with employee and optionally employer data - OFFICIAL TEMPLATE ONLY"""
        if not HAS_PYMUPDF:
            raise Exception("PyMuPDF required for official I-9 template - fallback forms violate federal compliance")
            
        try:
            # Open the official I-9 PDF
            doc = fitz.open(self.form_templates["i9"])
            
            # Fill employee section (Section 1)
            if employee_data:
                self._fill_i9_section1(doc, employee_data)
            
            # Fill employer section (Section 2) if provided
            if employer_data:
                self._fill_i9_section2(doc, employer_data)
            
            # Fill Supplement A if preparer/translator data provided
            if employee_data and any(key.startswith('preparer_') for key in employee_data.keys()):
                self._fill_i9_supplement_a(doc, employee_data)
            
            # Fill Supplement B if reverification data provided
            if employee_data and any(key.startswith('reverify_') or key in ['rehire_date', 'termination_date', 'new_name'] for key in employee_data.keys()):
                self._fill_i9_supplement_b(doc, employee_data)
            
            # Save to bytes
            pdf_bytes = doc.write()
            doc.close()
            
            return pdf_bytes
            
        except Exception as e:
            print(f"Error filling I-9 form: {e}")
            raise Exception(f"Failed to generate official I-9 form: {e} - No fallback allowed for federal compliance")
    
    def fill_w4_form(self, employee_data: Dict[str, Any]) -> bytes:
        """Fill W-4 form with employee data - OFFICIAL TEMPLATE ONLY"""
        if not HAS_PYMUPDF:
            raise Exception("PyMuPDF required for official W-4 template - fallback forms violate IRS compliance")
            
        try:
            # Open the official W-4 PDF
            doc = fitz.open(self.form_templates["w4"])
            
            # Fill form fields
            self._fill_w4_fields(doc, employee_data)
            
            # Save to bytes
            pdf_bytes = doc.write()
            doc.close()
            
            return pdf_bytes
            
        except Exception as e:
            print(f"Error filling W-4 form: {e}")
            raise Exception(f"Failed to generate official W-4 form: {e} - No fallback allowed for IRS compliance")
    
    def fill_direct_deposit_form(self, employee_data: Dict[str, Any]) -> bytes:
        """Fill Direct Deposit form with employee data using official template"""
        if not HAS_PYMUPDF:
            raise Exception("PyMuPDF required for official Direct Deposit template")
            
        try:
            import os
            from datetime import datetime
            
            # Get the absolute path to the template
            template_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "static",
                "direct-deposit-template.pdf"
            )
            
            # Open the official Direct Deposit PDF
            doc = fitz.open(template_path)
            page = doc[0]  # Direct deposit is a single page form
            
            # Employee Information - handle both backend and frontend formats
            # Backend format: first_name, last_name
            # Frontend format: firstName, lastName
            first_name = employee_data.get('first_name') or employee_data.get('firstName', '')
            last_name = employee_data.get('last_name') or employee_data.get('lastName', '')
            full_name = f"{first_name} {last_name}".strip()

            ssn = employee_data.get('ssn', '')
            email = employee_data.get('email', '')

            # Check payment method - if paper check, don't fill banking fields
            payment_method = employee_data.get('payment_method', 'direct_deposit')
            print(f"DEBUG: PDF Form Filler - Payment method: {payment_method}")

            # Get direct deposit data - handle both formats
            direct_deposit = employee_data.get('direct_deposit', {})

            # If no direct_deposit, try primaryAccount (frontend format) - but only for direct deposit
            if payment_method == 'direct_deposit' and (not direct_deposit or not any(direct_deposit.values())):
                primary_account = employee_data.get('primaryAccount', {})
                if primary_account:
                    direct_deposit = {
                        'bank_name': primary_account.get('bankName', ''),
                        'routing_number': primary_account.get('routingNumber', ''),
                        'account_number': primary_account.get('accountNumber', ''),
                        'account_type': primary_account.get('accountType', 'checking'),
                        'deposit_type': employee_data.get('depositType', 'full'),
                        'deposit_amount': primary_account.get('depositAmount', '')
                    }
            elif payment_method == 'paper_check':
                # Clear all banking data for paper check
                direct_deposit = {
                    'bank_name': '',
                    'routing_number': '',
                    'account_number': '',
                    'account_type': '',
                    'deposit_type': '',
                    'deposit_amount': ''
                }

            bank_name = direct_deposit.get('bank_name', '')
            routing_number = direct_deposit.get('routing_number', '')
            account_number = direct_deposit.get('account_number', '')
            account_type = direct_deposit.get('account_type', 'checking' if payment_method == 'direct_deposit' else '')
            deposit_type = direct_deposit.get('deposit_type', 'full' if payment_method == 'direct_deposit' else '')
            deposit_amount = direct_deposit.get('deposit_amount', '')
            
            # Overlay text using widget rectangles for precise placement
            widgets_by_name = {w.field_name: w for w in page.widgets() if w.field_name}

            def draw_text(field_name: str, value: str):
                print(f"DEBUG: draw_text called with field_name='{field_name}', value='{value}'")
                if not value:
                    print(f"DEBUG: Skipping empty value for field '{field_name}'")
                    return
                widget = widgets_by_name.get(field_name)
                if not widget:
                    print(f"DEBUG: Widget not found for field '{field_name}'")
                    return
                print(f"DEBUG: Drawing text '{value}' in field '{field_name}'")
                rect = widget.rect
                # Choose font size to fit inside the rect height
                # For small widgets (height < 12), use fixed font size
                if rect.height < 12:
                    fontsize = 9  # Fixed size for small widgets
                    # Center vertically in small widget
                    y = rect.y0 + rect.height * 0.65
                else:
                    fontsize = min(10, rect.height * 0.8)
                    y = rect.y0 + rect.height * 0.75
                # Left padding and baseline inside rect
                x = rect.x0 + 2
                page.insert_text((x, y), str(value), fontsize=fontsize, color=(0, 0, 0), fontname="helv")

            def draw_check(field_name: str):
                widget = widgets_by_name.get(field_name)
                if not widget:
                    return
                rect = widget.rect
                # Draw an "X" mark centered within the checkbox to ensure visibility in all viewers
                margin = max(1.0, min(rect.width, rect.height) * 0.2)
                # Diagonal from top-left to bottom-right
                page.draw_line(
                    p1=(rect.x0 + margin, rect.y0 + margin),
                    p2=(rect.x1 - margin, rect.y1 - margin),
                    color=(0, 0, 0),
                    width=1.2,
                )
                # Diagonal from top-right to bottom-left
                page.draw_line(
                    p1=(rect.x1 - margin, rect.y0 + margin),
                    p2=(rect.x0 + margin, rect.y1 - margin),
                    color=(0, 0, 0),
                    width=1.2,
                )

            # Current date
            current_date = datetime.now().strftime('%m/%d/%Y')

            # Employee info
            draw_text('employee_name', full_name)
            draw_text('social_security_number', ssn)
            draw_text('employee_email', email)
            draw_text('employee_date', current_date)

            # Get deposit type from top level - but only for direct deposit
            actual_deposit_type = employee_data.get('deposit_type', deposit_type) if payment_method == 'direct_deposit' else ''
            
            # Bank 1 info (primary account) - only for direct deposit
            if payment_method == 'direct_deposit':
                draw_text('bank1_name', bank_name)
                draw_text('bank1_routing_number', routing_number)
                draw_text('bank1_account_number', account_number)
                print(f"DEBUG: Drew bank1 text fields - name: '{bank_name}', routing: '{routing_number[:3]}***', account: '{account_number[:3]}***'")
            else:
                # For paper check, overlay clear indicators in the banking section
                draw_text('bank1_name', 'PAPER CHECK')
                draw_text('bank1_routing_number', 'N/A')
                draw_text('bank1_account_number', 'N/A')
                print("DEBUG: Paper check - Overlaid 'PAPER CHECK' indicators in banking fields")

            # Handle deposit amounts/percentages based on type - only for direct deposit
            if payment_method == 'direct_deposit':
                if actual_deposit_type == 'partial' and deposit_amount:
                    # Partial deposit - specific amount to bank1
                    try:
                        import re
                        amt_str = str(deposit_amount).strip()
                        if amt_str.endswith('%'):
                            formatted_amount = amt_str
                        else:
                            cleaned = re.sub(r"[^0-9.]+", "", amt_str)
                            formatted_amount = f"${float(cleaned):.2f}"
                    except Exception:
                        formatted_amount = f"${deposit_amount}"
                    draw_text('bank1_deposit_amount', formatted_amount)
                    print(f"DEBUG: Drew bank1_deposit_amount: {formatted_amount}")
                elif actual_deposit_type == 'split':
                    # Split deposit - use percentage or amount
                    percentage = direct_deposit.get('percentage', 0)
                    if percentage:
                        draw_text('bank1_deposit_amount', f"{percentage}%")
                        print(f"DEBUG: Drew bank1_deposit_amount: {percentage}%")
                    elif deposit_amount:
                        draw_text('bank1_deposit_amount', f"${deposit_amount}")
                        print(f"DEBUG: Drew bank1_deposit_amount: ${deposit_amount}")
            else:
                # For paper check, overlay clear indicator for deposit amount
                draw_text('bank1_deposit_amount', 'PAPER CHECK')
                print("DEBUG: Paper check - Overlaid 'PAPER CHECK' in deposit amount field")

            # CRITICAL FIX: The template has embedded visual tick marks that persist
            # even when field values are cleared. We must cover them with white rectangles.
            
            # Step 1: Clear all checkbox field values
            for widget in page.widgets():
                if widget.field_name and widget.field_type == 2:  # 2 is CheckBox type
                    # Clear all bank checkbox values
                    if any(x in widget.field_name for x in ['bank1_checking', 'bank1_savings', 'bank1_other',
                                                             'bank2_checking', 'bank2_savings', 'bank2_other',
                                                             'bank3_checking', 'bank3_savings', 'bank3_other']):
                        widget.field_value = "Off"
                        widget.update()
            
            # Step 2: Cover ALL bank checkboxes with white rectangles to hide embedded tick marks
            # This is necessary because the PDF template has visual ticks that don't get cleared
            for widget in page.widgets():
                if widget.field_name and widget.field_type == 2:
                    if any(x in widget.field_name for x in ['bank1_checking', 'bank1_savings', 'bank1_other',
                                                             'bank2_checking', 'bank2_savings', 'bank2_other',
                                                             'bank3_checking', 'bank3_savings', 'bank3_other']):
                        rect = widget.rect
                        # Draw white filled rectangle that FULLY covers the checkbox
                        # Use positive margin to extend beyond checkbox bounds
                        margin = 1.0  # Positive value to properly extend coverage
                        cover_rect = fitz.Rect(
                            rect.x0 - margin,  # Extend left edge outward
                            rect.y0 - margin,  # Extend top edge outward
                            rect.x1 + margin,  # Extend right edge outward
                            rect.y1 + margin   # Extend bottom edge outward
                        )
                        page.draw_rect(cover_rect, color=(1, 1, 1), fill=(1, 1, 1), width=0)
            
            # Now draw X marks only on the selected checkboxes - but only for direct deposit
            print(f"DEBUG: Checkbox logic - payment_method: {payment_method}, account_type: '{account_type}', actual_deposit_type: '{actual_deposit_type}'")
            if payment_method == 'direct_deposit':
                # Bank 1 checkboxes
                if account_type == 'checking':
                    print("DEBUG: Checking bank1_checking checkbox")
                    draw_check('bank1_checking')
                elif account_type == 'savings':
                    print("DEBUG: Checking bank1_savings checkbox")
                    draw_check('bank1_savings')
                elif account_type:  # Only check 'other' if account_type is not empty
                    print("DEBUG: Checking bank1_other checkbox")
                    draw_check('bank1_other')

                # Only mark "entire net amount" for full deposits
                if actual_deposit_type == 'full':
                    print("DEBUG: Checking bank1_entire_net_amount checkbox")
                    draw_check('bank1_entire_net_amount')
            else:
                print("DEBUG: Paper check selected - NO checkboxes will be checked")
            
            # Process additional accounts for split deposits - but only for direct deposit
            if payment_method == 'direct_deposit':
                additional_accounts = employee_data.get('additional_accounts', [])

                # Bank 2 (first additional account)
                if len(additional_accounts) > 0 and actual_deposit_type == 'split':
                    acc2 = additional_accounts[0]
                    draw_text('bank2_name', acc2.get('bank_name', ''))
                    draw_text('bank2_routing_number', acc2.get('routing_number', ''))
                    draw_text('bank2_account_number', acc2.get('account_number', ''))

                    # Deposit amount/percentage for bank 2
                    percentage2 = acc2.get('percentage', 0)
                    amount2 = acc2.get('deposit_amount', '')
                    if percentage2:
                        draw_text('bank2_deposit_amount', f"{percentage2}%")
                    elif amount2:
                        draw_text('bank2_deposit_amount', f"${amount2}")

                    # Account type checkboxes for bank 2
                    acc2_type = acc2.get('account_type', 'checking')
                    if acc2_type == 'checking':
                        draw_check('bank2_checking')
                    elif acc2_type == 'savings':
                        draw_check('bank2_savings')
                    elif acc2_type:  # Only check 'other' if account_type is not empty
                        draw_check('bank2_other')

                # Bank 3 (second additional account)
                if len(additional_accounts) > 1 and actual_deposit_type == 'split':
                    acc3 = additional_accounts[1]
                    draw_text('bank3_name', acc3.get('bank_name', ''))
                    draw_text('bank3_routing_number', acc3.get('routing_number', ''))
                    draw_text('bank3_account_number', acc3.get('account_number', ''))

                    # Deposit amount/percentage for bank 3
                    percentage3 = acc3.get('percentage', 0)
                    amount3 = acc3.get('deposit_amount', '')
                    if percentage3:
                        draw_text('bank3_deposit_amount', f"{percentage3}%")
                    elif amount3:
                        draw_text('bank3_deposit_amount', f"${amount3}")

                    # Account type checkboxes for bank 3
                    acc3_type = acc3.get('account_type', 'checking')
                    if acc3_type == 'checking':
                        draw_check('bank3_checking')
                    elif acc3_type == 'savings':
                        draw_check('bank3_savings')
                    elif acc3_type:  # Only check 'other' if account_type is not empty
                        draw_check('bank3_other')

                    # If bank 3 has the remainder, mark it
                    if percentage3 == 0 and amount3 == '':
                        # This account gets the remainder
                        draw_check('bank3_entire_net_amount')

            # Save PDF bytes before adding signature
            pdf_bytes = doc.write()
            doc.close()

            # Add signature if provided (using centralized method for consistency with I-9/W-4)
            signature_data = employee_data.get('signatureData') or employee_data.get('signature_data')
            if signature_data:
                try:
                    print(f"Direct Deposit: Adding signature using centralized method...")
                    print(f"Direct Deposit: Signature data type: {type(signature_data)}")

                    # Extract signature string from dict/string formats (ReviewAndSign sends dict)
                    signature_string = None
                    if isinstance(signature_data, dict):
                        # Check common keys for signature data URL
                        for key in ['signature', 'dataUrl', 'imageData', 'data_url']:
                            val = signature_data.get(key)
                            if isinstance(val, str) and (val.startswith('data:image') or len(val) > 100):
                                signature_string = val
                                print(f"Direct Deposit: Found signature in key '{key}'")
                                break
                    elif isinstance(signature_data, str):
                        signature_string = signature_data
                        print(f"Direct Deposit: Signature data is string")

                    if not signature_string:
                        print(f"Direct Deposit: No valid signature data URL found")
                        raise ValueError('Unsupported signature data format')

                    # Use the same centralized signature method as I-9, W-4, and Health Insurance
                    # This ensures consistent transparent PNG rendering across all forms
                    pdf_bytes = self.add_signature_to_pdf(
                        pdf_bytes=pdf_bytes,
                        signature_data=signature_string,
                        signature_type="employee_direct_deposit",
                        page_num=0
                    )
                    print(f"Direct Deposit: Signature successfully added with transparent background")
                except Exception as e:
                    print(f"Error adding signature to Direct Deposit form: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print("Direct Deposit: No signature data provided")
            
            return pdf_bytes
            
        except Exception as e:
            print(f"Error filling Direct Deposit form: {e}")
            # Re-raise the exception to handle it properly
            raise
    
    def fill_health_insurance_form(self, employee_data: Dict[str, Any]) -> bytes:
        """Fill Health Insurance form using improved overlay with better error handling"""
        try:
            from .health_insurance_overlay import HealthInsuranceFormOverlay
            
            print(f"🏥 Starting health insurance form filling...")
            print(f"Input data keys: {list(employee_data.keys())}")
            
            # Initialize the overlay generator (now with path validation)
            overlay = HealthInsuranceFormOverlay()
            
            # Prepare form data - prefer direct structure over nested
            print(f"🔍 PDF Forms - employee_data keys: {list(employee_data.keys())}")
            print(f"🔍 PDF Forms - Has medicalPlan: {'medicalPlan' in employee_data}")
            print(f"🔍 PDF Forms - Has personalInfo: {'personalInfo' in employee_data}")
            print(f"🔍 PDF Forms - Has health_insurance: {'health_insurance' in employee_data}")

            if 'medicalPlan' in employee_data or 'personalInfo' in employee_data:
                # Direct structure from frontend
                form_data = employee_data
                print(f"📄 Using direct form data structure")
            else:
                # Try nested structure
                form_data = employee_data.get('health_insurance', {})
                if not form_data:
                    print(f"🔍 PDF Forms - No health insurance data found in any expected location")
                    print(f"🔍 PDF Forms - Available keys: {list(employee_data.keys())}")
                    raise ValueError("No health insurance form data found in employee_data")
                print(f"📄 Using nested form data structure")
            
            # Extract employee names for overlay generation
            # The overlay will handle all personal info extraction internally
            first_name = ""
            last_name = ""
            
            # Try to get names as fallback parameters (overlay extraction takes precedence)
            personal_info = form_data.get('personalInfo', {})
            if personal_info:
                first_name = personal_info.get('firstName', '') or personal_info.get('first_name', '')
                last_name = personal_info.get('lastName', '') or personal_info.get('last_name', '')
            
            # Fallback to top-level names if needed
            if not first_name:
                first_name = form_data.get('firstName', '') or form_data.get('first_name', '')
            if not last_name:
                last_name = form_data.get('lastName', '') or form_data.get('last_name', '')
            
            print(f"👤 Fallback names: {first_name} {last_name}")
            
            # Handle signature data
            signature_data = employee_data.get('signatureData')
            signature_b64 = None
            signed_date = None

            if signature_data:
                if isinstance(signature_data, dict):
                    signature_b64 = signature_data.get('signature', '')
                    signed_date = signature_data.get('signedAt')
                elif isinstance(signature_data, str):
                    signature_b64 = signature_data

            # Generate PDF with improved overlay
            preview = not bool(signature_b64)  # Preview mode if no signature

            print(f"🖊️ Signature processing:")
            print(f"  signature_data: {type(signature_data)} - {bool(signature_data)}")
            print(f"  signature_b64: {bool(signature_b64)} - {signature_b64[:50] if signature_b64 else 'None'}...")
            print(f"  signed_date: {signed_date}")
            print(f"  preview mode: {preview}")
            
            print(f"🔄 Calling overlay.generate() with preview={preview}")
            pdf_bytes = overlay.generate(
                form_data=form_data,
                employee_first=first_name,
                employee_last=last_name,
                signature_b64=signature_b64,
                signed_date=signed_date,
                preview=preview,
                return_details=False
            )
            
            print(f"✅ Health insurance PDF generated successfully ({len(pdf_bytes)} bytes)")
            return pdf_bytes
            
        except FileNotFoundError as e:
            print(f"📄 Template file error: {e}")
            raise ValueError(f"Health insurance template not found: {e}")
        except ValueError as e:
            print(f"📋 Data validation error: {e}")
            raise
        except Exception as e:
            print(f"❌ Error filling Health Insurance form: {e}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to generate health insurance PDF: {str(e)}")
    
    
    def create_direct_deposit_form(self, employee_data: Dict[str, Any]) -> bytes:
        """Create direct deposit authorization form"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1
        )
        story.append(Paragraph("Employee Direct Deposit Enrollment Form", title_style))
        story.append(Spacer(1, 20))
        
        # Employee Information
        story.append(Paragraph("<b>Employee Information</b>", styles['Heading2']))
        
        emp_info = [
            ['Employee Name:', f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}"],
            ['Social Security #:', employee_data.get('ssn', '')],
            ['Employee Email:', employee_data.get('email', '')]
        ]
        
        emp_table = Table(emp_info, colWidths=[2*inch, 4*inch])
        emp_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(emp_table)
        story.append(Spacer(1, 20))
        
        # Account Information
        story.append(Paragraph("<b>Account Information</b>", styles['Heading2']))
        
        direct_deposit = employee_data.get('direct_deposit', {})
        account_info = [
            ['Bank Name/City/State:', direct_deposit.get('bank_name', '')],
            ['Routing Transit #:', direct_deposit.get('routing_number', '')],
            ['Account Number:', direct_deposit.get('account_number', '')],
            ['Account Type:', direct_deposit.get('account_type', '').title()],
            ['Deposit Amount:', 'Entire Net Amount' if direct_deposit.get('deposit_type') == 'full' else f"${direct_deposit.get('deposit_amount', 0):.2f}"]
        ]
        
        account_table = Table(account_info, colWidths=[2*inch, 4*inch])
        account_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(account_table)
        story.append(Spacer(1, 20))
        
        # Authorization text
        auth_text = """
        I hereby authorize ADP to deposit any amounts owed me, as instructed by my employer, by initiating credit entries to my account at the financial institution indicated on this form. Further, I authorize Bank to accept and to credit any credit entries indicated by ADP to my account. In the event that ADP deposits funds erroneously into my account, I authorize ADP to debit my account for an amount not to exceed the original amount of the erroneous credit.
        
        This authorization is to remain in full force and effect until ADP and Bank have received written notice from me of its termination in such time and in such manner as to afford ADP and Bank reasonable opportunity to act on it.
        """
        
        story.append(Paragraph("<b>Authorization</b>", styles['Heading2']))
        story.append(Paragraph(auth_text, styles['Normal']))
        story.append(Spacer(1, 30))
        
        # Signature lines
        sig_data = [
            ['Employee Signature:', '_' * 40, 'Date:', '_' * 20]
        ]
        
        sig_table = Table(sig_data, colWidths=[1.5*inch, 2.5*inch, 0.5*inch, 1.5*inch])
        story.append(sig_table)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    

    def _fill_i9_section1(self, doc, employee_data: Dict[str, Any]):
        """Fill Section 1 of I-9 form (Employee portion) using explicit field mappings"""
        try:
            if hasattr(doc, "set_need_appearances"):
                try:
                    doc.set_need_appearances(True)
                except Exception:
                    pass

            field_value_map = {
                'Last Name (Family Name)': employee_data.get('employee_last_name', ''),
                'First Name Given Name': employee_data.get('employee_first_name', ''),
                'Employee Middle Initial (if any)': employee_data.get('employee_middle_initial', ''),
                'Employee Other Last Names Used (if any)': employee_data.get('other_last_names', ''),
                'Address Street Number and Name': employee_data.get('address_street', ''),
                'Apt Number (if any)': employee_data.get('address_apt', ''),
                'City or Town': employee_data.get('address_city', ''),
                'State': employee_data.get('address_state', ''),
                'ZIP Code': employee_data.get('address_zip', ''),
                'Employees E-mail Address': employee_data.get('email', ''),
                'Telephone Number': ''.join(filter(str.isdigit, employee_data.get('phone', ''))),
                'USCIS ANumber': employee_data.get('uscis_number', ''),
                'Form I94 Admission Number': employee_data.get('i94_admission_number', ''),
            }

            if employee_data.get('date_of_birth'):
                field_value_map['Date of Birth mmddyyyy'] = self._format_date(employee_data['date_of_birth'])

            if employee_data.get('work_authorization_expiration'):
                field_value_map['Exp Date mmddyyyy'] = self._format_date(employee_data['work_authorization_expiration'])

            if employee_data.get('passport_number') or employee_data.get('passport_country'):
                passport_number = employee_data.get('passport_number', '')
                passport_country = employee_data.get('passport_country', '')
                field_value_map['Foreign Passport Number and Country of IssuanceRow1'] = f"{passport_number} {passport_country}".strip()

            signature_date = employee_data.get('employee_signature_date') or datetime.now().strftime('%m/%d/%Y')
            field_value_map["Today's Date mmddyyy"] = self._format_date(signature_date)

            for page_num in range(len(doc)):
                page = doc[page_num]
                for widget in list(page.widgets()):
                    field_name = widget.field_name
                    if not field_name:
                        continue

                    if field_name in field_value_map and field_value_map[field_name] not in (None, ''):
                        value = field_value_map[field_name]
                        if field_name == 'US Social Security Number':
                            value = ''.join(filter(str.isdigit, value))
                        self._set_widget_value(widget, value)
                        continue

                    if field_name == 'US Social Security Number':
                        ssn_value = ''.join(filter(str.isdigit, employee_data.get('ssn', '')))
                        if ssn_value:
                            self._set_widget_value(widget, ssn_value)
                        continue

                    if field_name in ('CB_1', 'CB_2', 'CB_3', 'CB_4'):
                        status = employee_data.get('citizenship_status', '')
                        status_map = {
                            'CB_1': 'us_citizen',
                            'CB_2': 'noncitizen_national',
                            'CB_3': 'permanent_resident',
                            'CB_4': 'authorized_alien'
                        }
                        desired = status_map.get(field_name)
                        if desired:
                            self._set_widget_value(widget, status == desired)
                        continue

                    if field_name == 'CB_Alt':
                        self._set_widget_value(widget, not bool(employee_data.get('preparer_signature')))
                        continue

        except Exception as e:
            print(f"Error filling I-9 Section 1: {e}")
            # Continue even if some fields fail

    def _fill_i9_section2(self, doc, employer_data: Dict[str, Any]):
        """Fill Section 2 of I-9 form (Employer portion)"""
        try:
            if hasattr(doc, "set_need_appearances"):
                try:
                    doc.set_need_appearances(True)
                except Exception:
                    pass

            list_a_title = employer_data.get('list_a_title') or employer_data.get('document_title_1')
            list_a_authority = employer_data.get('list_a_authority') or employer_data.get('issuing_authority_1')
            list_a_number = employer_data.get('list_a_number') or employer_data.get('document_number_1')
            list_a_expiration = employer_data.get('list_a_expiration') or employer_data.get('expiration_date_1')
            if list_a_expiration:
                list_a_expiration = self._format_date(list_a_expiration)

            list_a2_title = employer_data.get('list_a2_title') or employer_data.get('document_title_2')
            list_a2_authority = employer_data.get('list_a2_authority') or employer_data.get('issuing_authority_2')
            list_a2_number = employer_data.get('list_a2_number') or employer_data.get('document_number_2')
            list_a2_expiration = employer_data.get('list_a2_expiration') or employer_data.get('expiration_date_2')
            if list_a2_expiration:
                list_a2_expiration = self._format_date(list_a2_expiration)

            list_a3_title = employer_data.get('list_a3_title') or employer_data.get('document_title_3')
            list_a3_authority = employer_data.get('list_a3_authority') or employer_data.get('issuing_authority_3')
            list_a3_number = employer_data.get('list_a3_number') or employer_data.get('document_number_3')
            list_a3_expiration = employer_data.get('list_a3_expiration') or employer_data.get('expiration_date_3')
            if list_a3_expiration and list_a3_expiration not in ('N/A', 'n/a'):
                list_a3_expiration = self._format_date(list_a3_expiration)

            list_b_title = employer_data.get('list_b_title') or (list_a2_title if list_a_title else employer_data.get('document_title_2'))
            list_b_authority = employer_data.get('list_b_authority') or employer_data.get('issuing_authority_2')
            list_b_number = employer_data.get('list_b_number') or employer_data.get('document_number_2')
            list_b_expiration = employer_data.get('list_b_expiration') or employer_data.get('expiration_date_2')
            if list_b_expiration:
                list_b_expiration = self._format_date(list_b_expiration)

            list_c_title = employer_data.get('list_c_title') or employer_data.get('document_title_3')
            list_c_authority = employer_data.get('list_c_authority') or employer_data.get('issuing_authority_3')
            list_c_number = employer_data.get('list_c_number') or employer_data.get('document_number_3')
            list_c_expiration = employer_data.get('list_c_expiration') or employer_data.get('expiration_date_3')
            if list_c_expiration and list_c_expiration not in ('N/A', 'n/a'):
                list_c_expiration = self._format_date(list_c_expiration)

            field_value_map = {
                'FirstDayEmployed mmddyyyy': self._format_date(employer_data.get('first_day_employment')) if employer_data.get('first_day_employment') else None,
                'Document Title 1': list_a_title,
                'Issuing Authority 1': list_a_authority,
                'Document Number 0 (if any)': list_a_number,
                'Expiration Date if any': list_a_expiration,
                'Document Title 2 If any': list_a2_title,
                'Issuing Authority_2': list_a2_authority,
                'Document Number If any_2': list_a2_number,
                'List A.  Document 2. Expiration Date (if any)': list_a2_expiration,
                'List A.   Document Title 3.  If any': list_a3_title,
                'List A. Document 3.  Enter Issuing Authority': list_a3_authority,
                'List A.  Document 3 Number.  If any': list_a3_number,
                'Document Number if any_3': list_a3_number,
                'List B Document 1 Title': list_b_title if not list_a_title else '',
                'List B Issuing Authority 1': list_b_authority if not list_a_title else '',
                'List B Document Number 1': list_b_number if not list_a_title else '',
                'List B Expiration Date 1': list_b_expiration if not list_a_title else '',
                'List C Document Title 1': list_c_title if not list_a_title else '',
                'List C Issuing Authority 1': list_c_authority if not list_a_title else '',
                'List C Document Number 1': list_c_number if not list_a_title else '',
                'List C Expiration Date 1': list_c_expiration if not list_a_title else '',
                'Additional Information': employer_data.get('additional_info', ''),
                'Employers Business or Org Name': employer_data.get('business_name'),
                'Employers Business or Org Address': employer_data.get('business_address'),
                'City': employer_data.get('business_city'),
                'State': employer_data.get('business_state'),
                'ZIP Code': employer_data.get('business_zip'),
                'S2 Todays Date mmddyyyy': self._format_date(employer_data.get('signature_date')) if employer_data.get('signature_date') else None,
            }

            employer_full_name = employer_data.get('employer_name') or ''
            if employer_data.get('employer_first_name') and employer_data.get('employer_last_name'):
                employer_full_name = f"{employer_data['employer_first_name']} {employer_data['employer_last_name']}"
            if employer_full_name or employer_data.get('employer_title'):
                field_value_map['Last Name First Name and Title of Employer or Authorized Representative'] =                     f"{employer_full_name} - {employer_data.get('employer_title', '')}".strip(' -')
            if employer_data.get('employer_title'):
                field_value_map['Title of Employer or Authorized Representative'] = employer_data['employer_title']

            for page_num in range(len(doc)):
                page = doc[page_num]
                for widget in list(page.widgets()):
                    field_name = widget.field_name
                    if not field_name or field_name == 'Signature of Employer or AR':
                        continue

                    value = field_value_map.get(field_name)
                    if value in (None, ''):
                        continue

                    if 'Date' in field_name and 'mmdd' in field_name:
                        value = self._format_date(value)

                    self._set_widget_value(widget, value)

        except Exception as e:
            print(f"Error filling I-9 Section 2: {e}")

    def _set_widget_value(self, widget, field_value):
        """Safely assign values to PDF widgets"""
        try:
            if HAS_PYMUPDF and hasattr(fitz, 'PDF_WIDGET_TYPE_TEXT'):
                if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    widget.field_value = str(field_value)
                elif widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    widget.field_value = bool(field_value)
                else:
                    widget.field_value = str(field_value)
            else:
                widget.field_value = str(field_value) if not isinstance(field_value, bool) else field_value
            widget.update()
        except Exception as e:
            print(f"Warning: Could not set value for field '{widget.field_name}': {e}")

    def _debug_print_pdf_fields(self, doc, form_type: str):
        """Debug helper to print all pdf fields"""
        try:
            print(f"\n=== DEBUG: {form_type} PDF Fields ===")
            total_fields = 0
            for page_num in range(len(doc)):
                page = doc[page_num]
                widgets = list(page.widgets())
                print(f"Page {page_num + 1}: {len(widgets)} fields")
                for widget in widgets:
                    print(f"  - Field: '{widget.field_name}' | Type: {widget.field_type_string} | Value: '{widget.field_value}'")
                    total_fields += 1
            print(f"Total fields: {total_fields}")
            print("=" * 50)
        except Exception as e:
            print(f"Debug error: {e}")

    def _fill_i9_supplement_a(self, doc, employee_data: Dict[str, Any]):
        """Fill I-9 Supplement A (Preparer and/or Translator Certification)"""
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                widgets = list(page.widgets())  # Convert generator to list
                
                for widget in widgets:
                    field_name = widget.field_name
                    field_value = None
                    
                    # Supplement A: Preparer and/or Translator Certification
                    if field_name == "Last Name (Family Name) of preparer or translator":
                        field_value = employee_data.get('preparer_last_name', '')
                    elif field_name == "First Name (Given Name) of preparer or translator":
                        field_value = employee_data.get('preparer_first_name', '')
                    elif field_name == "Address (Street Number and Name) of preparer or translator":
                        field_value = employee_data.get('preparer_address', '')
                    elif field_name == "City or Town of preparer or translator":
                        field_value = employee_data.get('preparer_city', '')
                    elif field_name == "State of preparer or translator":
                        field_value = employee_data.get('preparer_state', '')
                    elif field_name == "ZIP Code of preparer or translator":
                        field_value = employee_data.get('preparer_zip', '')
                    elif field_name == "Signature of Preparer or Translator":
                        # This would be filled when signature is added
                        pass
                    elif field_name == "Date (mm/dd/yyyy) preparer or translator":
                        if employee_data.get('preparer_date'):
                            field_value = self._format_date(employee_data['preparer_date'])
                    
                    # Set field value
                    if field_value is not None:
                        if HAS_PYMUPDF and hasattr(fitz, 'PDF_WIDGET_TYPE_TEXT'):
                            if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                                widget.field_value = str(field_value)
                        else:
                            widget.field_value = str(field_value)
                        widget.update()
                        
        except Exception as e:
            print(f"Error filling I-9 Supplement A: {e}")
    
    def _fill_i9_supplement_b(self, doc, employee_data: Dict[str, Any]):
        """Fill I-9 Supplement B (Reverification and Rehires)"""
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                widgets = list(page.widgets())  # Convert generator to list
                
                for widget in widgets:
                    field_name = widget.field_name
                    field_value = None
                    
                    # Supplement B: Reverification and Rehires
                    if field_name == "Employee's Last Name (Family Name)":
                        field_value = employee_data.get('employee_last_name', '')
                    elif field_name == "Employee's First Name (Given Name)":
                        field_value = employee_data.get('employee_first_name', '')
                    elif field_name == "Employee's Middle Initial":
                        field_value = employee_data.get('employee_middle_initial', '')
                    elif field_name == "Date of Hire (mm/dd/yyyy)":
                        if employee_data.get('hire_date'):
                            field_value = self._format_date(employee_data['hire_date'])
                    elif field_name == "Date of Rehire (mm/dd/yyyy) (if applicable)":
                        if employee_data.get('rehire_date'):
                            field_value = self._format_date(employee_data['rehire_date'])
                    elif field_name == "Date of Termination (mm/dd/yyyy) (if applicable)":
                        if employee_data.get('termination_date'):
                            field_value = self._format_date(employee_data['termination_date'])
                    elif field_name == "New Name (if applicable)":
                        field_value = employee_data.get('new_name', '')
                    elif field_name == "Document Title (List A or List C)":
                        field_value = employee_data.get('reverify_document_title', '')
                    elif field_name == "Document Number":
                        field_value = employee_data.get('reverify_document_number', '')
                    elif field_name == "Expiration Date (if any) (mm/dd/yyyy)":
                        if employee_data.get('reverify_expiration_date'):
                            field_value = self._format_date(employee_data['reverify_expiration_date'])
                    elif field_name == "Name of Employer or Authorized Representative":
                        field_value = employee_data.get('employer_name', '')
                    elif field_name == "Signature of Employer or Authorized Representative":
                        # This would be filled when signature is added
                        pass
                    elif field_name == "Date (mm/dd/yyyy)":
                        if employee_data.get('reverify_signature_date'):
                            field_value = self._format_date(employee_data['reverify_signature_date'])
                    
                    # Set field value
                    if field_value is not None:
                        if HAS_PYMUPDF and hasattr(fitz, 'PDF_WIDGET_TYPE_TEXT'):
                            if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                                widget.field_value = str(field_value)
                        else:
                            widget.field_value = str(field_value)
                        widget.update()
                        
        except Exception as e:
            print(f"Error filling I-9 Supplement B: {e}")
    
    def _fill_w4_fields(self, doc, employee_data: Dict[str, Any]):
        """Fill W-4 form fields using EXACT IRS 2025 field mappings for legal compliance"""
        try:
            # Debug print available fields for compliance verification
            self._debug_print_pdf_fields(doc, "W-4")
            
            # CRITICAL: Use exact field mappings from official IRS 2025 W-4 template
            field_mappings = {
                # Step 1: Personal Information (IRS-compliant field mapping)
                W4_FORM_FIELDS["first_name_and_middle_initial"]: f"{employee_data.get('first_name', '')} {employee_data.get('middle_initial', '')}".strip(),
                W4_FORM_FIELDS["last_name"]: employee_data.get('last_name', ''),
                W4_FORM_FIELDS["address"]: employee_data.get('address', ''),
                W4_FORM_FIELDS["city_state_zip"]: f"{employee_data.get('city', '')}, {employee_data.get('state', '')} {employee_data.get('zip_code', '')}".strip(', '),
                W4_FORM_FIELDS["social_security_number"]: employee_data.get('ssn', ''),
                
                # Step 3: Claim Dependents (IRS dollar amounts)
                # Calculate the dollar amounts from the counts
                W4_FORM_FIELDS["step3_qualifying_children_amount"]: str(int(self._safe_numeric(employee_data.get('qualifying_children', 0)) * 2000)) if self._safe_numeric(employee_data.get('qualifying_children', 0)) > 0 else '',
                W4_FORM_FIELDS["step3_other_dependents_amount"]: str(int(self._safe_numeric(employee_data.get('other_dependents', 0)) * 500)) if self._safe_numeric(employee_data.get('other_dependents', 0)) > 0 else '',
                W4_FORM_FIELDS["step3_total_credits"]: str(int(self._safe_numeric(employee_data.get('dependents_amount', 0)))) if self._safe_numeric(employee_data.get('dependents_amount', 0)) > 0 else '',
                
                # Step 4: Other Adjustments (IRS dollar amounts)
                W4_FORM_FIELDS["step4a_other_income"]: str(int(self._safe_numeric(employee_data.get('other_income', 0)))) if self._safe_numeric(employee_data.get('other_income', 0)) > 0 else '',
                W4_FORM_FIELDS["step4b_deductions"]: str(int(self._safe_numeric(employee_data.get('deductions', 0)))) if self._safe_numeric(employee_data.get('deductions', 0)) > 0 else '',
                W4_FORM_FIELDS["step4c_extra_withholding"]: str(int(self._safe_numeric(employee_data.get('extra_withholding', 0)))) if self._safe_numeric(employee_data.get('extra_withholding', 0)) > 0 else '',
                
                # Step 5: Signature Date (IRS date format)
                W4_FORM_FIELDS["employee_signature_date"]: self._format_date(employee_data.get('signature_date', datetime.now().strftime('%Y-%m-%d')))
            }
            
            # DEBUG: Log which date field we're filling
            print(f"DEBUG: Employee signature date field: {W4_FORM_FIELDS['employee_signature_date']}")
            print(f"DEBUG: Employee signature date value: {field_mappings[W4_FORM_FIELDS['employee_signature_date']]}")
            
            # CRITICAL: Handle Filing Status Checkboxes (IRS-compliant)
            filing_status = employee_data.get('filing_status', '')
            # Map frontend values to checkbox fields
            if filing_status in ['single', 'Single', 'married_filing_separately']:
                field_mappings[W4_FORM_FIELDS["filing_status_single"]] = True
            elif filing_status in ['married_filing_jointly', 'Married filing jointly']:
                field_mappings[W4_FORM_FIELDS["filing_status_married_jointly"]] = True
            elif filing_status in ['head_of_household', 'Head of household']:
                field_mappings[W4_FORM_FIELDS["filing_status_head_of_household"]] = True
            
            # CRITICAL: Handle Step 2 Multiple Jobs Checkbox (IRS-compliant)
            if employee_data.get('multiple_jobs', False) or employee_data.get('multiple_jobs_checkbox', False):
                field_mappings[W4_FORM_FIELDS["step2_multiple_jobs_checkbox"]] = True
            
            # Apply all field mappings to the PDF form
            for page_num in range(len(doc)):
                page = doc[page_num]
                widgets = list(page.widgets())  # Convert generator to list
                
                for widget in widgets:
                    field_name = widget.field_name
                    
                    # DEBUG: Log all f1_14 and f1_15 fields
                    if field_name and ("f1_14" in field_name or "f1_15" in field_name):
                        print(f"DEBUG: Found date/employer field: '{field_name}' at rect: {list(widget.rect)}")
                    
                    # CRITICAL: Skip employer section fields - these should only be filled by manager
                    if field_name and ("EmployerSection" in field_name or field_name.endswith("f1_15[0]")):
                            print(f"⚠ SKIPPING EMPLOYER FIELD: '{field_name}' - Reserved for manager approval")
                            continue
                    
                    # Also skip if this is the employer's date field that might be confused with employee date
                    if field_name == "topmostSubform[0].Page1[0].EmployerSection[0].f1_14[0]":
                        print(f"⚠ SKIPPING EMPLOYER DATE FIELD: '{field_name}' - First date of employment for manager only")
                        continue
                    
                    # CRITICAL: The employee signature date field should be in Step 5, not employer section
                    # Based on PDF analysis, both f1_14[0] and f1_15[0] at y=730 are in employer section
                    # Skip the f1_15[0] field which is "First date of employment"
                    if field_name == "topmostSubform[0].Page1[0].f1_15[0]":
                        print(f"⚠ SKIPPING FIRST DATE OF EMPLOYMENT: '{field_name}' - This is for manager only")
                        continue
                    
                    if field_name in field_mappings:
                        field_value = field_mappings[field_name]
                        self._set_widget_value(widget, field_value)
                        print(f"✓ IRS COMPLIANCE: Filled field '{field_name}' with value '{field_value}'")
                    else:
                        # Log unmapped fields for compliance verification
                        print(f"⚠ UNMAPPED FIELD: '{field_name}' - verify IRS compliance")
                        
        except Exception as e:
            print(f"🚨 CRITICAL ERROR filling W-4 form: {e}")
            print("⚠ W-4 form may not be IRS compliant - manual review required")
            # Continue with partial filling if some fields fail
    
    def _is_filing_status_checkbox(self, field_name: str, status_type: str) -> bool:
        """Check if a field name matches a filing status checkbox"""
        if not field_name:
            return False
        
        field_lower = field_name.lower()
        
        if status_type == 'single':
            return 'single' in field_lower and 'married' not in field_lower
        elif status_type == 'married_jointly':
            return any(term in field_lower for term in ['married filing jointly', 'jointly', 'married joint'])
        elif status_type == 'married_separately':
            return any(term in field_lower for term in ['married filing separately', 'separately', 'married separate'])
        elif status_type == 'head_of_household':
            return any(term in field_lower for term in ['head of household', 'head household', 'hoh'])
        
        return False
    
    def _format_date(self, date_input) -> str:
        """Format date for PDF forms (MM/DD/YYYY)"""
        try:
            if isinstance(date_input, str):
                # Try parsing different date formats
                for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'):
                    try:
                        date_obj = datetime.strptime(date_input, fmt)
                        return date_obj.strftime('%m/%d/%Y')
                    except ValueError:
                        continue
                return date_input  # Return as-is if parsing fails
            elif isinstance(date_input, (datetime, date)):
                return date_input.strftime('%m/%d/%Y')
            else:
                return str(date_input)
        except:
            return str(date_input)
    
    def add_signature_to_pdf(self, pdf_bytes: bytes, signature_data: str, signature_type: str, page_num: int = 0, signature_date: str = None) -> bytes:
        """Add digital signature to PDF"""
        if not HAS_PYMUPDF:
            print("PyMuPDF not available, cannot add signature to PDF")
            return pdf_bytes  # Return original PDF
            
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page = doc[page_num]
            
            # Decode base64 signature
            signature_bytes = base64.b64decode(signature_data.split(',')[1] if ',' in signature_data else signature_data)

            # Remove white background from signature (captured on white canvas with black/dark lines)
            print(f"Original signature bytes length: {len(signature_bytes)}")
            print(f"Signature type: {signature_type}")

            try:
                # Open the signature image
                img = PILImage.open(io.BytesIO(signature_bytes))
                print(f"Original signature: format={img.format}, mode={img.mode}, size={img.size}")

                # Convert to RGBA to handle transparency
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')

                has_transparency = False
                try:
                    alpha_channel = img.split()[3]
                    alpha_extrema = alpha_channel.getextrema()
                    if alpha_extrema:
                        has_transparency = alpha_extrema[0] < 255
                except Exception as alpha_error:
                    print(f"Warning: Could not analyze signature alpha channel: {alpha_error}")

                if has_transparency:
                    print("Signature already contains transparency; skipping background removal")
                else:
                    # Get image data
                    data = img.getdata()
                    new_data = []

                    # Process each pixel
                    for item in data:
                        r, g, b, a = item

                        # If pixel is white or very light (background), make it transparent
                        if r > 240 and g > 240 and b > 240:
                            new_data.append((255, 255, 255, 0))  # Transparent white
                        else:
                            # Keep signature pixels (dark lines) as they are
                            new_data.append((r, g, b, 255))  # Fully opaque

                    # Apply the new data when we had to process background
                    img.putdata(new_data)

                # Save processed (or original) image to PNG bytes
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='PNG')
                processed_signature_bytes = img_buffer.getvalue()

                print(
                    "Processed signature:",
                    {
                        "size": img.size,
                        "processed_bytes_length": len(processed_signature_bytes),
                        "has_transparency": has_transparency,
                    }
                )

            except Exception as e:
                print(f"Error processing signature transparency: {e}")
                # Fallback to original if processing fails
                processed_signature_bytes = signature_bytes

            # Define signature position based on form type
            if signature_type == "employee_i9":
                # I-9 employee signature position - back to original working position
                rect = fitz.Rect(50, 402, 250, 452)  # x1, y1, x2, y2 (width:200, height:50)
            elif signature_type == "employer_i9":
                # I-9 employer signature position (Section 2)
                rect = fitz.Rect(350, 750, 500, 780)
            elif signature_type == "employee_w4":
                # W-4 employee signature position
                # The actual signature line is in Step 5, around y:690 from bottom-left origin
                # Position signature properly on the "Employee's signature" line
                rect = fitz.Rect(100, 690, 350, 720)
            elif signature_type == "employee_health_insurance":
                # Health insurance employee signature position (Page 2)
                # Based on the current coordinates in health_insurance_overlay.py
                rect = fitz.Rect(188.28, 615.6, 486.0, 652.92)
            elif signature_type == "employee_direct_deposit":
                # Direct Deposit employee signature position
                # Based on widget coordinates: x=134.28, y=400.66 (expanded for proper signature display)
                rect = fitz.Rect(134.28, 390.66, 314.28, 425.66)  # 180x35 box
            else:
                # Default position
                rect = fitz.Rect(150, 650, 300, 680)

            # Insert signature with transparent background
            try:
                # Use the processed signature (white background removed)
                page.insert_image(rect, stream=processed_signature_bytes)
                print(f"Successfully inserted signature with transparent background at coordinates: {rect}")
            except Exception as e:
                print(f"Stream insertion failed: {e}, trying pixmap method")
                try:
                    # Fallback: Create a pixmap from processed signature
                    pix = fitz.Pixmap(processed_signature_bytes)
                    page.insert_image(rect, pixmap=pix)
                    pix = None  # Release pixmap
                    print(f"Successfully inserted signature via pixmap at coordinates: {rect}")
                except Exception as e2:
                    print(f"Processed signature insertion failed: {e2}, trying original")
                    # Last resort: use original signature
                    try:
                        pix = fitz.Pixmap(signature_bytes)
                        page.insert_image(rect, pixmap=pix)
                        pix = None
                        print(f"Inserted original signature (with white background) at coordinates: {rect}")
                    except Exception as e3:
                        print(f"All signature insertion methods failed: {e3}")

            # Add signature date if provided
            if signature_date and signature_type == "employee_health_insurance":
                try:
                    # Parse and format the date
                    from datetime import datetime
                    if isinstance(signature_date, str):
                        # Try to parse ISO format date
                        try:
                            date_obj = datetime.fromisoformat(signature_date.replace('Z', '+00:00'))
                            formatted_date = date_obj.strftime('%m/%d/%Y')
                        except:
                            # If parsing fails, try to extract just the date part
                            formatted_date = signature_date.split('T')[0] if 'T' in signature_date else signature_date
                    else:
                        formatted_date = str(signature_date)

                    # Position the date below the signature (health insurance specific)
                    # Based on the signature coordinates: rect = fitz.Rect(188.28, 615.6, 486.0, 652.92)
                    date_rect = fitz.Rect(500, 615.6, 600, 635)  # To the right of signature

                    # Insert date text
                    page.insert_text(
                        (date_rect.x0, date_rect.y1 - 5),  # Position text
                        formatted_date,
                        fontsize=10,
                        color=(0, 0, 0)  # Black color
                    )

                    print(f"Added signature date to health insurance PDF: {formatted_date}")

                except Exception as e:
                    print(f"Error adding signature date: {e}")

            # Save and return modified PDF
            result_bytes = doc.write()
            doc.close()
            return result_bytes
            
        except Exception as e:
            print(f"Error adding signature to PDF: {e}")
            return pdf_bytes  # Return original if signature addition fails
    
    def _create_fallback_i9(self, employee_data: Dict[str, Any], employer_data: Optional[Dict[str, Any]]) -> bytes:
        """Create fallback I-9 form if official PDF filling fails"""
        # Create custom I-9 form using ReportLab as fallback
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        story.append(Paragraph("Form I-9, Employment Eligibility Verification", styles['Title']))
        story.append(Paragraph("Department of Homeland Security - U.S. Citizenship and Immigration Services", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Add form content here
        story.append(Paragraph("Section 1. Employee Information and Attestation", styles['Heading2']))
        # Add employee fields...
        
        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    
    def _create_fallback_w4(self, employee_data: Dict[str, Any]) -> bytes:
        """Create fallback W-4 form"""
        # Similar implementation for W-4 fallback
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        story.append(Paragraph("Form W-4 (2024)", styles['Title']))
        story.append(Paragraph("Employee's Withholding Certificate", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Add W-4 content here
        
        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    
    def create_company_policies_pdf(self, employee_data: Dict[str, Any]) -> bytes:
        """Create COMPLETE company policies PDF with ALL sections from frontend"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=54, leftMargin=54,
                              topMargin=54, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Justify', alignment=4, fontSize=10, leading=13))
        styles.add(ParagraphStyle(name='PolicyTitle', fontSize=11, textColor=colors.black, 
                                 spaceAfter=8, spaceBefore=12, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='SectionHeader', fontSize=14, textColor=colors.black,
                                 spaceAfter=12, spaceBefore=18, fontName='Helvetica-Bold', alignment=1))
        
        story = []
        
        # Header
        story.append(Paragraph("COMPANY POLICIES & TERMS", styles['Title']))
        story.append(Paragraph("Employee Acknowledgment Form", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Employee info
        employee_name = f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip()
        story.append(Paragraph(f"Employee: {employee_name}", styles['Normal']))
        story.append(Paragraph(f"Property: {employee_data.get('property_name', 'Hotel Property')}", styles['Normal']))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # ========== ALL COMPANY POLICIES ==========
        
        # AT WILL EMPLOYMENT
        story.append(Paragraph("AT WILL EMPLOYMENT", styles['PolicyTitle']))
        story.append(Paragraph(
            "Your employment relationship with the Hotel is 'At-Will' which means that it is a voluntary one "
            "which may by be terminated by either the Hotel or yourself, with or without cause, and with or without "
            "notice, at any time. Nothing in these policies shall be interpreted to be in conflict with or to eliminate or "
            "modify in any way the 'employment-at-will' status of Hotel associates.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # WORKPLACE VIOLENCE PREVENTION POLICY
        story.append(Paragraph("WORKPLACE VIOLENCE PREVENTION POLICY", styles['PolicyTitle']))
        story.append(Paragraph(
            "The Hotel strives to maintain a productive work environment free of violence and the threat of "
            "violence. We are committed to the safety of our associates, vendors, customers and visitors.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Hotel does not tolerate any type of workplace violence committed by or against associates. "
            "Any threats or acts of violence against an associate, vendor customer, visitor or property will not be "
            "tolerated. Any associate who threatens violence or acts in a violent manner while on Hotel premises, or "
            "during working hours will be subject to disciplinary action, up to and including termination. Where "
            "appropriate, the Hotel will report violent incidents to local law enforcement authorities.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "A violent act, or threat of violence, is defined as any direct or indirect action or behavior that "
            "could be interpreted, in light of known facts, circumstances and information, by a reasonable person, as "
            "indicating the potential for or intent to harm, endanger or inflict pain or injury on any person or property.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Examples of prohibited conduct include but are not limited to:<br/>"
            "• Physical assault, threat to assault or stalking an associate or customer;<br/>"
            "• Possessing or threatening with a weapon on hotel premises;<br/>"
            "• Intentionally damaging property of the Hotel or personal property of another;<br/>"
            "• Aggressive or hostile behavior that creates a reasonable fear of injury to another person;<br/>"
            "• Harassing or intimidating statements, phone calls, voice mails, or e-mail messages, or those which are "
            "unwanted or deemed offensive by the receiver, including cursing and/or name calling;<br/>"
            "• Racial or cultural epithets or other derogatory remarks associated with hate crime threats.<br/>"
            "• Conduct that threatens, intimidates or coerces another associate, customer, vendor or business associate<br/>"
            "• Use of hotel resources to threaten, stalk or harass anyone at the workplace or outside of the workplace.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Hotel treats threats coming from an abusive personal relationship as it does other forms of "
            "violence and associates should promptly inform their immediate supervisor or General Manager of any "
            "protective or restraining order that they have obtained that lists the workplace as a protected area.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Any associate who feels threatened or is subjected to violent conduct or who witnesses threatening "
            "or violent conduct at the workplace should report the incident to his or her supervisor or any member of "
            "management immediately. In addition, associates should report all suspicious individuals or activities as "
            "soon as possible.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Associates who are not comfortable reporting incidents at the property level may contact the "
            "administrative office at <b>(908) 444-8139</b> or via email at <b>njbackoffice@lakecrest.com</b>. A representative "
            "will promptly and thoroughly investigate all reports of threats or actual violence as well as suspicious "
            "individuals and activities at the workplace.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Hotel will not retaliate against associates making good-faith reports of violence, threats or "
            "suspicious individuals or activities.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Anyone determined to be responsible for threats of or actual violence or other conduct that is in "
            "violation of this policy will be subject to disciplinary action, up to and including termination.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "In order to maintain workplace safety and the integrity of its investigation, the Hotel may suspend "
            "associates suspected of workplace violence or threats of violence, either with or without pay, pending "
            "investigation.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Hotel strictly forbids any employee to possess, concealed, or otherwise, any weapon on their "
            "person while on the Hotel premises, including but not limited to fire arms. The Hotel also forbids "
            "brandishing firearms in the parking lot (other than for lawful self-defense) and prohibiting threats or "
            "threatening behavior of any type.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # SURVEILLANCE
        story.append(Paragraph("SURVEILLANCE", styles['PolicyTitle']))
        story.append(Paragraph(
            "For safety, visual and audio recording devices are installed throughout the property and the footage is recorded.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # PAY, PAY PERIOD AND PAY DAY
        story.append(PageBreak())
        story.append(Paragraph("PAY, PAY PERIOD AND PAY DAY", styles['PolicyTitle']))
        story.append(Paragraph(
            "Associates are paid biweekly (every other week) for their hours worked during the preceding pay period.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph("• A pay period consists of two consecutive pay weeks, at 7 days per week.", styles['Justify']))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "For employees who haves elected direct deposit as payment method, a pay stub will not be issued at the Hotel. "
            "Contact your General Manager for electronic access to your pay stub through a payroll portal. For employees who "
            "do not select direct deposit, a check and pay stub will be made available for you, customarily on Friday by 1PM "
            "local time. Employee pay checks will not be released to anyone other than you, except with your written permission "
            "(required for every instance), and submitted to your General Manager.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Non-exempt associates will be paid for all work in excess of 40 hours a week at hourly rate plus ½ hourly wages, "
            "in accordance with Federal and State laws.",
            styles['Justify']
        ))
        story.append(Paragraph(
            "• Overtime must be approved by your manager before it is performed.<br/>"
            "• Personal Time Off will not be counted towards hours worked for overtime calculations.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Failure to work scheduled overtime or overtime worked without prior authorization from the supervisor may result "
            "in disciplinary action, up to and including possible termination of employment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # FRATERNIZING WITH GUESTS AND DATING AT THE WORK PLACE
        story.append(Paragraph("FRATERNIZING WITH GUESTS AND DATING AT THE WORK PLACE", styles['PolicyTitle']))
        story.append(Paragraph(
            "Contact with guests, other than in the normal course of day-to-day operations of the hotel is not permitted at "
            "any time. Unauthorized presence at guest functions, or unauthorized presence anywhere on the hotel premises, "
            "including guest rooms, may be considered a violation of Hotel policy and disciplinary action may result.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Supervisors and associates under their supervision are strongly discouraged from forming romantic or sexual "
            "relationships. Such relationships can create the impression of impropriety in terms and conditions of employment "
            "and can interfere with productivity and the overall work environment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "If you are unsure of the appropriateness of an interaction with another associate of the Hotel, contact any "
            "member of management or the administrative office for guidance.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "If you are encouraged or pressured to become involved with a customer or associate in a way that makes you "
            "feel uncomfortable, you should also notify management immediately.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # CONTACT WITH MEDIA
        story.append(Paragraph("CONTACT WITH MEDIA", styles['PolicyTitle']))
        story.append(Paragraph(
            "In the event that you are contacted by any member of the media or any outside party regarding hotel business "
            "or incident, occurring on or off property, kindly refer such inquiries to your General Manager.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # ELECTRONIC MAIL
        story.append(Paragraph("ELECTRONIC MAIL", styles['PolicyTitle']))
        story.append(Paragraph(
            "Electronic mail may be provided to facilitate the business of the Hotel. It is to be used for business purposes "
            "only. The electronic mail and other information systems are not to be used in a way that may be disruptive, "
            "offensive to others, or harmful to morale.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Specifically, it is against Hotel policy to display or transmit sexually explicit messages, or cartoons. "
            "Therefore, any such transmission or use of e-mail that contain ethnic slurs, racial epithets, or anything else "
            "that may be construed as harassment or offensive to others based on their race, national origin, sex, sexual "
            "orientation, age, disability, religious, or political beliefs is strictly prohibited and could result in "
            "appropriate disciplinary action up to and including termination.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Destroying or deleting e-mail messages which are considered business records is strictly prohibited. The Hotel "
            "reserves the right to monitor all electronic mail retention and take appropriate management action, if necessary, "
            "including disciplinary action, for violations of this policy up to and including termination.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Hotel reserves the right to take immediate action, up to and including termination, regarding activities "
            "(1) that create security and/or safety issues for the Hotel, associates, vendors, network or computer resources, "
            "or (2) that expend Hotel resources on content the Hotel in its sole discretion determines lacks legitimate "
            "business content/purpose, (3) other activities as determined by Hotel as inappropriate, or (4) violation of "
            "any federal or state regulations.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # Continue on next page
        story.append(PageBreak())
        
        # REMOVAL OF ITEMS OFF HOTEL PREMISES
        story.append(Paragraph("REMOVAL OF ITEMS OFF HOTEL PREMISES", styles['PolicyTitle']))
        story.append(Paragraph(
            "No items other than an associate's own personal property may be removed from Hotel premises without "
            "authorization. Permission must be obtained from your General Manager in order to remove any item from the "
            "hotel premises. (An example of such is a small article of minimal value that the guest did not take with "
            "him/her). The hotel has the right of inspection and retention of any such items suspected to being removed "
            "from the premises. At no time is food of any type or form, full or partial, containers of alcoholic beverages "
            "to be removed from the Hotel.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # ACCESS TO HOTEL FACILITIES AND SOLICITATION POLICY  
        story.append(Paragraph("ACCESS TO HOTEL FACILITIES AND SOLICITATION POLICY", styles['PolicyTitle']))
        story.append(Paragraph(
            "The hotel and its facilities are for the use and enjoyment of the hotel guests. Associates are to leave the "
            "building and premises immediately after their scheduled shifts. Returning to the hotel after scheduled hours "
            "for any reason is not permitted without previous approval from the General Manager.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Only associates, guests, visitors, vendors and suppliers doing business with the Hotel or its affiliates are "
            "permitted at any time on the Hotel's premises. Persons other than associates of the Hotel may never engage in "
            "solicitation, distribution or postings of written or printed materials of any nature at any time in or on the "
            "Hotel's premises.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Employees are prohibited from engaging in solicitation or distribution of any kind during working time, in any "
            "working areas, including guest rooms, guest dining areas, parking lot or areas within the Hotel where guests "
            "congregate (lobby, lounge, etc.).",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            'For the purpose of this policy, "working time" includes the working time of both the associate doing the '
            "solicitation or distribution and the associate to whom it is directed, but does not include break, lunch or "
            "other duty-free periods of time.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Off-duty associates are not permitted access to the interior of the Hotel's premises except where they are "
            "attending a Hotel event, or to conduct business with the Hotel's management or administrative office that "
            "cannot be conducted during the associate's regular work shift. Unless explicitly approved by the asset manager, "
            "associates are not permitted to stay on property.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # HAZARD COMMUNICATION PLAN
        story.append(Paragraph("HAZARD COMMUNICATION PLAN", styles['PolicyTitle']))
        story.append(Paragraph(
            "The Hotel values employee safety and gives it the utmost priority. A Hazard Communication Plan is located "
            "in the Hotel, which each employee is required to review prior to start of their first shift of work. Please "
            "ask your General Manager where it is located.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # PAID TIME OFF AND HOLIDAY POLICY
        story.append(Paragraph("PAID TIME OFF AND HOLIDAY POLICY", styles['PolicyTitle']))
        story.append(Paragraph(
            "The Company offers PTO to 'regular full-time and part-time associates' only. Temporary/seasonal associates "
            "do not earn PTO. Eligible associates begin to accrue PTO immediately, at hire and accrual is rate is only "
            "based on regular hours worked. This PTO can be used for any reason that the associate deems appropriate, "
            "with advance notice and management approval, and is paid at the rate of pay when PTO is paid out. All PTO "
            "earned during each calendar year will be paid out on the last payroll of the calendar year. If associates "
            "choose, they may elect to carry over no more than 5 hours of PTO can be carried over into the following year. "
            "The rate of accrual and maximum PTO hours that an associate may accrue during a given calendar year will vary "
            "with the associate's length of service and hours worked.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # PTO Table
        pto_data = [
            ['YEAR OF EMPLOYMENT', 'PTO ACCRUAL RATE\nNON-EXEMPT/HOURLY ASSOCIATES\n(PER PAID HOUR)', 
             'ACCRUED PTO PER ANNIVERSARY YEAR\n(ASSUMING 2080 HOURS WORKED PER YR)'],
            ['1 - 3', '0.019', '5 days (40 hours)'],
            ['4 - 8', '0.027', '7 days (56 hours)'],
            ['9 +', '0.038', '10 days (80 hours)']
        ]
        pto_table = Table(pto_data, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
        pto_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey, colors.white]),
        ]))
        story.append(pto_table)
        story.append(Spacer(1, 12))
        
        story.append(Paragraph(
            "Notes:<br/>"
            "• PTO is granted as a benefit and in order to be paid for this benefit, the day(s) must be taken off.<br/>"
            "• Upon termination of employment, associate is not be entitled for payment of any unused PTO, regardless of "
            "when it was earned or reason for termination.<br/>"
            "• All requests for days off/PTO must be in submitted in advance in writing and approved by your manager.<br/>"
            "• Associates can not borrow from their PTO and will accrue PTO when working at the rates specified in the "
            "table above.<br/>"
            "• PTO is paid at the pay rate at time of payment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The Company pays associates for six holidays, in addition to accrued PTO. Full time employees are paid for "
            "8 hours, at regular pay. Part time employees, classified as working less than 30 hours a week will be paid "
            "for 4 hours.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "• New Year's Day (January 1)<br/>"
            "• Memorial Day<br/>"
            "• Independence Day (July 4)<br/>"
            "• Labor Day<br/>"
            "• Thanksgiving Day<br/>"
            "• Christmas Day (December 25)",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "The above policy supersedes any previously communicated policies, including any previously issued employee handbooks.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # Continue with more policies on next page
        story.append(PageBreak())
        
        # DRUG-FREE WORKPLACE POLICY
        story.append(Paragraph("DRUG-FREE WORKPLACE POLICY", styles['PolicyTitle']))
        story.append(Paragraph(
            "The Hotel is committed to maintaining a drug-free workplace. The use, possession, distribution, or being "
            "under the influence of illegal drugs or alcohol during work hours is strictly prohibited. Employees may be "
            "subject to drug testing as a condition of employment, after accidents, or based on reasonable suspicion. "
            "Violation of this policy will result in immediate termination.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # BACKGROUND CHECK AUTHORIZATION
        story.append(Paragraph("BACKGROUND CHECK AUTHORIZATION", styles['PolicyTitle']))
        story.append(Paragraph(
            "As a condition of employment, all employees must pass a background check. This may include criminal history, "
            "employment verification, education verification, and credit checks where applicable. By accepting employment, "
            "you authorize the Hotel to conduct these checks both pre-employment and during employment as necessary.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # MANDATORY ARBITRATION AGREEMENT
        story.append(Paragraph("MANDATORY ARBITRATION AGREEMENT", styles['PolicyTitle']))
        story.append(Paragraph(
            "Any dispute arising out of or relating to your employment, including claims of discrimination, harassment, "
            "wrongful termination, or wage disputes, shall be resolved through binding arbitration rather than court "
            "proceedings. By accepting employment, you waive your right to a jury trial for employment-related disputes.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # EMPLOYEE HANDBOOK ACKNOWLEDGMENT
        story.append(Paragraph("EMPLOYEE HANDBOOK ACKNOWLEDGMENT", styles['PolicyTitle']))
        story.append(Paragraph(
            "I acknowledge that I have received access to the Employee Handbook and understand it is my responsibility "
            "to read and comply with all policies contained therein. I understand that the handbook may be updated at "
            "any time and it is my responsibility to stay informed of changes. The handbook does not constitute an "
            "employment contract.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # WEAPONS POLICY
        story.append(Paragraph("WEAPONS POLICY", styles['PolicyTitle']))
        story.append(Paragraph(
            "The Company strictly forbids any employee to possess, concealed, or otherwise, any weapon on their person "
            "while on the Hotel premises. This includes but is not limited to fire arms, knives, etc and regardless of "
            "whether an Employee possesses any governmental licenses and/or approvals. The Company also forbids brandishing "
            "firearms in the parking lot (other than for lawful self-defense) and prohibiting threats or threatening "
            "behavior of any type. Violation of this policy may lead to disciplinary action, up to and including "
            "termination of employment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # New page for EEO and Sexual Harassment policies (requiring initials)
        story.append(PageBreak())
        
        # EQUAL EMPLOYMENT OPPORTUNITY (requiring initials)
        story.append(Paragraph("EQUAL EMPLOYMENT OPPORTUNITY", styles['PolicyTitle']))
        story.append(Paragraph(
            'Your employer (the "Hotel") provides equal employment opportunities to all employees and applicants for '
            "employment without regard to race, color, religion, sex, sexual orientation, national origin, age, disability, "
            "genetic predisposition, military or veteran status in accordance with applicable federal, state or local laws. "
            "This policy applies to all terms and conditions of employment, including but not limited to, hiring, placement, "
            "promotion, termination, transfer, leaves of absence, compensation, and training.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # SEXUAL AND OTHER UNLAWFUL HARASSMENT (requiring initials)  
        story.append(Paragraph("SEXUAL AND OTHER UNLAWFUL HARASSMENT", styles['PolicyTitle']))
        story.append(Paragraph(
            "We are committed to providing a work environment that is free from sexual discrimination and sexual "
            "harassment in any form, as well as unlawful harassment based upon any other protected characteristic. In "
            "keeping with that commitment, we have established procedures by which allegations of sexual or other unlawful "
            "harassment may be reported, investigated and resolved. Each manager and associate has the responsibility to "
            "maintain a workplace free of sexual and other unlawful harassment. This duty includes ensuring that associates "
            "do not endure insulting, degrading or exploitative sexual treatment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Sexual harassment is a form of associate misconduct which interferes with work productivity and wrongfully "
            "deprives associates of the opportunity to work in an environment free from unsolicited and unwelcome sexual "
            "advances, requests for sexual favors and other such verbal or physical conduct. Sexual harassment has many "
            "different definitions and it is not the intent of this policy to limit the definition of sexual harassment, "
            "but rather to give associates as much guidance as possible concerning what activities may constitute sexual "
            "harassment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Prohibited conduct includes, but is not limited to, unwelcome sexual advances, requests for sexual favors "
            "and other similar verbal or physical contact of a sexual nature where:<br/>"
            "• Submission to such conduct is either an explicit or implicit condition of employment;<br/>"
            "• Submission to or rejection of such conduct is used as a basis for making an employment-related decision;<br/>"
            "• The conduct unreasonably interferes with an individual's work performance; or<br/>"
            "• The conduct creates a hostile, intimidating or offensive work environment.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Sexual harassment may be male to female, female to male, female to female or male to male. Similarly, "
            "other unlawful harassment may be committed by and between individuals who share the same protected "
            "characteristics, such as race, age or national origin. Actions which may result in charges of sexual "
            "harassment include, but are not limited to, the following:<br/>"
            "• Unwelcome physical contact, including touching on any part of the body, kissing, hugging or standing so "
            "close as to brush up against another person;<br/>"
            "• Requests for sexual favors either directly or indirectly;<br/>"
            "• Requiring explicit or implicit sexual conduct as a condition of employment, a condition of obtaining a "
            "raise, a condition of obtaining new duties or any type of advancement in the workplace; or<br/>"
            "• Requiring an associate to perform certain duties or responsibilities simply because of his or her gender "
            "or other protected characteristic.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Other behavior that may seem innocent or acceptable to some people can constitute sexual harassment to "
            "others. Prohibited behaviors include, but are not limited to:<br/>"
            "• unwelcome sexual flirtations, advances, jokes or propositions;<br/>"
            "• unwelcome comments about an individual's body or personal life;<br/>"
            "• openly discussing intimate details of one's own personal life;<br/>"
            "• sexually degrading words to describe an individual; or<br/>"
            "• displays in the workplace of objects, pictures, cartoons or writings, which might be perceived as "
            "sexually suggestive.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "Unwelcome conduct such as degrading jokes, foul language direct to or at a person, racial slurs, comments, "
            "cartoons or writing based upon any other protected characteristic is similarly prohibited.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "All associates are required to report any incidents of sexual or other unlawful harassment of which they "
            "have knowledge. Similarly, if you ever feel aggrieved because of sexual harassment, you have an obligation "
            "to communicate the problem immediately and should report such concerns to your manager, and/or the offending "
            "associate directly. If this is not an acceptable option, you should report your concern directly to the "
            "administrative office confidentially. In all cases in which a manager or another member of management is "
            "notified first, the administrative office should be notified immediately. Management has an obligation to "
            "report any suspected violations of this policy to the asset manager. A manager who is aware of a violation, "
            "even if the associate is outside the manager's immediate area of supervision, but doesn't report it, will be "
            "held accountable for his or her inaction. The asset manager shall conduct a prompt investigation of the "
            "allegations to obtain the facts from any and all parties or witnesses.",
            styles['Justify']
        ))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "While we will attempt to maintain the confidentiality of the information received, it will not always be "
            "possible to do so. Should the facts support the allegations made, we will remedy the situation and, if "
            "appropriate under the circumstances, take disciplinary action up to and including termination.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        
        # New page for hotline and acknowledgment
        story.append(PageBreak())
        
        # CONFIDENTIAL ASSOCIATE HOTLINE
        story.append(Paragraph("CONFIDENTIAL ASSOCIATE HOTLINE", styles['PolicyTitle']))
        story.append(Paragraph(
            "We rely on our associates to protect the assets and reputation of our company. If you have knowledge of:",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "<b>THEFT, HARASSMENT, ABUSE, DANGEROUS, SUSPICIOUS OR QUESTIONABLE PRACTICES</b>",
            styles['Heading2']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "Send an e-mail to: <b>feedback@lakecrest.com</b>",
            styles['Normal']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "<b>ALL REPORTS WILL BE CONFIDENTIAL AND TAKEN SERIOUSLY</b>",
            styles['Normal']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "When reporting, please remember to:<br/>"
            "• Identify the name of the hotel where the incident occurred<br/>"
            "• Explain details of the Incident to include:<br/>"
            "  - Date(s)<br/>"
            "  - Time(s)<br/>"
            "  - Name(s) of involved person(s)<br/>"
            "  - A clear, detailed account of the event",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "Our 'No Retaliation' policy strictly prohibits any adverse action taken on employees who, in good faith, "
            "file a report.",
            styles['Justify']
        ))
        story.append(Spacer(1, 20))
        
        # ACKNOWLEDGMENT OF RECEIPT
        story.append(Paragraph("ACKNOWLEDGMENT OF RECEIPT", styles['PolicyTitle']))
        story.append(Paragraph(
            "In consideration of my employment, I agree to conform to the rules and regulations of the Hotel. I understand "
            "my employment and compensation can be terminated, with or without cause, with or without notice, at any time "
            "and at the option of either the Hotel or myself. I understand that no representative of the Hotel has any "
            "authority to enter into any agreement of employment for any specific period of time or to make any agreement "
            "contrary to this paragraph. I further understand that if, during the course of my employment, I acquire "
            "confidential or proprietary information about the Company or any division thereof, and its clients, that this "
            "information is to be handled in strict confidence and will not be disclosed to or discussed with outsiders "
            "during the term of my employment or any time thereafter. I also understand that should I have any questions "
            "or concerns, at any point during my employment, I may speak to my direct supervisor, or if necessary, contact "
            "the administrative office at <b>(908) 444-8139</b> or via email at <b>njbackoffice@lakecrest.com</b>.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "Note - while every attempt has been made to create these policies consistent with federal and state law, if "
            "an inconsistency arises, the policy(ies) will be enforced consistent with the applicable law.",
            styles['Justify']
        ))
        story.append(Spacer(1, 12))
        story.append(Paragraph(
            "My signature below certifies that I have read and understood the above information as well as the remainder "
            "of the contents asked of me to review. Further, my signature below certifies that I have located the Hotel's "
            "Hazard Communication Plan and I have reviewed it. I understand that if I have any questions, at any point "
            "during my employment, I should go to my direct supervisor, or the General Manager immediately.",
            styles['Justify']
        ))
        story.append(Spacer(1, 20))
        
        # Page break before initials table
        story.append(PageBreak())
        story.append(Paragraph("POLICY ACKNOWLEDGMENTS", styles['SectionHeader']))
        story.append(Spacer(1, 20))
        
        # Get initials - check both possible locations in the data structure
        if 'formData' in employee_data:
            # Data might be nested under formData
            form_data = employee_data['formData']
            company_initials = form_data.get('companyPoliciesInitials', employee_data.get('companyPoliciesInitials', ''))
            eeo_initials = form_data.get('eeoInitials', employee_data.get('eeoInitials', ''))
            sh_initials = form_data.get('sexualHarassmentInitials', employee_data.get('sexualHarassmentInitials', ''))
        else:
            # Direct access
            company_initials = employee_data.get('companyPoliciesInitials', '')
            eeo_initials = employee_data.get('eeoInitials', '')
            sh_initials = employee_data.get('sexualHarassmentInitials', '')
        
        # Initials table - display actual initials or blank lines
        initials_data = [
            ['Policy Section', 'Your Initials', 'Date'],
            ['Company Policies (AT WILL, Violence Prevention, Pay, etc.)', 
             company_initials if company_initials else '_____', 
             datetime.now().strftime('%m/%d/%Y')],
            ['Equal Employment Opportunity', 
             eeo_initials if eeo_initials else '_____', 
             datetime.now().strftime('%m/%d/%Y')],
            ['Sexual and Other Unlawful Harassment', 
             sh_initials if sh_initials else '_____', 
             datetime.now().strftime('%m/%d/%Y')]
        ]
        
        initials_table = Table(initials_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        initials_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey, colors.white]),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(initials_table)
        story.append(Spacer(1, 30))
        
        # Signature section
        story.append(Paragraph("EMPLOYEE ACKNOWLEDGMENT AND SIGNATURE", styles['PolicyTitle']))
        story.append(Spacer(1, 20))
        
        # Create signature table with or without actual signature
        sig_data = []
        
        # Add signature image if provided
        if employee_data.get('signatureData'):
            try:
                signature_data = employee_data['signatureData']
                if isinstance(signature_data, dict):
                    signature_base64 = signature_data.get('signature', '')
                else:
                    signature_base64 = signature_data
                    
                if signature_base64 and signature_base64.startswith('data:image'):
                    signature_base64 = signature_base64.split(',')[1]
                
                if signature_base64:
                    import base64
                    from PIL import Image as PILImage
                    
                    signature_bytes = base64.b64decode(signature_base64)
                    signature_img = PILImage.open(io.BytesIO(signature_bytes))

                    # Flatten transparent backgrounds so we do not render a dark box
                    if signature_img.mode in ("RGBA", "LA") or (
                        signature_img.mode == "P" and "transparency" in signature_img.info
                    ):
                        signature_rgba = signature_img.convert("RGBA")
                        background = PILImage.new(
                            "RGBA", signature_rgba.size, color=(255, 255, 255, 255)
                        )
                        background.paste(signature_rgba, mask=signature_rgba.split()[-1])
                        signature_img = background.convert("RGB")
                    else:
                        signature_img = signature_img.convert("RGB")

                    # Resize to fit
                    signature_img.thumbnail((200, 60), PILImage.Resampling.LANCZOS)
                    
                    # Save to buffer
                    temp_buffer = io.BytesIO()
                    signature_img.save(temp_buffer, format='PNG')
                    temp_buffer.seek(0)
                    
                    # Create image for the table
                    img = Image(temp_buffer, width=signature_img.width, height=signature_img.height)
                    
                    # Add row with signature image
                    sig_data.append(['Employee Signature:', img, 'Date:', datetime.now().strftime('%m/%d/%Y')])
                    sig_data.append(['', '____________________', '', ''])
                    sig_data.append(['Employee Name:', employee_name, '', ''])
            except Exception as e:
                print(f"Error adding signature: {e}")
                # Fall back to text-only signature
                sig_data.append(['Employee Signature:', '____________________', 'Date:', datetime.now().strftime('%m/%d/%Y')])
                sig_data.append(['Employee Name:', employee_name or '____________________', '', ''])
        else:
            # No signature provided - show blank lines
            sig_data.append(['Employee Signature:', '____________________', 'Date:', datetime.now().strftime('%m/%d/%Y')])
            sig_data.append(['Employee Name:', employee_name or '____________________', '', ''])
        
        # Add metadata if signature was provided
        if employee_data.get('signatureData'):
            sig_data.append(['', '', '', ''])
            sig_data.append(['Signed Electronically', '', '', ''])
            if employee_data.get('completedAt'):
                sig_data.append([f"Timestamp: {employee_data.get('completedAt')}", '', '', ''])
        
        sig_table = Table(sig_data, colWidths=[1.5*inch, 2.5*inch, 1*inch, 1.5*inch])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Oblique'),  # Italic for metadata
            ('FONTSIZE', (0, -3), (-1, -1), 8),  # Smaller for metadata
        ]))
        story.append(sig_table)
        
        story.append(Spacer(1, 30))
        story.append(Paragraph(
            "<b>THIS ACKNOWLEDGMENT MUST BE RETURNED WITHIN YOUR FIRST FIVE (5) DAYS OF EMPLOYMENT.</b>",
            styles['Normal']
        ))
        story.append(Spacer(1, 20))
        story.append(Paragraph(
            "TO BE RETAINED IN YOUR PERSONNEL FILE",
            styles['Normal']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.read()
    
    def create_weapons_policy_pdf(self, employee_data: Dict[str, Any]) -> bytes:
        """Create weapons policy PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        story = []
        
        story.append(Paragraph("WEAPONS PROHIBITION POLICY", styles['Title']))
        story.append(Spacer(1, 20))
        
        employee_name = f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip()
        story.append(Paragraph(f"Employee: {employee_name}", styles['Normal']))
        story.append(Paragraph(f"Property: {employee_data.get('property_name', 'Hotel Property')}", styles['Normal']))
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", styles['Normal']))
        story.append(Spacer(1, 30))
        
        story.append(Paragraph(
            "The Company strictly forbids any employee to possess, concealed, or otherwise, any weapon on their person "
            "while on the Hotel premises. This includes but is not limited to fire arms, knives, etc and regardless of "
            "whether an Employee possesses any governmental licenses and/or approvals. The Company also forbids brandishing "
            "firearms in the parking lot (other than for lawful self-defense) and prohibiting threats or threatening "
            "behavior of any type. Violation of this policy may lead to disciplinary action, up to and including "
            "termination of employment.",
            styles['BodyText']
        ))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.read()

# PDF Form Service Instance
pdf_form_service = PDFFormFiller()
