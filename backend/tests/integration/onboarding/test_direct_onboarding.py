#!/usr/bin/env python3
"""Direct test of onboarding welcome endpoint with a generated token."""

import jwt
import requests
from datetime import datetime, timedelta

SECRET_KEY = "hotel-onboarding-super-secret-key-2025"  # From backend .env
BASE_URL = "http://localhost:8000"

def create_onboarding_token():
    """Create a direct onboarding token matching backend expectations"""
    import secrets
    from datetime import timezone
    
    payload = {
        "employee_id": "test-employee-123",
        "application_id": None,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    print(f"✅ Created onboarding token")
    print(f"   Employee: Goutam Vemula")
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
        print(f"❌ Failed: {response.text}")
        return False

def main():
    """Run direct test"""
    print("=" * 60)
    print("Direct Test of Name Display Fix")
    print("=" * 60)
    
    # Create token
    token = create_onboarding_token()
    
    # Test welcome endpoint
    success = test_welcome_endpoint(token)
    
    print("\n" + "=" * 60)
    if success:
        print("✅ NAME DISPLAY FIX VERIFIED!")
        print(f"\n🔗 Working onboarding URL:")
        print(f"   http://localhost:3000/onboard?token={token}")
    else:
        print("❌ Name display issue remains")

if __name__ == "__main__":
    main()