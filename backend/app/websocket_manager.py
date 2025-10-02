"""
WebSocket manager for real-time dashboard infrastructure
Handles WebSocket connections, authentication, room-based subscriptions, and event broadcasting
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, Any, List
from dataclasses import dataclass, field
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
import jwt
from contextlib import asynccontextmanager

try:
    import bleach
    HAS_BLEACH = True
except ImportError:
    HAS_BLEACH = False

from .models import UserRole
from .auth import JWT_SECRET_KEY, JWT_ALGORITHM
import jwt as jwt_lib


logger = logging.getLogger(__name__)


@dataclass
class ConnectionInfo:
    """Information about a WebSocket connection"""
    websocket: WebSocket
    user_id: str
    property_id: str
    role: UserRole
    connected_at: datetime
    last_heartbeat: Optional[datetime] = None
    subscribed_rooms: Set[str] = field(default_factory=set)


@dataclass
class WebSocketRoom:
    """Represents a WebSocket room for grouped messaging"""
    room_id: str
    members: Set[str] = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.now)
    
    def add_member(self, user_id: str):
        """Add a user to this room"""
        self.members.add(user_id)
    
    def remove_member(self, user_id: str):
        """Remove a user from this room"""
        self.members.discard(user_id)
    
    def is_empty(self) -> bool:
        """Check if room has no members"""
        return len(self.members) == 0


@dataclass
class BroadcastEvent:
    """Event to broadcast to WebSocket connections"""
    type: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    target_rooms: Optional[List[str]] = None
    target_users: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization"""
        return {
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }


