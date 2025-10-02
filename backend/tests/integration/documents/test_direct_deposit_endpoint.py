#!/usr/bin/env python3
"""
Test script to call the actual Direct Deposit PDF generation endpoint
"""
import json
import requests
import base64

def test_direct_deposit_endpoint():
    """Test the actual backend endpoint with proper data"""

    print("=== TESTING DIRECT DEPOSIT ENDPOINT ===")

    # Backend URL (adjust if needed)
    base_url = "http://localhost:8000"  # FastAPI backend URL

    # Sample data that should work
    test_payload = {
        "employee_data": {
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Test Bank",
                "routingNumber": "123456789",
                "accountNumber": "9876543210",
                "accountType": "checking",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "voidedCheckUploaded": False,
            "bankLetterUploaded": False,
            "totalPercentage": 100,
            "authorizeDeposit": True,
            "employeeSignature": "",
            "dateOfAuth": "2025-01-27",
            "firstName": "Test",
            "lastName": "User",
            "email": "test@example.com",
            "ssn": "123-45-6789"
        }
    }

    print("Test Payload:")
    print(json.dumps(test_payload, indent=2))

    # Test the endpoint
    endpoint = f"{base_url}/api/onboarding/test-employee/direct-deposit/generate-pdf"

    try:
        print(f"\nCalling endpoint: {endpoint}")
        response = requests.post(endpoint, json=test_payload)

        print(f"Response Status: {response.status_code}")

        if response.status_code == 200:
            response_data = response.json()
            print("✅ SUCCESS! Response data:")
            print(json.dumps(response_data, indent=2))

            if 'data' in response_data and 'pdf' in response_data['data']:
                pdf_b64 = response_data['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_b64)

                # Save the PDF
                with open("test_endpoint_result.pdf", "wb") as f:
                    f.write(pdf_bytes)

                print(f"📄 PDF saved as test_endpoint_result.pdf (size: {len(pdf_bytes)} bytes)")
            else:
                print("❌ No PDF data in response")
        else:
            print(f"❌ FAILED! Error response:")
            try:
                error_data = response.json()
                print(json.dumps(error_data, indent=2))
            except:
                print(response.text)

    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Backend server not running")
        print("Please start the backend server first:")
        print("cd /Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend && python3 -m uvicorn app.main_enhanced:app --reload --host 0.0.0.0 --port 8000")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_direct_deposit_endpoint()
