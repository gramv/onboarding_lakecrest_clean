#!/usr/bin/env python3
"""
Comprehensive WebSocket connection test to verify all functionality
"""
import asyncio
import websockets
import json
import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional

# Configuration
WS_URL = "ws://localhost:8000/ws/dashboard"
JWT_SECRET_KEY = "dev-secret"  # From .env.test
JWT_ALGORITHM = "HS256"

def create_token(role: str = "manager", user_id: str = "test-user-001", property_id: Optional[str] = "test-prop-001") -> str:
    """Create a JWT token for authentication"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "role": role,
        "property_id": property_id,
        "exp": now + timedelta(hours=1),
        "iat": now
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

async def test_manager_connection():
    """Test manager WebSocket connection"""
    print("\n=== Testing Manager Connection ===")
    token = create_token(role="manager", user_id="manager-001", property_id="001")
    url = f"{WS_URL}?token={token}"
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ Manager connected successfully")
            
            # Wait for connection established message
            response = await websocket.recv()
            data = json.loads(response)
            print(f"Initial response: {data['type']}")
            print(f"Subscribed rooms: {data['data']['rooms']}")
            
            # Send heartbeat
            await websocket.send(json.dumps({"type": "heartbeat", "data": {}}))
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "heartbeat_ack", "Heartbeat failed"
            print("✅ Heartbeat successful")
            
            # Try to get stats (should fail for manager)
            await websocket.send(json.dumps({"type": "get_stats", "data": {}}))
            response = await websocket.recv()
            data = json.loads(response)
            if data["type"] == "error":
                print("✅ Manager correctly denied stats access")
            
            await websocket.close()
            
    except Exception as e:
        print(f"❌ Manager test failed: {e}")
        return False
    
    return True

async def test_hr_connection():
    """Test HR WebSocket connection"""
    print("\n=== Testing HR Connection ===")
    token = create_token(role="hr", user_id="hr-001", property_id=None)
    url = f"{WS_URL}?token={token}"
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ HR connected successfully")
            
            # Wait for connection established message
            response = await websocket.recv()
            data = json.loads(response)
            print(f"Initial response: {data['type']}")
            print(f"Subscribed rooms: {data['data']['rooms']}")
            
            # Send heartbeat
            await websocket.send(json.dumps({"type": "heartbeat", "data": {}}))
            response = await websocket.recv()
            data = json.loads(response)
            assert data["type"] == "heartbeat_ack", "Heartbeat failed"
            print("✅ Heartbeat successful")
            
            # Get stats (should work for HR)
            await websocket.send(json.dumps({"type": "get_stats", "data": {}}))
            response = await websocket.recv()
            data = json.loads(response)
            if data["type"] == "stats":
                print(f"✅ HR can access stats: {data['data']}")
            
            await websocket.close()
            
    except Exception as e:
        print(f"❌ HR test failed: {e}")
        return False
    
    return True

async def test_invalid_token():
    """Test connection with invalid token"""
    print("\n=== Testing Invalid Token ===")
    url = f"{WS_URL}?token=invalid-token"
    
    try:
        async with websockets.connect(url) as websocket:
            print("❌ Should not have connected with invalid token")
            return False
    except websockets.exceptions.WebSocketException as e:
        if "403" in str(e) or "401" in str(e):
            print("✅ Connection correctly rejected with invalid token")
            return True
        else:
            print(f"❌ Unexpected error: {e}")
            return False

async def test_room_subscription():
    """Test room subscription functionality"""
    print("\n=== Testing Room Subscription ===")
    token = create_token(role="manager", user_id="manager-002", property_id="002")
    url = f"{WS_URL}?token={token}"
    
    try:
        async with websockets.connect(url) as websocket:
            print("✅ Connected for room subscription test")
            
            # Wait for connection established
            response = await websocket.recv()
            data = json.loads(response)
            initial_rooms = data['data']['rooms']
            print(f"Initial rooms: {initial_rooms}")
            
            # Try to subscribe to a new room
            await websocket.send(json.dumps({
                "type": "subscribe",
                "data": {"room_id": "test-room"}
            }))
            
            # Get response
            response = await websocket.recv()
            data = json.loads(response)
            
            if data["type"] == "subscribe_success":
                print(f"✅ Successfully subscribed to room: {data['data']['room_id']}")
            elif data["type"] == "subscribe_error":
                print(f"⚠️ Subscription denied: {data['data']['error']}")
            
            # Unsubscribe from room
            await websocket.send(json.dumps({
                "type": "unsubscribe",
                "data": {"room_id": initial_rooms[0] if initial_rooms else "test-room"}
            }))
            
            response = await websocket.recv()
            data = json.loads(response)
            
            if data["type"] == "unsubscribe_success":
                print(f"✅ Successfully unsubscribed from room: {data['data']['room_id']}")
            
            await websocket.close()
            
    except Exception as e:
        print(f"❌ Room subscription test failed: {e}")
        return False
    
    return True

async def run_all_tests():
    """Run all WebSocket tests"""
    print("=" * 50)
    print("WebSocket Endpoint Comprehensive Test")
    print("=" * 50)
    
    results = []
    
    # Run tests
    results.append(("Manager Connection", await test_manager_connection()))
    results.append(("HR Connection", await test_hr_connection()))
    results.append(("Invalid Token", await test_invalid_token()))
    results.append(("Room Subscription", await test_room_subscription()))
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All WebSocket tests passed!")
    else:
        print("\n⚠️ Some tests failed. Please review the output above.")
    
    return all_passed

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    exit(0 if success else 1)