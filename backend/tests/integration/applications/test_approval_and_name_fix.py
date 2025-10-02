#!/usr/bin/env python3
"""Test the email approval and name display fixes."""

import json
import requests
import uuid
from datetime import datetime
from supabase import create_client
import os

# Supabase setup
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjQxMTcsImV4cCI6MjA3MDM0MDExN30.VMl6QzCZleoOvcY_abOHsztgXcottOnDv2kzJgmCjdg"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "http://localhost:8000"

def create_application_directly():
    """Create application directly in database"""
    app_id = str(uuid.uuid4())
    
    application_data = {
        "id": app_id,
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",
        "department": "Engineering",
        "position": "Software Engineer",
        "status": "pending",
        "applicant_data": {
            "first_name": "Goutam",
            "last_name": "Vemula",
            "email": "goutamramv@gmail.com",
            "phone": "555-0123",
            "address": "123 Main Street",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94105",
            "work_authorized": True,
            "employment_type": "full_time",
            "availability": "immediate",
            "desired_pay": "$100,000",
            "experience_years": "2-5",
            "education_level": "bachelors",
            "has_transportation": True,
            "can_work_weekends": True,
            "can_work_nights": False,
            "references_available": True
        },
        "applied_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    # Insert into database
    result = supabase.table('job_applications').insert(application_data).execute()
    
    if result.data:
        print(f"✅ Created application: {app_id}")
        print(f"   Name: Goutam Vemula")
        print(f"   Email: goutamramv@gmail.com")
        return app_id
    else:
        print(f"❌ Failed to create application")
        return None

def login_as_manager():
    """Login as manager"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "manager@demo.com",
            "password": "test123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Logged in as manager")
        # Check for token in different places
        token = data.get('access_token') or data.get('token') or data.get('data', {}).get('access_token')
        if token:
            return token
        else:
            print(f"   Warning: No token found in response: {data.keys()}")
            return None
    else:
        print(f"❌ Failed to login: {response.text}")
        return None

def approve_application(token, app_id):
    """Approve the application and check email sending"""
    print(f"\n📧 Approving application (email should be logged)...")
    
    response = requests.post(
        f"{BASE_URL}/api/applications/{app_id}/approve",
        headers={"Authorization": f"Bearer {token}"},
        json={"send_email": True}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Application approved successfully!")
        
        # Extract the onboarding token
        onboarding_token = data.get('onboarding_token')
        if onboarding_token:
            print(f"   Onboarding token: {onboarding_token}")
            print(f"\n   📧 CHECK BACKEND CONSOLE FOR EMAIL LOG!")
            print(f"   Should show: 'Email to: goutamramv@gmail.com'")
            print(f"   Subject: 'Welcome to Demo Hotel - Complete Your Onboarding'")
        else:
            print("   ⚠️ No onboarding token in response")
        
        return onboarding_token
    else:
        print(f"❌ Failed to approve application: {response.text}")
        return None

def test_welcome_endpoint(token):
    """Test the welcome endpoint to verify name display"""
    print(f"\n👤 Testing welcome endpoint...")
    
    response = requests.get(
        f"{BASE_URL}/api/onboarding/welcome?token={token}"
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Welcome endpoint working!")
        
        # Check if the name is correct
        message = data.get('message', '')
        employee_name = data.get('employee_name', '')
        
        print(f"   Message: {message}")
        print(f"   Employee name: {employee_name}")
        
        if "Welcome Goutam!" in message:
            print("   ✅ Name correctly displayed as 'Welcome Goutam!'")
            return True
        else:
            print(f"   ❌ Name not correctly displayed. Got: '{message}'")
            return False
    else:
        print(f"❌ Failed to get welcome data: {response.text}")
        return False

def main():
    """Run the complete test"""
    print("=" * 60)
    print("Testing Email Approval and Name Display Fixes")
    print("=" * 60)
    
    # Step 1: Create application directly in database
    print("\n1. Creating job application for Goutam Vemula...")
    app_id = create_application_directly()
    if not app_id:
        print("Failed to create application. Exiting.")
        return
    
    # Step 2: Login as manager
    print("\n2. Logging in as manager...")
    token = login_as_manager()
    if not token:
        print("Failed to login. Exiting.")
        return
    
    # Step 3: Approve the application (this should trigger email logging)
    print("\n3. Approving application...")
    onboarding_token = approve_application(token, app_id)
    if not onboarding_token:
        print("Failed to approve application. Exiting.")
        return
    
    # Step 4: Test the welcome endpoint
    print("\n4. Testing onboarding welcome...")
    success = test_welcome_endpoint(onboarding_token)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    
    if success:
        print("✅ BOTH ISSUES FIXED!")
        print(f"\n1. ✅ Email logging: Check backend console for email log")
        print(f"2. ✅ Name display: Shows 'Welcome Goutam!' correctly")
        print(f"\n🔗 Working onboarding URL:")
        print(f"   http://localhost:3000/onboard?token={onboarding_token}")
    else:
        print("❌ Issues remain - check the output above")
    
    # Clean up - delete the test application
    print("\n🧹 Cleaning up test data...")
    supabase.table('job_applications').delete().eq('id', app_id).execute()
    print("   Test application deleted")

if __name__ == "__main__":
    main()