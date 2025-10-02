#!/usr/bin/env python3
"""
Test script for Direct Deposit API endpoint
"""

import requests
import json
import sys

def test_direct_deposit_endpoint():
    """Test the actual direct deposit PDF generation endpoint"""
    
    print("🔍 Testing Direct Deposit API Endpoint...")
    print("=" * 60)
    
    # Base URL - adjust if needed
    base_url = "http://localhost:8000"
    
    # Test data that matches what the frontend sends
    test_payload = {
        "employee_data": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "ssn": "123-45-6789",
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Test Bank",
                "accountType": "checking",
                "routingNumber": "123456789",
                "accountNumber": "9876543210",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "signatureData": None
        }
    }
    
    print("📋 Test Payload:")
    print(json.dumps(test_payload, indent=2))
    print()
    
    # Test endpoint
    endpoint = f"{base_url}/api/onboarding/test-employee/direct-deposit/generate-pdf"
    print(f"🌐 Calling: {endpoint}")
    
    try:
        response = requests.post(endpoint, json=test_payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                print("✅ Response received successfully!")
                print(f"📋 Response keys: {list(response_data.keys())}")
                
                if 'data' in response_data and 'pdf' in response_data['data']:
                    pdf_data = response_data['data']['pdf']
                    print(f"📄 PDF data length: {len(pdf_data)} characters")
                    
                    # Save the PDF for inspection
                    import base64
                    pdf_bytes = base64.b64decode(pdf_data)
                    with open('test_endpoint_output.pdf', 'wb') as f:
                        f.write(pdf_bytes)
                    print("💾 PDF saved as: test_endpoint_output.pdf")
                    
                    return True
                else:
                    print("❌ No PDF data in response")
                    print(f"📋 Full response: {response_data}")
                    return False
                    
            except json.JSONDecodeError:
                print("❌ Response is not valid JSON")
                print(f"📋 Raw response: {response.text[:500]}...")
                return False
                
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📋 Raw error response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to the server")
        print("   Make sure the backend server is running on http://localhost:8000")
        return False
        
    except requests.exceptions.Timeout:
        print("❌ Timeout Error: Request took too long")
        return False
        
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

def test_with_signature():
    """Test with signature data"""
    
    print("\n🔍 Testing Direct Deposit with Signature...")
    print("=" * 60)
    
    # Base URL
    base_url = "http://localhost:8000"
    
    # Sample signature data (base64 encoded small image)
    sample_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    test_payload = {
        "employee_data": {
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane.smith@example.com",
            "ssn": "987-65-4321",
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Wells Fargo",
                "accountType": "checking",
                "routingNumber": "121000248",
                "accountNumber": "1234567890",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "signatureData": {
                "signature": sample_signature,
                "signedAt": "2025-01-27T10:00:00Z"
            }
        }
    }
    
    endpoint = f"{base_url}/api/onboarding/test-employee/direct-deposit/generate-pdf"
    print(f"🌐 Calling: {endpoint}")
    
    try:
        response = requests.post(endpoint, json=test_payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Response with signature received successfully!")
            
            if 'data' in response_data and 'pdf' in response_data['data']:
                pdf_data = response_data['data']['pdf']
                print(f"📄 PDF data length: {len(pdf_data)} characters")
                
                # Save the PDF for inspection
                import base64
                pdf_bytes = base64.b64decode(pdf_data)
                with open('test_endpoint_with_signature.pdf', 'wb') as f:
                    f.write(pdf_bytes)
                print("💾 PDF with signature saved as: test_endpoint_with_signature.pdf")
                
                return True
            else:
                print("❌ No PDF data in response")
                return False
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"📋 Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📋 Raw error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Direct Deposit API Endpoint Test")
    print("=" * 60)
    
    # Test basic functionality
    success1 = test_direct_deposit_endpoint()
    
    # Test with signature
    success2 = test_with_signature()
    
    print("\n" + "=" * 60)
    if success1 and success2:
        print("✅ All endpoint tests passed!")
    else:
        print("❌ Some endpoint tests failed.")
        if not success1:
            print("   - Basic PDF generation failed")
        if not success2:
            print("   - PDF generation with signature failed")
