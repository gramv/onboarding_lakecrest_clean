#!/usr/bin/env python3
"""
Fix Manager Property Assignment Script
This script repairs the property_managers relationship for existing managers
who have a property_id but no entry in the property_managers table.
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv('.env.test')

def fix_manager_property_assignments():
    """Fix property assignments for managers missing the relationship record"""
    
    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables")
        sys.exit(1)
    
    # Create Supabase client
    client = create_client(supabase_url, supabase_key)
    
    print("🔧 Fixing Manager Property Assignments")
    print("=" * 60)
    
    try:
        # Step 1: Get all managers with property_id but check if they have relationship
        print("\n1️⃣ Finding managers with property_id...")
        managers_result = client.table('users').select('*').eq('role', 'manager').execute()
        
        if not managers_result.data:
            print("No managers found in the system")
            return
        
        managers = managers_result.data
        print(f"   Found {len(managers)} manager(s)")
        
        # Step 2: Check each manager's property assignment
        fixes_needed = []
        for manager in managers:
            manager_id = manager['id']
            property_id = manager.get('property_id')
            
            if property_id:
                # Check if relationship exists in property_managers table
                relationship_result = client.table('property_managers').select('*').eq('manager_id', manager_id).eq('property_id', property_id).execute()
                
                if not relationship_result.data:
                    fixes_needed.append({
                        'manager_id': manager_id,
                        'email': manager['email'],
                        'property_id': property_id,
                        'needs_relationship': True
                    })
                    print(f"   ⚠️ Manager {manager['email']} needs property relationship fix")
        
        if not fixes_needed:
            print("\n✅ All managers have proper property assignments!")
            return
        
        print(f"\n2️⃣ Found {len(fixes_needed)} manager(s) needing fixes")
        
        # Step 3: Apply fixes
        success_count = 0
        error_count = 0
        
        for fix in fixes_needed:
            print(f"\n   Fixing manager: {fix['email']}")
            
            try:
                # Create property_managers relationship if needed
                if fix['needs_relationship']:
                    relationship_data = {
                        "manager_id": fix['manager_id'],
                        "property_id": fix['property_id'],
                        "assigned_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    relationship_result = client.table('property_managers').insert(relationship_data).execute()
                    
                    if relationship_result.data:
                        print(f"      ✅ Created property_managers relationship")
                    else:
                        print(f"      ❌ Failed to create relationship")
                        error_count += 1
                        continue
                
                
                success_count += 1
                print(f"      ✅ Successfully fixed property assignment")
                
            except Exception as e:
                print(f"      ❌ Error: {str(e)}")
                error_count += 1
        
        # Step 4: Verify fixes
        print("\n3️⃣ Verifying fixes...")
        for fix in fixes_needed:
            if fix['needs_relationship']:
                verify_result = client.table('property_managers').select('*').eq('manager_id', fix['manager_id']).eq('property_id', fix['property_id']).execute()
                
                if verify_result.data:
                    print(f"   ✅ Verified: {fix['email']} has correct property relationship")
                else:
                    print(f"   ❌ Warning: {fix['email']} still missing property relationship")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Summary:")
        print(f"   Total managers checked: {len(managers)}")
        print(f"   Fixes attempted: {len(fixes_needed)}")
        print(f"   Successful fixes: {success_count}")
        if error_count > 0:
            print(f"   Failed fixes: {error_count}")
        
        print("\n✅ Property assignment repair complete!")
        
        # Test a manager login to verify
        if success_count > 0 and fixes_needed:
            test_manager = fixes_needed[0]
            print(f"\n🧪 You can now test login with: {test_manager['email']}")
            
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    fix_manager_property_assignments()