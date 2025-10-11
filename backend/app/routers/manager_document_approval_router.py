"""
Manager Document Approval Router
Handles sequential document review and approval workflow
"""
import base64
import io
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from PyPDF2 import PdfReader, PdfWriter

from app.dependencies import get_current_user
from app.document_path_utils import document_path_manager
from app.models import User
from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.pdf_forms import PDFFormFiller
from app.generators.new_hire_summary_pdf import NewHireSummaryPDFGenerator
from app.services.employee_data_service import get_employee_data_service
from app.services.document_merger_service import DocumentMergerService

logger = logging.getLogger(__name__)

# Get supabase service
supabase_service = get_enhanced_supabase_service()

router = APIRouter(
    prefix="/api/manager/review/employees",
    tags=["manager-document-approval"]
)

# Document workflow order
DOCUMENT_WORKFLOW = [
    {
        "order": 1,
        "type": "new_hire_summary",
        "name": "New Hire Summary",
        "path": "forms/new_hire_summary"
    },
    {
        "order": 2,
        "type": "company_policies",
        "name": "Company Policies Acknowledgment",
        "path": "forms/company_policies"
    },
    {
        "order": 3,
        "type": "i9",
        "name": "I-9 Employment Eligibility Verification",
        "path": "forms/i9_form",
        "upload_path": "uploads/i9_verification"
    },
    {
        "order": 4,
        "type": "w4",
        "name": "W-4 Federal Tax Withholding",
        "path": "forms/w4_form",
        "upload_path": "uploads/i9_verification/ssn_card"
    },
    {
        "order": 5,
        "type": "direct_deposit",
        "name": "Direct Deposit Authorization",
        "path": "forms/direct_deposit"
    },
    {
        "order": 6,
        "type": "health_insurance",
        "name": "Health Insurance Enrollment",
        "path": "forms/health_insurance"
    }
]


def _normalize_storage_list(
    bucket: str,
    path: str,
    response: Any
) -> List[Dict[str, Any]]:
    """Normalize Supabase storage list responses to a list of file dicts."""
    if isinstance(response, dict):
        error = response.get('error')
        if error:
            logger.warning(
                "Supabase storage list error for bucket=%s path=%s: %s",
                bucket,
                path,
                error
            )
            return []
        data = response.get('data')
        return data or []
    return response or []


def _entry_value(entry: Any, key: str):
    if isinstance(entry, dict):
        return entry.get(key)
    return getattr(entry, key, None)


def _entry_name(entry: Any) -> Optional[str]:
    value = _entry_value(entry, 'name')
    return value if isinstance(value, str) else None


def _format_phone_number(phone: Optional[str]) -> str:
    if not phone:
        return ""
    digits = ''.join(filter(str.isdigit, phone))
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits.startswith('1'):
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    return phone


def _format_currency(value: Optional[Any]) -> str:
    if value is None or value == "":
        return ""
    try:
        amount = float(value)
        return f"${amount:,.2f}"
    except (ValueError, TypeError):
        return str(value)


def _format_date(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        if 'T' in value:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        else:
            dt = datetime.strptime(value, "%Y-%m-%d")
        return dt.strftime("%m/%d/%Y")
    except Exception:
        return value


def _build_address_block(address1: Optional[str], address2: Optional[str], city: Optional[str], state: Optional[str], zip_code: Optional[str]) -> str:
    parts: List[str] = []
    if address1:
        parts.append(address1)
    if address2:
        parts.append(address2)
    city_state_zip = " ".join(filter(None, [city, state, zip_code]))
    if city_state_zip:
        parts.append(city_state_zip)
    return "\n".join(parts)


def _format_ssn(ssn: Optional[str]) -> str:
    if not ssn:
        return ""
    digits = ''.join(filter(str.isdigit, ssn))
    if len(digits) == 9:
        return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"
    return ssn


def _infer_health_selections(health_data: Dict[str, Any]) -> List[str]:
    selections: List[str] = []
    if not health_data:
        return selections

    # Check if insurance was waived/declined
    is_waived = health_data.get("isWaived") or health_data.get("is_waived") or health_data.get("waived")
    if is_waived:
        # Return special "declined" option
        return ["insurance_declined"]

    possible_values: List[str] = []

    for key in ("selectedPlan", "selected_plan", "medicalPlan", "medical_plan", "planChoice", "plan_choice"):
        value = health_data.get(key)
        if isinstance(value, str):
            possible_values.append(value)

    list_fields = [
        "selectedPlans",
        "planSelections",
        "plan_selections",
        "plans",
    ]
    for key in list_fields:
        value = health_data.get(key)
        if isinstance(value, list):
            possible_values.extend(str(item) for item in value)

    joined_text = " ".join(possible_values).lower()
    if "hra" in joined_text and "base" in joined_text:
        selections.append("uhc_hra_base")
    if "hra" in joined_text and ("buy" in joined_text or "buy-up" in joined_text or "buyup" in joined_text):
        selections.append("uhc_hra_buy_up")
    if "minimum" in joined_text and "essential" in joined_text:
        selections.append("cwi_minimum_essential")
    if "minimum" in joined_text and "indemnity" in joined_text:
        selections.append("cwi_minimum_indemnity")

    if health_data.get("dentalCoverage") or health_data.get("dental_coverage"):
        selections.append("uhc_dental")
    if health_data.get("visionCoverage") or health_data.get("vision_coverage"):
        selections.append("uhc_vision")

    # Ensure uniqueness while preserving order
    seen = set()
    ordered: List[str] = []
    for item in selections:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered

class ApproveDocumentRequest(BaseModel):
    form_data: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None  # Base64 encoded signature image
    notes: Optional[str] = None


class RejectDocumentRequest(BaseModel):
    reason: str


class EmployerSignature(BaseModel):
    dataUrl: str
    timestamp: Optional[str] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None


class CompleteI9Request(BaseModel):
    firstDayOfEmployment: str
    employerName: str
    employerTitle: str
    businessName: str
    businessAddress: str
    city: str
    state: str
    zipCode: str
    signature: EmployerSignature
    signatureDate: Optional[str] = None
    additionalInfo: Optional[str] = None
    updateEmployerProfile: bool = False


class CompleteW4Request(BaseModel):
    """Request model for completing W-4 with employer information"""
    employerName: str
    employerAddress: str
    employerEIN: str
    firstDayOfEmployment: Optional[str] = None  # Optional - may not be set yet
    signature: Optional[EmployerSignature] = None  # Optional - not required by IRS
    ssnVerified: bool
    notes: Optional[str] = None


class CompleteHealthInsuranceRequest(BaseModel):
    """Request model for completing Health Insurance with employer information"""
    propertyName: str
    deadlineToSubmit: str
    reasonForRequest: str  # "new_hire", "open_enrollment", or "qualifying_event"
    dateOfHire: Optional[str] = None
    qualifyingEventDescription: Optional[str] = None
    notes: Optional[str] = None


class NewHireSummaryRequest(BaseModel):
    hotelName: Optional[str] = None
    hotelAddress: Optional[str] = None
    hotelCity: Optional[str] = None
    hotelState: Optional[str] = None
    hotelZipCode: Optional[str] = None
    stateOfEmployment: Optional[str] = None
    employeeFirstName: Optional[str] = None
    employeeLastName: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    employmentType: Optional[str] = None
    gender: Optional[str] = None
    employeePhone: Optional[str] = None
    employeeEmail: Optional[str] = None
    ssn: Optional[str] = None
    maritalStatus: Optional[str] = None
    dependents: Optional[str] = None
    dateOfBirth: Optional[str] = None
    rateOfPay: Optional[str] = None
    hireDate: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    healthInsuranceSelections: List[str] = []
    healthInsuranceCopay: Optional[str] = None
    notes: Optional[str] = None


class CompleteReviewRequest(BaseModel):
    """Request model for completing manager review and activating employee"""
    startDate: str  # ISO format: "2025-10-07"
    startTime: str = "9:00 AM"
    employeeNumber: str
    dressCode: str = "Business casual"
    parkingDetails: str = "Employee parking available on-site"
    notes: Optional[str] = None


def _coerce_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, dict):
        return value
    if hasattr(value, "dict"):
        return value.dict()  # type: ignore[attr-defined]
    if hasattr(value, "__dict__"):
        return value.__dict__  # type: ignore[attr-defined]
    return {}


