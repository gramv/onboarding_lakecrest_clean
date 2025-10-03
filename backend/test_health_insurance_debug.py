#!/usr/bin/env python3
"""
Debug script for health insurance PDF generation issue
"""
import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"
EMPLOYEE_ID = "test-employee-123"
ENDPOINT = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/health-insurance/generate-pdf"

# Test data matching what frontend sends
test_data = {
    "employee_data": {
        "personalInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "middleInitial": "M",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-01",
            "gender": "M",
            "email": "john.doe@example.com",
            "phone": "555-1234",
            "streetAddress": "123 Main St",
            "city": "Anytown",
            "state": "CA",
            "zipCode": "12345"
        },
        "medicalPlan": "hra_6k",
        "medicalTier": "employee",
        "medicalCost": 59.91,
        "dentalCoverage": False,
        "dentalTier": "employee",
        "dentalCost": 0,
        "visionCoverage": False,
        "visionTier": "employee",
        "visionCost": 0,
        "dependents": [],
        "hasStepchildren": False,
        "stepchildrenNames": "",
        "dependentsSupported": False,
        "irsDependentConfirmation": False,
        "totalBiweeklyCost": 59.91,
        "isWaived": False,
        "waiveReason": "",
        "otherCoverageType": "",
        "otherCoverageDetails": ""
    }
}

print(f"\n{'='*60}")
print(f"Testing Health Insurance PDF Generation")
print(f"Employee ID: {EMPLOYEE_ID}")
print(f"{'='*60}\n")

print("Request payload:")
print(json.dumps(test_data, indent=2))
print()

try:
    response = requests.post(ENDPOINT, json=test_data, timeout=30)
    
    print(f"Response Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print()
    
    if response.status_code == 200:
        result = response.json()
        print("Response JSON:")
        print(json.dumps(result, indent=2))
        
        if result.get('success'):
            print("\n✅ PDF Generation Successful!")
            if result.get('data', {}).get('pdf'):
                pdf_length = len(result['data']['pdf'])
                print(f"   - PDF Base64 Length: {pdf_length}")
                print(f"   - Filename: {result.get('data', {}).get('filename')}")
        else:
            print("\n❌ PDF Generation Failed!")
            print(f"   - Message: {result.get('message')}")
            print(f"   - Error: {result.get('error')}")
    else:
        print(f"\n❌ HTTP Error {response.status_code}")
        print(f"Response Text: {response.text}")
        
except requests.exceptions.Timeout:
    print("❌ Request timed out after 30 seconds")
except requests.exceptions.ConnectionError:
    print("❌ Could not connect to backend - is it running?")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

