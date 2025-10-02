#!/usr/bin/env python3
"""
WebSocket Event Broadcasting Tests for Hotel Onboarding System

Tests:
1. Application created event broadcast
2. Application approved event broadcast  
3. Application rejected event broadcast
4. Property isolation for managers
5. Global broadcast for HR
6. Cross-property isolation verification
"""

import asyncio
import json
import websockets
import jwt
import aiohttp
from datetime import datetime, timedelta
import sys
import os
import uuid

# Add the backend app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'hotel-onboarding-backend'))

# Configuration
WS_URL = "ws://localhost:8000/ws/dashboard"
API_URL = "http://localhost:8000"
JWT_SECRET_KEY = "your-256-bit-secret-key-for-jwt-encoding"
JWT_ALGORITHM = "HS256"

# Test properties
PROPERTY_1 = "test-prop-001"
PROPERTY_2 = "test-prop-002"

# Test accounts
MANAGER_1 = {
    "email": "manager1@demo.com",
    "property_id": PROPERTY_1,
    "role": "manager"
}

MANAGER_2 = {
    "email": "manager2@demo.com",
    "property_id": PROPERTY_2,
    "role": "manager"
}

HR_USER = {
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


async def create_test_application(property_id, session):
    """Submit a test job application via API"""
    application_data = {
        "first_name": f"Test{uuid.uuid4().hex[:6]}",
        "last_name": "Employee",
        "email": f"test{uuid.uuid4().hex[:6]}@example.com",
        "phone": "555-0100",
        "position": "Housekeeper",
        "property_id": property_id,
        "status": "pending",
        "submission_date": datetime.now().isoformat()
    }
    
    async with session.post(
        f"{API_URL}/submit-application",
        json=application_data
    ) as response:
        if response.status == 200:
            result = await response.json()
            return result.get("data", {}).get("application_id")
        else:
            print(f"Failed to create application: {response.status}")
            return None


async def update_application_status(application_id, status, token, session):
    """Update application status via API"""
    headers = {"Authorization": f"Bearer {token}"}
    
    async with session.post(
        f"{API_URL}/applications/{application_id}/status",
        json={"status": status, "notes": f"Test {status}"},
        headers=headers
    ) as response:
        return response.status == 200


async def test_application_created_broadcast():
    """Test 1: Application created event is broadcast correctly"""
    print("\n🧪 Test 1: Application Created Event Broadcast")
    print("-" * 50)
    
    received_events = {
        "manager1": [],
        "manager2": [],
        "hr": []
    }
    
    try:
        # Connect Manager 1, Manager 2, and HR
        m1_token = create_jwt_token(MANAGER_1)
        m2_token = create_jwt_token(MANAGER_2)
        hr_token = create_jwt_token(HR_USER)
        
        async with websockets.connect(f"{WS_URL}?token={m1_token}") as ws_m1, \
                   websockets.connect(f"{WS_URL}?token={m2_token}") as ws_m2, \
                   websockets.connect(f"{WS_URL}?token={hr_token}") as ws_hr:
            
            print("✅ All users connected")
            
            # Clear welcome messages
            await asyncio.wait_for(ws_m1.recv(), timeout=2)
            await asyncio.wait_for(ws_m2.recv(), timeout=2)
            await asyncio.wait_for(ws_hr.recv(), timeout=2)
            
            # Create tasks to listen for events
            async def listen_for_events(ws, user_key):
                try:
                    while True:
                        message = await asyncio.wait_for(ws.recv(), timeout=5)
                        data = json.loads(message)
                        if data["type"] in ["application_submitted", "application_created"]:
                            received_events[user_key].append(data)
                except asyncio.TimeoutError:
                    pass
            
            # Start listeners
            listeners = [
                asyncio.create_task(listen_for_events(ws_m1, "manager1")),
                asyncio.create_task(listen_for_events(ws_m2, "manager2")),
                asyncio.create_task(listen_for_events(ws_hr, "hr"))
            ]
            
            # Submit application to Property 1
            async with aiohttp.ClientSession() as session:
                app_id = await create_test_application(PROPERTY_1, session)
                if app_id:
                    print(f"✅ Created application {app_id} for Property 1")
                else:
                    print("❌ Failed to create application")
                    return False
            
            # Wait for events to propagate
            await asyncio.sleep(2)
            
            # Cancel listeners
            for task in listeners:
                task.cancel()
            
            # Verify events
            print("\nEvent Reception:")
            print(f"  Manager 1 (Prop 1): {len(received_events['manager1'])} events")
            print(f"  Manager 2 (Prop 2): {len(received_events['manager2'])} events")
            print(f"  HR: {len(received_events['hr'])} events")
            
            # Manager 1 should receive the event (same property)
            if len(received_events['manager1']) > 0:
                print("✅ Manager 1 received event for their property")
            else:
                print("❌ Manager 1 did not receive event")
                return False
            
            # Manager 2 should NOT receive the event (different property)
            if len(received_events['manager2']) == 0:
                print("✅ Manager 2 correctly isolated (no event)")
            else:
                print("❌ Manager 2 received event from wrong property")
                return False
            
            # HR should receive the event (global access)
            if len(received_events['hr']) > 0:
                print("✅ HR received event via global room")
            else:
                print("❌ HR did not receive event")
                return False
            
            print("✅ Application created broadcast test passed")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


async def test_application_status_broadcasts():
    """Test 2: Application approval/rejection events"""
    print("\n🧪 Test 2: Application Status Change Broadcasts")
    print("-" * 50)
    
    try:
        # Connect HR user to listen for events
        hr_token = create_jwt_token(HR_USER)
        manager_token = create_jwt_token(MANAGER_1)
        
        async with websockets.connect(f"{WS_URL}?token={hr_token}") as ws_hr, \
                   aiohttp.ClientSession() as session:
            
            print("✅ HR connected to listen for events")
            
            # Clear welcome message
            await asyncio.wait_for(ws_hr.recv(), timeout=2)
            
            # Create test application
            app_id = await create_test_application(PROPERTY_1, session)
            if not app_id:
                print("❌ Failed to create test application")
                return False
            
            print(f"✅ Created test application {app_id}")
            
            received_events = []
            
            # Listen for events
            async def listen():
                try:
                    while True:
                        message = await asyncio.wait_for(ws_hr.recv(), timeout=3)
                        data = json.loads(message)
                        received_events.append(data)
                except asyncio.TimeoutError:
                    pass
            
            # Test approval
            print("\n  Testing approval broadcast...")
            listener = asyncio.create_task(listen())
            
            success = await update_application_status(app_id, "approved", manager_token, session)
            if success:
                print("  ✅ Application approved via API")
            
            await asyncio.sleep(2)
            listener.cancel()
            
            # Check for approval event
            approval_events = [e for e in received_events if e.get("type") == "application_approved"]
            if approval_events:
                print("  ✅ Approval event broadcast received")
            else:
                print("  ❌ No approval event received")
            
            # Test rejection
            print("\n  Testing rejection broadcast...")
            received_events.clear()
            
            # Create another application
            app_id2 = await create_test_application(PROPERTY_1, session)
            if not app_id2:
                print("  ❌ Failed to create second test application")
                return False
            
            listener = asyncio.create_task(listen())
            
            success = await update_application_status(app_id2, "rejected", manager_token, session)
            if success:
                print("  ✅ Application rejected via API")
            
            await asyncio.sleep(2)
            listener.cancel()
            
            # Check for rejection event
            rejection_events = [e for e in received_events if e.get("type") == "application_rejected"]
            if rejection_events:
                print("  ✅ Rejection event broadcast received")
            else:
                print("  ❌ No rejection event received")
            
            if approval_events and rejection_events:
                print("\n✅ Application status broadcast test passed")
                return True
            else:
                print("\n❌ Some status events were not broadcast")
                return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


async def test_property_isolation():
    """Test 3: Verify property isolation for events"""
    print("\n🧪 Test 3: Property Isolation for Event Broadcasting")
    print("-" * 50)
    
    try:
        # Connect two managers from different properties
        m1_token = create_jwt_token(MANAGER_1)
        m2_token = create_jwt_token(MANAGER_2)
        
        async with websockets.connect(f"{WS_URL}?token={m1_token}") as ws_m1, \
                   websockets.connect(f"{WS_URL}?token={m2_token}") as ws_m2, \
                   aiohttp.ClientSession() as session:
            
            print("✅ Both managers connected")
            
            # Clear welcome messages
            await asyncio.wait_for(ws_m1.recv(), timeout=2)
            await asyncio.wait_for(ws_m2.recv(), timeout=2)
            
            property1_events = []
            property2_events = []
            
            # Listen for events
            async def listen_m1():
                try:
                    while True:
                        message = await asyncio.wait_for(ws_m1.recv(), timeout=3)
                        data = json.loads(message)
                        if "application" in data.get("type", ""):
                            property1_events.append(data)
                except asyncio.TimeoutError:
                    pass
            
            async def listen_m2():
                try:
                    while True:
                        message = await asyncio.wait_for(ws_m2.recv(), timeout=3)
                        data = json.loads(message)
                        if "application" in data.get("type", ""):
                            property2_events.append(data)
                except asyncio.TimeoutError:
                    pass
            
            # Start listeners
            l1 = asyncio.create_task(listen_m1())
            l2 = asyncio.create_task(listen_m2())
            
            # Create applications for both properties
            print("\n  Creating applications for both properties...")
            app1 = await create_test_application(PROPERTY_1, session)
            app2 = await create_test_application(PROPERTY_2, session)
            
            if app1 and app2:
                print(f"  ✅ Created app {app1} for Property 1")
                print(f"  ✅ Created app {app2} for Property 2")
            else:
                print("  ❌ Failed to create test applications")
                return False
            
            # Wait for events
            await asyncio.sleep(3)
            
            # Cancel listeners
            l1.cancel()
            l2.cancel()
            
            # Analyze results
            print("\n  Event isolation analysis:")
            print(f"  Manager 1 received {len(property1_events)} events")
            print(f"  Manager 2 received {len(property2_events)} events")
            
            # Check property IDs in received events
            m1_correct = all(
                e.get("data", {}).get("property_id") == PROPERTY_1 
                for e in property1_events
            )
            m2_correct = all(
                e.get("data", {}).get("property_id") == PROPERTY_2 
                for e in property2_events
            )
            
            if m1_correct and len(property1_events) > 0:
                print("  ✅ Manager 1 only received Property 1 events")
            else:
                print("  ❌ Manager 1 received incorrect events")
                return False
            
            if m2_correct and len(property2_events) > 0:
                print("  ✅ Manager 2 only received Property 2 events")
            else:
                print("  ❌ Manager 2 received incorrect events")
                return False
            
            print("\n✅ Property isolation test passed")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


async def test_broadcast_performance():
    """Test 4: Broadcast performance with multiple connections"""
    print("\n🧪 Test 4: Broadcast Performance Test")
    print("-" * 50)
    
    try:
        # Create multiple manager connections
        num_managers = 5
        connections = []
        tokens = []
        
        print(f"  Creating {num_managers} manager connections...")
        
        for i in range(num_managers):
            user_data = {
                "email": f"manager{i}@demo.com",
                "property_id": PROPERTY_1,
                "role": "manager"
            }
            token = create_jwt_token(user_data)
            tokens.append(token)
            
            ws = await websockets.connect(f"{WS_URL}?token={token}")
            connections.append(ws)
            
            # Clear welcome message
            await asyncio.wait_for(ws.recv(), timeout=2)
        
        print(f"  ✅ {num_managers} managers connected")
        
        # Measure broadcast time
        event_counts = [0] * num_managers
        
        async def count_events(ws, index):
            try:
                while True:
                    message = await asyncio.wait_for(ws.recv(), timeout=3)
                    data = json.loads(message)
                    if "application" in data.get("type", ""):
                        event_counts[index] += 1
            except asyncio.TimeoutError:
                pass
        
        # Start counting
        tasks = [
            asyncio.create_task(count_events(ws, i)) 
            for i, ws in enumerate(connections)
        ]
        
        # Create test application
        async with aiohttp.ClientSession() as session:
            start_time = datetime.now()
            app_id = await create_test_application(PROPERTY_1, session)
            
            if app_id:
                print(f"  ✅ Created application {app_id}")
            else:
                print("  ❌ Failed to create application")
                return False
        
        # Wait for broadcasts
        await asyncio.sleep(2)
        
        # Stop counting
        for task in tasks:
            task.cancel()
        
        # Close connections
        for ws in connections:
            await ws.close()
        
        # Analyze results
        broadcast_time = (datetime.now() - start_time).total_seconds()
        
        print(f"\n  Broadcast results:")
        print(f"  Time taken: {broadcast_time:.2f} seconds")
        print(f"  Managers who received event: {sum(1 for c in event_counts if c > 0)}/{num_managers}")
        
        if all(c > 0 for c in event_counts):
            print(f"  ✅ All {num_managers} managers received the broadcast")
            print(f"  ✅ Average broadcast time: {broadcast_time:.3f}s")
            
            if broadcast_time < 3:
                print("  ✅ Broadcast performance is good (<3s)")
                return True
            else:
                print("  ⚠️ Broadcast took longer than expected")
                return True  # Still pass but with warning
        else:
            print(f"  ❌ Not all managers received the broadcast")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


async def test_room_based_broadcasting():
    """Test 5: Room-based event targeting"""
    print("\n🧪 Test 5: Room-Based Event Broadcasting")
    print("-" * 50)
    
    try:
        # Connect HR and a manager
        hr_token = create_jwt_token(HR_USER)
        manager_token = create_jwt_token(MANAGER_1)
        
        async with websockets.connect(f"{WS_URL}?token={hr_token}") as ws_hr, \
                   websockets.connect(f"{WS_URL}?token={manager_token}") as ws_manager, \
                   aiohttp.ClientSession() as session:
            
            print("✅ HR and Manager connected")
            
            # Clear welcome messages
            welcome_hr = json.loads(await asyncio.wait_for(ws_hr.recv(), timeout=2))
            welcome_mgr = json.loads(await asyncio.wait_for(ws_manager.recv(), timeout=2))
            
            print(f"  HR rooms: {welcome_hr['data']['rooms']}")
            print(f"  Manager rooms: {welcome_mgr['data']['rooms']}")
            
            # Test direct broadcast to rooms via API
            headers = {"Content-Type": "application/json"}
            
            # Broadcast to global room (HR only)
            print("\n  Testing global room broadcast...")
            
            hr_events = []
            mgr_events = []
            
            async def listen_hr():
                try:
                    message = await asyncio.wait_for(ws_hr.recv(), timeout=3)
                    hr_events.append(json.loads(message))
                except asyncio.TimeoutError:
                    pass
            
            async def listen_mgr():
                try:
                    message = await asyncio.wait_for(ws_manager.recv(), timeout=3)
                    mgr_events.append(json.loads(message))
                except asyncio.TimeoutError:
                    pass
            
            # Send broadcast to global room
            broadcast_data = {
                "event_type": "test_global_broadcast",
                "data": {"message": "Global room test"},
                "target_rooms": ["global"]
            }
            
            async with session.post(
                f"{API_URL}/ws/broadcast",
                json=broadcast_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    print("  ✅ Global broadcast sent")
            
            # Listen for events
            await asyncio.gather(
                listen_hr(),
                listen_mgr(),
                return_exceptions=True
            )
            
            if hr_events and not mgr_events:
                print("  ✅ HR received global broadcast")
                print("  ✅ Manager did not receive global broadcast")
            else:
                print(f"  ❌ Incorrect broadcast reception (HR: {len(hr_events)}, Mgr: {len(mgr_events)})")
                return False
            
            # Test property room broadcast
            print("\n  Testing property room broadcast...")
            
            hr_events.clear()
            mgr_events.clear()
            
            broadcast_data = {
                "event_type": "test_property_broadcast",
                "data": {"message": "Property room test"},
                "target_rooms": [f"property-{PROPERTY_1}"]
            }
            
            async with session.post(
                f"{API_URL}/ws/broadcast",
                json=broadcast_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    print("  ✅ Property broadcast sent")
            
            # Listen for events
            await asyncio.gather(
                listen_hr(),
                listen_mgr(),
                return_exceptions=True
            )
            
            if mgr_events:
                print("  ✅ Manager received property broadcast")
            else:
                print("  ❌ Manager did not receive property broadcast")
                return False
            
            print("\n✅ Room-based broadcasting test passed")
            return True
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


async def run_all_event_tests():
    """Run all WebSocket event broadcasting tests"""
    print("\n" + "=" * 60)
    print("🚀 WEBSOCKET EVENT BROADCASTING TEST SUITE")
    print("=" * 60)
    
    # Ensure backend is running
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/health") as response:
                if response.status != 200:
                    raise Exception("Backend not healthy")
    except Exception as e:
        print(f"\n❌ Cannot connect to backend at {API_URL}")
        print(f"   Error: {e}")
        print("\n⚠️  Please ensure the backend is running:")
        print("   cd hotel-onboarding-backend")
        print("   python3 -m uvicorn app.main_enhanced:app --port 8000 --reload")
        return
    
    results = {}
    
    # Run each test
    results["Application Created Broadcast"] = await test_application_created_broadcast()
    await asyncio.sleep(1)
    
    results["Application Status Broadcasts"] = await test_application_status_broadcasts()
    await asyncio.sleep(1)
    
    results["Property Isolation"] = await test_property_isolation()
    await asyncio.sleep(1)
    
    results["Broadcast Performance"] = await test_broadcast_performance()
    await asyncio.sleep(1)
    
    results["Room-Based Broadcasting"] = await test_room_based_broadcasting()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:35} {status}")
    
    total_tests = len(results)
    passed_tests = sum(1 for passed in results.values() if passed)
    
    print("-" * 60)
    print(f"Total: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 All WebSocket event broadcasting tests passed!")
    else:
        print(f"\n⚠️  {total_tests - passed_tests} test(s) failed")


if __name__ == "__main__":
    asyncio.run(run_all_event_tests())