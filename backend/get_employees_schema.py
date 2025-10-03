#!/usr/bin/env python3
"""
Get employees table schema from Supabase
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

def get_schema():
    """Get employees table schema"""
    try:
        # Get Supabase credentials
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            logger.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")
            return False
        
        logger.info(f"🔗 Connecting to Supabase: {supabase_url}")
        
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get employees table schema by querying a sample record
        logger.info("📊 Fetching employees table schema...")
        
        result = supabase.table('employees').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            employee = result.data[0]
            logger.info("\n" + "="*60)
            logger.info("EMPLOYEES TABLE COLUMNS:")
            logger.info("="*60)
            for column_name in sorted(employee.keys()):
                value = employee[column_name]
                value_type = type(value).__name__
                logger.info(f"  {column_name:40} ({value_type})")
            logger.info("="*60 + "\n")
            
            # Also get properties table schema
            logger.info("📊 Fetching properties table schema...")
            prop_result = supabase.table('properties').select('*').limit(1).execute()
            
            if prop_result.data and len(prop_result.data) > 0:
                prop = prop_result.data[0]
                logger.info("\n" + "="*60)
                logger.info("PROPERTIES TABLE COLUMNS:")
                logger.info("="*60)
                for column_name in sorted(prop.keys()):
                    value = prop[column_name]
                    value_type = type(value).__name__
                    logger.info(f"  {column_name:40} ({value_type})")
                logger.info("="*60 + "\n")
            
            # Get users table schema
            logger.info("📊 Fetching users table schema...")
            user_result = supabase.table('users').select('*').limit(1).execute()
            
            if user_result.data and len(user_result.data) > 0:
                user = user_result.data[0]
                logger.info("\n" + "="*60)
                logger.info("USERS TABLE COLUMNS:")
                logger.info("="*60)
                for column_name in sorted(user.keys()):
                    value = user[column_name]
                    value_type = type(value).__name__
                    logger.info(f"  {column_name:40} ({value_type})")
                logger.info("="*60 + "\n")
            
            return True
        else:
            logger.warning("⚠️  No employees found in database")
            return False
        
    except Exception as e:
        logger.error(f"❌ Failed to get schema: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = get_schema()
    sys.exit(0 if success else 1)

