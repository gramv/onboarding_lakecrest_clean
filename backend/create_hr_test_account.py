#!/usr/bin/env python3
"""Create HR test account for testing"""

import os
import sys
import bcrypt
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.test')

# Setup Supabase client
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')

if not url or not key:
    print("❌ Missing Supabase credentials in .env.test")
    sys.exit(1)

supabase = create_client(url, key)

def create_hr_user():
    """Create an HR test user"""
    
    email = "hr@test.com"
    password = "test123"
    
    # Check if user already exists
    existing = supabase.table('users').select('*').eq('email', email).execute()
    
    if existing.data:
        print(f"✅ HR user already exists: {email}")
        return existing.data[0]
    
    # Hash the password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create the user
    try:
        result = supabase.table('users').insert({
            'email': email,
            'password_hash': password_hash,
            'role': 'hr',
            'first_name': 'Test',
            'last_name': 'HR',
            'is_active': True
        }).execute()
        
        if result.data:
            print(f"✅ Created HR user:")
            print(f"   Email: {email}")
            print(f"   Password: {password}")
            print(f"   Role: hr")
            return result.data[0]
        else:
            print(f"❌ Failed to create HR user")
            return None
            
    except Exception as e:
        print(f"❌ Error creating HR user: {e}")
        return None

def create_test_property():
    """Create a test property"""
    
    # Check if test property exists
    existing = supabase.table('properties').select('*').eq('id', 'test-prop-001').execute()
    
    if existing.data:
        print(f"✅ Test property already exists: test-prop-001")
        return existing.data[0]
    
    # Create test property
    try:
        result = supabase.table('properties').insert({
            'id': 'test-prop-001',
            'name': 'Test Hotel',
            'address': '123 Test St',
            'city': 'Test City',
            'state': 'TX',
            'zip': '12345',
            'phone': '555-0100',
            'is_active': True
        }).execute()
        
        if result.data:
            print(f"✅ Created test property: test-prop-001")
            return result.data[0]
        else:
            print(f"❌ Failed to create test property")
            return None
            
    except Exception as e:
        print(f"❌ Error creating test property: {e}")
        return None

def create_test_applications(property_id):
    """Create test job applications"""
    
    # Check if we have applications
    existing = supabase.table('job_applications').select('*').eq('property_id', property_id).execute()
    
    if existing.data:
        print(f"✅ Found {len(existing.data)} existing applications")
        return
    
    # Create some test applications
    applications = [
        {
            'property_id': property_id,
            'department': 'Front Desk',
            'position': 'Receptionist',
            'status': 'pending',
            'applicant_data': {
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@test.com',
                'phone': '555-0101'
            }
        },
        {
            'property_id': property_id,
            'department': 'Housekeeping',
            'position': 'Housekeeper',
            'status': 'pending',
            'applicant_data': {
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'jane.smith@test.com',
                'phone': '555-0102'
            }
        },
        {
            'property_id': property_id,
            'department': 'Food Service',
            'position': 'Server',
            'status': 'approved',
            'applicant_data': {
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'email': 'bob.johnson@test.com',
                'phone': '555-0103'
            }
        }
    ]
    
    created = 0
    for app in applications:
        try:
            result = supabase.table('job_applications').insert(app).execute()
            if result.data:
                created += 1
        except Exception as e:
            print(f"❌ Error creating application: {e}")
    
    print(f"✅ Created {created} test applications")

if __name__ == "__main__":
    print("=" * 60)
    print("Creating HR Test Data")
    print("=" * 60)
    
    # Create HR user
    hr_user = create_hr_user()
    
    # Create test property
    property = create_test_property()
    
    # Create test applications
    if property:
        create_test_applications(property['id'])
    
    print("\n" + "=" * 60)
    print("Test data creation complete!")
    print("=" * 60)