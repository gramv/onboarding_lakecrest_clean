#!/usr/bin/env python3
"""
Test OCR and document storage with the fixed endpoints
"""

import requests
import json
from datetime import datetime, timezone
import os

BASE_URL = "http://localhost:8000"
# Token provided by user for property "mci"
ONBOARDING_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6ImY2N2Y5OWI4LWJiNjMtNDc1ZS04NzI5LWFmNzM3MTAxNDY1MiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NTk4NjM2NywiZXhwIjoxNzU2MjQ1NTY3LCJqdGkiOiJNX1F0QlV3WlA2Y0NhSVphZnQ5U3VRIn0.wx1u4PIkcCcAmvqyC94c4pAwxA2x0DQtojJIVAI071Y"
EMPLOYEE_ID = "f67f99b8-bb63-475e-8729-af7371014652"

def test_document_process_multipart():
    """Test document processing with multipart/form-data"""
    print("\n1. Testing Document Process Endpoint (Multipart)...")
    
    url = f"{BASE_URL}/api/documents/process"
    
    # Create a simple test image file
    from io import BytesIO
    import base64
    
    # Create a minimal valid JPEG image (1x1 pixel, white)
    jpeg_base64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
    image_bytes = base64.b64decode(jpeg_base64)
    
    # Create file-like object
    files = {
        'file': ('test_license.jpg', BytesIO(image_bytes), 'image/jpeg')
    }
    data = {
        'document_type': 'drivers_license',
        'employee_id': EMPLOYEE_ID
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Document process endpoint works with multipart data")
                return True
            else:
                print(f"⚠️  Processing returned: {data.get('message')}")
        else:
            print(f"❌ Failed: {response.text[:500]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_company_policies_save_fixed():
    """Test saving company policies with fixed model"""
    print("\n2. Testing Company Policies Save...")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/company-policies/save"
    headers = {"Authorization": f"Bearer {ONBOARDING_TOKEN}"}
    
    payload = {
        "pdf_base64": "JVBERi0xLjMK",  # Minimal base64
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo=",
            "signedAt": datetime.now(timezone.utc).isoformat(),
            "ipAddress": "127.0.0.1"
        },
        "form_data": {
            "companyPoliciesInitials": "JD",
            "eeoInitials": "JD",
            "sexualHarassmentInitials": "JD",
            "acknowledgmentChecked": True
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Company Policies save endpoint works")
                return True
            else:
                print(f"⚠️  Save returned: {data.get('message')}")
        else:
            print(f"❌ Failed: {response.text[:500]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_i9_section1_fixed():
    """Test I9 section 1 endpoint without completed_at"""
    print("\n3. Testing I9 Section 1 Save (Fixed)...")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-section1/save"
    headers = {"Authorization": f"Bearer {ONBOARDING_TOKEN}"}
    
    payload = {
        "pdf_base64": "JVBERi0xLjMK",  # Minimal base64
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo=",
            "signedAt": datetime.now(timezone.utc).isoformat()
        },
        "form_data": {
            "lastName": "Doe",
            "firstName": "John",
            "middleInitial": "M",
            "dateOfBirth": "1990-01-01",
            "ssn": "123-45-6789",
            "email": "john@example.com",
            "phone": "555-1234",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip": "12345",
            "citizenship": "citizen"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ I9 Section 1 save endpoint works")
                return True
            else:
                print(f"⚠️  Save returned: {data.get('message')}")
        elif response.status_code == 500:
            data = response.json()
            if "completed_at" in str(data):
                print("❌ Still has completed_at column error")
            else:
                print(f"❌ Different error: {data}")
        else:
            print(f"❌ Failed: {response.text[:500]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_w4_save():
    """Test saving W4 form"""
    print("\n4. Testing W4 Form Save...")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/w4-form/save"
    headers = {"Authorization": f"Bearer {ONBOARDING_TOKEN}"}
    
    payload = {
        "pdf_base64": "JVBERi0xLjMK",
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo=",
            "signedAt": datetime.now(timezone.utc).isoformat()
        },
        "form_data": {
            "first_name": "John",
            "last_name": "Doe",
            "ssn": "123-45-6789",
            "filing_status": "single"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ W4 form save endpoint works")
                return True
            else:
                print(f"⚠️  Save returned: {data.get('message')}")
        else:
            print(f"❌ Failed: {response.text[:500]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def main():
    print("=" * 60)
    print("Testing Fixed OCR and Document Storage")
    print("=" * 60)
    print(f"Employee ID: {EMPLOYEE_ID}")
    print(f"Token: {ONBOARDING_TOKEN[:50]}...")
    
    results = []
    
    # Test endpoints
    results.append(("Document Process (Multipart)", test_document_process_multipart()))
    results.append(("Company Policies Save", test_company_policies_save_fixed()))
    results.append(("I9 Section 1 Save", test_i9_section1_fixed()))
    results.append(("W4 Form Save", test_w4_save()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ Working" if passed else "❌ Needs Fix"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL FIXES WORKING! OCR and document storage functional.")
    else:
        print("⚠️  Some issues remain. Check the output above.")
    print("=" * 60)

if __name__ == "__main__":
    main()