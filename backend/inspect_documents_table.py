#!/usr/bin/env python3
"""
Inspect the actual schema of the documents table
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import requests

# Load environment variables
load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

# Use direct API call to get table information
headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {supabase_key}",
    "Content-Type": "application/json"
}

# Try to get table schema via REST API
print("=" * 80)
print("INSPECTING 'documents' TABLE ACTUAL SCHEMA")
print("=" * 80)

# First, let's try different field names that might exist
supabase: Client = create_client(supabase_url, supabase_key)

test_fields = [
    # Common document storage fields
    {"document_url": "test", "document_type": "test"},
    {"file_url": "test", "file_type": "test"},
    {"url": "test", "type": "test"},
    {"storage_path": "test", "mime_type": "test"},
    {"document_id": "test", "employee_id": "test"},
    {"id": "test-id", "data": {}},
    # Based on signed_documents structure
    {"employee_id": "test", "document_type": "test", "pdf_url": "test"},
]

print("\nTrying different field combinations to discover schema:")
for i, fields in enumerate(test_fields, 1):
    try:
        result = supabase.table("documents").insert(fields).execute()
        print(f"\n✓ Combination {i} worked! Fields accepted: {list(fields.keys())}")
        print(f"  Returned columns: {list(result.data[0].keys())}")

        # Clean up
        if result.data and len(result.data) > 0 and "id" in result.data[0]:
            supabase.table("documents").delete().eq("id", result.data[0]["id"]).execute()
        break
    except Exception as e:
        error_msg = str(e)
        # Extract the column name that was not found
        if "Could not find the" in error_msg and "column" in error_msg:
            missing = error_msg.split("'")[1]
            print(f"  {i}. Column '{missing}' not found")
        else:
            print(f"  {i}. Error: {error_msg[:50]}")

# Try to query with no filter to see any existing data structure
print("\n" + "-" * 40)
print("Checking if there's any existing data:")
try:
    result = supabase.table("documents").select("*").limit(5).execute()
    if result.data and len(result.data) > 0:
        print(f"Found {len(result.data)} rows. Sample structure:")
        for key in result.data[0].keys():
            sample_value = result.data[0][key]
            value_type = type(sample_value).__name__
            print(f"  - {key}: {value_type}")
    else:
        print("Table is empty")
except Exception as e:
    print(f"Error querying: {e}")

print("\n" + "=" * 80)