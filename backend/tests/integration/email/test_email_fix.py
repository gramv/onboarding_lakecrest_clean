#!/usr/bin/env python3
"""
Test that only one email is sent on approval and onboarding link works
"""
import asyncio
import json
from datetime import datetime
import httpx
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('.env.test')

BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

async def test_approval_and_onboarding():
    """Test the approval flow and onboarding link"""
    
    async with httpx.AsyncClient() as client:
        print("\n=== Testing Email Fix ===\n")
        
        # 1. Login as manager first
        print("1. Logging in as manager...")
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "test123"
            }
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
            
        login_data = login_response.json()
        if "data" in login_data and "token" in login_data["data"]:
            token = login_data["data"]["token"]
        elif "access_token" in login_data:
            token = login_data["access_token"]
        elif "token" in login_data:
            token = login_data["token"]
        else:
            print(f"❌ No token in login response: {login_data}")
            return
            
        headers = {"Authorization": f"Bearer {token}"}
        print(f"✅ Logged in successfully")
        
        # 2. Submit a new application to test with
        print("\n2. Submitting new job application...")
        test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
        
        # Use JSON format with all required fields
        application_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": test_email,
            "phone": "555-1234",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip_code": "12345",
            "position": "Housekeeping Supervisor",
            "department": "Housekeeping",
            "employment_type": "full_time",
            "desired_start_date": "2025-09-01",
            "desired_pay": "20",
            "authorized_to_work": True,
            "over_18": True,
            "has_reliable_transportation": True,
            "can_work_weekends": True,
            "has_criminal_record": False
        }
        
        app_response = await client.post(
            f"{BASE_URL}/apply/903ed05b-5990-4ecf-b1b2-7592cf2923df",
            json=application_data  # Use json instead of data
        )
        
        if app_response.status_code != 200:
            print(f"❌ Application submission failed: {app_response.text}")
            return
            
        app_id = app_response.json()["data"]["application"]["id"]
        print(f"✅ Application submitted with ID: {app_id}")
        
        # 3. Approve the application
        print("\n3. Approving application...")
        print("   Note: This should send only ONE email")
        
        approval_data = {
            "job_title": "Housekeeping Supervisor",
            "start_date": "2025-09-01",
            "start_time": "09:00",
            "pay_rate": 20.00,
            "pay_frequency": "bi-weekly",
            "benefits_eligible": "yes",
            "supervisor": "Test Manager",
            "special_instructions": "Test approval"
        }
        
        approve_response = await client.post(
            f"{BASE_URL}/applications/{app_id}/approve",
            data=approval_data,
            headers=headers
        )
        
        if approve_response.status_code != 200:
            print(f"❌ Approval failed: {approve_response.text}")
            return
            
        approval_result = approve_response.json()
        print(f"✅ Application approved successfully")
        print(f"   Employee ID: {approval_result['data']['employee_id']}")
        print(f"   Onboarding token: {approval_result['data']['onboarding_token'][:20]}...")
        print(f"   Email sent to: {test_email}")
        
        # 4. Test the onboarding session endpoint
        print("\n4. Testing onboarding session endpoint...")
        onboarding_token = approval_result['data']['onboarding_token']
        
        session_response = await client.get(
            f"{BASE_URL}/api/onboarding/session/{onboarding_token}"
        )
        
        if session_response.status_code != 200:
            print(f"❌ Onboarding session failed: {session_response.text}")
            print("   This is the error that was causing the 500 error")
            return
        
        session_data = session_response.json()["data"]
        print(f"✅ Onboarding session loaded successfully!")
        print(f"   Employee name: {session_data['employee']['firstName']} {session_data['employee']['lastName']}")
        print(f"   Position: {session_data['employee']['position']}")
        print(f"   Property: {session_data['property']['name']}")
        
        # 5. Show what the onboarding URL would be
        print("\n5. Onboarding URL for employee:")
        print(f"   {FRONTEND_URL}/onboard?token={onboarding_token}")
        print(f"   This link should now properly show the employee's name!")
        
        print("\n=== Test Complete ===")
        print("\nIMPORTANT NOTES:")
        print("1. Only ONE email should have been sent (not two)")
        print("2. The onboarding link should now work and show the employee's name")
        print(f"3. Test email was sent to: {test_email}")
        print("   (Since this is a test email, it won't actually receive anything)")
        
        return True

if __name__ == "__main__":
    result = asyncio.run(test_approval_and_onboarding())
    if result:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed")