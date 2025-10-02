"""
Enhanced Employee Management API Endpoints
Provides comprehensive employee lifecycle management, performance tracking, and communication tools
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import json

from .auth import get_current_user, require_hr_role, require_manager_role, require_hr_or_manager_role
from .models_enhanced import UserRole
from .services.employee_management_service import EmployeeManagementService, EmployeeLifecycleStage, PerformanceRating, GoalStatus
from .supabase_service_enhanced import EnhancedSupabaseService

from .response_utils import success_response, error_response

def get_supabase_service():
    return EnhancedSupabaseService()

router = APIRouter(prefix="/api/employee-management", tags=["Employee Management"])

# =====================================
# EMPLOYEE PROFILE AND LIFECYCLE
# =====================================

@router.get("/employees/{employee_id}/profile")
async def get_employee_profile(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get comprehensive employee profile"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        profile = await employee_service.get_employee_profile(employee_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        return success_response(
            data={
                "profile": {
                    "id": profile.id,
                    "employee_number": profile.employee_number,
                    "personal_info": profile.personal_info,
                    "employment_info": profile.employment_info,
                    "onboarding_progress": profile.onboarding_progress,
                    "performance_metrics": profile.performance_metrics,
                    "lifecycle_stage": profile.lifecycle_stage.value,
                    "goals": profile.goals,
                    "reviews": profile.reviews,
                    "communications": profile.communications[-10:],  # Last 10 communications
                    "milestones": profile.milestones[-20:]  # Last 20 milestones
                }
            },
            message="Employee profile retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get employee profile: {str(e)}")

@router.put("/employees/{employee_id}/lifecycle-stage")
async def update_employee_lifecycle_stage(
    employee_id: str,
    stage: str = Form(...),
    notes: str = Form(""),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Update employee lifecycle stage"""
    try:
        # Validate stage
        try:
            lifecycle_stage = EmployeeLifecycleStage(stage)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid lifecycle stage")
        
        employee_service = EmployeeManagementService(supabase_service)
        success = await employee_service.update_employee_lifecycle_stage(
            employee_id, lifecycle_stage, notes
        )
        
        if success:
            return success_response(
                message=f"Employee lifecycle stage updated to {stage}"
            )
        else:
            return error_response("Failed to update lifecycle stage")
            
    except Exception as e:
        return error_response(f"Failed to update lifecycle stage: {str(e)}")

