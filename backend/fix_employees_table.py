#!/usr/bin/env python3
"""
Fix employees table by adding missing columns
"""

from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv(".env.test")

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# SQL to add missing columns if they don't exist
sql = """
-- Add first_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='employees' AND column_name='first_name') THEN
        ALTER TABLE employees ADD COLUMN first_name TEXT;
    END IF;
END $$;

-- Add last_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='employees' AND column_name='last_name') THEN
        ALTER TABLE employees ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='employees' AND column_name='email') THEN
        ALTER TABLE employees ADD COLUMN email TEXT;
    END IF;
END $$;
"""

print("Fixing employees table...")

# Execute the SQL
try:
    # Using RPC to execute raw SQL
    # Note: This requires a stored procedure or we need to execute via Supabase Dashboard
    # For now, let's check what columns exist
    
    # Test by selecting from employees with the columns
    test_result = supabase.table('employees').select('id').limit(1).execute()
    print("Current employees table is accessible")
    
    # Try to insert a test record with the new columns to see if they exist
    import uuid
    test_id = str(uuid.uuid4())
    try:
        result = supabase.table('employees').insert({
            'id': test_id,
            'property_id': 'test-prop-001',
            'first_name': 'Test',
            'last_name': 'Employee',
            'email': 'test@test.com',
            'position': 'Test Position',
            'department': 'Test Dept',
            'hire_date': '2025-01-15',
            'onboarding_status': 'not_started'
        }).execute()
        
        # If successful, delete the test record
        supabase.table('employees').delete().eq('id', test_id).execute()
        print("✅ Employees table has the required columns")
    except Exception as e:
        print(f"❌ Employees table is missing columns: {e}")
        print("\nPlease run this SQL in your Supabase Dashboard SQL Editor:")
        print(sql)
        
except Exception as e:
    print(f"Error: {e}")
    print("\nPlease run this SQL in your Supabase Dashboard SQL Editor:")
    print(sql)