@router.get("/{employee_id}/summary")
async def get_new_hire_summary(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Provide auto-filled data for the New Hire Summary step."""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can access summary data")

        try:
            employee_response = supabase_service.admin_client.table('employees') \
                .select('*') \
                .eq('id', employee_id) \
                .single() \
                .execute()
        except Exception as db_exc:
            logger.exception("[SUMMARY] Failed to load employee %s: %s", employee_id, db_exc)
            raise HTTPException(status_code=500, detail="Failed to load summary data")

        employee = employee_response.data if employee_response else None
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        property_id = employee.get('property_id')
        if current_user.role == 'manager' and property_id and current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="You don't have access to this employee")

        employee_data_service = get_employee_data_service(supabase_service)
        try:
            complete_data = await employee_data_service.get_complete_employee_data(
                employee_id,
                include_encrypted=True
            )
        except Exception as data_exc:
            logger.warning("[SUMMARY] Unable to load complete employee data for %s: %s", employee_id, data_exc)
            complete_data = {}

        # Try to get personal info from complete_data first
        personal_info = complete_data.get('personal_info', {}) or {}
        form_data = complete_data.get('form_data', {}) or {}

        # If personal_info is empty or missing key fields, load directly from onboarding_form_data
        if not personal_info or not personal_info.get('firstName'):
            try:
                logger.info(f"[SUMMARY] Loading personal info directly from onboarding_form_data for {employee_id}")
                personal_data_response = supabase_service.admin_client.table('onboarding_form_data') \
                    .select('*') \
                    .eq('employee_id', employee_id) \
                    .eq('step_id', 'personal-info') \
                    .order('created_at', desc=True) \
                    .limit(1) \
                    .execute()

                if personal_data_response and personal_data_response.data:
                    onboarding_form_data = personal_data_response.data[0]['form_data']

                    # Extract personalInfo from the form data
                    if 'personalInfo' in onboarding_form_data:
                        personal_info_raw = onboarding_form_data['personalInfo']
                    else:
                        personal_info_raw = onboarding_form_data

                    # Build personal_info dict with correct structure
                    personal_info = {
                        'firstName': personal_info_raw.get('firstName', ''),
                        'lastName': personal_info_raw.get('lastName', ''),
                        'middleInitial': personal_info_raw.get('middleInitial', ''),
                        'email': personal_info_raw.get('email', ''),
                        'phone': personal_info_raw.get('phone', ''),
                        'dateOfBirth': personal_info_raw.get('dateOfBirth', ''),
                        'ssn': personal_info_raw.get('ssn', ''),
                        'gender': personal_info_raw.get('gender', ''),
                        'maritalStatus': personal_info_raw.get('maritalStatus', ''),
                        'address': {
                            'street': personal_info_raw.get('address', ''),
                            'apt': personal_info_raw.get('aptNumber', ''),
                            'city': personal_info_raw.get('city', ''),
                            'state': personal_info_raw.get('state', ''),
                            'zip': personal_info_raw.get('zipCode', '')
                        }
                    }
                    logger.info(f"[SUMMARY] Successfully loaded personal info from onboarding_form_data")
                else:
                    logger.warning(f"[SUMMARY] No personal-info data found in onboarding_form_data for {employee_id}")
            except Exception as load_exc:
                logger.error(f"[SUMMARY] Failed to load personal info from onboarding_form_data: {load_exc}")

        health_raw = form_data.get('health-insurance')
        health_data = health_raw if isinstance(health_raw, dict) else {}
        w4_raw = form_data.get('w4-form')
        w4_data = w4_raw if isinstance(w4_raw, dict) else {}

        property_dict: Dict[str, Any] = {}
        if property_id:
            try:
                property_obj = await supabase_service.get_property_by_id(property_id)
                property_dict = _coerce_dict(property_obj)
            except Exception as property_err:
                logger.warning("[SUMMARY] Failed to load property %s for employee %s: %s", property_id, employee_id, property_err)
                property_dict = {}

        hotel_name = property_dict.get('name') or property_dict.get('property_name') or ''
        hotel_address1 = property_dict.get('address') or property_dict.get('street_address') or ''
        hotel_address2 = property_dict.get('address_line_2') or property_dict.get('suite_apt') or ''
        hotel_city = property_dict.get('city') or ''
        hotel_state = property_dict.get('state') or ''
        hotel_zip = property_dict.get('zip_code') or property_dict.get('postal_code') or ''

        hotel_address_block_parts = []
        if hotel_name:
            hotel_address_block_parts.append(hotel_name)
        address_block = _build_address_block(hotel_address1, hotel_address2, hotel_city, hotel_state, hotel_zip)
        if address_block:
            hotel_address_block_parts.append(address_block)
        hotel_address_block = "\n".join(hotel_address_block_parts)

        dependents_summary = ''
        health_dependents = health_data.get('dependents')
        if isinstance(health_dependents, list) and health_dependents:
            names = [dep.get('name') for dep in health_dependents if isinstance(dep, dict) and dep.get('name')]
            if names:
                dependents_summary = ', '.join(names)
            else:
                dependents_summary = str(len(health_dependents))
        elif isinstance(w4_data.get('dependents'), (int, float, str)):
            dependents_summary = str(w4_data.get('dependents'))
        elif w4_data.get('qualifyingChildrenUnder17') or w4_data.get('otherDependents'):  # type: ignore[attr-defined]
            numbers = [w4_data.get('qualifyingChildrenUnder17'), w4_data.get('otherDependents')]
            dependents_summary = ", ".join(str(n) for n in numbers if n not in (None, ''))

        employment_type = employee.get('employment_type') or ''
        if employment_type:
            employment_type = employment_type.replace('_', ' ').replace('-', ' ').title()

        # Extract address fields from personal_info
        # Note: get_complete_employee_data() returns address as a dict with keys: street, apt, city, state, zip
        address_dict = personal_info.get('address', {}) or {}
        employee_address1 = address_dict.get('street', '') or ''
        employee_address2 = address_dict.get('apt', '') or ''
        employee_city = address_dict.get('city', '') or ''
        employee_state = address_dict.get('state', '') or ''
        employee_zip = address_dict.get('zip', '') or ''

        # Try to get pay rate and hire date from job application if not in employee record
        pay_rate = employee.get('pay_rate')
        hire_date = employee.get('start_date') or employee.get('hire_date')

        # If not in employee record, try to get from job application
        if not pay_rate or not hire_date:
            application_id = employee.get('application_id')
            if application_id:
                try:
                    app_response = supabase_service.admin_client.table('job_applications') \
                        .select('applicant_data') \
                        .eq('id', application_id) \
                        .single() \
                        .execute()
                    if app_response and app_response.data:
                        applicant_data = app_response.data.get('applicant_data', {})
                        if not pay_rate:
                            pay_rate = applicant_data.get('salary_desired') or applicant_data.get('pay_rate')
                        if not hire_date:
                            hire_date = applicant_data.get('start_date')
                except Exception as app_exc:
                    logger.warning("[SUMMARY] Failed to load job application for employee %s: %s", employee_id, app_exc)

        summary_defaults: Dict[str, Any] = {
            "hotelName": hotel_name,
            "hotelAddress": hotel_address1,
            "hotelCity": hotel_city,
            "hotelState": hotel_state,
            "hotelZipCode": hotel_zip,
            "stateOfEmployment": hotel_state or employee.get('state_of_employment'),
            "employeeFirstName": personal_info.get('firstName') or personal_info.get('first_name'),
            "employeeLastName": personal_info.get('lastName') or personal_info.get('last_name'),
            "address1": employee_address1,
            "address2": employee_address2,
            "city": employee_city,
            "state": employee_state,
            "zipCode": employee_zip,
            "employmentType": employment_type,
            "gender": personal_info.get('gender'),
            "employeePhone": _format_phone_number(personal_info.get('phone')),
            "employeeEmail": personal_info.get('email'),
            "ssn": _format_ssn(personal_info.get('ssn')),
            "maritalStatus": personal_info.get('maritalStatus'),
            "dependents": dependents_summary,
            "dateOfBirth": _format_date(personal_info.get('dateOfBirth')),
            "rateOfPay": _format_currency(pay_rate),
            "hireDate": _format_date(hire_date),
            "department": employee.get('department'),
            "position": employee.get('position'),
            "healthInsuranceSelections": _infer_health_selections(health_data),
            "healthInsuranceCopay": _format_currency(
                health_data.get('paycheckContribution')
                or health_data.get('employeeContribution')
                or health_data.get('perPayPeriod')
                or health_data.get('contributionPerPayPeriod')
                or health_data.get('employeeCostPerPay')
            )
        }

        summary_defaults["hotelAddressBlock"] = hotel_address_block
        summary_defaults["employeeAddressBlock"] = _build_address_block(
            summary_defaults.get('address1'),
            summary_defaults.get('address2'),
            summary_defaults.get('city'),
            summary_defaults.get('state'),
            summary_defaults.get('zipCode'),
        )

        approval_record = supabase_service.admin_client.table('document_approvals') \
            .select('*') \
            .eq('employee_id', employee_id) \
            .eq('document_type', 'new_hire_summary') \
            .limit(1) \
            .execute()

        approval_data = approval_record.data[0] if approval_record and approval_record.data else None
        if approval_data:
            existing_form_data = approval_data.get('form_data')
            if isinstance(existing_form_data, str):
                try:
                    existing_form_data = json.loads(existing_form_data)
                except json.JSONDecodeError:
                    existing_form_data = None
            if isinstance(existing_form_data, dict):
                summary_defaults.update(existing_form_data)

        pdf_record = await supabase_service.get_latest_signed_document_record(employee_id, 'new_hire_summary')
        pdf_url = None
        if pdf_record:
            metadata = pdf_record.get('metadata') or {}
            path = metadata.get('path')
            bucket = metadata.get('bucket') or 'onboarding-documents'
            if path:
                signed = supabase_service.create_signed_document_url(bucket=bucket, path=path, expires_in_seconds=3600)
                if signed:
                    pdf_url = signed.get('signed_url')
            if not pdf_url:
                pdf_url = pdf_record.get('pdf_url')

        uploaded_documents: List[Dict[str, Any]] = []
        if property_id:
            try:
                sanitized_property = await document_path_manager.get_property_name(property_id)
                sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)
                bucket_name = 'onboarding-documents'
                base_path = f"{sanitized_property}/{sanitized_employee}"
                upload_path = f"{base_path}/uploads/i9_verification"

                storage_accessor = supabase_service.admin_client
                folders = storage_accessor.storage.from_(bucket_name).list(upload_path)
                folders = _normalize_storage_list(bucket_name, upload_path, folders)

                for folder in folders or []:
                    folder_name = _entry_name(folder)
                    if not folder_name:
                        continue
                    folder_path = f"{upload_path}/{folder_name}"
                    try:
                        files = storage_accessor.storage.from_(bucket_name).list(folder_path)
                        files = _normalize_storage_list(bucket_name, folder_path, files)
                        for file in files or []:
                            file_name = _entry_name(file)
                            if not file_name:
                                continue
                            signed = storage_accessor.storage.from_(bucket_name).create_signed_url(
                                f"{folder_path}/{file_name}",
                                3600
                            )
                            file_url = signed.get('signedURL') if isinstance(signed, dict) else signed
                            uploaded_documents.append({
                                "id": _entry_value(file, 'id') or str(uuid4()),
                                "document_type": folder_name,
                                "file_name": file_name,
                                "url": file_url
                            })
                    except Exception as upload_err:
                        logger.warning(
                            "[SUMMARY] Failed to list uploaded docs in %s: %s",
                            folder_path,
                            upload_err,
                        )
            except Exception as uploads_err:
                logger.warning("[SUMMARY] Unable to enumerate uploaded documents for %s: %s", employee_id, uploads_err)

        return {
            "success": True,
            "data": {
                "summary": summary_defaults,
                "status": approval_data.get('status') if approval_data else 'pending',
                "pdfUrl": pdf_url,
                "approvedAt": approval_data.get('approved_at') if approval_data else None,
                "approvedBy": approval_data.get('approved_by') if approval_data else None,
                "uploadedDocuments": uploaded_documents,
            }
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to load new hire summary for %s: %s", employee_id, exc)
        raise HTTPException(status_code=500, detail=f"Failed to load summary data: {exc}")


@router.post("/{employee_id}/summary/approve")
async def approve_new_hire_summary(
    employee_id: str,
    payload: NewHireSummaryRequest,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Persist manager reviewed summary, generate PDF, and mark as approved."""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can approve summary")

        employee_response = supabase_service.admin_client.table('employees') \
            .select('*') \
            .eq('id', employee_id) \
            .single() \
            .execute()

        employee = employee_response.data if employee_response else None
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        property_id = employee.get('property_id')
        if current_user.role == 'manager' and property_id and current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="You don't have access to this employee")

        summary_data = payload.dict()

        # Derive blocks for PDF rendering
        hotel_address_block = "\n".join(filter(None, [
            summary_data.get('hotelName'),
            _build_address_block(
                summary_data.get('hotelAddress'),
                None,
                summary_data.get('hotelCity'),
                summary_data.get('hotelState'),
                summary_data.get('hotelZipCode'),
            )
        ]))

        employee_address_block = _build_address_block(
            summary_data.get('address1'),
            summary_data.get('address2'),
            summary_data.get('city'),
            summary_data.get('state'),
            summary_data.get('zipCode'),
        )

        pdf_context = {
            "hotelAddressBlock": hotel_address_block,
            "stateOfEmployment": summary_data.get('stateOfEmployment'),
            "employeeFirstName": summary_data.get('employeeFirstName'),
            "employeeLastName": summary_data.get('employeeLastName'),
            "employeeAddressBlock": employee_address_block,
            "employmentType": summary_data.get('employmentType'),
            "gender": summary_data.get('gender'),
            "employeePhone": summary_data.get('employeePhone'),
            "employeeEmail": summary_data.get('employeeEmail'),
            "ssn": summary_data.get('ssn'),
            "maritalStatus": summary_data.get('maritalStatus'),
            "dependents": summary_data.get('dependents'),
            "dateOfBirth": summary_data.get('dateOfBirth'),
            "rateOfPay": summary_data.get('rateOfPay'),
            "hireDate": summary_data.get('hireDate'),
            "department": summary_data.get('department'),
            "position": summary_data.get('position'),
            "healthInsuranceSelections": summary_data.get('healthInsuranceSelections') or [],
            "healthInsuranceCopay": summary_data.get('healthInsuranceCopay'),
        }

        # Generate the new hire summary PDF (page 1 only)
        generator = NewHireSummaryPDFGenerator()
        summary_pdf_bytes = generator.generate(pdf_context)

        # Save ONLY the new hire summary (not merged yet)
        # Merging happens in Step 7 (Complete Onboarding)
        save_result = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='new_hire_summary',
            pdf_bytes=summary_pdf_bytes,
            is_edit=True,
            user_role='manager',
            request=request,
        )

        logger.info(f"[APPROVAL] New hire summary saved: {len(summary_pdf_bytes)} bytes")

        approval_payload = {
            'employee_id': employee_id,
            'document_type': 'new_hire_summary',
            'status': 'approved',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': summary_data.get('notes'),
            'form_data': summary_data,
        }

        supabase_service.admin_client.table('document_approvals') \
            .upsert(approval_payload, on_conflict='employee_id,document_type') \
            .execute()

        logger.info(f"[APPROVAL] New hire summary approved for employee {employee_id}, moving to next step")

        return {
            "success": True,
            "message": "New hire summary approved",
            "pdf": save_result.get('signed_url'),
            "expiresAt": save_result.get('signed_url_expires_at')
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to approve new hire summary for %s: %s", employee_id, exc)
        raise HTTPException(status_code=500, detail="Failed to approve summary")


@router.get("/{employee_id}/documents-status")
async def get_documents_status(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get status of all documents for an employee
    Returns sequential workflow with current step
    """
    try:
        logger.info("[manager-docs-status] manager=%s employee=%s", current_user.id, employee_id)
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access document status"
            )

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access to this employee
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Get document approval status from database
        # Use admin client to bypass RLS since we've already verified manager access
        approvals = supabase_service.admin_client.table('document_approvals')\
            .select('*')\
            .eq('employee_id', employee_id)\
            .execute()

        approval_map = {a['document_type']: a for a in (approvals.data or [])}

        # Build document status list
        documents = []

        # Calculate current step as the first step that's not approved
        current_step = len(DOCUMENT_WORKFLOW) + 1  # Default to after last step if all approved

        logger.info(f"[DEBUG] Approval map: {approval_map}")

        for workflow_step in DOCUMENT_WORKFLOW:
            doc_type = workflow_step['type']
            approval = approval_map.get(doc_type)

            logger.info(f"[DEBUG] Checking step {workflow_step['order']} ({doc_type}): approval={approval}")

            # If this step is not approved, it's the current step
            if not approval or approval.get('status') != 'approved':
                current_step = workflow_step['order']
                logger.info(f"[DEBUG] Found first unapproved step: {current_step} ({doc_type})")
                break

        logger.info(f"[DEBUG] Final current_step: {current_step}")

        for workflow_step in DOCUMENT_WORKFLOW:
            doc_type = workflow_step['type']
            approval = approval_map.get(doc_type)

            # Determine if can review (previous must be approved)
            can_review = workflow_step['order'] == 1
            if workflow_step['order'] > 1:
                prev_step = DOCUMENT_WORKFLOW[workflow_step['order'] - 2]
                prev_approval = approval_map.get(prev_step['type'])
                can_review = prev_approval and prev_approval.get('status') == 'approved'

            # Determine status
            if approval:
                doc_status = approval.get('status', 'pending')
            else:
                doc_status = 'pending'

            documents.append({
                "documentType": doc_type,
                "documentName": workflow_step['name'],
                "status": doc_status,
                "approvedBy": approval.get('approved_by') if approval else None,
                "approvedAt": approval.get('approved_at') if approval else None,
                "notes": approval.get('notes') if approval else None,
                "order": workflow_step['order'],
                "canReview": can_review
            })

        # Calculate overall status
        approved_count = sum(1 for d in documents if d['status'] == 'approved')
        total_count = len(documents)

        if approved_count == 0:
            overall_status = 'not_started'
        elif approved_count == total_count:
            overall_status = 'complete'
        else:
            overall_status = 'in_progress'

        # Get property name
        property_data = supabase_service.client.table('properties')\
            .select('name')\
            .eq('id', property_id)\
            .single()\
            .execute()

        property_name = property_data.data.get('name') if property_data.data else 'Unknown'

        return {
            "employeeId": employee_id,
            "employeeName": f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}".strip(),
            "propertyName": property_name,
            "documents": documents,
            "currentStep": current_step,
            "overallStatus": overall_status,
            "completionPercentage": round((approved_count / total_count) * 100),
            "lastUpdated": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting documents status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get documents status: {str(e)}"
        )


@router.get("/{employee_id}/document/{document_type}")
async def get_document_for_review(
    employee_id: str,
    document_type: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get specific document for review
    Returns PDF URL and any uploaded supporting documents
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access documents"
            )

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Get property name
        property_data = supabase_service.client.table('properties')\
            .select('name')\
            .eq('id', property_id)\
            .single()\
            .execute()

        property_name = property_data.data.get('name') if property_data.data else 'Unknown'

        sanitized_property = await document_path_manager.get_property_name(property_id)
        sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Build storage path
        bucket_name = 'onboarding-documents'
        storage_accessor = supabase_service.admin_client
        base_path = f"{sanitized_property}/{sanitized_employee}"
        relative_path = workflow_step['path']
        doc_path = f"{base_path}/{relative_path}"

        def _list_files(path: str) -> List[Dict[str, Any]]:
            raw = storage_accessor.storage.from_(bucket_name).list(path)
            return _normalize_storage_list(bucket_name, path, raw)

        files = None
        try:
            files = _list_files(doc_path)
            if (not files or len(files) == 0) and document_type == 'i9':
                # Try alternate folder naming without _form suffix
                alt_relative_path = 'forms/i9'
                alt_doc_path = f"{base_path}/{alt_relative_path}"
                alt_files = _list_files(alt_doc_path)
                if alt_files:
                    relative_path = alt_relative_path
                    doc_path = alt_doc_path
                    files = alt_files
        except Exception as storage_err:
            logger.warning(
                "Falling back to legacy storage path for %s/%s (%s): %s",
                property_name,
                employee_id,
                document_type,
                storage_err
            )
            legacy_bucket = 'employee-documents'
            legacy_base = f"{property_name}/{employee_data.get('first_name', '')}_{employee_data.get('last_name', '')}".strip('_')
            base_path = legacy_base
            relative_path = workflow_step['path']
            doc_path = f"{legacy_base}/{relative_path}"
            bucket_name = legacy_bucket
            storage_accessor = supabase_service.client
            raw_files = storage_accessor.storage.from_(legacy_bucket).list(doc_path)
            files = _normalize_storage_list(legacy_bucket, doc_path, raw_files)
            if not files and document_type == 'i9':
                alt_relative_path = 'forms/i9'
                doc_path = f"{legacy_base}/{alt_relative_path}"
                files = _normalize_storage_list(
                    legacy_bucket,
                    doc_path,
                    storage_accessor.storage.from_(legacy_bucket).list(doc_path)
                )

        if not files:
            raise HTTPException(
                status_code=404,
                detail=f"No {document_type} document found for this employee"
            )

        # Get the PDF file (should be only one)
        pdf_file = next((f for f in files if _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
        if not pdf_file:
            raise HTTPException(
                status_code=404,
                detail=f"No PDF found for {document_type}"
            )

        # Generate signed URL for PDF
        pdf_name = _entry_name(pdf_file)
        logger.debug(
            "[manager-docs] generating signed url for bucket=%s path=%s/%s",
            bucket_name,
            doc_path,
            pdf_name
        )
        pdf_url = storage_accessor.storage.from_(bucket_name)\
            .create_signed_url(f"{doc_path}/{pdf_name}", 3600)  # 1 hour

        # Attempt to download + decrypt so managers can preview encrypted PDFs inline
        pdf_base64 = None
        raw_bytes: Optional[bytes] = None
        try:
            raw_bytes = storage_accessor.storage.from_(bucket_name).download(f"{doc_path}/{pdf_name}")
            decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
                raw_bytes,
                document_type=document_type,
                employee_id=employee_id
            )

            if was_encrypted:
                logger.info(
                    "[manager-docs] decrypted PDF for %s (%s): %s bytes → %s bytes",
                    employee_id,
                    document_type,
                    len(raw_bytes),
                    len(decrypted_bytes)
                )
            else:
                logger.debug(
                    "[manager-docs] PDF already plaintext for %s (%s)",
                    employee_id,
                    document_type
                )

            pdf_base64 = base64.b64encode(decrypted_bytes).decode('utf-8')
        except Exception as decrypt_err:
            logger.error(
                "[manager-docs] failed to decrypt PDF %s/%s for %s (%s): %s",
                bucket_name,
                pdf_name,
                employee_id,
                document_type,
                decrypt_err
            )
            # As a fallback, try to return plaintext bytes (legacy unencrypted documents)
            try:
                legacy_source = raw_bytes if raw_bytes is not None else storage_accessor.storage.from_(bucket_name).download(
                    f"{doc_path}/{pdf_name}"
                )
                pdf_base64 = base64.b64encode(legacy_source).decode('utf-8')
                logger.info(
                    "[manager-docs] served legacy plaintext PDF for %s (%s)",
                    employee_id,
                    document_type
                )
            except Exception as legacy_err:
                logger.error(
                    "[manager-docs] failed to fallback to legacy PDF for %s (%s): %s",
                    employee_id,
                    document_type,
                    legacy_err
                )

        result = {
            "pdfUrl": pdf_url['signedURL'],
            "documentType": document_type,
            "documentName": workflow_step['name'],
        }

        if pdf_base64:
            # Provide inline data so the frontend can render encrypted PDFs without another round-trip
            result["pdfData"] = pdf_base64
            result["pdfDataUrl"] = f"data:application/pdf;base64,{pdf_base64}"

        # If document has uploaded supporting docs (like I-9 verification docs)
        if 'upload_path' in workflow_step:
            upload_path = f"{base_path}/{workflow_step['upload_path']}"

            try:
                # List all folders in upload path
                upload_folders = _normalize_storage_list(
                    bucket_name,
                    upload_path,
                    storage_accessor.storage.from_(bucket_name).list(upload_path)
                )

                uploaded_docs = []
                for folder in upload_folders:
                    folder_id = _entry_value(folder, 'id')
                    folder_name = _entry_name(folder)
                    if folder_id and folder_name:  # It's a folder
                        folder_path = f"{upload_path}/{folder_name}"
                        folder_files = _normalize_storage_list(
                            bucket_name,
                            folder_path,
                            storage_accessor.storage.from_(bucket_name).list(folder_path)
                        )

                        for file in folder_files:
                            file_name = _entry_name(file)
                            if file_name and file_name.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                                file_url = storage_accessor.storage.from_(bucket_name)\
                                    .create_signed_url(f"{folder_path}/{file_name}", 3600)

                                uploaded_docs.append({
                                    "type": folder_name,
                                    "url": file_url['signedURL'],
                                    "filename": file_name
                                })

                result["uploadedDocsUrls"] = uploaded_docs
            except Exception as e:
                logger.warning(f"Could not fetch uploaded docs: {e}")
                result["uploadedDocsUrls"] = []

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document for review: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get document: {str(e)}"
        )


@router.get("/{employee_id}/documents/health_insurance/detail")
async def get_health_insurance_detail(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get Health Insurance form detail for manager review
    Returns: PDF URL, employee data, and auto-fill data for employer section
    """
    try:
        logger.info(f"[HEALTH-INSURANCE-DETAIL] Loading for employee: {employee_id}")

        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can access this")

        # Get employee info
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = employee_response.data
        property_id = employee.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get employer profile
        employer_profile = None
        employer_response = supabase_service.admin_client.table('employer_profiles')\
            .select('*')\
            .eq('property_id', property_id)\
            .eq('is_active', True)\
            .execute()

        if employer_response.data and len(employer_response.data) > 0:
            employer_profile = employer_response.data[0]

        # Get property name
        property_name = await document_path_manager.get_property_name(property_id)

        # Get employee folder name
        employee_folder = await document_path_manager.get_employee_folder_name(
            employee_id,
            property_id
        )

        # Construct path to Health Insurance PDF
        base_path = f"{property_name}/{employee_folder}"
        health_insurance_path = f"{base_path}/forms/health_insurance"
        bucket_name = 'onboarding-documents'

        logger.info(f"[HEALTH-INSURANCE-DETAIL] Looking for PDF in: {health_insurance_path}")

        # Get Health Insurance PDF
        health_insurance_pdf_url = None
        try:
            listing = supabase_service.admin_client.storage.from_(bucket_name).list(health_insurance_path)
            listing = _normalize_storage_list(bucket_name, health_insurance_path, listing)

            logger.info(f"[HEALTH-INSURANCE-DETAIL] Found {len(listing or [])} files in {health_insurance_path}")

            # Find the signed Health Insurance PDF
            health_insurance_pdf = next((f for f in listing if _entry_name(f) and 'signed' in _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
            if health_insurance_pdf:
                pdf_name = _entry_name(health_insurance_pdf)
                full_path = f"{health_insurance_path}/{pdf_name}"
                health_insurance_pdf_url = supabase_service.admin_client.storage.from_(bucket_name).create_signed_url(full_path, 3600)
                if isinstance(health_insurance_pdf_url, dict):
                    health_insurance_pdf_url = health_insurance_pdf_url.get('signedURL')
                logger.info(f"[HEALTH-INSURANCE-DETAIL] Found Health Insurance PDF: {full_path}")
            else:
                logger.warning(f"[HEALTH-INSURANCE-DETAIL] No signed Health Insurance PDF found in {health_insurance_path}")
        except Exception as e:
            logger.error(f"[HEALTH-INSURANCE-DETAIL] Failed to load Health Insurance PDF: {e}")

        # Calculate deadline (30 days from hire date)
        from datetime import datetime, timedelta
        hire_date = employee.get('start_date')
        deadline_to_submit = None
        if hire_date:
            try:
                hire_dt = datetime.fromisoformat(hire_date.replace('Z', '+00:00'))
                deadline_dt = hire_dt + timedelta(days=30)
                deadline_to_submit = deadline_dt.strftime('%m/%d/%Y')
            except Exception as e:
                logger.warning(f"[HEALTH-INSURANCE-DETAIL] Failed to calculate deadline: {e}")
                deadline_to_submit = (datetime.utcnow() + timedelta(days=30)).strftime('%m/%d/%Y')
        else:
            deadline_to_submit = (datetime.utcnow() + timedelta(days=30)).strftime('%m/%d/%Y')

        # Format hire date
        date_of_hire = None
        if hire_date:
            try:
                hire_dt = datetime.fromisoformat(hire_date.replace('Z', '+00:00'))
                date_of_hire = hire_dt.strftime('%m/%d/%Y')
            except Exception as e:
                logger.warning(f"[HEALTH-INSURANCE-DETAIL] Failed to format hire date: {e}")
                date_of_hire = datetime.utcnow().strftime('%m/%d/%Y')
        else:
            date_of_hire = datetime.utcnow().strftime('%m/%d/%Y')

        # Build response
        response_data = {
            "pdfUrl": health_insurance_pdf_url,
            "employeeData": {
                "name": f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
                "startDate": employee.get('start_date')
            },
            "employerProfile": employer_profile,
            "autoFillData": {
                "propertyName": property_name,
                "deadlineToSubmit": deadline_to_submit,
                "reasonForRequest": "new_hire",
                "dateOfHire": date_of_hire
            }
        }

        logger.info(f"[HEALTH-INSURANCE-DETAIL] Returning Health Insurance review data")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[HEALTH-INSURANCE-DETAIL] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{employee_id}/document/{document_type}/approve")
async def approve_document(
    employee_id: str,
    document_type: str,
    request: ApproveDocumentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Approve a document
    - Regenerates PDF with manager's edits/signature
    - Replaces original PDF in storage
    - Marks as approved in database
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can approve documents"
            )

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Check if previous document is approved (if not first)
        if workflow_step['order'] > 1:
            prev_step = DOCUMENT_WORKFLOW[workflow_step['order'] - 2]
            prev_approval = supabase_service.admin_client.table('document_approvals')\
                .select('*')\
                .eq('employee_id', employee_id)\
                .eq('document_type', prev_step['type'])\
                .execute()

            if not prev_approval.data or len(prev_approval.data) == 0 or prev_approval.data[0].get('status') != 'approved':
                raise HTTPException(
                    status_code=400,
                    detail=f"Previous document ({prev_step['name']}) must be approved first"
                )

        # Get existing PDF (already generated during employee onboarding)
        # Note: signed_documents table only stores PDF metadata, not approval status
        # Approval status is tracked in document_approvals table
        pdf_record_response = supabase_service.client.table('signed_documents')\
            .select('*')\
            .eq('employee_id', employee_id)\
            .eq('document_type', document_type)\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()

        final_pdf_url = None
        if pdf_record_response.data:
            pdf_record = pdf_record_response.data[0]
            # Use pdf_url if available (already a signed URL)
            final_pdf_url = pdf_record.get('pdf_url')

        # Save/Update approval in document_approvals table
        approval_data = {
            'employee_id': employee_id,
            'document_type': document_type,
            'status': 'approved',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': request.notes,
            'form_data': request.form_data,
            'signature': request.signature
        }

        # Use upsert to handle both insert and update
        try:
            supabase_service.client.table('document_approvals')\
                .upsert(approval_data, on_conflict='employee_id,document_type')\
                .execute()
        except Exception as upsert_error:
            logger.warning(f"Upsert failed with regular client, trying admin client: {upsert_error}")
            supabase_service.admin_client.table('document_approvals')\
                .upsert(approval_data, on_conflict='employee_id,document_type')\
                .execute()

        logger.info(f"Document approved: {document_type} for employee {employee_id} by {current_user.id}")

        return {
            "success": True,
            "message": f"{workflow_step['name']} approved successfully",
            "finalPdfUrl": final_pdf_url
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve document: {str(e)}"
        )


@router.post("/{employee_id}/document/{document_type}/reject")
async def reject_document(
    employee_id: str,
    document_type: str,
    request: RejectDocumentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Reject a document
    - Marks as rejected in database
    - Sends notification to employee to resubmit
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can reject documents"
            )

        # Get employee info
        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()

        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this employee"
            )

        # Find workflow step
        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == document_type), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="Invalid document type")

        # Save rejection to database
        rejection_data = {
            'employee_id': employee_id,
            'document_type': document_type,
            'status': 'rejected',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': request.reason
        }

        # Upsert rejection record
        supabase_service.client.table('document_approvals')\
            .upsert(rejection_data, on_conflict='employee_id,document_type')\
            .execute()

        # TODO: Send notification to employee
        # TODO: Update employee onboarding status to show document needs resubmission

        logger.info(f"Document rejected: {document_type} for employee {employee_id} by {current_user.id}")

        return {
            "success": True,
            "message": f"{workflow_step['name']} rejected. Employee will be notified to resubmit."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject document: {str(e)}"
        )


@router.get("/{employee_id}/documents/i9/detail")
async def get_i9_review_detail(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Return comprehensive I-9 review data including PDF URL, uploads, and employer profile"""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can access I-9 review data")

        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        if current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="You don't have access to this employee")

        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == 'i9'), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="I-9 workflow configuration missing")

        property_record = supabase_service.client.table('properties') \
            .select('name') \
            .eq('id', property_id) \
            .single() \
            .execute()

        property_name = property_record.data.get('name') if property_record.data else 'Unknown'

        sanitized_property = await document_path_manager.get_property_name(property_id)
        sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)

        bucket_name = 'onboarding-documents'
        storage_accessor = supabase_service.admin_client
        base_path = f"{sanitized_property}/{sanitized_employee}"

        pdf_url = None
        doc_path = None
        files: List[Dict[str, Any]] = []

        try:
            candidate_paths = [workflow_step['path']]
            if 'forms/i9' not in candidate_paths:
                candidate_paths.append('forms/i9')

            for rel_path in candidate_paths:
                attempt_path = f"{base_path}/{rel_path}"
                try:
                    listing = storage_accessor.storage.from_(bucket_name).list(attempt_path)
                    listing = _normalize_storage_list(bucket_name, attempt_path, listing)
                except Exception:
                    listing = []
                if listing:
                    logger.debug(
                        "[i9-detail] found files in bucket=%s path=%s count=%s",
                        bucket_name,
                        attempt_path,
                        len(listing)
                    )
                    doc_path = attempt_path
                    files = listing
                    break

            if not files:
                legacy_bucket = 'employee-documents'
                legacy_base = f"{property_name}/{employee_data.get('first_name', '')}_{employee_data.get('last_name', '')}".strip('_')
                storage_accessor = supabase_service.client
                for rel_path in candidate_paths:
                    attempt_path = f"{legacy_base}/{rel_path}"
                    try:
                        listing = storage_accessor.storage.from_(legacy_bucket).list(attempt_path)
                        listing = _normalize_storage_list(legacy_bucket, attempt_path, listing)
                    except Exception:
                        listing = []
                    if listing:
                        logger.debug(
                            "[i9-detail] fallback files in bucket=%s path=%s count=%s",
                            legacy_bucket,
                            attempt_path,
                            len(listing)
                        )
                        bucket_name = legacy_bucket
                        base_path = legacy_base
                        doc_path = attempt_path
                        files = listing
                        break

            if not files:
                raise HTTPException(status_code=404, detail="I-9 PDF not found for this employee")

            pdf_file = next((f for f in files if _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
            if not pdf_file:
                raise HTTPException(status_code=404, detail="I-9 PDF file missing")

            pdf_name = _entry_name(pdf_file)
            signed = storage_accessor.storage.from_(bucket_name) \
                .create_signed_url(f"{doc_path}/{pdf_name}", 3600)
            pdf_url = signed.get('signedURL') if isinstance(signed, dict) else signed
        except HTTPException:
            raise
        except Exception as storage_error:
            logger.error(f"Error loading I-9 PDF: {storage_error}")
            raise HTTPException(status_code=500, detail="Failed to load I-9 PDF")

        uploaded_docs: List[Dict[str, Any]] = []
        if workflow_step.get('upload_path'):
            upload_path = f"{base_path}/{workflow_step['upload_path']}"
            logger.info(f"[I9-UPLOADS] Checking upload path: {upload_path}")
            try:
                upload_folders = storage_accessor.storage.from_(bucket_name).list(upload_path)
                upload_folders = _normalize_storage_list(bucket_name, upload_path, upload_folders)
                logger.info(f"[I9-UPLOADS] Found {len(upload_folders or [])} folders in {upload_path}")
                for folder in upload_folders or []:
                    folder_name = _entry_name(folder)
                    logger.info(f"[I9-UPLOADS] Processing folder: name={folder_name}")
                    if folder_name:
                        folder_path = f"{upload_path}/{folder_name}"
                        logger.info(f"[I9-UPLOADS] Checking folder: {folder_path}")
                        try:
                            folder_files = storage_accessor.storage.from_(bucket_name).list(folder_path)
                            folder_files = _normalize_storage_list(bucket_name, folder_path, folder_files)
                            logger.info(f"[I9-UPLOADS] Found {len(folder_files or [])} files in {folder_path}")
                            for file in folder_files or []:
                                file_name = _entry_name(file)
                                logger.info(f"[I9-UPLOADS] Processing file: {file_name}")
                                if file_name and file_name.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                                    file_path_full = f"{folder_path}/{file_name}"

                                    # Download and decrypt the uploaded document
                                    file_base64 = None
                                    file_url = None
                                    try:
                                        logger.info(f"[I9-UPLOADS] Downloading and decrypting: {file_path_full}")
                                        raw_bytes = storage_accessor.storage.from_(bucket_name).download(file_path_full)

                                        # Decrypt the document
                                        decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
                                            raw_bytes,
                                            document_type=f"i9_upload_{folder_name}",
                                            employee_id=employee_id
                                        )

                                        if was_encrypted:
                                            logger.info(f"[I9-UPLOADS] Decrypted {file_name}: {len(raw_bytes)} → {len(decrypted_bytes)} bytes")

                                        # Convert to base64 for frontend
                                        file_base64 = base64.b64encode(decrypted_bytes).decode('utf-8')

                                    except Exception as decrypt_err:
                                        logger.warning(f"[I9-UPLOADS] Failed to decrypt {file_name}: {decrypt_err}")
                                        # Fallback to signed URL
                                        try:
                                            file_url_response = storage_accessor.storage.from_(bucket_name).create_signed_url(file_path_full, 3600)
                                            file_url = file_url_response.get('signedURL') if isinstance(file_url_response, dict) else file_url_response
                                        except Exception as url_err:
                                            logger.error(f"[I9-UPLOADS] Failed to generate signed URL for {file_name}: {url_err}")

                                    uploaded_docs.append({
                                        "id": _entry_value(file, 'id') or str(uuid4()),
                                        "document_type": folder_name,
                                        "file_name": file_name,
                                        "url": file_url,  # Fallback signed URL
                                        "data": file_base64  # Decrypted base64 data
                                    })
                                    logger.info(f"[I9-UPLOADS] Added document: {folder_name}/{file_name} (decrypted: {file_base64 is not None})")
                        except Exception as folder_err:
                            logger.error(f"[I9-UPLOADS] Error reading folder {folder_path}: {folder_err}")
            except Exception as upload_err:
                logger.warning(f"Could not fetch uploaded I-9 docs from {upload_path}: {upload_err}")

        documents_response = supabase_service.client.table('i9_documents') \
            .select('*') \
            .eq('employee_id', employee_id) \
            .execute()

        section2_documents = documents_response.data or []

        employer_profile = None
        try:
            # Use admin_client to bypass RLS for employer profiles
            employer_profile_result = supabase_service.admin_client.table('employer_profiles') \
                .select('*') \
                .eq('property_id', property_id) \
                .eq('is_active', True) \
                .execute()
            # Get the first profile if multiple exist, or None if empty
            employer_profile = employer_profile_result.data[0] if employer_profile_result.data else None
            logger.info(f"[EMPLOYER-PROFILE] Retrieved for property {property_id}: {employer_profile}")
        except Exception as emp_err:
            logger.warning(f"Could not fetch employer profile for property {property_id}: {emp_err}")
            employer_profile = None

        try:
            section1_form_result = supabase_service.client.table('i9_forms') \
                .select('*') \
                .eq('employee_id', employee_id) \
                .eq('section', 'section1') \
                .single() \
                .execute()
            section1_form = section1_form_result.data if section1_form_result.data else None
        except Exception as section1_err:
            logger.warning(f"No I-9 section1 form found for employee {employee_id}: {section1_err}")
            section1_form = None

        try:
            section2_form_result = supabase_service.client.table('i9_forms') \
                .select('*') \
                .eq('employee_id', employee_id) \
                .eq('section', 'section2') \
                .single() \
                .execute()
            section2_form = section2_form_result.data if section2_form_result.data else None
        except Exception as section2_err:
            logger.warning(f"No I-9 section2 form found for employee {employee_id}: {section2_err}")
            section2_form = None

        return {
            "success": True,
            "employeeId": employee_id,
            "employeeName": f"{employee_data.get('first_name', '')} {employee_data.get('last_name', '')}".strip(),
            "employeeStartDate": employee_data.get('start_date'),
            "i9Deadline": employee_data.get('i9_section2_deadline'),
            "pdfUrl": pdf_url,
            "uploadedDocuments": uploaded_docs,
            "documentsMetadata": section2_documents,
            "section1Form": section1_form,
            "section2Form": section2_form,
            "employerProfile": employer_profile
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to load I-9 review detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to load I-9 review data")


@router.post("/{employee_id}/documents/i9/save-verified")
async def save_verified_i9(
    employee_id: str,
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """Save the verified I-9 PDF after manager review (Step 1 -> Step 2 transition)"""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can save verified I-9")

        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        if current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="You don't have access to this employee")

        pdf_bytes_base64 = request.get('pdfBytes')
        if not pdf_bytes_base64:
            raise HTTPException(status_code=400, detail="PDF bytes required")

        logger.info(f"[I9-VERIFIED] Saving verified PDF for employee {employee_id}")

        import base64
        pdf_bytes = base64.b64decode(pdf_bytes_base64)

        # Save as verified PDF
        saved_document = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='i9_form_verified',  # Different form type to distinguish
            pdf_bytes=pdf_bytes,
            is_edit=False,
            user_role='manager'
        )

        logger.info(f"[I9-VERIFIED] Saved verified PDF: {saved_document.get('file_path')}")

        return {
            "success": True,
            "message": "Verified I-9 saved successfully",
            "verifiedPdfUrl": saved_document.get('signed_url') if saved_document else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to save verified I-9: {e}")
        raise HTTPException(status_code=500, detail="Failed to save verified I-9")


@router.post("/{employee_id}/documents/i9/complete")
async def complete_i9_document(
    employee_id: str,
    request: CompleteI9Request,
    current_user: User = Depends(get_current_user)
):
    """Complete I-9 Section 2: regenerate PDF with employer data, replace existing file, and mark approved"""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can complete I-9 reviews")

        employee = supabase_service.client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_data = employee.data
        property_id = employee_data.get('property_id')

        if current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="You don't have access to this employee")

        if request.updateEmployerProfile:
            existing_profile = supabase_service.client.table('employer_profiles') \
                .select('id') \
                .eq('property_id', property_id) \
                .eq('is_active', True) \
                .single() \
                .execute()

            profile_payload = {
                "property_id": property_id,
                "i9_employer_name": request.employerName,
                "i9_employer_title": request.employerTitle,
                "i9_business_name": request.businessName,
                "i9_business_address": request.businessAddress,
                "city": request.city,
                "state": request.state,
                "zip_code": request.zipCode,
                "business_legal_name": request.businessName,
                "dba_name": request.businessName,
                "street_address": request.businessAddress,
                "is_active": True,
                "updated_at": datetime.utcnow().isoformat()
            }

            if existing_profile.data:
                profile_payload['id'] = existing_profile.data['id']
            else:
                profile_payload['id'] = str(uuid4())
                profile_payload['created_at'] = datetime.utcnow().isoformat()

            try:
                supabase_service.admin_client.table('employer_profiles') \
                    .upsert(profile_payload, on_conflict='property_id') \
                    .execute()
            except Exception as profile_err:
                logger.warning(f"Failed to upsert employer profile for property {property_id}: {profile_err}")

        try:
            section1_result = supabase_service.client.table('i9_forms') \
                .select('*') \
                .eq('employee_id', employee_id) \
                .eq('section', 'section1') \
                .single() \
                .execute()
            section1_data = section1_result.data if section1_result.data else {}
        except Exception as section1_err:
            logger.warning(f"No I-9 section1 data for employee {employee_id}: {section1_err}")
            section1_data = {}

        form_data = section1_data.get('form_data', {}) if isinstance(section1_data, dict) else {}

        def get_form_value(*keys, default=""):
            for key in keys:
                value = form_data.get(key)
                if value not in (None, ""):
                    return value
            return default

        citizenship_map = {
            'citizen': 'us_citizen',
            'us_citizen': 'us_citizen',
            'national': 'noncitizen_national',
            'noncitizen_national': 'noncitizen_national',
            'permanent_resident': 'permanent_resident',
            'authorized_alien': 'authorized_alien'
        }

        raw_citizenship = get_form_value('citizenship_status', 'citizenshipStatus')
        normalized_citizenship = citizenship_map.get(raw_citizenship, raw_citizenship)

        employee_pdf_data = {
            'employee_first_name': get_form_value('first_name', 'firstName', default=employee_data.get('first_name', '')),
            'employee_last_name': get_form_value('last_name', 'lastName', default=employee_data.get('last_name', '')),
            'employee_middle_initial': get_form_value('middle_initial', 'middleInitial'),
            'other_last_names': get_form_value('other_names', 'otherLastNames'),
            'address_street': get_form_value('address', 'street'),
            'address_apt': get_form_value('apt_number', 'apartment', 'aptNumber'),
            'address_city': get_form_value('city', default=employee_data.get('city', '')),
            'address_state': get_form_value('state', default=employee_data.get('state', '')),
            'address_zip': get_form_value('zip_code', 'zip', 'zipCode', default=employee_data.get('zip_code', '')),
            'date_of_birth': get_form_value('date_of_birth', 'dateOfBirth'),
            'ssn': get_form_value('ssn', 'social_security_number'),
            'email': get_form_value('email', default=employee_data.get('email', '')),
            'phone': get_form_value('phone', 'telephone'),
            'citizenship_status': normalized_citizenship,
            'uscis_number': get_form_value('alien_registration_number', 'uscis_number'),
            'i94_admission_number': get_form_value('form_i94_number', 'i94_number'),
            'passport_number': get_form_value('foreign_passport_number', 'passport_number'),
            'passport_country': get_form_value('country_of_issuance', 'passport_country'),
            'work_authorization_expiration': get_form_value('expiration_date', 'work_authorization_expiration'),
        }

        employer_data: Dict[str, Any] = {}

        try:
            section2_result = supabase_service.client.table('i9_forms') \
                .select('*') \
                .eq('employee_id', employee_id) \
                .eq('section', 'section2') \
                .single() \
                .execute()
            section2_form_data = section2_result.data if section2_result.data else {}
        except Exception as section2_err:
            logger.warning(f"No I-9 section2 data for employee {employee_id}: {section2_err}")
            section2_form_data = {}

        section2_form = section2_form_data.get('form_data', {}) if isinstance(section2_form_data, dict) else {}

        documents_response = supabase_service.client.table('i9_documents') \
            .select('*') \
            .eq('employee_id', employee_id) \
            .execute()
        uploaded_docs = documents_response.data or []

        for doc in uploaded_docs:
            doc_type_raw = (doc.get('document_type') or doc.get('document_name') or '').lower()
            ocr_source = doc.get('ocr_data') or {}

            if 'passport' in doc_type_raw:
                passport_number = ocr_source.get('documentNumber') or ocr_source.get('document_number')
                passport_expiration = ocr_source.get('expirationDate') or ocr_source.get('expiration_date')
                employer_data['document_title_1'] = 'U.S. Passport'
                employer_data['issuing_authority_1'] = 'United States Department of State'
                employer_data['document_number_1'] = passport_number
                employer_data['expiration_date_1'] = passport_expiration
                employer_data['list_a_title'] = employer_data['document_title_1']
                employer_data['list_a_authority'] = employer_data['issuing_authority_1']
                employer_data['list_a_number'] = passport_number
                employer_data['list_a_expiration'] = passport_expiration
            elif 'permanent' in doc_type_raw or 'resident' in doc_type_raw:
                card_number = ocr_source.get('documentNumber') or ocr_source.get('alienNumber')
                card_expiration = ocr_source.get('expirationDate') or ocr_source.get('expiration_date')
                employer_data['document_title_1'] = 'Permanent Resident Card'
                employer_data['issuing_authority_1'] = 'USCIS'
                employer_data['document_number_1'] = card_number
                employer_data['expiration_date_1'] = card_expiration
                employer_data['list_a_title'] = employer_data['document_title_1']
                employer_data['list_a_authority'] = employer_data['issuing_authority_1']
                employer_data['list_a_number'] = card_number
                employer_data['list_a_expiration'] = card_expiration
            elif 'driver' in doc_type_raw or 'license' in doc_type_raw:
                dl_number = ocr_source.get('documentNumber') or ocr_source.get('document_number')
                dl_expiration = ocr_source.get('expirationDate') or ocr_source.get('expiration_date')
                dl_authority = ocr_source.get('issuingAuthority') or ocr_source.get('issuing_state') or ocr_source.get('issuingState')
                employer_data['document_title_2'] = "Driver's License"
                employer_data['issuing_authority_2'] = dl_authority
                employer_data['document_number_2'] = dl_number
                employer_data['expiration_date_2'] = dl_expiration
                employer_data['list_b_title'] = employer_data['document_title_2']
                employer_data['list_b_authority'] = dl_authority
                employer_data['list_b_number'] = dl_number
                employer_data['list_b_expiration'] = dl_expiration
            elif 'social' in doc_type_raw or 'ssn' in doc_type_raw:
                ssn_value = ocr_source.get('ssn') or ocr_source.get('documentNumber') or ocr_source.get('document_number')
                employer_data['document_title_3'] = 'Social Security Card'
                employer_data['issuing_authority_3'] = 'Social Security Administration'
                employer_data['document_number_3'] = ssn_value
                employer_data['expiration_date_3'] = 'N/A'
                employer_data['list_c_title'] = employer_data['document_title_3']
                employer_data['list_c_authority'] = employer_data['issuing_authority_3']
                employer_data['list_c_number'] = ssn_value
                employer_data['list_c_expiration'] = ''

        employer_data['first_day_employment'] = request.firstDayOfEmployment or section2_form.get('firstDayEmployment')
        employer_data['additional_info'] = request.additionalInfo or section2_form.get('additionalInfo')
        employer_data['business_name'] = request.businessName
        employer_data['business_address'] = request.businessAddress
        employer_data['business_city'] = request.city
        employer_data['business_state'] = request.state
        employer_data['business_zip'] = request.zipCode
        employer_data['employer_name'] = request.employerName
        employer_data['employer_title'] = request.employerTitle
        employer_data['signature_date'] = request.signatureDate or datetime.utcnow().strftime('%m/%d/%Y')

        # Get the existing I-9 PDF bytes
        # Priority: 1) Verified PDF (saved after manager review), 2) Original PDF
        logger.info(f"[I9-COMPLETE] Looking for verified or original I-9 PDF")

        sanitized_property = await document_path_manager.get_property_name(property_id)
        sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)

        bucket_name = 'onboarding-documents'
        storage_accessor = supabase_service.admin_client
        base_path = f"{sanitized_property}/{sanitized_employee}"

        workflow_step = next((s for s in DOCUMENT_WORKFLOW if s['type'] == 'i9'), None)
        if not workflow_step:
            raise HTTPException(status_code=404, detail="I-9 workflow configuration missing")

        # Find the existing I-9 PDF
        # Priority: 1) Latest verified PDF from forms/i9_form_verified, 2) Original from forms/i9_form
        doc_path = None
        pdf_file = None
        existing_i9_full_path = None

        try:
            # First, check for verified PDFs in forms/i9_form_verified
            verified_path = f"{base_path}/forms/i9_form_verified"
            verified_files = []

            try:
                listing = storage_accessor.storage.from_(bucket_name).list(verified_path)
                verified_files = _normalize_storage_list(bucket_name, verified_path, listing)
                logger.info(f"[I9-COMPLETE] Found {len(verified_files)} files in verified folder")
            except Exception as e:
                logger.info(f"[I9-COMPLETE] No verified folder or error: {e}")
                verified_files = []

            # Filter for verified PDFs and sort by timestamp (newest first)
            verified_pdfs = [
                f for f in verified_files
                if _entry_name(f) and 'verified' in _entry_name(f) and _entry_name(f).endswith('.pdf')
            ]

            if verified_pdfs:
                # Sort by filename (which contains timestamp) to get the latest
                verified_pdfs.sort(key=lambda f: _entry_name(f), reverse=True)
                pdf_file = verified_pdfs[0]
                pdf_name = _entry_name(pdf_file)
                existing_i9_full_path = f"{verified_path}/{pdf_name}"
                logger.info(f"[I9-COMPLETE] Using LATEST verified PDF: {existing_i9_full_path} (out of {len(verified_pdfs)} verified PDFs)")

            # If no verified PDF, fall back to original in forms/i9_form
            if not existing_i9_full_path:
                logger.info(f"[I9-COMPLETE] No verified PDF found, looking for original...")

                candidate_paths = [workflow_step['path']]
                if 'forms/i9_form' not in candidate_paths:
                    candidate_paths.append('forms/i9_form')
                if 'forms/i9' not in candidate_paths:
                    candidate_paths.append('forms/i9')

                for rel_path in candidate_paths:
                    attempt_path = f"{base_path}/{rel_path}"
                    try:
                        listing = storage_accessor.storage.from_(bucket_name).list(attempt_path)
                        listing = _normalize_storage_list(bucket_name, attempt_path, listing)
                    except Exception:
                        listing = []

                    if listing:
                        # Look for signed PDF
                        signed_pdf = next((f for f in listing if _entry_name(f) and 'signed' in _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
                        if signed_pdf:
                            pdf_name = _entry_name(signed_pdf)
                            existing_i9_full_path = f"{attempt_path}/{pdf_name}"
                            logger.info(f"[I9-COMPLETE] Using original PDF: {existing_i9_full_path}")
                            break

            if not existing_i9_full_path:
                raise HTTPException(status_code=404, detail="No I-9 PDF found (neither verified nor original)")

            # Download the existing PDF bytes
            existing_pdf_bytes = storage_accessor.storage.from_(bucket_name).download(existing_i9_full_path)

            logger.info(f"[I9-COMPLETE] Downloaded PDF, size: {len(existing_pdf_bytes)} bytes")

        except HTTPException:
            raise
        except Exception as download_err:
            logger.error(f"[I9-COMPLETE] Failed to download existing I-9: {download_err}")
            raise HTTPException(status_code=500, detail=f"Failed to load existing I-9 form: {str(download_err)}")

        # Fill Section 2 on the existing PDF (which already has Section 1 filled)
        pdf_filler = PDFFormFiller()
        pdf_bytes = pdf_filler.fill_i9_section2_on_existing(existing_pdf_bytes, employer_data)

        # Add manager signature
        pdf_bytes = pdf_filler.add_signature_to_pdf(
            pdf_bytes,
            request.signature.dataUrl,
            signature_type='employer_i9',
            signature_date=request.signature.timestamp
        )

        # Save as completed I-9 (final version with Section 2 + signature)
        saved_document = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='i9_form_completed',  # Mark as completed
            pdf_bytes=pdf_bytes,
            is_edit=True,
            user_role='manager'
        )

        approval_data = {
            'employee_id': employee_id,
            'document_type': 'i9',
            'status': 'approved',
            'approved_by': current_user.id,
            'approved_at': datetime.utcnow().isoformat(),
            'notes': None,
            'form_data': {
                'first_day_of_employment': request.firstDayOfEmployment,
                'employer_name': request.employerName,
                'employer_title': request.employerTitle,
                'business_name': request.businessName,
                'business_address': request.businessAddress,
                'city': request.city,
                'state': request.state,
                'zip_code': request.zipCode,
            },
            'signature': {
                'timestamp': request.signature.timestamp,
                'ip_address': request.signature.ipAddress,
                'user_agent': request.signature.userAgent
            }
        }

        # Use admin_client to bypass RLS for document approvals
        supabase_service.admin_client.table('document_approvals') \
            .upsert(approval_data, on_conflict='employee_id,document_type') \
            .execute()

        supabase_service.admin_client.table('employees') \
            .update({
                'i9_section2_status': 'completed',
                'i9_section2_completed_at': datetime.utcnow().isoformat()
            }) \
            .eq('id', employee_id) \
            .execute()

        return {
            "success": True,
            "message": "I-9 Section 2 completed successfully",
            "finalPdfUrl": saved_document.get('signed_url') if saved_document else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to complete I-9 review: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete I-9 review")


# ============================================================================
# W-4 REVIEW ENDPOINTS
# ============================================================================

@router.get("/{employee_id}/documents/w4/detail")
async def get_w4_review_detail(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get W-4 review detail including PDF URL, SSN card URL, and employer profile
    """
    try:
        logger.info(f"[W4-DETAIL] Loading W-4 review data for employee {employee_id}")

        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = employee_response.data
        property_id = employee.get('property_id')

        # Get employer profile
        employer_profile = None
        if property_id:
            profile_response = supabase_service.admin_client.table('employer_profiles').select('*').eq('property_id', property_id).single().execute()
            if profile_response.data:
                employer_profile = profile_response.data

        # Get W-4 PDF URL using same path construction as I-9
        sanitized_property = await document_path_manager.get_property_name(property_id)
        sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)

        bucket_name = 'onboarding-documents'
        base_path = f"{sanitized_property}/{sanitized_employee}"
        w4_path = f"{base_path}/forms/w4_form"

        logger.info(f"[W4-DETAIL] Looking for W-4 in path: {w4_path}")

        w4_pdf_url = None
        try:
            listing = supabase_service.admin_client.storage.from_(bucket_name).list(w4_path)
            listing = _normalize_storage_list(bucket_name, w4_path, listing)

            logger.info(f"[W4-DETAIL] Found {len(listing or [])} files in {w4_path}")
            if listing:
                for item in listing:
                    logger.info(f"[W4-DETAIL] File: {_entry_name(item)}")

            # Find the signed W-4 PDF
            w4_pdf = next((f for f in listing if _entry_name(f) and 'signed' in _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
            if w4_pdf:
                pdf_name = _entry_name(w4_pdf)
                full_path = f"{w4_path}/{pdf_name}"
                w4_pdf_url = supabase_service.admin_client.storage.from_(bucket_name).create_signed_url(full_path, 3600)
                if isinstance(w4_pdf_url, dict):
                    w4_pdf_url = w4_pdf_url.get('signedURL')
                logger.info(f"[W4-DETAIL] Found W-4 PDF: {full_path}")
            else:
                logger.warning(f"[W4-DETAIL] No signed W-4 PDF found in {w4_path}")
        except Exception as e:
            logger.error(f"[W4-DETAIL] Failed to load W-4 PDF: {e}")

        # Get ALL uploaded I-9 verification documents (SSN card, Driver's License, etc.)
        # This allows manager to verify name, address, and SSN
        storage_accessor = supabase_service.admin_client
        uploaded_docs: List[Dict[str, Any]] = []

        upload_path = f"{base_path}/uploads/i9_verification"
        logger.info(f"[W4-DETAIL] Looking for uploaded documents in: {upload_path}")

        try:
            upload_folders = storage_accessor.storage.from_(bucket_name).list(upload_path)
            upload_folders = _normalize_storage_list(bucket_name, upload_path, upload_folders)
            logger.info(f"[W4-DETAIL] Found {len(upload_folders or [])} folders in {upload_path}")

            for folder in upload_folders or []:
                folder_name = _entry_name(folder)
                if folder_name:
                    folder_path = f"{upload_path}/{folder_name}"
                    logger.info(f"[W4-DETAIL] Checking folder: {folder_path}")
                    try:
                        folder_files = storage_accessor.storage.from_(bucket_name).list(folder_path)
                        folder_files = _normalize_storage_list(bucket_name, folder_path, folder_files)
                        logger.info(f"[W4-DETAIL] Found {len(folder_files or [])} files in {folder_path}")

                        for file in folder_files or []:
                            file_name = _entry_name(file)
                            if file_name and file_name.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                                file_path_full = f"{folder_path}/{file_name}"

                                # Download and decrypt the uploaded document
                                file_base64 = None
                                file_url = None
                                try:
                                    logger.info(f"[W4-DETAIL] Downloading and decrypting: {file_path_full}")
                                    raw_bytes = storage_accessor.storage.from_(bucket_name).download(file_path_full)

                                    # Decrypt the document
                                    decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
                                        raw_bytes,
                                        document_type=f"i9_upload_{folder_name}",
                                        employee_id=employee_id
                                    )

                                    if was_encrypted:
                                        logger.info(f"[W4-DETAIL] Decrypted {file_name}: {len(raw_bytes)} → {len(decrypted_bytes)} bytes")

                                    # Convert to base64 for frontend
                                    file_base64 = base64.b64encode(decrypted_bytes).decode('utf-8')

                                except Exception as decrypt_err:
                                    logger.warning(f"[W4-DETAIL] Failed to decrypt {file_name}: {decrypt_err}")
                                    # Fallback to signed URL
                                    try:
                                        file_url_response = storage_accessor.storage.from_(bucket_name).create_signed_url(file_path_full, 3600)
                                        file_url = file_url_response.get('signedURL') if isinstance(file_url_response, dict) else file_url_response
                                    except Exception as url_err:
                                        logger.error(f"[W4-DETAIL] Failed to generate signed URL for {file_name}: {url_err}")

                                uploaded_docs.append({
                                    "id": _entry_value(file, 'id') or str(uuid4()),
                                    "document_type": folder_name,
                                    "file_name": file_name,
                                    "url": file_url,  # Fallback signed URL
                                    "data": file_base64  # Decrypted base64 data
                                })
                                logger.info(f"[W4-DETAIL] Added document: {folder_name}/{file_name} (decrypted: {file_base64 is not None})")
                    except Exception as folder_err:
                        logger.error(f"[W4-DETAIL] Error reading folder {folder_path}: {folder_err}")
        except Exception as upload_err:
            logger.warning(f"[W4-DETAIL] Could not fetch uploaded documents from {upload_path}: {upload_err}")

        # Build response
        response_data = {
            "pdfUrl": w4_pdf_url,
            "uploadedDocuments": uploaded_docs,  # All I-9 verification docs (SSN card, DL, etc.)
            "employeeData": {
                "name": f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
                "ssn": employee.get('ssn', '')[-4:] if employee.get('ssn') else '****',  # Last 4 digits only
                "address": f"{employee.get('address', '')}, {employee.get('city', '')}, {employee.get('state', '')} {employee.get('zip_code', '')}"
            },
            "employeeStartDate": employee.get('start_date'),
            "employerProfile": employer_profile
        }

        logger.info(f"[W4-DETAIL] Returning W-4 review data with {len(uploaded_docs)} uploaded documents")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to load W-4 review detail: {e}")
        raise HTTPException(status_code=500, detail="Failed to load W-4 review data")


@router.post("/{employee_id}/documents/w4/complete")
async def complete_w4_document(
    employee_id: str,
    request: CompleteW4Request,
    current_user: User = Depends(get_current_user)
):
    """
    Complete W-4 review by adding employer information and manager signature
    """
    try:
        logger.info(f"[W4-COMPLETE] Starting W-4 completion for employee {employee_id}")

        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = employee_response.data
        property_id = employee.get('property_id')

        # Find the existing W-4 PDF using same path construction as I-9
        sanitized_property = await document_path_manager.get_property_name(property_id)
        sanitized_employee = await document_path_manager.get_employee_folder_name(employee_id, property_id)

        bucket_name = 'onboarding-documents'
        base_path = f"{sanitized_property}/{sanitized_employee}"
        w4_path = f"{base_path}/forms/w4_form"

        logger.info(f"[W4-COMPLETE] Looking for W-4 in path: {w4_path}")

        existing_w4_full_path = None
        try:
            listing = supabase_service.admin_client.storage.from_(bucket_name).list(w4_path)
            listing = _normalize_storage_list(bucket_name, w4_path, listing)

            # Find the signed W-4 PDF
            w4_pdf = next((f for f in listing if _entry_name(f) and 'signed' in _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
            if w4_pdf:
                pdf_name = _entry_name(w4_pdf)
                existing_w4_full_path = f"{w4_path}/{pdf_name}"
                logger.info(f"[W4-COMPLETE] Found W-4 PDF: {existing_w4_full_path}")
        except Exception as e:
            logger.error(f"[W4-COMPLETE] Failed to find W-4 PDF: {e}")
            raise HTTPException(status_code=404, detail="W-4 PDF not found")

        if not existing_w4_full_path:
            raise HTTPException(status_code=404, detail="W-4 PDF not found")

        # Download the existing W-4 PDF
        logger.info(f"[W4-COMPLETE] Downloading W-4 PDF from: {existing_w4_full_path}")
        pdf_data = supabase_service.admin_client.storage.from_(bucket_name).download(existing_w4_full_path)

        # Add employer information to the PDF
        logger.info(f"[W4-COMPLETE] Adding employer information to W-4")

        # Prepare employer data for PDF filling
        # Format: "Employer Name\nStreet Address\nCity, State ZIP"
        employer_name_address = f"{request.employerName}\n{request.employerAddress}"

        employer_data = {
            'employer_name_address': employer_name_address,
            'employer_identification_number': request.employerEIN,
            'first_date_employment': request.firstDayOfEmployment or datetime.utcnow().strftime('%Y-%m-%d')
        }

        logger.info(f"[W4-COMPLETE] Employer data: name={request.employerName}, EIN={request.employerEIN}, date={employer_data['first_date_employment']}")

        # Use pdf_forms to fill employer section
        from app.pdf_forms import PDFFormFiller
        pdf_filler = PDFFormFiller()

        # Fill employer fields in the W-4 (signature is optional)
        signature_data_url = request.signature.dataUrl if request.signature else None
        completed_pdf_bytes = pdf_filler.fill_w4_employer_section(pdf_data, employer_data, signature_data_url)

        # Add manager signature if provided
        if request.signature and signature_data_url:
            completed_pdf_bytes = pdf_filler.add_signature_to_pdf(
                completed_pdf_bytes,
                signature_data_url,
                signature_type='employer_w4',
                signature_date=request.signature.timestamp
            )

        # Save completed W-4 using save_signed_document (same as I-9)
        logger.info(f"[W4-COMPLETE] Saving completed W-4")
        saved_document = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='w4_form_completed',  # Mark as completed
            pdf_bytes=completed_pdf_bytes,
            is_edit=True,  # Replace existing W-4
            user_role='manager'
        )

        # Create document approval record (same structure as I-9)
        approval_data = {
            "employee_id": employee_id,
            "document_type": "w4",
            "status": "approved",
            "approved_by": current_user.id,
            "approved_at": datetime.utcnow().isoformat(),
            "notes": request.notes,
            "form_data": {
                "employerName": request.employerName,
                "employerAddress": request.employerAddress,
                "employerEIN": request.employerEIN,
                "firstDayOfEmployment": request.firstDayOfEmployment,
                "ssnVerified": request.ssnVerified
            },
            "signature": {
                "timestamp": request.signature.timestamp if request.signature else None,
                "ip_address": request.signature.ipAddress if request.signature else None,
                "user_agent": request.signature.userAgent if request.signature else None
            } if request.signature else None
        }

        # Upsert approval (on_conflict matches I-9)
        supabase_service.admin_client.table('document_approvals') \
            .upsert(approval_data, on_conflict='employee_id,document_type') \
            .execute()

        logger.info(f"[W4-COMPLETE] W-4 completed successfully for employee {employee_id}")

        return {
            "success": True,
            "message": "W-4 completed successfully",
            "finalPdfUrl": saved_document.get('signed_url') if saved_document else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to complete W-4: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete W-4")


@router.post("/{employee_id}/documents/health_insurance/complete")
async def complete_health_insurance_document(
    employee_id: str,
    request: CompleteHealthInsuranceRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Complete Health Insurance review by filling employer section
    """
    try:
        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Starting for employee {employee_id}")

        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = employee_response.data
        property_id = employee.get('property_id')

        # Verify manager has access
        if current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get property and employee folder names
        property_name = await document_path_manager.get_property_name(property_id)
        employee_folder = await document_path_manager.get_employee_folder_name(
            employee_id,
            property_id
        )

        # Construct path to Health Insurance PDF
        base_path = f"{property_name}/{employee_folder}"
        health_insurance_path = f"{base_path}/forms/health_insurance"
        bucket_name = 'onboarding-documents'

        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Looking for PDF in: {health_insurance_path}")

        # Get the signed Health Insurance PDF
        listing = supabase_service.admin_client.storage.from_(bucket_name).list(health_insurance_path)
        listing = _normalize_storage_list(bucket_name, health_insurance_path, listing)

        health_insurance_pdf = next((f for f in listing if _entry_name(f) and 'signed' in _entry_name(f) and _entry_name(f).endswith('.pdf')), None)
        if not health_insurance_pdf:
            raise HTTPException(status_code=404, detail="Health Insurance PDF not found")

        pdf_name = _entry_name(health_insurance_pdf)
        full_path = f"{health_insurance_path}/{pdf_name}"

        # Download the PDF
        pdf_response = supabase_service.admin_client.storage.from_(bucket_name).download(full_path)
        pdf_data = pdf_response

        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Downloaded PDF: {full_path}")

        # Prepare employer data for PDF filling
        employer_data = {
            'property_name': request.propertyName,
            'deadline_to_submit': request.deadlineToSubmit,
            'reason_for_request': request.reasonForRequest,
            'date_of_hire': request.dateOfHire,
            'qualifying_event_description': request.qualifyingEventDescription
        }

        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Employer data: {employer_data}")

        # Use pdf_forms to fill employer section
        from app.pdf_forms import PDFFormFiller
        pdf_filler = PDFFormFiller()

        # Fill employer fields in the Health Insurance form
        completed_pdf_bytes = pdf_filler.fill_health_insurance_employer_section(pdf_data, employer_data)

        # Save completed Health Insurance using save_signed_document
        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Saving completed Health Insurance")
        saved_document = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='health_insurance_completed',  # Mark as completed
            pdf_bytes=completed_pdf_bytes,
            is_edit=True,  # Replace existing
            user_role='manager'
        )

        # Create document approval record
        approval_data = {
            "employee_id": employee_id,
            "document_type": "health_insurance",
            "status": "approved",
            "approved_by": current_user.id,
            "approved_at": datetime.utcnow().isoformat(),
            "notes": request.notes,
            "form_data": {
                "propertyName": request.propertyName,
                "deadlineToSubmit": request.deadlineToSubmit,
                "reasonForRequest": request.reasonForRequest,
                "dateOfHire": request.dateOfHire,
                "qualifyingEventDescription": request.qualifyingEventDescription
            }
        }

        # Upsert approval
        supabase_service.admin_client.table('document_approvals') \
            .upsert(approval_data, on_conflict='employee_id,document_type') \
            .execute()

        logger.info(f"[HEALTH-INSURANCE-COMPLETE] Health Insurance completed successfully for employee {employee_id}")

        return {
            "success": True,
            "message": "Health Insurance completed successfully",
            "finalPdfUrl": saved_document.get('signed_url') if saved_document else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to complete Health Insurance: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete Health Insurance")


@router.post("/{employee_id}/complete-review")
async def complete_employee_review(
    employee_id: str,
    payload: CompleteReviewRequest,
    http_request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Complete manager review and activate employee
    - Verifies all documents are approved
    - Updates employee status to 'active'
    - Sends completion email to employee
    - Returns employee profile
    """
    try:
        logger.info(f"[COMPLETE-REVIEW] Starting for employee {employee_id}")

        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can complete review")

        # Get employee data
        employee_response = supabase_service.admin_client.table('employees').select('*').eq('id', employee_id).single().execute()
        if not employee_response.data:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee = employee_response.data
        property_id = employee.get('property_id')

        # Verify manager has access
        if current_user.role == 'manager' and current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="Access denied")

        logger.info(f"[COMPLETE-REVIEW] Employee: {employee.get('first_name')} {employee.get('last_name')}")

        # Step 1: Verify all required documents are approved
        required_docs = ['new_hire_summary', 'company_policies', 'i9', 'w4', 'direct_deposit', 'health_insurance']

        approvals_response = supabase_service.admin_client.table('document_approvals')\
            .select('*')\
            .eq('employee_id', employee_id)\
            .execute()

        approvals = {a['document_type']: a for a in approvals_response.data}

        logger.info(f"[COMPLETE-REVIEW] Found {len(approvals)} document approvals")

        # Check each required document
        missing_approvals = []
        for doc_type in required_docs:
            if doc_type not in approvals:
                missing_approvals.append(doc_type)
            elif approvals[doc_type].get('status') != 'approved':
                missing_approvals.append(f"{doc_type} (status: {approvals[doc_type].get('status')})")

        if missing_approvals:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete review. Missing or unapproved documents: {', '.join(missing_approvals)}"
            )

        logger.info(f"[COMPLETE-REVIEW] ✅ All required documents approved")

        # Step 2: Get property and manager info
        property_response = supabase_service.admin_client.table('properties').select('*').eq('id', property_id).single().execute()
        property_data = property_response.data if property_response.data else {}

        employer_response = supabase_service.admin_client.table('employer_profiles')\
            .select('*')\
            .eq('property_id', property_id)\
            .eq('is_active', True)\
            .execute()

        employer_profile = employer_response.data[0] if employer_response.data else {}

        # Get manager info
        manager_response = supabase_service.admin_client.table('users').select('*').eq('id', current_user.id).single().execute()
        manager = manager_response.data if manager_response.data else {}

        # Get property name
        property_name = await document_path_manager.get_property_name(property_id)

        logger.info(f"[COMPLETE-REVIEW] Property: {property_name}")

        # Step 3: Format data for email
        from datetime import datetime

        # Format start date
        try:
            start_dt = datetime.fromisoformat(payload.startDate.replace('Z', '+00:00'))
            formatted_start_date = start_dt.strftime('%A, %B %d, %Y')  # "Monday, October 7, 2025"
        except:
            formatted_start_date = payload.startDate

        # Build property address
        property_address = employer_profile.get('street_address', '')
        if employer_profile.get('suite_apt'):
            property_address += f" {employer_profile.get('suite_apt')}"
        if employer_profile.get('city'):
            property_address += f", {employer_profile.get('city')}"
        if employer_profile.get('state'):
            property_address += f", {employer_profile.get('state')}"
        if employer_profile.get('zip_code'):
            property_address += f" {employer_profile.get('zip_code')}"
        if not property_address and property_data:
            property_address = property_data.get('address', '') or ''
            if property_data.get('city'):
                property_address += f", {property_data.get('city')}"
            if property_data.get('state'):
                property_address += f", {property_data.get('state')}"
            if property_data.get('zip_code'):
                property_address += f" {property_data.get('zip_code')}"

        # Manager info
        manager_name = f"{manager.get('first_name', '')} {manager.get('last_name', '')}".strip()
        if not manager_name:
            manager_name = manager.get('email', 'Your Manager')

        manager_email = manager.get('email', '')
        manager_phone = manager.get('phone')  # May be None

        # Employee info
        employee_name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip()
        employee_email = employee.get('email', '')
        position = employee.get('position', 'Team Member')
        department = employee.get('department', 'General')

        logger.info(f"[COMPLETE-REVIEW] Prepared email data for {employee_email}")

        # Step 4: Update employee record
        update_data = {
            'manager_review_status': 'completed',
            'manager_review_completed_at': datetime.utcnow().isoformat(),
            'employment_status': 'active',
            'onboarding_status': 'completed',
            'manager_reviewed_by': current_user.id,
        }

        # Update start_date if provided and different
        if payload.startDate and payload.startDate != employee.get('start_date'):
            update_data['start_date'] = payload.startDate

        supabase_service.admin_client.table('employees')\
            .update(update_data)\
            .eq('id', employee_id)\
            .execute()

        logger.info(f"[COMPLETE-REVIEW] ✅ Employee status updated to 'active'")

        # Generate employee number for display (using employee ID)
        # Format: EMP-{first 8 chars of ID}
        display_employee_number = f"EMP-{employee_id[:8].upper()}"

        # Step 5: Build final onboarding packet
        document_plan = [
            ("New Hire Summary", 'new_hire_summary'),
            ("Company Policies", 'company_policies'),
            ("I-9 (Completed)", 'i9_form_completed'),
            ("W-4 (Completed)", 'w4_form_completed'),
            ("Direct Deposit", 'direct_deposit'),
            ("Human Trafficking Certificate", 'human_trafficking'),
            ("Weapons Policy", 'weapons_policy'),
            ("Health Insurance (Completed)", 'health_insurance_completed'),
        ]

        packet_writer = PdfWriter()
        missing_documents: List[str] = []

        for display_name, document_type in document_plan:
            record = await supabase_service.get_latest_signed_document_record(employee_id, document_type)
            pdf_bytes = await supabase_service.get_signed_document_bytes(record) if record else None
            if not pdf_bytes:
                missing_documents.append(display_name)
                continue
            try:
                reader = PdfReader(io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    packet_writer.add_page(page)
            except Exception as pdf_err:
                logger.warning(
                    "[COMPLETE-REVIEW] Failed to append %s (%s): %s",
                    display_name,
                    document_type,
                    pdf_err,
                )
                missing_documents.append(display_name)

        if missing_documents:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot complete review. The following documents are missing or could not be processed: "
                    + ", ".join(missing_documents)
                )
            )

        packet_buffer = io.BytesIO()
        packet_writer.write(packet_buffer)
        packet_bytes = packet_buffer.getvalue()

        packet_save = await supabase_service.save_signed_document(
            employee_id=employee_id,
            property_id=property_id,
            form_type='final_onboarding_packet',
            pdf_bytes=packet_bytes,
            is_edit=True,
            user_role='manager',
            request=http_request,
        )

        packet_base64 = base64.b64encode(packet_bytes).decode('utf-8')

        # Step 5: Send completion email
        from app.email_service import email_service

        email_sent = await email_service.send_onboarding_completion_email(
            employee_email=employee_email,
            employee_name=employee_name,
            employee_number=display_employee_number,
            position=position,
            department=department,
            start_date=formatted_start_date,
            start_time=payload.startTime,
            property_name=property_name,
            property_address=property_address,
            manager_name=manager_name,
            manager_email=manager_email,
            manager_phone=manager_phone,
            dress_code=payload.dressCode,
            parking_details=payload.parkingDetails,
            cc_manager=True
        )

        if email_sent:
            logger.info(f"[COMPLETE-REVIEW] ✅ Completion email sent to {employee_email}")
        else:
            logger.warning(f"[COMPLETE-REVIEW] ⚠️ Failed to send completion email to {employee_email}")

        # Send New Hire Notification email to employee
        try:
            # Get payment method from direct deposit approval
            payment_method = "Direct Deposit"  # Default
            try:
                dd_approval = supabase_service.admin_client.table('document_approvals') \
                    .select('form_data') \
                    .eq('employee_id', employee_id) \
                    .eq('document_type', 'direct_deposit') \
                    .single() \
                    .execute()

                if dd_approval and dd_approval.data:
                    dd_form_data = dd_approval.data.get('form_data', {})
                    # Check if they have bank account info
                    if dd_form_data.get('accountNumber') or dd_form_data.get('routingNumber'):
                        payment_method = "Direct Deposit"
                    else:
                        payment_method = "Check"
            except Exception as dd_exc:
                logger.warning(f"[COMPLETE-REVIEW] Could not determine payment method: {dd_exc}")

            # Get pay rate and frequency from new hire summary
            summary_approval = approvals.get('new_hire_summary', {})
            summary_form_data = summary_approval.get('form_data', {})
            pay_rate = summary_form_data.get('rateOfPay', employee.get('pay_rate', ''))
            pay_frequency = summary_form_data.get('payFrequency', employee.get('pay_frequency', 'bi-weekly'))

            # Get supervisor name from personal info
            personal_info = employee.get('personal_info', {})
            supervisor_name = personal_info.get('supervisor', manager_name)

            # Get start time
            start_time = personal_info.get('start_time', payload.startTime)

            new_hire_email_sent = await email_service.send_new_hire_notification_email(
                to_email=employee_email,
                employee_first_name=employee.get('first_name', ''),
                employee_last_name=employee.get('last_name', ''),
                hotel_name=property_name,
                hotel_address=property_address,
                department=department,
                job_title=position,
                supervisor_name=supervisor_name,
                job_start_date=formatted_start_date,
                start_time=start_time,
                pay_rate=str(pay_rate) if pay_rate else '',
                pay_frequency=pay_frequency,
                payment_method=payment_method,
            )

            if new_hire_email_sent:
                logger.info(f"[COMPLETE-REVIEW] ✅ New hire notification sent to {employee_email}")
            else:
                logger.warning(f"[COMPLETE-REVIEW] ⚠️ Failed to send new hire notification")
        except Exception as new_hire_email_exc:
            logger.error(f"[COMPLETE-REVIEW] Error sending new hire notification: {new_hire_email_exc}")

        # Step 6: Send packet to manager + HR recipients
        manager_primary_email = manager_email or current_user.email
        # Create filename with employee name
        safe_employee_name = employee_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        packet_filename = f"onboarding_packet_{safe_employee_name}_{employee_id[:8]}.pdf"
        hr_recipients: List[str] = []
        try:
            recipients_response = supabase_service.client.table('global_email_recipients').select('email,is_active').execute()
            hr_recipients = [
                row['email']
                for row in (recipients_response.data or [])
                if row.get('email') and row.get('is_active', True)
            ]
        except Exception as recipients_error:
            logger.warning("[COMPLETE-REVIEW] Failed to load HR notification recipients: %s", recipients_error)

        cc_emails = [email for email in hr_recipients if email != manager_primary_email]
        packet_email_sent = False
        if manager_primary_email:
            packet_email_sent = await email_service.send_manager_review_packet_email(
                to_email=manager_primary_email,
                cc_emails=cc_emails,
                employee_name=employee_name,
                property_name=property_name,
                packet_filename=packet_filename,
                packet_base64=packet_base64,
            )
            if packet_email_sent:
                logger.info("[COMPLETE-REVIEW] ✅ Sent onboarding packet to manager %s", manager_primary_email)
            else:
                logger.warning("[COMPLETE-REVIEW] ⚠️ Failed to send onboarding packet email")

        # Step 6: Return success
        return {
            "success": True,
            "message": "Employee activated successfully",
            "employee": {
                "id": employee_id,
                "employeeNumber": display_employee_number,
                "status": "active",
                "startDate": payload.startDate,
                "emailSent": email_sent,
                "packetUrl": packet_save.get('signed_url'),
                "packetEmailSent": packet_email_sent,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[COMPLETE-REVIEW] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
