"""
PDF Generation API Endpoints
Provides REST endpoints for generating and managing PDF forms
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from typing import Dict, Any, Optional
import json
import base64
from datetime import datetime
from .pdf_forms import pdf_form_service
from .models import I9PDFGenerationRequest, W4PDFGenerationRequest, I9Section1Data, W4FormData, I9Section2Data
# Note: get_current_user is defined in main_enhanced.py, not auth.py
# For now, we'll comment this out since we're temporarily disabling auth
# from .auth import get_current_user

router = APIRouter(prefix="/api/forms", tags=["PDF Forms"])

@router.get("/test")
async def test_pdf_service():
    """Test endpoint to check PDF service status"""
    try:
        # Test imports
        try:
            import fitz
            pymupdf_status = "Available"
        except ImportError:
            pymupdf_status = "Not available"
        
        # Test file paths
        import os
        i9_path = "/Users/gouthamvemula/onbclaude/onbdev/official-forms/i9-form-latest.pdf"
        w4_path = "/Users/gouthamvemula/onbclaude/onbdev/official-forms/w4-form-latest.pdf"
        
        return {
            "status": "ok",
            "pymupdf": pymupdf_status,
            "i9_form_exists": os.path.exists(i9_path),
            "w4_form_exists": os.path.exists(w4_path),
            "i9_path": i9_path,
            "w4_path": w4_path
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/debug/i9-fields")
async def debug_i9_fields():
    """Debug endpoint to extract all I-9 field names from PDF"""
    try:
        import fitz
        import os
        
        i9_path = "/Users/gouthamvemula/onbclaude/onbdev/official-forms/i9-form-latest.pdf"
        
        if not os.path.exists(i9_path):
            return {"error": f"I-9 PDF not found at {i9_path}"}
        
        doc = fitz.open(i9_path)
        all_fields = {}
        total_fields = 0
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            widgets = page.widgets()
            
            page_fields = []
            for widget in widgets:
                field_info = {
                    'name': widget.field_name,
                    'type': widget.field_type_string,
                    'value': widget.field_value,
                    'rect': [widget.rect.x0, widget.rect.y0, widget.rect.x1, widget.rect.y1]
                }
                page_fields.append(field_info)
                total_fields += 1
            
            all_fields[f'page_{page_num + 1}'] = page_fields
        
        doc.close()
        
        return {
            "status": "success",
            "total_pages": doc.page_count,
            "total_fields": total_fields,
            "fields_by_page": all_fields
        }
        
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.post("/i9/add-signature")
async def add_signature_to_i9(
    form_data: dict
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """🚨 FEDERAL COMPLIANCE: Add digital signature to I-9 PDF"""
    try:
        pdf_data = form_data.get('pdf_data')
        signature = form_data.get('signature')
        signature_type = form_data.get('signature_type', 'employee_i9')
        page_num = form_data.get('page_num', 0)
        
        if not pdf_data or not signature:
            raise HTTPException(status_code=400, detail="PDF data and signature are required")
        
        # Decode base64 PDF data
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Add signature to PDF
        signed_pdf_bytes = pdf_form_service.add_signature_to_pdf(pdf_bytes, signature, signature_type, page_num)
        
        return Response(
            content=signed_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=signed-i9-form.pdf",
                "X-Form-Type": "I-9-Official-USCIS-Signed",
                "X-Signature-Type": signature_type
            }
        )
        
    except Exception as e:
        print(f"🚨 CRITICAL ERROR: I-9 signature addition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding signature to I-9: {str(e)}")

@router.post("/w4/add-signature")
async def add_signature_to_w4(
    form_data: dict
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """🚨 IRS COMPLIANCE: Add digital signature to W-4 PDF"""
    try:
        pdf_data = form_data.get('pdf_data')
        signature = form_data.get('signature')
        signature_type = form_data.get('signature_type', 'employee_w4')
        page_num = form_data.get('page_num', 0)
        
        if not pdf_data or not signature:
            raise HTTPException(status_code=400, detail="PDF data and signature are required")
        
        # Decode base64 PDF data
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Add signature to PDF
        signed_pdf_bytes = pdf_form_service.add_signature_to_pdf(pdf_bytes, signature, signature_type, page_num)
        
        return Response(
            content=signed_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=signed-w4-form.pdf",
                "X-Form-Type": "W-4-Official-IRS-2025-Signed",
                "X-Signature-Type": signature_type
            }
        )
        
    except Exception as e:
        print(f"🚨 CRITICAL ERROR: W-4 signature addition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding signature to W-4: {str(e)}")

@router.post("/health-insurance/add-signature")
async def add_signature_to_health_insurance(
    form_data: dict
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """Add digital signature to Health Insurance PDF"""
    try:
        pdf_data = form_data.get('pdf_data')
        signature = form_data.get('signature')
        signature_type = form_data.get('signature_type', 'employee_health_insurance')
        page_num = form_data.get('page_num', 1)  # Health insurance signature is on page 2 (index 1)
        signature_date = form_data.get('signature_date')  # Date when the form was signed

        if not pdf_data or not signature:
            raise HTTPException(status_code=400, detail="PDF data and signature are required")

        # Decode base64 PDF data
        pdf_bytes = base64.b64decode(pdf_data)

        # Add signature to PDF with date
        signed_pdf_bytes = pdf_form_service.add_signature_to_pdf(pdf_bytes, signature, signature_type, page_num, signature_date)

        return Response(
            content=signed_pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=signed-health-insurance-form.pdf",
                "X-Form-Type": "Health-Insurance-Enrollment-Signed",
                "X-Signature-Type": signature_type
            }
        )

    except Exception as e:
        print(f"🚨 CRITICAL ERROR: Health Insurance signature addition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error adding signature to Health Insurance: {str(e)}")

@router.post("/i9/generate")
async def generate_i9_pdf(
    request: I9PDFGenerationRequest
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """🚨 FEDERAL COMPLIANCE: Generate official I-9 PDF with validated employee data"""
    try:
        # Convert Pydantic models to dictionaries for PDF service
        employee_data = request.employee_data.model_dump()
        employer_data = request.employer_data.model_dump() if request.employer_data else None
        
        # FEDERAL COMPLIANCE: Validate required fields before PDF generation
        required_fields = ['employee_first_name', 'employee_last_name', 'citizenship_status', 
                          'date_of_birth', 'ssn', 'address_street', 'address_city', 'address_state', 'address_zip']
        missing_fields = [field for field in required_fields if not employee_data.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Federal compliance violation: Missing required I-9 fields: {', '.join(missing_fields)}"
            )
        
        # FEDERAL COMPLIANCE: Log PDF generation for audit trail
        print(f"🚨 FEDERAL COMPLIANCE: Generating official I-9 PDF for employee: {employee_data.get('employee_first_name')} {employee_data.get('employee_last_name')}")
        
        # Generate PDF using official template only
        pdf_bytes = pdf_form_service.fill_i9_form(employee_data, employer_data)
        
        # Return PDF as response with compliance headers
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=official-i9-form.pdf",
                "X-Form-Type": "I-9-Official-USCIS",
                "X-Compliance-Required": "true"
            }
        )
        
    except Exception as e:
        print(f"🚨 CRITICAL ERROR: I-9 PDF generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating official I-9 PDF: {str(e)}")

@router.post("/i9/generate-legacy")
async def generate_i9_pdf_legacy(
    form_data: dict
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """Legacy endpoint for I-9 PDF generation (for backward compatibility)"""
    try:
        # Extract employee and employer data from form_data
        employee_data = form_data.get('employee_data', {})
        employer_data = form_data.get('employer_data')
        
        # Generate PDF
        pdf_bytes = pdf_form_service.fill_i9_form(employee_data, employer_data)
        
        # Return PDF as response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=i9-form.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating I-9 PDF: {str(e)}")

@router.post("/w4/generate")
async def generate_w4_pdf(
    request: W4PDFGenerationRequest
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """🚨 IRS COMPLIANCE: Generate official W-4 PDF with validated employee data"""
    try:
        # Convert Pydantic model to dictionary for PDF service
        employee_data = request.employee_data.model_dump()
        
        # IRS COMPLIANCE: Validate required fields before PDF generation
        required_fields = ['first_name', 'last_name', 'ssn', 'address', 'city', 'state', 'zip_code', 'filing_status']
        missing_fields = [field for field in required_fields if not employee_data.get(field)]
        
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"IRS compliance violation: Missing required W-4 fields: {', '.join(missing_fields)}"
            )
        
        # IRS COMPLIANCE: Log PDF generation for audit trail
        print(f"🚨 IRS COMPLIANCE: Generating official W-4 PDF for employee: {employee_data.get('first_name')} {employee_data.get('last_name')}")
        
        # Generate PDF using official IRS template only
        pdf_bytes = pdf_form_service.fill_w4_form(employee_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=official-w4-form.pdf",
                "X-Form-Type": "W-4-Official-IRS-2025",
                "X-Compliance-Required": "true"
            }
        )
        
    except Exception as e:
        print(f"🚨 CRITICAL ERROR: W-4 PDF generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating official W-4 PDF: {str(e)}")

@router.post("/w4/generate-legacy")
async def generate_w4_pdf_legacy(
    form_data: dict
    # Temporarily disable auth for testing: current_user = Depends(get_current_user)
):
    """Legacy endpoint for W-4 PDF generation (for backward compatibility)"""
    try:
        employee_data = form_data.get('employee_data', {})
        
        # Generate PDF
        pdf_bytes = pdf_form_service.fill_w4_form(employee_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=w4-form.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating W-4 PDF: {str(e)}")



@router.post("/i9/manager-complete")
async def complete_i9_section2(
    form_data: dict,
    # Temporarily disable auth: current_user = Depends(get_current_user)
):
    """Manager completes I-9 Section 2 with document verification"""
    try:
        employee_data = form_data.get('employee_data', {})
        employer_data = form_data.get('employer_data', {})
        
        # Ensure employer data includes current date and user info
        employer_data.update({
            'employer_signature_date': datetime.now().isoformat(),
            'employer_name': 'Test Manager',  # current_user.get('name', ''),
            'employer_title': 'Manager',  # current_user.get('title', 'Manager'),
            'business_name': 'Grand Hotel & Resort',  # From your mock data
            'business_address': '123 Hotel Street',
            'business_city': 'City',
            'business_state': 'State',
            'business_zip': '12345'
        })
        
        # Generate complete I-9 PDF with both sections
        pdf_bytes = pdf_form_service.fill_i9_form(employee_data, employer_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=i9-complete.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing I-9: {str(e)}")

@router.post("/package/hr")
async def generate_hr_package(
    package_data: dict,
    # Temporarily disable auth: current_user = Depends(get_current_user)
):
    """Generate complete HR package with all signed forms"""
    try:
        employee_data = package_data.get('employee_data', {})
        forms_data = package_data.get('forms_data', {})
        
        # This would combine all forms into a single PDF package
        # For now, we'll create individual forms and return as separate endpoints
        
        forms_generated = {}
        
        # Generate I-9 if data available
        if forms_data.get('i9_data'):
            i9_pdf = pdf_form_service.fill_i9_form(
                forms_data['i9_data'].get('employee_data', {}),
                forms_data['i9_data'].get('employer_data', {})
            )
            forms_generated['i9'] = base64.b64encode(i9_pdf).decode('utf-8')
        
        # Generate W-4 if data available
        if forms_data.get('w4_data'):
            w4_pdf = pdf_form_service.fill_w4_form(forms_data['w4_data'])
            forms_generated['w4'] = base64.b64encode(w4_pdf).decode('utf-8')
        
        # Generate Health Insurance form if data available
        if forms_data.get('health_insurance_data'):
            health_pdf = pdf_form_service.create_health_insurance_form(forms_data['health_insurance_data'])
            forms_generated['health_insurance'] = base64.b64encode(health_pdf).decode('utf-8')
        
        # Generate Direct Deposit form if data available
        if forms_data.get('direct_deposit_data'):
            deposit_pdf = pdf_form_service.create_direct_deposit_form(forms_data['direct_deposit_data'])
            forms_generated['direct_deposit'] = base64.b64encode(deposit_pdf).decode('utf-8')
        
        return {
            "message": "HR package generated successfully",
            "forms": forms_generated,
            "employee_name": f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating HR package: {str(e)}")

@router.get("/health-insurance/generate")
async def generate_health_insurance_form(
    employee_id: str,
    # Temporarily disable auth: current_user = Depends(get_current_user)
):
    """Generate health insurance enrollment form"""
    try:
        # In a real implementation, you'd fetch employee data from database
        # For now, return a placeholder response
        employee_data = {
            "first_name": "John",
            "last_name": "Doe",
            "ssn": "123-45-6789",
            "email": "john.doe@example.com"
        }
        
        pdf_bytes = pdf_form_service.create_health_insurance_form(employee_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=health-insurance.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating health insurance form: {str(e)}")

@router.get("/direct-deposit/generate")
async def generate_direct_deposit_form(
    employee_id: str,
    # Temporarily disable auth: current_user = Depends(get_current_user)
):
    """Generate direct deposit authorization form"""
    try:
        # In a real implementation, you'd fetch employee data from database
        employee_data = {
            "first_name": "John",
            "last_name": "Doe",
            "ssn": "123-45-6789",
            "email": "john.doe@example.com"
        }
        
        pdf_bytes = pdf_form_service.create_direct_deposit_form(employee_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=direct-deposit.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating direct deposit form: {str(e)}")

@router.post("/validate/i9")
async def validate_i9_data(request: I9PDFGenerationRequest):
    """Validate I-9 form data structure and compliance"""
    try:
        # Validate the data using Pydantic models
        employee_data = request.employee_data
        employer_data = request.employer_data
        
        # Additional business logic validation
        validation_errors = []
        
        # Check citizenship status requirements
        if employee_data.citizenship_status in ['permanent_resident', 'authorized_alien']:
            if not employee_data.uscis_number and not employee_data.i94_admission_number:
                validation_errors.append("USCIS number or I-94 admission number required for this citizenship status")
        
        if employee_data.citizenship_status == 'authorized_alien':
            if not employee_data.work_authorization_expiration:
                validation_errors.append("Work authorization expiration date required for authorized aliens")
        
        # Validate date formats
        try:
            from datetime import datetime
            datetime.strptime(employee_data.date_of_birth, '%Y-%m-%d')
        except ValueError:
            validation_errors.append("Invalid date of birth format (must be YYYY-MM-DD)")
        
        return {
            "status": "valid" if not validation_errors else "invalid",
            "validation_errors": validation_errors,
            "employee_data_summary": {
                "name": f"{employee_data.employee_first_name} {employee_data.employee_last_name}",
                "citizenship_status": employee_data.citizenship_status,
                "fields_provided": len([field for field, value in employee_data.model_dump().items() if value])
            },
            "employer_data_provided": employer_data is not None
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "validation_errors": [f"Data validation failed: {str(e)}"]
        }

@router.post("/validate/w4")
async def validate_w4_data(request: W4PDFGenerationRequest):
    """Validate W-4 form data structure and compliance"""
    try:
        # Validate the data using Pydantic models
        employee_data = request.employee_data
        
        # Additional business logic validation
        validation_errors = []
        
        # Check filing status
        valid_statuses = ["Single", "Married filing jointly", "Head of household"]
        if employee_data.filing_status not in valid_statuses:
            validation_errors.append(f"Invalid filing status. Must be one of: {valid_statuses}")
        
        # Validate numeric fields
        if employee_data.dependents_amount < 0:
            validation_errors.append("Dependents amount cannot be negative")
        
        if employee_data.other_credits < 0:
            validation_errors.append("Other credits amount cannot be negative")
        
        # Check signature
        if not employee_data.signature:
            validation_errors.append("Employee signature is required")
        
        return {
            "status": "valid" if not validation_errors else "invalid",
            "validation_errors": validation_errors,
            "employee_data_summary": {
                "name": f"{employee_data.first_name} {employee_data.last_name}",
                "filing_status": employee_data.filing_status,
                "has_multiple_jobs": employee_data.multiple_jobs_checkbox,
                "total_dependents_credits": employee_data.dependents_amount + employee_data.other_credits,
                "signature_provided": bool(employee_data.signature)
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "validation_errors": [f"Data validation failed: {str(e)}"]
        }