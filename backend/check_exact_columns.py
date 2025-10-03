#!/usr/bin/env python3
"""
Check exact columns in employees table
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

def check_columns():
    """Check what columns exist"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get a sample employee to see all columns
        result = supabase.table('employees').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            emp = result.data[0]
            all_columns = sorted(emp.keys())
            
            logger.info("\n" + "="*60)
            logger.info("ALL COLUMNS IN EMPLOYEES TABLE:")
            logger.info("="*60)
            for col in all_columns:
                logger.info(f"  {col}")
            logger.info("="*60)
            
            # Check which columns we need to add
            needed_columns = [
                'manager_review_status',
                'manager_review_started_at',
                'manager_review_completed_at',
                'manager_reviewed_by',
                'manager_review_comments',
                'i9_section2_status',
                'i9_section2_completed_at',
                'i9_section2_deadline',
                'i9_section2_completed_by'
            ]
            
            logger.info("\n" + "="*60)
            logger.info("COLUMN STATUS:")
            logger.info("="*60)
            for col in needed_columns:
                exists = col in all_columns
                status = "✅ EXISTS" if exists else "❌ NEEDS TO BE ADDED"
                logger.info(f"  {col:40} {status}")
            logger.info("="*60 + "\n")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_columns()
    sys.exit(0 if success else 1)