@router.get("/employees/{employee_id}/milestones")
async def get_employee_milestones(
    employee_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get employee milestones"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        milestones = await employee_service._get_employee_milestones(employee_id)
        
        return success_response(
            data={"milestones": milestones[:limit]},
            message="Employee milestones retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get employee milestones: {str(e)}")

# =====================================
# PERFORMANCE MANAGEMENT
# =====================================

@router.get("/employees/{employee_id}/goals")
async def get_employee_goals(
    employee_id: str,
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get employee goals"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        goals = await employee_service.get_employee_goals(employee_id, status)
        
        return success_response(
            data={"goals": goals},
            message="Employee goals retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get employee goals: {str(e)}")

@router.post("/employees/{employee_id}/goals")
async def create_employee_goal(
    employee_id: str,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form("general"),
    target_value: Optional[float] = Form(None),
    unit: Optional[str] = Form(None),
    priority: str = Form("medium"),
    due_date: str = Form(...),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Create a new performance goal for employee"""
    try:
        # Parse due date
        try:
            due_date_obj = datetime.strptime(due_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due date format. Use YYYY-MM-DD")
        
        goal_data = {
            "employee_id": employee_id,
            "title": title,
            "description": description,
            "category": category,
            "target_value": target_value,
            "unit": unit,
            "priority": priority,
            "due_date": due_date_obj.isoformat(),
            "created_by": current_user["id"]
        }
        
        employee_service = EmployeeManagementService(supabase_service)
        goal_id = await employee_service.create_performance_goal(goal_data)
        
        if goal_id:
            return success_response(
                data={"goal_id": goal_id},
                message="Performance goal created successfully"
            )
        else:
            return error_response("Failed to create performance goal")
            
    except Exception as e:
        return error_response(f"Failed to create performance goal: {str(e)}")

@router.put("/goals/{goal_id}/progress")
async def update_goal_progress(
    goal_id: str,
    current_value: float = Form(...),
    notes: str = Form(""),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Update goal progress"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        success = await employee_service.update_goal_progress(goal_id, current_value, notes)
        
        if success:
            return success_response(message="Goal progress updated successfully")
        else:
            return error_response("Failed to update goal progress")
            
    except Exception as e:
        return error_response(f"Failed to update goal progress: {str(e)}")

@router.get("/employees/{employee_id}/reviews")
async def get_employee_reviews(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get employee performance reviews"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        reviews = await employee_service.get_employee_reviews(employee_id)
        
        return success_response(
            data={"reviews": reviews},
            message="Employee reviews retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get employee reviews: {str(e)}")

@router.post("/employees/{employee_id}/reviews")
async def create_performance_review(
    employee_id: str,
    review_period_start: str = Form(...),
    review_period_end: str = Form(...),
    overall_rating: str = Form(...),
    goals_achievement: str = Form("{}"),
    strengths: str = Form("[]"),
    areas_for_improvement: str = Form("[]"),
    development_plan: str = Form("{}"),
    comments: str = Form(""),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Create a performance review"""
    try:
        # Validate rating
        try:
            rating = PerformanceRating(overall_rating)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid performance rating")
        
        # Parse dates
        try:
            start_date = datetime.strptime(review_period_start, "%Y-%m-%d").date()
            end_date = datetime.strptime(review_period_end, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Parse JSON fields
        try:
            goals_data = json.loads(goals_achievement)
            strengths_data = json.loads(strengths)
            areas_data = json.loads(areas_for_improvement)
            development_data = json.loads(development_plan)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format in review data")
        
        review_data = {
            "employee_id": employee_id,
            "reviewer_id": current_user["id"],
            "review_period_start": start_date.isoformat(),
            "review_period_end": end_date.isoformat(),
            "overall_rating": rating.value,
            "goals_achievement": goals_data,
            "strengths": strengths_data,
            "areas_for_improvement": areas_data,
            "development_plan": development_data,
            "comments": comments
        }
        
        employee_service = EmployeeManagementService(supabase_service)
        review_id = await employee_service.create_performance_review(review_data)
        
        if review_id:
            return success_response(
                data={"review_id": review_id},
                message="Performance review created successfully"
            )
        else:
            return error_response("Failed to create performance review")
            
    except Exception as e:
        return error_response(f"Failed to create performance review: {str(e)}")

# =====================================
# COMMUNICATION TOOLS
# =====================================

@router.post("/employees/message")
async def send_employee_message(
    recipient_ids: str = Form(...),  # JSON array of employee IDs
    subject: str = Form(...),
    content: str = Form(...),
    message_type: str = Form("general"),
    priority: str = Form("normal"),
    template_id: Optional[str] = Form(None),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Send message to employees"""
    try:
        # Parse recipient IDs
        try:
            recipient_list = json.loads(recipient_ids)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid recipient IDs format")
        
        message_data = {
            "sender_id": current_user["id"],
            "recipient_ids": recipient_list,
            "subject": subject,
            "content": content,
            "message_type": message_type,
            "priority": priority,
            "template_id": template_id
        }
        
        employee_service = EmployeeManagementService(supabase_service)
        message_id = await employee_service.send_employee_message(message_data)
        
        if message_id:
            return success_response(
                data={"message_id": message_id},
                message=f"Message sent to {len(recipient_list)} employees"
            )
        else:
            return error_response("Failed to send message")
            
    except Exception as e:
        return error_response(f"Failed to send message: {str(e)}")

@router.post("/employees/bulk-message")
async def bulk_message_employees(
    subject: str = Form(...),
    content: str = Form(...),
    message_type: str = Form("general"),
    priority: str = Form("normal"),
    template_id: Optional[str] = Form(None),
    # Filter parameters
    property_id: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    employment_status: Optional[str] = Form(None),
    lifecycle_stage: Optional[str] = Form(None),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Send bulk message to employees based on filters"""
    try:
        message_data = {
            "sender_id": current_user["id"],
            "subject": subject,
            "content": content,
            "message_type": message_type,
            "priority": priority,
            "template_id": template_id
        }
        
        filters = {}
        if property_id:
            filters["property_id"] = property_id
        if department:
            filters["department"] = department
        if employment_status:
            filters["employment_status"] = employment_status
        if lifecycle_stage:
            filters["lifecycle_stage"] = lifecycle_stage
        
        employee_service = EmployeeManagementService(supabase_service)
        result = await employee_service.bulk_message_employees(message_data, filters)
        
        if result["success"]:
            return success_response(
                data=result,
                message=f"Bulk message sent to {result['recipients_count']} employees"
            )
        else:
            return error_response(result["message"])
            
    except Exception as e:
        return error_response(f"Failed to send bulk message: {str(e)}")

@router.get("/message-templates")
async def get_message_templates(
    template_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get message templates"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        templates = await employee_service.get_message_templates(template_type)
        
        return success_response(
            data={"templates": templates},
            message="Message templates retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get message templates: {str(e)}")

@router.post("/message-templates")
async def create_message_template(
    name: str = Form(...),
    subject: str = Form(...),
    content: str = Form(...),
    template_type: str = Form("general"),
    variables: str = Form("[]"),
    current_user: dict = Depends(require_hr_role),
    supabase_service = Depends(get_supabase_service)
):
    """Create a message template"""
    try:
        # Parse variables
        try:
            variables_list = json.loads(variables)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid variables format")
        
        template_data = {
            "name": name,
            "subject": subject,
            "content": content,
            "template_type": template_type,
            "variables": variables_list,
            "created_by": current_user["id"]
        }
        
        employee_service = EmployeeManagementService(supabase_service)
        template_id = await employee_service.create_message_template(template_data)
        
        if template_id:
            return success_response(
                data={"template_id": template_id},
                message="Message template created successfully"
            )
        else:
            return error_response("Failed to create message template")
            
    except Exception as e:
        return error_response(f"Failed to create message template: {str(e)}")

@router.get("/employees/{employee_id}/communications")
async def get_employee_communications(
    employee_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase_service = Depends(get_supabase_service)
):
    """Get employee communications history"""
    try:
        employee_service = EmployeeManagementService(supabase_service)
        communications = await employee_service._get_employee_communications(employee_id)
        
        return success_response(
            data={"communications": communications[:limit]},
            message="Employee communications retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get employee communications: {str(e)}")

# =====================================
# ANALYTICS AND REPORTING
# =====================================

@router.get("/analytics/employee-lifecycle")
async def get_employee_lifecycle_analytics(
    property_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Get employee lifecycle analytics"""
    try:
        # Build query filters
        filters = {}
        if property_id:
            filters["property_id"] = property_id
        if department:
            filters["department"] = department
        
        # Get lifecycle stage distribution
        query = """
            SELECT 
                lifecycle_stage,
                COUNT(*) as count,
                AVG(EXTRACT(DAYS FROM (NOW() - created_at))) as avg_days_in_stage
            FROM employees 
            WHERE 1=1
        """
        params = []
        
        if property_id:
            query += " AND property_id = %s"
            params.append(property_id)
        
        if department:
            query += " AND department = %s"
            params.append(department)
        
        query += " GROUP BY lifecycle_stage ORDER BY count DESC"
        
        lifecycle_data = await supabase_service.execute_query(query, params)
        
        # Get onboarding completion rates
        onboarding_query = """
            SELECT 
                COUNT(*) as total_employees,
                COUNT(CASE WHEN onboarding_status = 'approved' THEN 1 END) as completed_onboarding,
                AVG(CASE WHEN onboarding_completed_at IS NOT NULL 
                    THEN EXTRACT(DAYS FROM (onboarding_completed_at - created_at)) END) as avg_onboarding_days
            FROM employees
            WHERE created_at >= NOW() - INTERVAL '90 days'
        """
        
        if property_id:
            onboarding_query += " AND property_id = %s"
        
        onboarding_data = await supabase_service.execute_query(
            onboarding_query, 
            [property_id] if property_id else []
        )
        
        return success_response(
            data={
                "lifecycle_distribution": lifecycle_data or [],
                "onboarding_metrics": onboarding_data[0] if onboarding_data else {},
                "filters_applied": filters
            },
            message="Employee lifecycle analytics retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get lifecycle analytics: {str(e)}")

@router.get("/analytics/performance-metrics")
async def get_performance_analytics(
    property_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    current_user: dict = Depends(require_hr_or_manager_role),
    supabase_service = Depends(get_supabase_service)
):
    """Get performance analytics"""
    try:
        # Get goal completion rates
        goals_query = """
            SELECT 
                eg.status,
                COUNT(*) as count,
                AVG(CASE WHEN eg.target_value > 0 
                    THEN (eg.current_value / eg.target_value * 100) END) as avg_progress
            FROM employee_goals eg
            JOIN employees e ON eg.employee_id = e.id
            WHERE 1=1
        """
        params = []
        
        if property_id:
            goals_query += " AND e.property_id = %s"
            params.append(property_id)
        
        if department:
            goals_query += " AND e.department = %s"
            params.append(department)
        
        goals_query += " GROUP BY eg.status ORDER BY count DESC"
        
        goals_data = await supabase_service.execute_query(goals_query, params)
        
        # Get review ratings distribution
        reviews_query = """
            SELECT 
                er.overall_rating,
                COUNT(*) as count
            FROM employee_reviews er
            JOIN employees e ON er.employee_id = e.id
            WHERE er.created_at >= NOW() - INTERVAL '12 months'
        """
        
        if property_id:
            reviews_query += " AND e.property_id = %s"
        
        if department:
            reviews_query += " AND e.department = %s"
        
        reviews_query += " GROUP BY er.overall_rating ORDER BY count DESC"
        
        reviews_params = []
        if property_id:
            reviews_params.append(property_id)
        if department:
            reviews_params.append(department)
        
        reviews_data = await supabase_service.execute_query(reviews_query, reviews_params)
        
        return success_response(
            data={
                "goals_metrics": goals_data or [],
                "review_ratings": reviews_data or []
            },
            message="Performance analytics retrieved successfully"
        )
        
    except Exception as e:
        return error_response(f"Failed to get performance analytics: {str(e)}")