#!/usr/bin/env python3
"""Create test users for dashboard endpoint testing"""

import os
from supabase import create_client, Client
import bcrypt

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
        else:
            # Create new user
            result = supabase.table('users').insert({
                'email': email,
                'password_hash': hash_password(password),
                'role': role,
                'is_active': True,
                'created_at': 'now()'
            }).execute()
        
        if result.data:
            user_id = result.data[0]['id']
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

def create_test_property():
    """Create or get test property"""
    try:
        # Check if test property exists
        existing = supabase.table('properties').select('*').eq('name', 'Test Hotel').execute()
        if existing.data:
            return existing.data[0]['id']
        
        # Create test property
        result = supabase.table('properties').insert({
            'name': 'Test Hotel',
            'address': '123 Test Street, Test City, TC 12345',
            'contact_phone': '555-0100',
            'manager_email': 'manager@demo.com'
        }).execute()
        
        if result.data:
            print(f"✅ Created test property: Test Hotel")
            return result.data[0]['id']
    except Exception as e:
        print(f"❌ Error creating property: {e}")
        return None

def create_test_data(property_id: str):
    """Create some test applications and employees"""
    try:
        # Create test job applications
        applications = [
            {'name': 'John Doe', 'email': 'john@example.com', 'status': 'pending', 'property_id': property_id},
            {'name': 'Jane Smith', 'email': 'jane@example.com', 'status': 'pending', 'property_id': property_id},
            {'name': 'Bob Johnson', 'email': 'bob@example.com', 'status': 'approved', 'property_id': property_id},
        ]
        
        for app in applications:
            existing = supabase.table('job_applications').select('*').eq('email', app['email']).execute()
            if not existing.data:
                supabase.table('job_applications').insert(app).execute()
                print(f"  - Created application for {app['name']}")
        
        # Create test employees
        employees = [
            {'first_name': 'Alice', 'last_name': 'Brown', 'email': 'alice@example.com', 
             'property_id': property_id, 'employment_status': 'active', 'onboarding_status': 'completed'},
            {'first_name': 'Charlie', 'last_name': 'Davis', 'email': 'charlie@example.com', 
             'property_id': property_id, 'employment_status': 'active', 'onboarding_status': 'in_progress'},
        ]
        
        for emp in employees:
            existing = supabase.table('employees').select('*').eq('email', emp['email']).execute()
            if not existing.data:
                supabase.table('employees').insert(emp).execute()
                print(f"  - Created employee {emp['first_name']} {emp['last_name']}")
                
    except Exception as e:
        print(f"❌ Error creating test data: {e}")

def main():
    print("=" * 60)
    print("Creating Test Users for Dashboard Testing")
    print("=" * 60)
    
    # Create test property
    property_id = create_test_property()
    
    if property_id:
        # Create HR user
        create_user('hr@hotelgroup.com', 'hr123456', 'hr')
        
        # Create Manager user
        create_user('manager@demo.com', 'manager123', 'manager', property_id)
        
        # Create test data
        print("\nCreating test data...")
        create_test_data(property_id)
    
    print("\n" + "=" * 60)
    print("Test users created successfully!")
    print("=" * 60)
    print("\nCredentials:")
    print("  HR User: hr@hotelgroup.com / hr123456")
    print("  Manager User: manager@demo.com / manager123")

if __name__ == "__main__":
    main()