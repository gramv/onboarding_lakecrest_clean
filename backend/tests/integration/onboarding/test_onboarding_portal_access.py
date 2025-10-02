#!/usr/bin/env python3
"""
Test JWT token access to onboarding portal
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import jwt

# Backend URL
API_URL = "http://localhost:8000"

# JWT Configuration (same as backend)
JWT_SECRET_KEY = "hotel-onboarding-super-secret-key-2025"  # From .env
JWT_ALGORITHM = "HS256"

def create_test_jwt_token(employee_id: str, property_id: str, hours: int = 72):
    """Create a test JWT token for employee onboarding"""
    expire = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    payload = {
        "employee_id": employee_id,
        "application_id": None,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": expire,
        "jti": "test-token-id"
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token

def test_welcome_endpoint_with_jwt():
    """Test the welcome endpoint with a JWT token"""
    print("\n" + "="*60)
    print("Testing Onboarding Portal Token Access")
    print("="*60)
    
    # Create a test JWT token with a known good employee ID
    # Use an existing test employee ID or create one that exists in the database
    test_employee_id = "e4246055-1e87-42b1-998d-b07446e2b46f"  # This was approved earlier
    test_property_id = "858837d95-1595-4322-b291-fd130cff17c1"  # Demo Hotel
    
    token = create_test_jwt_token(test_employee_id, test_property_id)
    print(f"\n✅ Created JWT token for employee: {test_employee_id}")
    print(f"Token (first 50 chars): {token[:50]}...")
    
    # Test the welcome endpoint
    url = f"{API_URL}/api/onboarding/welcome/{token}"
    print(f"\n📡 Testing GET {url[:60]}...")
    
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Success! Welcome data retrieved:")
            if data.get("data"):
                session_data = data["data"].get("session", {})
                print(f"  - Session ID: {session_data.get('id')}")
                print(f"  - Session Status: {session_data.get('status')}")
                print(f"  - Current Step: {session_data.get('current_step')}")
                
                employee_data = data["data"].get("employee", {})
                if employee_data:
                    print(f"  - Employee: {employee_data.get('first_name')} {employee_data.get('last_name')}")
                else:
                    print("  - Employee: Will be created from token data")
                    
                property_data = data["data"].get("property", {})
                if property_data:
                    print(f"  - Property: {property_data.get('name')}")
        elif response.status_code == 401:
            print(f"\n❌ Authentication failed: {response.json()}")
        else:
            print(f"\n❌ Unexpected error: {response.text}")
            
    except Exception as e:
        print(f"\n❌ Error calling API: {e}")
    
    print("\n" + "="*60)
    
    # Test with an expired token
    print("\n🔍 Testing with expired token...")
    expired_token = create_test_jwt_token("expired-emp-001", test_property_id, hours=-1)
    
    url = f"{API_URL}/api/onboarding/welcome/{expired_token}"
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly rejected expired token")
        else:
            print(f"❌ Should have rejected expired token: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test with invalid signature
    print("\n🔍 Testing with invalid signature...")
    invalid_token = jwt.encode(
        {"employee_id": "invalid-emp-001", "token_type": "onboarding", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "wrong-secret-key",
        algorithm=JWT_ALGORITHM
    )
    
    url = f"{API_URL}/api/onboarding/welcome/{invalid_token}"
    try:
        response = requests.get(url)
        print(f"Response status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly rejected invalid signature")
        else:
            print(f"❌ Should have rejected invalid token: {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_welcome_endpoint_with_jwt()