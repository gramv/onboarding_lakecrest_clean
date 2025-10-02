"""
Phase 1: Document Architecture & Official Forms Integration Service

This service handles:
1. Official PDF form integration with proper field mapping
2. Auto-fill compliance with federal restrictions
3. Document separation and individual updates
4. Digital signature embedding with legal compliance
5. Federal compliance validation and deadline tracking
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, timedelta
import uuid
import base64
import io
import json
import os
from pathlib import Path

# Import models
from .models import (
    DocumentCategory, AutoFillPermission, DocumentFieldMapping,
    EmployeeNewHireFormData, I9SupplementAData, I9SupplementBData,
    DirectDepositAuthorizationData, DocumentMetadata, DocumentProcessingStatus,
    I9Section1Data, I9Section2Data, W4FormData, HealthInsuranceElection,
    DigitalSignature, SignatureType, UserRole
)

# Import PDF form service
from .pdf_forms import PDFFormFiller, I9_FORM_FIELDS, W4_FORM_FIELDS

try:
    import fitz  # PyMuPDF for form handling
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

class AutoFillComplianceEngine:
    """Manages auto-fill permissions and federal compliance rules"""
    
    def __init__(self):
        self.compliance_rules = self._initialize_compliance_rules()
    
    def _initialize_compliance_rules(self) -> Dict[DocumentCategory, Dict[str, AutoFillPermission]]:
        """Initialize auto-fill compliance rules for each document type"""
        return {
            # I-9 Section 1: Employee can auto-fill from personal info
            DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY: {
                "employee_last_name": AutoFillPermission.ALLOWED,
                "employee_first_name": AutoFillPermission.ALLOWED,
                "employee_middle_initial": AutoFillPermission.ALLOWED,
                "other_last_names": AutoFillPermission.RESTRICTED,  # Manual verification needed
                "address_street": AutoFillPermission.ALLOWED,
                "address_apt": AutoFillPermission.ALLOWED,
                "address_city": AutoFillPermission.ALLOWED,
                "address_state": AutoFillPermission.ALLOWED,
                "address_zip": AutoFillPermission.ALLOWED,
                "date_of_birth": AutoFillPermission.ALLOWED,
                "ssn": AutoFillPermission.ALLOWED,
                "email": AutoFillPermission.ALLOWED,
                "phone": AutoFillPermission.ALLOWED,
                "citizenship_status": AutoFillPermission.RESTRICTED,  # Employee must select manually
                "uscis_number": AutoFillPermission.PROHIBITED,  # Must be manually entered
                "i94_admission_number": AutoFillPermission.PROHIBITED,
                "passport_number": AutoFillPermission.PROHIBITED,
                "passport_country": AutoFillPermission.PROHIBITED,
                "work_authorization_expiration": AutoFillPermission.PROHIBITED,
                "employee_signature_date": AutoFillPermission.RESTRICTED  # Current date only
            },
            
            # I-9 Supplement A: FEDERAL LAW PROHIBITS AUTO-FILL
            DocumentCategory.I9_SUPPLEMENT_A: {
                # ALL fields prohibited - preparer/translator must fill manually
                "preparer_last_name": AutoFillPermission.PROHIBITED,
                "preparer_first_name": AutoFillPermission.PROHIBITED,
                "preparer_address": AutoFillPermission.PROHIBITED,
                "preparer_city": AutoFillPermission.PROHIBITED,
                "preparer_state": AutoFillPermission.PROHIBITED,
                "preparer_zip_code": AutoFillPermission.PROHIBITED,
                "prepared_section1": AutoFillPermission.PROHIBITED,
                "translated_section1": AutoFillPermission.PROHIBITED,
                "preparer_signature": AutoFillPermission.PROHIBITED,
                "preparer_signature_date": AutoFillPermission.PROHIBITED
            },
            
            # I-9 Supplement B: Manager use only, limited auto-fill
            DocumentCategory.I9_SUPPLEMENT_B: {
                "employee_last_name": AutoFillPermission.ALLOWED,  # From employee record
                "employee_first_name": AutoFillPermission.ALLOWED,
                "employee_middle_initial": AutoFillPermission.ALLOWED,
                "date_of_hire": AutoFillPermission.ALLOWED,  # From employee record
                "date_of_rehire": AutoFillPermission.PROHIBITED,  # Manager provides
                "date_of_termination": AutoFillPermission.PROHIBITED,
                "new_name_last": AutoFillPermission.PROHIBITED,
                "new_name_first": AutoFillPermission.PROHIBITED,
                "reverify_document_title": AutoFillPermission.PROHIBITED,
                "reverify_document_number": AutoFillPermission.PROHIBITED,
                "reverify_expiration_date": AutoFillPermission.PROHIBITED,
                "employer_business_name": AutoFillPermission.ALLOWED,  # From business data
                "employer_name": AutoFillPermission.ALLOWED,  # From manager record
                "employer_title": AutoFillPermission.ALLOWED,
                "employer_signature_date": AutoFillPermission.RESTRICTED  # Current date only
            },
            
            # W-4: Employee can auto-fill personal info
            DocumentCategory.W4_TAX_WITHHOLDING: {
                "first_name": AutoFillPermission.ALLOWED,
                "middle_initial": AutoFillPermission.ALLOWED,
                "last_name": AutoFillPermission.ALLOWED,
                "address": AutoFillPermission.ALLOWED,
                "city": AutoFillPermission.ALLOWED,
                "state": AutoFillPermission.ALLOWED,
                "zip_code": AutoFillPermission.ALLOWED,
                "ssn": AutoFillPermission.ALLOWED,
                "filing_status": AutoFillPermission.PROHIBITED,  # Employee must select
                "multiple_jobs_checkbox": AutoFillPermission.PROHIBITED,
                "spouse_works_checkbox": AutoFillPermission.PROHIBITED,
                "dependents_amount": AutoFillPermission.PROHIBITED,
                "other_credits": AutoFillPermission.PROHIBITED,
                "other_income": AutoFillPermission.PROHIBITED,
                "deductions": AutoFillPermission.PROHIBITED,
                "extra_withholding": AutoFillPermission.PROHIBITED,
                "signature_date": AutoFillPermission.RESTRICTED  # Current date only
            },
            
            # Direct Deposit: Employee info auto-fill, banking info manual
            DocumentCategory.DIRECT_DEPOSIT_AUTH: {
                "employee_name": AutoFillPermission.ALLOWED,
                "employee_ssn": AutoFillPermission.ALLOWED,
                "employee_email": AutoFillPermission.ALLOWED,
                "employee_address": AutoFillPermission.ALLOWED,
                "bank_name": AutoFillPermission.PROHIBITED,  # Security requirement
                "bank_address": AutoFillPermission.PROHIBITED,
                "routing_number": AutoFillPermission.PROHIBITED,
                "account_number": AutoFillPermission.PROHIBITED,
                "account_type": AutoFillPermission.PROHIBITED,
                "deposit_type": AutoFillPermission.RESTRICTED,  # Default to "full"
                "employee_signature_date": AutoFillPermission.RESTRICTED
            },
            
            # Employee New Hire Form: Manager fills, employee info auto-fill
            DocumentCategory.EMPLOYEE_NEW_HIRE_FORM: {
                "employee_name": AutoFillPermission.ALLOWED,  # From application
                "position_title": AutoFillPermission.ALLOWED,
                "department": AutoFillPermission.ALLOWED,
                "hire_date": AutoFillPermission.RESTRICTED,  # Manager sets
                "start_date": AutoFillPermission.RESTRICTED,
                "employment_type": AutoFillPermission.RESTRICTED,
                "pay_rate": AutoFillPermission.PROHIBITED,  # Manager must set
                "work_schedule": AutoFillPermission.PROHIBITED,
                "supervisor_name": AutoFillPermission.ALLOWED,  # From manager record
                "manager_name": AutoFillPermission.ALLOWED,
                "manager_signature_date": AutoFillPermission.RESTRICTED
            }
        }
    
    def check_auto_fill_permission(self, document_category: DocumentCategory, field_name: str) -> AutoFillPermission:
        """Check if a field can be auto-filled for a specific document type"""
        return self.compliance_rules.get(document_category, {}).get(field_name, AutoFillPermission.PROHIBITED)
    
    def get_restricted_fields(self, document_category: DocumentCategory) -> List[str]:
        """Get list of fields that cannot be auto-filled for a document type"""
        rules = self.compliance_rules.get(document_category, {})
        return [field for field, permission in rules.items() if permission == AutoFillPermission.PROHIBITED]
    
    def validate_auto_fill_compliance(self, document_category: DocumentCategory, form_data: Dict[str, Any], auto_filled_fields: List[str]) -> Tuple[bool, List[str]]:
        """Validate that auto-filled fields comply with federal restrictions"""
        violations = []
        
        for field_name in auto_filled_fields:
            permission = self.check_auto_fill_permission(document_category, field_name)
            
            if permission == AutoFillPermission.PROHIBITED:
                violations.append(f"FEDERAL COMPLIANCE VIOLATION: Field '{field_name}' cannot be auto-filled for {document_category.value}")
            elif permission == AutoFillPermission.RESTRICTED:
                # Additional validation for restricted fields
                if document_category == DocumentCategory.I9_SUPPLEMENT_A:
                    violations.append(f"FEDERAL LAW VIOLATION: I-9 Supplement A field '{field_name}' must be manually completed by preparer/translator")
        
        return len(violations) == 0, violations

class DocumentArchitectureService:
    """Main service for document architecture and official forms integration"""
    
    def __init__(self):
        self.pdf_form_filler = PDFFormFiller()
        self.auto_fill_engine = AutoFillComplianceEngine()
        self.official_templates_path = Path("/Users/gouthamvemula/onbclaude/onbdev/official-forms")
        
        # Document type to template mapping
        self.template_mapping = {
            DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY: "i9-form-latest.pdf",
            DocumentCategory.W4_TAX_WITHHOLDING: "w4-form-latest.pdf"
        }
        
        # Initialize field mappings for each document type
        self.field_mappings = self._initialize_field_mappings()
    
    def _initialize_field_mappings(self) -> Dict[DocumentCategory, List[DocumentFieldMapping]]:
        """Initialize field mappings for each document category"""
        mappings = {}
        
        # I-9 Form field mappings
        i9_mappings = []
        for field_name, pdf_field in I9_FORM_FIELDS.items():
            permission = self.auto_fill_engine.check_auto_fill_permission(
                DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY, field_name
            )
            mapping = DocumentFieldMapping(
                field_name=field_name,
                pdf_field_name=pdf_field,
                auto_fill_permission=permission,
                data_source="personal_info" if permission == AutoFillPermission.ALLOWED else None,
                validation_required=True,
                legal_requirement="Immigration and Nationality Act Section 274A"
            )
            i9_mappings.append(mapping)
        
        mappings[DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY] = i9_mappings
        
        # W-4 Form field mappings
        w4_mappings = []
        for field_name, pdf_field in W4_FORM_FIELDS.items():
            permission = self.auto_fill_engine.check_auto_fill_permission(
                DocumentCategory.W4_TAX_WITHHOLDING, field_name
            )
            mapping = DocumentFieldMapping(
                field_name=field_name,
                pdf_field_name=pdf_field,
                auto_fill_permission=permission,
                data_source="personal_info" if permission == AutoFillPermission.ALLOWED else None,
                validation_required=True,
                legal_requirement="Internal Revenue Code Section 3402"
            )
            w4_mappings.append(mapping)
        
        mappings[DocumentCategory.W4_TAX_WITHHOLDING] = w4_mappings
        
        return mappings
    
    def create_document_metadata(self, document_category: DocumentCategory, created_by: str) -> DocumentMetadata:
        """Create metadata for a new document"""
        document_id = str(uuid.uuid4())
        
        # Get field mappings for this document type
        field_mappings = self.field_mappings.get(document_category, [])
        restricted_fields = self.auto_fill_engine.get_restricted_fields(document_category)
        
        # Set compliance requirements based on document type
        federal_compliance_required = document_category in [
            DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY,
            DocumentCategory.I9_SUPPLEMENT_A,
            DocumentCategory.I9_SUPPLEMENT_B,
            DocumentCategory.W4_TAX_WITHHOLDING
        ]
        
        # Set retention requirements
        retention_years = 7 if document_category.value.startswith("i9") else 4  # I-9: 7 years, W-4: 4 years
        
        # Set approval requirements
        requires_manager_approval = document_category in [
            DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY,
            DocumentCategory.W4_TAX_WITHHOLDING,
            DocumentCategory.DIRECT_DEPOSIT_AUTH
        ]
        
        metadata = DocumentMetadata(
            document_id=document_id,
            document_category=document_category,
            auto_fill_fields=field_mappings,
            restricted_fields=restricted_fields,
            federal_compliance_required=federal_compliance_required,
            legal_retention_years=retention_years,
            creation_timestamp=datetime.now(),
            requires_manager_approval=requires_manager_approval,
            requires_hr_approval=False,  # HR can review but not required
            created_by=created_by
        )
        
        return metadata
    
    def generate_pdf_with_auto_fill(self, document_category: DocumentCategory, form_data: Dict[str, Any], employee_data: Dict[str, Any], user_role: UserRole) -> Tuple[bytes, List[str], List[str]]:
        """Generate PDF with auto-fill compliance validation"""
        warnings = []
        errors = []
        
        # Determine what fields can be auto-filled based on document type and user role
        auto_filled_fields = []
        final_form_data = form_data.copy()
        
        # Apply auto-fill based on compliance rules
        if document_category == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            # Auto-fill personal information for I-9 Section 1
            auto_fill_data = self._get_i9_auto_fill_data(employee_data)
            for field_name, value in auto_fill_data.items():
                permission = self.auto_fill_engine.check_auto_fill_permission(document_category, field_name)
                if permission == AutoFillPermission.ALLOWED and field_name not in form_data:
                    final_form_data[field_name] = value
                    auto_filled_fields.append(field_name)
                elif permission == AutoFillPermission.PROHIBITED and field_name in form_data:
                    warnings.append(f"Field '{field_name}' should be manually verified for compliance")
        
        elif document_category == DocumentCategory.W4_TAX_WITHHOLDING:
            # Auto-fill personal information for W-4
            auto_fill_data = self._get_w4_auto_fill_data(employee_data)
            for field_name, value in auto_fill_data.items():
                permission = self.auto_fill_engine.check_auto_fill_permission(document_category, field_name)
                if permission == AutoFillPermission.ALLOWED and field_name not in form_data:
                    final_form_data[field_name] = value
                    auto_filled_fields.append(field_name)
        
        elif document_category == DocumentCategory.I9_SUPPLEMENT_A:
            # CRITICAL: No auto-fill allowed for Supplement A
            if auto_filled_fields:
                errors.append("FEDERAL COMPLIANCE VIOLATION: I-9 Supplement A cannot have any auto-filled fields")
                return b"", warnings, errors
            warnings.append("I-9 Supplement A must be completed manually by preparer/translator")
        
        # Validate auto-fill compliance
        is_compliant, violations = self.auto_fill_engine.validate_auto_fill_compliance(
            document_category, final_form_data, auto_filled_fields
        )
        
        if not is_compliant:
            errors.extend(violations)
            return b"", warnings, errors
        
        # Generate PDF based on document type
        try:
            if document_category == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
                # Generate I-9 form
                i9_data = I9Section1Data(**final_form_data)
                pdf_bytes = self.pdf_form_filler.fill_i9_form(final_form_data)
                
            elif document_category == DocumentCategory.W4_TAX_WITHHOLDING:
                # Generate W-4 form
                w4_data = W4FormData(**final_form_data)
                pdf_bytes = self.pdf_form_filler.fill_w4_form(final_form_data)
                
            elif document_category == DocumentCategory.DIRECT_DEPOSIT_AUTH:
                # Generate custom direct deposit form
                pdf_bytes = self.pdf_form_filler.create_direct_deposit_form(final_form_data)
                
            elif document_category == DocumentCategory.HEALTH_INSURANCE_ENROLLMENT:
                # Generate health insurance form
                pdf_bytes = self.pdf_form_filler.create_health_insurance_form(final_form_data)
                
            else:
                # Create generic form for other document types
                pdf_bytes = self._create_generic_form(document_category, final_form_data)
            
            return pdf_bytes, warnings, errors
            
        except Exception as e:
            errors.append(f"PDF generation error: {str(e)}")
            return b"", warnings, errors
    
    def _get_i9_auto_fill_data(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get auto-fill data for I-9 form from employee personal information"""
        auto_fill_data = {}
        
        # Map employee data to I-9 fields (only allowed fields)
        field_mapping = {
            "employee_last_name": employee_data.get("last_name", ""),
            "employee_first_name": employee_data.get("first_name", ""),
            "employee_middle_initial": employee_data.get("middle_initial", ""),
            "address_street": employee_data.get("address", ""),
            "address_apt": employee_data.get("apt_number", ""),
            "address_city": employee_data.get("city", ""),
            "address_state": employee_data.get("state", ""),
            "address_zip": employee_data.get("zip_code", ""),
            "date_of_birth": employee_data.get("date_of_birth", ""),
            "ssn": employee_data.get("ssn", ""),
            "email": employee_data.get("email", ""),
            "phone": employee_data.get("phone", "")
        }
        
        # Only include fields that are allowed to be auto-filled
        for field_name, value in field_mapping.items():
            permission = self.auto_fill_engine.check_auto_fill_permission(
                DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY, field_name
            )
            if permission == AutoFillPermission.ALLOWED and value:
                auto_fill_data[field_name] = value
        
        return auto_fill_data
    
    def _get_w4_auto_fill_data(self, employee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get auto-fill data for W-4 form from employee personal information"""
        auto_fill_data = {}
        
        # Map employee data to W-4 fields (only allowed fields)
        field_mapping = {
            "first_name": employee_data.get("first_name", ""),
            "middle_initial": employee_data.get("middle_initial", ""),
            "last_name": employee_data.get("last_name", ""),
            "address": employee_data.get("address", ""),
            "city": employee_data.get("city", ""),
            "state": employee_data.get("state", ""),
            "zip_code": employee_data.get("zip_code", ""),
            "ssn": employee_data.get("ssn", "")
        }
        
        # Only include fields that are allowed to be auto-filled
        for field_name, value in field_mapping.items():
            permission = self.auto_fill_engine.check_auto_fill_permission(
                DocumentCategory.W4_TAX_WITHHOLDING, field_name
            )
            if permission == AutoFillPermission.ALLOWED and value:
                auto_fill_data[field_name] = value
        
        return auto_fill_data
    
    def _create_generic_form(self, document_category: DocumentCategory, form_data: Dict[str, Any]) -> bytes:
        """Create a generic form for document types without specific templates"""
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Title
        title = document_category.value.replace("_", " ").title()
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, title)
        
        # Form fields
        c.setFont("Helvetica", 12)
        y_position = 700
        
        for field_name, value in form_data.items():
            if isinstance(value, bool):
                value_str = "Yes" if value else "No"
            else:
                value_str = str(value)
            
            c.drawString(100, y_position, f"{field_name.replace('_', ' ').title()}: {value_str}")
            y_position -= 25
            
            if y_position < 100:  # Start new page
                c.showPage()
                y_position = 750
        
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    def add_digital_signature(self, pdf_bytes: bytes, signature_data: DigitalSignature, document_category: DocumentCategory) -> bytes:
        """Add digital signature with legal compliance metadata"""
        try:
            return self.pdf_form_filler.add_signature_to_pdf(
                pdf_bytes=pdf_bytes,
                signature_data=signature_data.signature_data,
                signature_type=signature_data.signature_type.value
            )
        except Exception as e:
            print(f"Error adding digital signature: {e}")
            return pdf_bytes
    
    def validate_i9_three_day_rule(self, hire_date: date, section2_completion_date: Optional[date] = None) -> Tuple[bool, Optional[date], List[str]]:
        """Validate I-9 Section 2 three-day rule compliance"""
        warnings = []
        
        # Calculate deadline (3 business days after hire date)
        deadline = self._calculate_business_days(hire_date, 3)
        
        if section2_completion_date is None:
            # Not yet completed
            if date.today() > deadline:
                warnings.append(f"FEDERAL COMPLIANCE VIOLATION: I-9 Section 2 deadline ({deadline}) has passed")
                return False, deadline, warnings
            elif date.today() == deadline:
                warnings.append(f"URGENT: I-9 Section 2 must be completed today ({deadline})")
            
            return True, deadline, warnings
        
        # Check if completed on time
        if section2_completion_date > deadline:
            warnings.append(f"FEDERAL COMPLIANCE VIOLATION: I-9 Section 2 completed late ({section2_completion_date} > {deadline})")
            return False, deadline, warnings
        
        return True, deadline, warnings
    
    def _calculate_business_days(self, start_date: date, business_days: int) -> date:
        """Calculate business days from start date (excluding weekends)"""
        current_date = start_date
        days_added = 0
        
        while days_added < business_days:
            current_date += timedelta(days=1)
            # Skip weekends (Saturday = 5, Sunday = 6)
            if current_date.weekday() < 5:
                days_added += 1
        
        return current_date
    
    def create_processing_status(self, document_id: str, document_category: DocumentCategory) -> DocumentProcessingStatus:
        """Create initial processing status for a document"""
        processing_status = DocumentProcessingStatus(
            document_id=document_id,
            processing_stage="received",
            received_at=datetime.now()
        )
        
        # Set I-9 three-day deadline if applicable
        if document_category == DocumentCategory.I9_EMPLOYMENT_ELIGIBILITY:
            # This would be set when the employee starts work
            processing_status.i9_three_day_deadline = None  # Set when hire date is known
        
        return processing_status
    
    def get_document_template_path(self, document_category: DocumentCategory) -> Optional[str]:
        """Get the path to the official template for a document category"""
        template_filename = self.template_mapping.get(document_category)
        if template_filename:
            template_path = self.official_templates_path / template_filename
            if template_path.exists():
                return str(template_path)
        return None
    
    def validate_template_integrity(self, document_category: DocumentCategory) -> Tuple[bool, List[str]]:
        """Validate that the official PDF template is available and valid"""
        errors = []
        
        template_path = self.get_document_template_path(document_category)
        if not template_path:
            errors.append(f"Official template not found for {document_category.value}")
            return False, errors
        
        if not os.path.exists(template_path):
            errors.append(f"Template file does not exist: {template_path}")
            return False, errors
        
        # Validate PDF can be opened
        if HAS_PYMUPDF:
            try:
                doc = fitz.open(template_path)
                # Check if it has form fields
                has_form_fields = False
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    if len(page.widgets()) > 0:
                        has_form_fields = True
                        break
                doc.close()
                
                if not has_form_fields:
                    errors.append(f"Template has no form fields: {template_path}")
                    return False, errors
                    
            except Exception as e:
                errors.append(f"Cannot open template: {e}")
                return False, errors
        
        return True, errors

# Create service instance
document_service = DocumentArchitectureService()