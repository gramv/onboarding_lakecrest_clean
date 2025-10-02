"""
Navigation Validation Router
Handles navigation validation and step completion requirements
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging
from app.auth import get_current_user
from app.supabase_service_enhanced import EnhancedSupabaseService as SupabaseService
from app.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/navigation", tags=["navigation"])

# Navigation validation models
class NavigationRequest(BaseModel):
    from_step: str
    to_step: str
    employee_id: str
    property_id: str
    employee_data: Optional[Dict] = None

class NavigationValidationResponse(BaseModel):
    allowed: bool
    reason: Optional[str] = None
    missing_requirements: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    next_allowed_steps: Optional[List[str]] = None

class StepRequirement(BaseModel):
    step_id: str
    step_name: str
    required_fields: List[str]
    prerequisite_steps: List[str]
    can_skip: bool
    federal_requirements: Optional[Dict] = None

class NavigationProgress(BaseModel):
    current_step: str
    completed_steps: List[str]
    in_progress_steps: List[str]
    available_steps: List[str]
    blocked_steps: List[str]
    completion_percentage: float
    estimated_time_remaining: int  # minutes
    last_activity: datetime

# Step requirements configuration
STEP_REQUIREMENTS = {
    "personal-info": {
        "name": "Personal Information",
        "required_fields": ["firstName", "lastName", "email", "phone", "dateOfBirth", "ssn"],
        "prerequisite_steps": [],
        "can_skip": False,
        "federal_requirements": None
    },
    "emergency-contact": {
        "name": "Emergency Contact",
        "required_fields": ["contactName", "contactPhone", "relationship"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": None
    },
    "i9-section1": {
        "name": "I-9 Section 1",
        "required_fields": ["citizenshipStatus", "signature", "signatureDate"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": {
            "deadline": "first_day_of_work",
            "validation": "strict"
        }
    },
    "document-upload": {
        "name": "Document Upload",
        "required_fields": ["documentType", "documentFiles"],
        "prerequisite_steps": ["i9-section1"],
        "can_skip": False,
        "federal_requirements": {
            "acceptable_documents": "list_a_or_list_b_and_c"
        }
    },
    "w4-info": {
        "name": "W-4 Tax Information",
        "required_fields": ["filingStatus", "multipleJobs", "dependents", "otherIncome", "deductions", "extraWithholding"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": {
            "form_year": "2025",
            "validation": "irs_rules"
        }
    },
    "direct-deposit": {
        "name": "Direct Deposit",
        "required_fields": ["bankName", "accountNumber", "routingNumber", "accountType"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": True,
        "federal_requirements": None
    },
    "health-insurance": {
        "name": "Health Insurance",
        "required_fields": ["coverage_selection"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": True,
        "federal_requirements": None
    },
    "handbook-acknowledgment": {
        "name": "Handbook Acknowledgment",
        "required_fields": ["acknowledged", "signature"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": None
    },
    "policies-review": {
        "name": "Company Policies",
        "required_fields": ["policies_acknowledged", "signature"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": None
    },
    "human-trafficking": {
        "name": "Human Trafficking Training",
        "required_fields": ["training_completed", "signature"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": {
            "state_requirement": "california"
        }
    },
    "weapons-policy": {
        "name": "Weapons Policy",
        "required_fields": ["policy_acknowledged", "signature"],
        "prerequisite_steps": ["personal-info"],
        "can_skip": False,
        "federal_requirements": None
    }
}

# Step order for navigation
STEP_ORDER = [
    "personal-info",
    "emergency-contact",
    "i9-section1",
    "document-upload",
    "w4-info",
    "direct-deposit",
    "health-insurance",
    "handbook-acknowledgment",
    "policies-review",
    "human-trafficking",
    "weapons-policy"
]

@router.post("/validate", response_model=NavigationValidationResponse)
async def validate_navigation(
    request: NavigationRequest,
    current_user: User = Depends(get_current_user),
    supabase_service: SupabaseService = Depends(lambda: SupabaseService())
):
    """
    Validate if navigation from one step to another is allowed
    """
    try:
        # Get employee data
        employee = await supabase_service.get_employee(
            request.employee_id,
            request.property_id
        )
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Check property access
        if current_user.role == "manager" and current_user.property_id != request.property_id:
            raise HTTPException(status_code=403, detail="Access denied to this property")
        
        # Get completed steps
        progress = employee.get("onboarding_progress", {})
        completed_steps = progress.get("completed_steps", [])
        
        # Validate navigation
        validation_result = await _validate_step_navigation(
            request.from_step,
            request.to_step,
            completed_steps,
            employee
        )
        
        return validation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Navigation validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/requirements/{step_id}", response_model=StepRequirement)
async def get_step_requirements(
    step_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get requirements for a specific step
    """
    if step_id not in STEP_REQUIREMENTS:
        raise HTTPException(status_code=404, detail="Step not found")
    
    req = STEP_REQUIREMENTS[step_id]
    return StepRequirement(
        step_id=step_id,
        step_name=req["name"],
        required_fields=req["required_fields"],
        prerequisite_steps=req["prerequisite_steps"],
        can_skip=req["can_skip"],
        federal_requirements=req.get("federal_requirements")
    )

