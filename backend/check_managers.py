#!/usr/bin/env python3
"""Check existing manager accounts"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.test")

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    # Get all managers
    managers = supabase.table("users").select("*").eq("role", "manager").execute()
    
    print("Existing Manager Accounts:")
    print("="*50)
    
    for manager in managers.data:
        print(f"\nManager ID: {manager.get('id')}")
        print(f"  Email: {manager.get('email')}")
        print(f"  Name: {manager.get('first_name')} {manager.get('last_name')}")
        print(f"  Active: {manager.get('is_active')}")
        print(f"  Created: {manager.get('created_at')}")
        
        # Check property assignments
        assignments = supabase.table("property_managers").select("*, properties(name)").eq("manager_id", manager.get("id")).execute()
        if assignments.data:
            print("  Properties:")
            for prop in assignments.data:
                prop_info = prop.get('properties')
                if prop_info:
                    print(f"    - {prop_info.get('name')} (ID: {prop.get('property_id')})")
                else:
                    print(f"    - Property ID: {prop.get('property_id')}")
    
    print("\n" + "="*50)
    print(f"Total managers found: {len(managers.data)}")
    
except Exception as e:
    print(f"Error: {e}")