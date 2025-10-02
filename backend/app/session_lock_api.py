"""
Session Lock API Endpoints
Provides REST API for session locking functionality
"""
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

from pydantic import BaseModel, Field
from .session_lock_manager import SessionLockManager, LockType, SessionLock, LockConflict
from .supabase_service_enhanced import EnhancedSupabaseService
from .websocket_manager import WebSocketManager
from .auth import get_current_user
from .models import User

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses

class AcquireLockRequest(BaseModel):
    """Request model for acquiring a lock"""
    lock_type: LockType = Field(default=LockType.WRITE, description="Type of lock to acquire")
    duration_seconds: Optional[int] = Field(default=300, description="Lock duration in seconds", ge=1, le=1800)
    force: bool = Field(default=False, description="Force acquire even if locked by another user")
    browser_fingerprint: Optional[str] = Field(None, description="Browser fingerprint for tracking")
    
class ExtendLockRequest(BaseModel):
    """Request model for extending a lock"""
    lock_token: str = Field(..., description="Lock token for verification")
    additional_seconds: Optional[int] = Field(default=300, description="Additional seconds to extend", ge=1, le=1800)

class ReleaseLockRequest(BaseModel):
    """Request model for releasing a lock"""
    lock_token: Optional[str] = Field(None, description="Lock token for verification")

class SessionLockResponse(BaseModel):
    """Response model for lock operations"""
    success: bool
    lock: Optional[Dict[str, Any]] = None
    conflict: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    
class CheckLockResponse(BaseModel):
    """Response model for checking lock status"""
    is_locked: bool
    owns_lock: bool
    lock: Optional[Dict[str, Any]] = None
    can_edit: bool
    message: Optional[str] = None

class UpdateWithVersionRequest(BaseModel):
    """Request model for optimistic locking update"""
    version: int = Field(..., description="Expected version number")
    data: Dict[str, Any] = Field(..., description="Data to update")
    auto_resolve_conflicts: bool = Field(default=False, description="Automatically resolve conflicts")

class UpdateWithVersionResponse(BaseModel):
    """Response model for optimistic locking update"""
    success: bool
    new_version: Optional[int] = None
    conflict_detected: bool = False
    current_data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

# Create router
router = APIRouter(prefix="/api/session-locks", tags=["session-locks"])

# Dependency to get lock manager
async def get_lock_manager(request: Request) -> SessionLockManager:
    """Get SessionLockManager instance"""
    supabase_service: EnhancedSupabaseService = request.app.state.supabase_service
    websocket_manager: WebSocketManager = request.app.state.websocket_manager
    
    if not hasattr(request.app.state, 'lock_manager'):
        request.app.state.lock_manager = SessionLockManager(
            supabase_service.client,
            websocket_manager
        )
    
    return request.app.state.lock_manager

# API Endpoints

