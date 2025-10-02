#!/usr/bin/env python3
"""
Test script for W-4 SSN and withholding validation
Tests 2025 IRS compliance requirements
"""

import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"
ENDPOINT = f"{BASE_URL}/api/onboarding/temp_test_001/w4-form"

def test_invalid_ssn():
    """Test invalid SSN formats"""
    print("\n=== Testing Invalid SSN Formats ===")
    
    test_cases = [
        {
            "name": "SSN starting with 9 (ITIN)",
            "ssn": "900-12-3456",
            "expected": "SSN cannot start with 9"
        },
        {
            "name": "SSN with 000 area",
            "ssn": "000-12-3456",
            "expected": "Area number cannot be 000"
        },
        {
            "name": "SSN with 666 area",
            "ssn": "666-12-3456",
            "expected": "Area number 666 is not valid"
        },
        {
            "name": "SSN with 00 group",
            "ssn": "123-00-4567",
            "expected": "Group number cannot be 00"
        },
        {
            "name": "SSN with 0000 serial",
            "ssn": "123-45-0000",
            "expected": "Serial number cannot be 0000"
        },
        {
            "name": "Test SSN (123-45-6789)",
            "ssn": "123-45-6789",
            "expected": "known test/placeholder number"
        }
    ]
    
    for test in test_cases:
        data = {
            "formData": {
                "ssn": test["ssn"],
                "firstName": "Test",
                "lastName": "Employee",
                "address": "123 Main St",
                "city": "New York",
                "state": "NY",
                "zipCode": "10001",
                "filingStatus": "Single",
                "qualifyingChildren": 0,
                "otherDependents": 0
            }
        }
        
        response = requests.post(ENDPOINT, json=data)
        result = response.json()
        
        print(f"\nTest: {test['name']}")
        print(f"  SSN: {test['ssn']}")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 400:
            print(f"  ✅ Correctly rejected: {result.get('message', '')}")
            if "validation_errors" in result.get("details", {}):
                for error in result["details"]["validation_errors"]:
                    print(f"     - {error['message']}")
        else:
            print(f"  ❌ Should have been rejected but got: {response.status_code}")

def test_valid_ssn():
    """Test valid SSN format"""
    print("\n=== Testing Valid SSN Format ===")
    
    data = {
        "formData": {
            "ssn": "123-45-6780",  # Valid format (not a test SSN)
            "firstName": "John",
            "lastName": "Doe",
            "address": "456 Oak Ave",
            "city": "Los Angeles",
            "state": "CA",
            "zipCode": "90001",
            "filingStatus": "Single",
            "qualifyingChildren": 0,
            "otherDependents": 0
        }
    }
    
    response = requests.post(ENDPOINT, json=data)
    result = response.json()
    
    print(f"Valid SSN: 123-45-6780")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Correctly accepted")
        if "compliance_notes" in result.get("data", {}):
            for note in result["data"]["compliance_notes"]:
                print(f"  - {note}")
    else:
        print(f"❌ Should have been accepted: {result.get('message', '')}")

def test_invalid_withholdings():
    """Test invalid withholding amounts"""
    print("\n=== Testing Invalid Withholding Amounts ===")
    
    test_cases = [
        {
            "name": "Negative qualifying children",
            "field": "qualifyingChildren",
            "value": -1,
            "expected": "cannot be negative"
        },
        {
            "name": "Non-numeric other income",
            "field": "otherIncome",
            "value": "abc",
            "expected": "must be a valid number"
        },
        {
            "name": "Negative deductions",
            "field": "deductions",
            "value": -1000,
            "expected": "cannot be negative"
        },
        {
            "name": "Negative extra withholding",
            "field": "extraWithholding",
            "value": -100,
            "expected": "cannot be negative"
        },
        {
            "name": "Invalid filing status",
            "field": "filingStatus",
            "value": "Invalid Status",
            "expected": "Invalid filing status"
        }
    ]
    
    for test in test_cases:
        data = {
            "formData": {
                "ssn": "123-45-6780",
                "firstName": "Test",
                "lastName": "Employee",
                "address": "123 Main St",
                "city": "New York",
                "state": "NY",
                "zipCode": "10001",
                "filingStatus": "Single",
                "qualifyingChildren": 0,
                "otherDependents": 0,
                "otherIncome": 0,
                "deductions": 0,
                "extraWithholding": 0
            }
        }
        
        # Override the specific field being tested
        data["formData"][test["field"]] = test["value"]
        
        response = requests.post(ENDPOINT, json=data)
        result = response.json()
        
        print(f"\nTest: {test['name']}")
        print(f"  Field: {test['field']} = {test['value']}")
        print(f"  Status: {response.status_code}")
        
        if response.status_code == 400:
            print(f"  ✅ Correctly rejected: {result.get('message', '')}")
        else:
            print(f"  ❌ Should have been rejected but got: {response.status_code}")

