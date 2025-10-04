"""
Manager Document Access Router
Handles OTP verification for secure document viewing
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from app.services.document_access_otp_service import document_access_otp_service
from app.supabase_service_enhanced import get_enhanced_supabase_service
from app.dependencies import get_current_user

# Get supabase service instance
supabase_service = get_enhanced_supabase_service()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/manager/document-access", tags=["manager-document-access"])


# =====================================================
# REQUEST/RESPONSE MODELS
# =====================================================

class RequestOTPRequest(BaseModel):
    employee_id: str
    
class VerifyOTPRequest(BaseModel):
    employee_id: str
    otp_code: str
    
class ValidateSessionRequest(BaseModel):
    session_token: str
    employee_id: str


# =====================================================
# ENDPOINTS
# =====================================================

@router.post("/request-otp")
async def request_document_access_otp(
    request: Request,
    body: RequestOTPRequest,
    current_user = Depends(get_current_user)
):
    """
    Request OTP for document access
    Sends 6-digit code to manager's email
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can request document access"
            )

        manager_id = current_user.id
        manager_email = current_user.email
        
        if not manager_email:
            raise HTTPException(
                status_code=400,
                detail="Manager email not found"
            )
        
        # Verify employee exists and belongs to manager's property
        employee = supabase_service.client.table("employees")\
            .select("id, property_id, personal_info")\
            .eq("id", body.employee_id)\
            .single()\
            .execute()
        
        if not employee.data:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )
        
        # Check if manager has access to this employee's property
        # (Add property check based on your access control logic)
        
        # Create OTP and send email
        result = await document_access_otp_service.create_otp_session(
            manager_id=manager_id,
            employee_id=body.employee_id,
            manager_email=manager_email
        )
        
        if not result['success']:
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Failed to send verification code')
            )
        
        logger.info(f"OTP requested by manager {manager_id} for employee {body.employee_id}")
        
        return {
            "success": True,
            "message": result['message'],
            "expires_at": result['expires_at']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to request verification code"
        )


@router.post("/verify-otp")
async def verify_document_access_otp(
    request: Request,
    body: VerifyOTPRequest,
    current_user = Depends(get_current_user)
):
    """
    Verify OTP and create document access session
    Returns session token valid for 30 minutes
    """
    try:
        # Verify user is a manager
        if current_user.role not in ['manager', 'hr', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Only managers can verify document access"
            )

        manager_id = current_user.id
        
        # Verify OTP
        result = await document_access_otp_service.verify_otp(
            manager_id=manager_id,
            employee_id=body.employee_id,
            otp_code=body.otp_code
        )
        
        if not result['success']:
            # Log failed attempt
            logger.warning(f"Failed OTP verification by manager {manager_id}: {result.get('error')}")
            
            raise HTTPException(
                status_code=401,
                detail=result.get('error', 'Invalid verification code')
            )
        
        logger.info(f"OTP verified successfully for manager {manager_id}, session created")
        
        return {
            "success": True,
            "session_token": result['session_token'],
            "expires_at": result['expires_at'],
            "message": result['message']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to verify code"
        )


@router.post("/validate-session")
async def validate_document_access_session(
    request: Request,
    body: ValidateSessionRequest,
    current_user = Depends(get_current_user)
):
    """
    Validate if session token is still active
    Used before showing documents
    """
    try:
        manager_id = current_user.id
        
        # Find active session
        from datetime import datetime, timezone
        
        session = supabase_service.client.table("document_access_sessions")\
            .select("*")\
            .eq("manager_id", manager_id)\
            .eq("employee_id", body.employee_id)\
            .eq("session_token", body.session_token)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not session.data:
            return {
                "valid": False,
                "message": "Session not found or expired"
            }
        
        # Check if expired
        expires_at = datetime.fromisoformat(session.data['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            # Mark session as inactive
            supabase_service.client.table("document_access_sessions")\
                .update({"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", session.data['id'])\
                .execute()
            
            return {
                "valid": False,
                "message": "Session has expired"
            }
        
        # Calculate remaining time
        remaining_seconds = int((expires_at - datetime.now(timezone.utc)).total_seconds())
        
        return {
            "valid": True,
            "expires_at": session.data['expires_at'],
            "remaining_seconds": remaining_seconds,
            "message": "Session is active"
        }
        
    except Exception as e:
        logger.error(f"Error validating session: {e}")
        return {
            "valid": False,
            "message": "Failed to validate session"
        }


@router.post("/end-session")
async def end_document_access_session(
    request: Request,
    body: ValidateSessionRequest,
    current_user = Depends(get_current_user)
):
    """
    Manually end a document access session
    """
    try:
        from datetime import datetime, timezone

        manager_id = current_user.id
        
        # End the session
        result = supabase_service.client.table("document_access_sessions")\
            .update({
                "is_active": False,
                "ended_at": datetime.now(timezone.utc).isoformat()
            })\
            .eq("manager_id", manager_id)\
            .eq("session_token", body.session_token)\
            .execute()
        
        logger.info(f"Session ended by manager {manager_id}")
        
        return {
            "success": True,
            "message": "Session ended successfully"
        }
        
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to end session"
        )


@router.get("/active-sessions")
async def get_active_sessions(
    request: Request,
    current_user = Depends(get_current_user)
):
    """
    Get all active document access sessions for current manager
    """
    try:
        from datetime import datetime, timezone

        manager_id = current_user.id
        
        # Get active sessions
        sessions = supabase_service.client.table("document_access_sessions")\
            .select("*, employees(personal_info)")\
            .eq("manager_id", manager_id)\
            .eq("is_active", True)\
            .gt("expires_at", datetime.now(timezone.utc).isoformat())\
            .order("created_at", desc=True)\
            .execute()
        
        # Format response
        active_sessions = []
        for session in sessions.data or []:
            employee_name = "Unknown"
            if session.get('employees') and session['employees'].get('personal_info'):
                info = session['employees']['personal_info']
                first = info.get('firstName') or info.get('first_name')
                last = info.get('lastName') or info.get('last_name')
                if first and last:
                    employee_name = f"{first} {last}"
            
            expires_at = datetime.fromisoformat(session['expires_at'].replace('Z', '+00:00'))
            remaining_seconds = int((expires_at - datetime.now(timezone.utc)).total_seconds())
            
            active_sessions.append({
                "employee_id": session['employee_id'],
                "employee_name": employee_name,
                "session_token": session['session_token'],
                "expires_at": session['expires_at'],
                "remaining_seconds": remaining_seconds,
                "created_at": session['created_at']
            })
        
        return {
            "success": True,
            "sessions": active_sessions,
            "count": len(active_sessions)
        }
        
    except Exception as e:
        logger.error(f"Error getting active sessions: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get active sessions"
        )

