#!/usr/bin/env python3
"""
Run migration on Supabase to fix i9_forms table schema
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kzommszdhapvqpekpvnt.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjQxMTcsImV4cCI6MjA3MDM0MDExN30.VMl6QzCZleoOvcY_abOHsztgXcottOnDv2kzJgmCjdg")

print("🔄 Connecting to Supabase...")
print(f"   URL: {SUPABASE_URL}")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# SQL to add missing columns
migration_sql = """
ALTER TABLE i9_forms 
ADD COLUMN IF NOT EXISTS form_data JSONB,
ADD COLUMN IF NOT EXISTS signature_data JSONB,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
"""

print("\n📊 Running migration to add missing columns to i9_forms table...")
print("   Adding: form_data (JSONB)")
print("   Adding: signature_data (JSONB)")  
print("   Adding: completed_at (TIMESTAMP)")

try:
    # Check current schema first
    print("\n🔍 Checking current i9_forms table structure...")
    result = supabase.table('i9_forms').select('*').limit(1).execute()
    
    if result.data:
        print(f"✅ Table exists with {len(result.data)} test record(s)")
        if result.data[0]:
            print(f"   Current columns: {list(result.data[0].keys())}")
    else:
        print("✅ Table exists but is empty")
    
    # Note: Supabase client doesn't support direct DDL commands
    # We need to use the Supabase dashboard or connect via psycopg2
    
    import psycopg2
    from urllib.parse import urlparse
    
    # Parse DATABASE_URL
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.kzommszdhapvqpekpvnt:Gouthi321@aws-0-us-east-1.pooler.supabase.com:6543/postgres")
    
    print(f"\n🔗 Connecting directly to PostgreSQL...")
    
    # Parse the URL
    url = urlparse(DATABASE_URL)
    
    # Connect to database
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port,
        database=url.path[1:],
        user=url.username,
        password=url.password,
        sslmode='require'
    )
    
    cursor = conn.cursor()
    
    # Run the migration
    print("\n⚡ Executing migration...")
    cursor.execute(migration_sql)
    conn.commit()
    
    print("✅ Migration completed successfully!")
    
    # Verify the columns were added
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'i9_forms' 
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\n📋 Updated i9_forms table structure:")
    for col_name, col_type in columns:
        status = "✅ NEW" if col_name in ['form_data', 'signature_data', 'completed_at'] else "  "
        print(f"   {status} {col_name}: {col_type}")
    
    cursor.close()
    conn.close()
    
    print("\n🎉 Database migration successful!")
    print("   The i9_forms table now has all required columns")
    
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    print("\n📝 Manual Migration Instructions:")
    print("1. Go to Supabase Dashboard: https://app.supabase.com")
    print("2. Select your project")
    print("3. Go to SQL Editor")
    print("4. Run this SQL:")
    print("-" * 60)
    print(migration_sql)
    print("-" * 60)