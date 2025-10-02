#!/usr/bin/env python3
"""
Quick fix for manager property assignment issue
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def quick_fix():
    print("🔧 Quick Manager Property Fix")
    print("=" * 40)
    
    # Check environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials")
        print("\n💡 MANUAL STEPS TO FIX:")
        print("\n1. Check your browser localStorage:")
        print("   - Open dev tools (F12)")
        print("   - Go to Application/Storage tab")
        print("   - Check 'user' object in localStorage")
        print("   - If property_id is null or wrong, clear localStorage")
        print("\n2. Clear browser cache:")
        print("   localStorage.clear()")
        print("   sessionStorage.clear()")
        print("\n3. Login again with gvemula@mail.yu.edu")
        print("\n4. If still not working, check database:")
        print("   - users table: property_id column")
        print("   - property_managers table: assignments")
        print("\n5. Quick frontend test:")
        print("   - Check Network tab during login")
        print("   - Verify login response includes property_id")
        print("   - Check /api/auth/me endpoint response")
        return
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Check user data
        user_result = supabase.table('users').select('*').eq('email', 'gvemula@mail.yu.edu').execute()
        
        if not user_result.data:
            print("❌ User not found in database")
            return
        
        user = user_result.data[0]
        print(f"✅ User found: {user['email']}")
        print(f"   Role: {user['role']}")
        print(f"   Property ID: {user.get('property_id', 'NULL')}")
        
        # Check property assignments
        assignments = supabase.table('property_managers').select('*').eq('manager_id', user['id']).execute()
        print(f"\n📋 Property assignments: {len(assignments.data)}")
        
        for assignment in assignments.data:
            # Get property name
            prop = supabase.table('properties').select('name').eq('id', assignment['property_id']).execute()
            prop_name = prop.data[0]['name'] if prop.data else 'Unknown'
            print(f"   - {assignment['property_id']} ({prop_name})")
        
        # Determine if fix is needed
        if user.get('property_id') and assignments.data:
            print("\n✅ User has both property_id and assignments")
            print("\n💡 Issue is likely FRONTEND CACHE:")
            print("   1. Clear browser localStorage and sessionStorage")
            print("   2. Re-login to get fresh data")
            print("   3. Check that login response includes property_id")
        elif not user.get('property_id') and assignments.data:
            print("\n⚠️  ISSUE FOUND: property_id is NULL but assignments exist")
            
            # Use first assignment as primary
            primary_property = assignments.data[0]['property_id']
            print(f"\n🔧 FIXING: Setting property_id to {primary_property}")
            
            # Apply fix
            fix_result = supabase.table('users').update({
                'property_id': primary_property
            }).eq('id', user['id']).execute()
            
            if fix_result.data:
                print("✅ SUCCESS: property_id updated")
                print("\n🎯 NEXT STEPS:")
                print("   1. Clear browser cache (localStorage/sessionStorage)")
                print("   2. Login again with gvemula@mail.yu.edu")
                print("   3. Should now see correct property assignment")
            else:
                print("❌ FAILED: Could not update property_id")
        else:
            print("\n❌ No property assignments found")
            print("   Need to assign this manager to a property first")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("\n💡 Try manual steps listed above")

if __name__ == "__main__":
    quick_fix()