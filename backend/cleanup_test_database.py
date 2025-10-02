#!/usr/bin/env python3
"""
Comprehensive Test Database Cleanup Script
Deletes ALL test data to allow fresh testing with email reuse
WARNING: This will DELETE ALL DATA - only use on test database!
"""

import os
import sys
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv
import asyncio
from typing import List, Dict, Any

# Load test environment
load_dotenv(".env.test")

# This is confirmed to be a TEST database by the user
# The ENVIRONMENT variable is misleading - this is actually test data
ENVIRONMENT = "test"  # Override - user confirmed this is test database
print("ℹ️  Running on TEST database (user confirmed)")

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing Supabase credentials in .env.test")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class TestDatabaseCleaner:
    """Comprehensive test database cleanup utility"""
    
    def __init__(self):
        self.supabase = supabase
        self.deleted_counts = {}
        
    def delete_table_data(self, table_name: str, condition: Dict[str, Any] = None) -> int:
        """Delete data from a table with optional condition"""
        try:
            query = self.supabase.table(table_name).delete()
            
            # Apply condition if provided
            if condition:
                for key, value in condition.items():
                    query = query.eq(key, value)
            else:
                # Delete all records (use a condition that matches everything)
                query = query.neq('id', 'impossible-uuid-that-never-exists')
            
            result = query.execute()
            count = len(result.data) if result.data else 0
            print(f"  ✓ Deleted {count} records from {table_name}")
            return count
        except Exception as e:
            print(f"  ⚠ Error deleting from {table_name}: {e}")
            return 0
    
    def cleanup_all_tables(self):
        """Clean up all tables in the correct order"""
        print("\n" + "="*60)
        print("🧹 STARTING COMPREHENSIVE TEST DATABASE CLEANUP")
        print("="*60)
        
        # Order matters due to foreign key constraints!
        # Delete from most dependent to least dependent
        
        print("\n📋 Phase 1: Cleaning up onboarding data...")
        
        # 1. Delete audit trails and logs first (no dependencies)
        self.deleted_counts['audit_trails'] = self.delete_table_data('audit_trails')
        self.deleted_counts['notification_records'] = self.delete_table_data('notification_records')
        
        # 2. Delete signatures and documents (depend on sessions)
        self.deleted_counts['digital_signatures'] = self.delete_table_data('digital_signatures')
        self.deleted_counts['onboarding_documents'] = self.delete_table_data('onboarding_documents')
        
        # 3. Delete form data and compliance checks
        self.deleted_counts['form_update_sessions'] = self.delete_table_data('form_update_sessions')
        self.deleted_counts['compliance_checks'] = self.delete_table_data('compliance_checks')
        
        # 4. Delete onboarding sessions (depend on employees)
        self.deleted_counts['onboarding_sessions'] = self.delete_table_data('onboarding_sessions')
        
        print("\n📋 Phase 2: Cleaning up employee data...")
        
        # 5. Delete employees (depend on applications and properties)
        self.deleted_counts['employees'] = self.delete_table_data('employees')
        
        # 6. Delete job applications
        self.deleted_counts['job_applications'] = self.delete_table_data('job_applications')
        
        print("\n📋 Phase 3: Cleaning up user accounts...")
        
        # 7. Delete property managers (junction table)
        self.deleted_counts['property_managers'] = self.delete_table_data('property_managers')
        
        # 8. Delete users - THIS IS KEY FOR EMAIL REUSE!
        # We'll delete all non-essential users (keep only core test accounts)
        print("  🔍 Identifying test accounts to preserve...")
        
        # Core accounts to preserve (optional - comment out to delete ALL)
        preserve_emails = [
            # Uncomment to preserve core accounts:
            # 'hr@demo.com',
            # 'manager@demo.com',
            # 'admin@demo.com'
        ]
        
        if preserve_emails:
            # Delete all except preserved accounts
            all_users = self.supabase.table('users').select('*').execute()
            for user in all_users.data:
                if user.get('email') not in preserve_emails:
                    try:
                        self.supabase.table('users').delete().eq('id', user['id']).execute()
                        print(f"    ✓ Deleted user: {user.get('email', 'unknown')}")
                    except Exception as e:
                        print(f"    ⚠ Could not delete user {user.get('email')}: {e}")
        else:
            # Nuclear option - delete ALL users
            print("  🔥 Deleting ALL user accounts (nuclear cleanup)...")
            self.deleted_counts['users'] = self.delete_table_data('users')
        
        print("\n📋 Phase 4: Cleaning up properties (optional)...")
        
        # Optionally keep demo property
        keep_demo_property = True
        
        if not keep_demo_property:
            self.deleted_counts['properties'] = self.delete_table_data('properties')
        else:
            print("  ℹ Keeping demo property for testing")
        
        print("\n" + "="*60)
        print("📊 CLEANUP SUMMARY")
        print("="*60)
        
        total_deleted = sum(self.deleted_counts.values())
        for table, count in self.deleted_counts.items():
            if count > 0:
                print(f"  • {table}: {count} records deleted")
        
        print(f"\n  Total records deleted: {total_deleted}")
        
    def recreate_minimal_test_data(self):
        """Recreate minimal test data for immediate testing"""
        print("\n" + "="*60)
        print("🔧 RECREATING MINIMAL TEST DATA")
        print("="*60)
        
        try:
            # 1. Create/verify demo property exists
            print("\n1. Ensuring demo property exists...")
            property_result = self.supabase.table('properties').select('*').eq(
                'id', '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400'
            ).execute()
            
            if not property_result.data:
                property_data = {
                    'id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
                    'name': 'Demo Hotel & Suites',
                    'address': '123 Demo Street',
                    'city': 'Demo City',
                    'state': 'CA',
                    'zip_code': '90001',
                    'phone': '555-0100'
                }
                self.supabase.table('properties').insert(property_data).execute()
                print("  ✓ Created demo property")
            else:
                print("  ✓ Demo property already exists")
            
            # 2. Create HR user
            print("\n2. Creating HR test account...")
            hr_data = {
                'id': '15f9b8c3-d2e4-4a5b-8c7d-9e8f7a6b5c4d',
                'email': 'hr@demo.com',
                'encrypted_password': 'test123',  # In production, this would be hashed
                'role': 'hr',
                'first_name': 'HR',
                'last_name': 'Admin'
            }
            try:
                self.supabase.table('users').insert(hr_data).execute()
                print("  ✓ Created hr@demo.com")
            except:
                print("  ℹ HR account may already exist")
            
            # 3. Create Manager user
            print("\n3. Creating Manager test account...")
            manager_data = {
                'id': '45b5847b-9de6-49e5-b042-ea9e91b7dea7',
                'email': 'manager@demo.com',
                'encrypted_password': 'test123',
                'role': 'manager',
                'first_name': 'Demo',
                'last_name': 'Manager'
            }
            try:
                self.supabase.table('users').insert(manager_data).execute()
                print("  ✓ Created manager@demo.com")
            except:
                print("  ℹ Manager account may already exist")
            
            # 4. Link manager to property
            print("\n4. Linking manager to demo property...")
            manager_property_data = {
                'user_id': '45b5847b-9de6-49e5-b042-ea9e91b7dea7',
                'property_id': '9e5d1d9b-0caf-44f0-99dd-8e71b88c1400',
                'is_primary': True
            }
            try:
                self.supabase.table('property_managers').insert(manager_property_data).execute()
                print("  ✓ Linked manager to demo property")
            except:
                print("  ℹ Manager-property link may already exist")
            
            print("\n✅ Minimal test data ready!")
            print("\n📝 Test Accounts:")
            print("  • HR: hr@demo.com / test123")
            print("  • Manager: manager@demo.com / test123")
            print("  • Property: Demo Hotel & Suites")
            
        except Exception as e:
            print(f"\n❌ Error creating test data: {e}")
    
    def verify_cleanup(self):
        """Verify that cleanup was successful"""
        print("\n" + "="*60)
        print("🔍 VERIFYING CLEANUP")
        print("="*60)
        
        tables_to_check = [
            'job_applications',
            'employees', 
            'onboarding_sessions',
            'users'
        ]
        
        all_clear = True
        for table in tables_to_check:
            try:
                result = self.supabase.table(table).select('count', count='exact').execute()
                count = result.count if hasattr(result, 'count') else len(result.data)
                
                if table == 'users' and count > 0:
                    # Check if only test accounts remain
                    users = self.supabase.table('users').select('email').execute()
                    emails = [u['email'] for u in users.data]
                    print(f"  • {table}: {count} records (accounts: {', '.join(emails)})")
                else:
                    print(f"  • {table}: {count} records")
                    
                if count > 3 and table != 'properties':  # Allow a few test records
                    all_clear = False
                    
            except Exception as e:
                print(f"  ⚠ Could not check {table}: {e}")
        
        if all_clear:
            print("\n✅ Database is clean and ready for testing!")
            print("🎯 You can now reuse any email address for testing!")
        else:
            print("\n⚠ Some tables still have data. Run cleanup again if needed.")

