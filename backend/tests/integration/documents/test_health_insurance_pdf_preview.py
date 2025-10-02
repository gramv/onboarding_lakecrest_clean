#!/usr/bin/env python3
"""
Test Health Insurance PDF Preview Functionality
Tests the complete flow from frontend request to PDF generation and preview
"""

import requests
import json
import base64
import os
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3002"

def test_health_insurance_pdf_generation():
    """Test the health insurance PDF generation endpoint"""
    print("🧪 Testing Health Insurance PDF Generation...")
    
    # Test data that matches what the frontend sends
    test_data = {
        "employee_data": {
            "personalInfo": {
                "firstName": "John",
                "lastName": "Doe",
                "ssn": "123-45-6789",
                "dateOfBirth": "1990-01-15",
                "address": "123 Main St",
                "city": "Anytown",
                "state": "NY",
                "zipCode": "12345",
                "phone": "(555) 123-4567",
                "email": "john.doe@example.com",
                "gender": "M"
            },
            "medicalPlan": "hra6k",
            "medicalTier": "employee",
            "dentalCoverage": True,
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "visionCoverage": True,
            "visionEnrolled": True,
            "visionTier": "employee",
            "dependents": [],
            "section125Acknowledged": True,
            "effectiveDate": "2025-01-01"
        }
    }
    
    try:
        # Make request to health insurance PDF generation endpoint
        response = requests.post(
            f"{BACKEND_URL}/api/onboarding/test-employee/health-insurance/generate-pdf",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ PDF Generation Successful!")
            print(f"   - Success: {result.get('success')}")
            print(f"   - Message: {result.get('message')}")
            
            # Check if PDF data is present
            pdf_data = result.get('data', {}).get('pdf')
            if pdf_data:
                print(f"   - PDF Data Length: {len(pdf_data)} characters")
                
                # Validate PDF data
                try:
                    pdf_bytes = base64.b64decode(pdf_data)
                    print(f"   - PDF Bytes Length: {len(pdf_bytes)} bytes")
                    
                    # Check PDF header
                    if pdf_bytes.startswith(b'%PDF'):
                        print("   - ✅ Valid PDF header detected")
                        
                        # Save PDF for manual inspection
                        output_file = f"test_health_insurance_preview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                        with open(output_file, 'wb') as f:
                            f.write(pdf_bytes)
                        print(f"   - 📄 PDF saved as: {output_file}")
                        
                        return True, pdf_data
                    else:
                        print("   - ❌ Invalid PDF header")
                        return False, None
                        
                except Exception as e:
                    print(f"   - ❌ PDF decode error: {e}")
                    return False, None
            else:
                print("   - ❌ No PDF data in response")
                return False, None
        else:
            print(f"❌ PDF Generation Failed!")
            print(f"   - Status: {response.status_code}")
            print(f"   - Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False, None

def test_pdf_preview_data_format():
    """Test that the PDF data format matches what PDFViewer expects"""
    print("\n🧪 Testing PDF Preview Data Format...")
    
    success, pdf_data = test_health_insurance_pdf_generation()
    
    if success and pdf_data:
        # Test data URL format (what PDFViewer expects)
        pdf_data_url = f"data:application/pdf;base64,{pdf_data}"
        print(f"   - Data URL Length: {len(pdf_data_url)} characters")
        print(f"   - Data URL Prefix: {pdf_data_url[:50]}...")
        
        # Validate base64 encoding
        try:
            base64.b64decode(pdf_data)
            print("   - ✅ Valid base64 encoding")
        except Exception as e:
            print(f"   - ❌ Invalid base64 encoding: {e}")
            return False
            
        return True
    else:
        print("   - ❌ No PDF data to test")
        return False

def test_frontend_integration():
    """Test frontend integration points"""
    print("\n🧪 Testing Frontend Integration Points...")
    
    # Test if frontend is accessible
    try:
        response = requests.get(f"{FRONTEND_URL}/test-steps", timeout=10)
        if response.status_code == 200:
            print("   - ✅ Frontend accessible")
        else:
            print(f"   - ⚠️ Frontend returned status {response.status_code}")
    except Exception as e:
        print(f"   - ❌ Frontend not accessible: {e}")
        return False
    
    # Test API endpoint accessibility from frontend perspective
    try:
        # This simulates what the frontend ReviewAndSign component does
        test_payload = {
            "employee_data": {
                "personalInfo": {
                    "firstName": "Frontend",
                    "lastName": "Test",
                    "ssn": "987-65-4321"
                },
                "medicalPlan": "hra4k",
                "medicalTier": "employee",
                "section125Acknowledged": True
            }
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/onboarding/test-employee/health-insurance/generate-pdf",
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and result.get('data', {}).get('pdf'):
                print("   - ✅ API endpoint working for frontend requests")
                return True
            else:
                print("   - ❌ API response missing required data")
                return False
        else:
            print(f"   - ❌ API request failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   - ❌ API request failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("HEALTH INSURANCE PDF PREVIEW FUNCTIONALITY TEST")
    print("=" * 60)
    
    # Test 1: Basic PDF generation
    test1_success = test_health_insurance_pdf_generation()
    
    # Test 2: PDF data format
    test2_success = test_pdf_preview_data_format()
    
    # Test 3: Frontend integration
    test3_success = test_frontend_integration()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"PDF Generation: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"Data Format: {'✅ PASS' if test2_success else '❌ FAIL'}")
    print(f"Frontend Integration: {'✅ PASS' if test3_success else '❌ FAIL'}")
    
    if all([test1_success, test2_success, test3_success]):
        print("\n🎉 ALL TESTS PASSED - Health Insurance PDF Preview should work!")
        print("\nNext steps:")
        print("1. Navigate to http://localhost:3002/test-steps")
        print("2. Select 'Health Insurance' step")
        print("3. Fill out the form")
        print("4. Click 'Review and Sign'")
        print("5. Verify PDF preview displays correctly")
    else:
        print("\n❌ SOME TESTS FAILED - Check the issues above")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
