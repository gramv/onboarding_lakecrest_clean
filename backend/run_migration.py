#!/usr/bin/env python3
"""
Run database migration to add manager review columns
"""
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv('.env')

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables")
    exit(1)

# Read the SQL migration file
with open('add_manager_review_columns.sql', 'r') as f:
    sql = f.read()

print("🔄 Running database migration...")
print(f"SQL preview (first 500 chars):\n{sql[:500]}...\n")

try:
    # Use Supabase REST API to execute SQL
    # Note: This requires the service_role key and uses the /rest/v1/rpc endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    # Try using the SQL editor API endpoint
    print("⚠️  Supabase Python client doesn't support direct SQL execution.")
    print("📋 Please run the SQL manually in one of these ways:\n")
    print("1. Supabase SQL Editor:")
    print(f"   https://supabase.com/dashboard/project/{SUPABASE_URL.split('//')[1].split('.')[0]}/sql/new")
    print("\n2. Copy and paste the SQL from 'add_manager_review_columns.sql'\n")
    print("3. Or use psql if you have database credentials")

except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

