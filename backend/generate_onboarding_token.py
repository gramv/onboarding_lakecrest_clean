#!/usr/bin/env python3
"""
Generate an onboarding token for an existing approved application
"""

import jwt
from datetime import datetime, timedelta
import json

# Use the first approved application's data
APPLICATION_DATA = {
    "id": "83a1ab26-43f0-432e-a82b-f4d9f070e7e1",
    "property_id": "903ed05b-5990-4ecf-b1b2-7592cf2923df",
    "first_name": "Goutam",
    "last_name": "Vemula",
    "email": "vgoutamram@gmail.com",
    "position": "Night Auditor",
    "department": "Front Desk"
}

# JWT configuration (should match backend)
JWT_SECRET = "hotel-onboarding-super-secret-key-2025"  # From .env file
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRATION_DAYS = 7

def generate_onboarding_token():
    """Generate an onboarding token for the application"""
    
    # Create token payload
    payload = {
        "employee_id": APPLICATION_DATA["id"],
        "property_id": APPLICATION_DATA["property_id"],
        "email": APPLICATION_DATA["email"],
        "first_name": APPLICATION_DATA["first_name"],
        "last_name": APPLICATION_DATA["last_name"],
        "position": APPLICATION_DATA["position"],
        "department": APPLICATION_DATA["department"],
        "token_type": "onboarding",
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRATION_DAYS),
        "iat": datetime.utcnow()
    }
    
    # Generate token
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Generate onboarding URL
    onboarding_url = f"http://localhost:3000/onboard?token={token}"
    
    print("\n" + "="*60)
    print("🎫 ONBOARDING TOKEN GENERATED")
    print("="*60)
    print(f"\n👤 Employee: {APPLICATION_DATA['first_name']} {APPLICATION_DATA['last_name']}")
    print(f"📧 Email: {APPLICATION_DATA['email']}")
    print(f"💼 Position: {APPLICATION_DATA['position']}")
    print(f"🏢 Department: {APPLICATION_DATA['department']}")
    print(f"\n🔑 Application ID: {APPLICATION_DATA['id']}")
    print(f"\n🎫 Token (first 50 chars):")
    print(f"   {token[:50]}...")
    print(f"\n🔗 ONBOARDING URL:")
    print(f"   {onboarding_url}")
    print(f"\n📝 Instructions:")
    print(f"   1. Copy the URL above")
    print(f"   2. Open it in your browser (http://localhost:3000)")
    print(f"   3. The link will redirect to the onboarding portal")
    print(f"   4. You should see the welcome page for {APPLICATION_DATA['first_name']} {APPLICATION_DATA['last_name']}")
    print(f"   5. Click 'Start Onboarding' to begin the process")
    print("\n" + "="*60)
    
    # Save to file for reference
    with open("onboarding_token.json", "w") as f:
        json.dump({
            "token": token,
            "url": onboarding_url,
            "employee": APPLICATION_DATA,
            "generated_at": datetime.utcnow().isoformat()
        }, f, indent=2)
    print("\n💾 Token details saved to: onboarding_token.json")
    
    return token, onboarding_url

if __name__ == "__main__":
    token, url = generate_onboarding_token()