#!/usr/bin/env python3
"""
Get database schema from Supabase
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not key:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    sys.exit(1)

client = create_client(url, key)

print("=" * 80)
print("CHECKING DATABASE SCHEMA")
print("=" * 80)
print()

# Try to get common tables
common_tables = [
    'users',
    'employees', 
    'managers',
    'properties',
    'onboarding_progress',
    'signed_documents',
    'onboarding_form_data'
]

print("Checking for common tables:")
print()

for table_name in common_tables:
    try:
        result = client.table(table_name).select('*').limit(0).execute()
        print(f"✅ {table_name:30} - EXISTS")
    except Exception as e:
        error_msg = str(e)
        if 'PGRST116' in error_msg or 'not found' in error_msg.lower():
            print(f"❌ {table_name:30} - NOT FOUND")
        else:
            print(f"⚠️  {table_name:30} - ERROR: {error_msg[:50]}")

print()
print("=" * 80)
print("CHECKING USERS TABLE STRUCTURE")
print("=" * 80)
print()

try:
    # Get a sample user to see structure
    result = client.table('users').select('*').limit(1).execute()
    if result.data:
        print("Sample user record structure:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("No users found, but table exists")
except Exception as e:
    print(f"ERROR: {e}")

print()
print("=" * 80)
print("CHECKING EMPLOYEES TABLE STRUCTURE")
print("=" * 80)
print()

try:
    result = client.table('employees').select('*').limit(1).execute()
    if result.data:
        print("Sample employee record structure:")
        for key in result.data[0].keys():
            print(f"  - {key}")
    else:
        print("No employees found, but table exists")
except Exception as e:
    print(f"ERROR: {e}")

