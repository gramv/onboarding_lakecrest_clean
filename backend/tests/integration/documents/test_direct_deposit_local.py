#!/usr/bin/env python3
"""
Test Direct Deposit PDF generation locally
"""

import requests
import base64
import json
from datetime import datetime

# API endpoint
BASE_URL = "http://localhost:8000/api"

def test_direct_deposit_scenarios():
    """Test various Direct Deposit scenarios"""
    
    # Test scenarios
    scenarios = [
        {
            "name": "Full Deposit - Checking",
            "payload": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "Smith",
                    "ssn": "123-45-6789",
                    "email": "john.smith@example.com",
                    "primaryAccount": {
                        "bankName": "Chase Bank",
                        "accountType": "checking",
                        "routingNumber": "021000021",
                        "accountNumber": "1234567890",
                        "depositType": "full"
                    }
                }
            },
            "expected": "Should NOT show $0, should check 'entire net amount'"
        },
        {
            "name": "Partial Deposit - Savings",
            "payload": {
                "employee_data": {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "ssn": "987-65-4321",
                    "email": "jane.doe@example.com",
                    "primaryAccount": {
                        "bankName": "Bank of America",
                        "accountType": "savings",
                        "routingNumber": "026009593",
                        "accountNumber": "9876543210",
                        "depositType": "partial",
                        "depositAmount": "500.00"
                    }
                }
            },
            "expected": "Should show $500.00, should NOT check 'entire net amount'"
        },
        {
            "name": "Multiple Banks - Split Deposit",
            "payload": {
                "employee_data": {
                    "firstName": "Alice",
                    "lastName": "Johnson",
                    "ssn": "555-12-3456",
                    "email": "alice.j@example.com",
                    "accounts": [
                        {
                            "bankName": "Wells Fargo",
                            "accountType": "checking",
                            "routingNumber": "121000248",
                            "accountNumber": "1111222233",
                            "depositType": "partial",
                            "depositAmount": "1000.00"
                        },
                        {
                            "bankName": "CitiBank",
                            "accountType": "savings",
                            "routingNumber": "021000089",
                            "accountNumber": "4444555566",
                            "depositType": "remainder"
                        }
                    ]
                }
            },
            "expected": "Should fill bank1 with $1000, bank2 with 'remainder'"
        }
    ]
    
    print("Testing Direct Deposit PDF Generation")
    print("=" * 60)
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. Testing: {scenario['name']}")
        print(f"   Expected: {scenario['expected']}")
        print("-" * 40)
        
        # Prepare endpoint
        endpoint = f"{BASE_URL}/onboarding/123e4567-e89b-12d3-a456-426614174000/direct-deposit/generate-pdf"
        
        # Make request
        try:
            response = requests.post(
                endpoint,
                json=scenario['payload'],
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('pdf_base64'):
                    # Save PDF for manual inspection
                    pdf_filename = f"test_output/direct_deposit_{i}_{scenario['name'].lower().replace(' ', '_')}.pdf"
                    pdf_data = base64.b64decode(result['pdf_base64'])
                    
                    with open(pdf_filename, 'wb') as f:
                        f.write(pdf_data)
                    
                    print(f"   ✓ PDF generated successfully")
                    print(f"   ✓ Saved to: {pdf_filename}")
                    
                    # Check if signature was included
                    if scenario['payload']['employee_data'].get('signature'):
                        print(f"   ✓ Signature included in request")
                    else:
                        print(f"   ⚠ No signature in this test")
                        
                else:
                    print(f"   ✗ Failed: {result.get('error', 'Unknown error')}")
            else:
                print(f"   ✗ HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"   ✗ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Test complete! Check the test_output directory for PDFs.")
    print("Please manually verify:")
    print("1. Full deposits don't show $0")
    print("2. Partial deposits show the correct amount")
    print("3. Checking/Savings boxes are marked correctly")
    print("4. Employee names appear properly")

if __name__ == "__main__":
    import os
    os.makedirs("test_output", exist_ok=True)
    test_direct_deposit_scenarios()