#!/usr/bin/env python3
"""
Test WebSocket broadcasting for application events
"""

import asyncio
import json
import websockets
import jwt
from datetime import datetime, timedelta, timezone
import aiohttp
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configuration
BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/dashboard"

async def login_and_get_token(email, password):
    """Login to get a valid JWT token"""
    async with aiohttp.ClientSession() as session:
        login_data = {
            "email": email,
            "password": password
        }
        
        async with session.post(
            f"{BASE_URL}/auth/login",
            json=login_data
        ) as response:
            if response.status == 200:
                result = await response.json()
                return result.get("access_token")
            else:
                error_text = await response.text()
                print(f"Login failed: {response.status} - {error_text}")
                return None

async def connect_websocket(token):
    """Connect to the WebSocket endpoint"""
    uri = f"{WS_URL}?token={token}"
    return await websockets.connect(uri)

async def submit_test_application():
    """Submit a test job application"""
    async with aiohttp.ClientSession() as session:
        application_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": f"test{datetime.now().timestamp()}@example.com",
            "phone": "555-0123",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "department": "Front Desk",
            "position": "Front Desk Agent",
            "work_authorized": True,
            "sponsorship_required": False,
            "start_date": "2025-03-01",
            "shift_preference": "morning",
            "employment_type": "full_time",
            "experience_years": 3,
            "hotel_experience": True,
            "employment_history": [],
            "additional_comments": "Test application"
        }
        
        # Submit to a test property
        async with session.post(
            f"{BASE_URL}/apply/903ed05b-5990-4ecf-b1b2-7592cf2923df",
            json=application_data
        ) as response:
            result = await response.json()
            print(f"Application submitted: {result}")
            return result.get("application_id")

async def test_application_created_event():
    """Test that application creation triggers WebSocket event"""
    print("\n=== Testing Application Created Event ===")
    
    # Login as manager and HR to get real tokens
    print("Getting authentication tokens...")
    manager_token = await login_and_get_token("test-manager@demo.com", "test123")
    hr_token = await login_and_get_token("test-hr@demo.com", "test123")
    
    if not manager_token or not hr_token:
        print("Failed to get authentication tokens")
        return None
    
    # Connect WebSocket clients
    print("Connecting WebSocket clients...")
    manager_ws = await connect_websocket(manager_token)
    hr_ws = await connect_websocket(hr_token)
    
    # Wait for connection establishment
    await asyncio.sleep(1)
    
    # Read welcome messages
    manager_welcome = await manager_ws.recv()
    hr_welcome = await hr_ws.recv()
    print(f"Manager connected: {json.loads(manager_welcome)['type']}")
    print(f"HR connected: {json.loads(hr_welcome)['type']}")
    
    # Submit application in parallel with listening
    print("\nSubmitting test application...")
    application_task = asyncio.create_task(submit_test_application())
    
    # Listen for events
    manager_event_task = asyncio.create_task(manager_ws.recv())
    hr_event_task = asyncio.create_task(hr_ws.recv())
    
    # Wait for application submission
    application_id = await application_task
    
    # Wait for events with timeout
    try:
        manager_event = await asyncio.wait_for(manager_event_task, timeout=5.0)
        print(f"\nManager received event: {json.loads(manager_event)}")
    except asyncio.TimeoutError:
        print("Manager did not receive event (timeout)")
    
    try:
        hr_event = await asyncio.wait_for(hr_event_task, timeout=5.0)
        print(f"HR received event: {json.loads(hr_event)}")
    except asyncio.TimeoutError:
        print("HR did not receive event (timeout)")
    
    # Clean up
    await manager_ws.close()
    await hr_ws.close()
    
    return application_id

