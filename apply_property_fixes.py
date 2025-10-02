#!/usr/bin/env python3
"""
Apply Property Assignment Fixes
Based on the comprehensive analysis, apply the specific fixes needed.
"""

import os
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

def apply_fixes():
    print("🚀 APPLYING PROPERTY ASSIGNMENT FIXES")
    print("=" * 40)
    
    fixes = [
        {
            "email": "gvemula@mail.yu.edu",
            "user_id": "23e3e040-e192-47d6-aeee-68471198e4aa",
            "from_property": "ae926aac-eb0f-4616-8629-87898e8b0d70",
            "to_property": "43020963-58d4-4ce8-9a84-139d60a2a5c1",
            "reason": "Primary property based on 9 employees managed"
        },
        {
            "email": "vgoutamram@gmail.com", 
            "user_id": "7a4836e0-7f4d-41c0-b6fc-934076cf2c86",
            "from_property": "f31f99d6-02ba-4c76-9ec9-1ebafe54612f",
            "to_property": "ae926aac-eb0f-4616-8629-87898e8b0d70",
            "reason": "Match property_managers assignment"
        }
    ]
    
    success_count = 0
    
    for fix in fixes:
        print(f"\n🔧 Fixing {fix['email']}...")
        print(f"   Reason: {fix['reason']}")
        print(f"   Change: {fix['from_property']} -> {fix['to_property']}")
        
        try:
            # Update users.property_id
            result = supabase.table('users').update({
                'property_id': fix['to_property']
            }).eq('id', fix['user_id']).execute()
            
            if result.data:
                print(f"   ✅ SUCCESS: Updated property_id")
                success_count += 1
            else:
                print(f"   ❌ FAILED: No data returned from update")
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
    
    print(f"\n📊 SUMMARY: {success_count}/{len(fixes)} fixes applied successfully")
    
    if success_count == len(fixes):
        print("🎉 ALL FIXES APPLIED SUCCESSFULLY!")
        print("\n✅ Next Steps:")
        print("1. Test login for both users")
        print("2. Verify dashboard access")
        print("3. Check property data displays correctly")
    else:
        print("⚠️  Some fixes failed. Please check the errors above.")
    
    return success_count == len(fixes)

if __name__ == "__main__":
    apply_fixes()
