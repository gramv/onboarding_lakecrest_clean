#!/usr/bin/env python3
"""
WebSocket Event Broadcasting Tests
Tests real-time event broadcasting for application and onboarding events
"""

import asyncio
import json
import logging
import websockets
import httpx
from datetime import datetime, timedelta
import jwt
from typing import Dict, Any, Optional, List
import sys
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Test configuration
WS_URL = "ws://localhost:8000/ws/dashboard"
API_URL = "http://localhost:8000"
JWT_SECRET_KEY = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

# Test properties
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

class WebSocketListener:
    """WebSocket client that listens for events"""
    
    def __init__(self, token: str, user_id: str, role: str):
        self.token = token
        self.user_id = user_id
        self.role = role
        self.websocket = None
        self.events_received = []
        
    async def connect(self):
        """Connect and start listening"""
        url = f"{WS_URL}?token={self.token}"
        self.websocket = await websockets.connect(url)
        logger.info(f"✅ {self.role} {self.user_id} connected to WebSocket")
        
    async def disconnect(self):
        """Disconnect from WebSocket"""
        if self.websocket:
            await self.websocket.close()
            logger.info(f"{self.role} {self.user_id} disconnected")
    
    async def listen_for_events(self, duration: float = 5.0) -> List[Dict[str, Any]]:
        """Listen for events for specified duration"""
        events = []
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < duration:
            try:
                message_data = await asyncio.wait_for(self.websocket.recv(), timeout=1.0)
                message = json.loads(message_data)
                
                # Filter out connection and heartbeat messages
                if message.get("type") not in ["connection_established", "heartbeat_ack"]:
                    events.append(message)
                    self.events_received.append(message)
                    logger.info(f"{self.role} {self.user_id} received event: {message.get('type')}")
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break
        
        return events

