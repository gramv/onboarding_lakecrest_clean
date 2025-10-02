#!/usr/bin/env python3
"""
Check the actual schema of the employees table
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv(".env.test")

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

print("Checking employees table schema...")

# Try to fetch one record to see what columns exist
try:
    result = supabase.table('employees').select('*').limit(1).execute()
    
    if result.data and len(result.data) > 0:
        print("Existing employee record columns:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("No employees found, but table exists")
        
    # Try creating a minimal employee record
    import uuid
    test_id = str(uuid.uuid4())
    
    # Start with minimal required fields
    minimal_data = {
        'id': test_id,
        'property_id': 'test-prop-001',
        'onboarding_status': 'not_started'
    }
    
    print("\nTrying to insert minimal employee record...")
    result = supabase.table('employees').insert(minimal_data).execute()
    
    if result.data:
        print("✅ Minimal insert successful")
        print("Created record:")
        for key, value in result.data[0].items():
            print(f"  - {key}: {value}")
        
        # Clean up
        supabase.table('employees').delete().eq('id', test_id).execute()
        print("Test record deleted")
    
except Exception as e:
    print(f"Error: {e}")