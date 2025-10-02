#!/usr/bin/env python3
"""
Test script to verify the name extraction fix
"""

import sys
import os
import asyncio

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

async def test_name_extraction():
    """Test the get_employee_names_from_personal_info function"""
    
    print("🔍 Testing Name Extraction Fix...")
    print("=" * 60)
    
    # Import the function
    from main_enhanced import get_employee_names_from_personal_info
    
    # Test data that matches the actual employee data structure from logs
    test_employee = {
        'id': '4bc176f1-8320-4fb9-9318-7b529597e2e3',
        'personal_info': {
            'email': 'vgoutamram@gmail.com',
            'job_title': 'Housekeeping Supervisor',
            'last_name': 'Vemula',
            'first_name': 'Goutham',
            'start_time': '10:40',
            'supervisor': 'hh',
            'benefits_eligible': 'yes',
            'special_instructions': ''
        },
        'department': 'Housekeeping',
        'position': 'Housekeeping Supervisor'
    }
    
    print("📋 Test Employee Data:")
    print(f"  - ID: {test_employee['id']}")
    print(f"  - Personal Info: {test_employee['personal_info']}")
    print()
    
    try:
        # Test the function
        first_name, last_name = await get_employee_names_from_personal_info(
            test_employee['id'], 
            test_employee
        )
        
        print("📊 Results:")
        print(f"  - First Name: '{first_name}'")
        print(f"  - Last Name: '{last_name}'")
        print(f"  - Full Name: '{first_name} {last_name}'")
        print()
        
        # Verify the results
        expected_first = "Goutham"
        expected_last = "Vemula"
        
        if first_name == expected_first and last_name == expected_last:
            print("✅ SUCCESS: Names extracted correctly!")
            print(f"   Expected: {expected_first} {expected_last}")
            print(f"   Got: {first_name} {last_name}")
            return True
        else:
            print("❌ FAILURE: Names not extracted correctly!")
            print(f"   Expected: {expected_first} {expected_last}")
            print(f"   Got: {first_name} {last_name}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_edge_cases():
    """Test edge cases"""
    
    print("\n🔍 Testing Edge Cases...")
    print("=" * 60)
    
    from main_enhanced import get_employee_names_from_personal_info
    
    # Test case 1: Empty employee
    print("📋 Test 1: Empty employee")
    first_name, last_name = await get_employee_names_from_personal_info("test-id", None)
    print(f"   Result: '{first_name} {last_name}'")
    
    # Test case 2: Employee without personal_info
    print("📋 Test 2: Employee without personal_info")
    employee_no_info = {'id': 'test-id', 'department': 'Test'}
    first_name, last_name = await get_employee_names_from_personal_info("test-id", employee_no_info)
    print(f"   Result: '{first_name} {last_name}'")
    
    # Test case 3: Employee with direct name fields
    print("📋 Test 3: Employee with direct name fields")
    employee_direct = {'id': 'test-id', 'first_name': 'Direct', 'last_name': 'Name'}
    first_name, last_name = await get_employee_names_from_personal_info("test-id", employee_direct)
    print(f"   Result: '{first_name} {last_name}'")
    
    # Test case 4: Employee with empty personal_info
    print("📋 Test 4: Employee with empty personal_info")
    employee_empty_info = {'id': 'test-id', 'personal_info': {}}
    first_name, last_name = await get_employee_names_from_personal_info("test-id", employee_empty_info)
    print(f"   Result: '{first_name} {last_name}'")

if __name__ == "__main__":
    print("🚀 Name Extraction Test")
    print("=" * 60)
    
    async def run_tests():
        # Test main functionality
        success = await test_name_extraction()
        
        # Test edge cases
        await test_edge_cases()
        
        print("\n" + "=" * 60)
        if success:
            print("✅ Main test PASSED! The fix should work.")
        else:
            print("❌ Main test FAILED! The fix needs more work.")
    
    # Run the async tests
    asyncio.run(run_tests())