class WebSocketManager:
    """
    Manages WebSocket connections for real-time dashboard updates
    
    Features:
    - Connection authentication via JWT tokens
    - Property-based room subscriptions for managers
    - Global room for HR users
    - Event broadcasting with role-based filtering
    - Connection state management and cleanup
    - Automatic reconnection support
    """
    
    def __init__(self):
        # Active WebSocket connections
        self.active_connections: Dict[str, ConnectionInfo] = {}
        
        # Room-based subscriptions
        self.rooms: Dict[str, WebSocketRoom] = {}
        
        # Event broadcasting queue
        self._broadcast_queue = asyncio.Queue()
        
        # Connection cleanup task
        self._cleanup_task = None
        
        # Statistics
        self.stats = {
            "total_connections": 0,
            "messages_sent": 0,
            "events_broadcasted": 0,
            "connection_errors": 0
        }
        
        # Background tasks will be started when first connection is made
        # self._start_background_tasks()
    
    def _start_background_tasks(self):
        """Start background tasks for connection management"""
        try:
            loop = asyncio.get_running_loop()
            if self._cleanup_task is None or self._cleanup_task.done():
                self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        except RuntimeError:
            # No event loop running, tasks will be started when needed
            pass
    
    async def _periodic_cleanup(self):
        """Periodic cleanup of stale connections"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self.cleanup_stale_connections(max_age_minutes=10)
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {e}")
    
    async def authenticate_connection(self, websocket: WebSocket, token: str) -> Dict[str, Any]:
        """
        Authenticate WebSocket connection using JWT token
        
        Args:
            websocket: WebSocket connection
            token: JWT authentication token
            
        Returns:
            Dict containing user authentication data
            
        Raises:
            ValueError: If token is invalid or expired
        """
        try:
            # Decode JWT token
            payload = jwt_lib.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            if not payload:
                raise ValueError("Invalid authentication token")
            
            # Use 'sub' field (standard JWT) with fallback for backward compatibility
            user_id = payload.get("sub") or payload.get("manager_id") or payload.get("user_id")
            role = payload.get("role")
            property_id = payload.get("property_id")
            
            if not user_id or not role:
                logger.error(f"Invalid token payload - user_id: {user_id}, role: {role}, payload keys: {payload.keys()}")
                raise ValueError("Invalid token payload")
            
            # Check token expiration
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp) < datetime.now():
                raise ValueError("Token has expired")
            
            return {
                "user_id": user_id,
                "role": UserRole(role) if isinstance(role, str) else role,
                "property_id": property_id
            }
            
        except jwt_lib.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt_lib.InvalidTokenError:
            raise ValueError("Invalid authentication token")
        except Exception as e:
            logger.error(f"Token authentication error: {e}")
            raise ValueError("Authentication failed")
    
    async def connect(self, connection_info: ConnectionInfo):
        """
        Register a new WebSocket connection
        
        Args:
            connection_info: Connection information including WebSocket and user data
        """
        try:
            # Accept the WebSocket connection
            await connection_info.websocket.accept()
            
            user_id = connection_info.user_id
            
            # Close existing connection if user is already connected
            if user_id in self.active_connections:
                logger.info(f"Closing existing connection for user {user_id}")
                await self._close_existing_connection(user_id)
            
            # Register new connection
            self.active_connections[user_id] = connection_info
            self.stats["total_connections"] += 1
            
            # Auto-subscribe to appropriate rooms based on role
            await self._auto_subscribe_user(connection_info)
            
            # Start background tasks if not already started
            self._start_background_tasks()
            
            logger.info(f"WebSocket connection established for user {user_id} (role: {connection_info.role})")
            
            # Send welcome message
            welcome_msg = {
                "type": "connection_established",
                "data": {
                    "user_id": user_id,
                    "connected_at": connection_info.connected_at.isoformat(),
                    "rooms": list(connection_info.subscribed_rooms)
                }
            }
            await self.send_to_user(user_id, welcome_msg)
            
        except Exception as e:
            logger.error(f"Error establishing WebSocket connection: {e}")
            self.stats["connection_errors"] += 1
            raise
    
    async def _close_existing_connection(self, user_id: str):
        """Close existing connection for a user"""
        if user_id in self.active_connections:
            old_connection = self.active_connections[user_id]
            try:
                # Check if WebSocket is still open before trying to close
                if old_connection.websocket.state in (WebSocketState.CONNECTING, WebSocketState.CONNECTED):
                    await old_connection.websocket.close()
            except Exception as e:
                logger.warning(f"Error closing existing connection: {e}")
            finally:
                # Always remove from rooms and connections even if close fails
                await self._remove_from_all_rooms(user_id)
                # Remove from active connections here to prevent KeyError
                if user_id in self.active_connections:
                    del self.active_connections[user_id]
    
    async def _auto_subscribe_user(self, connection_info: ConnectionInfo):
        """Automatically subscribe user to appropriate rooms based on their role"""
        user_id = connection_info.user_id
        role = connection_info.role
        property_id = connection_info.property_id
        
        try:
            if role == UserRole.HR:
                # HR users get access to global room and all property rooms
                await self.subscribe_to_room(user_id, "global")
                logger.debug(f"HR user {user_id} subscribed to global room")  # Reduced to debug level
                
            elif role == UserRole.MANAGER:
                # Managers get access to their property room only
                if property_id:
                    room_id = f"property-{property_id}"
                    await self.subscribe_to_room(user_id, room_id)
                    logger.debug(f"Manager {user_id} subscribed to room {room_id}")  # Debug level to reduce noise
                
        except Exception as e:
            logger.error(f"Error in auto-subscription for user {user_id}: {e}")
    
    async def disconnect(self, user_id: str):
        """
        Disconnect and clean up a WebSocket connection
        
        Args:
            user_id: ID of the user to disconnect
        """
        if user_id not in self.active_connections:
            return
        
        connection = self.active_connections[user_id]
        
        try:
            # Check if WebSocket is still open before trying to close
            if connection.websocket.state in (WebSocketState.CONNECTING, WebSocketState.CONNECTED):
                await connection.websocket.close()
        except Exception as e:
            logger.warning(f"Error closing WebSocket: {e}")
        finally:
            # Always clean up even if close fails
            # Remove from all rooms
            await self._remove_from_all_rooms(user_id)
            
            # Remove from active connections (check again to prevent KeyError)
            if user_id in self.active_connections:
                del self.active_connections[user_id]
            
            logger.info(f"WebSocket connection closed for user {user_id}")
    
    async def _remove_from_all_rooms(self, user_id: str):
        """Remove user from all subscribed rooms"""
        connection = self.active_connections.get(user_id)
        if connection:
            for room_id in connection.subscribed_rooms.copy():
                await self.unsubscribe_from_room(user_id, room_id)
    
    async def subscribe_to_room(self, user_id: str, room_id: str):
        """
        Subscribe a user to a WebSocket room
        
        Args:
            user_id: ID of the user
            room_id: ID of the room to subscribe to
            
        Raises:
            PermissionError: If user doesn't have permission to access the room
        """
        connection = self.active_connections.get(user_id)
        if not connection:
            raise ValueError(f"User {user_id} is not connected")
        
        # Check permissions
        if not self._check_room_permission(connection, room_id):
            raise PermissionError(f"User {user_id} does not have permission to access room {room_id}")
        
        # Create room if it doesn't exist
        if room_id not in self.rooms:
            self.rooms[room_id] = WebSocketRoom(room_id=room_id)
        
        # Add user to room
        self.rooms[room_id].add_member(user_id)
        connection.subscribed_rooms.add(room_id)
        
        logger.debug(f"User {user_id} subscribed to room {room_id}")  # Debug level to reduce noise
    
    async def unsubscribe_from_room(self, user_id: str, room_id: str):
        """
        Unsubscribe a user from a WebSocket room
        
        Args:
            user_id: ID of the user
            room_id: ID of the room to unsubscribe from
        """
        connection = self.active_connections.get(user_id)
        if connection:
            connection.subscribed_rooms.discard(room_id)
        
        if room_id in self.rooms:
            self.rooms[room_id].remove_member(user_id)
            
            # Clean up empty rooms
            if self.rooms[room_id].is_empty():
                del self.rooms[room_id]
                logger.debug(f"Removed empty room {room_id}")  # Reduced to debug level
        
        logger.debug(f"User {user_id} unsubscribed from room {room_id}")  # Reduced to debug level
    
    def _check_room_permission(self, connection: ConnectionInfo, room_id: str) -> bool:
        """
        Check if a user has permission to access a specific room
        
        Args:
            connection: User connection information
            room_id: ID of the room to check
            
        Returns:
            True if user has permission, False otherwise
        """
        role = connection.role
        property_id = connection.property_id
        
        # HR users have access to all rooms
        if role == UserRole.HR:
            return True
        
        # Global room is HR only
        if room_id == "global":
            return role == UserRole.HR
        
        # Property rooms - managers can only access their own property
        if room_id.startswith("property-"):
            expected_property_id = room_id.replace("property-", "")
            return role == UserRole.MANAGER and property_id == expected_property_id
        
        # Session-specific rooms for lock notifications
        if room_id.startswith("session-"):
            # Allow users who have access to the session
            # This would typically be the employee, manager, and HR
            return True
        
        # Default deny
        return False
    
    async def broadcast_to_room(self, room_id: str, event: BroadcastEvent):
        """
        Broadcast an event to all users in a specific room
        
        Args:
            room_id: ID of the room to broadcast to
            event: Event to broadcast
        """
        if room_id not in self.rooms:
            logger.warning(f"Attempted to broadcast to non-existent room: {room_id}")
            return
        
        room = self.rooms[room_id]
        message = event.to_dict()
        
        # Sanitize message content
        message = self._sanitize_message(message)
        
        # Send to all room members
        failed_connections = []
        for user_id in room.members:
            success = await self.send_to_user(user_id, message)
            if not success:
                failed_connections.append(user_id)
        
        # Clean up failed connections
        for user_id in failed_connections:
            await self._handle_connection_error(user_id)
        
        self.stats["events_broadcasted"] += 1
        logger.debug(f"Broadcasted event '{event.type}' to room {room_id} ({len(room.members)} users)")  # Debug level to reduce noise
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> bool:
        """
        Send a message to a specific user
        
        Args:
            user_id: ID of the user to send to
            message: Message to send
            
        Returns:
            True if message was sent successfully, False otherwise
        """
        connection = self.active_connections.get(user_id)
        if not connection:
            logger.warning(f"Attempted to send message to non-connected user: {user_id}")
            return False
        
        try:
            # Sanitize message
            sanitized_message = self._sanitize_message(message)
            
            # Send message
            await connection.websocket.send_json(sanitized_message)
            self.stats["messages_sent"] += 1
            
            # Update last activity
            connection.last_heartbeat = datetime.now()
            
            return True
            
        except WebSocketDisconnect:
            logger.debug(f"WebSocket disconnected for user {user_id}")  # Reduced to debug level
            await self.disconnect(user_id)
            return False
            
        except Exception as e:
            logger.error(f"Error sending message to user {user_id}: {e}")
            self.stats["connection_errors"] += 1
            await self._handle_connection_error(user_id)
            return False
    
    def _sanitize_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize message content to prevent XSS and remove sensitive data
        
        Args:
            message: Message to sanitize
            
        Returns:
            Sanitized message
        """
        sanitized = {}
        
        for key, value in message.items():
            if isinstance(value, str):
                # Remove HTML tags and potential XSS
                if HAS_BLEACH:
                    sanitized[key] = bleach.clean(value, tags=[], strip=True)
                else:
                    # Basic sanitization without bleach
                    sanitized[key] = value.replace('<', '&lt;').replace('>', '&gt;')
            elif isinstance(value, dict):
                # Recursively sanitize nested dictionaries
                sanitized[key] = self._sanitize_message(value)
            elif isinstance(value, list):
                # Sanitize lists
                sanitized_list = []
                for item in value:
                    if isinstance(item, str):
                        if HAS_BLEACH:
                            sanitized_list.append(bleach.clean(item, tags=[], strip=True))
                        else:
                            sanitized_list.append(item.replace('<', '&lt;').replace('>', '&gt;'))
                    else:
                        sanitized_list.append(item)
                sanitized[key] = sanitized_list
            else:
                sanitized[key] = value
        
        # Remove sensitive data patterns
        sensitive_patterns = ["ssn", "social_security", "password", "token", "credit_card"]
        for key in list(sanitized.keys()):
            if any(pattern in key.lower() for pattern in sensitive_patterns):
                if isinstance(sanitized[key], str) and len(sanitized[key]) > 4:
                    # Mask sensitive data
                    sanitized[key] = "***" + sanitized[key][-4:]
        
        return sanitized
    
    async def _handle_connection_error(self, user_id: str):
        """Handle connection errors by cleaning up the connection"""
        logger.warning(f"Handling connection error for user {user_id}")
        await self.disconnect(user_id)
    
    async def handle_heartbeat(self, user_id: str):
        """
        Handle heartbeat message from client
        
        Args:
            user_id: ID of the user sending heartbeat
        """
        connection = self.active_connections.get(user_id)
        if connection:
            connection.last_heartbeat = datetime.now()
            
            # Send heartbeat acknowledgment
            response = {
                "type": "heartbeat_ack",
                "data": {"timestamp": connection.last_heartbeat.isoformat()}
            }
            await self.send_to_user(user_id, response)
    
    async def cleanup_stale_connections(self, max_age_minutes: int = 10):
        """
        Clean up stale connections that haven't sent heartbeats
        
        Args:
            max_age_minutes: Maximum age in minutes before considering connection stale
        """
        cutoff_time = datetime.now() - timedelta(minutes=max_age_minutes)
        stale_connections = []
        
        for user_id, connection in self.active_connections.items():
            last_activity = connection.last_heartbeat or connection.connected_at
            if last_activity < cutoff_time:
                stale_connections.append(user_id)
        
        for user_id in stale_connections:
            logger.debug(f"Cleaning up stale connection for user {user_id}")  # Reduced to debug level
            await self.disconnect(user_id)
        
        if stale_connections:
            logger.debug(f"Cleaned up {len(stale_connections)} stale connections")  # Reduced to debug level
    
    # Connection state queries
    
    def is_connected(self, user_id: str) -> bool:
        """Check if a user is currently connected"""
        return user_id in self.active_connections
    
    def get_connection(self, user_id: str) -> Optional[ConnectionInfo]:
        """Get connection information for a user"""
        return self.active_connections.get(user_id)
    
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return len(self.active_connections)
    
    def get_room_members(self, room_id: str) -> Set[str]:
        """Get members of a specific room"""
        room = self.rooms.get(room_id)
        return room.members.copy() if room else set()
    
    def get_user_rooms(self, user_id: str) -> Set[str]:
        """Get rooms a user is subscribed to"""
        connection = self.active_connections.get(user_id)
        return connection.subscribed_rooms.copy() if connection else set()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics"""
        return {
            **self.stats,
            "active_connections": len(self.active_connections),
            "active_rooms": len(self.rooms),
            "room_details": {
                room_id: len(room.members) 
                for room_id, room in self.rooms.items()
            }
        }
    
    # Session lock notification methods
    
    async def broadcast_to_session(self, session_id: str, data: Dict[str, Any]):
        """
        Broadcast an event to all users with access to a specific session
        
        Args:
            session_id: ID of the onboarding session
            data: Event data to broadcast
        """
        room_id = f"session-{session_id}"
        event = BroadcastEvent(
            type=data.get('type', 'session_update'),
            data=data
        )
        await self.broadcast_to_room(room_id, event)
    
    async def notify_lock_status(self, session_id: str, lock_event: Dict[str, Any]):
        """
        Notify all session participants about lock status changes
        
        Args:
            session_id: ID of the session
            lock_event: Lock event details (type, locked_by, etc.)
        """
        await self.broadcast_to_session(session_id, {
            **lock_event,
            'session_id': session_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    async def notify_unsaved_changes(self, session_id: str, user_id: str, has_changes: bool):
        """
        Notify about unsaved changes in a session
        
        Args:
            session_id: ID of the session
            user_id: ID of the user with unsaved changes
            has_changes: Whether there are unsaved changes
        """
        await self.broadcast_to_session(session_id, {
            'type': 'unsaved_changes',
            'session_id': session_id,
            'user_id': user_id,
            'has_unsaved_changes': has_changes,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    async def shutdown(self):
        """Gracefully shutdown the WebSocket manager"""
        logger.info("Shutting down WebSocket manager...")
        
        # Close all active connections
        for user_id in list(self.active_connections.keys()):
            await self.disconnect(user_id)
        
        # Cancel background tasks
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        logger.info("WebSocket manager shutdown complete")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()


@asynccontextmanager
async def get_websocket_manager():
    """Context manager to get the global WebSocket manager"""
    yield websocket_manager