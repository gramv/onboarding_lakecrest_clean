#!/usr/bin/env python3
"""
Test script for health insurance PDF generation
"""
import requests
import json
import base64

# API endpoint
BASE_URL = "http://localhost:8000"
ENDPOINT = f"{BASE_URL}/api/onboarding/test-employee-123/health-insurance/generate-pdf"

# Test data with complete personal info
test_data = {
    "employee_data": {
        "personalInfo": {
            "firstName": "John",
            "lastName": "Doe",
            "middleInitial": "A",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-15",
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "address": "123 Main Street",
            "aptNumber": "4B",
            "city": "New York",
            "state": "NY",
            "zipCode": "10001",
            "gender": "male",
            "maritalStatus": "single"
        },
        "medicalPlan": "PPO Premium",
        "medicalTier": "employee_plus_family",
        "dentalCoverage": True,
        "dentalTier": "employee_plus_spouse",
        "visionCoverage": True,
        "visionTier": "employee",
        "dependents": [
            {
                "name": "Jane Doe",
                "relationship": "spouse",
                "dateOfBirth": "1992-03-20",
                "ssn": "987-65-4321"
            }
        ],
        "section125Acknowledged": True,
        "effectiveDate": "2025-01-01",
        "isWaived": False
    }
}

def test_health_insurance_pdf():
    """Test health insurance PDF generation"""
    print("Testing Health Insurance PDF Generation...")
    print(f"Endpoint: {ENDPOINT}")
    print("-" * 50)
    
    try:
        # Make the request
        response = requests.post(
            ENDPOINT,
            json=test_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("success"):
                print("✅ PDF generated successfully!")
                
                # Check if we have PDF data
                if result.get("data", {}).get("pdf"):
                    pdf_base64 = result["data"]["pdf"]
                    pdf_size = len(pdf_base64)
                    print(f"PDF size (base64): {pdf_size} characters")
                    
                    # Verify it's valid base64
                    try:
                        pdf_bytes = base64.b64decode(pdf_base64)
                        print(f"PDF size (bytes): {len(pdf_bytes)} bytes")
                        
                        # Check PDF header
                        if pdf_bytes[:4] == b'%PDF':
                            print("✅ Valid PDF header detected")
                        else:
                            print("❌ Invalid PDF header")
                    except Exception as e:
                        print(f"❌ Failed to decode base64: {e}")
                else:
                    print("❌ No PDF data in response")
            else:
                print(f"❌ PDF generation failed: {result.get('message', 'Unknown error')}")
                if result.get("error"):
                    print(f"Error details: {result['error']}")
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the API. Make sure the backend is running.")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_health_insurance_pdf()