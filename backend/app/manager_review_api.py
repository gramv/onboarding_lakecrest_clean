"""
Manager Review API Endpoints
Handles manager review workflow for completed employee onboarding
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from .auth import get_current_user, get_current_manager
from .models import User, UserRole
from .property_access_control import get_property_access_controller
from .supabase_service_enhanced import EnhancedSupabaseService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/manager", tags=["Manager Review"])

# Pydantic models for request/response
class ReviewActionRequest(BaseModel):
    """Request model for review actions"""
    comments: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ReviewNotesRequest(BaseModel):
    """Request model for adding review notes"""
    document_type: Optional[str] = None
    comments: str
    metadata: Optional[Dict[str, Any]] = None

class ApproveReviewRequest(BaseModel):
    """Request model for approving review"""
    comments: Optional[str] = None

# =====================================================
# MANAGER REVIEW ENDPOINTS
# =====================================================

def get_supabase_service():
    """Dependency to get Supabase service instance"""
    return EnhancedSupabaseService()


@router.get("/pending-reviews")
async def get_pending_reviews(
    current_user: User = Depends(get_current_manager),
    supabase_service: EnhancedSupabaseService = Depends(get_supabase_service)
):
    """
    Get list of employees pending manager review
    
    Returns employees who have completed onboarding and are awaiting manager review.
    Filtered by manager's assigned properties.
    """
    try:
        logger.info(f"Manager {current_user.id} requesting pending reviews")
        
        # Get manager's properties
        access_controller = get_property_access_controller()
        manager_properties = access_controller.get_manager_properties(current_user.id)
        
        if not manager_properties:
            logger.warning(f"Manager {current_user.id} has no assigned properties")
            return {
                "success": True,
                "data": [],
                "message": "No properties assigned to manager"
            }
        
        # Query employees pending review using the view
        result = supabase_service.client.from_('employees_pending_manager_review')\
            .select('*')\
            .in_('property_id', manager_properties)\
            .order('onboarding_completed_at', desc=True)\
            .execute()

        employees = result.data if result.data else []

        # WORKAROUND: Enrich employee data with missing fields from employees table
        # This is needed until migration 010 is run to fix the view
        enriched_employees = []
        for emp in employees:
            # If names are missing, fetch from employees table
            if not emp.get('first_name') or not emp.get('last_name'):
                emp_result = supabase_service.client.from_('employees')\
                    .select('personal_info, start_date, onboarding_completed_at')\
                    .eq('id', emp['id'])\
                    .single()\
                    .execute()

                if emp_result.data:
                    personal_info = emp_result.data.get('personal_info', {})
                    emp['first_name'] = personal_info.get('first_name') or personal_info.get('firstName')
                    emp['last_name'] = personal_info.get('last_name') or personal_info.get('lastName')
                    emp['position'] = personal_info.get('job_title') or emp.get('position')

                    # Calculate I-9 deadline if missing
                    if not emp.get('i9_section2_deadline'):
                        from datetime import datetime, timedelta
                        start_date = emp_result.data.get('start_date') or emp_result.data.get('onboarding_completed_at')
                        if start_date:
                            if isinstance(start_date, str):
                                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                            # Add 3 business days
                            deadline = start_date + timedelta(days=3)
                            emp['i9_section2_deadline'] = deadline.date().isoformat()
                            emp['days_until_i9_deadline'] = (deadline.date() - datetime.now().date()).days

                            # Calculate urgency level
                            days_remaining = emp['days_until_i9_deadline']
                            if days_remaining < 0:
                                emp['i9_urgency_level'] = 'overdue'
                            elif days_remaining <= 1:
                                emp['i9_urgency_level'] = 'urgent'
                            elif days_remaining <= 2:
                                emp['i9_urgency_level'] = 'warning'
                            else:
                                emp['i9_urgency_level'] = 'normal'

            enriched_employees.append(emp)

        logger.info(f"Found {len(enriched_employees)} employees pending review for manager {current_user.id}")

        return {
            "success": True,
            "data": enriched_employees,
            "count": len(enriched_employees)
        }
        
    except Exception as e:
        logger.error(f"Failed to get pending reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get pending reviews: {str(e)}")


@router.get("/employees/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    current_user: User = Depends(get_current_manager),
    supabase_service: EnhancedSupabaseService = Depends(get_supabase_service)
):
    """
    Get all signed documents for an employee
    
    Returns all completed onboarding documents including:
    - I-9 Section 1
    - W-4
    - Direct Deposit
    - Health Insurance
    - Company Policies
    - Weapons Policy
    - Final Review Signature
    """
    try:
        logger.info(f"Manager {current_user.id} requesting documents for employee {employee_id}")

        # Get employee info first
        employee = await supabase_service.get_employee_by_id(employee_id)
        if not employee:
            logger.warning(f"Employee {employee_id} not found")
            raise HTTPException(status_code=404, detail="Employee not found")

        # Verify manager has access to this employee's property
        access_controller = get_property_access_controller()
        manager_properties = access_controller.get_manager_properties(current_user.id)

        # Get employee property_id
        emp_property_id = employee.property_id if hasattr(employee, 'property_id') else employee.get('property_id')

        logger.info(f"Manager {current_user.id} properties: {manager_properties}")
        logger.info(f"Employee {employee_id} property: {emp_property_id}")

        if emp_property_id not in manager_properties:
            logger.warning(f"Manager {current_user.id} denied access to employee {employee_id} (property {emp_property_id})")
            raise HTTPException(status_code=403, detail="Access denied to this employee")
        
        # Get all documents for this employee
        documents = await supabase_service.get_employee_documents(employee_id)
        
        # Format response with friendly names and metadata
        formatted_documents = []
        
        document_type_mapping = {
            'i9_section1': 'I-9 Employment Eligibility (Section 1)',
            'w4': 'W-4 Tax Withholding',
            'direct_deposit': 'Direct Deposit Authorization',
            'health_insurance': 'Health Insurance Enrollment',
            'company_policies': 'Company Policies Acknowledgment',
            'weapons_policy': 'Weapons Policy Acknowledgment',
            'final_review': 'Final Review & Signature'
        }
        
        for doc in documents:
            doc_type = doc.get('document_type', 'unknown')
            formatted_documents.append({
                'id': doc.get('id'),
                'type': doc_type,
                'name': document_type_mapping.get(doc_type, doc_type.replace('_', ' ').title()),
                'signed_at': doc.get('signed_at') or doc.get('created_at'),
                'pdf_url': doc.get('pdf_url'),
                'status': 'completed',
                'metadata': doc.get('metadata', {})
            })
        
        # Sort by signed_at date
        formatted_documents.sort(key=lambda x: x.get('signed_at', ''), reverse=False)
        
        logger.info(f"Retrieved {len(formatted_documents)} documents for employee {employee_id}")

        # Extract employee info (handle both dict and Employee object)
        if isinstance(employee, dict):
            emp_id = employee.get('id')
            personal_info = employee.get('personal_info', {})
            first_name = personal_info.get('first_name') or personal_info.get('firstName', '')
            last_name = personal_info.get('last_name') or personal_info.get('lastName', '')
            position = employee.get('position')
            property_id = employee.get('property_id')
            onboarding_status = employee.get('onboarding_status')
            i9_section2_deadline = employee.get('i9_section2_deadline')
            i9_section2_status = employee.get('i9_section2_status', 'pending')
        else:
            # Employee object (Pydantic model) - use getattr with default
            emp_id = employee.id
            personal_info = employee.personal_info or {}
            first_name = personal_info.get('first_name') or personal_info.get('firstName', '')
            last_name = personal_info.get('last_name') or personal_info.get('lastName', '')
            position = employee.position
            property_id = employee.property_id
            onboarding_status = employee.onboarding_status
            i9_section2_deadline = getattr(employee, 'i9_section2_deadline', None)
            i9_section2_status = getattr(employee, 'i9_section2_status', 'pending')

        return {
            "success": True,
            "data": {
                "employee": {
                    "id": emp_id,
                    "name": f"{first_name} {last_name}".strip() or "Unknown",
                    "position": position,
                    "property_id": property_id,
                    "onboarding_status": onboarding_status
                },
                "documents": formatted_documents,
                "i9_section2_required": True,
                "i9_section2_deadline": i9_section2_deadline,
                "i9_section2_status": i9_section2_status
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get employee documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee documents: {str(e)}")


@router.post("/employees/{employee_id}/start-review")
async def start_review(
    employee_id: str,
    request: ReviewActionRequest,
    current_user: User = Depends(get_current_manager),
    supabase_service: EnhancedSupabaseService = Depends(get_supabase_service)
):
    """
    Mark that manager has started reviewing an employee's onboarding
    
    Updates employee status and logs the action for audit trail.
    """
    try:
        logger.info(f"Manager {current_user.id} starting review for employee {employee_id}")
        
        # Verify access
        access_controller = get_property_access_controller()
        if not access_controller.validate_manager_employee_access(current_user, employee_id):
            raise HTTPException(status_code=403, detail="Access denied to this employee")
        
        # Update employee status
        update_data = {
            'manager_review_status': 'manager_reviewing',
            'manager_review_started_at': datetime.now(timezone.utc).isoformat(),
            'manager_reviewed_by': current_user.id
        }
        
        supabase_service.client.table('employees')\
            .update(update_data)\
            .eq('id', employee_id)\
            .execute()
        
        # Log action to audit trail
        audit_data = {
            'employee_id': employee_id,
            'manager_id': current_user.id,
            'action_type': 'started_review',
            'comments': request.comments,
            'metadata': {
                **(request.metadata or {}),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        }
        
        supabase_service.client.table('manager_review_actions')\
            .insert(audit_data)\
            .execute()
        
        logger.info(f"Manager {current_user.id} started review for employee {employee_id}")
        
        return {
            "success": True,
            "message": "Review started successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start review: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start review: {str(e)}")


@router.post("/employees/{employee_id}/review-notes")
async def add_review_notes(
    employee_id: str,
    request: ReviewNotesRequest,
    current_user: User = Depends(get_current_manager),
    supabase_service: EnhancedSupabaseService = Depends(get_supabase_service)
):
    """
    Add review notes for an employee or specific document
    
    Allows managers to add comments during the review process.
    """
    try:
        logger.info(f"Manager {current_user.id} adding review notes for employee {employee_id}")
        
        # Verify access
        access_controller = get_property_access_controller()
        if not access_controller.validate_manager_employee_access(current_user, employee_id):
            raise HTTPException(status_code=403, detail="Access denied to this employee")
        
        # Log action to audit trail
        audit_data = {
            'employee_id': employee_id,
            'manager_id': current_user.id,
            'action_type': 'added_note',
            'document_type': request.document_type,
            'comments': request.comments,
            'metadata': {
                **(request.metadata or {}),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        }
        
        supabase_service.client.table('manager_review_actions')\
            .insert(audit_data)\
            .execute()
        
        logger.info(f"Manager {current_user.id} added review notes for employee {employee_id}")

        return {
            "success": True,
            "message": "Review notes added successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add review notes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add review notes: {str(e)}")


@router.post("/employees/{employee_id}/approve-review")
async def approve_review(
    employee_id: str,
    request: ApproveReviewRequest,
    current_user: User = Depends(get_current_manager),
    supabase_service: EnhancedSupabaseService = Depends(get_supabase_service)
):
    """
    Approve employee onboarding after review

    This should only be called AFTER I-9 Section 2 is completed.
    Updates employee status to approved and logs the action.
    """
    try:
        logger.info(f"Manager {current_user.id} approving review for employee {employee_id}")

        # Verify access
        access_controller = get_property_access_controller()
        if not access_controller.validate_manager_employee_access(current_user, employee_id):
            raise HTTPException(status_code=403, detail="Access denied to this employee")

        # Get employee to check I-9 Section 2 status
        employee = await supabase_service.get_employee_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Check if I-9 Section 2 is completed
        i9_section2_status = employee.i9_section2_status if hasattr(employee, 'i9_section2_status') else employee.get('i9_section2_status')

        if i9_section2_status != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Cannot approve review: I-9 Section 2 must be completed first"
            )

        # Update employee status
        update_data = {
            'manager_review_status': 'approved',
            'manager_review_completed_at': datetime.now(timezone.utc).isoformat(),
            'manager_reviewed_by': current_user.id,
            'manager_review_comments': request.comments
        }

        supabase_service.client.table('employees')\
            .update(update_data)\
            .eq('id', employee_id)\
            .execute()

        # Log action to audit trail
        audit_data = {
            'employee_id': employee_id,
            'manager_id': current_user.id,
            'action_type': 'approved',
            'comments': request.comments,
            'metadata': {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'i9_section2_status': i9_section2_status
            }
        }

        supabase_service.client.table('manager_review_actions')\
            .insert(audit_data)\
            .execute()

        logger.info(f"Manager {current_user.id} approved review for employee {employee_id}")

        # TODO: Send notification to HR for final approval

        return {
            "success": True,
            "message": "Employee onboarding approved successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to approve review: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve review: {str(e)}")

