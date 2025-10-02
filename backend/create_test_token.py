#!/usr/bin/env python3
"""Create a test employee with onboarding token for testing."""

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

def create_test_employee():
    """Create a test employee in the database"""
    # Use a fixed UUID for test employee (so we can reuse it)
    employee_id = "11111111-1111-1111-1111-111111111111"
    
    # Check if employee already exists
    result = supabase.table('employees').select('*').eq('id', employee_id).execute()
    
    if result.data:
        print(f"✅ Test employee already exists: {employee_id}")
        return employee_id
    
    # Create new test employee (minimal fields required)
    employee_data = {
        "id": employee_id,
        "first_name": "Test",
        "last_name": "Employee",
        "position": "Test Position",
        "department": "Testing",
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",  # Demo property
        "start_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "status": "pending_onboarding"
    }
    
    result = supabase.table('employees').insert(employee_data).execute()
    
    if result.data:
        print(f"✅ Created test employee: {employee_id}")
        return employee_id
    else:
        print(f"❌ Failed to create test employee")
        return None

def create_onboarding_token(employee_id):
    """Create a JWT onboarding token"""
    payload = {
        "employee_id": employee_id,
        "application_id": None,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def main():
    """Create test employee and generate token"""
    print("=" * 60)
    print("Creating Test Onboarding Token")
    print("=" * 60)
    
    # Create or get test employee
    employee_id = create_test_employee()
    if not employee_id:
        print("Failed to create test employee")
        return
    
    # Generate onboarding token
    token = create_onboarding_token(employee_id)
    
    print("\n" + "=" * 60)
    print("✅ TEST TOKEN CREATED SUCCESSFULLY!")
    print("=" * 60)
    
    print(f"\n📋 Employee Details:")
    print(f"   ID: {employee_id}")
    print(f"   Name: Test Employee")
    print(f"   Email: test@example.com")
    
    print(f"\n🔑 Token (first 50 chars):")
    print(f"   {token[:50]}...")
    
    print(f"\n🔗 Onboarding URLs:")
    print(f"\n   Frontend (React):")
    print(f"   http://localhost:3000/onboard?token={token}")
    
    print(f"\n   Backend API Test:")
    print(f"   curl http://localhost:8000/api/onboarding/welcome/{token}")
    
    print("\n" + "=" * 60)
    print("Copy the URL above to test the onboarding flow!")
    print("=" * 60)

if __name__ == "__main__":
    main()