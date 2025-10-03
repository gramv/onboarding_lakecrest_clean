#!/usr/bin/env python3
"""
Fix existing employees to mark them as completed for testing
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

def fix_employees():
    """Fix existing employees for testing"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get all employees that are not completed
        result = supabase.table('employees')\
            .select('*')\
            .neq('onboarding_status', 'completed')\
            .order('created_at', desc=True)\
            .execute()
        
        if not result.data:
            logger.info("No employees need fixing")
            return True
        
        logger.info(f"\n{'='*80}")
        logger.info(f"FOUND {len(result.data)} EMPLOYEES TO FIX")
        logger.info(f"{'='*80}\n")
        
        for employee in result.data:
            employee_id = employee['id']
            name = f"{employee.get('personal_info', {}).get('firstName', 'N/A')} {employee.get('personal_info', {}).get('lastName', 'N/A')}"
            
            logger.info(f"Fixing employee: {name} ({employee_id})")
            logger.info(f"  Current status: {employee.get('onboarding_status')}")
            
            # Update the employee
            update_data = {
                'onboarding_status': 'completed',
                'onboarding_completed_at': datetime.now(timezone.utc).isoformat(),
                'manager_review_status': 'pending_review',
                'i9_section2_status': 'pending',
            }
            
            # Set start_date if not set
            if not employee.get('start_date'):
                update_data['start_date'] = '2025-10-03'
            
            # Calculate I-9 deadline
            start_date = employee.get('start_date') or '2025-10-03'
            try:
                deadline_result = supabase.rpc(
                    'calculate_i9_section2_deadline',
                    {'start_date': start_date}
                ).execute()
                
                if deadline_result.data:
                    update_data['i9_section2_deadline'] = deadline_result.data
                    logger.info(f"  I-9 deadline: {deadline_result.data}")
            except Exception as e:
                logger.warning(f"  Could not calculate deadline: {e}")
            
            # Update employee
            supabase.table('employees').update(update_data).eq('id', employee_id).execute()
            logger.info(f"  ✅ Updated to completed\n")
        
        # Verify by checking the view
        logger.info(f"\n{'='*80}")
        logger.info("VERIFICATION - Checking pending review view...")
        logger.info(f"{'='*80}\n")
        
        view_result = supabase.table('employees_pending_manager_review').select('*').execute()
        
        if view_result.data:
            logger.info(f"✅ SUCCESS! Found {len(view_result.data)} employees in pending review view:\n")
            for emp in view_result.data:
                logger.info(f"  📋 {emp.get('first_name')} {emp.get('last_name')}")
                logger.info(f"     Position: {emp.get('position')}")
                logger.info(f"     Property: {emp.get('property_name')}")
                logger.info(f"     I-9 Urgency: {emp.get('i9_urgency_level')}")
                logger.info(f"     Days until deadline: {emp.get('days_until_i9_deadline')}")
                logger.info(f"     Status: {emp.get('manager_review_status')}\n")
        else:
            logger.warning("⚠️  No employees found in pending review view")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_employees()
    sys.exit(0 if success else 1)

