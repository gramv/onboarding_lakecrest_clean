#!/usr/bin/env python3
"""
Test Google Document AI field extraction with real Tennessee driver's license
"""

import requests
import base64
import json

BASE_URL = "http://localhost:8000"
LICENSE_IMAGE_PATH = "/Users/gouthamvemula/Downloads/TN_D200_PR_Adult_CLASS-M_DL.jpg"

def test_license_extraction():
    """Test field extraction from TN driver's license"""
    print("\n" + "=" * 60)
    print("Testing Google Document AI with TN Driver's License")
    print("=" * 60)
    
    # Read the actual license image
    with open(LICENSE_IMAGE_PATH, "rb") as f:
        image_bytes = f.read()
    
    print(f"\nImage loaded: {len(image_bytes)} bytes")
    
    url = f"{BASE_URL}/api/documents/process"
    
    # Create multipart form data
    files = {
        'file': ('tn_license.jpg', image_bytes, 'image/jpeg')
    }
    data = {
        'document_type': 'drivers_license',
        'employee_id': 'test-employee-123'
    }
    
    try:
        print("\nSending request to /api/documents/process...")
        print(f"Document type: drivers_license")
        
        response = requests.post(url, files=files, data=data)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCESS! Google Document AI processed the license")
            
            if result.get('success'):
                data = result.get('data', {})
                print("\n📋 Extracted Fields for I-9 Section 2:")
                print("=" * 40)
                
                # The three critical fields we need
                document_number = data.get('documentNumber', 'NOT FOUND')
                expiration_date = data.get('expirationDate', 'NOT FOUND')
                issuing_authority = data.get('issuingAuthority', 'NOT FOUND')
                
                print(f"✓ Document Number: {document_number}")
                print(f"✓ Expiration Date: {expiration_date}")
                print(f"✓ Issuing Authority: {issuing_authority}")
                
                # Additional fields if extracted
                if data.get('confidence'):
                    print(f"\nConfidence Score: {data['confidence']}")
                
                # Check if all required fields were extracted
                print("\n" + "=" * 40)
                if document_number != 'NOT FOUND' and expiration_date != 'NOT FOUND' and issuing_authority != 'NOT FOUND':
                    print("🎉 All required I-9 fields extracted successfully!")
                    print("Manager can now complete Section 2 with this data")
                else:
                    print("⚠️  Some fields were not extracted:")
                    if document_number == 'NOT FOUND':
                        print("   - Missing: Document Number (DL number)")
                    if expiration_date == 'NOT FOUND':
                        print("   - Missing: Expiration Date")
                    if issuing_authority == 'NOT FOUND':
                        print("   - Missing: Issuing Authority (State)")
                
                # Show full response for debugging
                print("\n📊 Full Response:")
                print(json.dumps(result, indent=2))
                
            else:
                print(f"\n❌ Processing failed: {result.get('message', 'Unknown error')}")
                print(f"Full response: {json.dumps(result, indent=2)}")
        else:
            print(f"\n❌ HTTP Error {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error: {response.text[:500]}")
            
    except Exception as e:
        print(f"\n❌ Request failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n🔍 Testing real Tennessee driver's license...")
    print(f"Image: {LICENSE_IMAGE_PATH}")
    
    # Check if the server is running
    try:
        health_response = requests.get(f"{BASE_URL}/api/healthz", timeout=2)
        if health_response.status_code != 200:
            print("⚠️  Backend server may not be running properly")
    except:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("   Make sure the backend is running: python3 -m uvicorn app.main_enhanced:app --reload")
        return
    
    test_license_extraction()
    
    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()