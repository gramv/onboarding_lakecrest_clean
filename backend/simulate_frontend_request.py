#!/usr/bin/env python3
"""
Simulate a frontend direct deposit request to monitor logs
"""

import requests
import json
import time

def simulate_direct_deposit_request():
    """Simulate what the frontend ReviewAndSign component does"""
    
    print("🔄 Simulating frontend direct deposit request...")
    
    # This simulates the exact payload the frontend sends
    frontend_payload = {
        "employee_data": {
            "firstName": "Test",
            "lastName": "Employee", 
            "email": "test@example.com",
            "ssn": "123-45-6789",
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Chase Bank",
                "accountType": "checking", 
                "routingNumber": "021000021",
                "accountNumber": "1234567890",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "signatureData": None
        }
    }
    
    print("📋 Frontend payload:")
    print(json.dumps(frontend_payload, indent=2))
    
    try:
        print("\n🌐 Making request to direct deposit endpoint...")
        response = requests.post(
            "http://localhost:8000/api/onboarding/test-employee/direct-deposit/generate-pdf",
            json=frontend_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Response structure:")
            print(f"  - success: {result.get('success')}")
            print(f"  - message: {result.get('message')}")
            print(f"  - data keys: {list(result.get('data', {}).keys())}")
            
            # Test the frontend logic
            pdf_data = result.get('data', {}).get('data', {}).get('pdf') or result.get('data', {}).get('pdf')
            print(f"  - PDF data found: {bool(pdf_data)}")
            if pdf_data:
                print(f"  - PDF length: {len(pdf_data)} characters")
                print("✅ Frontend compatibility: PASS")
            else:
                print("❌ Frontend compatibility: FAIL")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def simulate_with_signature():
    """Simulate request with signature data"""
    
    print("\n🔄 Simulating frontend request with signature...")
    
    # Simple signature data
    signature_payload = {
        "employee_data": {
            "firstName": "Signed",
            "lastName": "Employee",
            "email": "signed@example.com", 
            "ssn": "987-65-4321",
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Wells Fargo",
                "accountType": "savings",
                "routingNumber": "121000248", 
                "accountNumber": "9876543210",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "signatureData": {
                "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                "signedAt": "2025-01-27T16:31:00Z"
            }
        }
    }
    
    try:
        print("🌐 Making signed request...")
        response = requests.post(
            "http://localhost:8000/api/onboarding/test-employee/direct-deposit/generate-pdf",
            json=signature_payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"📊 Signed Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            pdf_data = result.get('data', {}).get('data', {}).get('pdf') or result.get('data', {}).get('pdf')
            if pdf_data:
                print(f"✅ Signed PDF generated! Length: {len(pdf_data)} characters")
            else:
                print("❌ No PDF data in signed response")
        else:
            print(f"❌ Signed request error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Signed request failed: {e}")

if __name__ == "__main__":
    print("🚀 Frontend Direct Deposit Request Simulation")
    print("=" * 60)
    print("This simulates the exact requests the frontend makes")
    print("Monitor the backend logs to see the processing...")
    print("=" * 60)
    
    # Basic request
    simulate_direct_deposit_request()
    
    # Wait a moment
    time.sleep(2)
    
    # Request with signature
    simulate_with_signature()
    
    print("\n" + "=" * 60)
    print("✅ Simulation complete! Check the backend logs above.")
    print("💡 The logs show the complete data processing flow.")