async def broadcast_test_event(event_type: str, data: Dict[str, Any], 
                               target_rooms: Optional[List[str]] = None,
                               target_users: Optional[List[str]] = None) -> bool:
    """Broadcast an event via HTTP API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_URL}/ws/broadcast",
                json={
                    "event_type": event_type,
                    "data": data,
                    "target_rooms": target_rooms,
                    "target_users": target_users
                }
            )
            if response.status_code == 200:
                logger.info(f"✅ Broadcast event '{event_type}' successfully")
                return True
            else:
                logger.error(f"❌ Failed to broadcast event: {response.text}")
                return False
        except Exception as e:
            logger.error(f"❌ Error broadcasting event: {e}")
            return False

async def submit_job_application(property_id: str, applicant_name: str) -> Optional[str]:
    """Submit a job application and return application ID"""
    async with httpx.AsyncClient() as client:
        try:
            application_data = {
                "property_id": property_id,
                "position": "Server",
                "personal_info": {
                    "first_name": applicant_name.split()[0],
                    "last_name": applicant_name.split()[-1] if len(applicant_name.split()) > 1 else "Test",
                    "email": f"{applicant_name.lower().replace(' ', '.')}@test.com",
                    "phone": "555-0100",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip_code": "12345"
                },
                "employment_history": [],
                "availability": {
                    "start_date": datetime.now().isoformat(),
                    "schedule_preference": "full_time"
                }
            }
            
            response = await client.post(
                f"{API_URL}/api/v1/job-applications/submit",
                json=application_data
            )
            
            if response.status_code == 200:
                result = response.json()
                app_id = result.get("data", {}).get("application_id")
                logger.info(f"✅ Submitted application: {app_id}")
                return app_id
            else:
                logger.error(f"❌ Failed to submit application: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error submitting application: {e}")
            return None

async def test_application_event_broadcasting():
    """Test 1: Application event broadcasting to correct rooms"""
    logger.info("\n=== Test 1: Application Event Broadcasting ===")
    
    # Create listeners
    manager1_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    manager2_token = create_test_token("manager2", "MANAGER", TEST_PROPERTY_ID_2)
    hr_token = create_test_token("hr1", "HR", None)
    
    manager1 = WebSocketListener(manager1_token, "manager1", "Manager-Prop1")
    manager2 = WebSocketListener(manager2_token, "manager2", "Manager-Prop2")
    hr = WebSocketListener(hr_token, "hr1", "HR")
    
    # Connect all listeners
    await manager1.connect()
    await manager2.connect()
    await hr.connect()
    
    # Wait for connection messages
    await asyncio.sleep(1)
    
    # Broadcast application event for property 1
    event_data = {
        "application_id": str(uuid.uuid4()),
        "property_id": TEST_PROPERTY_ID,
        "applicant_name": "John Doe",
        "position": "Server",
        "timestamp": datetime.now().isoformat()
    }
    
    # Start listening for events
    listen_tasks = [
        asyncio.create_task(manager1.listen_for_events(3)),
        asyncio.create_task(manager2.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    # Broadcast event
    await asyncio.sleep(0.5)
    await broadcast_test_event(
        "application_submitted",
        event_data,
        target_rooms=[f"property-{TEST_PROPERTY_ID}", "global"]
    )
    
    # Wait for events to be received
    results = await asyncio.gather(*listen_tasks)
    
    manager1_events = results[0]
    manager2_events = results[1]
    hr_events = results[2]
    
    # Verify correct distribution
    assert len(manager1_events) > 0, "Manager 1 should receive event for their property"
    assert len(manager2_events) == 0, "Manager 2 should NOT receive event for different property"
    assert len(hr_events) > 0, "HR should receive all events"
    
    logger.info(f"✅ Manager 1 received {len(manager1_events)} events (expected)")
    logger.info(f"✅ Manager 2 received {len(manager2_events)} events (correctly isolated)")
    logger.info(f"✅ HR received {len(hr_events)} events (global access)")
    
    # Clean up
    await manager1.disconnect()
    await manager2.disconnect()
    await hr.disconnect()
    
    return True

async def test_targeted_user_notification():
    """Test 2: Targeted user notifications"""
    logger.info("\n=== Test 2: Targeted User Notifications ===")
    
    # Create multiple users
    manager1_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    manager2_token = create_test_token("manager2", "MANAGER", TEST_PROPERTY_ID)
    
    manager1 = WebSocketListener(manager1_token, "manager1", "Manager1")
    manager2 = WebSocketListener(manager2_token, "manager2", "Manager2")
    
    # Connect both
    await manager1.connect()
    await manager2.connect()
    await asyncio.sleep(1)
    
    # Send notification to specific user
    async with httpx.AsyncClient() as client:
        listen_task1 = asyncio.create_task(manager1.listen_for_events(3))
        listen_task2 = asyncio.create_task(manager2.listen_for_events(3))
        
        await asyncio.sleep(0.5)
        
        # Send to manager1 only
        response = await client.post(
            f"{API_URL}/ws/notify-user",
            json={
                "user_id": "manager1",
                "title": "Test Notification",
                "message": "This is a targeted notification",
                "severity": "info"
            }
        )
        
        events1 = await listen_task1
        events2 = await listen_task2
        
        # Verify only targeted user received notification
        assert len(events1) > 0, "Manager 1 should receive notification"
        assert len(events2) == 0, "Manager 2 should NOT receive notification"
        
        logger.info("✅ Targeted notification delivered correctly")
    
    # Clean up
    await manager1.disconnect()
    await manager2.disconnect()
    
    return True

async def test_approval_rejection_events():
    """Test 3: Application approval/rejection event broadcasting"""
    logger.info("\n=== Test 3: Approval/Rejection Events ===")
    
    # Setup listeners
    manager_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    hr_token = create_test_token("hr1", "HR", None)
    
    manager = WebSocketListener(manager_token, "manager1", "Manager")
    hr = WebSocketListener(hr_token, "hr1", "HR")
    
    await manager.connect()
    await hr.connect()
    await asyncio.sleep(1)
    
    # Test approval event
    listen_tasks = [
        asyncio.create_task(manager.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast approval event
    await broadcast_test_event(
        "application_approved",
        {
            "application_id": str(uuid.uuid4()),
            "property_id": TEST_PROPERTY_ID,
            "applicant_name": "Jane Smith",
            "approved_by": "manager1",
            "timestamp": datetime.now().isoformat()
        },
        target_rooms=[f"property-{TEST_PROPERTY_ID}", "global"]
    )
    
    manager_events, hr_events = await asyncio.gather(*listen_tasks)
    
    # Verify both received approval event
    manager_approved = [e for e in manager_events if e.get("type") == "application_approved"]
    hr_approved = [e for e in hr_events if e.get("type") == "application_approved"]
    
    assert len(manager_approved) > 0, "Manager should receive approval event"
    assert len(hr_approved) > 0, "HR should receive approval event"
    
    logger.info("✅ Approval event broadcast correctly")
    
    # Test rejection event
    listen_tasks = [
        asyncio.create_task(manager.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast rejection event
    await broadcast_test_event(
        "application_rejected",
        {
            "application_id": str(uuid.uuid4()),
            "property_id": TEST_PROPERTY_ID,
            "applicant_name": "Bob Johnson",
            "rejected_by": "manager1",
            "reason": "Not qualified",
            "timestamp": datetime.now().isoformat()
        },
        target_rooms=[f"property-{TEST_PROPERTY_ID}", "global"]
    )
    
    manager_events, hr_events = await asyncio.gather(*listen_tasks)
    
    # Verify both received rejection event
    manager_rejected = [e for e in manager_events if e.get("type") == "application_rejected"]
    hr_rejected = [e for e in hr_events if e.get("type") == "application_rejected"]
    
    assert len(manager_rejected) > 0, "Manager should receive rejection event"
    assert len(hr_rejected) > 0, "HR should receive rejection event"
    
    logger.info("✅ Rejection event broadcast correctly")
    
    # Clean up
    await manager.disconnect()
    await hr.disconnect()
    
    return True

async def test_onboarding_events():
    """Test 4: Onboarding progress event broadcasting"""
    logger.info("\n=== Test 4: Onboarding Progress Events ===")
    
    # Setup listeners
    manager_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    hr_token = create_test_token("hr1", "HR", None)
    
    manager = WebSocketListener(manager_token, "manager1", "Manager")
    hr = WebSocketListener(hr_token, "hr1", "HR")
    
    await manager.connect()
    await hr.connect()
    await asyncio.sleep(1)
    
    # Test onboarding started event
    listen_tasks = [
        asyncio.create_task(manager.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast onboarding started
    session_id = str(uuid.uuid4())
    await broadcast_test_event(
        "onboarding_started",
        {
            "session_id": session_id,
            "employee_id": "emp123",
            "property_id": TEST_PROPERTY_ID,
            "employee_name": "Alice Cooper",
            "timestamp": datetime.now().isoformat()
        },
        target_rooms=[f"property-{TEST_PROPERTY_ID}", "global"]
    )
    
    manager_events, hr_events = await asyncio.gather(*listen_tasks)
    
    assert any(e.get("type") == "onboarding_started" for e in manager_events), "Manager should receive onboarding started"
    assert any(e.get("type") == "onboarding_started" for e in hr_events), "HR should receive onboarding started"
    
    logger.info("✅ Onboarding started event broadcast correctly")
    
    # Test form submission event
    listen_tasks = [
        asyncio.create_task(manager.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast form submitted
    await broadcast_test_event(
        "form_submitted",
        {
            "session_id": session_id,
            "employee_id": "emp123",
            "property_id": TEST_PROPERTY_ID,
            "form_type": "W-4",
            "timestamp": datetime.now().isoformat()
        },
        target_rooms=[f"property-{TEST_PROPERTY_ID}", "global"]
    )
    
    manager_events, hr_events = await asyncio.gather(*listen_tasks)
    
    assert any(e.get("type") == "form_submitted" for e in manager_events), "Manager should receive form submission"
    assert any(e.get("type") == "form_submitted" for e in hr_events), "HR should receive form submission"
    
    logger.info("✅ Form submission event broadcast correctly")
    
    # Clean up
    await manager.disconnect()
    await hr.disconnect()
    
    return True

async def test_system_notifications():
    """Test 5: System-wide notifications"""
    logger.info("\n=== Test 5: System-wide Notifications ===")
    
    # Create listeners for different roles
    manager1_token = create_test_token("manager1", "MANAGER", TEST_PROPERTY_ID)
    manager2_token = create_test_token("manager2", "MANAGER", TEST_PROPERTY_ID_2)
    hr_token = create_test_token("hr1", "HR", None)
    
    manager1 = WebSocketListener(manager1_token, "manager1", "Manager1")
    manager2 = WebSocketListener(manager2_token, "manager2", "Manager2")
    hr = WebSocketListener(hr_token, "hr1", "HR")
    
    await manager1.connect()
    await manager2.connect()
    await hr.connect()
    await asyncio.sleep(1)
    
    # Test HR-only notification
    listen_tasks = [
        asyncio.create_task(manager1.listen_for_events(3)),
        asyncio.create_task(manager2.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast HR-only system notification
    await broadcast_test_event(
        "system_notification",
        {
            "message": "System maintenance scheduled",
            "severity": "warning",
            "target_role": "HR"
        },
        target_rooms=["global"]
    )
    
    m1_events, m2_events, hr_events = await asyncio.gather(*listen_tasks)
    
    assert len(m1_events) == 0, "Manager 1 should NOT receive HR-only notification"
    assert len(m2_events) == 0, "Manager 2 should NOT receive HR-only notification"
    assert len(hr_events) > 0, "HR should receive HR-only notification"
    
    logger.info("✅ HR-only system notification delivered correctly")
    
    # Test all-users notification
    listen_tasks = [
        asyncio.create_task(manager1.listen_for_events(3)),
        asyncio.create_task(manager2.listen_for_events(3)),
        asyncio.create_task(hr.listen_for_events(3))
    ]
    
    await asyncio.sleep(0.5)
    
    # Broadcast all-users system notification
    await broadcast_test_event(
        "system_notification",
        {
            "message": "System update completed",
            "severity": "success"
        },
        target_rooms=[f"property-{TEST_PROPERTY_ID}", f"property-{TEST_PROPERTY_ID_2}", "global"]
    )
    
    m1_events, m2_events, hr_events = await asyncio.gather(*listen_tasks)
    
    assert len(m1_events) > 0, "Manager 1 should receive all-users notification"
    assert len(m2_events) > 0, "Manager 2 should receive all-users notification"
    assert len(hr_events) > 0, "HR should receive all-users notification"
    
    logger.info("✅ All-users system notification delivered correctly")
    
    # Clean up
    await manager1.disconnect()
    await manager2.disconnect()
    await hr.disconnect()
    
    return True

async def run_all_broadcasting_tests():
    """Run all broadcasting tests"""
    logger.info("=" * 60)
    logger.info("WEBSOCKET BROADCASTING TEST SUITE")
    logger.info("=" * 60)
    
    tests = [
        ("Application Event Broadcasting", test_application_event_broadcasting),
        ("Targeted User Notification", test_targeted_user_notification),
        ("Approval/Rejection Events", test_approval_rejection_events),
        ("Onboarding Progress Events", test_onboarding_events),
        ("System-wide Notifications", test_system_notifications)
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
        success = asyncio.run(run_all_broadcasting_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\nTests interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        sys.exit(1)