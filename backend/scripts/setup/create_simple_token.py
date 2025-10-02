#!/usr/bin/env python3
"""Create a simple onboarding token without database dependencies"""

import jwt
import uuid
from datetime import datetime, timedelta, timezone

# JWT configuration (matching backend)
JWT_SECRET_KEY = 'hotel-onboarding-super-secret-key-2025'

# Create test employee data
employee_id = str(uuid.uuid4())
property_id = str(uuid.uuid4())

# Token payload - must include token_type for backend validation
token_payload = {
    'employee_id': employee_id,
    'email': 'john.doe@testhotel.com',
    'first_name': 'John',
    'last_name': 'Doe',
    'property_id': property_id,
    'property_name': 'Demo Hotel',
    'role': 'employee',
    'token_type': 'onboarding',  # Required by backend auth.py
    'application_id': str(uuid.uuid4()),  # Backend expects this
    'jti': str(uuid.uuid4()),  # JWT ID for token uniqueness
    'position': 'Front Desk Agent',
    'department': 'Guest Services',
    'exp': datetime.now(timezone.utc) + timedelta(days=7),
    'iat': datetime.now(timezone.utc)
}

# Generate token
token = jwt.encode(token_payload, JWT_SECRET_KEY, algorithm='HS256')

print("\n" + "="*60)
print("🎉 SIMPLE ONBOARDING TOKEN CREATED!")
print("="*60)
print("\n📋 Test Employee:")
print("  Name: John Doe")
print("  Email: john.doe@testhotel.com")
print("  Position: Front Desk Agent")
print("  Department: Guest Services")
print("  Property: Demo Hotel")

print("\n🔗 Click this URL to test onboarding:")
print(f"\n  http://localhost:3000/onboard?token={token}")

print("\n📱 Or copy the token:")
print(f"\n{token}")
print("\n" + "="*60)