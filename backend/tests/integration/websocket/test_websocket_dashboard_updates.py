#!/usr/bin/env python3
"""
Test script to verify that WebSocket events trigger dashboard updates.
This script sends test WebSocket events to simulate real-time updates.
"""

import asyncio
import json
import websockets
import sys
from datetime import datetime

async def test_dashboard_updates():
    """Send test events to the WebSocket dashboard endpoint."""
    
    # Connect to the WebSocket endpoint
    uri = "ws://localhost:8000/ws/dashboard"
    
    try:
        async with websockets.connect(uri) as websocket:
            print(f"✅ Connected to WebSocket at {uri}")
            
            # Test event 1: New application
            print("\n📤 Sending 'application_created' event...")
            event1 = {
                "type": "application_created",
                "data": {
                    "id": "test-app-001",
                    "first_name": "John",
                    "last_name": "TestUser",
                    "property_name": "Test Hotel",
                    "status": "pending",
                    "created_at": datetime.now().isoformat()
                }
            }
            await websocket.send(json.dumps(event1))
            print(f"   Sent: {event1['type']}")
            await asyncio.sleep(2)
            
            # Test event 2: Application approved
            print("\n📤 Sending 'application_approved' event...")
            event2 = {
                "type": "application_approved",
                "data": {
                    "id": "test-app-001",
                    "status": "approved",
                    "property_name": "Test Hotel",
                    "updated_at": datetime.now().isoformat()
                }
            }
            await websocket.send(json.dumps(event2))
            print(f"   Sent: {event2['type']}")
            await asyncio.sleep(2)
            
            # Test event 3: Manager review needed
            print("\n📤 Sending 'manager_review_needed' event...")
            event3 = {
                "type": "manager_review_needed",
                "data": {
                    "application_id": "test-app-002",
                    "requires_review": True,
                    "message": "New application requires your review"
                }
            }
            await websocket.send(json.dumps(event3))
            print(f"   Sent: {event3['type']}")
            await asyncio.sleep(2)
            
            # Test event 4: Onboarding completed
            print("\n📤 Sending 'onboarding_completed' event...")
            event4 = {
                "type": "onboarding_completed",
                "data": {
                    "employee_id": "test-emp-001",
                    "employee_name": "Jane TestEmployee",
                    "property_name": "Test Hotel",
                    "completed_at": datetime.now().isoformat()
                }
            }
            await websocket.send(json.dumps(event4))
            print(f"   Sent: {event4['type']}")
            await asyncio.sleep(2)
            
            # Test event 5: Property created (for HR dashboard)
            print("\n📤 Sending 'property_created' event...")
            event5 = {
                "type": "property_created",
                "data": {
                    "id": "test-prop-001",
                    "name": "New Test Property",
                    "created_at": datetime.now().isoformat()
                }
            }
            await websocket.send(json.dumps(event5))
            print(f"   Sent: {event5['type']}")
            await asyncio.sleep(2)
            
            # Test event 6: Notification created
            print("\n📤 Sending 'notification_created' event...")
            event6 = {
                "type": "notification_created",
                "data": {
                    "id": "test-notif-001",
                    "title": "Test Notification",
                    "message": "This is a test notification",
                    "created_at": datetime.now().isoformat()
                }
            }
            await websocket.send(json.dumps(event6))
            print(f"   Sent: {event6['type']}")
            
            print("\n✅ All test events sent successfully!")
            print("\n📊 Check your browser dashboards to verify:")
            print("   - Stats should refresh automatically")
            print("   - Update indicators should appear")
            print("   - Notification count should increase")
            print("   - Recent activity should show (HR dashboard)")
            
            # Keep connection open for a bit to observe responses
            print("\n⏳ Keeping connection open for 5 seconds...")
            await asyncio.sleep(5)
            
    except websockets.exceptions.ConnectionRefused:
        print("❌ Could not connect to WebSocket server")
        print("   Make sure the backend server is running on port 8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    
    print("\n✅ Test completed successfully!")

if __name__ == "__main__":
    print("=== WebSocket Dashboard Update Test ===")
    print("This script will send test events to trigger dashboard updates.")
    print("Make sure you have the Manager or HR dashboard open in your browser.\n")
    
    asyncio.run(test_dashboard_updates())