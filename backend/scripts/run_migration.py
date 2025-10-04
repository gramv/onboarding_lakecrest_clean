#!/usr/bin/env python3
"""
Run database migrations

Usage:
    python scripts/run_migration.py migrations/001_create_audit_trail.sql
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from supabase import create_client
import logging

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration(sql_file: str):
    """Run a SQL migration file"""
    
    # Get Supabase credentials
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not url or not key:
        logger.error("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return False
    
    # Read SQL file
    sql_path = Path(__file__).parent.parent / sql_file
    if not sql_path.exists():
        logger.error(f"❌ SQL file not found: {sql_path}")
        return False
    
    logger.info(f"📄 Reading migration: {sql_path}")
    with open(sql_path, 'r') as f:
        sql = f.read()
    
    # Create Supabase client
    logger.info("🔌 Connecting to Supabase...")
    supabase = create_client(url, key)
    
    # Execute SQL
    logger.info("🚀 Executing migration...")
    try:
        # Note: Supabase Python client doesn't have direct SQL execution
        # We need to use the REST API or run this in Supabase SQL Editor
        logger.warning("⚠️  Supabase Python client doesn't support direct SQL execution")
        logger.info("📋 Please run this SQL in Supabase SQL Editor:")
        logger.info("=" * 80)
        print(sql)
        logger.info("=" * 80)
        logger.info("\n✅ Copy the SQL above and run it in Supabase SQL Editor")
        logger.info("   Dashboard → SQL Editor → New Query → Paste → Run")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) < 2:
        logger.error("Usage: python scripts/run_migration.py <sql_file>")
        logger.error("Example: python scripts/run_migration.py migrations/001_create_audit_trail.sql")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    success = run_migration(sql_file)
    sys.exit(0 if success else 1)

