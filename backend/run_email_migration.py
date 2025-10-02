#!/usr/bin/env python3
"""
Run the email recipients migration on production database
"""

import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv('.env')

# Parse database URL
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL not found in environment")
    exit(1)

# Parse the URL
url = urlparse(DATABASE_URL)

# Connect to database
print("📊 Connecting to production database...")
conn = psycopg2.connect(
    host=url.hostname,
    port=url.port,
    database=url.path[1:],  # Remove leading slash
    user=url.username,
    password=url.password,
    sslmode='require'
)
conn.autocommit = True
cur = conn.cursor()

print("✅ Connected to production database")

# Read and execute migration
migration_file = 'supabase/migrations/011_create_email_recipients_table.sql'

if os.path.exists(migration_file):
    print(f"📄 Reading migration from {migration_file}")
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    try:
        print("🔨 Executing migration...")
        cur.execute(migration_sql)
        print("✅ Migration executed successfully!")
        
        # Verify table was created
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'property_email_recipients'
        """)
        count = cur.fetchone()[0]
        
        if count > 0:
            print("✅ Table 'property_email_recipients' created successfully!")
            
            # Check columns
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'property_email_recipients'
                ORDER BY ordinal_position
            """)
            columns = cur.fetchall()
            
            print("\n📊 Table structure:")
            for col_name, col_type in columns:
                print(f"   - {col_name}: {col_type}")
        else:
            print("⚠️ Table might not have been created. Check manually.")
            
    except Exception as e:
        print(f"❌ Error executing migration: {e}")
else:
    print(f"❌ Migration file not found: {migration_file}")

# Close connection
cur.close()
conn.close()
print("\n✅ Database connection closed")