#!/usr/bin/env python3
"""
Add missing onboarding_completed_at column
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

def add_column():
    """Add the missing column"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        sql = """
        -- Add missing column
        ALTER TABLE employees 
        ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
        
        COMMENT ON COLUMN employees.onboarding_completed_at IS 'Timestamp when employee completed onboarding';
        """
        
        logger.info("Adding onboarding_completed_at column...")
        logger.info(f"SQL: {sql}")
        
        # Execute via RPC or direct SQL
        # Note: Supabase Python client doesn't support direct SQL execution
        # You need to run this in Supabase SQL Editor
        
        logger.info("\n" + "="*80)
        logger.info("PLEASE RUN THIS SQL IN SUPABASE SQL EDITOR:")
        logger.info("="*80)
        print(sql)
        logger.info("="*80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = add_column()
    sys.exit(0 if success else 1)

