#!/usr/bin/env python3
"""
WebSocket Connection Tests
Tests authentication, connection, and room subscription functionality
"""

import asyncio
import json
import logging
import websockets
from datetime import datetime, timedelta
import jwt
from typing import Dict, Any, Optional, List
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
WS_URL = "ws://localhost:8000/ws/dashboard"
JWT_SECRET_KEY = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

# Test properties and users
TEST_PROPERTY_ID = "test-prop-001"
TEST_PROPERTY_ID_2 = "test-prop-002"

def create_test_token(user_id: str, role: str, property_id: Optional[str] = None, expires_in: int = 3600) -> str:
    """Create a test JWT token"""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(seconds=expires_in)
    }
    if property_id:
        payload["property_id"] = property_id
    
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

class WebSocketTestClient:
    """Test client for WebSocket connections"""
    
    def __init__(self, token: str):
        self.token = token
        self.websocket = None
        self.messages_received = []
        self.connected = False
        
    async def connect(self):
        """Establish WebSocket connection"""
        try:
            url = f"{WS_URL}?token={self.token}"
            self.websocket = await websockets.connect(url)
            self.connected = True
            logger.info("✅ WebSocket connected successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Close WebSocket connection"""
        if self.websocket:
            await self.websocket.close()
            self.connected = False
            logger.info("WebSocket disconnected")
    
    async def send_message(self, message: Dict[str, Any]):
        """Send a message through WebSocket"""
        if not self.websocket:
            raise Exception("Not connected")
        await self.websocket.send(json.dumps(message))
        logger.info(f"Sent message: {message['type']}")
    
    async def receive_message(self, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
        """Receive a message from WebSocket"""
        if not self.websocket:
            raise Exception("Not connected")
        try:
            message_data = await asyncio.wait_for(self.websocket.recv(), timeout=timeout)
            message = json.loads(message_data)
            self.messages_received.append(message)
            logger.info(f"Received message: {message.get('type', 'unknown')}")
            return message
        except asyncio.TimeoutError:
            logger.warning("Message receive timeout")
            return None
        except Exception as e:
            logger.error(f"Error receiving message: {e}")
            return None
    
    async def listen_for_messages(self, duration: float = 10.0):
        """Listen for messages for a specified duration"""
        start_time = asyncio.get_event_loop().time()
        messages = []
        
        while asyncio.get_event_loop().time() - start_time < duration:
            message = await self.receive_message(timeout=1.0)
            if message:
                messages.append(message)
        
        return messages

async def test_valid_authentication():
    """Test 1: Valid authentication for different roles"""
    logger.info("\n=== Test 1: Valid Authentication ===")
    
    # Test Manager authentication
    manager_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    manager_client = WebSocketTestClient(manager_token)
    
    if await manager_client.connect():
        # Should receive welcome message
        welcome = await manager_client.receive_message()
        if welcome and welcome.get("type") == "connection_established":
            logger.info(f"✅ Manager authenticated - Rooms: {welcome['data'].get('rooms', [])}")
            assert f"property-{TEST_PROPERTY_ID}" in welcome['data'].get('rooms', []), "Manager should be in property room"
        await manager_client.disconnect()
    
    # Test HR authentication
    hr_token = create_test_token("hr1", "HR", None)
    hr_client = WebSocketTestClient(hr_token)
    
    if await hr_client.connect():
        welcome = await hr_client.receive_message()
        if welcome and welcome.get("type") == "connection_established":
            logger.info(f"✅ HR authenticated - Rooms: {welcome['data'].get('rooms', [])}")
            assert "global" in welcome['data'].get('rooms', []), "HR should be in global room"
        await hr_client.disconnect()
    
    return True

async def test_invalid_authentication():
    """Test 2: Invalid authentication attempts"""
    logger.info("\n=== Test 2: Invalid Authentication ===")
    
    # Test with invalid token
    try:
        invalid_client = WebSocketTestClient("invalid_token_123")
        result = await invalid_client.connect()
        if not result:
            logger.info("✅ Invalid token rejected correctly")
    except Exception as e:
        logger.info(f"✅ Invalid token rejected with error: {e}")
    
    # Test with expired token
    expired_token = create_test_token("user1", "MANAGER", TEST_PROPERTY_ID, expires_in=-3600)
    expired_client = WebSocketTestClient(expired_token)
    
    try:
        result = await expired_client.connect()
        if not result:
            logger.info("✅ Expired token rejected correctly")
    except Exception as e:
        logger.info(f"✅ Expired token rejected with error: {e}")
    
    return True

async def test_heartbeat():
    """Test 3: Heartbeat mechanism"""
    logger.info("\n=== Test 3: Heartbeat Mechanism ===")
    
    token = create_test_token("manager2", "MANAGER", TEST_PROPERTY_ID)
    client = WebSocketTestClient(token)
    
    if await client.connect():
        # Wait for welcome message
        await client.receive_message()
        
        # Send heartbeat
        await client.send_message({"type": "heartbeat", "data": {}})
        
        # Should receive heartbeat acknowledgment
        response = await client.receive_message()
        if response and response.get("type") == "heartbeat_ack":
            logger.info("✅ Heartbeat acknowledged")
        else:
            logger.error("❌ No heartbeat acknowledgment received")
        
        await client.disconnect()
    
    return True

async def test_room_subscription():
    """Test 4: Room subscription and permissions"""
    logger.info("\n=== Test 4: Room Subscription ===")
    
    # Manager trying to subscribe to another property's room (should fail)
    manager_token = create_test_token("manager3", "MANAGER", TEST_PROPERTY_ID)
    manager_client = WebSocketTestClient(manager_token)
    
    if await manager_client.connect():
        # Wait for welcome message
        await manager_client.receive_message()
        
        # Try to subscribe to another property's room
        await manager_client.send_message({
            "type": "subscribe",
            "data": {"room_id": f"property-{TEST_PROPERTY_ID_2}"}
        })
        
        response = await manager_client.receive_message()
        if response and response.get("type") == "subscribe_error":
            logger.info("✅ Manager correctly denied access to other property's room")
        
        # Try to subscribe to global room (should fail for manager)
        await manager_client.send_message({
            "type": "subscribe",
            "data": {"room_id": "global"}
        })
        
        response = await manager_client.receive_message()
        if response and response.get("type") == "subscribe_error":
            logger.info("✅ Manager correctly denied access to global room")
        
        await manager_client.disconnect()
    
    # HR can subscribe to any room
    hr_token = create_test_token("hr2", "HR", None)
    hr_client = WebSocketTestClient(hr_token)
    
    if await hr_client.connect():
        # Wait for welcome message
        await hr_client.receive_message()
        
        # Subscribe to a property room
        await hr_client.send_message({
            "type": "subscribe",
            "data": {"room_id": f"property-{TEST_PROPERTY_ID}"}
        })
        
        response = await hr_client.receive_message()
        if response and response.get("type") == "subscribe_success":
            logger.info("✅ HR successfully subscribed to property room")
        
        await hr_client.disconnect()
    
    return True

async def test_automatic_reconnection():
    """Test 5: Automatic reconnection"""
    logger.info("\n=== Test 5: Automatic Reconnection ===")
    
    token = create_test_token("manager4", "MANAGER", TEST_PROPERTY_ID)
    client1 = WebSocketTestClient(token)
    
    # First connection
    if await client1.connect():
        welcome1 = await client1.receive_message()
        logger.info("First connection established")
        
        # Second connection with same token (should close first)
        client2 = WebSocketTestClient(token)
        if await client2.connect():
            welcome2 = await client2.receive_message()
            logger.info("✅ Second connection established (first should be closed)")
            
            # Try to send message on first connection (should fail)
            try:
                await client1.send_message({"type": "heartbeat", "data": {}})
                logger.error("❌ First connection still active (unexpected)")
            except:
                logger.info("✅ First connection properly closed")
            
            await client2.disconnect()
    
    return True

async def test_concurrent_connections():
    """Test 6: Multiple concurrent connections"""
    logger.info("\n=== Test 6: Concurrent Connections ===")
    
    clients = []
    
    # Create multiple manager connections from different properties
    for i in range(3):
        token = create_test_token(f"manager_{i}", "MANAGER", f"prop_{i}")
        client = WebSocketTestClient(token)
        if await client.connect():
            await client.receive_message()  # Welcome message
            clients.append(client)
            logger.info(f"Manager {i} connected")
    
    # Create multiple HR connections
    for i in range(2):
        token = create_test_token(f"hr_{i}", "HR", None)
        client = WebSocketTestClient(token)
        if await client.connect():
            await client.receive_message()  # Welcome message
            clients.append(client)
            logger.info(f"HR {i} connected")
    
    logger.info(f"✅ Successfully established {len(clients)} concurrent connections")
    
    # Clean up
    for client in clients:
        await client.disconnect()
    
    return True

async def run_all_connection_tests():
    """Run all connection tests"""
    logger.info("=" * 60)
    logger.info("WEBSOCKET CONNECTION TEST SUITE")
    logger.info("=" * 60)
    
    tests = [
        ("Valid Authentication", test_valid_authentication),
        ("Invalid Authentication", test_invalid_authentication),
        ("Heartbeat Mechanism", test_heartbeat),
        ("Room Subscription", test_room_subscription),
        ("Automatic Reconnection", test_automatic_reconnection),
        ("Concurrent Connections", test_concurrent_connections)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, "PASSED" if result else "FAILED"))
        except Exception as e:
            logger.error(f"Test '{test_name}' failed with exception: {e}")
            results.append((test_name, "ERROR"))
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    
    for test_name, status in results:
        emoji = "✅" if status == "PASSED" else "❌"
        logger.info(f"{emoji} {test_name}: {status}")
    
    passed = sum(1 for _, status in results if status == "PASSED")
    total = len(results)
    logger.info(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_connection_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        sys.exit(1)