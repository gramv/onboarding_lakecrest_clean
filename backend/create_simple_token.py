#!/usr/bin/env python3
"""Create a simple test onboarding token."""

import jwt
from datetime import datetime, timedelta, timezone
import secrets

# JWT Secret from backend
SECRET_KEY = "hotel-onboarding-super-secret-key-2025"

def create_onboarding_token():
    """Create a JWT onboarding token for testing"""
    # Use a test employee ID that looks like a UUID
    employee_id = "test-" + str(secrets.token_hex(4))  # e.g., "test-a1b2c3d4"
    
    payload = {
        "employee_id": employee_id,
        "application_id": None,
        "token_type": "onboarding",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=72),
        "jti": secrets.token_urlsafe(16)
    }
    
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token, employee_id

def main():
    """Generate token"""
    print("=" * 60)
    print("Creating Simple Test Onboarding Token")
    print("=" * 60)
    
    # Generate onboarding token
    token, employee_id = create_onboarding_token()
    
    print(f"\n✅ TEST TOKEN CREATED!")
    print(f"\n📋 Test Details:")
    print(f"   Employee ID: {employee_id}")
    print(f"   Token Type: JWT Onboarding Token")
    print(f"   Expires: 72 hours from now")
    
    print(f"\n🔑 Full Token:")
    print(f"   {token}")
    
    print(f"\n🔗 Onboarding URL:")
    print(f"   http://localhost:3000/onboard?token={token}")
    
    print(f"\n📝 Test Backend API:")
    print(f"   curl http://localhost:8000/api/onboarding/welcome/{token}")
    
    print("\n" + "=" * 60)
    print("NOTE: This is a test token. The system will use demo/fallback")
    print("data since the employee doesn't exist in the database.")
    print("=" * 60)

if __name__ == "__main__":
    main()
