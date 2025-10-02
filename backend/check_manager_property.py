#!/usr/bin/env python3
"""
Check manager property assignment
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env', override=True)

from app.supabase_service_enhanced import EnhancedSupabaseService

def check_manager():
    """Check manager property assignment"""
    print("Checking manager property assignment...")
    
    # Initialize Supabase service
    supabase = EnhancedSupabaseService()
    
    try:
        # Get manager user
        manager_email = "manager@demo.com"
        result = supabase.client.table('users').select('*').eq('email', manager_email).execute()
        
        if result.data:
            manager = result.data[0]
            print(f"\nManager found:")
            print(f"  ID: {manager.get('id')}")
            print(f"  Email: {manager.get('email')}")
            print(f"  Role: {manager.get('role')}")
            print(f"  Property ID: {manager.get('property_id')}")
            print(f"  Is Active: {manager.get('is_active')}")
            
            # Check if property exists
            if manager.get('property_id'):
                prop_result = supabase.client.table('properties').select('*').eq('id', manager.get('property_id')).execute()
                if prop_result.data:
                    prop = prop_result.data[0]
                    print(f"\nProperty found:")
                    print(f"  ID: {prop.get('id')}")
                    print(f"  Name: {prop.get('name')}")
                    print(f"  Is Active: {prop.get('is_active')}")
                else:
                    print(f"\n❌ Property {manager.get('property_id')} not found!")
            else:
                print(f"\n❌ Manager has no property_id assigned!")
        else:
            print(f"❌ Manager {manager_email} not found!")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_manager()
