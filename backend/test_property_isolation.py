#!/usr/bin/env python3
"""
Test script to verify property isolation in employee searches.
This tests that managers can only see employees from their own properties.
"""

import asyncio
import os
import sys
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.supabase_service_enhanced import EnhancedSupabaseService

async def test_property_isolation():
    """Test that employee searches are properly scoped to properties"""
    
    print("=" * 60)
    print("PROPERTY ISOLATION SECURITY TEST")
    print("=" * 60)
    
    # Initialize the service
    service = EnhancedSupabaseService()
    
    # Test 1: Search for an employee by email without property_id (should warn)
    print("\nTest 1: Search without property_id (SHOULD WARN)")
    print("-" * 40)
    result = await service.search_employees(
        search_query="test@example.com",
        property_id=None  # No property filter - security risk!
    )
    print(f"Found {len(result)} employees (without property filter)")
    
    # Test 2: Search for an employee by email WITH property_id (secure)
    print("\nTest 2: Search with property_id (SECURE)")
    print("-" * 40)
    
    # Get a test property ID (you may need to adjust this)
    test_property_id = "test-prop-001"  # Replace with actual property ID
    
    result = await service.search_employees(
        search_query="test@example.com",
        property_id=test_property_id
    )
    print(f"Found {len(result)} employees at property {test_property_id}")
    
    # Test 3: Use the new secure method get_employee_by_email_and_property
    print("\nTest 3: get_employee_by_email_and_property (NEW SECURE METHOD)")
    print("-" * 40)
    
    # Test with valid property_id
    employee = await service.get_employee_by_email_and_property(
        email="test@example.com",
        property_id=test_property_id
    )
    if employee:
        print(f"✓ Found employee: {employee.id} at property {employee.property_id}")
    else:
        print(f"✗ No employee found with that email at property {test_property_id}")
    
    # Test 4: Try to search without property_id (should fail safely)
    print("\nTest 4: get_employee_by_email_and_property without property_id (SHOULD FAIL)")
    print("-" * 40)
    
    employee = await service.get_employee_by_email_and_property(
        email="test@example.com",
        property_id=None  # This should trigger security warning and return None
    )
    if employee:
        print(f"✗ SECURITY ISSUE: Found employee without property_id!")
    else:
        print(f"✓ SECURE: Method correctly rejected search without property_id")
    
    # Test 5: Try to access employee from different property
    print("\nTest 5: Try to access employee from different property")
    print("-" * 40)
    
    different_property_id = "different-prop-002"  # A different property
    employee = await service.get_employee_by_email_and_property(
        email="test@example.com",
        property_id=different_property_id
    )
    if employee:
        print(f"Found employee at different property (may be legitimate if employee works at multiple properties)")
    else:
        print(f"✓ No employee found at property {different_property_id} (expected if employee only works at one property)")
    
    print("\n" + "=" * 60)
    print("PROPERTY ISOLATION TEST COMPLETE")
    print("Check the logs above for SECURITY warnings")
    print("=" * 60)

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('.env', override=True)
    
    # Run the test
    asyncio.run(test_property_isolation())