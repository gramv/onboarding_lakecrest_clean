#!/usr/bin/env python3
"""
Generate a valid onboarding token for Goutam Vemula
"""

import jwt
import json
from datetime import datetime, timedelta, timezone
import requests
import uuid

# Use the exact JWT secret from .env.test
JWT_SECRET_KEY = "dev-secret"
JWT_ALGORITHM = "HS256"

def generate_onboarding_token():
    """Generate a valid 7-day onboarding token"""
    
    # Token payload matching backend expectations
    payload = {
        "email": "goutamramv@gmail.com",
        "name": "Goutam Vemula",
        "position": "Software Engineer",
        "property": "Demo Hotel",
        "property_id": "test-prop-001",  # Using the test property ID
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),  # Unique token ID
        "token_type": "onboarding",  # Changed from "type" to "token_type"
        "employee_id": str(uuid.uuid4())  # Add employee_id for tracking
    }
    
    # Generate the token
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    return token, payload

def test_token(token):
    """Test the token with the backend API"""
    url = f"http://localhost:8000/api/onboarding/session/{token}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("✅ Token validation successful!")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print(f"❌ Token validation failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("⚠️  Backend server not running at http://localhost:8000")
        print("   Please start the backend first with:")
        print("   python3 -m uvicorn app.main_enhanced:app --host 0.0.0.0 --port 8000 --reload")
        return False
    except Exception as e:
        print(f"❌ Error testing token: {e}")
        return False

def main():
    print("=" * 60)
    print("Generating Onboarding Token for Goutam Vemula")
    print("=" * 60)
    
    # Generate the token
    token, payload = generate_onboarding_token()
    
    print("\n📋 Token Details:")
    print(f"  Name: {payload['name']}")
    print(f"  Email: {payload['email']}")
    print(f"  Position: {payload['position']}")
    print(f"  Property: {payload['property']}")
    print(f"  Property ID: {payload['property_id']}")
    print(f"  Employee ID: {payload['employee_id']}")
    print(f"  Expires: {payload['exp'].strftime('%Y-%m-%d %H:%M:%S UTC')}")
    
    print("\n🔑 Generated Token:")
    print(f"  {token}")
    
    print("\n🔗 Complete Onboarding URL:")
    print(f"  http://localhost:3000/onboard?token={token}")
    
    print("\n" + "=" * 60)
    print("Testing Token with Backend API...")
    print("=" * 60)
    
    # Test the token
    if test_token(token):
        print("\n✅ SUCCESS! Token is valid and ready to use.")
        print("\n📌 Copy this URL to start onboarding:")
        print(f"   http://localhost:3000/onboard?token={token}")
    else:
        print("\n⚠️  Token generated but couldn't verify with backend.")
        print("   Make sure the backend server is running.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()