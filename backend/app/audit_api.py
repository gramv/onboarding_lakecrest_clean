"""
Audit Trail API Endpoints

Provides REST API for querying audit logs. Access is restricted:
- HR: Can view all audit logs
- Managers: Can view audit logs for their property only
- Employees: No direct access (logs are for compliance/security)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List
from datetime import datetime, timedelta
from app.auth import get_current_user, User
from app.audit_service import get_audit_service
from app.supabase_service_enhanced import get_supabase_service
import logging

logger = logging.getLogger(__name__)

audit_router = APIRouter(prefix="/api/audit", tags=["audit"])


@audit_router.get("/documents/{document_id}/history")
async def get_document_history(
    document_id: str,
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """
    Get access history for a specific document.
    
    Access: HR and Managers only
    Managers can only view documents from their property.
    """
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied - HR or Manager role required")
    
    try:
        audit = get_audit_service(get_supabase_service())
        history = await audit.get_document_access_history(
            document_id=document_id,
            limit=limit
        )
        
        # If manager, verify document belongs to their property
        if current_user.role == 'manager' and history:
            # Check if any entry has a different property_id
            for entry in history:
                if entry.get('property_id') and entry['property_id'] != current_user.property_id:
                    raise HTTPException(403, "Access denied to this document")
        
        return {
            "success": True,
            "data": {
                "document_id": document_id,
                "access_history": history,
                "total_accesses": len(history)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document history: {e}")
        raise HTTPException(500, f"Failed to retrieve document history: {str(e)}")


@audit_router.get("/employees/{employee_id}/activity")
async def get_employee_document_activity(
    employee_id: str,
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """
    Get all document activity for an employee.
    
    Access: HR and Managers only
    Managers can only view employees from their property.
    """
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied - HR or Manager role required")
    
    try:
        # If manager, verify employee belongs to their property
        if current_user.role == 'manager':
            supabase = get_supabase_service()
            employee = await supabase.get_employee_by_id(employee_id)
            if not employee or employee.get('property_id') != current_user.property_id:
                raise HTTPException(403, "Access denied to this employee")
        
        audit = get_audit_service(get_supabase_service())
        activity = await audit.get_document_access_history(
            employee_id=employee_id,
            limit=limit
        )
        
        return {
            "success": True,
            "data": {
                "employee_id": employee_id,
                "activity": activity,
                "total_events": len(activity)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get employee activity: {e}")
        raise HTTPException(500, f"Failed to retrieve employee activity: {str(e)}")


@audit_router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    start_date: Optional[str] = Query(None, description="ISO format: 2025-10-01T00:00:00Z"),
    end_date: Optional[str] = Query(None, description="ISO format: 2025-10-31T23:59:59Z"),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """
    Get document access activity for a specific user.
    
    Access: HR only (for security/compliance audits)
    """
    if current_user.role != 'hr':
        raise HTTPException(403, "Access denied - HR role required")
    
    try:
        audit = get_audit_service(get_supabase_service())
        
        # Parse dates if provided
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        
        activity = await audit.get_user_activity(user_id, start, end, limit)
        
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "activity": activity,
                "total_events": len(activity),
                "date_range": {
                    "start": start_date,
                    "end": end_date
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user activity: {e}")
        raise HTTPException(500, f"Failed to retrieve user activity: {str(e)}")


@audit_router.get("/properties/{property_id}/activity")
async def get_property_activity(
    property_id: str,
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """
    Get all document activity for a property.
    
    Access: HR and Managers
    Managers can only view their own property.
    """
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied - HR or Manager role required")
    
    # Verify manager has access to this property
    if current_user.role == 'manager' and current_user.property_id != property_id:
        raise HTTPException(403, "Access denied to this property")
    
    try:
        audit = get_audit_service(get_supabase_service())
        activity = await audit.get_document_access_history(
            property_id=property_id,
            limit=limit
        )
        
        return {
            "success": True,
            "data": {
                "property_id": property_id,
                "activity": activity,
                "total_events": len(activity)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get property activity: {e}")
        raise HTTPException(500, f"Failed to retrieve property activity: {str(e)}")


@audit_router.get("/recent")
async def get_recent_activity(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back (max 7 days)"),
    property_id: Optional[str] = Query(None, description="Filter by property"),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent document access activity.
    
    Access: HR and Managers
    Managers automatically filtered to their property.
    """
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied - HR or Manager role required")
    
    try:
        # If manager, force filter to their property
        if current_user.role == 'manager':
            property_id = current_user.property_id
        
        audit = get_audit_service(get_supabase_service())
        activity = await audit.get_recent_activity(
            property_id=property_id,
            hours=hours,
            limit=limit
        )
        
        return {
            "success": True,
            "data": {
                "activity": activity,
                "total_events": len(activity),
                "hours": hours,
                "property_id": property_id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get recent activity: {e}")
        raise HTTPException(500, f"Failed to retrieve recent activity: {str(e)}")


@audit_router.get("/statistics")
async def get_audit_statistics(
    days: int = Query(30, ge=1, le=365, description="Days to analyze (max 1 year)"),
    property_id: Optional[str] = Query(None, description="Filter by property"),
    employee_id: Optional[str] = Query(None, description="Filter by employee"),
    current_user: User = Depends(get_current_user)
):
    """
    Get audit statistics for reporting.
    
    Access: HR and Managers
    Managers automatically filtered to their property.
    """
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied - HR or Manager role required")
    
    try:
        # If manager, force filter to their property
        if current_user.role == 'manager':
            property_id = current_user.property_id
            
            # If employee_id provided, verify it belongs to manager's property
            if employee_id:
                supabase = get_supabase_service()
                employee = await supabase.get_employee_by_id(employee_id)
                if not employee or employee.get('property_id') != current_user.property_id:
                    raise HTTPException(403, "Access denied to this employee")
        
        audit = get_audit_service(get_supabase_service())
        stats = await audit.get_statistics(
            property_id=property_id,
            employee_id=employee_id,
            days=days
        )
        
        return {
            "success": True,
            "data": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(500, f"Failed to retrieve statistics: {str(e)}")


@audit_router.get("/health")
async def audit_health_check():
    """
    Health check endpoint for audit service.
    Public access for monitoring.
    """
    try:
        supabase = get_supabase_service()
        audit = get_audit_service(supabase)
        
        # Try to get recent activity (last 1 hour)
        recent = await audit.get_recent_activity(hours=1, limit=1)
        
        return {
            "success": True,
            "status": "healthy",
            "audit_service": "operational",
            "recent_activity_count": len(recent)
        }
    except Exception as e:
        logger.error(f"Audit health check failed: {e}")
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }

