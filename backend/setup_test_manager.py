#!/usr/bin/env python3
"""
Setup test manager account for testing
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import bcrypt

# Load environment variables
load_dotenv('.env.test')

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Error: Missing Supabase credentials")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    print(f"SUPABASE_ANON_KEY: {'***' if SUPABASE_ANON_KEY else 'None'}")
    sys.exit(1)

# Create Supabase client with anon key (will work for public tables)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def setup_test_manager():
    """Create or update test manager account"""
    
    # Hash the password
    password = "Password123!"
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Check if manager exists
    result = supabase.table('users').select('*').eq('email', 'manager@demo.com').execute()
    
    if result.data:
        # Update existing manager
        update_result = supabase.table('users').update({
            'password_hash': hashed_password,
            'role': 'manager',
            'is_active': True
        }).eq('email', 'manager@demo.com').execute()
        
        print(f"✅ Updated existing manager@demo.com")
        manager_id = result.data[0]['id']
    else:
        # Create new manager
        insert_result = supabase.table('users').insert({
            'email': 'manager@demo.com',
            'password_hash': hashed_password,
            'first_name': 'Demo',
            'last_name': 'Manager',
            'role': 'manager',
            'is_active': True
        }).execute()
        
        print(f"✅ Created new manager@demo.com")
        manager_id = insert_result.data[0]['id']
    
    # Ensure manager is assigned to demo property
    property_result = supabase.table('properties').select('*').eq('id', '85837d95-1595-4322-b291-fd130cff17c1').execute()
    
    if not property_result.data:
        # Create demo property if it doesn't exist
        supabase.table('properties').insert({
            'id': '85837d95-1595-4322-b291-fd130cff17c1',
            'name': 'Demo Hotel',
            'code': 'DEMO001',
            'address': '123 Demo Street',
            'city': 'Demo City',
            'state': 'DC',
            'zip': '12345',
            'is_active': True
        }).execute()
        print("✅ Created Demo Hotel property")
    
    # Check property assignment
    assignment_result = supabase.table('property_managers').select('*').eq('manager_id', manager_id).eq('property_id', '85837d95-1595-4322-b291-fd130cff17c1').execute()
    
    if not assignment_result.data:
        # Assign manager to property
        supabase.table('property_managers').insert({
            'manager_id': manager_id,
            'property_id': '85837d95-1595-4322-b291-fd130cff17c1'
        }).execute()
        print("✅ Assigned manager to Demo Hotel")
    
    print(f"\n✅ Test manager ready:")
    print(f"   Email: manager@demo.com")
    print(f"   Password: Password123!")
    print(f"   Property: Demo Hotel")
    
    # Also create a test application for this property
    app_result = supabase.table('job_applications').select('*').eq('property_id', '85837d95-1595-4322-b291-fd130cff17c1').eq('status', 'pending').execute()
    
    if not app_result.data:
        # Create a test application
        supabase.table('job_applications').insert({
            'property_id': '85837d95-1595-4322-b291-fd130cff17c1',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'phone': '555-0123',
            'position': 'Front Desk',
            'status': 'pending',
            'emergency_contact_name': 'Jane Doe',
            'emergency_contact_phone': '555-0124',
            'emergency_contact_relationship': 'Spouse'
        }).execute()
        print("✅ Created test application for approval")

if __name__ == "__main__":
    setup_test_manager()