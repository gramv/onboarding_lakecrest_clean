#!/usr/bin/env python3
"""
Comprehensive diagnostic tool for property assignment issues
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv('backend/.env')

class PropertyDiagnostic:
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_ANON_KEY')

        if not self.supabase_url or not self.supabase_key:
            raise Exception("Missing Supabase credentials in .env")

        self.supabase = create_client(self.supabase_url, self.supabase_key)
        self.issues = []
        self.fixes_applied = []

    def run_diagnostics(self, email="gvemula@mail.yu.edu"):
        """Run comprehensive diagnostics for a user"""
        print("\n" + "="*60)
        print("🔍 PROPERTY ASSIGNMENT DIAGNOSTIC TOOL")
        print("="*60)
        print(f"Target User: {email}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("="*60 + "\n")

        # Step 1: Check user exists
        user = self.check_user(email)
        if not user:
            return

        # Step 2: Check property_managers table structure
        self.check_property_managers_structure()

        # Step 3: Check property assignments
        self.check_property_assignments(user)

        # Step 4: Check cache issues
        self.check_cache_issues()

        # Step 5: Apply fixes
        if self.issues:
            self.apply_fixes(user)

        # Step 6: Verify fix
        self.verify_fix(email)

        # Summary
        self.print_summary()

    def check_user(self, email):
        """Check if user exists and get their data"""
        print("📋 Step 1: Checking user data...")

        result = self.supabase.table('users').select('*').eq('email', email).execute()

        if not result.data:
            print(f"❌ User {email} not found in database!")
            self.issues.append("User not found")
            return None

        user = result.data[0]
        print(f"✅ User found:")
        print(f"   ID: {user['id']}")
        print(f"   Email: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   First Name: {user.get('first_name', 'N/A')}")
        print(f"   Last Name: {user.get('last_name', 'N/A')}")
        print(f"   Property ID: {user.get('property_id', 'NULL')} {'⚠️ ' if not user.get('property_id') else ''}")
        print(f"   Active: {user.get('is_active', False)}")

        if not user.get('property_id'):
            self.issues.append("User has no property_id in users table")

        return user

    def check_property_managers_structure(self):
        """Check the structure of property_managers table"""
        print("\n📋 Step 2: Checking property_managers table structure...")

        try:
            # Try to query with different column names
            test_queries = [
                ("user_id", self.supabase.table('property_managers').select('*').limit(1)),
                ("manager_id", self.supabase.table('property_managers').select('*').limit(1))
            ]

            for column_name, query in test_queries:
                try:
                    result = query.execute()
                    if result.data:
                        print(f"✅ Table uses column: {column_name}")
                        print(f"   Sample data: {json.dumps(result.data[0], indent=2)}")
                        return column_name
                except:
                    continue

            print("⚠️  Could not determine property_managers table structure")
            self.issues.append("Unknown property_managers table structure")

        except Exception as e:
            print(f"❌ Error checking table structure: {e}")
            self.issues.append(f"Table structure error: {str(e)}")

        return "user_id"  # Default assumption

    def check_property_assignments(self, user):
        """Check property assignments in property_managers table"""
        print("\n📋 Step 3: Checking property assignments...")

        # Try both column names
        for column_name in ['user_id', 'manager_id']:
            try:
                result = self.supabase.table('property_managers').select('*').eq(column_name, user['id']).execute()

                if result.data:
                    print(f"✅ Found {len(result.data)} assignment(s) using column '{column_name}':")

                    for assignment in result.data:
                        prop_id = assignment.get('property_id')
                        # Get property name
                        prop_result = self.supabase.table('properties').select('name').eq('id', prop_id).execute()
                        prop_name = prop_result.data[0]['name'] if prop_result.data else 'Unknown'

                        print(f"   - Property: {prop_id} ({prop_name})")

                    # Check for inconsistency
                    if not user.get('property_id') and result.data:
                        self.issues.append(f"User has assignments in property_managers but no property_id in users table")
                        self.fixes_applied.append(f"Will set property_id to {result.data[0]['property_id']}")

                    return result.data

            except Exception as e:
                continue

        print("❌ No property assignments found")
        self.issues.append("No property assignments in property_managers table")
        return []

    def check_cache_issues(self):
        """Check for common cache issues"""
        print("\n📋 Step 4: Checking for cache issues...")

        print("⚠️  Frontend localStorage might contain stale data")
        print("   Solution: Clear browser cache and re-login")

        print("\n   To clear cache manually:")
        print("   1. Open browser DevTools (F12)")
        print("   2. Go to Application/Storage tab")
        print("   3. Clear Local Storage")
        print("   4. Run in console: localStorage.clear()")

        self.issues.append("Potential localStorage cache issue")

    def apply_fixes(self, user):
        """Apply fixes for identified issues"""
        print("\n🔧 Step 5: Applying fixes...")

        if "User has assignments in property_managers but no property_id in users table" in self.issues:
            # Get the first property assignment
            for column_name in ['user_id', 'manager_id']:
                try:
                    result = self.supabase.table('property_managers').select('property_id').eq(column_name, user['id']).execute()
                    if result.data:
                        property_id = result.data[0]['property_id']

                        print(f"🔧 Fixing: Setting property_id to {property_id}")

                        # Update users table
                        update_result = self.supabase.table('users').update({
                            'property_id': property_id
                        }).eq('id', user['id']).execute()

                        if update_result.data:
                            print(f"✅ Successfully updated property_id")
                            self.fixes_applied.append(f"Updated users.property_id to {property_id}")
                        else:
                            print(f"❌ Failed to update property_id")

                        break
                except:
                    continue

    def verify_fix(self, email):
        """Verify that fixes were applied successfully"""
        print("\n📋 Step 6: Verifying fix...")

        result = self.supabase.table('users').select('property_id').eq('email', email).execute()

        if result.data and result.data[0].get('property_id'):
            print(f"✅ Verification successful: property_id is now {result.data[0]['property_id']}")
        else:
            print(f"❌ Verification failed: property_id is still NULL")

    def print_summary(self):
        """Print diagnostic summary"""
        print("\n" + "="*60)
        print("📊 DIAGNOSTIC SUMMARY")
        print("="*60)

        if self.issues:
            print("\n🔴 Issues Found:")
            for issue in self.issues:
                print(f"   - {issue}")
        else:
            print("\n✅ No issues found!")

        if self.fixes_applied:
            print("\n🔧 Fixes Applied:")
            for fix in self.fixes_applied:
                print(f"   - {fix}")

        print("\n🎯 Next Steps:")
        print("   1. Clear browser localStorage")
        print("   2. Logout from the application")
        print("   3. Login again with your credentials")
        print("   4. The property should now be assigned correctly")

        print("\n" + "="*60)

def main():
    """Run the diagnostic tool"""
    import sys

    email = sys.argv[1] if len(sys.argv) > 1 else "gvemula@mail.yu.edu"

    try:
        diagnostic = PropertyDiagnostic()
        diagnostic.run_diagnostics(email)
    except Exception as e:
        print(f"\n❌ Fatal Error: {e}")
        print("\nPlease ensure:")
        print("   1. backend/.env file exists with Supabase credentials")
        print("   2. You have network connectivity")
        print("   3. Supabase service is running")

if __name__ == "__main__":
    main()