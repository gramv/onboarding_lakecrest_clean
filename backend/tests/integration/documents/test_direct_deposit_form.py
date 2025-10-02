#!/usr/bin/env python3
"""
Test script to verify Direct Deposit form fills correctly with the official template
"""

import requests
import base64
import json

def test_direct_deposit_form():
    """Test Direct Deposit PDF generation with employee data"""
    
    # Test data
    test_data = {
        "employee_data": {
            "firstName": "Sarah",
            "lastName": "Johnson",
            "email": "sarah.johnson@example.com",
            "ssn": "987-65-4321",
            "paymentMethod": "direct_deposit",
            "primaryAccount": {
                "bankName": "Wells Fargo Bank, San Francisco",
                "accountType": "checking",
                "routingNumber": "121000248",
                "accountNumber": "9876543210"
            },
            "secondaryAccount": {
                "bankName": "Bank of America, Los Angeles", 
                "accountType": "savings",
                "routingNumber": "026009593",
                "accountNumber": "1122334455",
                "depositAmount": "500.00"
            }
        }
    }
    
    # Call the endpoint
    response = requests.post(
        "http://localhost:8000/api/onboarding/test-employee/direct-deposit/generate-pdf",
        json=test_data
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            pdf_base64 = result['data']['pdf']
            
            # Save PDF to file for inspection
            pdf_bytes = base64.b64decode(pdf_base64)
            with open('test_direct_deposit_filled.pdf', 'wb') as f:
                f.write(pdf_bytes)
            
            print("✅ Direct Deposit form generated successfully!")
            print(f"   Filename: {result['data']['filename']}")
            print(f"   Saved to: test_direct_deposit_filled.pdf")
            print("\n📋 Data that should be filled:")
            print(f"   - Employee Name: {test_data['employee_data']['firstName']} {test_data['employee_data']['lastName']}")
            print(f"   - Email: {test_data['employee_data']['email']}")
            print(f"   - SSN: {test_data['employee_data']['ssn']}")
            print("\n🏦 Bank 1 (Primary):")
            primary = test_data['employee_data']['primaryAccount']
            print(f"   - Bank Name: {primary['bankName']}")
            print(f"   - Routing #: {primary['routingNumber']}")
            print(f"   - Account #: {primary['accountNumber']}")
            print(f"   - Type: {primary['accountType']} ✓")
            print(f"   - Entire Net Amount: ✓")
            print("\n🏦 Bank 2 (Secondary):")
            secondary = test_data['employee_data']['secondaryAccount']
            print(f"   - Bank Name: {secondary['bankName']}")
            print(f"   - Routing #: {secondary['routingNumber']}")
            print(f"   - Account #: {secondary['accountNumber']}")
            print(f"   - Type: {secondary['accountType']} ✓")
            print(f"   - Deposit Amount: ${secondary['depositAmount']}")
            print("\n✅ Please check 'test_direct_deposit_filled.pdf' to verify all fields are populated correctly")
            return True
        else:
            print(f"❌ Error: {result.get('error', 'Unknown error')}")
            return False
    else:
        print(f"❌ HTTP Error {response.status_code}: {response.text}")
        return False

if __name__ == "__main__":
    success = test_direct_deposit_form()
    exit(0 if success else 1)