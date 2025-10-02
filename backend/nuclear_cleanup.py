#!/usr/bin/env python3
"""
Nuclear Test Database Cleanup - Deletes EVERYTHING for fresh testing
WARNING: This WILL delete all data! Only for test databases!
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load test environment
load_dotenv(".env.test")

# This is TEST database - user confirmed
print("⚠️  NUCLEAR CLEANUP - TEST DATABASE ONLY!")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def delete_all_from_table(table_name):
    """Delete ALL records from a table using proper UUID comparison"""
    try:
        # For UUID primary keys, use greater than comparison with minimum UUID
        result = supabase.table(table_name).delete().gt('id', '00000000-0000-0000-0000-000000000000').execute()
        count = len(result.data) if result.data else 0
        print(f"  ✓ Deleted {count} records from {table_name}")
        return count
    except Exception as e:
        # Try without ID condition for tables without UUID primary key
        try:
            result = supabase.table(table_name).delete().neq('created_at', '1900-01-01').execute()
            count = len(result.data) if result.data else 0
            print(f"  ✓ Deleted {count} records from {table_name}")
            return count
        except:
            print(f"  ⚠ Could not delete from {table_name}: {str(e)[:100]}")
            return 0

def main():
    print("\n" + "="*60)
    print("🔥 NUCLEAR DATABASE CLEANUP - DELETES EVERYTHING!")
    print("="*60)
    
    response = input("\n⚠️  Type 'NUKE TEST DATABASE' to delete ALL data: ")
    
    if response != "NUKE TEST DATABASE":
        print("❌ Cancelled")
        return
    
    print("\n🧹 Starting nuclear cleanup...\n")
    
    # Tables that definitely exist based on the output
    tables_to_clean = [
        # Clean in reverse dependency order
        'onboarding_sessions',
        'employees', 
        'job_applications',
        'property_managers',
        'users',
        'properties',
        'onboarding_tokens',
        'audit_logs',
        'notifications'
    ]
    
    total_deleted = 0
    
    for table in tables_to_clean:
        count = delete_all_from_table(table)
        total_deleted += count
    
    print(f"\n✅ Total records deleted: {total_deleted}")
    
    # Recreate minimal test data
    print("\n🔧 Creating minimal test setup...")
    
    try:
        # 1. Create demo property
        property_data = {
            'id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
            'name': 'Demo Hotel & Suites',
            'address': '123 Demo Street',
            'city': 'Demo City',
            'state': 'CA',
            'zip_code': '90001',
            'phone': '555-0100',
            'created_at': '2024-01-01T00:00:00Z'
        }
        supabase.table('properties').upsert(property_data).execute()
        print("  ✓ Created demo property")
        
        # 2. Create test users
        users = [
            {
                'id': '15f9b8c3-d2e4-4a5b-8c7d-9e8f7a6b5c4d',
                'email': 'hr@demo.com',
                'encrypted_password': '$2b$12$KIXxPfHTis6RXGPp5P7eUOvJQj7NJ7kAaVPxGZRcWFOptgDcP/Fxm',  # test123
                'role': 'hr',
                'first_name': 'HR',
                'last_name': 'Admin',
                'created_at': '2024-01-01T00:00:00Z'
            },
            {
                'id': '45b5847b-9de6-49e5-b042-ea9e91b7dea7',
                'email': 'manager@demo.com',
                'encrypted_password': '$2b$12$KIXxPfHTis6RXGPp5P7eUOvJQj7NJ7kAaVPxGZRcWFOptgDcP/Fxm',  # test123
                'role': 'manager',
                'first_name': 'Demo',
                'last_name': 'Manager',
                'created_at': '2024-01-01T00:00:00Z'
            }
        ]
        
        for user in users:
            supabase.table('users').upsert(user).execute()
            print(f"  ✓ Created {user['email']}")
        
        # 3. Link manager to property
        link_data = {
            'user_id': '45b5847b-9de6-49e5-b042-ea9e91b7dea7',
            'property_id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
            'is_primary': True,
            'created_at': '2024-01-01T00:00:00Z'
        }
        supabase.table('property_managers').upsert(link_data).execute()
        print("  ✓ Linked manager to property")
        
    except Exception as e:
        print(f"  ⚠ Setup error: {e}")
    
    # Verify final state
    print("\n📊 Final database state:")
    for table in ['users', 'job_applications', 'employees']:
        try:
            result = supabase.table(table).select('*').execute()
            count = len(result.data) if result.data else 0
            if table == 'users' and result.data:
                emails = [u.get('email', 'unknown') for u in result.data]
                print(f"  • {table}: {count} records ({', '.join(emails)})")
            else:
                print(f"  • {table}: {count} records")
        except:
            pass
    
    print("\n" + "="*60)
    print("🎉 DATABASE CLEANED!")
    print("="*60)
    print("\n✅ All emails are now available for testing!")
    print("✅ Run generate_correct_token.py to create a new test token")
    print("✅ Cloud sync will work with the clean database")
    print("\nTest accounts:")
    print("  • hr@demo.com / test123")
    print("  • manager@demo.com / test123")
    print("="*60)

if __name__ == "__main__":
    main()