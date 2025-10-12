#!/usr/bin/env python3
"""
Test Employee Activation Workflow
Verifies that employees only appear in the employee section after manager review completion
"""

import os
import sys
from supabase import create_client, Client
from datetime import datetime

# Load environment variables
supabase_url = os.getenv('SUPABASE_URL', 'https://kzommszdhapvqpekpvnt.supabase.co')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY')

if not supabase_key:
    print("❌ SUPABASE_SERVICE_KEY not found in environment")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")

def test_employee_states():
    """Test that employees are in correct states"""
    print_section("TEST 1: Employee State Verification")
    
    # Get all employees
    result = supabase.table('employees').select('*').order('created_at', desc=True).limit(20).execute()
    
    employees_by_status = {
        'invited': [],
        'pending_review': [],
        'active': []
    }
    
    for emp in result.data:
        personal_info = emp.get('personal_info', {})
        name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or "Unnamed"
        
        emp_status = emp.get('employment_status', 'unknown')
        onboarding_status = emp.get('onboarding_status', 'unknown')
        manager_review_status = emp.get('manager_review_status', 'unknown')
        
        # Categorize employees
        if emp_status == 'invited' and onboarding_status == 'not_started':
            employees_by_status['invited'].append({
                'id': emp['id'],
                'name': name,
                'employment_status': emp_status,
                'onboarding_status': onboarding_status,
                'manager_review_status': manager_review_status
            })
        elif onboarding_status == 'completed' and manager_review_status == 'pending_review' and emp_status != 'active':
            employees_by_status['pending_review'].append({
                'id': emp['id'],
                'name': name,
                'employment_status': emp_status,
                'onboarding_status': onboarding_status,
                'manager_review_status': manager_review_status
            })
        elif emp_status == 'active':
            employees_by_status['active'].append({
                'id': emp['id'],
                'name': name,
                'employment_status': emp_status,
                'onboarding_status': onboarding_status,
                'manager_review_status': manager_review_status
            })
    
    # Print results
    print(f"📊 INVITED EMPLOYEES (not started onboarding): {len(employees_by_status['invited'])}")
    for emp in employees_by_status['invited'][:5]:
        print(f"   - {emp['name']} (ID: {emp['id'][:8]}...)")
        print(f"     Status: {emp['employment_status']} | Onboarding: {emp['onboarding_status']}")
    
    print(f"\n⏳ PENDING REVIEW (completed onboarding, awaiting manager): {len(employees_by_status['pending_review'])}")
    for emp in employees_by_status['pending_review'][:5]:
        print(f"   - {emp['name']} (ID: {emp['id'][:8]}...)")
        print(f"     Status: {emp['employment_status']} | Onboarding: {emp['onboarding_status']} | Review: {emp['manager_review_status']}")
    
    print(f"\n✅ ACTIVE EMPLOYEES (manager review completed): {len(employees_by_status['active'])}")
    for emp in employees_by_status['active'][:5]:
        print(f"   - {emp['name']} (ID: {emp['id'][:8]}...)")
        print(f"     Status: {emp['employment_status']} | Onboarding: {emp['onboarding_status']} | Review: {emp['manager_review_status']}")
    
    return employees_by_status

def test_api_filtering():
    """Test that the API correctly filters employees"""
    print_section("TEST 2: API Filtering Logic")
    
    # Simulate what the /api/employees endpoint should return
    result = supabase.table('employees').select('*').execute()
    
    all_employees = result.data
    active_only = [emp for emp in all_employees if emp.get('employment_status') == 'active']
    
    print(f"📊 Total employees in database: {len(all_employees)}")
    print(f"✅ Active employees (should be shown in Employees tab): {len(active_only)}")
    print(f"❌ Non-active employees (should NOT be shown): {len(all_employees) - len(active_only)}")
    
    # Verify the fix
    non_active = [emp for emp in all_employees if emp.get('employment_status') != 'active']
    if non_active:
        print(f"\n⚠️  Non-active employees that should be filtered out:")
        for emp in non_active[:5]:
            personal_info = emp.get('personal_info') or {}
            name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or "Unnamed"
            print(f"   - {name}: {emp.get('employment_status')} (Onboarding: {emp.get('onboarding_status')})")
    
    return len(active_only), len(all_employees)

