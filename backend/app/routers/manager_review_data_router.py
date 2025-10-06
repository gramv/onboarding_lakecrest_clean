"""
Manager Review Data Router
Provides employee data for manager review with auto-filled forms
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timezone
from uuid import uuid4

from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manager/review", tags=["manager-review"])

# Get supabase service
supabase_service = get_enhanced_supabase_service()


# =====================================================
# REQUEST/RESPONSE MODELS
# =====================================================

class EmployeeReviewData(BaseModel):
    """Complete employee data for manager review"""
    employee_id: str
    employee_info: Dict[str, Any]
    onboarding_progress: Dict[str, Any]
    i9_section_1: Optional[Dict[str, Any]] = None
    i9_documents: List[Dict[str, Any]] = []
    w4_data: Optional[Dict[str, Any]] = None
    health_insurance_data: Optional[Dict[str, Any]] = None
    employer_profile: Optional[Dict[str, Any]] = None
    ocr_data: Optional[Dict[str, Any]] = None


class QuickEmployerProfileRequest(BaseModel):
    employerName: str
    employerTitle: str
    businessName: str
    businessAddress: str
    city: str
    state: str
    zipCode: str
    ein: str


# =====================================================
# ENDPOINTS
# =====================================================

@router.get("/employees/pending")
async def get_pending_reviews(
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Get list of employees pending manager review
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access pending reviews"
            )

        property_id = current_user.property_id
        if not property_id:
            raise HTTPException(
                status_code=400,
                detail="Manager property not found"
            )
        
        # Get employees pending review
        # Status: completed onboarding but not yet reviewed by manager
        employees = supabase_service.client.table("employees")\
            .select("""
                id,
                personal_info,
                start_date,
                position,
                department,
                onboarding_status,
                onboarding_progress,
                manager_review_status,
                manager_review_completed_at,
                created_at
            """)\
            .eq("property_id", property_id)\
            .eq("onboarding_status", "completed")\
            .is_("manager_review_status", "null")\
            .order("created_at", desc=False)\
            .execute()
        
        # Format response
        pending_employees = []
        for emp in employees.data or []:
            personal_info = emp.get('personal_info', {})
            
            pending_employees.append({
                "employee_id": emp['id'],
                "name": f"{personal_info.get('firstName', '')} {personal_info.get('lastName', '')}".strip(),
                "email": personal_info.get('email'),
                "position": emp.get('position'),
                "department": emp.get('department'),
                "start_date": emp.get('start_date'),
                "onboarding_completed_at": emp.get('created_at'),
                "days_pending": (datetime.now(timezone.utc) - datetime.fromisoformat(emp['created_at'].replace('Z', '+00:00'))).days
            })
        
        logger.info(f"Found {len(pending_employees)} employees pending review for property {property_id}")
        
        return {
            "success": True,
            "employees": pending_employees,
            "count": len(pending_employees)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pending reviews: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get pending reviews"
        )


@router.get("/employees/{employee_id}")
async def get_employee_review_data(
    employee_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Get complete employee data for review
    Includes all forms, documents, and employer profile for auto-fill
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can access employee review data"
            )

        property_id = current_user.property_id
        
        # Get employee data
        employee = supabase_service.client.table("employees")\
            .select("*")\
            .eq("id", employee_id)\
            .single()\
            .execute()
        
        if not employee.data:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )
        
        # Verify employee belongs to manager's property
        if employee.data.get('property_id') != property_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this employee"
            )
        
        # Get I-9 Section 1 data
        i9_section_1 = None
        try:
            i9_result = supabase_service.client.table("i9_forms")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("section", "section_1")\
                .single()\
                .execute()
            if i9_result.data:
                i9_section_1 = i9_result.data
        except Exception as e:
            logger.warning(f"No I-9 Section 1 found for employee {employee_id}: {e}")
        
        # Get I-9 documents
        i9_documents = []
        try:
            docs_result = supabase_service.client.table("onboarding_documents")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("document_type", "i9_verification")\
                .execute()
            i9_documents = docs_result.data or []
        except Exception as e:
            logger.warning(f"No I-9 documents found for employee {employee_id}: {e}")
        
        # Get W-4 data
        w4_data = None
        try:
            w4_result = supabase_service.client.table("w4_forms")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .single()\
                .execute()
            if w4_result.data:
                w4_data = w4_result.data
        except Exception as e:
            logger.warning(f"No W-4 found for employee {employee_id}: {e}")
        
        # Get health insurance data
        health_insurance_data = None
        try:
            insurance_result = supabase_service.client.table("health_insurance_enrollments")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .single()\
                .execute()
            if insurance_result.data:
                health_insurance_data = insurance_result.data
        except Exception as e:
            logger.warning(f"No health insurance found for employee {employee_id}: {e}")
        
        # Get employer profile for auto-fill
        employer_profile = None
        try:
            # Use admin_client to bypass RLS for employer profiles
            profile_result = supabase_service.admin_client.table("employer_profiles")\
                .select("*")\
                .eq("property_id", property_id)\
                .eq("is_active", True)\
                .execute()
            if profile_result.data:
                employer_profile = profile_result.data[0] if profile_result.data else None
        except Exception as e:
            logger.warning(f"No employer profile found for property {property_id}: {e}")
        
        # Get OCR data if available (for confidence scores)
        ocr_data = None
        # TODO: Implement OCR data retrieval when OCR service is ready
        
        # Build response
        response_data = {
            "success": True,
            "employee_id": employee_id,
            "employee_info": {
                "personal_info": employee.data.get('personal_info', {}),
                "position": employee.data.get('position'),
                "department": employee.data.get('department'),
                "start_date": employee.data.get('start_date'),
                "employment_type": employee.data.get('employment_type'),
            },
            "onboarding_progress": employee.data.get('onboarding_progress', {}),
            "i9_section_1": i9_section_1,
            "i9_documents": i9_documents,
            "w4_data": w4_data,
            "health_insurance_data": health_insurance_data,
            "employer_profile": employer_profile,
            "ocr_data": ocr_data,
            "has_employer_profile": employer_profile is not None
        }
        
        logger.info(f"Retrieved review data for employee {employee_id}")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee review data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get employee review data"
        )


@router.get("/employees/{employee_id}/i9-section-2-data")
async def get_i9_section_2_data(
    employee_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Get I-9 Section 2 data with auto-filled employer information
    """
    try:
        # Verify access
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Access denied")

        property_id = current_user.property_id
        
        # Get employee
        employee = supabase_service.client.table("employees")\
            .select("*")\
            .eq("id", employee_id)\
            .single()\
            .execute()
        
        if not employee.data or employee.data.get('property_id') != property_id:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get I-9 Section 1 (may not exist yet)
        i9_section_1 = None
        try:
            i9_section_1_response = supabase_service.client.table("i9_forms")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("section", "section_1")\
                .execute()
            i9_section_1 = i9_section_1_response.data[0] if i9_section_1_response.data else None
        except Exception as e:
            logger.warning(f"Could not fetch I-9 Section 1: {e}")

        # Try to get I-9 documents (table may not exist)
        documents_data = []
        try:
            documents_response = supabase_service.client.table("onboarding_documents")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("document_type", "i9_verification")\
                .execute()
            documents_data = documents_response.data if documents_response.data else []
        except Exception as e:
            logger.warning(f"Could not fetch onboarding_documents: {e}")

        # Get employer profile (may not exist)
        employer_profile = None
        try:
            employer_profile_response = supabase_service.client.table("employer_profiles")\
                .select("*")\
                .eq("property_id", property_id)\
                .eq("is_active", True)\
                .execute()
            employer_profile = employer_profile_response.data[0] if employer_profile_response.data else None
        except Exception as e:
            logger.warning(f"Could not fetch employer profile: {e}")
        
        # Build I-9 Section 2 form data
        employee_data = employee.data if employee.data else {}
        form_data = {
            "employee_first_day": {
                "value": employee_data.get('start_date'),
                "source": "employee_record",
                "editable": True
            }
        }
        
        # Add document data from I-9 documents
        if documents_data:
            # Assume first document is List A or List B
            doc = documents_data[0]
            doc_metadata = doc.get('metadata', {})

            form_data["document_title"] = {
                "value": doc_metadata.get('document_type', ''),
                "source": "uploaded_document",
                "editable": True,
                "confidence": doc_metadata.get('ocr_confidence')
            }

            form_data["issuing_authority"] = {
                "value": doc_metadata.get('issuing_authority', ''),
                "source": "uploaded_document",
                "editable": True,
                "confidence": doc_metadata.get('ocr_confidence')
            }

            form_data["document_number"] = {
                "value": doc_metadata.get('document_number', ''),
                "source": "uploaded_document",
                "editable": True,
                "confidence": doc_metadata.get('ocr_confidence')
            }

            form_data["expiration_date"] = {
                "value": doc_metadata.get('expiration_date', ''),
                "source": "uploaded_document",
                "editable": True,
                "confidence": doc_metadata.get('ocr_confidence')
            }

        # Add employer information (auto-filled, not editable)
        if employer_profile:
            profile = employer_profile
            
            form_data["employer_business_name"] = {
                "value": profile.get('i9_business_name') or profile.get('business_legal_name'),
                "source": "employer_profile",
                "editable": False
            }
            
            form_data["employer_address"] = {
                "value": profile.get('i9_business_address') or f"{profile.get('street_address')}, {profile.get('city')}, {profile.get('state')} {profile.get('zip_code')}",
                "source": "employer_profile",
                "editable": False
            }
            
            form_data["employer_representative_name"] = {
                "value": profile.get('i9_employer_name') or f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or 'Manager',
                "source": "employer_profile",
                "editable": False
            }
            
            form_data["employer_representative_title"] = {
                "value": profile.get('i9_employer_title') or 'Manager',
                "source": "employer_profile",
                "editable": False
            }
        
        return {
            "success": True,
            "employee": employee_data,
            "i9_section_1": i9_section_1,
            "documents": documents_data,
            "form_data": form_data,
            "has_employer_profile": employer_profile is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting I-9 Section 2 data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/employer-profile/quick-save")
async def quick_save_employer_profile(
    payload: QuickEmployerProfileRequest,
    current_user = Depends(get_current_user)
):
    """Persist minimal employer profile data so future reviews auto-fill"""
    try:
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(status_code=403, detail="Only managers can update employer profile")

        property_id = current_user.property_id
        if not property_id:
            raise HTTPException(status_code=400, detail="Property ID not found for manager")

        try:
            existing_profile = supabase_service.client.table('employer_profiles') \
                .select('id') \
                .eq('property_id', property_id) \
                .eq('is_active', True) \
                .execute()
            existing_id = existing_profile.data[0].get('id') if existing_profile.data else None
        except Exception:
            existing_id = None

        profile_payload = {
            "property_id": property_id,
            "i9_employer_name": payload.employerName,
            "i9_employer_title": payload.employerTitle,
            "i9_business_name": payload.businessName,
            "i9_business_address": payload.businessAddress,
            "city": payload.city,
            "state": payload.state,
            "zip_code": payload.zipCode,
            "ein": payload.ein,
            "business_legal_name": payload.businessName,
            "dba_name": payload.businessName,
            "street_address": payload.businessAddress,
            "is_active": True,
            "updated_at": datetime.utcnow().isoformat()
        }

        if existing_id:
            profile_payload['id'] = existing_id
        else:
            profile_payload['id'] = str(uuid4())
            profile_payload['created_at'] = datetime.utcnow().isoformat()

        logger.info(f"[EMPLOYER-SAVE] Saving profile for property {property_id}: {profile_payload}")
        result = supabase_service.admin_client.table('employer_profiles') \
            .upsert(profile_payload, on_conflict='property_id') \
            .execute()
        logger.info(f"[EMPLOYER-SAVE] Save result: {result.data}")

        return {
            "success": True,
            "profile": profile_payload
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save employer profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to save employer profile")
