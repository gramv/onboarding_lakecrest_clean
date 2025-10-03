#!/usr/bin/env python3
"""
Run Migration 010: Fix View to Extract Names and Calculate I-9 Deadline
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    sys.exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("="*80)
print("MIGRATION 010: Fix View to Extract Names and Calculate I-9 Deadline")
print("="*80)
print()

# Read migration file
migration_file = "supabase/migrations/010_fix_view_extract_names_and_deadline.sql"
print(f"📄 Reading migration file: {migration_file}")

with open(migration_file, 'r') as f:
    migration_sql = f.read()

print(f"✅ Migration file loaded ({len(migration_sql)} characters)")
print()

# Split into individual statements (PostgreSQL can't execute multiple statements at once via REST API)
statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

print(f"📝 Found {len(statements)} SQL statements to execute")
print()

# Execute each statement
for i, statement in enumerate(statements, 1):
    # Skip comments and empty statements
    if statement.startswith('--') or statement.startswith('/*') or len(statement) < 10:
        continue
    
    print(f"Executing statement {i}/{len(statements)}...")
    
    # For CREATE VIEW, we need to use raw SQL execution
    # Supabase doesn't have a direct way to execute DDL via REST API
    # We'll need to use the SQL editor in Supabase dashboard
    
    print(f"  Statement preview: {statement[:100]}...")

print()
print("="*80)
print("⚠️  IMPORTANT: Supabase REST API doesn't support DDL statements")
print("="*80)
print()
print("Please run this migration manually in Supabase SQL Editor:")
print()
print("1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql")
print("2. Copy the contents of: backend/supabase/migrations/010_fix_view_extract_names_and_deadline.sql")
print("3. Paste into SQL Editor")
print("4. Click 'Run'")
print()
print("OR use the Supabase CLI:")
print()
print("  supabase db push")
print()
print("="*80)
print()

# For now, let's just verify the current view structure
print("Checking current view data...")
try:
    result = supabase.table('employees_pending_manager_review').select('*').limit(1).execute()
    
    if result.data:
        emp = result.data[0]
        print()
        print("Current view data:")
        print(f"  first_name: {emp.get('first_name')}")
        print(f"  last_name: {emp.get('last_name')}")
        print(f"  email: {emp.get('email')}")
        print(f"  position: {emp.get('position')}")
        print(f"  start_date: {emp.get('start_date')}")
        print(f"  i9_section2_deadline: {emp.get('i9_section2_deadline')}")
        print(f"  days_until_i9_deadline: {emp.get('days_until_i9_deadline')}")
        print(f"  i9_urgency_level: {emp.get('i9_urgency_level')}")
        print()
        
        if emp.get('first_name') is None:
            print("❌ Names are NULL - migration needed!")
        else:
            print("✅ Names are populated - migration may have already run!")
    else:
        print("No employees found in view")
        
except Exception as e:
    print(f"Error checking view: {e}")

print()
print("="*80)

