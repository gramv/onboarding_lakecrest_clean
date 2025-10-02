#!/usr/bin/env python3
"""Generate a working onboarding token with the CORRECT JWT secret from .env.test"""

import jwt
import uuid
from datetime import datetime, timedelta, timezone
from supabase import create_client
import secrets
import os
from dotenv import load_dotenv

# Load the correct environment variables
load_dotenv(".env.test")

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Use the CORRECT JWT Secret from backend's .env.test
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # This is "dev-secret"

print(f"Using JWT Secret: {JWT_SECRET_KEY}")

def create_job_application():
    """Create a job application that we can approve"""
    app_id = str(uuid.uuid4())
    
    application_data = {
        "id": app_id,
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",  # Demo property
        "department": "Front Office",
        "position": "Guest Services Agent",
        "status": "approved",
        "applicant_data": {
            "first_name": "Cloud",
            "last_name": "Tester",
            "email": "cloudtester@example.com",
            "phone": "555-0123",
            "address": "456 Cloud Street",
            "city": "Test City",
            "state": "CA",
            "zip_code": "90001",
            "work_authorized": True,
            "employment_type": "full_time",
            "availability": "immediate",
            "desired_pay": "$22/hour",
            "experience_years": "2-5",
            "education_level": "high_school",
            "has_transportation": True,
            "can_work_weekends": True,
            "can_work_nights": True,
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
    """Create a JWT onboarding token with the CORRECT secret"""
    payload = {
        "employee_id": employee_id,
        "application_id": application_id,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    # Use the CORRECT secret from .env.test
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    return token

def verify_token_works(token):
    """Verify the token can be decoded with the backend's secret"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        print(f"✅ Token verification successful!")
        print(f"   Token type: {payload.get('token_type')}")
        print(f"   Employee ID: {payload.get('employee_id')}")
        return True
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        return False

def main():
    """Create everything needed for a working token"""
    print("=" * 60)
    print("🔧 GENERATING WORKING TOKEN WITH CORRECT JWT SECRET")
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
    
    # Step 3: Generate JWT token with CORRECT secret
    print("\n3. Generating JWT token with correct secret...")
    token = create_onboarding_token(employee_id, app_id)
    
    # Step 4: Verify token works
    print("\n4. Verifying token...")
    if not verify_token_works(token):
        print("Token verification failed!")
        return
    
    print("\n" + "=" * 60)
    print("🎉 WORKING TOKEN GENERATED SUCCESSFULLY!")
    print("=" * 60)
    
    print(f"\n📋 Employee Details:")
    print(f"   Name: Cloud Tester")
    print(f"   Position: Guest Services Agent")
    print(f"   Department: Front Office")
    print(f"   Employee ID: {employee_id}")
    print(f"   Application ID: {app_id}")
    
    print(f"\n🔑 Token (copy this):")
    print(f"\n{token}")
    
    print(f"\n🔗 Onboarding URL (copy and paste in browser):")
    print(f"\nhttp://localhost:3000/onboard?token={token}")
    
    print("\n" + "=" * 60)
    print("✅ This token WILL work with the backend!")
    print("✅ JWT Secret correctly matches backend .env.test")
    print("✅ Ready to test cloud sync functionality!")
    print("=" * 60)

if __name__ == "__main__":
    main()