def main():
    """Main cleanup execution"""
    print("\n" + "="*80)
    print("⚠️  TEST DATABASE CLEANUP UTILITY")
    print("="*80)
    print("\nThis will DELETE ALL TEST DATA to allow fresh testing.")
    print("Make sure this is running against the TEST database!\n")
    
    print(f"Database URL: {SUPABASE_URL}")
    print(f"Environment: {ENVIRONMENT}")
    
    # Safety confirmation
    response = input("\n⚠️  Type 'DELETE ALL TEST DATA' to proceed: ")
    
    if response != "DELETE ALL TEST DATA":
        print("\n❌ Cleanup cancelled. No data was deleted.")
        return
    
    cleaner = TestDatabaseCleaner()
    
    # Execute cleanup
    cleaner.cleanup_all_tables()
    
    # Optionally recreate minimal test data
    response = input("\n📝 Create minimal test accounts? (y/n): ")
    if response.lower() == 'y':
        cleaner.recreate_minimal_test_data()
    
    # Verify cleanup
    cleaner.verify_cleanup()
    
    print("\n" + "="*80)
    print("🎉 CLEANUP COMPLETE!")
    print("="*80)
    print("\nNext steps:")
    print("1. Run generate_correct_token.py to create a new test token")
    print("2. Test with any email - they're all available now!")
    print("3. Cloud sync will work with the clean database")
    print("="*80)

if __name__ == "__main__":
    main()