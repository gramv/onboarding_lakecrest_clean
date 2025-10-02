"""
Notification API Router (Task 6.4)
Provides endpoints for notification management and real-time updates
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import json
import asyncio

from .auth import get_current_user, decode_token
from .notification_service import (
    NotificationService, NotificationChannel, NotificationPriority,
    NotificationType, NotificationPreferences, notification_service
)
from .response_models import APIResponse
from .websocket_manager import websocket_manager

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Request/Response Models
class MarkReadRequest(BaseModel):
    notification_ids: List[str]

class ArchiveRequest(BaseModel):
    notification_ids: List[str]

class DeleteRequest(BaseModel):
    notification_ids: List[str]

class PreferencesUpdateRequest(BaseModel):
    email: Optional[Dict[str, Any]] = None
    in_app: Optional[Dict[str, Any]] = None
    sms: Optional[Dict[str, Any]] = None
    push: Optional[Dict[str, Any]] = None
    quiet_hours: Optional[Dict[str, Any]] = None
    timezone: Optional[str] = None

class BroadcastRequest(BaseModel):
    scope: str  # 'property', 'role', 'filtered', 'global'
    message: str
    subject: Optional[str] = None
    channels: List[str] = ["in_app"]
    filters: Optional[Dict[str, Any]] = None
    priority: str = "normal"

class ScheduleRequest(BaseModel):
    type: str
    recipient: str
    scheduled_at: datetime
    variables: Dict[str, Any]
    channel: str = "email"
    priority: str = "normal"

@router.get("")
async def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    type_filter: Optional[str] = Query(None),
    priority_filter: Optional[str] = Query(None),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get notifications for the current user"""
    try:
        user_id = current_user.id or current_user.email
        
        notifications = await notification_service.get_user_notifications(
            user_id=user_id,
            limit=limit,
            offset=offset,
            unread_only=unread_only
        )
        
        # Apply additional filters
        if type_filter:
            notifications = [n for n in notifications if n.get("type") == type_filter]
        if priority_filter:
            notifications = [n for n in notifications if n.get("priority") == priority_filter]
        
        # Get unread count
        unread_count = await notification_service.get_unread_count(user_id)
        
        return APIResponse(
            success=True,
            data={
                "notifications": notifications,
                "unread_count": unread_count,
                "total": len(notifications)
            },
            message="Notifications retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve notifications: {str(e)}"
        )

