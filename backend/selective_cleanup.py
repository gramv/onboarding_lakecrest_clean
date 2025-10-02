#!/usr/bin/env python3
"""
Selective Database Cleanup - Deletes all data except specified user accounts
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# User accounts to preserve
PRESERVE_USERS = [
    'hr@demo.com',
    'goutamramv@gmail.com'
]

def delete_all_from_table(table_name):
    """Delete ALL records from a table"""
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

def delete_users_except_preserved():
    """Delete all users except the preserved ones"""
    try:
        # Get all users
        all_users = supabase.table('users').select('*').execute()
        
        deleted_count = 0
        preserved_count = 0
        
        for user in all_users.data:
            if user['email'] not in PRESERVE_USERS:
                # Delete this user
                supabase.table('users').delete().eq('id', user['id']).execute()
                print(f"  ✓ Deleted user: {user['email']}")
                deleted_count += 1
            else:
                print(f"  ✅ Preserved user: {user['email']}")
                preserved_count += 1
        
        return deleted_count, preserved_count
    except Exception as e:
        print(f"  ⚠ Error managing users: {e}")
        return 0, 0

def main():
    print("\n" + "="*60)
    print("🧹 SELECTIVE DATABASE CLEANUP")
    print("="*60)
    print("\nThis will delete:")
    print("  • ALL job applications")
    print("  • ALL employee records")
    print("  • ALL onboarding sessions")
    print("  • ALL notifications")
    print("  • ALL audit logs")
    print("  • All users EXCEPT:", ", ".join(PRESERVE_USERS))
    
    response = input("\n⚠️  Type 'CLEAN DATABASE' to proceed: ")
    
    if response != "CLEAN DATABASE":
        print("❌ Cancelled")
        return
    
    print("\n🧹 Starting cleanup...\n")
    
    # Tables to clean completely (no conditions)
    tables_to_clean_fully = [
        'onboarding_sessions',
        'employees', 
        'job_applications',
        'onboarding_tokens',
        'audit_logs',
        'notifications'
    ]
    
    total_deleted = 0
    
    # Clean these tables completely
    for table in tables_to_clean_fully:
        count = delete_all_from_table(table)
        total_deleted += count
    
    # Handle users table specially - preserve specific accounts
    print("\n👤 Managing user accounts...")
    deleted_users, preserved_users = delete_users_except_preserved()
    total_deleted += deleted_users
    
    print(f"\n✅ Total records deleted: {total_deleted}")
    print(f"✅ Users preserved: {preserved_users}")
    
    # Verify final state
    print("\n📊 Final database state:")
    
    # Check users
    try:
        result = supabase.table('users').select('*').execute()
        print(f"\n  Users ({len(result.data)} total):")
        for user in result.data:
            print(f"    • {user['email']} ({user['role']})")
    except Exception as e:
        print(f"  Error checking users: {e}")
    
    # Check other tables
    for table in ['job_applications', 'employees', 'onboarding_sessions']:
        try:
            result = supabase.table(table).select('id').execute()
            count = len(result.data) if result.data else 0
            print(f"  {table}: {count} records")
        except:
            pass
    
    print("\n" + "="*60)
    print("🎉 DATABASE CLEANED!")
    print("="*60)
    print("\n✅ Database is now clean with only preserved accounts")
    print("✅ Ready for fresh testing")
    print("\nPreserved accounts:")
    for email in PRESERVE_USERS:
        print(f"  • {email}")
    print("="*60)

if __name__ == "__main__":
    main()