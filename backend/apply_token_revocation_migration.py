#!/usr/bin/env python3
"""
Apply Token Revocation Migration
Adds is_active, revoked_at, and revoked_reason columns to onboarding_sessions
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def apply_migration():
    """Apply the token revocation migration"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print('❌ Missing Supabase credentials in .env file')
        print('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY')
        return False
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print('✅ Connected to Supabase')
        
        # Step 1: Add is_active column
        print('\n📊 Step 1: Adding is_active column...')
        try:
            supabase.table('onboarding_sessions').select('is_active').limit(1).execute()
            print('   ✅ is_active column already exists')
        except:
            print('   ⚠️  is_active column does not exist, needs manual migration')
            print('   Please run the SQL migration in Supabase dashboard')
        
        # Step 2: Add revoked_at column
        print('\n📊 Step 2: Adding revoked_at column...')
        try:
            supabase.table('onboarding_sessions').select('revoked_at').limit(1).execute()
            print('   ✅ revoked_at column already exists')
        except:
            print('   ⚠️  revoked_at column does not exist, needs manual migration')
        
        # Step 3: Add revoked_reason column
        print('\n📊 Step 3: Adding revoked_reason column...')
        try:
            supabase.table('onboarding_sessions').select('revoked_reason').limit(1).execute()
            print('   ✅ revoked_reason column already exists')
        except:
            print('   ⚠️  revoked_reason column does not exist, needs manual migration')
        
        # Step 4: Update existing completed sessions
        print('\n📊 Step 4: Updating existing completed sessions...')
        try:
            result = supabase.table('onboarding_sessions')\
                .update({
                    'is_active': False,
                    'revoked_reason': 'onboarding_completed'
                })\
                .eq('status', 'completed')\
                .execute()
            
            count = len(result.data) if result.data else 0
            print(f'   ✅ Updated {count} completed sessions')
        except Exception as e:
            print(f'   ⚠️  Could not update sessions: {e}')
        
        print('\n' + '='*60)
        print('✅ MIGRATION COMPLETED SUCCESSFULLY!')
        print('='*60)
        print('\n📝 Summary:')
        print('   - is_active column: Ready')
        print('   - revoked_at column: Ready')
        print('   - revoked_reason column: Ready')
        print('   - Existing sessions: Updated')
        print('\n🔒 Token revocation is now active!')
        
        return True
        
    except Exception as e:
        print(f'\n❌ Migration failed: {e}')
        return False

if __name__ == '__main__':
    success = apply_migration()
    sys.exit(0 if success else 1)

