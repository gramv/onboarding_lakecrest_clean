"""
Optimistic Update API endpoints
Provides REST API for optimistic updates, conflict resolution, and collaborative editing
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from datetime import datetime

from .optimistic_update_service import (
    optimistic_update_service,
    UpdateType,
    ConflictResolutionStrategy,
    ChangeType
)
from .auth import get_current_user
from .models import UserRole
from .response_utils import success_response, error_response, ErrorCode
from .response_models import APIResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/optimistic-updates", tags=["Optimistic Updates"])


# Request/Response Models

class FieldChangeRequest(BaseModel):
    """Request model for field changes"""
    field_path: str
    old_value: Any = None
    new_value: Any
    change_type: str = "field_update"


class CreateOptimisticUpdateRequest(BaseModel):
    """Request model for creating optimistic updates"""
    resource_type: str
    resource_id: str
    update_type: str
    changes: List[FieldChangeRequest]
    client_timestamp: Optional[str] = None
    conflict_resolution: str = "last_write_wins"
    metadata: Optional[Dict[str, Any]] = None


class UpdateCursorRequest(BaseModel):
    """Request model for updating cursor position"""
    session_id: str
    cursor_data: Dict[str, Any]


class ResolveConflictRequest(BaseModel):
    """Request model for manual conflict resolution"""
    conflict_id: str
    resolution_strategy: str
    selected_update_id: Optional[str] = None
    merged_changes: Optional[List[FieldChangeRequest]] = None


# API Endpoints

@router.post("/create", response_model=APIResponse)
async def create_optimistic_update(
    request: CreateOptimisticUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create an optimistic update
    
    Args:
        request: Optimistic update creation request
        current_user: Current authenticated user
        
    Returns:
        Success response with update ID
    """
    try:
        # Convert string enums to enum objects
        update_type = UpdateType(request.update_type)
        conflict_resolution = ConflictResolutionStrategy(request.conflict_resolution)
        
        # Convert changes
        changes = []
        for change_req in request.changes:
            changes.append({
                "field_path": change_req.field_path,
                "old_value": change_req.old_value,
                "new_value": change_req.new_value,
                "change_type": change_req.change_type
            })
        
        # Parse client timestamp if provided
        client_timestamp = None
        if request.client_timestamp:
            client_timestamp = datetime.fromisoformat(request.client_timestamp.replace('Z', '+00:00'))
        
        # Create optimistic update
        update_id = await optimistic_update_service.create_optimistic_update(
            user_id=current_user["user_id"],
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            update_type=update_type,
            changes=changes,
            client_timestamp=client_timestamp,
            conflict_resolution=conflict_resolution,
            metadata=request.metadata
        )
        
        return success_response(
            data={"update_id": update_id},
            message="Optimistic update created successfully"
        )
        
    except ValueError as e:
        return error_response(
            message=f"Invalid request data: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error creating optimistic update: {e}")
        return error_response(
            message="Failed to create optimistic update",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/resource/{resource_type}/{resource_id}", response_model=APIResponse)
async def get_resource_updates(
    resource_type: str,
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all updates for a specific resource
    
    Args:
        resource_type: Type of resource
        resource_id: ID of resource
        current_user: Current authenticated user
        
    Returns:
        List of updates for the resource
    """
    try:
        # TODO: Add permission checking based on resource type and user role
        
        updates = optimistic_update_service.get_resource_updates(resource_type, resource_id)
        
        return success_response(
            data={"updates": updates},
            message="Resource updates retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving resource updates: {e}")
        return error_response(
            message="Failed to retrieve resource updates",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/history/{resource_type}/{resource_id}", response_model=APIResponse)
async def get_change_history(
    resource_type: str,
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get change history for a resource
    
    Args:
        resource_type: Type of resource
        resource_id: ID of resource
        current_user: Current authenticated user
        
    Returns:
        Change history for the resource
    """
    try:
        # TODO: Add permission checking based on resource type and user role
        
        history = optimistic_update_service.get_change_history(resource_type, resource_id)
        
        return success_response(
            data={"history": history},
            message="Change history retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving change history: {e}")
        return error_response(
            message="Failed to retrieve change history",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/conflicts", response_model=APIResponse)
async def get_active_conflicts(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all active conflicts (HR only)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of active conflicts
    """
    try:
        # Only HR users can view all conflicts
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        conflicts = optimistic_update_service.get_active_conflicts()
        
        return success_response(
            data={"conflicts": conflicts},
            message="Active conflicts retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving active conflicts: {e}")
        return error_response(
            message="Failed to retrieve active conflicts",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/conflicts/resolve", response_model=APIResponse)
async def resolve_conflict_manually(
    request: ResolveConflictRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually resolve a conflict
    
    Args:
        request: Conflict resolution request
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        # Only HR users can manually resolve conflicts
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get the conflict
        conflict = optimistic_update_service.conflicts.get(request.conflict_id)
        if not conflict:
            return error_response(
                message="Conflict not found",
                error_code=ErrorCode.RESOURCE_NOT_FOUND
            )
        
        if conflict.resolved:
            return error_response(
                message="Conflict already resolved",
                error_code=ErrorCode.VALIDATION_ERROR
            )
        
        # Update conflict resolution strategy
        conflict.resolution_strategy = ConflictResolutionStrategy(request.resolution_strategy)
        conflict.resolved_by = current_user["user_id"]
        
        # Resolve the conflict
        await optimistic_update_service._resolve_conflict(conflict)
        
        return success_response(
            data={"conflict_id": request.conflict_id},
            message="Conflict resolved successfully"
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        return error_response(
            message=f"Invalid resolution strategy: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error resolving conflict: {e}")
        return error_response(
            message="Failed to resolve conflict",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


# Collaborative Editing Endpoints

@router.post("/collaborative/start", response_model=APIResponse)
async def start_collaborative_session(
    resource_type: str = Query(..., description="Type of resource"),
    resource_id: str = Query(..., description="ID of resource"),
    current_user: dict = Depends(get_current_user)
):
    """
    Start or join a collaborative editing session
    
    Args:
        resource_type: Type of resource to collaborate on
        resource_id: ID of resource to collaborate on
        current_user: Current authenticated user
        
    Returns:
        Success response with session ID
    """
    try:
        session_id = await optimistic_update_service.start_collaborative_session(
            user_id=current_user["user_id"],
            resource_type=resource_type,
            resource_id=resource_id
        )
        
        return success_response(
            data={"session_id": session_id},
            message="Collaborative session started successfully"
        )
        
    except Exception as e:
        logger.error(f"Error starting collaborative session: {e}")
        return error_response(
            message="Failed to start collaborative session",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/collaborative/end", response_model=APIResponse)
async def end_collaborative_session(
    session_id: str = Query(..., description="Session ID"),
    current_user: dict = Depends(get_current_user)
):
    """
    End or leave a collaborative editing session
    
    Args:
        session_id: ID of session to end/leave
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        await optimistic_update_service.end_collaborative_session(
            session_id=session_id,
            user_id=current_user["user_id"]
        )
        
        return success_response(
            data={"session_id": session_id},
            message="Left collaborative session successfully"
        )
        
    except Exception as e:
        logger.error(f"Error ending collaborative session: {e}")
        return error_response(
            message="Failed to end collaborative session",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/collaborative/cursor", response_model=APIResponse)
async def update_cursor_position(
    request: UpdateCursorRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update cursor position in collaborative session
    
    Args:
        request: Cursor update request
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        await optimistic_update_service.update_cursor_position(
            session_id=request.session_id,
            user_id=current_user["user_id"],
            cursor_data=request.cursor_data
        )
        
        return success_response(
            data={"session_id": request.session_id},
            message="Cursor position updated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error updating cursor position: {e}")
        return error_response(
            message="Failed to update cursor position",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/collaborative/sessions", response_model=APIResponse)
async def get_collaborative_sessions(
    current_user: dict = Depends(get_current_user)
):
    """
    Get collaborative sessions for the current user
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of collaborative sessions
    """
    try:
        sessions = optimistic_update_service.get_collaborative_sessions(
            user_id=current_user["user_id"]
        )
        
        return success_response(
            data={"sessions": sessions},
            message="Collaborative sessions retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving collaborative sessions: {e}")
        return error_response(
            message="Failed to retrieve collaborative sessions",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/collaborative/sessions/all", response_model=APIResponse)
async def get_all_collaborative_sessions(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all collaborative sessions (HR only)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of all collaborative sessions
    """
    try:
        # Only HR users can view all sessions
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        sessions = optimistic_update_service.get_collaborative_sessions()
        
        return success_response(
            data={"sessions": sessions},
            message="All collaborative sessions retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving all collaborative sessions: {e}")
        return error_response(
            message="Failed to retrieve collaborative sessions",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/metrics", response_model=APIResponse)
async def get_optimistic_update_metrics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get optimistic update service metrics (HR only)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Service metrics
    """
    try:
        # Only HR users can view metrics
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        metrics = optimistic_update_service.get_metrics()
        
        return success_response(
            data=metrics,
            message="Optimistic update metrics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving optimistic update metrics: {e}")
        return error_response(
            message="Failed to retrieve metrics",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


# WebSocket Integration Endpoints (for testing)

@router.post("/test/broadcast-update", response_model=APIResponse)
async def test_broadcast_update(
    resource_type: str = Query(..., description="Resource type"),
    resource_id: str = Query(..., description="Resource ID"),
    message: str = Query(..., description="Test message"),
    current_user: dict = Depends(get_current_user)
):
    """
    Test endpoint for broadcasting updates via WebSocket
    
    Args:
        resource_type: Type of resource
        resource_id: ID of resource
        message: Test message
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        # Only HR users can use test endpoints
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Create a test optimistic update
        update_id = await optimistic_update_service.create_optimistic_update(
            user_id=current_user["user_id"],
            resource_type=resource_type,
            resource_id=resource_id,
            update_type=UpdateType.UPDATE,
            changes=[{
                "field_path": "test_field",
                "old_value": "old_value",
                "new_value": message,
                "change_type": "field_update"
            }],
            metadata={"test": True}
        )
        
        return success_response(
            data={"update_id": update_id},
            message="Test update broadcast successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error broadcasting test update: {e}")
        return error_response(
            message="Failed to broadcast test update",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )