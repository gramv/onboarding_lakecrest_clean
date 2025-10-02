#!/usr/bin/env python3
"""
Run the email recipients migration via Supabase API
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Supabase credentials not found")
    exit(1)

# Create the table via Supabase RPC (if we had a function) or direct REST API
# Since we can't run raw SQL through the REST API, we'll need to use Supabase client
from supabase import create_client, Client

print("📊 Connecting to Supabase...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Check if table exists by trying to query it
try:
    print("🔍 Checking if property_email_recipients table exists...")
    result = supabase.table('property_email_recipients').select('*').limit(1).execute()
    print("✅ Table already exists!")
except Exception as e:
    if "Could not find the table" in str(e):
        print("❌ Table does not exist. It needs to be created via Supabase Dashboard or SQL Editor.")
        print("\n📝 Please run this SQL in your Supabase SQL Editor:")
        print("-" * 60)
        
        # Read the migration file
        with open('supabase/migrations/011_create_email_recipients_table.sql', 'r') as f:
            migration_sql = f.read()
        
        print(migration_sql)
        print("-" * 60)
        print("\n1. Go to: https://supabase.com/dashboard/project/kzommszdhapvqpekpvnt/sql/new")
        print("2. Paste the SQL above")
        print("3. Click 'Run' to execute")
        print("4. Then restart this application")
    else:
        print(f"❌ Error: {e}")