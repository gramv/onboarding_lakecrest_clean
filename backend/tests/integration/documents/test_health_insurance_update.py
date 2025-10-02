#!/usr/bin/env python3
"""
Test script to verify health insurance endpoints work with the new data structure
that includes personalInfo within the form data.
"""

import requests
import json
import base64
from datetime import datetime

# Base URL for the API
BASE_URL = "http://localhost:8000"

# Test employee ID
EMPLOYEE_ID = "test-emp-001"

# New data structure from frontend
test_data = {
    "personalInfo": {
        "firstName": "John",
        "lastName": "Doe",
        "middleInitial": "A",
        "ssn": "123-45-6789",
        "dateOfBirth": "1990-01-01",
        "address": "123 Main St",
        "city": "Austin",
        "state": "TX",
        "zipCode": "78701",
        "phone": "555-1234",
        "email": "john.doe@example.com",
        "gender": "M"
    },
    "medicalPlan": "hra_6k",
    "medicalTier": "employee_spouse",
    "dentalCoverage": True,
    "dentalTier": "employee",
    "visionCoverage": True,
    "visionTier": "employee",
    "dependents": [
        {
            "firstName": "Jane",
            "lastName": "Doe",
            "middleInitial": "",
            "relationship": "Spouse",
            "dateOfBirth": "1992-01-01",
            "ssn": "987-65-4321",
            "gender": "F",
            "coverageTypes": ["medical", "dental", "vision"]
        }
    ],
    "section125Acknowledgment": True,
    "irsDependentConfirmation": True,
    "hasStepchildren": False,
    "dependentsSupported": True,
    "stepchildrenNames": "",
    "isWaived": False
}

def test_save_health_insurance():
    """Test saving health insurance data with new structure"""
    print("\n1. Testing Save Health Insurance Endpoint")
    print("-" * 50)
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/health-insurance"
    
    try:
        response = requests.post(url, json=test_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ Health insurance data saved successfully")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"✗ Failed to save: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_preview_pdf():
    """Test preview PDF generation with new structure"""
    print("\n2. Testing Health Insurance Preview PDF")
    print("-" * 50)
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/health-insurance/preview"
    
    request_data = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(url, json=request_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('data', {}).get('pdf'):
                print("✓ Preview PDF generated successfully")
                print(f"Filename: {result['data'].get('filename')}")
                
                # Check for warnings
                warnings = result['data'].get('warnings', [])
                if warnings:
                    print(f"Warnings: {warnings}")
                else:
                    print("No warnings")
                
                # Save preview PDF for inspection
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                preview_filename = f"test_hi_preview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                with open(preview_filename, 'wb') as f:
                    f.write(pdf_bytes)
                print(f"Preview PDF saved as: {preview_filename}")
            else:
                print("✗ No PDF in response")
        else:
            print(f"✗ Failed to generate preview: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_generate_pdf_with_signature():
    """Test final PDF generation with signature"""
    print("\n3. Testing Health Insurance Final PDF with Signature")
    print("-" * 50)
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/health-insurance/generate-pdf"
    
    # Create a simple test signature (base64 encoded 1x1 transparent PNG)
    test_signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    request_data = {
        "employee_data": test_data,
        "signature_data": {
            "signatureImage": test_signature,
            "timestamp": datetime.now().isoformat()
        }
    }
    
    try:
        response = requests.post(url, json=request_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('data', {}).get('pdf'):
                print("✓ Final PDF with signature generated successfully")
                print(f"Filename: {result['data'].get('filename')}")
                
                # Check for warnings
                warnings = result['data'].get('warnings', [])
                if warnings:
                    print(f"Warnings: {warnings}")
                else:
                    print("No warnings")
                
                # Save final PDF for inspection
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                final_filename = f"test_hi_final_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                with open(final_filename, 'wb') as f:
                    f.write(pdf_bytes)
                print(f"Final PDF saved as: {final_filename}")
            else:
                print("✗ No PDF in response")
        else:
            print(f"✗ Failed to generate final PDF: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_without_personal_info():
    """Test that endpoints still work without personalInfo (backward compatibility)"""
    print("\n4. Testing Backward Compatibility (without personalInfo)")
    print("-" * 50)
    
    # Old structure without personalInfo
    old_data = {
        "medicalPlan": "hra_4k",
        "medicalTier": "employee",
        "dentalCoverage": False,
        "visionCoverage": False,
        "dependents": [],
        "irsDependentConfirmation": False,
        "hasStepchildren": False,
        "dependentsSupported": False,
        "isWaived": False
    }
    
    url = f"{BASE_URL}/api/onboarding/{EMPLOYEE_ID}/health-insurance/preview"
    request_data = {"employee_data": old_data}
    
    try:
        response = requests.post(url, json=request_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✓ Backward compatibility maintained - PDF generated without personalInfo")
                warnings = result['data'].get('warnings', [])
                if warnings:
                    print(f"Expected warnings: {warnings}")
            else:
                print("✗ Failed to generate PDF")
        else:
            print(f"✗ Request failed: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Health Insurance Endpoint Test Suite")
    print("Testing new data structure with personalInfo")
    print("=" * 60)
    
    # Make sure the server is running
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code != 200:
            print("⚠️  Server may not be running properly")
    except:
        print("❌ Server is not running! Start it with:")
        print("   cd hotel-onboarding-backend")
        print("   python3 -m uvicorn app.main_enhanced:app --reload")
        exit(1)
    
    # Run tests
    results = []
    results.append(("Save Health Insurance", test_save_health_insurance()))
    results.append(("Preview PDF", test_preview_pdf()))
    results.append(("Generate Final PDF", test_generate_pdf_with_signature()))
    results.append(("Backward Compatibility", test_without_personal_info()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)
    
    print(f"\nTotal: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("\n🎉 All tests passed! The health insurance endpoints are working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the output above for details.")