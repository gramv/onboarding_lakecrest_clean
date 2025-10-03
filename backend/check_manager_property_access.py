#!/usr/bin/env python3
"""
Check manager property access for specific user
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

def check_manager_access():
    """Check manager access for gvemula@mail.yu.edu"""
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        supabase: Client = create_client(supabase_url, supabase_key)
        
        email = 'gvemula@mail.yu.edu'
        
        # Get the manager user
        logger.info(f"📊 Checking manager: {email}")
        user_result = supabase.table('users').select('*').eq('email', email).execute()
        
        if not user_result.data:
            logger.error(f"❌ Manager not found: {email}")
            return False
        
        manager = user_result.data[0]
        manager_id = manager['id']
        
        logger.info(f"\n{'='*80}")
        logger.info(f"MANAGER DETAILS:")
        logger.info(f"{'='*80}")
        logger.info(f"Name: {manager.get('first_name')} {manager.get('last_name')}")
        logger.info(f"Email: {manager.get('email')}")
        logger.info(f"ID: {manager_id}")
        logger.info(f"Role: {manager.get('role')}")
        logger.info(f"Property ID (direct): {manager.get('property_id')}")
        logger.info(f"{'='*80}\n")
        
        # Check property_managers table
        logger.info("Checking property_managers assignments...")
        pm_result = supabase.table('property_managers').select('*').eq('manager_id', manager_id).execute()
        
        if pm_result.data:
            logger.info(f"✅ Found {len(pm_result.data)} property assignments:\n")
            property_ids = []
            for pm in pm_result.data:
                property_id = pm.get('property_id')
                property_ids.append(property_id)
                
                # Get property details
                prop_result = supabase.table('properties').select('*').eq('id', property_id).execute()
                if prop_result.data:
                    prop = prop_result.data[0]
                    logger.info(f"  📍 Property: {prop.get('name')}")
                    logger.info(f"     ID: {property_id}")
                    logger.info(f"     Address: {prop.get('address')}, {prop.get('city')}, {prop.get('state')}")
                    logger.info("")
        else:
            logger.warning("⚠️  No properties assigned in property_managers table")
            property_ids = []
        
        # Check employees in those properties
        if property_ids:
            logger.info(f"\n{'='*80}")
            logger.info(f"EMPLOYEES IN MANAGER'S PROPERTIES:")
            logger.info(f"{'='*80}\n")
            
            # Get employees with completed onboarding in manager's properties
            emp_result = supabase.table('employees')\
                .select('*')\
                .in_('property_id', property_ids)\
                .eq('onboarding_status', 'completed')\
                .not_.is_('onboarding_completed_at', 'null')\
                .execute()
            
            if emp_result.data:
                logger.info(f"✅ Found {len(emp_result.data)} completed employees:\n")
                for emp in emp_result.data:
                    personal_info = emp.get('personal_info') or {}
                    first_name = personal_info.get('firstName', 'N/A')
                    last_name = personal_info.get('lastName', 'N/A')
                    
                    logger.info(f"  👤 {first_name} {last_name}")
                    logger.info(f"     Position: {emp.get('position')}")
                    logger.info(f"     Manager Review Status: {emp.get('manager_review_status')}")
                    logger.info(f"     I-9 Section 2 Status: {emp.get('i9_section2_status')}")
                    logger.info("")
            else:
                logger.warning("⚠️  No completed employees found in manager's properties")
        
        # Check the view with manager's properties
        logger.info(f"\n{'='*80}")
        logger.info(f"CHECKING VIEW FOR MANAGER'S PROPERTIES:")
        logger.info(f"{'='*80}\n")
        
        if property_ids:
            view_result = supabase.table('employees_pending_manager_review')\
                .select('*')\
                .in_('property_id', property_ids)\
                .execute()
            
            if view_result.data:
                logger.info(f"✅ Found {len(view_result.data)} employees in pending review view:\n")
                for emp in view_result.data:
                    logger.info(f"  📋 {emp.get('first_name')} {emp.get('last_name')}")
                    logger.info(f"     Position: {emp.get('position')}")
                    logger.info(f"     Property: {emp.get('property_name')}")
                    logger.info(f"     I-9 Urgency: {emp.get('i9_urgency_level')}")
                    logger.info("")
            else:
                logger.warning("⚠️  No employees in pending review view for manager's properties")
        else:
            logger.warning("⚠️  Cannot check view - no properties assigned")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_manager_access()
    sys.exit(0 if success else 1)