def test_valid_withholdings_with_warnings():
    """Test valid withholdings that generate warnings"""
    print("\n=== Testing Valid Withholdings with Warnings ===")
    
    data = {
        "formData": {
            "ssn": "123-45-6780",
            "firstName": "Rich",
            "lastName": "Person",
            "address": "789 Park Ave",
            "city": "New York",
            "state": "NY",
            "zipCode": "10021",
            "filingStatus": "Single",
            "qualifyingChildren": 11,  # High but valid
            "otherDependents": 0,
            "otherIncome": 2000000,  # Very high
            "deductions": 50000,  # High
            "extraWithholding": 6000  # Very high
        }
    }
    
    response = requests.post(ENDPOINT, json=data)
    result = response.json()
    
    print(f"High but valid amounts")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Correctly accepted with warnings")
        if "validation_warnings" in result.get("data", {}):
            print("Warnings generated:")
            for warning in result["data"]["validation_warnings"]:
                print(f"  - {warning['field']}: {warning['message']}")
    else:
        print(f"❌ Should have been accepted: {result.get('message', '')}")

def test_2025_compliance():
    """Test 2025 IRS specific requirements"""
    print("\n=== Testing 2025 IRS Compliance ===")
    
    data = {
        "formData": {
            "ssn": "123-45-6780",
            "firstName": "Tax",
            "lastName": "Payer",
            "address": "100 Tax St",
            "city": "Washington",
            "state": "DC",
            "zipCode": "20001",
            "filingStatus": "Married filing jointly",
            "qualifyingChildren": 2,  # $4,000 credit
            "otherDependents": 1,  # $500 credit
            "dependentsAmount": 4500,  # Total credits
            "otherIncome": 10000,
            "deductions": 30000,  # Just above standard for MFJ
            "extraWithholding": 100,
            "multipleJobsCheckbox": True,
            "spouseWorksCheckbox": True
        }
    }
    
    response = requests.post(ENDPOINT, json=data)
    result = response.json()
    
    print(f"2025 Tax Year Validation")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ 2025 compliance validation successful")
        if "compliance_notes" in result.get("data", {}):
            print("Compliance notes:")
            for note in result["data"]["compliance_notes"]:
                print(f"  - {note}")
        if "validation_warnings" in result.get("data", {}):
            print("Warnings:")
            for warning in result["data"]["validation_warnings"]:
                print(f"  - {warning['message']}")

if __name__ == "__main__":
    print("=" * 60)
    print("W-4 IRS COMPLIANCE VALIDATION TEST (2025)")
    print("=" * 60)
    
    try:
        # Test connectivity
        response = requests.get(f"{BASE_URL}/api/healthz")
        if response.status_code != 200:
            print("❌ API server is not responding. Please ensure it's running.")
            exit(1)
        
        # Run tests
        test_invalid_ssn()
        test_valid_ssn()
        test_invalid_withholdings()
        test_valid_withholdings_with_warnings()
        test_2025_compliance()
        
        print("\n" + "=" * 60)
        print("✅ All W-4 validation tests completed")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server at", BASE_URL)
        print("Please ensure the backend server is running.")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")