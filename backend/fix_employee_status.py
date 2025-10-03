#!/usr/bin/env python3
"""
Fix employee onboarding status for testing
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone
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

def fix_employee():
    """Fix the most recent employee for testing"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get the most recent employee
        result = supabase.table('employees').select('*').order('created_at', desc=True).limit(1).execute()
        
        if not result.data:
            logger.error("No employees found")
            return False
        
        employee = result.data[0]
        employee_id = employee['id']
        
        logger.info(f"\n{'='*80}")
        logger.info(f"UPDATING EMPLOYEE FOR TESTING")
        logger.info(f"{'='*80}")
        logger.info(f"Employee ID: {employee_id}")
        logger.info(f"Position: {employee.get('position')}")
        logger.info(f"Current Status: {employee.get('onboarding_status')}")
        logger.info(f"Current Manager Review Status: {employee.get('manager_review_status')}")
        
        # Update the employee
        update_data = {
            'onboarding_status': 'completed',
            'onboarding_completed_at': datetime.now(timezone.utc).isoformat(),
            'manager_review_status': 'pending_review',
            'i9_section2_status': 'pending',
            'start_date': '2025-10-03'  # Set a start date for deadline calculation
        }
        
        logger.info(f"\nUpdating with data: {update_data}")
        
        update_result = supabase.table('employees').update(update_data).eq('id', employee_id).execute()
        
        logger.info(f"\n✅ Employee updated successfully!")
        
        # Calculate I-9 deadline
        try:
            deadline_result = supabase.rpc(
                'calculate_i9_section2_deadline',
                {'start_date': '2025-10-03'}
            ).execute()
            
            if deadline_result.data:
                logger.info(f"📅 I-9 Section 2 Deadline: {deadline_result.data}")
                
                # Update with deadline
                supabase.table('employees').update({
                    'i9_section2_deadline': deadline_result.data
                }).eq('id', employee_id).execute()
                
                logger.info(f"✅ I-9 deadline set!")
        except Exception as e:
            logger.warning(f"Could not calculate deadline: {e}")
        
        # Verify the update
        verify_result = supabase.table('employees').select('*').eq('id', employee_id).execute()
        
        if verify_result.data:
            emp = verify_result.data[0]
            logger.info(f"\n{'='*80}")
            logger.info(f"VERIFICATION - UPDATED EMPLOYEE:")
            logger.info(f"{'='*80}")
            logger.info(f"Onboarding Status: {emp.get('onboarding_status')}")
            logger.info(f"Manager Review Status: {emp.get('manager_review_status')}")
            logger.info(f"I-9 Section 2 Status: {emp.get('i9_section2_status')}")
            logger.info(f"I-9 Section 2 Deadline: {emp.get('i9_section2_deadline')}")
            logger.info(f"Start Date: {emp.get('start_date')}")
            logger.info(f"{'='*80}\n")
        
        # Check if it appears in the view
        logger.info("Checking if employee appears in pending review view...")
        view_result = supabase.table('employees_pending_manager_review').select('*').eq('id', employee_id).execute()
        
        if view_result.data:
            logger.info(f"✅ SUCCESS! Employee appears in pending review view!")
            logger.info(f"   Name: {view_result.data[0].get('first_name')} {view_result.data[0].get('last_name')}")
            logger.info(f"   Urgency: {view_result.data[0].get('i9_urgency_level')}")
            logger.info(f"   Days until deadline: {view_result.data[0].get('days_until_i9_deadline')}")
        else:
            logger.warning("⚠️  Employee does NOT appear in pending review view")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_employee()
    sys.exit(0 if success else 1)

