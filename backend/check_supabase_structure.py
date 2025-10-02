#!/usr/bin/env python3
"""
Check existing Supabase database structure and storage buckets
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv()

# Initialize Supabase client with service key
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # Using service key for admin access

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in environment")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

print("=" * 80)
print("CHECKING SUPABASE STRUCTURE")
print("=" * 80)

# 1. Check existing tables
print("\n1. CHECKING TABLES:")
print("-" * 40)

tables_to_check = [
    "documents",
    "signed_documents",
    "onboarding_documents",
    "onboarding_progress",
    "employees",
    "properties",
    "i9_forms",
    "w4_forms",
    "i9_documents"
]

existing_tables = []
missing_tables = []

for table_name in tables_to_check:
    try:
        # Try to select from the table
        result = supabase.table(table_name).select("*").limit(0).execute()
        print(f"✓ Table '{table_name}' exists")
        existing_tables.append(table_name)
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            print(f"✗ Table '{table_name}' does NOT exist")
            missing_tables.append(table_name)
        else:
            print(f"? Table '{table_name}' - Error: {error_msg[:100]}")

# 2. Check storage buckets
print("\n2. CHECKING STORAGE BUCKETS:")
print("-" * 40)

try:
    buckets = supabase.storage.list_buckets()
    print(f"Found {len(buckets)} buckets:")
    for bucket in buckets:
        print(f"  - {bucket.name} (public: {bucket.public})")

    # Check if our required bucket exists
    bucket_names = [b.name for b in buckets]
    if "onboarding-documents" not in bucket_names:
        print("\n✗ Required bucket 'onboarding-documents' NOT found")
    else:
        print("\n✓ Required bucket 'onboarding-documents' exists")

except Exception as e:
    print(f"Error checking buckets: {e}")

# 3. Check signed_documents table structure
print("\n3. CHECKING 'signed_documents' TABLE STRUCTURE:")
print("-" * 40)

if "signed_documents" in existing_tables:
    try:
        # Get a sample row to see structure
        result = supabase.table("signed_documents").select("*").limit(1).execute()
        if result.data and len(result.data) > 0:
            print("Sample columns in signed_documents:")
            for key in result.data[0].keys():
                print(f"  - {key}")
        else:
            # Try to get table structure via RPC or admin query
            print("Table is empty, trying to get schema...")
            # We'll create a test entry to see what columns are available
            try:
                test_result = supabase.table("signed_documents").insert({
                    "employee_id": "test-check-schema",
                    "document_type": "test"
                }).execute()
                # Delete the test entry
                supabase.table("signed_documents").delete().eq(
                    "employee_id", "test-check-schema"
                ).execute()
                print("signed_documents table accepts: employee_id, document_type")
            except Exception as e:
                print(f"Schema check error: {e}")
    except Exception as e:
        print(f"Error checking signed_documents structure: {e}")

# 4. Check onboarding_progress table structure
print("\n4. CHECKING 'onboarding_progress' TABLE STRUCTURE:")
print("-" * 40)

if "onboarding_progress" in existing_tables:
    try:
        result = supabase.table("onboarding_progress").select("*").limit(1).execute()
        if result.data and len(result.data) > 0:
            print("Sample columns in onboarding_progress:")
            for key in result.data[0].keys():
                print(f"  - {key}")
        else:
            print("Table is empty")
    except Exception as e:
        print(f"Error checking onboarding_progress structure: {e}")

# 5. Summary
print("\n" + "=" * 80)
print("SUMMARY:")
print("=" * 80)

print(f"\nExisting tables ({len(existing_tables)}):")
for table in existing_tables:
    print(f"  ✓ {table}")

print(f"\nMissing tables ({len(missing_tables)}):")
for table in missing_tables:
    print(f"  ✗ {table}")

print("\nRECOMMENDATIONS:")
if "documents" in missing_tables:
    print("  1. The 'documents' table is missing - need to create it or update code to use 'signed_documents'")

if "onboarding-documents" not in [b.name for b in buckets] if 'buckets' in locals() else []:
    print("  2. The 'onboarding-documents' bucket needs to be created")

print("\n" + "=" * 80)