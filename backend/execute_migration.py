#!/usr/bin/env python3
"""Execute the single_step_mode migration on Supabase database"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in environment variables")
    exit(1)

# Create Supabase client
supabase: Client = create_client(url, key)

# Read the migration SQL
with open('add_onboarding_sessions_columns.sql', 'r') as f:
    migration_sql = f.read()

print("🔄 Executing migration to add single_step_mode columns...")
print("Migration SQL:")
print(migration_sql)
print("\n" + "="*50 + "\n")

try:
    # Note: Supabase Python client doesn't support raw SQL execution directly
    # We'll need to use the REST API or check if columns already exist
    
    # First, let's check if the columns already exist by trying to query them
    print("✅ Checking if columns already exist...")
    
    try:
        # Try to query the columns - if this succeeds, they exist
        result = supabase.table('onboarding_sessions').select('id, single_step_mode, target_step').limit(1).execute()
        print("✅ Columns already exist in the database!")
        print(f"   Sample data: {result.data}")
    except Exception as e:
        if 'column' in str(e).lower():
            print("⚠️  Columns don't exist yet. Please execute this migration manually in Supabase dashboard:")
            print("\n1. Go to: https://supabase.com/dashboard/project/kzommszdhapvqpekpvnt/sql/new")
            print("2. Paste the following SQL:")
            print("\n" + "="*50)
            print(migration_sql)
            print("="*50 + "\n")
            print("3. Click 'Run' to execute the migration")
            print("\n⚠️  This is required for single-step invitations to work properly!")
        else:
            print(f"❌ Error checking columns: {e}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\n⚠️  Please execute the migration manually in Supabase dashboard")