#!/usr/bin/env python3
"""
Setup test accounts for HR and Manager testing
Creates accounts with proper roles and passwords
"""

import os
import uuid
import bcrypt
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.test")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def setup_accounts():
    """Setup test accounts for testing"""
    print("\n🔧 Setting up test accounts for HR/Manager testing...\n")
    
    # 1. Create Demo Property
    print("1. Creating demo property...")
    property_data = {
        'id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
        'name': 'Demo Hotel & Suites',
        'address': '123 Demo Street',
        'city': 'Demo City',
        'state': 'CA',
        'zip_code': '90001',
        'phone': '555-0100'
    }
    
    try:
        # Check if property exists
        existing = supabase.table('properties').select('*').eq('id', property_data['id']).execute()
        if not existing.data:
            supabase.table('properties').insert(property_data).execute()
            print("  ✓ Created demo property")
        else:
            print("  ✓ Demo property already exists")
    except Exception as e:
        print(f"  ⚠ Property error: {e}")
    
    # 2. Create HR Account with proper password hash
    print("\n2. Creating HR account...")
    hr_id = str(uuid.uuid4())
    hr_data = {
        'id': hr_id,
        'email': 'hr@demo.com',
        'password_hash': hash_password('test123'),  # Hash the password
        'role': 'hr',
        'first_name': 'HR',
        'last_name': 'Admin',
        'is_active': True
    }
    
    try:
        # Delete existing HR account if exists
        supabase.table('users').delete().eq('email', 'hr@demo.com').execute()
        
        # Create new HR account
        result = supabase.table('users').insert(hr_data).execute()
        if result.data:
            print(f"  ✓ Created HR account: hr@demo.com")
            print(f"    ID: {hr_id}")
            print(f"    Password: test123")
    except Exception as e:
        print(f"  ❌ HR account error: {e}")
    
    # 3. Create Manager Account
    print("\n3. Creating Manager account...")
    manager_id = '45b5847b-9de6-49e5-b042-ea9e91b7dea7'
    manager_data = {
        'id': manager_id,
        'email': 'manager@demo.com',
        'password_hash': hash_password('test123'),  # Hash the password
        'role': 'manager',
        'first_name': 'Demo',
        'last_name': 'Manager',
        'is_active': True
    }
    
    try:
        # Delete existing manager account if exists
        supabase.table('users').delete().eq('email', 'manager@demo.com').execute()
        
        # Create new manager account
        result = supabase.table('users').insert(manager_data).execute()
        if result.data:
            print(f"  ✓ Created Manager account: manager@demo.com")
            print(f"    ID: {manager_id}")
            print(f"    Password: test123")
    except Exception as e:
        print(f"  ❌ Manager account error: {e}")
    
    # 4. Link Manager to Property
    print("\n4. Linking manager to property...")
    try:
        # Delete existing link if exists
        supabase.table('property_managers').delete().eq('user_id', manager_id).execute()
        
        # Create new link
        link_data = {
            'user_id': manager_id,
            'property_id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400'
        }
        supabase.table('property_managers').insert(link_data).execute()
        print("  ✓ Linked manager to demo property")
    except Exception as e:
        print(f"  ⚠ Link error: {e}")
    
    print("\n" + "="*60)
    print("✅ TEST ACCOUNTS READY!")
    print("="*60)
    print("\nAccounts created:")
    print("  • HR: hr@demo.com / test123")
    print("  • Manager: manager@demo.com / test123")
    print("\nProperty:")
    print("  • Demo Hotel & Suites (ID: 9e5d1d9b-0caf-44f0-99dd-8e71b88c1400)")
    print("="*60)

if __name__ == "__main__":
    setup_accounts()