async def test_application_approval_event(application_id):
    """Test that application approval triggers WebSocket event"""
    print("\n=== Testing Application Approval Event ===")
    
    # Login to get real tokens
    manager_token = await login_and_get_token("test-manager@demo.com", "test123")
    hr_token = await login_and_get_token("test-hr@demo.com", "test123")
    
    if not manager_token or not hr_token:
        print("Failed to get authentication tokens")
        return
    
    print("Connecting WebSocket clients...")
    manager_ws = await connect_websocket(manager_token)
    hr_ws = await connect_websocket(hr_token)
    
    # Wait for connection establishment
    await asyncio.sleep(1)
    
    # Read welcome messages
    await listener_ws.recv()
    await hr_ws.recv()
    
    # Approve application via API
    print(f"\nApproving application {application_id}...")
    async with aiohttp.ClientSession() as session:
        form_data = aiohttp.FormData()
        form_data.add_field('job_title', 'Front Desk Agent')
        form_data.add_field('start_date', '2025-03-01')
        form_data.add_field('start_time', '09:00')
        form_data.add_field('pay_rate', '15.00')
        form_data.add_field('pay_frequency', 'bi-weekly')
        form_data.add_field('benefits_eligible', 'yes')
        form_data.add_field('supervisor', 'Test Manager')
        form_data.add_field('special_instructions', 'Test approval')
        
        headers = {
            "Authorization": f"Bearer {manager_token}"
        }
        
        async with session.post(
            f"{BASE_URL}/applications/{application_id}/approve",
            data=form_data,
            headers=headers
        ) as response:
            result = await response.json()
            print(f"Approval response: {response.status}")
    
    # Listen for events
    try:
        manager_event = await asyncio.wait_for(manager_ws.recv(), timeout=5.0)
        print(f"\nManager received event: {json.loads(manager_event)}")
    except asyncio.TimeoutError:
        print("Manager did not receive event (timeout)")
    
    try:
        hr_event = await asyncio.wait_for(hr_ws.recv(), timeout=5.0)
        print(f"HR received event: {json.loads(hr_event)}")
    except asyncio.TimeoutError:
        print("HR did not receive event (timeout)")
    
    # Clean up
    await manager_ws.close()
    await hr_ws.close()

async def test_application_rejection_event():
    """Test that application rejection triggers WebSocket event"""
    print("\n=== Testing Application Rejection Event ===")
    
    # First submit a new application
    application_id = await submit_test_application()
    
    # Login to get real tokens
    manager_token = await login_and_get_token("test-manager@demo.com", "test123")
    hr_token = await login_and_get_token("test-hr@demo.com", "test123")
    
    if not manager_token or not hr_token:
        print("Failed to get authentication tokens")
        return
    
    print("Connecting WebSocket clients...")
    manager_ws = await connect_websocket(manager_token)
    hr_ws = await connect_websocket(hr_token)
    
    # Wait for connection establishment
    await asyncio.sleep(1)
    
    # Read welcome messages
    await listener_ws.recv()
    await hr_ws.recv()
    
    # Clear any pending application_created events
    try:
        await asyncio.wait_for(listener_ws.recv(), timeout=1.0)
        await asyncio.wait_for(hr_ws.recv(), timeout=1.0)
    except asyncio.TimeoutError:
        pass
    
    # Reject application via API
    print(f"\nRejecting application {application_id}...")
    async with aiohttp.ClientSession() as session:
        form_data = aiohttp.FormData()
        form_data.add_field('rejection_reason', 'Position filled')
        
        headers = {
            "Authorization": f"Bearer {manager_token}"
        }
        
        async with session.post(
            f"{BASE_URL}/applications/{application_id}/reject",
            data=form_data,
            headers=headers
        ) as response:
            result = await response.json()
            print(f"Rejection response: {response.status}")
    
    # Listen for events
    try:
        manager_event = await asyncio.wait_for(manager_ws.recv(), timeout=5.0)
        print(f"\nManager received event: {json.loads(manager_event)}")
    except asyncio.TimeoutError:
        print("Manager did not receive event (timeout)")
    
    try:
        hr_event = await asyncio.wait_for(hr_ws.recv(), timeout=5.0)
        print(f"HR received event: {json.loads(hr_event)}")
    except asyncio.TimeoutError:
        print("HR did not receive event (timeout)")
    
    # Clean up
    await manager_ws.close()
    await hr_ws.close()

async def main():
    """Run all WebSocket application event tests"""
    print("Starting WebSocket Application Event Tests")
    print("=" * 50)
    
    try:
        # Test application creation event
        application_id = await test_application_created_event()
        
        if application_id:
            # Test application approval event
            await test_application_approval_event(application_id)
        
        # Test application rejection event (creates its own application)
        await test_application_rejection_event()
        
        print("\n" + "=" * 50)
        print("All tests completed!")
        
    except Exception as e:
        print(f"\nError during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())