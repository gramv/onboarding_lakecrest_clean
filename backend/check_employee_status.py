#!/usr/bin/env python3
"""
Check employee onboarding status
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

def check_employees():
    """Check employee statuses"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get all employees
        logger.info("📊 Fetching all employees...")
        result = supabase.table('employees').select('*').order('created_at', desc=True).limit(10).execute()
        
        if result.data:
            logger.info(f"\n{'='*80}")
            logger.info(f"RECENT EMPLOYEES (Last 10):")
            logger.info(f"{'='*80}\n")
            
            for emp in result.data:
                logger.info(f"Employee ID: {emp.get('id')}")
                logger.info(f"  Name: {emp.get('personal_info', {}).get('firstName', 'N/A')} {emp.get('personal_info', {}).get('lastName', 'N/A')}")
                logger.info(f"  Position: {emp.get('position')}")
                logger.info(f"  Property ID: {emp.get('property_id')}")
                logger.info(f"  Manager ID: {emp.get('manager_id')}")
                logger.info(f"  Onboarding Status: {emp.get('onboarding_status')}")
                logger.info(f"  Manager Review Status: {emp.get('manager_review_status')}")
                logger.info(f"  I-9 Section 2 Status: {emp.get('i9_section2_status')}")
                logger.info(f"  I-9 Section 2 Deadline: {emp.get('i9_section2_deadline')}")
                logger.info(f"  Start Date: {emp.get('start_date')}")
                logger.info(f"  Created: {emp.get('created_at')}")
                logger.info(f"{'-'*80}\n")
            
            # Check employees with completed onboarding
            completed = [e for e in result.data if e.get('onboarding_status') == 'completed']
            logger.info(f"\n{'='*80}")
            logger.info(f"EMPLOYEES WITH COMPLETED ONBOARDING: {len(completed)}")
            logger.info(f"{'='*80}\n")
            
            for emp in completed:
                logger.info(f"✅ {emp.get('personal_info', {}).get('firstName', 'N/A')} {emp.get('personal_info', {}).get('lastName', 'N/A')}")
                logger.info(f"   Manager Review Status: {emp.get('manager_review_status')}")
                logger.info(f"   I-9 Section 2 Status: {emp.get('i9_section2_status')}")
                logger.info("")
            
            # Check the view
            logger.info(f"\n{'='*80}")
            logger.info(f"CHECKING VIEW: employees_pending_manager_review")
            logger.info(f"{'='*80}\n")
            
            view_result = supabase.table('employees_pending_manager_review').select('*').execute()
            
            if view_result.data:
                logger.info(f"Found {len(view_result.data)} employees in pending review view:")
                for emp in view_result.data:
                    logger.info(f"  - {emp.get('first_name')} {emp.get('last_name')} (Status: {emp.get('manager_review_status')})")
            else:
                logger.warning("⚠️  No employees found in pending review view")
                logger.info("\nPossible reasons:")
                logger.info("  1. No employees have onboarding_status = 'completed'")
                logger.info("  2. manager_review_status is not 'pending_review' or 'manager_reviewing'")
                logger.info("  3. The view query has an issue")
        else:
            logger.warning("No employees found in database")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_employees()
    sys.exit(0 if success else 1)

