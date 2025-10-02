#!/usr/bin/env python3
"""Check job_applications table schema"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env.test")

# Supabase connection
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch one row to see columns
try:
    result = supabase.table("job_applications").select("*").limit(1).execute()
    if result.data:
        print("Job Applications table columns:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("No data in job_applications table")
        
    # Also check for pending applications
    pending = supabase.table("job_applications").select("*").eq("status", "pending").execute()
    print(f"\nFound {len(pending.data)} pending applications")
    
    if pending.data:
        print("\nSample pending application:")
        app = pending.data[0]
        for key, value in app.items():
            if not isinstance(value, dict):
                print(f"  {key}: {value}")
                
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying to list all tables...")
    # List all tables
    import httpx
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    response = httpx.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
    print(response.text[:500])