#!/usr/bin/env python3
"""
Execute email notification schema migration directly
"""

import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

load_dotenv()

# Get credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
DATABASE_URL = os.getenv('DATABASE_URL')

if not all([SUPABASE_URL, SUPABASE_KEY, DATABASE_URL]):
    print("❌ Missing required environment variables")
    sys.exit(1)

# Parse database URL
url = urlparse(DATABASE_URL)
db_config = {
    'host': url.hostname,
    'port': url.port,
    'database': url.path[1:],
    'user': url.username,
    'password': url.password
}

print(f"🔧 Connecting to database...")

try:
    # Connect directly to PostgreSQL
    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()
    
    # Create property_email_recipients table
    print("📝 Creating property_email_recipients table...")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS property_email_recipients (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'notification',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(property_id, email)
        )
    """)
    
    # Add missing columns to users table
    print("📝 Adding missing columns to users table...")
    
    # Check and add email_preferences
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_preferences'
    """)
    
    if not cur.fetchone():
        print("  - Adding email_preferences column...")
        cur.execute("""
            ALTER TABLE users ADD COLUMN email_preferences JSONB DEFAULT '{
                "application_submitted": true,
                "onboarding_completed": true,
                "document_uploaded": true,
                "i9_verification_needed": true,
                "daily_summary": false
            }'::jsonb
        """)
    else:
        print("  - email_preferences column already exists")
    
    # Check and add receive_application_emails
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'receive_application_emails'
    """)
    
    if not cur.fetchone():
        print("  - Adding receive_application_emails column...")
        cur.execute("""
            ALTER TABLE users ADD COLUMN receive_application_emails BOOLEAN DEFAULT true
        """)
    else:
        print("  - receive_application_emails column already exists")
    
    # Create indexes
    print("📝 Creating indexes...")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_property_email_recipients_property_id ON property_email_recipients(property_id);
        CREATE INDEX IF NOT EXISTS idx_property_email_recipients_email ON property_email_recipients(email);
        CREATE INDEX IF NOT EXISTS idx_property_email_recipients_is_active ON property_email_recipients(is_active);
    """)
    
    # Enable RLS
    print("📝 Enabling Row Level Security...")
    cur.execute("""
        ALTER TABLE property_email_recipients ENABLE ROW LEVEL SECURITY;
    """)
    
    # Create RLS policies
    print("📝 Creating RLS policies...")
    
    # Drop existing policies first
    policies = [
        "property_email_recipients_select_policy",
        "property_email_recipients_insert_policy",
        "property_email_recipients_update_policy",
        "property_email_recipients_delete_policy"
    ]
    
    for policy in policies:
        cur.execute(f"DROP POLICY IF EXISTS {policy} ON property_email_recipients")
    
    # Create new policies
    cur.execute("""
        CREATE POLICY "property_email_recipients_select_policy" ON property_email_recipients
            FOR SELECT USING (true);
            
        CREATE POLICY "property_email_recipients_insert_policy" ON property_email_recipients
            FOR INSERT WITH CHECK (true);
            
        CREATE POLICY "property_email_recipients_update_policy" ON property_email_recipients
            FOR UPDATE USING (true);
            
        CREATE POLICY "property_email_recipients_delete_policy" ON property_email_recipients
            FOR DELETE USING (true);
    """)
    
    # Commit the transaction
    conn.commit()
    
    print("\n✅ Migration completed successfully!")
    
    # Verify the changes
    print("\n🔍 Verifying changes...")
    
    # Check if table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'property_email_recipients'
        )
    """)
    table_exists = cur.fetchone()[0]
    print(f"  - property_email_recipients table exists: {table_exists}")
    
    # Check columns in users table
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN ('email_preferences', 'receive_application_emails')
        ORDER BY column_name
    """)
    columns = [row[0] for row in cur.fetchall()]
    print(f"  - Users table columns added: {columns}")
    
    cur.close()
    conn.close()
    
    print("\n✅ All database changes applied successfully!")
    print("✅ The email notification system should now work properly!")
    
except psycopg2.Error as e:
    print(f"\n❌ Database error: {e}")
    if 'conn' in locals():
        conn.rollback()
        conn.close()
    sys.exit(1)
except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    sys.exit(1)