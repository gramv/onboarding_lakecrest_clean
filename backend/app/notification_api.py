"""
Notification API endpoints
Provides REST API for notification management, preferences, and history
"""
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from .notification_service import (
    notification_service, 
    NotificationCategory, 
    NotificationSeverity,
    DeliveryChannel,
    NotificationStatus,
    NotificationAction
)
from .auth import get_current_user
from .models import UserRole
from .response_utils import success_response, error_response, ErrorCode
from .response_models import APIResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# Request/Response Models

class NotificationActionRequest(BaseModel):
    """Request model for notification actions"""
    id: str
    label: str
    action_type: str
    action_data: Dict[str, Any]
    style: str = "primary"


class CreateNotificationRequest(BaseModel):
    """Request model for creating notifications"""
    user_id: str
    title: str
    message: str
    category: str = "system"
    severity: str = "info"
    channels: Optional[List[str]] = None
    actions: Optional[List[NotificationActionRequest]] = None
    expires_in_hours: Optional[int] = 24
    metadata: Optional[Dict[str, Any]] = None


class CreateFromTemplateRequest(BaseModel):
    """Request model for creating notifications from templates"""
    template_id: str
    user_id: str
    context: Dict[str, Any]
    override_channels: Optional[List[str]] = None


class UpdatePreferencesRequest(BaseModel):
    """Request model for updating notification preferences"""
    enabled_categories: Optional[List[str]] = None
    enabled_channels: Optional[List[str]] = None
    severity_threshold: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    digest_frequency: Optional[str] = None
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    sound_enabled: Optional[bool] = None


class NotificationResponse(BaseModel):
    """Response model for notifications"""
    id: str
    title: str
    message: str
    category: str
    severity: str
    created_at: str
    expires_at: Optional[str]
    status: str
    channels: List[str]
    actions: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    read_at: Optional[str]
    dismissed_at: Optional[str]


class NotificationListResponse(BaseModel):
    """Response model for notification lists"""
    notifications: List[NotificationResponse]
    total_count: int
    unread_count: int


