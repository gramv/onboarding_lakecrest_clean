"""
WebSocket Integration Tests
Tests the complete WebSocket functionality including authentication, room subscriptions, and event broadcasting
"""
import pytest
import asyncio
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import WebSocketDisconnect

from app.main_enhanced import app
from app.websocket_manager import websocket_manager, BroadcastEvent
from app.websocket_router import broadcast_application_event, broadcast_onboarding_event, broadcast_system_notification
from app.auth import create_token
from app.models import UserRole


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def hr_token_valid(self, hr_user):
        """Create valid HR token"""
        return create_token(hr_user.id, hr_user.role)
    
    @pytest.fixture
    def manager_token_valid(self, manager_user):
        """Create valid manager token"""
        return create_token(manager_user.id, manager_user.role)
    
    async def test_websocket_connection_and_authentication(self, client, hr_token_valid):
        """Test WebSocket connection with valid authentication"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            # Should receive connection established message
            data = websocket.receive_json()
            
            assert data["type"] == "connection_established"
            assert "user_id" in data["data"]
            assert "connected_at" in data["data"]
            assert "rooms" in data["data"]
    
    def test_websocket_connection_invalid_token(self, client):
        """Test WebSocket connection with invalid token"""
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/dashboard?token=invalid-token"):
                pass
    
    async def test_websocket_room_subscription_hr(self, client, hr_token_valid):
        """Test HR user subscribing to global room"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            # Receive connection established message
            websocket.receive_json()
            
            # Send subscription request
            websocket.send_json({
                "type": "subscribe",
                "data": {"room_id": "global"}
            })
            
            # Should receive subscription success
            response = websocket.receive_json()
            assert response["type"] == "subscribe_success"
            assert response["data"]["room_id"] == "global"
    
    async def test_websocket_room_subscription_manager(self, client, manager_token_valid, manager_user):
        """Test manager user subscribing to property room"""
        with client.websocket_connect(f"/ws/dashboard?token={manager_token_valid}") as websocket:
            # Receive connection established message
            websocket.receive_json()
            
            # Send subscription request for own property
            property_room = f"property-{manager_user.property_id}"
            websocket.send_json({
                "type": "subscribe",
                "data": {"room_id": property_room}
            })
            
            # Should receive subscription success
            response = websocket.receive_json()
            assert response["type"] == "subscribe_success"
            assert response["data"]["room_id"] == property_room
    
    async def test_websocket_room_subscription_permission_denied(self, client, manager_token_valid):
        """Test manager trying to subscribe to global room (should fail)"""
        with client.websocket_connect(f"/ws/dashboard?token={manager_token_valid}") as websocket:
            # Receive connection established message
            websocket.receive_json()
            
            # Try to subscribe to global room (should fail)
            websocket.send_json({
                "type": "subscribe",
                "data": {"room_id": "global"}
            })
            
            # Should receive subscription error
            response = websocket.receive_json()
            assert response["type"] == "subscribe_error"
            assert "error" in response["data"]
    
    async def test_websocket_heartbeat(self, client, hr_token_valid):
        """Test WebSocket heartbeat mechanism"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            # Receive connection established message
            websocket.receive_json()
            
            # Send heartbeat
            websocket.send_json({
                "type": "heartbeat",
                "data": {"timestamp": datetime.now().isoformat()}
            })
            
            # Should receive heartbeat acknowledgment
            response = websocket.receive_json()
            assert response["type"] == "heartbeat_ack"
            assert "timestamp" in response["data"]
    
    async def test_websocket_stats_hr_only(self, client, hr_token_valid, manager_token_valid):
        """Test WebSocket stats access (HR only)"""
        # Test HR access
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            websocket.send_json({
                "type": "get_stats",
                "data": {}
            })
            
            response = websocket.receive_json()
            assert response["type"] == "stats"
            assert "active_connections" in response["data"]
            assert "total_connections" in response["data"]
        
        # Test Manager access (should be denied)
        with client.websocket_connect(f"/ws/dashboard?token={manager_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            websocket.send_json({
                "type": "get_stats",
                "data": {}
            })
            
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Insufficient permissions" in response["data"]["message"]
    
    async def test_websocket_broadcast_functionality(self, client, hr_token_valid, manager_token_valid, test_property):
        """Test event broadcasting to multiple connected clients"""
        # Connect HR user to global room
        hr_websocket = client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}")
        hr_websocket.__enter__()
        hr_websocket.receive_json()  # connection established
        
        # Connect manager to property room
        manager_websocket = client.websocket_connect(f"/ws/dashboard?token={manager_token_valid}")
        manager_websocket.__enter__()
        manager_websocket.receive_json()  # connection established
        
        try:
            # Broadcast application event
            await broadcast_application_event(
                event_type="application_submitted",
                application_id="test-app-123",
                property_id=test_property.id,
                data={"applicant_name": "John Doe"}
            )
            
            # Both clients should receive the event
            hr_message = hr_websocket.receive_json()
            assert hr_message["type"] == "application_submitted"
            assert hr_message["data"]["application_id"] == "test-app-123"
            
            manager_message = manager_websocket.receive_json()
            assert manager_message["type"] == "application_submitted"
            assert manager_message["data"]["application_id"] == "test-app-123"
            
        finally:
            hr_websocket.__exit__(None, None, None)
            manager_websocket.__exit__(None, None, None)
    
    async def test_websocket_system_notification_broadcast(self, client, hr_token_valid):
        """Test system notification broadcasting"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            # Broadcast system notification
            await broadcast_system_notification(
                message="System maintenance scheduled",
                severity="warning"
            )
            
            # Should receive system notification
            response = websocket.receive_json()
            assert response["type"] == "system_notification"
            assert response["data"]["message"] == "System maintenance scheduled"
            assert response["data"]["severity"] == "warning"
    
    async def test_multiple_connections_same_user(self, client, hr_token_valid):
        """Test handling of multiple connections from same user"""
        # First connection
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket1:
            websocket1.receive_json()  # connection established
            
            # Second connection from same user (should replace first)
            with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket2:
                websocket2.receive_json()  # connection established
                
                # First websocket should be closed automatically
                # Second websocket should be active
                
                # Test that second connection works
                websocket2.send_json({
                    "type": "heartbeat",
                    "data": {"timestamp": datetime.now().isoformat()}
                })
                
                response = websocket2.receive_json()
                assert response["type"] == "heartbeat_ack"
    
    async def test_websocket_connection_cleanup(self, client, hr_token_valid):
        """Test connection cleanup on disconnect"""
        initial_connections = websocket_manager.get_connection_count()
        
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            # Verify connection was added
            assert websocket_manager.get_connection_count() == initial_connections + 1
        
        # After context manager exit, connection should be cleaned up
        # Note: This might be asynchronous, so we may need to wait
        await asyncio.sleep(0.1)
        assert websocket_manager.get_connection_count() == initial_connections


