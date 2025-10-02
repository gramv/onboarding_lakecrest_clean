#!/usr/bin/env python3
"""Create a test onboarding token for an employee"""

import os
import sys
import jwt
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client

# Load environment
load_dotenv('hotel-onboarding-backend/.env')

# Initialize Supabase
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')
jwt_secret = os.getenv('JWT_SECRET_KEY', 'hotel-onboarding-super-secret-key-2025')
supabase = create_client(url, key)

# Create test employee data
employee_id = str(uuid.uuid4())
employee_email = f"testemployee_{datetime.now().strftime('%Y%m%d_%H%M%S')}@demo.com"
first_name = "John"
last_name = "Doe"

# Get or create a property
properties = supabase.table('properties').select('id, name').limit(1).execute()
if properties.data:
    property_id = properties.data[0]['id']
    property_name = properties.data[0]['name']
else:
    # Create a test property
    property_id = str(uuid.uuid4())
    property_name = "Test Hotel"
    supabase.table('properties').insert({
        'id': property_id,
        'name': property_name,
        'address': '123 Test St',
        'city': 'Test City',
        'state': 'CA',
        'zip_code': '12345',
        'phone': '555-0100'
    }).execute()

# Create employee record
try:
    employee_result = supabase.table('employees').insert({
        'id': employee_id,
        'email': employee_email,
        'first_name': first_name,
        'last_name': last_name,
        'property_id': property_id,
        'status': 'pending_onboarding',
        'created_at': datetime.now().isoformat()
    }).execute()
    print(f"✅ Created employee: {first_name} {last_name}")
except Exception as e:
    print(f"Note: Employee might already exist or table might not be configured: {e}")

# Create JWT token for onboarding (7-day expiry)
expiry = datetime.utcnow() + timedelta(days=7)
token_payload = {
    'employee_id': employee_id,
    'email': employee_email,
    'first_name': first_name,
    'last_name': last_name,
    'property_id': property_id,
    'property_name': property_name,
    'role': 'employee',
    'purpose': 'onboarding',
    'exp': expiry,
    'iat': datetime.utcnow()
}

# Generate token
token = jwt.encode(token_payload, jwt_secret, algorithm='HS256')

# Store token in database (optional)
try:
    supabase.table('onboarding_tokens').insert({
        'token': token,
        'employee_id': employee_id,
        'property_id': property_id,
        'expires_at': expiry.isoformat(),
        'created_at': datetime.now().isoformat()
    }).execute()
except Exception as e:
    print(f"Note: Token table might not exist: {e}")

print("\n" + "="*60)
print("🎉 ONBOARDING TEST TOKEN CREATED SUCCESSFULLY!")
print("="*60)
print(f"\n📋 Employee Details:")
print(f"  Name: {first_name} {last_name}")
print(f"  Email: {employee_email}")
print(f"  Employee ID: {employee_id}")
print(f"  Property: {property_name}")
print(f"  Token expires: {expiry.strftime('%Y-%m-%d %H:%M:%S UTC')}")

print(f"\n🔗 Onboarding URL:")
print(f"  http://localhost:3000/onboard?token={token}")

print(f"\n📝 Raw Token (if needed):")
print(f"  {token}")

print("\n✨ Click the URL above to start the onboarding process!")
print("="*60)