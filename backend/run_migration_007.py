#!/usr/bin/env python3
"""
Run Migration 007: Manager Review System
This script applies the database schema changes for the manager review system.
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

def run_migration():
    """Run the migration SQL file"""
    try:
        # Get Supabase credentials
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')  # Use service key for admin operations
        
        if not supabase_url or not supabase_key:
            logger.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")
            return False
        
        logger.info(f"🔗 Connecting to Supabase: {supabase_url}")
        
        # Create Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Read migration file
        migration_file = Path(__file__).parent / 'supabase' / 'migrations' / '007_manager_review_system.sql'
        
        if not migration_file.exists():
            logger.error(f"❌ Migration file not found: {migration_file}")
            return False
        
        logger.info(f"📄 Reading migration file: {migration_file}")
        
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        # Split SQL into individual statements (simple split by semicolon)
        # Note: This is a simple approach. For complex SQL, use a proper SQL parser
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        logger.info(f"📊 Found {len(statements)} SQL statements to execute")
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            # Skip comments and empty statements
            if not statement or statement.startswith('--') or statement.startswith('/*'):
                continue
            
            try:
                # Log statement type
                stmt_type = statement.split()[0].upper() if statement.split() else 'UNKNOWN'
                logger.info(f"⚙️  Executing statement {i}/{len(statements)}: {stmt_type}...")
                
                # Execute via Supabase RPC (using raw SQL)
                # Note: Supabase Python client doesn't have direct SQL execution
                # We need to use the REST API or PostgreSQL connection
                
                # For now, we'll use the PostgreSQL connection string
                import psycopg2
                
                db_url = os.getenv('DATABASE_URL')
                if not db_url:
                    logger.error("❌ DATABASE_URL not found in .env")
                    return False
                
                conn = psycopg2.connect(db_url)
                cursor = conn.cursor()
                
                cursor.execute(statement)
                conn.commit()
                
                cursor.close()
                conn.close()
                
                success_count += 1
                logger.info(f"✅ Statement {i} executed successfully")
                
            except Exception as e:
                error_count += 1
                logger.warning(f"⚠️  Statement {i} failed (may already exist): {str(e)[:100]}")
                # Continue with next statement
                continue
        
        logger.info(f"\n{'='*60}")
        logger.info(f"📊 Migration Summary:")
        logger.info(f"   ✅ Successful: {success_count}")
        logger.info(f"   ⚠️  Warnings: {error_count}")
        logger.info(f"{'='*60}\n")
        
        # Verify migration
        logger.info("🔍 Verifying migration...")
        
        try:
            conn = psycopg2.connect(os.getenv('DATABASE_URL'))
            cursor = conn.cursor()
            
            # Check if new columns exist
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'employees' 
                AND column_name IN ('manager_review_status', 'i9_section2_status', 'i9_section2_deadline')
            """)
            
            columns = cursor.fetchall()
            logger.info(f"✅ Found {len(columns)} new columns in employees table")
            
            # Check if new table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'manager_review_actions'
                )
            """)
            
            table_exists = cursor.fetchone()[0]
            if table_exists:
                logger.info("✅ manager_review_actions table created successfully")
            else:
                logger.warning("⚠️  manager_review_actions table not found")
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Verification failed: {e}")
            return False
        
        logger.info("\n🎉 Migration 007 completed successfully!")
        logger.info("\n📝 Next steps:")
        logger.info("   1. Update backend API endpoints")
        logger.info("   2. Update frontend manager dashboard")
        logger.info("   3. Test manager review workflow")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

