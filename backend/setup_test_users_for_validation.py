#!/usr/bin/env python3
"""
Setup test users for data isolation validation
Creates manager and HR users with known credentials
"""

import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import bcrypt

# Load environment variables
load_dotenv(".env.test")

# Initialize Supabase client
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_ANON_KEY')  # Use anon key for test setup

if not url or not key:
    print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env")
    exit(1)

supabase: Client = create_client(url, key)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def create_test_users():
    """Create test users for validation"""
    
    print("🔧 Setting up test users for data isolation validation...")
    
    # Test users to create
    test_users = [
        {
            "email": "manager@demo.com",
            "password": "password123",
            "role": "manager",
            "property_id": "test-prop-001"
        },
        {
            "email": "hr@example.com", 
            "password": "password123",
            "role": "hr",
            "property_id": None  # HR users don't need property assignment
        }
    ]
    
    for user_data in test_users:
        try:
            # Check if user exists
            result = supabase.table('users').select('*').eq('email', user_data['email']).execute()
            
            if result.data:
                # Update existing user
                update_data = {
                    'password_hash': hash_password(user_data['password']),
                    'role': user_data['role'],
                    'is_active': True
                }
                
                supabase.table('users').update(update_data).eq('email', user_data['email']).execute()
                print(f"✅ Updated existing {user_data['role']} user: {user_data['email']}")
                
                # Update property assignment for manager
                if user_data['role'] == 'manager' and user_data['property_id']:
                    # Check property_managers table
                    pm_result = supabase.table('property_managers').select('*').eq('manager_id', result.data[0]['id']).execute()
                    
                    if pm_result.data:
                        # Update existing assignment
                        supabase.table('property_managers').update({
                            'property_id': user_data['property_id']
                        }).eq('manager_id', result.data[0]['id']).execute()
                    else:
                        # Create new assignment
                        supabase.table('property_managers').insert({
                            'manager_id': result.data[0]['id'],
                            'property_id': user_data['property_id']
                        }).execute()
                    
                    print(f"   Assigned to property: {user_data['property_id']}")
                    
            else:
                # Create new user
                new_user = {
                    'email': user_data['email'],
                    'password_hash': hash_password(user_data['password']),
                    'role': user_data['role'],
                    'first_name': 'Test',
                    'last_name': 'User',
                    'is_active': True
                }
                
                user_result = supabase.table('users').insert(new_user).execute()
                print(f"✅ Created new {user_data['role']} user: {user_data['email']}")
                
                # Assign property for manager
                if user_data['role'] == 'manager' and user_data['property_id'] and user_result.data:
                    supabase.table('property_managers').insert({
                        'manager_id': user_result.data[0]['id'],
                        'property_id': user_data['property_id']
                    }).execute()
                    print(f"   Assigned to property: {user_data['property_id']}")
                    
        except Exception as e:
            print(f"❌ Error setting up {user_data['email']}: {e}")
    
    # Note: Properties should be created with UUIDs, not string IDs
    # For testing, we'll use existing properties or create with proper UUIDs
    
    print("\n✅ Test users setup complete!")
    print("\nTest Credentials:")
    print("  Manager: manager@demo.com / password123")
    print("  HR User: hr@example.com / password123")

if __name__ == "__main__":
    asyncio.run(create_test_users())