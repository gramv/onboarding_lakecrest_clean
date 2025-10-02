#!/usr/bin/env python3
"""Setup test data for dashboard endpoint testing"""

import os
from supabase import create_client, Client
import bcrypt
import uuid

# Load environment
os.chdir('hotel-onboarding-backend')
from dotenv import load_dotenv
load_dotenv('.env.test')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')

if not url or not key:
    print('Missing Supabase credentials')
    exit(1)

supabase: Client = create_client(url, key)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def get_property_schema():
    """Check the properties table schema"""
    try:
        # Get one row to see the schema
        result = supabase.table('properties').select('*').limit(1).execute()
        if result.data:
            print("Properties table columns:", list(result.data[0].keys()))
        else:
            # Try to get empty result to see columns
            print("No properties found, checking table exists...")
            # Try inserting minimal data
            test_id = str(uuid.uuid4())
            result = supabase.table('properties').insert({
                'id': test_id,
                'name': 'Schema Test'
            }).execute()
            if result.data:
                print("Properties table columns:", list(result.data[0].keys()))
                # Delete test record
                supabase.table('properties').delete().eq('id', test_id).execute()
    except Exception as e:
        print(f"Error checking schema: {e}")

def create_test_property():
    """Create or get test property with correct schema"""
    try:
        # Check if test property exists
        existing = supabase.table('properties').select('*').eq('name', 'Test Hotel').execute()
        if existing.data:
            print(f"Test property already exists with ID: {existing.data[0]['id']}")
            return existing.data[0]['id']
        
        # Create test property with minimal required fields
        property_id = str(uuid.uuid4())
        result = supabase.table('properties').insert({
            'id': property_id,
            'name': 'Test Hotel',
            'address': '123 Test Street, Test City, TC 12345',
            'manager_email': 'manager@demo.com'  # Include manager_email if it exists
        }).execute()
        
        if result.data:
            print(f"✅ Created test property: Test Hotel (ID: {property_id})")
            return property_id
    except Exception as e:
        print(f"❌ Error creating property: {e}")
        # Try with even more minimal data
        try:
            property_id = str(uuid.uuid4())
            result = supabase.table('properties').insert({
                'id': property_id,
                'name': 'Test Hotel'
            }).execute()
            if result.data:
                print(f"✅ Created minimal test property: Test Hotel (ID: {property_id})")
                return property_id
        except Exception as e2:
            print(f"❌ Error creating minimal property: {e2}")
            return None

def create_user(email: str, password: str, role: str, property_id: str = None):
    """Create a user in the database"""
    try:
        # Check if user already exists
        existing = supabase.table('users').select('*').eq('email', email).execute()
        if existing.data:
            print(f"User {email} already exists, updating...")
            # Update existing user
            result = supabase.table('users').update({
                'password_hash': hash_password(password),
                'role': role,
                'is_active': True
            }).eq('email', email).execute()
            user_id = existing.data[0]['id']
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            result = supabase.table('users').insert({
                'id': user_id,
                'email': email,
                'password_hash': hash_password(password),
                'role': role,
                'is_active': True
            }).execute()
            
            if not result.data:
                print(f"❌ Failed to create user {email}")
                return None
        
        print(f"✅ Created/Updated {role} user: {email}")
        
        # If manager, assign to property
        if role == 'manager' and property_id:
            # Check if assignment exists
            existing_assignment = supabase.table('property_managers').select('*').eq('user_id', user_id).execute()
            if existing_assignment.data:
                # Update existing assignment
                supabase.table('property_managers').update({
                    'property_id': property_id
                }).eq('user_id', user_id).execute()
            else:
                # Create new assignment
                supabase.table('property_managers').insert({
                    'user_id': user_id,
                    'property_id': property_id
                }).execute()
            print(f"  - Assigned to property: {property_id}")
        
        return user_id
    except Exception as e:
        print(f"❌ Error creating {email}: {e}")
        return None

def create_test_data(property_id: str):
    """Create some test applications and employees"""
    try:
        # Create test job applications with all required fields
        applications = [
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'phone': '555-0101',
                'status': 'pending',
                'submission_date': 'now()'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'jane@example.com',
                'phone': '555-0102',
                'status': 'pending',
                'submission_date': 'now()'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'email': 'bob@example.com',
                'phone': '555-0103',
                'status': 'approved',
                'submission_date': 'now()'
            },
        ]
        
        for app in applications:
            existing = supabase.table('job_applications').select('*').eq('email', app['email']).execute()
            if not existing.data:
                result = supabase.table('job_applications').insert(app).execute()
                if result.data:
                    print(f"  - Created application for {app['first_name']} {app['last_name']}")
        
        # Create test employees
        employees = [
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Alice',
                'last_name': 'Brown',
                'email': 'alice@example.com',
                'phone': '555-0201',
                'employment_status': 'active',
                'onboarding_status': 'completed'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Charlie',
                'last_name': 'Davis',
                'email': 'charlie@example.com',
                'phone': '555-0202',
                'employment_status': 'active',
                'onboarding_status': 'in_progress'
            },
        ]
        
        for emp in employees:
            existing = supabase.table('employees').select('*').eq('email', emp['email']).execute()
            if not existing.data:
                result = supabase.table('employees').insert(emp).execute()
                if result.data:
                    print(f"  - Created employee {emp['first_name']} {emp['last_name']}")
                
    except Exception as e:
        print(f"❌ Error creating test data: {e}")

def main():
    print("=" * 60)
    print("Setting Up Test Data for Dashboard Testing")
    print("=" * 60)
    
    # Check schema first
    print("\nChecking properties table schema...")
    get_property_schema()
    
    # Create test property
    print("\nCreating test property...")
    property_id = create_test_property()
    
    if property_id:
        # Create users
        print("\nCreating test users...")
        
        # Create HR user
        create_user('hr@hotelgroup.com', 'hr123456', 'hr')
        
        # Create Manager user
        create_user('manager@demo.com', 'manager123', 'manager', property_id)
        
        # Create test data
        print("\nCreating test applications and employees...")
        create_test_data(property_id)
    else:
        print("\n⚠️  Could not create property, creating users without property assignment...")
        create_user('hr@hotelgroup.com', 'hr123456', 'hr')
        create_user('manager@demo.com', 'manager123', 'manager')
    
    print("\n" + "=" * 60)
    print("Setup complete!")
    print("=" * 60)
    print("\nTest Credentials:")
    print("  HR User: hr@hotelgroup.com / hr123456")
    print("  Manager User: manager@demo.com / manager123")

if __name__ == "__main__":
    main()