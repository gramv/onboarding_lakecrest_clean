#!/usr/bin/env python3
"""
Migration 014: Manager Review Enhancements
- Form field edit tracking
- Document access sessions (Supabase Auth OTP)
- Employer profiles for auto-fill
- OCR accuracy analytics
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
load_dotenv()

def run_migration():
    """Run migration 014"""
    
    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        return False
    
    print("🚀 Starting Migration 014: Manager Review Enhancements")
    print("=" * 60)
    
    try:
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Read migration file
        migration_file = Path(__file__).parent / 'supabase' / 'migrations' / '014_manager_review_enhancements.sql'
        
        if not migration_file.exists():
            print(f"❌ Migration file not found: {migration_file}")
            return False
        
        print(f"📄 Reading migration file: {migration_file.name}")
        
        with open(migration_file, 'r') as f:
            sql = f.read()
        
        print("📊 Executing migration...")
        
        # Execute migration
        # Note: Supabase Python client doesn't have direct SQL execution
        # We'll need to use the REST API or run this in Supabase Dashboard
        
        print("\n⚠️  IMPORTANT: This migration needs to be run in Supabase Dashboard")
        print("\nSteps:")
        print("1. Go to your Supabase Dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Copy the contents of: backend/supabase/migrations/014_manager_review_enhancements.sql")
        print("4. Paste and run in SQL Editor")
        print("\nOr use the Supabase CLI:")
        print("  supabase db push")
        
        return True
        
    except Exception as e:
        print(f"❌ Error running migration: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def verify_migration():
    """Verify migration was successful"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        return False
    
    print("\n" + "=" * 60)
    print("🔍 Verifying Migration...")
    print("=" * 60)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Check if tables exist
        tables_to_check = [
            'form_field_edits',
            'document_access_sessions',
            'employer_profiles',
            'employer_profile_history',
            'manager_edit_patterns'
        ]
        
        print("\n📋 Checking tables:")
        for table in tables_to_check:
            try:
                # Try to query the table
                result = supabase.table(table).select("*").limit(1).execute()
                print(f"  ✅ {table} - exists")
            except Exception as e:
                print(f"  ❌ {table} - not found or error: {str(e)}")
        
        print("\n✅ Migration verification complete!")
        print("\nNext steps:")
        print("1. Enable Phone Auth in Supabase Dashboard")
        print("2. Configure SMS provider (Twilio/MessageBird)")
        print("3. Start implementing backend APIs")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying migration: {str(e)}")
        return False

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("MIGRATION 014: MANAGER REVIEW ENHANCEMENTS")
    print("=" * 60)
    
    success = run_migration()
    
    if success:
        print("\n✅ Migration instructions provided!")
        print("\nAfter running the migration in Supabase Dashboard, run:")
        print("  python backend/run_migration_014.py --verify")
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)
    
    # Check if --verify flag is passed
    if len(sys.argv) > 1 and sys.argv[1] == '--verify':
        verify_migration()