@router.post("/mark-read")
async def mark_notifications_read(
    request: MarkReadRequest,
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Mark notifications as read"""
    try:
        user_id = current_user.id or current_user.email
        
        count = await notification_service.mark_as_read(
            notification_ids=request.notification_ids,
            user_id=user_id
        )
        
        # Send WebSocket update for real-time sync
        await websocket_manager.send_to_user(
            user_id,
            {
                "type": "notifications_read",
                "data": {
                    "notification_ids": request.notification_ids,
                    "timestamp": datetime.now().isoformat()
                }
            }
        )
        
        return APIResponse(
            success=True,
            data={"updated_count": count},
            message=f"Marked {count} notifications as read"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to mark notifications as read: {str(e)}"
        )

@router.post("/archive")
async def archive_notifications(
    request: ArchiveRequest,
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Archive notifications"""
    try:
        user_id = current_user.id or current_user.email
        
        # Archive notifications in database
        if notification_service.supabase:
            for notif_id in request.notification_ids:
                notification_service.supabase.client.table("notifications")\
                    .update({"status": "archived", "archived_at": datetime.now().isoformat()})\
                    .eq("id", notif_id)\
                    .eq("recipient", user_id)\
                    .execute()
        
        return APIResponse(
            success=True,
            data={"archived_count": len(request.notification_ids)},
            message=f"Archived {len(request.notification_ids)} notifications"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to archive notifications: {str(e)}"
        )

@router.delete("")
async def delete_notifications(
    notification_ids: List[str],
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Delete notifications permanently"""
    try:
        user_id = current_user.id or current_user.email
        
        # Delete notifications from database
        if notification_service.supabase:
            for notif_id in notification_ids:
                notification_service.supabase.client.table("notifications")\
                    .delete()\
                    .eq("id", notif_id)\
                    .eq("recipient", user_id)\
                    .execute()
        
        return APIResponse(
            success=True,
            data={"deleted_count": len(notification_ids)},
            message=f"Deleted {len(notification_ids)} notifications"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to delete notifications: {str(e)}"
        )

@router.get("/preferences")
async def get_notification_preferences(
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get user notification preferences"""
    try:
        user_id = current_user.id or current_user.email
        
        prefs = await notification_service.get_user_preferences(user_id)
        
        return APIResponse(
            success=True,
            data={
                "preferences": {
                    "email": prefs.email,
                    "in_app": prefs.in_app,
                    "sms": prefs.sms,
                    "push": prefs.push,
                    "quiet_hours": prefs.quiet_hours,
                    "timezone": prefs.timezone
                }
            },
            message="Preferences retrieved successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve preferences: {str(e)}"
        )

@router.put("/preferences")
async def update_notification_preferences(
    request: PreferencesUpdateRequest,
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Update user notification preferences"""
    try:
        user_id = current_user.id or current_user.email
        
        # Build preferences update dict
        updates = {}
        if request.email is not None:
            updates["email"] = request.email
        if request.in_app is not None:
            updates["in_app"] = request.in_app
        if request.sms is not None:
            updates["sms"] = request.sms
        if request.push is not None:
            updates["push"] = request.push
        if request.quiet_hours is not None:
            updates["quiet_hours"] = request.quiet_hours
        if request.timezone is not None:
            updates["timezone"] = request.timezone
        
        success = await notification_service.update_user_preferences(user_id, updates)
        
        if success:
            # Send WebSocket update for real-time preference sync
            await websocket_manager.send_to_user(
                user_id,
                {
                    "type": "preferences_updated",
                    "data": updates
                }
            )
            
            return APIResponse(
                success=True,
                message="Preferences updated successfully"
            )
        else:
            raise Exception("Failed to update preferences")
            
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to update preferences: {str(e)}"
        )

@router.post("/broadcast")
async def broadcast_notification(
    request: BroadcastRequest,
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Broadcast notification to multiple recipients (HR only)"""
    try:
        # Check if user has HR role
        if current_user.role != "hr":
            raise HTTPException(status_code=403, detail="Only HR users can broadcast notifications")
        
        # Convert string channels to enum
        channels = [NotificationChannel(c) for c in request.channels]
        
        # Send broadcast
        result = await notification_service.broadcast_notification(
            scope=request.scope,
            message=request.message,
            channels=channels,
            filters=request.filters,
            property_id=request.filters.get("property_id") if request.filters else None,
            role=request.filters.get("role") if request.filters else None,
            requires_hr=(request.scope == "global")
        )
        
        return APIResponse(
            success=True,
            data=result,
            message=f"Broadcast sent to {result['recipients_count']} recipients"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to send broadcast: {str(e)}"
        )

@router.post("/schedule")
async def schedule_notification(
    request: ScheduleRequest,
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Schedule a notification for future delivery"""
    try:
        # Convert strings to enums
        notif_type = NotificationType(request.type)
        channel = NotificationChannel(request.channel)
        priority = NotificationPriority[request.priority.upper()]
        
        # Schedule notification
        notification = await notification_service.send_notification(
            type=notif_type,
            channel=channel,
            recipient=request.recipient,
            variables=request.variables,
            priority=priority,
            scheduled_at=request.scheduled_at
        )
        
        return APIResponse(
            success=True,
            data={
                "notification_id": notification.id,
                "scheduled_at": request.scheduled_at.isoformat(),
                "status": notification.status.value
            },
            message="Notification scheduled successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to schedule notification: {str(e)}"
        )

@router.post("/test")
async def send_test_notification(
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Send a test notification to the current user"""
    try:
        user_id = current_user.id or current_user.email
        
        # Send test notification
        notification = await notification_service.send_notification(
            type=NotificationType.SYSTEM_ANNOUNCEMENT,
            channel=NotificationChannel.IN_APP,
            recipient=user_id,
            variables={
                "announcement_title": "Test Notification",
                "announcement_body": "This is a test notification to verify the system is working correctly."
            },
            priority=NotificationPriority.NORMAL
        )
        
        return APIResponse(
            success=True,
            data={"notification_id": notification.id},
            message="Test notification sent successfully"
        )
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to send test notification: {str(e)}"
        )

@router.websocket("/ws")
async def notification_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time notifications"""
    await websocket.accept()
    
    # Get token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return
    
    # Decode and verify token
    user_data = decode_token(token)
    if not user_data:
        await websocket.close(code=1008, reason="Invalid authentication token")
        return
    
    user_id = user_data.get("id") or user_data.get("email")
    
    # Add to WebSocket manager
    await websocket_manager.connect(websocket, user_id)
    
    try:
        # Send initial connection success message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "timestamp": datetime.now().isoformat()
        })
        
        # Get and send unread count
        unread_count = await notification_service.get_unread_count(user_id)
        await websocket.send_json({
            "type": "unread_count",
            "data": {"count": unread_count}
        })
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Wait for messages with timeout for ping/pong
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                
                # Handle different message types
                if data.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif data.get("type") == "mark_read":
                    notification_ids = data.get("notification_ids", [])
                    count = await notification_service.mark_as_read(notification_ids, user_id)
                    await websocket.send_json({
                        "type": "marked_read",
                        "data": {"count": count}
                    })
                    
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except:
                    break
                    
    except WebSocketDisconnect:
        await websocket_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket_manager.disconnect(websocket)

@router.get("/stats")
async def get_notification_stats(
    time_range: str = Query("last_30_days"),
    current_user = Depends(get_current_user)
) -> APIResponse:
    """Get notification statistics (HR only)"""
    try:
        # Check if user has HR role
        if current_user.role != "hr":
            raise HTTPException(status_code=403, detail="Only HR users can view notification stats")
        
        # Mock statistics for now
        stats = {
            "total_sent": 1250,
            "delivery_rate": 98.5,
            "engagement_rate": 65.3,
            "by_channel": {
                "email": 450,
                "in_app": 520,
                "sms": 180,
                "push": 100
            },
            "by_type": {
                "application": 320,
                "deadline": 280,
                "system": 250,
                "compliance": 200,
                "approval": 150,
                "reminder": 50
            },
            "by_priority": {
                "urgent": 50,
                "high": 200,
                "normal": 800,
                "low": 200
            },
            "average_read_time": "4h 23m",
            "peak_hours": ["9:00", "14:00", "17:00"]
        }
        
        return APIResponse(
            success=True,
            data=stats,
            message="Notification statistics retrieved successfully"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        return APIResponse(
            success=False,
            message=f"Failed to retrieve statistics: {str(e)}"
        )