#!/usr/bin/env python3
"""Simple WebSocket test to verify real-time functionality"""

import asyncio
import json
import websockets

async def test_websocket():
    """Test WebSocket connection with a simple demo token"""
    
    print("🔍 Testing WebSocket Connection")
    print("-" * 40)
    
    # Use demo token for testing
    ws_url = "ws://localhost:8000/ws/dashboard?token=demo-token"
    
    try:
        print("Connecting to WebSocket...")
        async with websockets.connect(ws_url) as websocket:
            print("✅ Connected successfully!")
            
            # Send heartbeat
            await websocket.send(json.dumps({"type": "heartbeat"}))
            print("📤 Sent heartbeat")
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            data = json.loads(response)
            print(f"📥 Received: {data.get('type', 'unknown')}")
            
            if data.get('type') == 'heartbeat':
                print("✅ Heartbeat acknowledged!")
            
            print("\n✨ WebSocket is working correctly!")
            
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection rejected: {e}")
    except asyncio.TimeoutError:
        print("❌ No response received (timeout)")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())