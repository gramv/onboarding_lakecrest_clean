"""
WebSocket router for real-time dashboard functionality
Handles WebSocket connections, authentication, and real-time event broadcasting
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from .websocket_manager import websocket_manager, ConnectionInfo, BroadcastEvent
from .models import UserRole
from .auth import decode_token
from .response_utils import success_response, error_response, ErrorCode
from .property_access_control import get_property_access_controller
from .response_models import (
    WebSocketStatsResponse, 
    WebSocketRoomsResponse, 
    APIResponse,
    WebSocketBroadcastRequest,
    WebSocketUserNotificationRequest
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/dashboard")
async def websocket_dashboard_endpoint(
    websocket: WebSocket, 
    token: str = Query(..., description="JWT authentication token")
):
    """
    WebSocket endpoint for real-time dashboard updates
    
    Authentication is done via query parameter token for WebSocket compatibility.
    Supports room-based subscriptions:
    - HR users: automatic subscription to 'global' room
    - Managers: automatic subscription to their property room
    
    Message types handled:
    - heartbeat: Keep connection alive
    - subscribe: Subscribe to additional rooms (if permitted)
    - unsubscribe: Unsubscribe from rooms
    
    Broadcasted events:
    - application_submitted: New job application received
    - application_approved: Application approved by manager
    - application_rejected: Application rejected
    - onboarding_started: Employee started onboarding
    - onboarding_completed: Employee completed onboarding
    - document_uploaded: Document uploaded by employee
    - form_submitted: Form submitted by employee
    - system_notification: System-wide notifications
    """
    user_id = None
    
    try:
        # Authenticate connection
        auth_data = await websocket_manager.authenticate_connection(websocket, token)
        user_id = auth_data["user_id"]
        role = auth_data["role"]
        property_id = auth_data.get("property_id")
        
        # Create connection info
        connection_info = ConnectionInfo(
            websocket=websocket,
            user_id=user_id,
            property_id=property_id,
            role=role,
            connected_at=datetime.now()
        )
        
        # Connect to WebSocket manager
        await websocket_manager.connect(connection_info)
        
        logger.debug(f"Dashboard WebSocket connected: user={user_id}, role={role}")  # Reduced to debug level
        
        # Message handling loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                
                # Limit message size to prevent memory issues
                if len(data) > 10000:  # 10KB limit
                    logger.warning(f"WebSocket message too large from user {user_id}: {len(data)} bytes")
                    await websocket.send_json({
                        "type": "error",
                        "data": {"message": "Message too large"}
                    })
                    continue
                
                message = json.loads(data)
                
                message_type = message.get("type")
                message_data = message.get("data", {})
                
                # Handle different message types
                if message_type == "heartbeat":
                    await websocket_manager.handle_heartbeat(user_id)
                    
                elif message_type == "subscribe":
                    room_id = message_data.get("room_id")
                    if room_id:
                        try:
                            await websocket_manager.subscribe_to_room(user_id, room_id)
                            await _send_response(websocket, "subscribe_success", {"room_id": room_id})
                        except PermissionError as e:
                            await _send_response(websocket, "subscribe_error", {"error": str(e)})
                
                elif message_type == "unsubscribe":
                    room_id = message_data.get("room_id")
                    if room_id:
                        await websocket_manager.unsubscribe_from_room(user_id, room_id)
                        await _send_response(websocket, "unsubscribe_success", {"room_id": room_id})
                
                elif message_type == "get_stats":
                    if role == UserRole.HR:  # Only HR can view stats
                        stats = websocket_manager.get_stats()
                        await _send_response(websocket, "stats", stats)
                    else:
                        await _send_response(websocket, "error", {"message": "Insufficient permissions"})
                
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    await _send_response(websocket, "error", {"message": "Unknown message type"})
                
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user_id}")
                await _send_response(websocket, "error", {"message": "Invalid JSON format"})
                
            except WebSocketDisconnect:
                logger.debug(f"WebSocket disconnected normally: user={user_id}")  # Reduced to debug level
                break
                
            except Exception as e:
                logger.error(f"Error handling WebSocket message for user {user_id}: {e}")
                await _send_response(websocket, "error", {"message": "Internal server error"})
    
    except ValueError as e:
        # Authentication error
        logger.warning(f"WebSocket authentication failed: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=4000, reason="Internal server error")
    
    finally:
        # Clean up connection
        if user_id:
            try:
                await websocket_manager.disconnect(user_id)
                logger.debug(f"WebSocket connection cleaned up: user={user_id}")  # Reduced to debug level
            except Exception as e:
                logger.error(f"Error during WebSocket cleanup for user {user_id}: {e}")


async def _send_response(websocket: WebSocket, response_type: str, data: Dict[str, Any]):
    """Send a response message to WebSocket client"""
    try:
        response = {
            "type": response_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_json(response)
    except Exception as e:
        logger.error(f"Error sending WebSocket response: {e}")


# HTTP endpoints for WebSocket management

@router.get("/stats", response_model=WebSocketStatsResponse)
async def get_websocket_stats():
    """
    Get WebSocket connection statistics (HR only)
    
    Returns:
        WebSocket statistics including active connections, rooms, and usage metrics
    """
    try:
        stats = websocket_manager.get_stats()
        return success_response(
            data=stats,
            message="WebSocket statistics retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error getting WebSocket stats: {e}")
        return error_response(
            message="Failed to retrieve WebSocket statistics",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/broadcast", response_model=APIResponse)
async def broadcast_event(
    request: WebSocketBroadcastRequest
):
    """
    Broadcast an event to WebSocket clients (Internal use only)
    
    This endpoint is used by other services to broadcast events to connected clients.
    Should be protected by internal API authentication in production.
    
    Args:
        request: Broadcast request containing event type, data, and targeting options
    
    Returns:
        Success response with broadcast details
    """
    try:
        event = BroadcastEvent(
            type=request.event_type,
            data=request.data,
            timestamp=datetime.now()
        )
        
        # Broadcast to specified rooms or all rooms
        if request.target_rooms:
            for room_id in request.target_rooms:
                await websocket_manager.broadcast_to_room(room_id, event)
        else:
            # Broadcast to all rooms if no specific targets
            for room_id in websocket_manager.rooms.keys():
                await websocket_manager.broadcast_to_room(room_id, event)
        
        # Send targeted messages to specific users
        if request.target_users:
            message = event.to_dict()
            for user_id in request.target_users:
                await websocket_manager.send_to_user(user_id, message)
        
        return success_response(
            data={
                "event_type": request.event_type,
                "rooms_targeted": request.target_rooms or list(websocket_manager.rooms.keys()),
                "users_targeted": request.target_users or [],
                "timestamp": event.timestamp.isoformat()
            },
            message="Event broadcast successfully"
        )
        
    except Exception as e:
        logger.error(f"Error broadcasting WebSocket event: {e}")
        return error_response(
            message="Failed to broadcast event",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/rooms", response_model=WebSocketRoomsResponse)
async def get_websocket_rooms():
    """
    Get information about active WebSocket rooms (HR only)
    
    Returns:
        List of active rooms with member counts and details
    """
    try:
        rooms_info = []
        for room_id, room in websocket_manager.rooms.items():
            rooms_info.append({
                "room_id": room_id,
                "member_count": len(room.members),
                "members": list(room.members),
                "created_at": room.created_at.isoformat()
            })
        
        return success_response(
            data={"rooms": rooms_info},
            message="WebSocket rooms retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting WebSocket rooms: {e}")
        return error_response(
            message="Failed to retrieve WebSocket rooms",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.post("/notify-user", response_model=APIResponse)
async def notify_user(
    request: WebSocketUserNotificationRequest
):
    """
    Send a notification to a specific user via WebSocket (Internal use only)
    
    Args:
        request: User notification request
    
    Returns:
        Success response confirming message delivery
    """
    try:
        message = {
            "type": "notification",
            "data": {
                "title": request.title,
                "message": request.message,
                "severity": request.severity,
                "action_url": request.action_url,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        success = await websocket_manager.send_to_user(request.user_id, message)
        
        if success:
            return success_response(
                data={"user_id": request.user_id, "delivered": True},
                message="Notification sent successfully"
            )
        else:
            return error_response(
                message="User is not currently connected",
                error_code=ErrorCode.RESOURCE_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Error sending user notification: {e}")
        return error_response(
            message="Failed to send notification",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR
        )


# Helper functions for other services to broadcast events

async def broadcast_application_event(
    event_type: str, 
    application_id: str, 
    property_id: str, 
    data: Dict[str, Any]
):
    """
    Broadcast application-related events to appropriate rooms
    
    Args:
        event_type: Type of event (e.g., 'application_submitted', 'application_approved')
        application_id: ID of the application
        property_id: ID of the property
        data: Additional event data
    """
    try:
        event = BroadcastEvent(
            type=event_type,
            data={
                "application_id": application_id,
                "property_id": property_id,
                **data
            }
        )
        
        # Broadcast to property room and global room
        await websocket_manager.broadcast_to_room(f"property-{property_id}", event)
        await websocket_manager.broadcast_to_room("global", event)
        
        logger.debug(f"Broadcasted {event_type} event for application {application_id}")  # Reduced to debug level
        
    except Exception as e:
        logger.error(f"Error broadcasting application event: {e}")


async def broadcast_onboarding_event(
    event_type: str,
    session_id: str,
    employee_id: str,
    property_id: str,
    data: Dict[str, Any]
):
    """
    Broadcast onboarding-related events to appropriate rooms
    
    Args:
        event_type: Type of event (e.g., 'onboarding_started', 'form_submitted')
        session_id: ID of the onboarding session
        employee_id: ID of the employee
        property_id: ID of the property
        data: Additional event data
    """
    try:
        event = BroadcastEvent(
            type=event_type,
            data={
                "session_id": session_id,
                "employee_id": employee_id,
                "property_id": property_id,
                **data
            }
        )
        
        # Broadcast to property room and global room
        await websocket_manager.broadcast_to_room(f"property-{property_id}", event)
        await websocket_manager.broadcast_to_room("global", event)
        
        logger.debug(f"Broadcasted {event_type} event for onboarding session {session_id}")  # Reduced to debug level
        
    except Exception as e:
        logger.error(f"Error broadcasting onboarding event: {e}")


async def broadcast_system_notification(message: str, severity: str = "info", target_role: Optional[str] = None):
    """
    Broadcast system-wide notifications
    
    Args:
        message: Notification message
        severity: Notification severity ('info', 'warning', 'error', 'success')
        target_role: Optional role to target ('HR', 'MANAGER'), None for all users
    """
    try:
        event = BroadcastEvent(
            type="system_notification",
            data={
                "message": message,
                "severity": severity,
                "target_role": target_role
            }
        )
        
        # Determine target rooms based on role
        if target_role == "HR":
            await websocket_manager.broadcast_to_room("global", event)
        elif target_role == "MANAGER":
            # Broadcast to all property rooms
            for room_id in websocket_manager.rooms.keys():
                if room_id.startswith("property-"):
                    await websocket_manager.broadcast_to_room(room_id, event)
        else:
            # Broadcast to all rooms
            for room_id in websocket_manager.rooms.keys():
                await websocket_manager.broadcast_to_room(room_id, event)
        
        logger.debug(f"Broadcasted system notification: {message}")  # Reduced to debug level
        
    except Exception as e:
        logger.error(f"Error broadcasting system notification: {e}")