class TestWebSocketAPIEndpoints:
    """Test WebSocket-related HTTP API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_websocket_stats_endpoint(self, client):
        """Test WebSocket stats HTTP endpoint"""
        response = client.get("/ws/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "active_connections" in data["data"]
        assert "total_connections" in data["data"]
        assert "messages_sent" in data["data"]
    
    def test_websocket_rooms_endpoint(self, client):
        """Test WebSocket rooms HTTP endpoint"""
        response = client.get("/ws/rooms")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "rooms" in data["data"]
    
    def test_broadcast_event_endpoint(self, client):
        """Test broadcast event HTTP endpoint"""
        broadcast_data = {
            "event_type": "test_event",
            "data": {"message": "Test broadcast"},
            "target_rooms": ["global"]
        }
        
        response = client.post("/ws/broadcast", json=broadcast_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert data["data"]["event_type"] == "test_event"
        assert "rooms_targeted" in data["data"]
    
    def test_notify_user_endpoint(self, client):
        """Test user notification HTTP endpoint"""
        notification_data = {
            "user_id": "test-user",
            "title": "Test Notification",
            "message": "This is a test notification",
            "severity": "info"
        }
        
        response = client.post("/ws/notify-user", json=notification_data)
        
        # Should return success even if user is not connected
        assert response.status_code == 200
        data = response.json()
        
        if data["status"] == "error":
            # User not connected
            assert data["error_code"] == "RESOURCE_NOT_FOUND"
        else:
            # User was connected
            assert data["status"] == "success"
            assert data["data"]["user_id"] == "test-user"


class TestWebSocketErrorHandling:
    """Test WebSocket error handling scenarios"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_websocket_invalid_json(self, client, hr_token_valid):
        """Test handling of invalid JSON messages"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            # Send invalid JSON
            websocket.send_text("invalid json")
            
            # Should receive error response
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Invalid JSON format" in response["data"]["message"]
    
    def test_websocket_unknown_message_type(self, client, hr_token_valid):
        """Test handling of unknown message types"""
        with client.websocket_connect(f"/ws/dashboard?token={hr_token_valid}") as websocket:
            websocket.receive_json()  # connection established
            
            # Send message with unknown type
            websocket.send_json({
                "type": "unknown_message_type",
                "data": {}
            })
            
            # Should receive error response
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Unknown message type" in response["data"]["message"]
    
    async def test_websocket_connection_with_expired_token(self, client, hr_user):
        """Test connection with expired token"""
        # Create expired token
        expired_token = create_token(
            hr_user.id, 
            hr_user.role, 
            expires_delta=timedelta(seconds=-1)
        )
        
        # Should fail to connect
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect(f"/ws/dashboard?token={expired_token}"):
                pass


# Test markers
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.integration
]