class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics"""
    total_sent: int
    total_delivered: int
    total_failed: int
    total_read: int
    delivery_rate: float
    active_notifications: int
    queued_notifications: int


# API Endpoints

@router.post("/create", response_model=APIResponse)
async def create_notification(
    request: CreateNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a custom notification
    
    Args:
        request: Notification creation request
        current_user: Current authenticated user
        
    Returns:
        Success response with notification ID
    """
    try:
        # Only HR users can create notifications for other users
        if request.user_id != current_user["user_id"] and current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Convert string enums to enum objects
        category = NotificationCategory(request.category)
        severity = NotificationSeverity(request.severity)
        channels = [DeliveryChannel(ch) for ch in (request.channels or ["websocket"])]
        
        # Convert actions
        actions = []
        if request.actions:
            for action_req in request.actions:
                actions.append(NotificationAction(
                    id=action_req.id,
                    label=action_req.label,
                    action_type=action_req.action_type,
                    action_data=action_req.action_data,
                    style=action_req.style
                ))
        
        # Create notification
        notification_id = await notification_service.create_notification(
            user_id=request.user_id,
            title=request.title,
            message=request.message,
            category=category,
            severity=severity,
            channels=channels,
            actions=actions,
            expires_in_hours=request.expires_in_hours,
            metadata=request.metadata
        )
        
        return success_response(
            data={"notification_id": notification_id},
            message="Notification created successfully"
        )
        
    except ValueError as e:
        return error_response(
            message=f"Invalid request data: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return error_response(
            message="Failed to create notification",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/create-from-template", response_model=APIResponse)
async def create_notification_from_template(
    request: CreateFromTemplateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a notification from a template
    
    Args:
        request: Template-based notification creation request
        current_user: Current authenticated user
        
    Returns:
        Success response with notification ID
    """
    try:
        # Only HR users can create notifications for other users
        if request.user_id != current_user["user_id"] and current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Convert override channels if provided
        override_channels = None
        if request.override_channels:
            override_channels = [DeliveryChannel(ch) for ch in request.override_channels]
        
        # Create notification from template
        notification_id = await notification_service.create_notification_from_template(
            template_id=request.template_id,
            user_id=request.user_id,
            context=request.context,
            override_channels=override_channels
        )
        
        return success_response(
            data={"notification_id": notification_id},
            message="Notification created from template successfully"
        )
        
    except ValueError as e:
        return error_response(
            message=f"Invalid template or context: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error creating notification from template: {e}")
        return error_response(
            message="Failed to create notification from template",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/list", response_model=APIResponse)
async def get_user_notifications(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, description="Maximum number of notifications to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get notifications for the current user
    
    Args:
        status: Optional status filter
        category: Optional category filter
        limit: Maximum number of notifications
        current_user: Current authenticated user
        
    Returns:
        List of user notifications
    """
    try:
        # Convert filters
        status_filter = NotificationStatus(status) if status else None
        category_filter = NotificationCategory(category) if category else None
        
        # Get notifications
        notifications = notification_service.get_user_notifications(
            user_id=current_user["user_id"],
            status_filter=status_filter,
            category_filter=category_filter,
            limit=limit
        )
        
        # Count unread notifications
        unread_count = len([n for n in notifications if n["status"] == "delivered"])
        
        return success_response(
            data={
                "notifications": notifications,
                "total_count": len(notifications),
                "unread_count": unread_count
            },
            message="Notifications retrieved successfully"
        )
        
    except ValueError as e:
        return error_response(
            message=f"Invalid filter parameters: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error retrieving notifications: {e}")
        return error_response(
            message="Failed to retrieve notifications",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/{notification_id}/read", response_model=APIResponse)
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a notification as read
    
    Args:
        notification_id: ID of the notification to mark as read
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        success = await notification_service.mark_as_read(
            notification_id=notification_id,
            user_id=current_user["user_id"]
        )
        
        if success:
            return success_response(
                data={"notification_id": notification_id},
                message="Notification marked as read"
            )
        else:
            return error_response(
                message="Notification not found or already read",
                error_code=ErrorCode.RESOURCE_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return error_response(
            message="Failed to mark notification as read",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/{notification_id}/dismiss", response_model=APIResponse)
async def dismiss_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Dismiss a notification
    
    Args:
        notification_id: ID of the notification to dismiss
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        success = await notification_service.dismiss_notification(
            notification_id=notification_id,
            user_id=current_user["user_id"]
        )
        
        if success:
            return success_response(
                data={"notification_id": notification_id},
                message="Notification dismissed"
            )
        else:
            return error_response(
                message="Notification not found",
                error_code=ErrorCode.RESOURCE_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Error dismissing notification: {e}")
        return error_response(
            message="Failed to dismiss notification",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/preferences", response_model=APIResponse)
async def get_notification_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user notification preferences
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User notification preferences
    """
    try:
        preferences = notification_service.get_user_preferences(current_user["user_id"])
        
        return success_response(
            data={
                "enabled_categories": [cat.value for cat in preferences.enabled_categories],
                "enabled_channels": [ch.value for ch in preferences.enabled_channels],
                "severity_threshold": preferences.severity_threshold.value,
                "quiet_hours_start": preferences.quiet_hours_start,
                "quiet_hours_end": preferences.quiet_hours_end,
                "digest_frequency": preferences.digest_frequency,
                "email_notifications": preferences.email_notifications,
                "push_notifications": preferences.push_notifications,
                "sound_enabled": preferences.sound_enabled
            },
            message="Notification preferences retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retrieving notification preferences: {e}")
        return error_response(
            message="Failed to retrieve notification preferences",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.put("/preferences", response_model=APIResponse)
async def update_notification_preferences(
    request: UpdatePreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update user notification preferences
    
    Args:
        request: Preferences update request
        current_user: Current authenticated user
        
    Returns:
        Success response
    """
    try:
        # Convert request to dictionary, filtering out None values
        preferences_data = {}
        
        if request.enabled_categories is not None:
            preferences_data["enabled_categories"] = request.enabled_categories
        
        if request.enabled_channels is not None:
            preferences_data["enabled_channels"] = request.enabled_channels
        
        if request.severity_threshold is not None:
            preferences_data["severity_threshold"] = request.severity_threshold
        
        if request.quiet_hours_start is not None:
            preferences_data["quiet_hours_start"] = request.quiet_hours_start
        
        if request.quiet_hours_end is not None:
            preferences_data["quiet_hours_end"] = request.quiet_hours_end
        
        if request.digest_frequency is not None:
            preferences_data["digest_frequency"] = request.digest_frequency
        
        # Update preferences
        success = await notification_service.update_user_preferences(
            user_id=current_user["user_id"],
            preferences=preferences_data
        )
        
        if success:
            return success_response(
                data={"user_id": current_user["user_id"]},
                message="Notification preferences updated successfully"
            )
        else:
            return error_response(
                message="Failed to update notification preferences",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR
            )
            
    except ValueError as e:
        return error_response(
            message=f"Invalid preference values: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error updating notification preferences: {e}")
        return error_response(
            message="Failed to update notification preferences",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/templates", response_model=APIResponse)
async def get_notification_templates(
    current_user: dict = Depends(get_current_user)
):
    """
    Get available notification templates (HR only)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        List of available notification templates
    """
    try:
        # Only HR users can view templates
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        templates = []
        for template_id, template in notification_service.templates.items():
            templates.append({
                "template_id": template.template_id,
                "category": template.category.value,
                "severity": template.severity.value,
                "title_template": template.title_template,
                "message_template": template.message_template,
                "default_channels": [ch.value for ch in template.default_channels],
                "expires_in_hours": template.expires_in_hours,
                "require_acknowledgment": template.require_acknowledgment
            })
        
        return success_response(
            data={"templates": templates},
            message="Notification templates retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving notification templates: {e}")
        return error_response(
            message="Failed to retrieve notification templates",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get("/stats", response_model=APIResponse)
async def get_notification_statistics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get notification service statistics (HR only)
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Notification service statistics
    """
    try:
        # Only HR users can view statistics
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        stats = notification_service.get_statistics()
        
        return success_response(
            data=stats,
            message="Notification statistics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving notification statistics: {e}")
        return error_response(
            message="Failed to retrieve notification statistics",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/broadcast", response_model=APIResponse)
async def broadcast_notification(
    request: CreateNotificationRequest,
    target_role: Optional[str] = Query(None, description="Target role for broadcast"),
    current_user: dict = Depends(get_current_user)
):
    """
    Broadcast notification to multiple users (HR only)
    
    Args:
        request: Notification creation request
        target_role: Optional role filter for broadcast
        current_user: Current authenticated user
        
    Returns:
        Success response with broadcast details
    """
    try:
        # Only HR users can broadcast notifications
        if current_user["role"] != UserRole.HR.value:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # This would integrate with user management to get target users
        # For now, just create a single notification as placeholder
        
        # Convert string enums to enum objects
        category = NotificationCategory(request.category)
        severity = NotificationSeverity(request.severity)
        channels = [DeliveryChannel(ch) for ch in (request.channels or ["websocket"])]
        
        # Create notification (placeholder - would broadcast to multiple users)
        notification_id = await notification_service.create_notification(
            user_id=request.user_id,
            title=request.title,
            message=request.message,
            category=category,
            severity=severity,
            channels=channels,
            expires_in_hours=request.expires_in_hours,
            metadata=request.metadata
        )
        
        return success_response(
            data={
                "notification_id": notification_id,
                "broadcast_target": target_role or "all",
                "recipients_count": 1  # Placeholder
            },
            message="Notification broadcast successfully"
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        return error_response(
            message=f"Invalid request data: {str(e)}",
            error_code=ErrorCode.VALIDATION_ERROR
        )
    except Exception as e:
        logger.error(f"Error broadcasting notification: {e}")
        return error_response(
            message="Failed to broadcast notification",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )