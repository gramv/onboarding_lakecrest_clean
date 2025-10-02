#!/usr/bin/env python3
"""
Setup and test the complete application approval workflow
Tasks 2.1 through 2.6
"""

import os
import sys
import json
import uuid
import asyncio
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client
import jwt

# Load environment variables
load_dotenv(".env.test")

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Test data
DEMO_PROPERTY_ID = "85837d95-1595-4322-b291-fd130cff17c1"
MANAGER_EMAIL = "testmanager@demo.com"
MANAGER_PASSWORD = "password123"  # Default test password

def get_manager_token():
    """Login as manager and get JWT token"""
    print("\n1. Getting manager authentication token...")
    response = requests.post(
        f"{BACKEND_URL}/auth/login",
        json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("data", {}).get("token")  # Changed from access_token to token
        print(f"   ✓ Manager authenticated: {MANAGER_EMAIL}")
        return token
    else:
        print(f"   ✗ Failed to authenticate manager: {response.text}")
        return None

def create_test_application():
    """Task 2.1: Create a test job application"""
    print("\n2. Creating test job application...")
    
    application_id = str(uuid.uuid4())
    application_data = {
        "id": application_id,
        "property_id": DEMO_PROPERTY_ID,
        "department": "Front Desk",
        "position": "Front Desk Associate",
        "status": "pending",
        "applicant_data": {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "address": "123 Test Lane",
            "city": "Demo City",
            "state": "CA",
            "zip_code": "90210",
            "work_authorized": True,
            "employment_type": "full_time",
            "availability": "immediate",
            "desired_pay": "$20/hour",
            "experience_years": "2-5",
            "education_level": "high_school",
            "has_transportation": True,
            "can_work_weekends": True,
            "can_work_nights": True,
            "references_available": True
        },
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "talent_pool_date": None
    }
    
    # Insert directly into Supabase
    result = supabase.table('job_applications').insert(application_data).execute()
    
    if result.data:
        print(f"   ✓ Created application ID: {application_id}")
        print(f"     - Applicant: John Doe (john.doe@example.com)")
        print(f"     - Position: Front Desk Associate")
        print(f"     - Property: Demo Hotel")
        return application_id
    else:
        print(f"   ✗ Failed to create application")
        return None

def test_applications_endpoint(token):
    """Task 2.2: Test the applications list endpoint"""
    print("\n3. Testing applications list endpoint...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test the manager applications endpoint
    response = requests.get(
        f"{BACKEND_URL}/manager/applications",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        applications = data.get("data", [])
        print(f"   ✓ Applications endpoint working")
        print(f"     - Found {len(applications)} application(s)")
        
        if applications:
            for app in applications[:3]:  # Show first 3
                print(f"     - {app['applicant_data']['first_name']} {app['applicant_data']['last_name']} - {app['position']} ({app['status']})")
        
        return True
    else:
        print(f"   ✗ Failed to get applications: {response.status_code}")
        print(f"     Response: {response.text}")
        return False

def test_application_approval(token, application_id):
    """Task 2.4: Test application approval endpoint"""
    print("\n4. Testing application approval...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Approve the application
    approval_data = {
        "job_title": "Front Desk Associate",
        "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "start_time": "9:00 AM",
        "pay_rate": 20.00,
        "pay_frequency": "hourly",
        "benefits_eligible": "yes",
        "supervisor": "Jane Smith",
        "special_instructions": "Please arrive 15 minutes early for orientation"
    }
    
    response = requests.post(
        f"{BACKEND_URL}/applications/{application_id}/approve",
        headers=headers,
        data=approval_data
    )
    
    if response.status_code == 200:
        data = response.json()
        result = data.get("data", {})
        
        print(f"   ✓ Application approved successfully")
        print(f"     - Employee ID: {result.get('employee_id', 'N/A')}")
        
        # Check for onboarding token
        onboarding_token = result.get("onboarding_token")
        if onboarding_token:
            print(f"     - Onboarding token generated: {onboarding_token[:20]}...")
            print(f"     - Token expires: {result.get('token_expires_at', 'N/A')}")
        else:
            print(f"     - Warning: No onboarding token in response")
        
        # Check onboarding URL
        onboarding_url = result.get("onboarding_url")
        if onboarding_url:
            print(f"     - Onboarding URL: {onboarding_url}")
        
        return result
    else:
        print(f"   ✗ Failed to approve application: {response.status_code}")
        print(f"     Response: {response.text}")
        return None

def verify_onboarding_token(token):
    """Task 2.6: Verify the onboarding token was created"""
    print("\n5. Verifying onboarding token...")
    
    if not token:
        print("   ✗ No token to verify")
        return False
    
    try:
        # Decode the JWT token
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        print(f"   ✓ Token is valid JWT")
        print(f"     - Employee ID: {payload.get('employee_id', 'N/A')}")
        print(f"     - Expires: {payload.get('exp', 'N/A')}")
        
        # Check if token exists in database
        employee_id = payload.get('employee_id')
        if employee_id:
            sessions = supabase.table('onboarding_sessions').select('*').eq('employee_id', employee_id).execute()
            if sessions.data:
                session = sessions.data[0]
                print(f"     - Session found in database")
                print(f"     - Status: {session.get('status', 'N/A')}")
                print(f"     - Created: {session.get('created_at', 'N/A')}")
                return True
            else:
                print(f"     - Warning: No session found in database for employee {employee_id}")
        
        return True
    except jwt.ExpiredSignatureError:
        print(f"   ✗ Token is expired")
        return False
    except jwt.InvalidTokenError as e:
        print(f"   ✗ Invalid token: {str(e)}")
        return False

def test_application_rejection(token):
    """Additional test: Test application rejection"""
    print("\n6. Testing application rejection (bonus test)...")
    
    # Create another test application to reject
    rejection_app_id = str(uuid.uuid4())
    application_data = {
        "id": rejection_app_id,
        "property_id": DEMO_PROPERTY_ID,
        "department": "Housekeeping",
        "position": "Housekeeper",
        "status": "pending",
        "applicant_data": {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "(555) 987-6543",
            "address": "456 Demo Ave",
            "city": "Demo City",
            "state": "CA",
            "zip_code": "90210",
            "work_authorized": True,
            "employment_type": "part_time"
        },
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert the application
    result = supabase.table('job_applications').insert(application_data).execute()
    
    if result.data:
        print(f"   ✓ Created test application for rejection")
        
        # Test rejection
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{BACKEND_URL}/applications/{rejection_app_id}/reject",
            headers=headers,
            data={"rejection_reason": "Position filled"}
        )
        
        if response.status_code == 200:
            print(f"   ✓ Application rejected successfully")
            
            # Verify it moved to talent pool
            app = supabase.table('job_applications').select('*').eq('id', rejection_app_id).execute()
            if app.data and app.data[0]['status'] == 'talent_pool':
                print(f"     - Application moved to talent pool")
            
            return True
        else:
            print(f"   ✗ Failed to reject application: {response.status_code}")
            return False
    else:
        print(f"   ✗ Failed to create test application")
        return False

def main():
    """Run all tasks to set up and test the approval workflow"""
    print("=" * 60)
    print("APPLICATION APPROVAL WORKFLOW SETUP")
    print("Tasks 2.1 through 2.6")
    print("=" * 60)
    
    # Track results
    results = {
        "manager_auth": False,
        "application_created": False,
        "applications_endpoint": False,
        "approval_working": False,
        "token_generated": False,
        "rejection_working": False
    }
    
    # Step 1: Get manager token
    manager_token = get_manager_token()
    if not manager_token:
        print("\n✗ Cannot proceed without manager authentication")
        return
    results["manager_auth"] = True
    
    # Step 2: Create test application (Task 2.1)
    application_id = create_test_application()
    if not application_id:
        print("\n✗ Failed to create test application")
        return
    results["application_created"] = True
    
    # Step 3: Test applications endpoint (Task 2.2 & 2.3)
    if test_applications_endpoint(manager_token):
        results["applications_endpoint"] = True
    
    # Step 4: Test approval (Task 2.4 & 2.5)
    approval_result = test_application_approval(manager_token, application_id)
    if approval_result:
        results["approval_working"] = True
        
        # Step 5: Verify token (Task 2.6)
        onboarding_token = approval_result.get("onboarding_token")
        if verify_onboarding_token(onboarding_token):
            results["token_generated"] = True
    
    # Step 6: Test rejection (bonus)
    if test_application_rejection(manager_token):
        results["rejection_working"] = True
    
    # Summary
    print("\n" + "=" * 60)
    print("WORKFLOW SETUP SUMMARY")
    print("=" * 60)
    
    for task, success in results.items():
        status = "✓" if success else "✗"
        print(f"  {status} {task.replace('_', ' ').title()}")
    
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    print(f"\nOverall: {success_count}/{total_count} tasks completed successfully")
    
    if success_count == total_count:
        print("\n🎉 All tasks completed successfully!")
        print("The application approval workflow is fully functional.")
        print(f"\nYou can now:")
        print(f"  1. Login as manager: {MANAGER_EMAIL}")
        print(f"  2. View applications in the Applications tab")
        print(f"  3. Approve/reject applications")
        print(f"  4. Onboarding tokens are generated automatically")
    else:
        print("\n⚠️ Some tasks failed. Please check the errors above.")

if __name__ == "__main__":
    main()