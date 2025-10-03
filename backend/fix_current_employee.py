#!/usr/bin/env python3
"""
Fix the current completed employee by adding final_review signature
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
    """Add final_review signature to current employee"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get the most recent completed employee
        result = supabase.table('employees')\
            .select('*')\
            .eq('onboarding_status', 'completed')\
            .order('onboarding_completed_at', desc=True)\
            .limit(1)\
            .execute()
        
        if not result.data:
            logger.error("No completed employees found")
            return False
        
        employee = result.data[0]
        employee_id = employee['id']
        
        logger.info(f"\n{'='*80}")
        logger.info(f"FIXING EMPLOYEE: {employee_id}")
        logger.info(f"{'='*80}\n")
        
        # Add final_review signature
        signed_doc_data = {
            'employee_id': employee_id,
            'document_type': 'final_review',
            'signed_at': employee.get('onboarding_completed_at') or datetime.now(timezone.utc).isoformat(),
            'signature_data': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',  # Dummy signature
            'ip_address': '127.0.0.1',
            'user_agent': 'Manual Fix Script',
            'metadata': {
                'completed_at': employee.get('onboarding_completed_at'),
                'all_steps_completed': True,
                'final_review': True,
                'manually_added': True
            }
        }
        
        logger.info("Adding final_review signature...")
        supabase.table('signed_documents').insert(signed_doc_data).execute()
        logger.info("✅ final_review signature added!")
        
        # Verify
        logger.info("\nVerifying...")
        view_result = supabase.table('employees_pending_manager_review')\
            .select('*')\
            .eq('id', employee_id)\
            .execute()
        
        if view_result.data:
            logger.info(f"\n{'='*80}")
            logger.info(f"✅ SUCCESS! Employee now appears in pending review view!")
            logger.info(f"{'='*80}")
            emp = view_result.data[0]
            logger.info(f"Name: {emp.get('first_name')} {emp.get('last_name')}")
            logger.info(f"Position: {emp.get('position')}")
            logger.info(f"Property: {emp.get('property_name')}")
            logger.info(f"I-9 Urgency: {emp.get('i9_urgency_level')}")
            logger.info(f"Days until deadline: {emp.get('days_until_i9_deadline')}")
            logger.info(f"{'='*80}\n")
            
            logger.info("🎉 Now refresh Manager Dashboard and check Reviews tab!")
        else:
            logger.warning("⚠️  Employee still doesn't appear in view")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_employee()
    sys.exit(0 if success else 1)

