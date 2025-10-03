#!/usr/bin/env python3
"""
Check signed_documents table
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

def check_table():
    """Check signed_documents table"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Check if table exists and get schema
        logger.info("📊 Checking signed_documents table...")
        result = supabase.table('signed_documents').select('*').limit(1).execute()
        
        if result.data and len(result.data) > 0:
            doc = result.data[0]
            logger.info("\n" + "="*60)
            logger.info("SIGNED_DOCUMENTS TABLE COLUMNS:")
            logger.info("="*60)
            for column_name in sorted(doc.keys()):
                value = doc[column_name]
                value_type = type(value).__name__
                logger.info(f"  {column_name:40} ({value_type})")
            logger.info("="*60 + "\n")
        else:
            logger.info("Table exists but is empty")
        
        # Check for final_review documents
        logger.info("Checking for final_review documents...")
        final_review = supabase.table('signed_documents')\
            .select('*')\
            .eq('document_type', 'final_review')\
            .execute()
        
        if final_review.data:
            logger.info(f"✅ Found {len(final_review.data)} final_review documents")
            for doc in final_review.data[:5]:  # Show first 5
                logger.info(f"  Employee ID: {doc.get('employee_id')}")
                logger.info(f"  Signed At: {doc.get('signed_at')}")
                logger.info("")
        else:
            logger.warning("⚠️  No final_review documents found")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_table()
    sys.exit(0 if success else 1)

