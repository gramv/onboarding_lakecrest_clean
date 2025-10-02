#!/usr/bin/env python3
"""
Execute database schema updates for HR Manager System Fix
This script applies all required schema changes to support the consolidated HR/Manager system
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import asyncpg

# Load environment variables
env_path = Path(__file__).parent / '.env.test'
load_dotenv(env_path)

# Database connection details
DATABASE_URL = os.getenv('DATABASE_URL')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Schema update queries
SCHEMA_UPDATES = [
    {
        "name": "Fix property_managers junction table - Drop incorrect constraints",
        "query": """
            ALTER TABLE property_managers 
            DROP CONSTRAINT IF EXISTS property_managers_user_id_fkey;
        """
    },
    {
        "name": "Fix property_managers - Add correct user foreign key",
        "query": """
            ALTER TABLE property_managers
            ADD CONSTRAINT property_managers_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    },
    {
        "name": "Fix property_managers - Add property foreign key",
        "query": """
            ALTER TABLE property_managers
            ADD CONSTRAINT property_managers_property_id_fkey
            FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
        """
    },
    {
        "name": "Fix property_managers - Add unique constraint",
        "query": """
            ALTER TABLE property_managers
            ADD CONSTRAINT unique_user_property 
            UNIQUE (user_id, property_id);
        """
    },
    {
        "name": "Fix property_managers - Add created_at timestamp",
        "query": """
            ALTER TABLE property_managers
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        """
    },
    {
        "name": "Create i9_section2 table for employer verification",
        "query": """
            CREATE TABLE IF NOT EXISTS i9_section2 (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                manager_id UUID NOT NULL REFERENCES users(id),
                document_type VARCHAR(100) NOT NULL,
                document_number VARCHAR(100),
                document_expiry DATE,
                issuing_authority VARCHAR(200),
                employer_name VARCHAR(200) NOT NULL,
                employer_title VARCHAR(100) NOT NULL,
                employer_signature TEXT NOT NULL,
                signature_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_employee_section2 UNIQUE (employee_id)
            );
        """
    },
    {
        "name": "Create application_reviews table",
        "query": """
            CREATE TABLE IF NOT EXISTS application_reviews (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
                reviewer_id UUID NOT NULL REFERENCES users(id),
                action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'request_info')),
                comments TEXT,
                pay_rate DECIMAL(10,2),
                pay_frequency VARCHAR(20),
                start_date DATE,
                start_time TIME,
                supervisor_name VARCHAR(200),
                special_instructions TEXT,
                reviewed_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_application_review UNIQUE (application_id)
            );
        """
    },
    {
        "name": "Fix users table - Add password_hash column",
        "query": """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
        """
    },
    {
        "name": "Fix users table - Migrate password data to password_hash",
        "query": """
            UPDATE users 
            SET password_hash = password 
            WHERE password_hash IS NULL AND password IS NOT NULL;
        """
    },
    {
        "name": "Fix users table - Drop old password column",
        "query": """
            ALTER TABLE users
            DROP COLUMN IF EXISTS password;
        """
    },
    {
        "name": "Fix users table - Add is_active and must_change_password columns",
        "query": """
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
        """
    },
    {
        "name": "Add performance index - users email",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """
    },
    {
        "name": "Add performance index - users role",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        """
    },
    {
        "name": "Add performance index - properties active",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active);
        """
    },
    {
        "name": "Add performance index - applications property and status",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_applications_property_status 
            ON job_applications(property_id, status);
        """
    },
    {
        "name": "Add performance index - employees property",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_employees_property ON employees(property_id);
        """
    },
    {
        "name": "Add performance index - i9_section2 employee",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_i9_section2_employee ON i9_section2(employee_id);
        """
    },
    {
        "name": "Add performance index - reviews application",
        "query": """
            CREATE INDEX IF NOT EXISTS idx_reviews_application ON application_reviews(application_id);
        """
    }
]

async def execute_schema_updates():
    """Execute all schema updates with proper error handling"""
    
    print("=" * 80)
    print("HR Manager System Schema Updates")
    print("=" * 80)
    print(f"Database URL: {DATABASE_URL}")
    print(f"Started at: {datetime.now()}")
    print("-" * 80)
    
    # Connect to database
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Connected to database successfully")
        print("-" * 80)
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
        return False
    
    success_count = 0
    failed_count = 0
    
    # Execute updates in a transaction
    try:
        async with conn.transaction():
            for i, update in enumerate(SCHEMA_UPDATES, 1):
                print(f"\n[{i}/{len(SCHEMA_UPDATES)}] {update['name']}")
                try:
                    await conn.execute(update['query'])
                    print(f"  ✓ Successfully executed")
                    success_count += 1
                except Exception as e:
                    print(f"  ✗ Failed: {e}")
                    failed_count += 1
                    # Don't stop on constraint/index errors that might already exist
                    if "already exists" not in str(e).lower():
                        raise
    except Exception as e:
        print(f"\n✗ Transaction failed and rolled back: {e}")
        await conn.close()
        return False
    
    # Close connection
    await conn.close()
    
    print("\n" + "=" * 80)
    print("Schema Update Summary")
    print("=" * 80)
    print(f"Total updates: {len(SCHEMA_UPDATES)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {failed_count}")
    print(f"Completed at: {datetime.now()}")
    print("=" * 80)
    
    # Verify critical tables exist
    print("\nVerifying critical tables...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        
        # Check for new tables
        tables_to_check = ['i9_section2', 'application_reviews', 'property_managers']
        for table in tables_to_check:
            result = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            """, table)
            status = "✓" if result else "✗"
            print(f"  {status} Table '{table}' exists: {result}")
        
        # Check for critical columns
        print("\nVerifying critical columns...")
        columns_to_check = [
            ('users', 'password_hash'),
            ('users', 'is_active'),
            ('users', 'must_change_password'),
            ('property_managers', 'created_at')
        ]
        
        for table, column in columns_to_check:
            result = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                )
            """, table, column)
            status = "✓" if result else "✗"
            print(f"  {status} Column '{table}.{column}' exists: {result}")
        
        await conn.close()
    except Exception as e:
        print(f"✗ Failed to verify tables: {e}")
    
    return success_count > 0

async def main():
    """Main execution"""
    success = await execute_schema_updates()
    
    if success:
        print("\n✓ Schema updates completed successfully!")
        print("\nNext Steps:")
        print("1. Test the HR/Manager dashboard functionality")
        print("2. Verify property-based access control")
        print("3. Test I-9 Section 2 workflow")
        print("4. Check application review process")
        sys.exit(0)
    else:
        print("\n✗ Schema updates failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())