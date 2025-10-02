"""
Tests for WebSocket connection management and real-time dashboard infrastructure
"""
import pytest
import asyncio
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main_enhanced import app
from app.models import User, UserRole
from app.auth import create_token
from app.websocket_manager import (
    WebSocketManager, 
    ConnectionInfo,
    WebSocketRoom,
    BroadcastEvent
)


class TestWebSocketConnection:
    """Test WebSocket connection establishment and basic functionality"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocket manager instance for testing"""
        return WebSocketManager()
    
    @pytest.fixture
    def mock_websocket(self):
        """Mock WebSocket connection for testing"""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.send_json = AsyncMock()
        websocket.close = AsyncMock()
        return websocket
    
    async def test_websocket_connection_establishment(self, websocket_manager, mock_websocket, hr_token):
        """Test successful WebSocket connection with valid authentication"""
        connection_info = ConnectionInfo(
            websocket=mock_websocket,
            user_id="hr-test-user",
            property_id="test-property-1",
            role=UserRole.HR,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection_info)
        
        assert "hr-test-user" in websocket_manager.active_connections
        assert websocket_manager.active_connections["hr-test-user"] == connection_info
        mock_websocket.accept.assert_called_once()
    
    async def test_websocket_connection_rejection_invalid_token(self, websocket_manager, mock_websocket):
        """Test WebSocket connection rejection with invalid token"""
        with pytest.raises(ValueError, match="Invalid authentication token"):
            await websocket_manager.authenticate_connection(mock_websocket, "invalid-token")
    
    async def test_websocket_connection_rejection_expired_token(self, websocket_manager, mock_websocket):
        """Test WebSocket connection rejection with expired token"""
        # Create an expired token
        expired_token = create_token(
            "test-user", 
            UserRole.MANAGER, 
            expires_delta=timedelta(minutes=-1)  # Expired 1 minute ago
        )
        
        with pytest.raises(ValueError, match="Token has expired"):
            await websocket_manager.authenticate_connection(mock_websocket, expired_token)
    
    async def test_websocket_disconnection(self, websocket_manager, mock_websocket, hr_token):
        """Test proper WebSocket disconnection and cleanup"""
        connection_info = ConnectionInfo(
            websocket=mock_websocket,
            user_id="hr-test-user",
            property_id="test-property-1",
            role=UserRole.HR,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection_info)
        await websocket_manager.disconnect("hr-test-user")
        
        assert "hr-test-user" not in websocket_manager.active_connections
        mock_websocket.close.assert_called_once()


