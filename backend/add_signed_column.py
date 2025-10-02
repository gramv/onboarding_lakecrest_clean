#!/usr/bin/env python3
"""
Add missing 'signed' column to i9_forms table
"""

import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres.kzommszdhapvqpekpvnt:Gouthi321@aws-0-us-east-1.pooler.supabase.com:6543/postgres")

print("🔄 Adding missing 'signed' column to i9_forms table...")

try:
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
    
    # Add the missing signed column
    migration_sql = """
    ALTER TABLE i9_forms 
    ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT FALSE;
    """
    
    print("⚡ Adding 'signed' column...")
    cursor.execute(migration_sql)
    conn.commit()
    
    # Verify all columns are present
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'i9_forms' 
        ORDER BY ordinal_position;
    """)
    
    columns = cursor.fetchall()
    print("\n✅ Updated i9_forms table structure:")
    for col_name, col_type in columns:
        if col_name in ['form_data', 'signature_data', 'completed_at', 'signed']:
            print(f"   ✅ {col_name}: {col_type}")
        else:
            print(f"      {col_name}: {col_type}")
    
    cursor.close()
    conn.close()
    
    print("\n🎉 Migration successful! The 'signed' column has been added.")
    
except Exception as e:
    print(f"\n❌ Migration failed: {e}")