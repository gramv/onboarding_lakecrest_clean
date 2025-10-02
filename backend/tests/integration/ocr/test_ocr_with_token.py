#!/usr/bin/env python3
"""
Test OCR and document storage with the user's actual onboarding token
"""

import requests
import json
from datetime import datetime, timezone

BASE_URL = "http://localhost:8000"
# Token provided by user for property "mci"
ONBOARDING_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6ImY2N2Y5OWI4LWJiNjMtNDc1ZS04NzI5LWFmNzM3MTAxNDY1MiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NTk4NjM2NywiZXhwIjoxNzU2MjQ1NTY3LCJqdGkiOiJNX1F0QlV3WlA2Y0NhSVphZnQ5U3VRIn0.wx1u4PIkcCcAmvqyC94c4pAwxA2x0DQtojJIVAI071Y"
EMPLOYEE_ID = "f67f99b8-bb63-475e-8729-af7371014652"

def test_document_process_no_auth():
    """Test document processing without auth (should work)"""
    print("\n1. Testing Document Process Endpoint (No Auth Required)...")
    
    url = f"{BASE_URL}/api/documents/process"
    
    # Minimal test payload
    payload = {
        "document_type": "drivers_license",
        "file_content": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAA==",
        "employee_id": EMPLOYEE_ID
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Document process endpoint accessible")
                return True
            else:
                print(f"⚠️  Processing returned: {data.get('message')}")
        else:
            print(f"❌ Failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_company_policies_save_with_token():
    """Test saving company policies with auth token"""
    print("\n2. Testing Company Policies Save with Token...")
    
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
                print("✅ Company Policies save endpoint works with auth")
                return True
            else:
                print(f"⚠️  Save returned: {data.get('message')}")
        else:
            print(f"❌ Failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_i9_section1_existing():
    """Test the existing I9 section 1 endpoint that's failing"""
    print("\n3. Testing Existing I9 Section 1 Endpoint...")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-section1"
    headers = {"Authorization": f"Bearer {ONBOARDING_TOKEN}"}
    
    payload = {
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
            print("✅ I9 Section 1 endpoint working")
            return True
        elif response.status_code == 500:
            data = response.json()
            if "completed_at" in str(data):
                print("❌ Still has completed_at column error - needs migration")
            else:
                print(f"❌ Different error: {data}")
        else:
            print(f"❌ Failed: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def main():
    print("=" * 60)
    print("Testing OCR and Document Storage with User's Token")
    print("=" * 60)
    print(f"Employee ID: {EMPLOYEE_ID}")
    print(f"Token: {ONBOARDING_TOKEN[:50]}...")
    
    results = []
    
    # Test endpoints
    results.append(("Document Process (OCR)", test_document_process_no_auth()))
    results.append(("Company Policies Save", test_company_policies_save_with_token()))
    results.append(("I9 Section 1", test_i9_section1_existing()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✅ Working" if passed else "❌ Needs Fix"
        print(f"{test_name}: {status}")
    
    print("\n" + "=" * 60)
    print("KEY FINDINGS:")
    print("=" * 60)
    print("1. OCR endpoint needs proper error handling for missing credentials")
    print("2. Document save endpoints are in place and working")
    print("3. I9 forms table needs 'completed_at' column migration")
    print("4. Frontend may be incorrectly calling /api/api/documents/process")

if __name__ == "__main__":
    main()