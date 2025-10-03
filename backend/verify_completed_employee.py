#!/usr/bin/env python3
"""
Verify the most recently completed employee
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

def verify():
    """Verify completed employee"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get most recent completed employee
        logger.info("📊 Checking most recently completed employee...")
        
        result = supabase.table('employees')\
            .select('*')\
            .eq('onboarding_status', 'completed')\
            .order('onboarding_completed_at', desc=True)\
            .limit(1)\
            .execute()
        
        if result.data:
            emp = result.data[0]
            employee_id = emp['id']
            personal_info = emp.get('personal_info') or {}
            
            logger.info(f"\n{'='*80}")
            logger.info(f"MOST RECENTLY COMPLETED EMPLOYEE:")
            logger.info(f"{'='*80}")
            logger.info(f"✅ Name: {personal_info.get('firstName', 'N/A')} {personal_info.get('lastName', 'N/A')}")
            logger.info(f"   Email: {personal_info.get('email', 'N/A')}")
            logger.info(f"   ID: {employee_id}")
            logger.info(f"   Position: {emp.get('position')}")
            logger.info(f"   Property ID: {emp.get('property_id')}")
            logger.info(f"   Manager ID: {emp.get('manager_id')}")
            logger.info(f"   Onboarding Status: {emp.get('onboarding_status')}")
            logger.info(f"   Completed At: {emp.get('onboarding_completed_at')}")
            logger.info(f"   Manager Review Status: {emp.get('manager_review_status')}")
            logger.info(f"   I-9 Section 2 Status: {emp.get('i9_section2_status')}")
            logger.info(f"   I-9 Deadline: {emp.get('i9_section2_deadline')}")
            logger.info(f"{'='*80}\n")
            
            # Check for final_review signature
            logger.info("Checking for final_review signature...")
            sig_result = supabase.table('signed_documents')\
                .select('*')\
                .eq('employee_id', employee_id)\
                .eq('document_type', 'final_review')\
                .execute()
            
            if sig_result.data:
                logger.info(f"✅ Final review signature found!")
                logger.info(f"   Signed At: {sig_result.data[0].get('signed_at')}")
            else:
                logger.warning(f"⚠️  No final_review signature found!")
                logger.info("   This employee will NOT appear in manager review view")
            
            # Check if appears in view
            logger.info(f"\nChecking if employee appears in pending review view...")
            view_result = supabase.table('employees_pending_manager_review')\
                .select('*')\
                .eq('id', employee_id)\
                .execute()
            
            if view_result.data:
                logger.info(f"✅ SUCCESS! Employee appears in pending review view!")
                emp_view = view_result.data[0]
                logger.info(f"   Name: {emp_view.get('first_name')} {emp_view.get('last_name')}")
                logger.info(f"   Property: {emp_view.get('property_name')}")
                logger.info(f"   I-9 Urgency: {emp_view.get('i9_urgency_level')}")
                logger.info(f"   Days until deadline: {emp_view.get('days_until_i9_deadline')}")
            else:
                logger.warning(f"⚠️  Employee does NOT appear in pending review view")
                logger.info("\nPossible reasons:")
                logger.info("  1. No final_review signature")
                logger.info("  2. manager_review_status is not 'pending_review'")
            
            # Check all signed documents
            logger.info(f"\nAll signed documents for this employee:")
            all_docs = supabase.table('signed_documents')\
                .select('*')\
                .eq('employee_id', employee_id)\
                .execute()
            
            if all_docs.data:
                logger.info(f"Found {len(all_docs.data)} documents:")
                for doc in all_docs.data:
                    logger.info(f"  - {doc.get('document_type')} (signed: {doc.get('signed_at')})")
            else:
                logger.warning("  No documents found!")
            
        else:
            logger.warning("No completed employees found")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)