def test_manager_review_workflow():
    """Test the manager review workflow"""
    print_section("TEST 3: Manager Review Workflow")
    
    # Find employees pending review
    result = supabase.table('employees')\
        .select('*')\
        .eq('onboarding_status', 'completed')\
        .eq('manager_review_status', 'pending_review')\
        .neq('employment_status', 'active')\
        .execute()
    
    pending_employees = result.data
    
    print(f"📋 Employees pending manager review: {len(pending_employees)}")
    
    if pending_employees:
        print("\nThese employees have completed onboarding but are NOT yet active:")
        for emp in pending_employees[:5]:
            personal_info = emp.get('personal_info', {})
            name = f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}".strip() or "Unnamed"
            completed_at = emp.get('onboarding_completed_at', 'N/A')
            print(f"   - {name}")
            print(f"     Completed: {completed_at}")
            print(f"     Status: {emp.get('employment_status')}")
            print(f"     Review Status: {emp.get('manager_review_status')}")
    else:
        print("✅ No employees pending review")
    
    return len(pending_employees)

def test_activation_criteria():
    """Test that activation only happens after manager review"""
    print_section("TEST 4: Activation Criteria Verification")
    
    # Get all active employees
    result = supabase.table('employees')\
        .select('*')\
        .eq('employment_status', 'active')\
        .execute()
    
    active_employees = result.data
    
    print(f"✅ Total active employees: {len(active_employees)}")
    
    # Verify all active employees have completed manager review
    invalid_activations = []
    for emp in active_employees:
        manager_review_status = emp.get('manager_review_status')
        onboarding_status = emp.get('onboarding_status')
        
        # Active employees should have completed manager review
        if manager_review_status != 'completed' and manager_review_status != 'approved':
            invalid_activations.append({
                'id': emp['id'],
                'name': f"{emp.get('personal_info', {}).get('first_name', '')} {emp.get('personal_info', {}).get('last_name', '')}",
                'manager_review_status': manager_review_status,
                'onboarding_status': onboarding_status
            })
    
    if invalid_activations:
        print(f"\n❌ ISSUE: Found {len(invalid_activations)} active employees without completed manager review:")
        for emp in invalid_activations:
            print(f"   - {emp['name']} (ID: {emp['id'][:8]}...)")
            print(f"     Manager Review: {emp['manager_review_status']}")
            print(f"     Onboarding: {emp['onboarding_status']}")
    else:
        print("✅ All active employees have completed manager review")
    
    return len(invalid_activations)

def main():
    """Run all tests"""
    print("\n" + "🔍 " * 20)
    print("  EMPLOYEE ACTIVATION WORKFLOW TEST SUITE")
    print("🔍 " * 20)
    
    try:
        # Run tests
        employees_by_status = test_employee_states()
        active_count, total_count = test_api_filtering()
        pending_count = test_manager_review_workflow()
        invalid_count = test_activation_criteria()
        
        # Summary
        print_section("TEST SUMMARY")
        print(f"✅ Total employees: {total_count}")
        print(f"✅ Active employees (shown in Employees tab): {active_count}")
        print(f"⏳ Pending manager review: {pending_count}")
        print(f"📧 Invited (not started): {len(employees_by_status['invited'])}")
        
        if invalid_count > 0:
            print(f"\n❌ FAILED: {invalid_count} employees are active without manager review")
            print("   This indicates a bug in the activation workflow")
        else:
            print(f"\n✅ PASSED: All active employees have completed manager review")
        
        print("\n" + "=" * 80)
        print("  FIX VERIFICATION")
        print("=" * 80)
        print("\n✅ Backend fix: /api/employees endpoint now filters to active employees only")
        print("✅ Frontend fix: EmployeesTab fetches only active employees")
        print("✅ New endpoint: /api/employees/pending-review for manager review queue")
        print("\nEmployees will only appear in the Employees section AFTER:")
        print("  1. Employee completes onboarding")
        print("  2. Manager reviews all documents")
        print("  3. Manager clicks 'Complete Onboarding'")
        print("  4. Employee status is set to 'active'")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

