#!/usr/bin/env python3
"""
Apply SQL migrations directly to Supabase using REST API

This script executes SQL migrations using the Supabase service key,
allowing us to apply schema changes programmatically.

Usage:
    python scripts/apply_migrations.py migrations/001_create_audit_trail.sql
"""

import sys
import os
from pathlib import Path
import requests
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


def execute_sql(sql: str, db_url: str) -> bool:
    """
    Execute SQL using psycopg2 direct connection

    Args:
        sql: SQL statement to execute
        db_url: PostgreSQL connection URL

    Returns:
        True if successful, False otherwise
    """
    try:
        import psycopg2
        from psycopg2 import sql as psycopg2_sql

        logger.info("🔌 Connecting to database...")

        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.autocommit = True  # Important for DDL statements

        cursor = conn.cursor()

        logger.info("🚀 Executing SQL migration...")
        logger.info("")

        # Execute SQL
        cursor.execute(sql)

        # Fetch any notices/messages
        for notice in conn.notices:
            logger.info(f"   {notice.strip()}")

        cursor.close()
        conn.close()

        logger.info("")
        logger.info("✅ Migration executed successfully!")

        return True

    except ImportError:
        logger.error("❌ psycopg2 not installed!")
        logger.error("")
        logger.error("Install it with:")
        logger.error("  pip install psycopg2-binary")
        logger.error("")
        logger.info("📋 SQL to execute manually:")
        logger.info("=" * 80)
        print(sql)
        logger.info("=" * 80)
        return False

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        logger.error("")
        logger.info("📋 SQL that failed:")
        logger.info("=" * 80)
        print(sql)
        logger.info("=" * 80)
        return False


def apply_migration(sql_file: str):
    """Apply a SQL migration file"""

    # Get database URL
    db_url = os.getenv('DATABASE_URL')

    if not db_url:
        logger.error("❌ DATABASE_URL must be set in .env")
        logger.error("")
        logger.error("Get it from Supabase Dashboard:")
        logger.error("  Project Settings → Database → Connection String → URI")
        logger.error("")
        logger.error("Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres")
        return False

    # Read SQL file
    sql_path = Path(__file__).parent.parent / sql_file
    if not sql_path.exists():
        logger.error(f"❌ SQL file not found: {sql_path}")
        return False

    logger.info("")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info(f"📄 APPLYING MIGRATION: {sql_path.name}")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("")

    with open(sql_path, 'r') as f:
        sql = f.read()

    # Execute SQL
    success = execute_sql(sql, db_url)

    if success:
        logger.info("")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("✅ MIGRATION COMPLETE")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("")

    return success


if __name__ == '__main__':
    if len(sys.argv) < 2:
        logger.error("Usage: python scripts/apply_migrations.py <sql_file>")
        logger.error("Example: python scripts/apply_migrations.py migrations/001_create_audit_trail.sql")
        sys.exit(1)
    
    sql_file = sys.argv[1]
    success = apply_migration(sql_file)
    sys.exit(0 if success else 1)

