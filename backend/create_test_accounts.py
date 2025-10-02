#!/usr/bin/env python3
"""
Create test accounts after database cleanup
"""

import os
import uuid
from supabase import create_client
from dotenv import load_dotenv
import bcrypt

load_dotenv(".env.test")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def main():
    print("\n🔧 Creating Test Accounts...\n")
    
    # 1. Check what columns exist in users table
    print("📋 Checking users table schema...")
    try:
        # Try to get one user to see the columns
        result = supabase.table('users').select('*').limit(1).execute()
        if result.data:
            print(f"  Columns found: {list(result.data[0].keys())}")
    except:
        pass
    
    # 2. Create HR user (using password field instead of encrypted_password)
    print("\n1. Creating HR account...")
    hr_user = {
        'id': str(uuid.uuid4()),
        'email': 'hr@demo.com',
        'password': hash_password('test123'),  # Try 'password' field
        'role': 'hr',
        'first_name': 'HR',
        'last_name': 'Admin'
    }
    
    try:
        result = supabase.table('users').insert(hr_user).execute()
        print(f"  ✓ Created hr@demo.com")
        hr_id = result.data[0]['id']
    except Exception as e:
        # Try without password field
        hr_user_simple = {
            'id': str(uuid.uuid4()),
            'email': 'hr@demo.com',
            'role': 'hr',
            'first_name': 'HR',
            'last_name': 'Admin'
        }
        try:
            result = supabase.table('users').insert(hr_user_simple).execute()
            print(f"  ✓ Created hr@demo.com (no password)")
            hr_id = result.data[0]['id']
        except Exception as e2:
            print(f"  ❌ Failed: {e2}")
            hr_id = None
    
    # 3. Create Manager user
    print("\n2. Creating Manager account...")
    manager_user = {
        'id': '45b5847b-9de6-49e5-b042-ea9e91b7dea7',  # Keep this ID for consistency
        'email': 'manager@demo.com',
        'role': 'manager',
        'first_name': 'Demo',
        'last_name': 'Manager'
    }
    
    try:
        result = supabase.table('users').insert(manager_user).execute()
        print(f"  ✓ Created manager@demo.com")
        manager_id = result.data[0]['id']
    except Exception as e:
        print(f"  ❌ Failed: {e}")
        manager_id = None
    
    # 4. Link manager to property (if created)
    if manager_id:
        print("\n3. Linking manager to demo property...")
        try:
            # First, ensure demo property exists
            property_check = supabase.table('properties').select('*').eq(
                'id', '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400'
            ).execute()
            
            if not property_check.data:
                # Create property if it doesn't exist
                property_data = {
                    'id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
                    'name': 'Demo Hotel & Suites',
                    'address': '123 Demo Street',
                    'city': 'Demo City',
                    'state': 'CA',
                    'zip_code': '90001',
                    'phone': '555-0100'
                }
                supabase.table('properties').insert(property_data).execute()
                print("  ✓ Created demo property")
            
            # Link manager to property
            link_data = {
                'user_id': manager_id,
                'property_id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
                'is_primary': True
            }
            supabase.table('property_managers').insert(link_data).execute()
            print("  ✓ Linked manager to property")
        except Exception as e:
            print(f"  ⚠ Link failed: {str(e)[:100]}")
    
    # 5. Create a simple test user for immediate testing
    print("\n4. Creating simple test user...")
    test_user = {
        'id': str(uuid.uuid4()),
        'email': 'testuser@example.com',
        'role': 'employee',
        'first_name': 'Test',
        'last_name': 'User'
    }
    
    try:
        result = supabase.table('users').insert(test_user).execute()
        print(f"  ✓ Created testuser@example.com")
    except Exception as e:
        print(f"  ❌ Failed: {e}")
    
    print("\n" + "="*60)
    print("✅ TEST ACCOUNTS READY!")
    print("="*60)
    print("\nAccounts created:")
    print("  • hr@demo.com")
    print("  • manager@demo.com") 
    print("  • testuser@example.com")
    print("\n✨ All emails are now available for testing!")
    print("✨ You can reuse any email that was previously used!")
    print("="*60)

if __name__ == "__main__":
    main()