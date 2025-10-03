#!/usr/bin/env python3
"""
Check existing i9_section2 columns
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
    """Check i9 columns"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get a sample employee
        result = supabase.table('employees').select('i9_section2_deadline, i9_section2_completed_at').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            emp = result.data[0]
            logger.info(f"i9_section2_deadline: {emp.get('i9_section2_deadline')} (type: {type(emp.get('i9_section2_deadline'))})")
            logger.info(f"i9_section2_completed_at: {emp.get('i9_section2_completed_at')} (type: {type(emp.get('i9_section2_completed_at'))})")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_columns()
    sys.exit(0 if success else 1)

