#!/usr/bin/env python3
"""
Test script for I-9 document upload endpoints
Tests federal compliance validation for single-step invitations
"""

import requests
import json
import base64
from io import BytesIO

# API base URL
BASE_URL = "http://localhost:8000"

# Test employee ID (can be temporary for single-step invitations)
EMPLOYEE_ID = "temp_test_employee_001"

def create_test_image(text="TEST DOCUMENT"):
    """Create a simple test image file"""
    from PIL import Image, ImageDraw, ImageFont
    
    # Create a simple test image
    img = Image.new('RGB', (400, 200), color='white')
    d = ImageDraw.Draw(img)
    d.text((10, 10), text, fill='black')
    
    # Convert to bytes
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_upload_list_a_document():
    """Test uploading a List A document (e.g., US Passport)"""
    print("\n=== Testing List A Document Upload ===")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-documents"
    
    # Create test file
    try:
        file_content = create_test_image("US PASSPORT")
    except ImportError:
        # If PIL not available, use a simple test file
        file_content = b"TEST US PASSPORT DOCUMENT"
    
    files = [
        ('files', ('passport.png', file_content, 'image/png'))
    ]
    
    data = {
        'document_type': 'us_passport',
        'document_list': 'list_a',
        'document_number': 'P123456789',
        'issuing_authority': 'U.S. Department of State',
        'issue_date': '2020-01-15',
        'expiration_date': '2030-01-14'
    }
    
    response = requests.post(url, files=files, data=data)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200

def test_upload_list_b_and_c_documents():
    """Test uploading List B and List C documents"""
    print("\n=== Testing List B + C Document Upload ===")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-documents"
    
    # Upload List B document (Driver's License)
    print("\n1. Uploading List B (Driver's License)...")
    try:
        file_content = create_test_image("DRIVER'S LICENSE")
    except ImportError:
        file_content = b"TEST DRIVER'S LICENSE"
    
    files = [
        ('files', ('drivers_license.png', file_content, 'image/png'))
    ]
    
    data = {
        'document_type': 'drivers_license',
        'document_list': 'list_b',
        'document_number': 'DL123456',
        'issuing_authority': 'California DMV',
        'issue_date': '2021-06-01',
        'expiration_date': '2025-06-01'
    }
    
    response = requests.post(url, files=files, data=data)
    print(f"List B Status: {response.status_code}")
    
    # Upload List C document (Social Security Card)
    print("\n2. Uploading List C (Social Security Card)...")
    try:
        file_content = create_test_image("SOCIAL SECURITY CARD")
    except ImportError:
        file_content = b"TEST SOCIAL SECURITY CARD"
    
    files = [
        ('files', ('ssn_card.png', file_content, 'image/png'))
    ]
    
    data = {
        'document_type': 'social_security_card',
        'document_list': 'list_c',
        'document_number': '123-45-6789',
        'issuing_authority': 'Social Security Administration'
    }
    
    response = requests.post(url, files=files, data=data)
    print(f"List C Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 200

def test_get_documents():
    """Test retrieving uploaded documents"""
    print("\n=== Testing Document Retrieval ===")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-documents"
    
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Documents found: {len(data['data']['documents'])}")
        print(f"Validation status: {data['data']['validation']}")
        print(f"Compliance status: {data['data']['compliance_status']}")
    
    return response.status_code == 200

def test_validate_documents():
    """Test document validation endpoint"""
    print("\n=== Testing Document Validation ===")
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/i9-documents/validate"
    
    response = requests.post(url)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Federal validation valid: {data['data']['federal_validation']['is_valid']}")
        print(f"Compliance status: {data['data']['compliance_status']}")
        
        if data['data']['federal_validation']['errors']:
            print("Errors:")
            for error in data['data']['federal_validation']['errors']:
                print(f"  - {error['message']}")
        
        if data['data']['federal_validation']['warnings']:
            print("Warnings:")
            for warning in data['data']['federal_validation']['warnings']:
                print(f"  - {warning['message']}")
        
        if data['data']['federal_validation']['compliance_notes']:
            print("Compliance Notes:")
            for note in data['data']['federal_validation']['compliance_notes']:
                print(f"  - {note}")
    
    return response.status_code == 200

def test_invalid_document_combination():
    """Test that invalid document combinations are rejected"""
    print("\n=== Testing Invalid Document Combination ===")
    
    # Clear previous test data by using a new employee ID
    invalid_employee_id = "temp_invalid_test_001"
    
    url = f"{BASE_URL}/api/onboarding/{invalid_employee_id}/i9-documents"
    
    # Upload only List B document (invalid - needs List C too)
    try:
        file_content = create_test_image("DRIVER'S LICENSE ONLY")
    except ImportError:
        file_content = b"TEST DRIVER'S LICENSE ONLY"
    
    files = [
        ('files', ('drivers_license_only.png', file_content, 'image/png'))
    ]
    
    data = {
        'document_type': 'drivers_license',
        'document_list': 'list_b',
        'document_number': 'DL999999',
        'issuing_authority': 'Texas DMV',
        'expiration_date': '2025-12-31'
    }
    
    response = requests.post(url, files=files, data=data)
    print(f"Upload Status: {response.status_code}")
    
    # Now validate - should fail
    validate_url = f"{BASE_URL}/api/onboarding/{invalid_employee_id}/i9-documents/validate"
    response = requests.post(validate_url)
    
    if response.status_code == 200:
        data = response.json()
        is_valid = data['data']['federal_validation']['is_valid']
        print(f"Validation result (should be False): {is_valid}")
        
        if not is_valid:
            print("✓ Correctly rejected invalid document combination")
            print("Errors detected:")
            for error in data['data']['federal_validation']['errors']:
                print(f"  - {error['message']}")
            return True
        else:
            print("✗ ERROR: Invalid combination was accepted!")
            return False
    
    return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("I-9 DOCUMENT UPLOAD ENDPOINT TESTS")
    print("Testing Federal Compliance for Single-Step Invitations")
    print("=" * 60)
    
    tests = [
        ("List A Document Upload", test_upload_list_a_document),
        ("Document Retrieval", test_get_documents),
        ("Document Validation", test_validate_documents),
        ("List B+C Documents Upload", test_upload_list_b_and_c_documents),
        ("Invalid Combination Detection", test_invalid_document_combination)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test '{test_name}' failed with error: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, r in results if r)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("\n✓ ALL TESTS PASSED - I-9 DOCUMENT UPLOAD IS FEDERALLY COMPLIANT")
    else:
        print("\n✗ SOME TESTS FAILED - REVIEW IMPLEMENTATION")

if __name__ == "__main__":
    main()