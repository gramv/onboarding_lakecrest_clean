#!/usr/bin/env python3
"""Setup complete test data for dashboard endpoint testing"""

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

def create_test_property():
    """Create or get test property"""
    try:
        # Check if test property exists
        existing = supabase.table('properties').select('*').eq('name', 'Test Hotel').execute()
        if existing.data:
            print(f"Test property already exists with ID: {existing.data[0]['id']}")
            return existing.data[0]['id']
        
        # Create test property with all required fields
        property_id = str(uuid.uuid4())
        result = supabase.table('properties').insert({
            'id': property_id,
            'name': 'Test Hotel',
            'address': '123 Test Street',
            'city': 'Test City',
            'state': 'TC',
            'zip_code': '12345',
            'phone': '555-0100',
            'is_active': True
        }).execute()
        
        if result.data:
            print(f"✅ Created test property: Test Hotel (ID: {property_id})")
            return property_id
    except Exception as e:
        print(f"❌ Error creating property: {e}")
        return None

def create_user(email: str, password: str, role: str, first_name: str, last_name: str, property_id: str = None):
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
                'first_name': first_name,
                'last_name': last_name,
                'is_active': True
            }).eq('email', email).execute()
            user_id = existing.data[0]['id']
        else:
            # Create new user with all required fields
            user_id = str(uuid.uuid4())
            result = supabase.table('users').insert({
                'id': user_id,
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'password_hash': hash_password(password),
                'role': role,
                'is_active': True
            }).execute()
            
            if not result.data:
                print(f"❌ Failed to create user {email}")
                return None
        
        print(f"✅ Created/Updated {role} user: {email} ({first_name} {last_name})")
        
        # If manager, assign to property
        if role == 'manager' and property_id:
            try:
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
            except Exception as e:
                print(f"  ⚠️  Could not assign manager to property: {e}")
        
        return user_id
    except Exception as e:
        print(f"❌ Error creating {email}: {e}")
        return None

def create_test_applications(property_id: str):
    """Create test job applications"""
    try:
        applications = [
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john@example.com',
                'phone': '555-0101',
                'status': 'pending',
                'position_applied': 'Front Desk',
                'availability_date': '2025-09-01'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Jane',
                'last_name': 'Smith',
                'email': 'jane@example.com',
                'phone': '555-0102',
                'status': 'pending',
                'position_applied': 'Housekeeping',
                'availability_date': '2025-09-01'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Bob',
                'last_name': 'Johnson',
                'email': 'bob@example.com',
                'phone': '555-0103',
                'status': 'approved',
                'position_applied': 'Maintenance',
                'availability_date': '2025-09-01'
            },
        ]
        
        created_count = 0
        for app in applications:
            try:
                existing = supabase.table('job_applications').select('*').eq('email', app['email']).execute()
                if not existing.data:
                    result = supabase.table('job_applications').insert(app).execute()
                    if result.data:
                        print(f"  ✅ Created application: {app['first_name']} {app['last_name']} ({app['status']})")
                        created_count += 1
                else:
                    print(f"  - Application already exists for {app['email']}")
            except Exception as e:
                print(f"  ❌ Error creating application for {app['email']}: {e}")
        
        return created_count
    except Exception as e:
        print(f"❌ Error creating applications: {e}")
        return 0

def create_test_employees(property_id: str):
    """Create test employees"""
    try:
        employees = [
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Alice',
                'last_name': 'Brown',
                'email': 'alice@example.com',
                'phone': '555-0201',
                'employment_status': 'active',
                'onboarding_status': 'completed',
                'position': 'Front Desk Manager',
                'department': 'Operations'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Charlie',
                'last_name': 'Davis',
                'email': 'charlie@example.com',
                'phone': '555-0202',
                'employment_status': 'active',
                'onboarding_status': 'in_progress',
                'position': 'Housekeeping Supervisor',
                'department': 'Housekeeping'
            },
            {
                'id': str(uuid.uuid4()),
                'property_id': property_id,
                'first_name': 'Diana',
                'last_name': 'Evans',
                'email': 'diana@example.com',
                'phone': '555-0203',
                'employment_status': 'active',
                'onboarding_status': 'not_started',
                'position': 'Maintenance Tech',
                'department': 'Maintenance'
            },
        ]
        
        created_count = 0
        for emp in employees:
            try:
                existing = supabase.table('employees').select('*').eq('email', emp['email']).execute()
                if not existing.data:
                    result = supabase.table('employees').insert(emp).execute()
                    if result.data:
                        print(f"  ✅ Created employee: {emp['first_name']} {emp['last_name']} ({emp['onboarding_status']})")
                        created_count += 1
                else:
                    print(f"  - Employee already exists: {emp['email']}")
            except Exception as e:
                print(f"  ❌ Error creating employee {emp['email']}: {e}")
        
        return created_count
    except Exception as e:
        print(f"❌ Error creating employees: {e}")
        return 0

def main():
    print("=" * 60)
    print("Setting Up Complete Test Data for Dashboard Testing")
    print("=" * 60)
    
    # Create test property
    print("\n1. Creating test property...")
    property_id = create_test_property()
    
    if not property_id:
        print("\n❌ Failed to create property. Exiting...")
        return
    
    # Create users
    print("\n2. Creating test users...")
    
    # Create HR user
    hr_user = create_user('hr@hotelgroup.com', 'hr123456', 'hr', 'HR', 'Admin')
    
    # Create Manager user
    manager_user = create_user('manager@demo.com', 'manager123', 'manager', 'John', 'Manager', property_id)
    
    # Create test applications
    print("\n3. Creating test job applications...")
    app_count = create_test_applications(property_id)
    
    # Create test employees
    print("\n4. Creating test employees...")
    emp_count = create_test_employees(property_id)
    
    # Summary
    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print("\n📊 Test Data Summary:")
    print(f"  - Property: Test Hotel (ID: {property_id})")
    print(f"  - Job Applications: {app_count} created")
    print(f"  - Employees: {emp_count} created")
    print("\n🔐 Test Credentials:")
    print("  - HR User: hr@hotelgroup.com / hr123456")
    print("  - Manager User: manager@demo.com / manager123")
    print("\n🚀 Ready to test dashboard endpoints!")

if __name__ == "__main__":
    main()