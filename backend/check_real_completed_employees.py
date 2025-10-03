#!/usr/bin/env python3
"""
Check employees who actually completed onboarding
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

def check_completed():
    """Check employees with onboarding_completed_at"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get employees with onboarding_completed_at set
        logger.info("📊 Checking employees who clicked 'Complete Onboarding'...")
        
        result = supabase.table('employees')\
            .select('*')\
            .not_.is_('onboarding_completed_at', 'null')\
            .order('onboarding_completed_at', desc=True)\
            .execute()
        
        if result.data:
            logger.info(f"\n{'='*80}")
            logger.info(f"EMPLOYEES WHO CLICKED 'COMPLETE ONBOARDING': {len(result.data)}")
            logger.info(f"{'='*80}\n")
            
            for emp in result.data:
                personal_info = emp.get('personal_info') or {}
                first_name = personal_info.get('firstName', 'N/A')
                last_name = personal_info.get('lastName', 'N/A')
                email = personal_info.get('email', 'N/A')
                
                logger.info(f"✅ {first_name} {last_name}")
                logger.info(f"   Email: {email}")
                logger.info(f"   ID: {emp.get('id')}")
                logger.info(f"   Position: {emp.get('position')}")
                logger.info(f"   Property ID: {emp.get('property_id')}")
                logger.info(f"   Manager ID: {emp.get('manager_id')}")
                logger.info(f"   Onboarding Status: {emp.get('onboarding_status')}")
                logger.info(f"   Completed At: {emp.get('onboarding_completed_at')}")
                logger.info(f"   Manager Review Status: {emp.get('manager_review_status')}")
                logger.info(f"   I-9 Section 2 Status: {emp.get('i9_section2_status')}")
                logger.info(f"   I-9 Deadline: {emp.get('i9_section2_deadline')}")
                logger.info(f"   Has Personal Info: {personal_info is not None and len(personal_info) > 0}")
                logger.info("")
        else:
            logger.warning("⚠️  No employees found with onboarding_completed_at set")
            logger.info("\nThis means no one has clicked 'Complete Onboarding' button yet.")
            logger.info("The employees you completed might have been done before we added the column.")
        
        # Check if the view shows them
        logger.info(f"\n{'='*80}")
        logger.info("CHECKING VIEW AFTER MIGRATION:")
        logger.info(f"{'='*80}\n")
        
        view_result = supabase.table('employees_pending_manager_review').select('*').execute()
        
        if view_result.data:
            logger.info(f"✅ Found {len(view_result.data)} employees in pending review view:\n")
            for emp in view_result.data:
                logger.info(f"  📋 {emp.get('first_name')} {emp.get('last_name')}")
                logger.info(f"     Position: {emp.get('position')}")
                logger.info(f"     Property: {emp.get('property_name')}")
                logger.info(f"     Completed: {emp.get('onboarding_completed_at')}")
                logger.info(f"     I-9 Urgency: {emp.get('i9_urgency_level')}")
                logger.info("")
        else:
            logger.warning("⚠️  No employees in pending review view")
            logger.info("\nThis is expected if:")
            logger.info("  1. No employees have clicked 'Complete Onboarding' since we added the column")
            logger.info("  2. You need to complete a new employee onboarding to test")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_completed()
    sys.exit(0 if success else 1)

