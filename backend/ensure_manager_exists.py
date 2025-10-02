#!/usr/bin/env python3
"""
Ensure manager@demo.com exists with correct password
"""

import asyncio
import bcrypt
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import uuid

load_dotenv(".env.test")

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def hash_password(password: str) -> str:
    """Hash a password for storing."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def main():
    print("Checking for manager@demo.com...")
    
    # Check if manager exists
    result = supabase.table('users').select('*').eq('email', 'manager@demo.com').execute()
    
    if result.data:
        print("Manager exists, updating password...")
        # Update password
        hashed_password = hash_password("Manager123!")
        supabase.table('users').update({
            'password_hash': hashed_password
        }).eq('email', 'manager@demo.com').execute()
        print("✅ Password updated for manager@demo.com")
    else:
        print("Creating manager@demo.com...")
        # Get test property
        prop_result = supabase.table('properties').select('*').eq('id', 'test-prop-001').execute()
        if not prop_result.data:
            print("Creating test property first...")
            supabase.table('properties').insert({
                'id': 'test-prop-001',
                'name': 'Demo Hotel',
                'address': '123 Demo Street',
                'city': 'Demo City',
                'state': 'CA',
                'zip_code': '90210',
                'phone': '555-0123',
                'email': 'info@demohotel.com'
            }).execute()
        
        # Create manager
        manager_id = str(uuid.uuid4())
        hashed_password = hash_password("Manager123!")
        
        # Insert into users table
        user_data = {
            'id': manager_id,
            'email': 'manager@demo.com',
            'first_name': 'Demo',
            'last_name': 'Manager',
            'role': 'manager',
            'password_hash': hashed_password,
            'property_id': 'test-prop-001'
        }
        
        result = supabase.table('users').insert(user_data).execute()
        
        if result.data:
            # Also add to property_managers
            supabase.table('property_managers').insert({
                'id': str(uuid.uuid4()),
                'property_id': 'test-prop-001',
                'user_id': manager_id
            }).execute()
            
            print("✅ Manager created successfully")
            print(f"   Email: manager@demo.com")
            print(f"   Password: Manager123!")
        else:
            print("❌ Failed to create manager")

if __name__ == "__main__":
    asyncio.run(main())