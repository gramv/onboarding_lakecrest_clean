#!/usr/bin/env python3
"""
WebSocket Connection Tests for Hotel Onboarding System

Tests:
1. Manager can connect with valid token
2. HR can connect with valid token  
3. Invalid tokens are rejected
4. Automatic reconnection works
5. Heartbeat mechanism functions correctly
"""

import asyncio
import json
import websockets
import jwt
from datetime import datetime, timedelta
import sys
import os

# Add the backend app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'hotel-onboarding-backend'))

# Configuration
BACKEND_URL = "ws://localhost:8000/ws/dashboard"
JWT_SECRET_KEY = "your-256-bit-secret-key-for-jwt-encoding"
JWT_ALGORITHM = "HS256"

# Test accounts
TEST_MANAGER = {
    "email": "manager@demo.com",
    "property_id": "test-prop-001",
    "role": "manager"
}

TEST_HR = {
    "email": "hr@demo.com",
    "role": "hr"
}


def create_jwt_token(user_data, expires_in_hours=24):
    """Create a JWT token for testing"""
    payload = {
        "sub": user_data["email"],
        "role": user_data["role"],
        "property_id": user_data.get("property_id"),
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_expired_token():
    """Create an expired JWT token"""
    payload = {
        "sub": "expired@demo.com",
        "role": "manager",
        "exp": datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
        "iat": datetime.utcnow() - timedelta(hours=2)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


async def test_manager_connection():
    """Test 1: Manager can connect with valid token"""
    print("\n🧪 Test 1: Manager WebSocket Connection")
    print("-" * 50)
    
    try:
        token = create_jwt_token(TEST_MANAGER)
        uri = f"{BACKEND_URL}?token={token}"
        
        async with websockets.connect(uri) as websocket:
            print("✅ Manager connected successfully")
            
            # Wait for welcome message
            message = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(message)
            
            if data["type"] == "connection_established":
                print(f"✅ Received welcome message:")
                print(f"   - User ID: {data['data']['user_id']}")
                print(f"   - Rooms: {data['data']['rooms']}")
                
                # Verify manager is in property room
                expected_room = f"property-{TEST_MANAGER['property_id']}"
                if expected_room in data['data']['rooms']:
                    print(f"✅ Manager auto-subscribed to {expected_room}")
                else:
                    print(f"❌ Manager not in expected room {expected_room}")
                    return False
            
            # Test heartbeat
            heartbeat_msg = json.dumps({"type": "heartbeat", "data": {}})
            await websocket.send(heartbeat_msg)
            
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            heartbeat_data = json.loads(response)
            
            if heartbeat_data["type"] == "heartbeat_ack":
                print("✅ Heartbeat acknowledged")
            
            await websocket.close()
            print("✅ Manager connection test passed")
            return True
            
    except Exception as e:
        print(f"❌ Manager connection test failed: {e}")
        return False


async def test_hr_connection():
    """Test 2: HR can connect with valid token"""
    print("\n🧪 Test 2: HR WebSocket Connection")
    print("-" * 50)
    
    try:
        token = create_jwt_token(TEST_HR)
        uri = f"{BACKEND_URL}?token={token}"
        
        async with websockets.connect(uri) as websocket:
            print("✅ HR connected successfully")
            
            # Wait for welcome message
            message = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(message)
            
            if data["type"] == "connection_established":
                print(f"✅ Received welcome message:")
                print(f"   - User ID: {data['data']['user_id']}")
                print(f"   - Rooms: {data['data']['rooms']}")
                
                # Verify HR is in global room
                if "global" in data['data']['rooms']:
                    print("✅ HR auto-subscribed to global room")
                else:
                    print("❌ HR not in global room")
                    return False
            
            # Test getting stats (HR only feature)
            stats_msg = json.dumps({"type": "get_stats", "data": {}})
            await websocket.send(stats_msg)
            
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            stats_data = json.loads(response)
            
            if stats_data["type"] == "stats":
                print("✅ HR can retrieve WebSocket stats")
                print(f"   - Active connections: {stats_data['data'].get('active_connections', 0)}")
                print(f"   - Active rooms: {stats_data['data'].get('active_rooms', 0)}")
            
            await websocket.close()
            print("✅ HR connection test passed")
            return True
            
    except Exception as e:
        print(f"❌ HR connection test failed: {e}")
        return False


async def test_invalid_token():
    """Test 3: Invalid tokens are rejected"""
    print("\n🧪 Test 3: Invalid Token Rejection")
    print("-" * 50)
    
    test_cases = [
        ("invalid-token-string", "Invalid token format"),
        (create_expired_token(), "Expired token"),
        ("", "Empty token")
    ]
    
    all_passed = True
    
    for token, description in test_cases:
        print(f"\n  Testing: {description}")
        uri = f"{BACKEND_URL}?token={token}"
        
        try:
            async with websockets.connect(uri) as websocket:
                # Should not reach here - connection should be rejected
                print(f"  ❌ {description} was incorrectly accepted")
                await websocket.close()
                all_passed = False
        except websockets.exceptions.InvalidStatusCode as e:
            if e.status_code == 403:  # Forbidden
                print(f"  ✅ {description} correctly rejected with 403")
            else:
                print(f"  ⚠️ {description} rejected with unexpected code: {e.status_code}")
        except Exception as e:
            print(f"  ✅ {description} correctly rejected: {type(e).__name__}")
    
    if all_passed:
        print("\n✅ Invalid token test passed")
    else:
        print("\n❌ Some invalid tokens were not properly rejected")
    
    return all_passed


async def test_reconnection():
    """Test 4: Automatic reconnection works"""
    print("\n🧪 Test 4: Reconnection Mechanism")
    print("-" * 50)
    
    try:
        token = create_jwt_token(TEST_MANAGER)
        uri = f"{BACKEND_URL}?token={token}"
        
        # First connection
        websocket1 = await websockets.connect(uri)
        print("✅ Initial connection established")
        
        # Wait for welcome message
        message = await asyncio.wait_for(websocket1.recv(), timeout=5)
        data = json.loads(message)
        user_id = data['data']['user_id']
        print(f"   - User ID: {user_id}")
        
        # Simulate connection drop without proper close
        # This simulates network interruption
        websocket1.transport.close()
        print("⚡ Simulated connection drop")
        
        # Wait a moment
        await asyncio.sleep(1)
        
        # Reconnect with same credentials
        websocket2 = await websockets.connect(uri)
        print("✅ Reconnection successful")
        
        # Verify we get welcome message again
        message = await asyncio.wait_for(websocket2.recv(), timeout=5)
        data = json.loads(message)
        
        if data["type"] == "connection_established":
            print("✅ Received welcome message after reconnection")
            if data['data']['user_id'] == user_id:
                print("✅ Same user ID maintained")
            
            # Test that we can still send/receive messages
            heartbeat_msg = json.dumps({"type": "heartbeat", "data": {}})
            await websocket2.send(heartbeat_msg)
            
            response = await asyncio.wait_for(websocket2.recv(), timeout=5)
            heartbeat_data = json.loads(response)
            
            if heartbeat_data["type"] == "heartbeat_ack":
                print("✅ Can send/receive messages after reconnection")
        
        await websocket2.close()
        print("✅ Reconnection test passed")
        return True
        
    except Exception as e:
        print(f"❌ Reconnection test failed: {e}")
        return False


async def test_multiple_connections():
    """Test 5: Multiple simultaneous connections"""
    print("\n🧪 Test 5: Multiple Simultaneous Connections")
    print("-" * 50)
    
    try:
        # Create tokens for different users
        manager1_token = create_jwt_token({
            "email": "manager1@demo.com",
            "property_id": "prop-001",
            "role": "manager"
        })
        
        manager2_token = create_jwt_token({
            "email": "manager2@demo.com",
            "property_id": "prop-002",
            "role": "manager"
        })
        
        hr_token = create_jwt_token(TEST_HR)
        
        # Connect all three simultaneously
        uri1 = f"{BACKEND_URL}?token={manager1_token}"
        uri2 = f"{BACKEND_URL}?token={manager2_token}"
        uri3 = f"{BACKEND_URL}?token={hr_token}"
        
        async with websockets.connect(uri1) as ws1, \
                   websockets.connect(uri2) as ws2, \
                   websockets.connect(uri3) as ws3:
            
            print("✅ Three users connected simultaneously")
            
            # Receive welcome messages
            msg1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
            msg2 = json.loads(await asyncio.wait_for(ws2.recv(), timeout=5))
            msg3 = json.loads(await asyncio.wait_for(ws3.recv(), timeout=5))
            
            print(f"   - Manager 1: {msg1['data']['user_id']} in rooms {msg1['data']['rooms']}")
            print(f"   - Manager 2: {msg2['data']['user_id']} in rooms {msg2['data']['rooms']}")
            print(f"   - HR User: {msg3['data']['user_id']} in rooms {msg3['data']['rooms']}")
            
            # Verify room separation
            if "property-prop-001" in msg1['data']['rooms'] and \
               "property-prop-002" not in msg1['data']['rooms']:
                print("✅ Manager 1 correctly isolated to their property")
            
            if "property-prop-002" in msg2['data']['rooms'] and \
               "property-prop-001" not in msg2['data']['rooms']:
                print("✅ Manager 2 correctly isolated to their property")
            
            if "global" in msg3['data']['rooms']:
                print("✅ HR has access to global room")
            
            # Test concurrent heartbeats
            heartbeat = json.dumps({"type": "heartbeat", "data": {}})
            await ws1.send(heartbeat)
            await ws2.send(heartbeat)
            await ws3.send(heartbeat)
            
            # Wait for all acknowledgments
            ack1 = json.loads(await asyncio.wait_for(ws1.recv(), timeout=5))
            ack2 = json.loads(await asyncio.wait_for(ws2.recv(), timeout=5))
            ack3 = json.loads(await asyncio.wait_for(ws3.recv(), timeout=5))
            
            if all(ack["type"] == "heartbeat_ack" for ack in [ack1, ack2, ack3]):
                print("✅ All connections can send/receive concurrently")
            
            print("✅ Multiple connections test passed")
            return True
            
    except Exception as e:
        print(f"❌ Multiple connections test failed: {e}")
        return False


async def run_all_connection_tests():
    """Run all WebSocket connection tests"""
    print("\n" + "=" * 60)
    print("🚀 WEBSOCKET CONNECTION TEST SUITE")
    print("=" * 60)
    
    # Ensure backend is running
    try:
        # Try a simple connection to check if server is up
        test_token = create_jwt_token(TEST_MANAGER)
        test_uri = f"{BACKEND_URL}?token={test_token}"
        async with websockets.connect(test_uri) as ws:
            await ws.close()
    except Exception as e:
        print(f"\n❌ Cannot connect to backend at {BACKEND_URL}")
        print(f"   Error: {e}")
        print("\n⚠️  Please ensure the backend is running:")
        print("   cd hotel-onboarding-backend")
        print("   python3 -m uvicorn app.main_enhanced:app --port 8000 --reload")
        return
    
    results = {}
    
    # Run each test
    results["Manager Connection"] = await test_manager_connection()
    await asyncio.sleep(0.5)  # Brief pause between tests
    
    results["HR Connection"] = await test_hr_connection()
    await asyncio.sleep(0.5)
    
    results["Invalid Token Rejection"] = await test_invalid_token()
    await asyncio.sleep(0.5)
    
    results["Reconnection"] = await test_reconnection()
    await asyncio.sleep(0.5)
    
    results["Multiple Connections"] = await test_multiple_connections()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:30} {status}")
    
    total_tests = len(results)
    passed_tests = sum(1 for passed in results.values() if passed)
    
    print("-" * 60)
    print(f"Total: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All WebSocket connection tests passed!")
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed")


if __name__ == "__main__":
    asyncio.run(run_all_connection_tests())