@router.post("/can-skip/{step_id}")
async def check_can_skip(
    step_id: str,
    employee_id: str = Body(...),
    property_id: str = Body(...),
    current_user: User = Depends(get_current_user),
    supabase_service: SupabaseService = Depends(lambda: SupabaseService())
):
    """
    Check if a step can be skipped
    """
    if step_id not in STEP_REQUIREMENTS:
        raise HTTPException(status_code=404, detail="Step not found")
    
    # Check property access
    if current_user.role == "manager" and current_user.property_id != property_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    step_config = STEP_REQUIREMENTS[step_id]
    can_skip = step_config["can_skip"]
    
    # Additional business logic for skipping
    if step_id == "direct-deposit":
        # Can skip but will need paper check setup
        return {
            "can_skip": True,
            "warning": "Employee will receive paper checks if direct deposit is skipped",
            "alternative_required": "paper_check_setup"
        }
    elif step_id == "health-insurance":
        # Can skip during open enrollment period
        return {
            "can_skip": True,
            "warning": "Employee can enroll during next open enrollment period",
            "deadline": "next_open_enrollment"
        }
    
    return {
        "can_skip": can_skip,
        "warning": None if can_skip else "This step is required and cannot be skipped"
    }

@router.get("/progress", response_model=NavigationProgress)
async def get_navigation_progress(
    employee_id: str,
    property_id: str,
    current_user: User = Depends(get_current_user),
    supabase_service: SupabaseService = Depends(lambda: SupabaseService())
):
    """
    Get detailed navigation progress for an employee
    """
    try:
        # Check property access
        if current_user.role == "manager" and current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get employee data
        employee = await supabase_service.get_employee(employee_id, property_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        progress = employee.get("onboarding_progress", {})
        completed_steps = progress.get("completed_steps", [])
        current_step = progress.get("current_step", "personal-info")
        
        # Calculate available and blocked steps
        available_steps = []
        blocked_steps = []
        in_progress_steps = []
        
        for step_id in STEP_ORDER:
            if step_id in completed_steps:
                continue
                
            step_req = STEP_REQUIREMENTS[step_id]
            prerequisites_met = all(
                prereq in completed_steps 
                for prereq in step_req["prerequisite_steps"]
            )
            
            if prerequisites_met:
                if step_id == current_step:
                    in_progress_steps.append(step_id)
                else:
                    available_steps.append(step_id)
            else:
                blocked_steps.append(step_id)
        
        # Calculate completion percentage
        total_steps = len(STEP_ORDER)
        completed_count = len(completed_steps)
        completion_percentage = (completed_count / total_steps) * 100
        
        # Estimate time remaining (15 minutes per remaining step average)
        remaining_steps = total_steps - completed_count
        estimated_time = remaining_steps * 15
        
        # Get last activity
        last_activity = progress.get("last_updated", datetime.utcnow())
        if isinstance(last_activity, str):
            last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
        
        return NavigationProgress(
            current_step=current_step,
            completed_steps=completed_steps,
            in_progress_steps=in_progress_steps,
            available_steps=available_steps,
            blocked_steps=blocked_steps,
            completion_percentage=completion_percentage,
            estimated_time_remaining=estimated_time,
            last_activity=last_activity
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Progress fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-step-data/{step_id}")
async def validate_step_data(
    step_id: str,
    step_data: Dict = Body(...),
    employee_id: str = Body(...),
    property_id: str = Body(...),
    current_user: User = Depends(get_current_user),
    supabase_service: SupabaseService = Depends(lambda: SupabaseService())
):
    """
    Validate data for a specific step before saving
    """
    try:
        if step_id not in STEP_REQUIREMENTS:
            raise HTTPException(status_code=404, detail="Step not found")
        
        # Check property access
        if current_user.role == "manager" and current_user.property_id != property_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        step_req = STEP_REQUIREMENTS[step_id]
        validation_errors = []
        
        # Check required fields
        for field in step_req["required_fields"]:
            if field not in step_data or not step_data[field]:
                validation_errors.append(f"Missing required field: {field}")
        
        # Federal validation for specific steps
        if step_id == "i9-section1" and not validation_errors:
            federal_validator = FederalValidator()
            i9_validation = await federal_validator.validate_i9_section1(step_data)
            if not i9_validation["valid"]:
                validation_errors.extend(i9_validation.get("errors", []))
        
        elif step_id == "w4-info" and not validation_errors:
            federal_validator = FederalValidator()
            w4_validation = await federal_validator.validate_w4(step_data)
            if not w4_validation["valid"]:
                validation_errors.extend(w4_validation.get("errors", []))
        
        elif step_id == "direct-deposit" and not validation_errors:
            # Validate routing number
            routing_number = step_data.get("routingNumber", "")
            if not _validate_routing_number(routing_number):
                validation_errors.append("Invalid routing number")
        
        return {
            "valid": len(validation_errors) == 0,
            "errors": validation_errors,
            "warnings": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Step validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def _validate_step_navigation(
    from_step: str,
    to_step: str,
    completed_steps: List[str],
    employee: Dict
) -> NavigationValidationResponse:
    """
    Validate navigation between steps
    """
    # Allow navigation to already completed steps
    if to_step in completed_steps:
        return NavigationValidationResponse(
            allowed=True,
            reason="Navigating to completed step"
        )
    
    # Check if target step exists
    if to_step not in STEP_REQUIREMENTS:
        return NavigationValidationResponse(
            allowed=False,
            reason="Invalid target step"
        )
    
    target_req = STEP_REQUIREMENTS[to_step]
    
    # Check prerequisites
    missing_prereqs = []
    for prereq in target_req["prerequisite_steps"]:
        if prereq not in completed_steps:
            missing_prereqs.append(prereq)
    
    if missing_prereqs:
        return NavigationValidationResponse(
            allowed=False,
            reason="Prerequisites not met",
            missing_requirements=missing_prereqs,
            next_allowed_steps=[
                step for step in STEP_ORDER
                if step not in completed_steps and
                all(prereq in completed_steps 
                    for prereq in STEP_REQUIREMENTS[step]["prerequisite_steps"])
            ]
        )
    
    # Check federal deadlines
    warnings = []
    if target_req.get("federal_requirements"):
        fed_req = target_req["federal_requirements"]
        if fed_req.get("deadline") == "first_day_of_work":
            start_date = employee.get("start_date")
            if start_date:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if datetime.utcnow() >= start_date:
                    warnings.append("This step should have been completed by first day of work")
    
    return NavigationValidationResponse(
        allowed=True,
        warnings=warnings if warnings else None
    )

def _validate_routing_number(routing_number: str) -> bool:
    """
    Validate bank routing number using checksum algorithm
    """
    if not routing_number or len(routing_number) != 9:
        return False
    
    try:
        # ABA routing number checksum validation
        weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
        checksum = sum(int(routing_number[i]) * weights[i] for i in range(9))
        return checksum % 10 == 0
    except:
        return False