class TestWebSocketRooms:
    """Test room-based subscription functionality"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocket manager instance for testing"""
        return WebSocketManager()
    
    @pytest.fixture
    def mock_websockets(self):
        """Create multiple mock WebSocket connections"""
        websockets = []
        for i in range(3):
            ws = AsyncMock()
            ws.accept = AsyncMock()
            ws.send_text = AsyncMock()
            ws.send_json = AsyncMock()
            ws.close = AsyncMock()
            websockets.append(ws)
        return websockets
    
    async def test_property_room_subscription(self, websocket_manager, mock_websockets):
        """Test managers subscribing to property-specific rooms"""
        # Connect manager to property room
        manager_connection = ConnectionInfo(
            websocket=mock_websockets[0],
            user_id="manager-1",
            property_id="property-1",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(manager_connection)
        await websocket_manager.subscribe_to_room("manager-1", "property-1")
        
        assert "property-1" in websocket_manager.rooms
        assert "manager-1" in websocket_manager.rooms["property-1"].members
    
    async def test_hr_global_subscription(self, websocket_manager, mock_websockets):
        """Test HR users subscribing to all updates"""
        # Connect HR user to global room
        hr_connection = ConnectionInfo(
            websocket=mock_websockets[0],
            user_id="hr-1",
            property_id="test-property-1",
            role=UserRole.HR,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(hr_connection)
        await websocket_manager.subscribe_to_room("hr-1", "global")
        
        assert "global" in websocket_manager.rooms
        assert "hr-1" in websocket_manager.rooms["global"].members
    
    async def test_multiple_room_subscriptions(self, websocket_manager, mock_websockets):
        """Test user subscribing to multiple rooms"""
        hr_connection = ConnectionInfo(
            websocket=mock_websockets[0],
            user_id="hr-1",
            property_id="test-property-1",
            role=UserRole.HR,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(hr_connection)
        await websocket_manager.subscribe_to_room("hr-1", "global")
        await websocket_manager.subscribe_to_room("hr-1", "property-1")
        await websocket_manager.subscribe_to_room("hr-1", "property-2")
        
        # Check all rooms contain the user
        assert "hr-1" in websocket_manager.rooms["global"].members
        assert "hr-1" in websocket_manager.rooms["property-1"].members
        assert "hr-1" in websocket_manager.rooms["property-2"].members
    
    async def test_room_cleanup_on_disconnect(self, websocket_manager, mock_websockets):
        """Test room cleanup when user disconnects"""
        connection = ConnectionInfo(
            websocket=mock_websockets[0],
            user_id="manager-1",
            property_id="property-1",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        await websocket_manager.subscribe_to_room("manager-1", "property-1")
        
        # Verify subscription
        assert "manager-1" in websocket_manager.rooms["property-1"].members
        
        # Disconnect and verify cleanup
        await websocket_manager.disconnect("manager-1")
        assert "manager-1" not in websocket_manager.rooms["property-1"].members


class TestEventBroadcasting:
    """Test event broadcasting and message delivery"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocket manager instance for testing"""
        return WebSocketManager()
    
    @pytest.fixture
    def mock_websockets(self):
        """Create multiple mock WebSocket connections"""
        websockets = []
        for i in range(5):
            ws = AsyncMock()
            ws.accept = AsyncMock()
            ws.send_text = AsyncMock()
            ws.send_json = AsyncMock()
            ws.close = AsyncMock()
            websockets.append(ws)
        return websockets
    
    async def test_broadcast_to_property_room(self, websocket_manager, mock_websockets):
        """Test broadcasting events to property-specific room"""
        # Setup multiple connections in same property
        connections = [
            ConnectionInfo(
                websocket=mock_websockets[0],
                user_id="manager-1",
                property_id="property-1",
                role=UserRole.MANAGER,
                connected_at=datetime.now()
            ),
            ConnectionInfo(
                websocket=mock_websockets[1],
                user_id="manager-2",
                property_id="property-1",
                role=UserRole.MANAGER,
                connected_at=datetime.now()
            )
        ]
        
        for conn in connections:
            await websocket_manager.connect(conn)
            await websocket_manager.subscribe_to_room(conn.user_id, "property-1")
        
        # Create and broadcast event
        event = BroadcastEvent(
            type="application_submitted",
            data={
                "application_id": "app-123",
                "property_id": "property-1",
                "applicant_name": "John Doe"
            },
            timestamp=datetime.now()
        )
        
        await websocket_manager.broadcast_to_room("property-1", event)
        
        # Verify both managers received the event
        for i in range(2):
            mock_websockets[i].send_json.assert_called_once()
            sent_data = mock_websockets[i].send_json.call_args[0][0]
            assert sent_data["type"] == "application_submitted"
            assert sent_data["data"]["application_id"] == "app-123"
    
    async def test_broadcast_to_global_room(self, websocket_manager, mock_websockets):
        """Test broadcasting events to global HR room"""
        # Setup HR connections
        hr_connections = [
            ConnectionInfo(
                websocket=mock_websockets[0],
                user_id="hr-1",
                property_id="property-1",
                role=UserRole.HR,
                connected_at=datetime.now()
            ),
            ConnectionInfo(
                websocket=mock_websockets[1],
                user_id="hr-2",
                property_id="property-2",
                role=UserRole.HR,
                connected_at=datetime.now()
            )
        ]
        
        for conn in hr_connections:
            await websocket_manager.connect(conn)
            await websocket_manager.subscribe_to_room(conn.user_id, "global")
        
        # Broadcast global event
        event = BroadcastEvent(
            type="system_maintenance",
            data={"message": "System will undergo maintenance at 2:00 AM"},
            timestamp=datetime.now()
        )
        
        await websocket_manager.broadcast_to_room("global", event)
        
        # Verify all HR users received the event
        for i in range(2):
            mock_websockets[i].send_json.assert_called_once()
    
    async def test_targeted_message_to_user(self, websocket_manager, mock_websockets):
        """Test sending targeted message to specific user"""
        connection = ConnectionInfo(
            websocket=mock_websockets[0],
            user_id="manager-1",
            property_id="property-1",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Send targeted message
        message = {
            "type": "urgent_notification",
            "data": {"message": "Please review the pending applications"}
        }
        
        await websocket_manager.send_to_user("manager-1", message)
        
        mock_websockets[0].send_json.assert_called_once_with(message)
    
    async def test_event_filtering_by_property(self, websocket_manager, mock_websockets):
        """Test that property-specific events are filtered correctly"""
        # Setup managers from different properties
        connections = [
            ConnectionInfo(
                websocket=mock_websockets[0],
                user_id="manager-1",
                property_id="property-1",
                role=UserRole.MANAGER,
                connected_at=datetime.now()
            ),
            ConnectionInfo(
                websocket=mock_websockets[1],
                user_id="manager-2",
                property_id="property-2",
                role=UserRole.MANAGER,
                connected_at=datetime.now()
            )
        ]
        
        for conn in connections:
            await websocket_manager.connect(conn)
            await websocket_manager.subscribe_to_room(conn.user_id, f"property-{conn.property_id.split('-')[1]}")
        
        # Broadcast event to property-1 only
        event = BroadcastEvent(
            type="application_approved",
            data={"application_id": "app-123", "property_id": "property-1"},
            timestamp=datetime.now()
        )
        
        await websocket_manager.broadcast_to_room("property-1", event)
        
        # Verify only manager-1 received the event
        mock_websockets[0].send_json.assert_called_once()
        mock_websockets[1].send_json.assert_not_called()


class TestConnectionState:
    """Test connection state management and error handling"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocket manager instance for testing"""
        return WebSocketManager()
    
    async def test_connection_state_tracking(self, websocket_manager):
        """Test that connection state is properly tracked"""
        mock_ws = AsyncMock()
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Test connection state
        assert websocket_manager.is_connected("test-user")
        assert websocket_manager.get_connection("test-user") == connection
        assert websocket_manager.get_connection_count() == 1
    
    async def test_duplicate_connection_handling(self, websocket_manager):
        """Test handling of duplicate connections from same user"""
        mock_ws1 = AsyncMock()
        mock_ws2 = AsyncMock()
        
        connection1 = ConnectionInfo(
            websocket=mock_ws1,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        connection2 = ConnectionInfo(
            websocket=mock_ws2,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=datetime.now() + timedelta(seconds=5)
        )
        
        await websocket_manager.connect(connection1)
        await websocket_manager.connect(connection2)  # Should replace first connection
        
        # Verify old connection was closed and new one is active
        mock_ws1.close.assert_called_once()
        assert websocket_manager.get_connection("test-user") == connection2
        assert websocket_manager.get_connection_count() == 1
    
    async def test_connection_cleanup_on_error(self, websocket_manager):
        """Test connection cleanup when WebSocket errors occur"""
        mock_ws = AsyncMock()
        mock_ws.send_json.side_effect = Exception("Connection error")
        
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Try to send message, should handle error and clean up
        message = {"type": "test", "data": {}}
        success = await websocket_manager.send_to_user("test-user", message)
        
        assert not success
        assert not websocket_manager.is_connected("test-user")
    
    async def test_heartbeat_monitoring(self, websocket_manager):
        """Test heartbeat monitoring for connection health"""
        mock_ws = AsyncMock()
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=datetime.now(),
            last_heartbeat=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Simulate heartbeat
        await websocket_manager.handle_heartbeat("test-user")
        
        # Verify heartbeat timestamp was updated
        updated_connection = websocket_manager.get_connection("test-user")
        assert updated_connection.last_heartbeat > connection.last_heartbeat
    
    async def test_stale_connection_cleanup(self, websocket_manager):
        """Test cleanup of stale connections"""
        mock_ws = AsyncMock()
        old_time = datetime.now() - timedelta(minutes=10)  # 10 minutes ago
        
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="test-user",
            property_id="test-property",
            role=UserRole.MANAGER,
            connected_at=old_time,
            last_heartbeat=old_time
        )
        
        await websocket_manager.connect(connection)
        
        # Run cleanup for connections older than 5 minutes
        await websocket_manager.cleanup_stale_connections(max_age_minutes=5)
        
        # Verify connection was cleaned up
        assert not websocket_manager.is_connected("test-user")
        mock_ws.close.assert_called_once()


class TestWebSocketSecurity:
    """Test WebSocket security and authentication"""
    
    @pytest.fixture
    def websocket_manager(self):
        """Create a WebSocket manager instance for testing"""
        return WebSocketManager()
    
    async def test_token_validation(self, websocket_manager, hr_user, hr_token):
        """Test JWT token validation for WebSocket connections"""
        mock_ws = AsyncMock()
        
        # Test valid token
        user_data = await websocket_manager.authenticate_connection(mock_ws, hr_token)
        assert user_data["user_id"] == hr_user.id
        assert user_data["role"] == UserRole.HR
    
    async def test_role_based_access_control(self, websocket_manager, manager_user, manager_token):
        """Test role-based access control for room subscriptions"""
        mock_ws = AsyncMock()
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id=manager_user.id,
            property_id=manager_user.property_id,
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Manager should be able to subscribe to their property room
        await websocket_manager.subscribe_to_room(manager_user.id, f"property-{manager_user.property_id}")
        
        # Manager should NOT be able to subscribe to global HR room
        with pytest.raises(PermissionError, match="Insufficient permissions"):
            await websocket_manager.subscribe_to_room(manager_user.id, "global")
    
    async def test_property_isolation(self, websocket_manager):
        """Test that managers can only access their own property's data"""
        mock_ws = AsyncMock()
        
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="manager-1",
            property_id="property-1",
            role=UserRole.MANAGER,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Should succeed for own property
        await websocket_manager.subscribe_to_room("manager-1", "property-1")
        
        # Should fail for different property
        with pytest.raises(PermissionError, match="Access denied"):
            await websocket_manager.subscribe_to_room("manager-1", "property-2")
    
    async def test_message_sanitization(self, websocket_manager):
        """Test that messages are properly sanitized before broadcasting"""
        mock_ws = AsyncMock()
        connection = ConnectionInfo(
            websocket=mock_ws,
            user_id="hr-1",
            property_id="property-1",
            role=UserRole.HR,
            connected_at=datetime.now()
        )
        
        await websocket_manager.connect(connection)
        
        # Test message with potentially dangerous content
        unsafe_message = {
            "type": "notification",
            "data": {
                "message": "<script>alert('xss')</script>",
                "sensitive_data": "SSN: 123-45-6789"
            }
        }
        
        # Should sanitize the message before sending
        await websocket_manager.send_to_user("hr-1", unsafe_message)
        
        # Verify message was sanitized
        mock_ws.send_json.assert_called_once()
        sent_message = mock_ws.send_json.call_args[0][0]
        assert "<script>" not in sent_message["data"]["message"]
        assert "SSN:" not in str(sent_message["data"])


# Integration test markers
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.integration
]