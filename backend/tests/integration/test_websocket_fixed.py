#!/usr/bin/env python3
"""Test WebSocket connection with fixed JWT token structure"""

import asyncio
import json
import httpx
import websockets

API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/dashboard"

async def test_websocket_with_login():
    """Test WebSocket connection after real login"""
    
    print("🔍 Testing WebSocket Connection with Fixed Token Structure")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Step 1: Login as manager to get a real token
        print("\n1. Logging in as manager...")
        login_data = {
            "email": "manager@demo.com",
            "password": "test123"
        }
        
        login_response = await client.post(
            f"{API_URL}/auth/login",
            json=login_data
        )
        
        if login_response.status_code != 200:
            print(f"   ❌ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            return
        
        login_result = login_response.json()
        token = login_result.get("data", {}).get("token")
        
        if not token:
            print("   ❌ No token received from login")
            return
        
        print(f"   ✅ Login successful - got token")
        print(f"   Token (first 50 chars): {token[:50]}...")
        
        # Step 2: Decode token to check structure (for debugging)
        import jwt
        try:
            # Decode without verification just to see the payload
            payload = jwt.decode(token, options={"verify_signature": False})
            print(f"\n2. Token payload structure:")
            print(f"   - sub (user ID): {payload.get('sub', 'NOT FOUND')}")
            print(f"   - role: {payload.get('role', 'NOT FOUND')}")
            print(f"   - property_id: {payload.get('property_id', 'NOT FOUND')}")
            print(f"   - token_type: {payload.get('token_type', 'NOT FOUND')}")
        except Exception as e:
            print(f"   ⚠️  Could not decode token: {e}")
        
        # Step 3: Try WebSocket connection with the token
        print("\n3. Attempting WebSocket connection...")
        ws_url = f"{WS_URL}?token={token}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                print("   ✅ WebSocket connected successfully!")
                
                # Wait for welcome message
                try:
                    welcome = await asyncio.wait_for(websocket.recv(), timeout=2)
                    welcome_data = json.loads(welcome)
                    print(f"   📥 Welcome message: {welcome_data.get('type', 'unknown')}")
                    if welcome_data.get('type') == 'connection_established':
                        print(f"      - User ID: {welcome_data.get('data', {}).get('user_id')}")
                        print(f"      - Rooms: {welcome_data.get('data', {}).get('rooms')}")
                except asyncio.TimeoutError:
                    print("   ⚠️  No welcome message received")
                
                # Send heartbeat
                heartbeat = {"type": "heartbeat"}
                await websocket.send(json.dumps(heartbeat))
                print("\n4. Sent heartbeat...")
                
                # Wait for heartbeat response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2)
                    response_data = json.loads(response)
                    if response_data.get('type') == 'heartbeat':
                        print("   ✅ Heartbeat acknowledged!")
                except asyncio.TimeoutError:
                    print("   ⚠️  No heartbeat response")
                
                print("\n✨ WebSocket is working correctly with the fixed token structure!")
                
        except websockets.exceptions.InvalidStatusCode as e:
            print(f"   ❌ WebSocket connection rejected: {e}")
            print(f"      Status code: {e.status_code}")
        except Exception as e:
            print(f"   ❌ WebSocket error: {e}")
    
    print("\n" + "=" * 60)
    print("Test complete!")

if __name__ == "__main__":
    asyncio.run(test_websocket_with_login())