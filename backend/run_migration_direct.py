#!/usr/bin/env python3
"""
Run Migration 007 using Supabase REST API
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests
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

def run_migration():
    """Run the migration using Supabase REST API"""
    try:
        # Get Supabase credentials
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            logger.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")
            return False
        
        logger.info(f"🔗 Connecting to Supabase: {supabase_url}")
        
        # Read migration file
        migration_file = Path(__file__).parent / 'supabase' / 'migrations' / '007_manager_review_system.sql'
        
        if not migration_file.exists():
            logger.error(f"❌ Migration file not found: {migration_file}")
            return False
        
        logger.info(f"📄 Reading migration file: {migration_file}")
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        # Use Supabase REST API to execute SQL
        url = f"{supabase_url}/rest/v1/rpc/exec_sql"
        
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'query': sql_content
        }
        
        logger.info("⚙️  Executing migration via Supabase REST API...")
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            logger.info("✅ Migration executed successfully!")
            return True
        else:
            logger.error(f"❌ Migration failed: {response.status_code}")
            logger.error(f"Response: {response.text}")
            return False
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

