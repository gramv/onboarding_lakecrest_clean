#!/usr/bin/env python3
"""
Run the onboarding_progress table migration
"""

import os
from supabase import create_client, Client

# Get Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kzommszdhapvqpekpvnt.supabase.co')
# Using service role key for migrations
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk')

def run_migration():
    """Execute the migration SQL"""
    try:
        # Create Supabase client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Read the migration file
        with open('migrations/create_onboarding_progress_table_simple.sql', 'r') as f:
            sql = f.read()
        
        # Split SQL into individual statements (Supabase doesn't like multiple statements)
        statements = []
        current = []
        
        for line in sql.split('\n'):
            if line.strip().startswith('--'):
                continue
            current.append(line)
            if ';' in line:
                stmt = '\n'.join(current).strip()
                if stmt and not stmt.startswith('--'):
                    statements.append(stmt)
                current = []
        
        # Execute each statement
        print("Running migration...")
        for i, statement in enumerate(statements):
            if statement.strip():
                print(f"\nExecuting statement {i+1}/{len(statements)}...")
                print(f"Statement preview: {statement[:100]}...")
                
                try:
                    # Use RPC for DDL statements
                    # For CREATE TABLE and other DDL, we need to use raw SQL through RPC
                    # Note: This requires a custom RPC function in Supabase, or we use the admin client
                    
                    # Since we can't directly execute DDL through the Python client,
                    # we'll print the SQL for manual execution
                    print("Please execute this in Supabase SQL Editor:")
                    print(statement)
                    print("-" * 50)
                    
                except Exception as e:
                    print(f"Error executing statement: {e}")
                    continue
        
        print("\n✅ Migration statements generated!")
        print("\n⚠️  IMPORTANT: Copy and paste the SQL statements above into your Supabase SQL Editor")
        print("Navigate to: Your Supabase Dashboard > SQL Editor > New Query")
        
        # Let's at least check if the table exists
        print("\n🔍 Checking if table already exists...")
        try:
            result = client.table('onboarding_progress').select('*').limit(1).execute()
            print("✅ Table 'onboarding_progress' already exists!")
        except Exception as e:
            if 'relation "public.onboarding_progress" does not exist' in str(e):
                print("❌ Table 'onboarding_progress' does not exist yet - please run the migration")
            else:
                print(f"⚠️  Could not verify table existence: {e}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    # Print the full SQL for easy copying
    print("=" * 60)
    print("COPY THIS SQL TO SUPABASE SQL EDITOR:")
    print("=" * 60)
    
    with open('migrations/create_onboarding_progress_table_simple.sql', 'r') as f:
        print(f.read())
    
    print("=" * 60)
    print("\nNow checking if table exists...")
    run_migration()