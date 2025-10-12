#!/usr/bin/env python3
"""
Backfill manager_review_status for employees who already completed manager review
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
from datetime import datetime, timezone

def backfill_manager_reviews():
    """Backfill manager_review_status for employees who already completed manager review"""

    # Get Supabase credentials
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment")
        return
    
    # Create Supabase client
    client = create_client(supabase_url, supabase_key)
    
    # Get all employees
    response = client.table('employees').select('*').execute()
    
    print(f"Found {len(response.data)} total employees")

    # Count employees by status
    completed_onboarding = 0
    has_review_completed_at = 0
    has_review_status = 0

    for emp in response.data:
        if emp.get('onboarding_status') == 'completed':
            completed_onboarding += 1
        if emp.get('manager_review_completed_at') is not None:
            has_review_completed_at += 1
        if emp.get('manager_review_status') is not None:
            has_review_status += 1

    print(f"  - {completed_onboarding} have onboarding_status='completed'")
    print(f"  - {has_review_completed_at} have manager_review_completed_at set")
    print(f"  - {has_review_status} have manager_review_status set")
    print()

    # Show employees with manager_review_completed_at
    print("Employees with manager_review_completed_at:")
    for emp in response.data:
        if emp.get('manager_review_completed_at') is not None:
            first_name = emp.get('personal_info', {}).get('first_name', 'Unknown')
            last_name = emp.get('personal_info', {}).get('last_name', 'Unknown')
            employment_status = emp.get('employment_status', 'unknown')
            onboarding_status = emp.get('onboarding_status', 'unknown')
            manager_review_status = emp.get('manager_review_status', 'unknown')

            # Check if meets all criteria
            meets_criteria = (
                employment_status == 'active' and
                onboarding_status == 'completed' and
                manager_review_status == 'completed' and
                emp.get('manager_review_completed_at') is not None
            )

            status_icon = "✅" if meets_criteria else "❌"
            print(f"  {status_icon} {first_name} {last_name}:")
            print(f"      employment_status={employment_status}, onboarding_status={onboarding_status}")
            print(f"      manager_review_status={manager_review_status}, manager_review_completed_at={emp.get('manager_review_completed_at')}")
    print()

    updated_count = 0
    for emp in response.data:
        # Check if employee has manager_review_completed_at
        # but doesn't have manager_review_status='completed'
        if (emp.get('manager_review_completed_at') is not None and
            emp.get('manager_review_status') != 'completed'):
            
            # Update the employee with manager_review_status
            update_data = {
                'manager_review_status': 'completed',
                'manager_reviewed_by': emp.get('manager_id'),  # Use the assigned manager
            }
            
            client.table('employees').update(update_data).eq('id', emp['id']).execute()
            
            first_name = emp.get('personal_info', {}).get('first_name', 'Unknown')
            last_name = emp.get('personal_info', {}).get('last_name', 'Unknown')
            print(f"✅ Updated employee {emp['id']} - {first_name} {last_name}")
            updated_count += 1
    
    print(f"\n🎉 Backfilled {updated_count} employees with manager_review_status='completed'")

if __name__ == '__main__':
    backfill_manager_reviews()

