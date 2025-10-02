#!/usr/bin/env python3
"""
Test script to verify document processing and save endpoints work
"""

import requests
import json
import base64
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_company_policies_save():
    """Test saving company policies document"""
    print("\n1. Testing Company Policies Save Endpoint...")
    
    employee_id = "test-employee-123"
    url = f"{BASE_URL}/api/onboarding/{employee_id}/company-policies/save"
    
    payload = {
        "pdf_base64": "JVBERi0xLjMKJeLjz9MK...",  # Sample base64
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo...",
            "signedAt": datetime.utcnow().isoformat(),
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
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Company Policies document saved successfully")
                return True
            else:
                print(f"❌ Failed to save: {data.get('message')}")
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_document_process():
    """Test document OCR processing endpoint"""
    print("\n2. Testing Document Process Endpoint...")
    
    url = f"{BASE_URL}/api/documents/process"
    
    payload = {
        "document_type": "drivers_license",
        "file_content": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",  # Sample base64
        "employee_id": "test-employee-123"
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Document processed successfully")
                print(f"   Extracted data: {data.get('data', {}).get('extracted_fields', {})}")
                return True
            else:
                print(f"❌ Processing failed: {data.get('message')}")
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_w4_save():
    """Test saving W4 form"""
    print("\n3. Testing W4 Form Save Endpoint...")
    
    employee_id = "test-employee-123"
    url = f"{BASE_URL}/api/onboarding/{employee_id}/w4-form/save"
    
    payload = {
        "pdf_base64": "JVBERi0xLjMKJeLjz9MK...",
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo...",
            "signedAt": datetime.utcnow().isoformat()
        },
        "form_data": {
            "first_name": "John",
            "last_name": "Doe",
            "ssn": "123-45-6789",
            "filing_status": "single"
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ W4 form saved successfully")
                return True
            else:
                print(f"❌ Failed to save: {data.get('message')}")
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def test_i9_save():
    """Test saving I9 form"""
    print("\n4. Testing I9 Form Save Endpoint...")
    
    employee_id = "test-employee-123"
    url = f"{BASE_URL}/api/onboarding/{employee_id}/i9-section1/save"
    
    payload = {
        "pdf_base64": "JVBERi0xLjMKJeLjz9MK...",
        "signature_data": {
            "signatureImage": "data:image/png;base64,iVBORw0KGgo...",
            "signedAt": datetime.utcnow().isoformat()
        },
        "form_data": {
            "lastName": "Doe",
            "firstName": "John",
            "dateOfBirth": "1990-01-01",
            "ssn": "123-45-6789",
            "citizenship": "citizen"
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ I9 form saved successfully")
                return True
            else:
                print(f"❌ Failed to save: {data.get('message')}")
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

def main():
    print("=" * 50)
    print("Testing Document Processing and Storage Endpoints")
    print("=" * 50)
    
    results = []
    
    # Test each endpoint
    results.append(("Company Policies Save", test_company_policies_save()))
    results.append(("Document Process (OCR)", test_document_process()))
    results.append(("W4 Form Save", test_w4_save()))
    results.append(("I9 Form Save", test_i9_save()))
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 All document endpoints working!")
    else:
        print("\n⚠️  Some endpoints failed. Check implementation.")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)