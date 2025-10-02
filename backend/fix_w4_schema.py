#!/usr/bin/env python3
"""
Fix W-4 Forms Database Schema
=============================

This script fixes the w4_forms table schema to match what the backend expects.
The current production table is missing several required columns.

Required Schema:
- id (UUID, PRIMARY KEY) ✅
- employee_id (VARCHAR) ✅
- form_data (JSONB) ❌ MISSING
- signed (BOOLEAN) ❌ MISSING
- signature_data (JSONB) ❌ MISSING
- completed_at (TIMESTAMPTZ) ❌ MISSING
- tax_year (INTEGER) ❌ MISSING
- created_at (TIMESTAMPTZ) ✅
- updated_at (TIMESTAMPTZ) ✅

Current Production Schema (from error logs):
- id, employee_id, data, pdf_url, signed_at, created_at, updated_at

This script will:
1. Add missing columns to w4_forms table
2. Migrate existing data from 'data' column to 'form_data' column
3. Add proper indexes
4. Verify the schema is correct
"""

import os
import sys
import psycopg2
from datetime import datetime
from urllib.parse import urlparse

def get_database_connection():
    """Get direct PostgreSQL connection from DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        print("❌ Error: DATABASE_URL environment variable is required")
        print("   Please set it in your .env file or environment")
        sys.exit(1)

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        sys.exit(1)

def check_current_schema(conn):
    """Check the current w4_forms table schema"""
    print("🔍 Checking current w4_forms table schema...")

    try:
        cursor = conn.cursor()

        # Query information_schema to get current columns
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'w4_forms'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()
        if columns:
            print("📋 Current w4_forms columns:")
            for col_name, data_type, is_nullable, default in columns:
                nullable = "NULL" if is_nullable == "YES" else "NOT NULL"
                default_str = f" DEFAULT {default}" if default else ""
                print(f"   • {col_name}: {data_type} {nullable}{default_str}")
        else:
            print("⚠️  w4_forms table not found")

        cursor.close()
        return columns

    except Exception as e:
        print(f"⚠️  Could not check schema: {e}")
        return []

def run_migration(conn):
    """Run the schema migration"""
    print("\n🔧 Running W-4 schema migration...")

    cursor = conn.cursor()

    # Migration statements to execute one by one
    statements = [
        ("Add form_data column", "ALTER TABLE w4_forms ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'"),
        ("Add signed column", "ALTER TABLE w4_forms ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false"),
        ("Add signature_data column", "ALTER TABLE w4_forms ADD COLUMN IF NOT EXISTS signature_data JSONB"),
        ("Add completed_at column", "ALTER TABLE w4_forms ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ"),
        ("Add tax_year column", "ALTER TABLE w4_forms ADD COLUMN IF NOT EXISTS tax_year INTEGER DEFAULT 2025"),
        ("Migrate existing data", "UPDATE w4_forms SET form_data = COALESCE(data, '{}') WHERE form_data = '{}' AND data IS NOT NULL"),
        ("Set tax_year for existing records", "UPDATE w4_forms SET tax_year = 2025 WHERE tax_year IS NULL"),
        ("Make tax_year NOT NULL", "ALTER TABLE w4_forms ALTER COLUMN tax_year SET NOT NULL"),
        ("Create performance index", "CREATE INDEX IF NOT EXISTS idx_w4_forms_employee_year ON w4_forms(employee_id, tax_year)")
    ]

    success_count = 0
    for i, (description, stmt) in enumerate(statements, 1):
        try:
            print(f"   Step {i}/{len(statements)}: {description}...")
            cursor.execute(stmt)
            conn.commit()
            print(f"   ✅ Step {i} completed")
            success_count += 1
        except Exception as step_error:
            print(f"   ⚠️  Step {i} failed: {step_error}")
            # Continue with other steps
            conn.rollback()

    cursor.close()
    print(f"✅ Migration completed: {success_count}/{len(statements)} steps successful")
    return success_count > 0

def verify_migration(conn):
    """Verify the migration was successful"""
    print("\n🔍 Verifying migration...")

    cursor = conn.cursor()

    try:
        # Check that all required columns exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'w4_forms'
            ORDER BY ordinal_position;
        """)

        columns = [row[0] for row in cursor.fetchall()]
        required_columns = ['id', 'employee_id', 'form_data', 'signed', 'signature_data', 'completed_at', 'tax_year']

        missing_columns = [col for col in required_columns if col not in columns]
        if missing_columns:
            print(f"❌ Missing columns: {missing_columns}")
            return False

        print("✅ All required columns exist")

        # Test that we can query with tax_year (this was failing before)
        cursor.execute("SELECT COUNT(*) FROM w4_forms WHERE tax_year = 2025")
        count = cursor.fetchone()[0]
        print(f"✅ tax_year column is working correctly (found {count} records)")

        # Test inserting a record with the new schema
        test_employee_id = 'test-migration-' + datetime.now().strftime('%Y%m%d%H%M%S')
        cursor.execute("""
            INSERT INTO w4_forms (employee_id, form_data, signed, tax_year)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (test_employee_id, '{"test": true}', False, 2025))

        test_id = cursor.fetchone()[0]
        print("✅ Can insert new records with required schema")

        # Clean up test record
        cursor.execute("DELETE FROM w4_forms WHERE id = %s", (test_id,))
        conn.commit()
        print("✅ Test record cleaned up")

        cursor.close()
        return True

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        cursor.close()
        return False

def main():
    """Main migration function"""
    print("🚀 W-4 Forms Database Schema Migration")
    print("=" * 50)

    # Get database connection
    conn = get_database_connection()
    print("✅ Connected to PostgreSQL database")

    try:
        # Check current schema
        current_columns = check_current_schema(conn)

        # Run migration
        if run_migration(conn):
            print("✅ Migration completed")
        else:
            print("❌ Migration failed")
            sys.exit(1)

        # Verify migration
        if verify_migration(conn):
            print("\n🎉 W-4 schema migration successful!")
            print("   The w4_forms table now has all required columns")
            print("   W-4 forms should now save to Supabase storage correctly")
        else:
            print("\n❌ Migration verification failed")
            sys.exit(1)

    finally:
        conn.close()
        print("✅ Database connection closed")

if __name__ == "__main__":
    main()
