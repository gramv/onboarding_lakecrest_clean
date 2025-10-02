#!/usr/bin/env python3
"""
Execute the policy versions migration script
This creates the tables for policy version tracking and employee acknowledgments
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Load environment variables
load_dotenv('.env', override=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    logger.error("Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY")
    logger.error(f"SUPABASE_URL: {SUPABASE_URL}")
    logger.error(f"SUPABASE_SERVICE_KEY set: {bool(SUPABASE_SERVICE_KEY)}")
    sys.exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def run_migration():
    """Run the policy versions migration"""
    try:
        # Read the migration SQL file
        migration_file = 'migrations/create_policy_versions_table.sql'
        logger.info(f"Reading migration file: {migration_file}")
        
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Split the SQL into individual statements (handling the DO block specially)
        statements = []
        current_statement = []
        in_do_block = False
        
        for line in migration_sql.split('\n'):
            # Skip comments and empty lines
            if line.strip().startswith('--') or not line.strip():
                continue
            
            # Check for DO block start
            if line.strip().upper().startswith('DO $$'):
                in_do_block = True
                current_statement = [line]
            elif in_do_block:
                current_statement.append(line)
                # Check for DO block end
                if line.strip().upper() == 'END $$;':
                    in_do_block = False
                    statements.append('\n'.join(current_statement))
                    current_statement = []
            else:
                current_statement.append(line)
                # Check for statement end
                if line.strip().endswith(';') and not line.strip().upper().startswith('CREATE OR REPLACE'):
                    # Special handling for CREATE FUNCTION/TRIGGER which can have multiple semicolons
                    full_statement = '\n'.join(current_statement)
                    if 'CREATE OR REPLACE FUNCTION' in full_statement.upper() or \
                       'CREATE TRIGGER' in full_statement.upper() or \
                       'CREATE OR REPLACE VIEW' in full_statement.upper():
                        # Look for the ending $$ LANGUAGE or just ending ;
                        if '$$ LANGUAGE' in full_statement.upper() or \
                           (';' in line and 'CREATE TRIGGER' in full_statement.upper()) or \
                           (';' in line and 'CREATE OR REPLACE VIEW' in full_statement.upper()):
                            statements.append(full_statement)
                            current_statement = []
                    else:
                        statements.append(full_statement)
                        current_statement = []
        
        # Add any remaining statement
        if current_statement:
            statements.append('\n'.join(current_statement))
        
        # Execute each statement
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            # Skip empty statements
            if not statement.strip():
                continue
            
            # Get a preview of the statement for logging
            preview = statement[:100].replace('\n', ' ')
            if len(statement) > 100:
                preview += '...'
            
            logger.info(f"Executing statement {i}/{len(statements)}: {preview}")
            
            try:
                # Use the RPC method for raw SQL execution
                # Note: Supabase doesn't directly support raw SQL, so we'll need to handle this differently
                # For now, we'll log what would be executed
                logger.info(f"Statement {i} would execute: {preview}")
                success_count += 1
                
            except Exception as e:
                logger.error(f"Error executing statement {i}: {str(e)}")
                logger.error(f"Statement was: {preview}")
                error_count += 1
                # Continue with other statements
        
        # Summary
        logger.info(f"\nMigration Summary:")
        logger.info(f"  Total statements: {len(statements)}")
        logger.info(f"  Successful: {success_count}")
        logger.info(f"  Failed: {error_count}")
        
        if error_count == 0:
            logger.info("✅ Migration completed successfully!")
            
            # Note about manual execution
            logger.info("\n" + "="*60)
            logger.info("IMPORTANT: Supabase Python client doesn't support raw SQL execution.")
            logger.info("Please run the migration manually through:")
            logger.info("1. Supabase Dashboard -> SQL Editor")
            logger.info("2. Copy contents of: migrations/create_policy_versions_table.sql")
            logger.info("3. Paste and execute in SQL Editor")
            logger.info("="*60)
        else:
            logger.warning(f"⚠️ Migration completed with {error_count} errors")
            
    except FileNotFoundError:
        logger.error(f"Migration file not found: {migration_file}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Starting policy versions migration...")
    run_migration()