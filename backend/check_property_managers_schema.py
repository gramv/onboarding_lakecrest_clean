#!/usr/bin/env python3
"""Check the property_managers table schema"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv('.env.test')

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Error: Missing Supabase credentials")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

print("\nChecking property_managers table...")
print("=" * 60)

try:
    # Try to query the table
    result = supabase.table('property_managers').select('*').limit(1).execute()
    
    if result.data:
        print("Sample row from property_managers:")
        print(result.data[0])
        print("\nColumns found:", list(result.data[0].keys()))
    else:
        print("No data in property_managers table")
        
        # Try to get column info via a test insert
        print("\nAttempting to understand table structure...")
        
except Exception as e:
    print(f"Error querying property_managers: {e}")
    
    # Try to understand the error
    if "does not exist" in str(e):
        print("\nTable might not exist. Let me check available tables...")
        
        # Try users table to confirm connection works
        try:
            users_result = supabase.table('users').select('id').limit(1).execute()
            print("✓ Database connection works (users table accessible)")
        except Exception as e2:
            print(f"✗ Database connection issue: {e2}")

print("\n" + "=" * 60)
print("If the table exists but has different column names,")
print("we need to update our code to use the correct column names.")