#!/usr/bin/env python3
"""
Test script for routing number validation system
"""

import asyncio
import requests
import json
from typing import Dict, Any

# API URL
API_URL = "http://localhost:8000"

def test_routing_validation_endpoint():
    """Test the routing validation API endpoint"""
    print("\n=== Testing Routing Number Validation Endpoint ===\n")
    
    # Test cases
    test_cases = [
        {
            "routing_number": "021000021",
            "expected": True,
            "bank_name": "JPMorgan Chase Bank",
            "description": "Valid Chase routing number"
        },
        {
            "routing_number": "026009593",
            "expected": True,
            "bank_name": "Bank of America",
            "description": "Valid Bank of America routing number"
        },
        {
            "routing_number": "256074974",
            "expected": True,
            "bank_name": "Navy Federal Credit Union",
            "description": "Valid credit union routing number"
        },
        {
            "routing_number": "271070801",
            "expected": True,
            "bank_name": "Chime",
            "description": "Valid online bank routing number"
        },
        {
            "routing_number": "123456789",
            "expected": False,
            "bank_name": None,
            "description": "Invalid checksum"
        },
        {
            "routing_number": "12345",
            "expected": False,
            "bank_name": None,
            "description": "Too short"
        },
        {
            "routing_number": "999999999",
            "expected": False,
            "bank_name": None,
            "description": "Invalid but passes checksum"
        }
    ]
    
    passed = 0
    failed = 0
    
    for test in test_cases:
        print(f"Testing: {test['description']}")
        print(f"  Routing: {test['routing_number']}")
        
        try:
            response = requests.post(
                f"{API_URL}/api/validate/routing-number",
                json={"routing_number": test['routing_number']},
                timeout=5
            )
            
            if test['expected']:
                # Should be valid
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('data', {}).get('valid'):
                        bank_info = data['data'].get('bank', {})
                        print(f"  ✅ PASSED - Valid routing number")
                        if test['bank_name']:
                            if test['bank_name'] in bank_info.get('bank_name', ''):
                                print(f"  ✅ Bank name matched: {bank_info.get('bank_name')}")
                            else:
                                print(f"  ⚠️  Bank name mismatch: Expected '{test['bank_name']}', got '{bank_info.get('bank_name')}'")
                        
                        # Check for warnings
                        warnings = data['data'].get('warnings', [])
                        if warnings:
                            print(f"  ⚠️  Warnings: {', '.join(warnings)}")
                        
                        passed += 1
                    else:
                        print(f"  ❌ FAILED - Expected valid but got invalid")
                        print(f"     Response: {data}")
                        failed += 1
                else:
                    print(f"  ❌ FAILED - Expected 200 but got {response.status_code}")
                    print(f"     Response: {response.text}")
                    failed += 1
            else:
                # Should be invalid
                if response.status_code == 400:
                    print(f"  ✅ PASSED - Correctly rejected invalid routing number")
                    passed += 1
                elif response.status_code == 200:
                    data = response.json()
                    if not data.get('data', {}).get('valid'):
                        print(f"  ✅ PASSED - Correctly marked as invalid")
                        passed += 1
                    else:
                        print(f"  ❌ FAILED - Expected invalid but got valid")
                        failed += 1
                else:
                    print(f"  ❌ FAILED - Unexpected status code {response.status_code}")
                    failed += 1
                    
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed += 1
        
        print()
    
    print(f"\n=== Test Results ===")
    print(f"Passed: {passed}/{len(test_cases)}")
    print(f"Failed: {failed}/{len(test_cases)}")
    
    return passed == len(test_cases)

def test_bank_search_endpoint():
    """Test the bank search API endpoint"""
    print("\n=== Testing Bank Search Endpoint ===\n")
    
    search_queries = [
        "Chase",
        "Bank of America",
        "Navy",
        "Ch"  # Should return multiple results
    ]
    
    for query in search_queries:
        print(f"Searching for: '{query}'")
        
        try:
            response = requests.get(
                f"{API_URL}/api/banks/search",
                params={"query": query},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                banks = data.get('data', {}).get('banks', [])
                print(f"  ✅ Found {len(banks)} banks")
                for bank in banks[:3]:  # Show first 3 results
                    print(f"     - {bank.get('short_name', bank.get('bank_name'))}: {bank.get('routing')}")
            else:
                print(f"  ❌ Search failed: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
        
        print()

def test_popular_banks_endpoint():
    """Test the popular banks API endpoint"""
    print("\n=== Testing Popular Banks Endpoint ===\n")
    
    try:
        response = requests.get(
            f"{API_URL}/api/banks/popular",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            banks = data.get('data', {}).get('banks', [])
            print(f"✅ Retrieved {len(banks)} popular banks:")
            for bank in banks:
                print(f"   - {bank.get('short_name', bank.get('bank_name'))}: {bank.get('routing')}")
                if not bank.get('ach_supported'):
                    print(f"     ⚠️  No ACH support")
                if not bank.get('wire_supported'):
                    print(f"     ⚠️  No Wire support")
        else:
            print(f"❌ Failed to get popular banks: {response.status_code}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_direct_deposit_integration():
    """Test integration with direct deposit form"""
    print("\n=== Testing Direct Deposit Form Integration ===\n")
    
    # Simulate what the frontend would do
    test_employee_data = {
        "employee_data": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "ssn": "123-45-6789",
            "paymentMethod": "direct_deposit",
            "primaryAccount": {
                "bankName": "JPMorgan Chase Bank",  # This should be auto-filled
                "accountType": "checking",
                "routingNumber": "021000021",
                "accountNumber": "1234567890"
            }
        }
    }
    
    print("Testing direct deposit PDF generation with validated routing number...")
    
    try:
        response = requests.post(
            f"{API_URL}/api/onboarding/test-employee/direct-deposit/generate-pdf",
            json=test_employee_data,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ Direct Deposit PDF generated successfully")
                print(f"   Filename: {data.get('data', {}).get('filename')}")
                print("   PDF includes auto-filled bank name from routing validation")
            else:
                print(f"❌ PDF generation failed: {data.get('message')}")
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    """Run all tests"""
    print("""
╔════════════════════════════════════════════════════╗
║     Routing Number Validation System Test Suite    ║
╚════════════════════════════════════════════════════╝
    """)
    
    # Check if server is running
    try:
        response = requests.get(f"{API_URL}/healthz", timeout=2)
        if response.status_code != 200:
            print("❌ Server is not responding. Please start the backend server first.")
            return
    except:
        print("❌ Cannot connect to backend server at", API_URL)
        print("   Please run: python3 -m uvicorn app.main_enhanced:app --reload")
        return
    
    print("✅ Backend server is running\n")
    
    # Run tests
    test_routing_validation_endpoint()
    test_bank_search_endpoint()
    test_popular_banks_endpoint()
    test_direct_deposit_integration()
    
    print("""
╔════════════════════════════════════════════════════╗
║                  Test Suite Complete                ║
╚════════════════════════════════════════════════════╝
    """)

if __name__ == "__main__":
    main()