#!/usr/bin/env python3
"""
Setup HR user for testing Task 3.5 and 3.6
"""

import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import bcrypt

# Load environment variables
load_dotenv('.env.test')

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Error: Missing Supabase credentials in .env.test")
    exit(1)

# Use the anon key from .env.test
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def hash_password(password: str) -> str:
    """Hash a password using bcrypt with salt rounds 12"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def setup_hr_user():
    """Create or update HR user"""
    print("\n" + "="*50)
    print("Setting up HR User for Testing")
    print("="*50)
    
    try:
        # Check if HR user exists
        result = supabase.table('users').select('*').eq('email', 'hr@demo.com').execute()
        
        if result.data:
            # Update existing user
            print("HR user exists. Updating password...")
            hashed_password = hash_password('Test1234!')
            
            update_result = supabase.table('users').update({
                'password_hash': hashed_password,
                'role': 'hr',
                'first_name': 'HR',
                'last_name': 'Administrator',
                'is_active': True
            }).eq('email', 'hr@demo.com').execute()
            
            if update_result.data:
                print("✅ HR user password updated successfully")
                print(f"   Email: hr@demo.com")
                print(f"   Password: Test1234!")
                print(f"   Role: hr")
            else:
                print("❌ Failed to update HR user")
        else:
            # Create new HR user
            print("Creating new HR user...")
            hashed_password = hash_password('Test1234!')
            
            new_user = {
                'email': 'hr@demo.com',
                'password_hash': hashed_password,
                'role': 'hr',
                'first_name': 'HR',
                'last_name': 'Administrator',
                'is_active': True
            }
            
            insert_result = supabase.table('users').insert(new_user).execute()
            
            if insert_result.data:
                print("✅ HR user created successfully")
                print(f"   Email: hr@demo.com")
                print(f"   Password: Test1234!")
                print(f"   Role: hr")
            else:
                print("❌ Failed to create HR user")
        
        # Verify HR user can be queried
        verify_result = supabase.table('users').select('*').eq('email', 'hr@demo.com').execute()
        if verify_result.data:
            user = verify_result.data[0]
            print(f"\n✅ HR user verified in database:")
            print(f"   ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Name: {user.get('first_name')} {user.get('last_name')}")
            print(f"   Active: {user.get('is_active')}")
        
    except Exception as e:
        print(f"❌ Error setting up HR user: {str(e)}")
        import traceback
        traceback.print_exc()

async def main():
    await setup_hr_user()

if __name__ == "__main__":
    asyncio.run(main())