#!/usr/bin/env python3
"""Generate a working onboarding token by creating proper database entries."""

import jwt
import uuid
from datetime import datetime, timedelta, timezone
from supabase import create_client
import secrets

# Supabase setup
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjQxMTcsImV4cCI6MjA3MDM0MDExN30.VMl6QzCZleoOvcY_abOHsztgXcottOnDv2kzJgmCjdg"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT Secret from backend
SECRET_KEY = "hotel-onboarding-super-secret-key-2025"

def create_job_application():
    """Create a job application that we can approve"""
    app_id = str(uuid.uuid4())
    
    application_data = {
        "id": app_id,
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",  # Demo property
        "department": "Front Office",
        "position": "Guest Services",
        "status": "approved",
        "applicant_data": {
            "first_name": "Test",
            "last_name": "User",
            "email": "testuser@example.com",
            "phone": "555-0100",
            "address": "123 Test Street",
            "city": "Test City",
            "state": "CA",
            "zip_code": "90001",
            "work_authorized": True,
            "employment_type": "full_time",
            "availability": "immediate",
            "desired_pay": "$20/hour",
            "experience_years": "2-5",
            "education_level": "high_school",
            "has_transportation": True,
            "can_work_weekends": True,
            "can_work_nights": False,
            "references_available": True
        },
        "applied_at": datetime.now().isoformat(),
        "reviewed_at": datetime.now().isoformat(),
        "reviewed_by": "45b5847b-9de6-49e5-b042-ea9e91b7dea7"  # manager@demo.com's UUID
    }
    
    result = supabase.table('job_applications').insert(application_data).execute()
    
    if result.data:
        print(f"✅ Created job application: {app_id}")
        return app_id
    else:
        print(f"❌ Failed to create application")
        return None

def create_employee_from_application(app_id):
    """Create an employee from the application"""
    employee_id = str(uuid.uuid4())
    
    # Get the application data
    result = supabase.table('job_applications').select('*').eq('id', app_id).execute()
    if not result.data:
        print("❌ Application not found")
        return None
    
    app = result.data[0]
    applicant = app['applicant_data']
    
    # Create employee record (minimal required fields)
    employee_data = {
        "id": employee_id,
        "property_id": app['property_id'],
        "position": app['position'],
        "department": app['department'],
        "hire_date": datetime.now().date().isoformat(),
        "application_id": app_id
    }
    
    result = supabase.table('employees').insert(employee_data).execute()
    
    if result.data:
        print(f"✅ Created employee: {employee_id}")
        print(f"   Name: {applicant['first_name']} {applicant['last_name']}")
        return employee_id
    else:
        print(f"❌ Failed to create employee")
        return None

def create_onboarding_token(employee_id, application_id):
    """Create a JWT onboarding token"""
    payload = {
        "employee_id": employee_id,
        "application_id": application_id,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def main():
    """Create everything needed for a working token"""
    print("=" * 60)
    print("Generating Working Onboarding Token")
    print("=" * 60)
    
    # Step 1: Create job application
    print("\n1. Creating job application...")
    app_id = create_job_application()
    if not app_id:
        print("Failed to create application")
        return
    
    # Step 2: Create employee from application
    print("\n2. Creating employee from application...")
    employee_id = create_employee_from_application(app_id)
    if not employee_id:
        print("Failed to create employee")
        return
    
    # Step 3: Generate JWT token
    print("\n3. Generating JWT token...")
    token = create_onboarding_token(employee_id, app_id)
    
    print("\n" + "=" * 60)
    print("✅ WORKING TOKEN GENERATED SUCCESSFULLY!")
    print("=" * 60)
    
    print(f"\n📋 Details:")
    print(f"   Name: Test User")
    print(f"   Position: Guest Services")
    print(f"   Department: Front Office")
    print(f"   Employee ID: {employee_id}")
    print(f"   Application ID: {app_id}")
    
    print(f"\n🔑 Token (copy this):")
    print(f"\n{token}")
    
    print(f"\n🔗 Onboarding URL (copy and paste in browser):")
    print(f"\nhttp://localhost:3000/onboard?token={token}")
    
    print("\n" + "=" * 60)
    print("✅ This token will work with the backend!")
    print("=" * 60)

if __name__ == "__main__":
    main()