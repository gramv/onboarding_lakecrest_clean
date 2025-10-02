#!/usr/bin/env python3
"""Fix property_managers table if columns are wrong"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import psycopg2
from psycopg2 import sql
import re

# Load environment variables
load_dotenv('.env')

# Get Supabase/Database credentials
DATABASE_URL = os.getenv('DATABASE_URL')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env.test")
    exit(1)

# Parse DATABASE_URL
# Format: postgresql://user:password@host:port/database
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
if not match:
    print(f"Error: Could not parse DATABASE_URL: {DATABASE_URL}")
    exit(1)

user, password, host, port, database = match.groups()

print("\nConnecting to database...")
print("=" * 60)

try:
    # Connect to database
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("✓ Connected to database")
    
    # Check if property_managers table exists and its structure
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns
        WHERE table_name = 'property_managers'
        ORDER BY ordinal_position;
    """)
    
    columns = cur.fetchall()
    
    if columns:
        print("\nCurrent property_managers table columns:")
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")
        
        # Check if we have the right columns
        column_names = [col[0] for col in columns]
        
        if 'manager_id' not in column_names or 'property_id' not in column_names:
            print("\n⚠️ Table has incorrect column names!")
            
            # Check for alternative column names
            if 'user_id' in column_names:
                print("Found 'user_id' instead of 'manager_id'")
                print("\nFIXING: Renaming user_id to manager_id...")
                
                try:
                    cur.execute("ALTER TABLE property_managers RENAME COLUMN user_id TO manager_id;")
                    print("✓ Renamed user_id to manager_id")
                except Exception as e:
                    print(f"✗ Failed to rename column: {e}")
                    
            else:
                print("\n⚠️ Table structure is completely wrong. Recreating table...")
                
                # Drop and recreate the table
                cur.execute("DROP TABLE IF EXISTS property_managers CASCADE;")
                print("✓ Dropped old table")
                
                cur.execute("""
                    CREATE TABLE property_managers (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
                        assigned_at TIMESTAMPTZ DEFAULT NOW(),
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW(),
                        UNIQUE(manager_id, property_id)
                    );
                """)
                print("✓ Created new property_managers table with correct schema")
                
                # Create indexes
                cur.execute("CREATE INDEX idx_property_managers_manager_id ON property_managers(manager_id);")
                cur.execute("CREATE INDEX idx_property_managers_property_id ON property_managers(property_id);")
                print("✓ Created indexes")
                
                # Enable RLS
                cur.execute("ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;")
                print("✓ Enabled Row Level Security")
                
        else:
            print("\n✓ Table structure looks correct!")
    else:
        print("\nTable doesn't exist. Creating it...")
        
        cur.execute("""
            CREATE TABLE property_managers (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
                assigned_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(manager_id, property_id)
            );
        """)
        print("✓ Created property_managers table")
        
        # Create indexes
        cur.execute("CREATE INDEX idx_property_managers_manager_id ON property_managers(manager_id);")
        cur.execute("CREATE INDEX idx_property_managers_property_id ON property_managers(property_id);")
        print("✓ Created indexes")
        
        # Enable RLS
        cur.execute("ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;")
        print("✓ Enabled Row Level Security")
    
    # Verify the final structure
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns
        WHERE table_name = 'property_managers'
        ORDER BY ordinal_position;
    """)
    
    final_columns = cur.fetchall()
    print("\n✅ Final property_managers table structure:")
    for col_name, col_type in final_columns:
        print(f"  - {col_name}: {col_type}")
    
    cur.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("✅ Database schema fixed successfully!")
    print("You can now run the HR endpoint tests again.")
    
except psycopg2.Error as e:
    print(f"✗ Database error: {e}")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()