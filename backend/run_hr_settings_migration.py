#!/usr/bin/env python3
"""
Run HR Settings Table Migration
Creates the hr_settings table with default training video configuration
"""

import os
import sys
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    print("   Please set these in your .env file")
    sys.exit(1)

print("=" * 80)
print("HR SETTINGS TABLE MIGRATION")
print("=" * 80)
print()

# Connect to Supabase
print("🔧 Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
print("✅ Connected successfully")
print()

# Read the migration SQL file
migration_file = Path(__file__).parent / 'supabase' / 'migrations' / 'create_hr_settings_table.sql'

if not migration_file.exists():
    print(f"❌ Migration file not found: {migration_file}")
    sys.exit(1)

print(f"📄 Reading migration file: {migration_file.name}")
with open(migration_file, 'r') as f:
    migration_sql = f.read()

print(f"   SQL size: {len(migration_sql)} characters")
print()

# Note about running the migration
print("⚠️  IMPORTANT: Supabase Python client doesn't support raw SQL execution")
print("   You need to run this migration using one of these methods:")
print()
print("   Option 1: Supabase Dashboard (Recommended)")
print("   ----------------------------------------")
print("   1. Go to https://app.supabase.com")
print("   2. Select your project")
print("   3. Navigate to 'SQL Editor'")
print("   4. Click 'New Query'")
print("   5. Copy and paste the contents of:")
print(f"      {migration_file}")
print("   6. Click 'Run' to execute")
print()
print("   Option 2: psql Command Line")
print("   ---------------------------")
print("   psql $DATABASE_URL < backend/supabase/migrations/create_hr_settings_table.sql")
print()
print("   Option 3: Copy SQL Below")
print("   ------------------------")
print("   Copy the SQL below and run it in Supabase SQL Editor:")
print()
print("-" * 80)
print(migration_sql)
print("-" * 80)
print()

# Try to verify if table exists (read-only operation)
print("🔍 Checking if hr_settings table already exists...")
try:
    result = supabase.table('hr_settings').select('*').limit(0).execute()
    print("✅ hr_settings table already exists!")
    print()
    
    # Check for existing settings
    settings_result = supabase.table('hr_settings').select('*').execute()
    if settings_result.data:
        print(f"📊 Found {len(settings_result.data)} existing settings:")
        for setting in settings_result.data:
            print(f"   - {setting['setting_key']} ({setting['setting_type']})")
    else:
        print("   No settings found yet")
    print()
    print("✅ Migration appears to be complete!")
    
except Exception as e:
    error_msg = str(e)
    if 'does not exist' in error_msg.lower() or 'not found' in error_msg.lower():
        print("❌ Table does not exist - Migration needs to be run")
        print()
        print("   Please run the migration using one of the methods above")
    else:
        print(f"⚠️  Could not verify table existence: {error_msg}")
    print()
    sys.exit(1)

print()
print("=" * 80)
print("MIGRATION CHECK COMPLETE")
print("=" * 80)

