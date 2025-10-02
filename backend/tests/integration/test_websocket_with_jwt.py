#!/usr/bin/env python3
"""Test WebSocket with proper JWT authentication"""

import asyncio
import json
import websockets
import jwt
from datetime import datetime, timedelta

# JWT configuration (must match backend)
JWT_SECRET_KEY = "your-secret-key-here"  # This should match the backend's secret
JWT_ALGORITHM = "HS256"

def create_test_token(user_id="test-manager-001", role="manager", property_id="test-prop-001"):
    """Create a test JWT token"""
    payload = {
        "sub": user_id,
        "role": role,
        "property_id": property_id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def test_websocket_with_jwt():
    """Test WebSocket connection with JWT token"""
    
    print("🔍 Testing WebSocket with JWT Authentication")
    print("=" * 50)
    
    # Create a test JWT token
    token = create_test_token()
    print(f"✅ Generated JWT token")
    
    ws_url = f"ws://localhost:8000/ws/dashboard?token={token}"
    
    try:
        print("\n📡 Connecting to WebSocket...")
        async with websockets.connect(ws_url) as websocket:
            print("✅ Connected successfully!")
            
            # Send heartbeat
            await websocket.send(json.dumps({"type": "heartbeat"}))
            print("📤 Sent heartbeat")
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            print(f"📥 Received: {data}")
            
            if data.get('type') == 'heartbeat':
                print("✅ Heartbeat acknowledged!")
            
            # Listen for any events for 10 seconds
            print("\n👂 Listening for events (10 seconds)...")
            try:
                while True:
                    event = await asyncio.wait_for(websocket.recv(), timeout=10)
                    event_data = json.loads(event)
                    print(f"📨 Event received: {event_data.get('type', 'unknown')}")
                    if 'event_type' in event_data:
                        print(f"   - Event type: {event_data['event_type']}")
                        print(f"   - Details: {json.dumps(event_data, indent=2)}")
            except asyncio.TimeoutError:
                print("⏱️  No events received in 10 seconds")
            
            print("\n✨ WebSocket test complete!")
            
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket_with_jwt())