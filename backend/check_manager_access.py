#!/usr/bin/env python3
"""
Check manager access and property assignments
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

def check_access():
    """Check manager access"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get all managers
        logger.info("📊 Fetching all managers...")
        managers = supabase.table('users').select('*').eq('role', 'manager').execute()
        
        if managers.data:
            logger.info(f"\n{'='*80}")
            logger.info(f"MANAGERS ({len(managers.data)}):")
            logger.info(f"{'='*80}\n")
            
            for mgr in managers.data:
                logger.info(f"Manager: {mgr.get('first_name')} {mgr.get('last_name')} ({mgr.get('email')})")
                logger.info(f"  ID: {mgr.get('id')}")
                logger.info(f"  Property ID: {mgr.get('property_id')}")
                
                # Check property_managers table
                pm_result = supabase.table('property_managers').select('*').eq('manager_id', mgr.get('id')).execute()
                if pm_result.data:
                    logger.info(f"  Assigned Properties (via property_managers): {len(pm_result.data)}")
                    for pm in pm_result.data:
                        logger.info(f"    - Property ID: {pm.get('property_id')}")
                else:
                    logger.info(f"  ⚠️  No properties assigned in property_managers table")
                
                logger.info("")
        
        # Get all employees with their property assignments
        logger.info(f"\n{'='*80}")
        logger.info("EMPLOYEES IN PENDING REVIEW:")
        logger.info(f"{'='*80}\n")
        
        employees = supabase.table('employees_pending_manager_review').select('*').limit(10).execute()
        
        if employees.data:
            logger.info(f"Found {len(employees.data)} employees in view (showing first 10):\n")
            for emp in employees.data:
                logger.info(f"Employee ID: {emp.get('id')}")
                logger.info(f"  Property ID: {emp.get('property_id')}")
                logger.info(f"  Manager ID: {emp.get('manager_id')}")
                logger.info(f"  Position: {emp.get('position')}")
                logger.info(f"  Status: {emp.get('manager_review_status')}")
                logger.info("")
        else:
            logger.warning("No employees in pending review view")
        
        # Get all properties
        logger.info(f"\n{'='*80}")
        logger.info("ALL PROPERTIES:")
        logger.info(f"{'='*80}\n")
        
        properties = supabase.table('properties').select('*').execute()
        if properties.data:
            for prop in properties.data:
                logger.info(f"Property: {prop.get('name')}")
                logger.info(f"  ID: {prop.get('id')}")
                logger.info("")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_access()
    sys.exit(0 if success else 1)

