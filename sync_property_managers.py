#!/usr/bin/env python3
"""
Migration script to sync property_managers assignments to users.property_id
Fixes the issue where managers are assigned in property_managers but users.property_id is NULL
"""

import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv('backend/.env')

def sync_property_assignments():
    """Sync property_managers table with users.property_id"""
    print("\n" + "="*60)
    print("🔧 PROPERTY ASSIGNMENT SYNC MIGRATION")
    print("="*60)
    print(f"Started: {datetime.now().isoformat()}")
    print("="*60 + "\n")

    # Initialize Supabase
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials in backend/.env")
        return

    supabase = create_client(supabase_url, supabase_key)

    try:
        # Step 1: Get all managers
        print("Step 1: Fetching all managers...")
        managers_result = supabase.table('users').select('*').eq('role', 'manager').execute()
        managers = managers_result.data

        if not managers:
            print("No managers found in the database.")
            return

        print(f"Found {len(managers)} managers\n")

        fixed_count = 0
        already_synced = 0
        no_assignment = 0

        # Step 2: Check each manager
        for manager in managers:
            manager_id = manager['id']
            manager_email = manager['email']
            current_property_id = manager.get('property_id')

            print(f"Checking: {manager_email}")

            # Get property assignments from property_managers
            assignments_result = supabase.table('property_managers').select('property_id').eq('manager_id', manager_id).execute()
            assignments = assignments_result.data

            if not assignments:
                print(f"  ⚠️  No assignments in property_managers")
                no_assignment += 1

                if current_property_id:
                    # Has property_id but no assignment - clear it
                    print(f"  🔧 Clearing orphaned property_id: {current_property_id}")
                    supabase.table('users').update({'property_id': None}).eq('id', manager_id).execute()
                    fixed_count += 1
                continue

            # Manager has assignments
            assigned_property_id = assignments[0]['property_id']

            # Get property name for display
            prop_result = supabase.table('properties').select('name').eq('id', assigned_property_id).execute()
            prop_name = prop_result.data[0]['name'] if prop_result.data else 'Unknown'

            if current_property_id == assigned_property_id:
                print(f"  ✅ Already synced to: {prop_name}")
                already_synced += 1
            else:
                # Need to update
                print(f"  🔧 Updating from {current_property_id or 'NULL'} to {assigned_property_id} ({prop_name})")

                # Update users table
                update_result = supabase.table('users').update({
                    'property_id': assigned_property_id
                }).eq('id', manager_id).execute()

                if update_result.data:
                    print(f"  ✅ Successfully updated")
                    fixed_count += 1
                else:
                    print(f"  ❌ Update failed")

            # Note if multiple assignments exist
            if len(assignments) > 1:
                print(f"  ℹ️  Note: Manager has {len(assignments)} property assignments")

        # Summary
        print("\n" + "="*60)
        print("📊 MIGRATION SUMMARY")
        print("="*60)
        print(f"Total managers processed: {len(managers)}")
        print(f"✅ Already synced: {already_synced}")
        print(f"🔧 Fixed: {fixed_count}")
        print(f"⚠️  No assignments: {no_assignment}")
        print(f"\nCompleted: {datetime.now().isoformat()}")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        print("\nPlease check your database connection and try again.")

if __name__ == "__main__":
    sync_property_assignments()