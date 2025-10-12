#!/usr/bin/env python3
"""
Check which employees have manager_review_completed_at set and their property_id
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

from supabase import create_client

def check_completed_employees():
    """Check which employees have manager_review_completed_at set"""
    
    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in environment")
        return
    
    # Create Supabase client
    client = create_client(supabase_url, supabase_key)
    
    # Get employees with manager_review_completed_at set
    response = client.table('employees').select('id, personal_info, property_id, manager_review_status, manager_review_completed_at, employment_status, onboarding_status').not_.is_('manager_review_completed_at', 'null').execute()
    
    print(f'Found {len(response.data)} employees with manager_review_completed_at set:\n')
    
    target_property_id = '43020963-58d4-4ce8-9a84-139d60a2a5c1'
    target_property_count = 0
    
    for emp in response.data:
        first_name = emp.get('personal_info', {}).get('first_name', 'Unknown')
        last_name = emp.get('personal_info', {}).get('last_name', 'Unknown')
        property_id = emp.get('property_id')
        manager_review_status = emp.get('manager_review_status')
        employment_status = emp.get('employment_status')
        onboarding_status = emp.get('onboarding_status')
        
        is_target_property = property_id == target_property_id
        if is_target_property:
            target_property_count += 1
        
        property_marker = "🎯" if is_target_property else "  "
        print(f'{property_marker} {first_name} {last_name}:')
        print(f'     property_id={property_id}')
        print(f'     employment_status={employment_status}, onboarding_status={onboarding_status}')
        print(f'     manager_review_status={manager_review_status}')
        print()
    
    print(f'\n🎯 {target_property_count} employees belong to property {target_property_id}')

if __name__ == '__main__':
    check_completed_employees()

