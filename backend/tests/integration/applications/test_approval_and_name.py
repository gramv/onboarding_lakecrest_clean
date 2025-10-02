#!/usr/bin/env python3
"""
Test approval flow to verify:
1. Email logs to console when manager approves
2. Employee name shows correctly in onboarding welcome page
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

async def main():
    async with httpx.AsyncClient() as client:
        print("\n=== Testing Approval Flow with Email and Name ===\n")
        
        # Step 1: Login as manager
        print("1. Logging in as manager...")
        login_response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "Manager123!"
            }
        )
        
        if login_response.status_code != 200:
            print(f"❌ Manager login failed: {login_response.text}")
            return
        
        auth_data = login_response.json()
        manager_token = auth_data["data"]["token"]
        headers = {"Authorization": f"Bearer {manager_token}"}
        print(f"✅ Logged in as manager")
        
        # Step 2: Get pending applications
        print("\n2. Fetching pending applications...")
        apps_response = await client.get(
            f"{BASE_URL}/manager/applications",
            headers=headers
        )
        
        if apps_response.status_code != 200:
            print(f"❌ Failed to get applications: {apps_response.text}")
            return
        
        apps_data = apps_response.json()
        applications = apps_data["data"] if isinstance(apps_data["data"], list) else apps_data["data"]["applications"]
        
        # Find Goutam's application or any pending one
        target_app = None
        for app in applications:
            if app.get("status") == "pending":
                if "goutam" in app.get("applicant_data", {}).get("email", "").lower():
                    target_app = app
                    break
                elif not target_app:  # Use first pending if no Goutam
                    target_app = app
        
        if not target_app:
            print("❌ No pending applications found")
            print("   Please create a new application first")
            return
        
        print(f"✅ Found pending application:")
        print(f"   - Name: {target_app['applicant_data']['first_name']} {target_app['applicant_data']['last_name']}")
        print(f"   - Email: {target_app['applicant_data']['email']}")
        print(f"   - ID: {target_app['id']}")
        
        # Step 3: Approve the application
        print("\n3. Approving application...")
        print("   Watch the console for email logs!")
        
        approval_data = {
            "job_title": target_app["position"],
            "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "start_time": "9:00 AM",
            "pay_rate": 25.00,
            "pay_frequency": "bi-weekly",
            "benefits_eligible": "yes",
            "supervisor": "John Manager",
            "special_instructions": "Welcome aboard!"
        }
        
        approve_response = await client.post(
            f"{BASE_URL}/applications/{target_app['id']}/approve",
            headers=headers,
            data=approval_data
        )
        
        if approve_response.status_code != 200:
            print(f"❌ Approval failed: {approve_response.text}")
            return
        
        approval_result = approve_response.json()
        print(f"✅ Application approved successfully")
        print(f"   - Employee ID: {approval_result['data']['employee_id']}")
        print(f"   - Onboarding URL: {approval_result['data']['onboarding_url']}")
        
        # Extract the token from URL
        onboarding_url = approval_result['data']['onboarding_url']
        token = onboarding_url.split('token=')[1] if 'token=' in onboarding_url else None
        
        if not token:
            print("❌ No token found in onboarding URL")
            return
        
        # Step 4: Test the welcome endpoint with the token
        print(f"\n4. Testing welcome endpoint with token...")
        welcome_response = await client.get(
            f"{BASE_URL}/api/onboarding/welcome/{token}"
        )
        
        if welcome_response.status_code != 200:
            print(f"❌ Welcome endpoint failed: {welcome_response.text}")
            return
        
        welcome_data = welcome_response.json()
        employee_info = welcome_data['data']['employee']
        
        print(f"✅ Welcome data retrieved successfully")
        print(f"   Employee Information:")
        print(f"   - Name: {employee_info['first_name']} {employee_info['last_name']}")
        print(f"   - Email: {employee_info['email']}")
        print(f"   - Position: {employee_info['position']}")
        print(f"   - Department: {employee_info['department']}")
        
        # Verify the name matches what was in the application
        if (employee_info['first_name'] == target_app['applicant_data']['first_name'] and
            employee_info['last_name'] == target_app['applicant_data']['last_name']):
            print(f"\n✅ SUCCESS: Employee name correctly shows as '{employee_info['first_name']} {employee_info['last_name']}'")
        else:
            print(f"\n❌ FAILURE: Name mismatch!")
            print(f"   Expected: {target_app['applicant_data']['first_name']} {target_app['applicant_data']['last_name']}")
            print(f"   Got: {employee_info['first_name']} {employee_info['last_name']}")
        
        print("\n=== Test Complete ===")
        print("\nCheck the backend console above for email logs.")
        print("You should see two emails logged:")
        print("1. Approval notification email")
        print("2. Onboarding welcome email")

if __name__ == "__main__":
    asyncio.run(main())