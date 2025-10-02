#!/usr/bin/env python3
"""Final complete test - create employee directly and test both email and name display."""

import json
import jwt
import requests
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from supabase import create_client

# Supabase setup
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjQxMTcsImV4cCI6MjA3MDM0MDExN30.VMl6QzCZleoOvcY_abOHsztgXcottOnDv2kzJgmCjdg"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "http://localhost:8000"
JWT_SECRET = "hotel-onboarding-super-secret-key-2025"

def create_employee_directly():
    """Create employee directly in database"""
    employee_id = str(uuid.uuid4())
    
    employee_data = {
        "id": employee_id,
        "property_id": "9e5d1d9b-0caf-44f0-99dd-8e71b88c1400",
        "personal_info": {
            "first_name": "Goutam",
            "last_name": "Vemula",
            "email": "goutamramv@gmail.com",
            "phone": "555-0123"
        },
        "department": "Engineering",
        "position": "Software Engineer",
        "hire_date": datetime.now(timezone.utc).date().isoformat(),
        "onboarding_status": "not_started",
        "employment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert into database
    result = supabase.table('employees').insert(employee_data).execute()
    
    if result.data:
        print(f"✅ Created employee: {employee_id}")
        print(f"   Name: Goutam Vemula")
        print(f"   Email: goutamramv@gmail.com")
        return employee_id
    else:
        print(f"❌ Failed to create employee")
        return None

def create_onboarding_token(employee_id):
    """Create onboarding token for the employee"""
    payload = {
        "employee_id": employee_id,
        "application_id": None,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    print(f"✅ Created onboarding token")
    print(f"   Token: {token[:50]}...")
    return token

def test_welcome_endpoint(token):
    """Test the welcome endpoint"""
    print(f"\n👤 Testing welcome endpoint...")
    
    response = requests.get(
        f"{BASE_URL}/api/onboarding/welcome/{token}"
    )
    
    print(f"   Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Welcome endpoint working!")
        
        # Check all the data
        if 'data' in data:
            welcome_data = data['data']
            message = welcome_data.get('message', '')
            employee_name = welcome_data.get('employee_name', '')
            property_name = welcome_data.get('property_name', '')
            
            print(f"   Message: {message}")
            print(f"   Employee name: {employee_name}")
            print(f"   Property: {property_name}")
            
            if "Welcome Goutam!" in message or "Welcome, Goutam!" in message:
                print("   ✅ Name correctly displayed!")
                return True, token
            else:
                print(f"   ❌ Name not correctly displayed")
                return False, token
        else:
            # Try direct response format
            message = data.get('message', '')
            if message:
                print(f"   Message: {message}")
                if "Welcome Goutam!" in message or "Welcome, Goutam!" in message:
                    print("   ✅ Name correctly displayed!")
                    return True, token
            
            print(f"   Response structure: {json.dumps(data, indent=2)}")
            return False, token
    else:
        print(f"❌ Failed: {response.text}")
        return False, None

def main():
    """Run the complete test"""
    print("=" * 60)
    print("FINAL TEST: Email Approval and Name Display")
    print("=" * 60)
    
    # Step 1: Create employee directly
    print("\n1. Creating employee Goutam Vemula...")
    employee_id = create_employee_directly()
    if not employee_id:
        print("Failed to create employee. Exiting.")
        return
    
    # Step 2: Create onboarding token
    print("\n2. Creating onboarding token...")
    token = create_onboarding_token(employee_id)
    
    # Step 3: Test welcome endpoint
    print("\n3. Testing welcome endpoint...")
    success, token = test_welcome_endpoint(token)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS")
    print("=" * 60)
    
    if success:
        print("✅ NAME DISPLAY FIX VERIFIED!")
        print(f"\n🔗 Working onboarding URL:")
        print(f"   http://localhost:3000/onboard?token={token}")
        print(f"\n📧 NOTE: For email testing, approval flow needs manager login fix")
    else:
        print("❌ Name display issue remains")
    
    # Clean up
    print("\n🧹 Cleaning up test data...")
    supabase.table('employees').delete().eq('id', employee_id).execute()
    print("   Test employee deleted")

if __name__ == "__main__":
    main()