@router.post("/{session_id}/acquire", response_model=SessionLockResponse)
async def acquire_lock(
    session_id: str,
    request_data: AcquireLockRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Acquire a lock on an onboarding session
    
    - **session_id**: ID of the onboarding session
    - **lock_type**: Type of lock (read/write)
    - **duration_seconds**: How long to hold the lock (max 30 minutes)
    - **force**: Force acquire even if another user has the lock
    - **browser_fingerprint**: Optional browser fingerprint for tracking
    """
    try:
        # Get client metadata
        metadata = {
            'browser_fingerprint': request_data.browser_fingerprint,
            'ip_address': request.client.host if request.client else None,
            'user_agent': request.headers.get('user-agent'),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Attempt to acquire lock
        lock, conflict = await lock_manager.acquire_lock(
            session_id=session_id,
            user_id=current_user.id,
            lock_type=request_data.lock_type,
            duration_seconds=request_data.duration_seconds,
            force=request_data.force,
            metadata=metadata
        )
        
        if lock:
            return SessionLockResponse(
                success=True,
                lock=lock.to_dict(),
                message=f"Lock acquired successfully until {lock.expires_at.isoformat()}"
            )
        elif conflict:
            return SessionLockResponse(
                success=False,
                conflict=conflict.to_dict(),
                message=conflict.message
            )
        else:
            return SessionLockResponse(
                success=False,
                message="Failed to acquire lock"
            )
            
    except Exception as e:
        logger.error(f"Error acquiring lock for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{session_id}/release", response_model=SessionLockResponse)
async def release_lock(
    session_id: str,
    request_data: ReleaseLockRequest,
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Release a lock on an onboarding session
    
    - **session_id**: ID of the onboarding session
    - **lock_token**: Optional lock token for verification
    """
    try:
        success = await lock_manager.release_lock(
            session_id=session_id,
            user_id=current_user.id,
            lock_token=request_data.lock_token
        )
        
        if success:
            return SessionLockResponse(
                success=True,
                message="Lock released successfully"
            )
        else:
            return SessionLockResponse(
                success=False,
                message="Failed to release lock - you may not own it"
            )
            
    except Exception as e:
        logger.error(f"Error releasing lock for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{session_id}/check", response_model=CheckLockResponse)
async def check_lock(
    session_id: str,
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Check lock status for an onboarding session
    
    - **session_id**: ID of the onboarding session
    """
    try:
        lock, owns_lock = await lock_manager.check_lock(
            session_id=session_id,
            user_id=current_user.id
        )
        
        if lock:
            return CheckLockResponse(
                is_locked=True,
                owns_lock=owns_lock,
                lock=lock.to_dict(),
                can_edit=owns_lock or lock.lock_type == LockType.READ,
                message="Session is currently locked" if not owns_lock else "You own the lock"
            )
        else:
            return CheckLockResponse(
                is_locked=False,
                owns_lock=True,
                can_edit=True,
                message="Session is not locked"
            )
            
    except Exception as e:
        logger.error(f"Error checking lock for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{session_id}/extend", response_model=SessionLockResponse)
async def extend_lock(
    session_id: str,
    request_data: ExtendLockRequest,
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Extend the duration of an existing lock
    
    - **session_id**: ID of the onboarding session
    - **lock_token**: Lock token for verification
    - **additional_seconds**: Additional seconds to extend (max 30 minutes)
    """
    try:
        lock = await lock_manager.extend_lock(
            session_id=session_id,
            user_id=current_user.id,
            lock_token=request_data.lock_token,
            additional_seconds=request_data.additional_seconds
        )
        
        if lock:
            return SessionLockResponse(
                success=True,
                lock=lock.to_dict(),
                message=f"Lock extended until {lock.expires_at.isoformat()}"
            )
        else:
            return SessionLockResponse(
                success=False,
                message="Failed to extend lock - invalid token or not owner"
            )
            
    except Exception as e:
        logger.error(f"Error extending lock for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/locks", response_model=Dict[str, Any])
async def get_user_locks(
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Get all active locks held by the current user
    """
    try:
        locks = await lock_manager.get_user_locks(current_user.id)
        
        return {
            "locks": [lock.to_dict() for lock in locks],
            "count": len(locks)
        }
        
    except Exception as e:
        logger.error(f"Error getting locks for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/expire-stale", response_model=Dict[str, Any])
async def expire_stale_locks(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    lock_manager: SessionLockManager = Depends(get_lock_manager)
):
    """
    Trigger expiration of all stale locks (admin only)
    """
    # Check if user is admin/HR
    if current_user.role not in ['hr', 'admin']:
        raise HTTPException(status_code=403, detail="Only HR/Admin can expire stale locks")
    
    try:
        # Run in background
        background_tasks.add_task(lock_manager.expire_stale_locks)
        
        return {
            "message": "Stale lock expiration initiated",
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error initiating stale lock expiration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Optimistic locking endpoints

@router.put("/{session_id}/update-with-version", response_model=UpdateWithVersionResponse)
async def update_with_version(
    session_id: str,
    request_data: UpdateWithVersionRequest,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Update session data with optimistic locking version check
    
    - **session_id**: ID of the onboarding session
    - **version**: Expected version number
    - **data**: Data to update
    - **auto_resolve_conflicts**: Automatically resolve conflicts by merging
    """
    try:
        supabase_service: EnhancedSupabaseService = request.app.state.supabase_service
        
        # Call stored procedure for version check update
        result = await supabase_service.client.rpc(
            'update_session_with_version_check',
            {
                'p_session_id': session_id,
                'p_expected_version': request_data.version,
                'p_data': request_data.data,
                'p_user_id': current_user.id
            }
        ).execute()
        
        if result.data and len(result.data) > 0:
            update_result = result.data[0]
            
            if update_result['success']:
                return UpdateWithVersionResponse(
                    success=True,
                    new_version=update_result['new_version'],
                    message="Session updated successfully"
                )
            else:
                # Version conflict detected
                if request_data.auto_resolve_conflicts:
                    # Attempt to merge changes
                    merged_data = await _merge_conflict_data(
                        supabase_service,
                        session_id,
                        request_data.data
                    )
                    
                    if merged_data:
                        return UpdateWithVersionResponse(
                            success=True,
                            new_version=merged_data['version'],
                            current_data=merged_data['data'],
                            message="Conflict resolved automatically"
                        )
                
                # Return conflict info
                current_session = await supabase_service.get_onboarding_session(session_id)
                
                return UpdateWithVersionResponse(
                    success=False,
                    conflict_detected=True,
                    new_version=update_result['new_version'],
                    current_data=current_session.progress_data if current_session else None,
                    message="Version conflict detected - someone else updated the session"
                )
        else:
            raise HTTPException(status_code=500, detail="Failed to update session")
            
    except Exception as e:
        logger.error(f"Error updating session {session_id} with version check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _merge_conflict_data(
    supabase_service: EnhancedSupabaseService,
    session_id: str,
    new_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """
    Attempt to merge conflicting data
    Simple merge strategy - newer data wins per field
    """
    try:
        current_session = await supabase_service.get_onboarding_session(session_id)
        if not current_session:
            return None
        
        merged = current_session.progress_data.copy() if current_session.progress_data else {}
        
        # Simple merge - overlay new data
        for key, value in new_data.items():
            if isinstance(value, dict) and key in merged and isinstance(merged[key], dict):
                # Recursive merge for nested objects
                merged[key] = {**merged[key], **value}
            else:
                merged[key] = value
        
        # Update with new merged data
        result = await supabase_service.update_onboarding_session(
            session_id,
            {'progress_data': merged}
        )
        
        if result:
            return {
                'version': result.version,
                'data': merged
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Error merging conflict data: {e}")
        return None