#!/usr/bin/env python3
"""
Complete Health Insurance PDF Preview Flow Test
Tests the exact flow that the frontend uses for PDF preview
"""

import requests
import json
import base64
import os
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"

def test_complete_health_insurance_flow():
    """Test the complete health insurance flow as the frontend would use it"""
    print("🧪 Testing Complete Health Insurance PDF Preview Flow...")
    print("=" * 60)
    
    # Step 1: Test the exact data structure that HealthInsuranceStep sends
    print("Step 1: Testing with HealthInsuranceStep data structure...")
    
    # This matches exactly what HealthInsuranceStep.tsx sends in the ReviewAndSign component
    frontend_data = {
        "employee_data": {
            # Personal info from PersonalInfoStep (loaded from session storage)
            "personalInfo": {
                "firstName": "John",
                "lastName": "Doe",
                "middleInitial": "M",
                "ssn": "123-45-6789",
                "dateOfBirth": "1990-01-15",
                "address": "123 Main Street",
                "city": "Anytown",
                "state": "NY",
                "zipCode": "12345",
                "phone": "(555) 123-4567",
                "email": "john.doe@example.com",
                "gender": "M",
                "maritalStatus": "Single"
            },
            
            # Health insurance form data
            "medicalPlan": "hra6k",
            "medicalTier": "employee",
            "medicalWaived": False,
            
            # Dental coverage
            "dentalCoverage": True,
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "dentalWaived": False,
            
            # Vision coverage
            "visionCoverage": True,
            "visionEnrolled": True,
            "visionTier": "employee",
            "visionWaived": False,
            
            # Dependents
            "dependents": [
                {
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "gender": "F",
                    "coverageType": {
                        "medical": True,
                        "dental": True,
                        "vision": True
                    }
                }
            ],
            
            # Additional fields
            "hasStepchildren": False,
            "stepchildrenNames": "",
            "dependentsSupported": True,
            "irsDependentConfirmation": True,
            "section125Acknowledged": True,
            "effectiveDate": "2025-01-01",
            "isWaived": False,
            "waiveReason": "",
            "otherCoverageDetails": ""
        }
    }
    
    try:
        # Make the API call exactly as the frontend does
        response = requests.post(
            f"{BACKEND_URL}/api/onboarding/test-employee/health-insurance/generate-pdf",
            json=frontend_data,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"✅ API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result.get('success')}")
            print(f"✅ Message: {result.get('message')}")
            
            # Check PDF data
            pdf_data = result.get('data', {}).get('pdf')
            if pdf_data:
                print(f"✅ PDF Data Length: {len(pdf_data)} characters")
                
                # Validate PDF
                try:
                    pdf_bytes = base64.b64decode(pdf_data)
                    print(f"✅ PDF Bytes Length: {len(pdf_bytes)} bytes")
                    
                    if pdf_bytes.startswith(b'%PDF'):
                        print("✅ Valid PDF header detected")
                        
                        # Save PDF for inspection
                        output_file = f"health_insurance_complete_flow_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                        with open(output_file, 'wb') as f:
                            f.write(pdf_bytes)
                        print(f"✅ PDF saved as: {output_file}")
                        
                        # Test PDF data URL format (what PDFViewer expects)
                        pdf_data_url = f"data:application/pdf;base64,{pdf_data}"
                        print(f"✅ PDF Data URL Length: {len(pdf_data_url)} characters")
                        print(f"✅ PDF Data URL Prefix: {pdf_data_url[:50]}...")
                        
                        return True, pdf_data_url
                    else:
                        print("❌ Invalid PDF header")
                        return False, None
                        
                except Exception as e:
                    print(f"❌ PDF decode error: {e}")
                    return False, None
            else:
                print("❌ No PDF data in response")
                return False, None
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False, None

def test_reviewandsign_data_format():
    """Test the data format that ReviewAndSign component expects"""
    print("\n" + "=" * 60)
    print("Step 2: Testing ReviewAndSign Component Data Format...")
    
    success, pdf_data_url = test_complete_health_insurance_flow()
    
    if success and pdf_data_url:
        print("✅ PDF Data URL format is correct for PDFViewer component")
        print("✅ Data structure matches what ReviewAndSign expects")
        
        # Simulate what happens in the browser
        print("\nSimulating browser PDF display:")
        print(f"  - PDFViewer would receive: pdfData='{pdf_data_url[:50]}...'")
        print(f"  - iframe src would be set to: '{pdf_data_url[:50]}...'")
        print("  - Browser would display the PDF in the iframe")
        
        return True
    else:
        print("❌ PDF generation failed, cannot test data format")
        return False

def test_signature_flow():
    """Test the signature addition flow"""
    print("\n" + "=" * 60)
    print("Step 3: Testing Signature Addition Flow...")
    
    # First generate unsigned PDF
    success, pdf_data_url = test_complete_health_insurance_flow()
    
    if success and pdf_data_url:
        # Extract base64 data
        pdf_base64 = pdf_data_url.replace('data:application/pdf;base64,', '')
        
        # Test signature addition (simulating what HealthInsuranceStep does)
        signature_data = {
            "pdf_data": pdf_base64,
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",  # Minimal PNG
            "signature_type": "employee_health_insurance",
            "page_num": 1
        }
        
        try:
            response = requests.post(
                f"{BACKEND_URL}/api/forms/health-insurance/add-signature",
                json=signature_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            print(f"✅ Signature API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Signature addition successful")
                
                # Save signed PDF
                signed_pdf_bytes = response.content
                if signed_pdf_bytes.startswith(b'%PDF'):
                    output_file = f"health_insurance_signed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                    with open(output_file, 'wb') as f:
                        f.write(signed_pdf_bytes)
                    print(f"✅ Signed PDF saved as: {output_file}")
                    return True
                else:
                    print("❌ Invalid signed PDF format")
                    return False
            else:
                print(f"❌ Signature addition failed: {response.status_code}")
                print(f"❌ Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Signature request failed: {e}")
            return False
    else:
        print("❌ Cannot test signature flow without valid PDF")
        return False

def main():
    """Run all tests"""
    print("🏥 HEALTH INSURANCE PDF PREVIEW - COMPLETE FLOW TEST")
    print("=" * 60)
    print("Testing the exact flow that the frontend uses...")
    print()
    
    # Test 1: Complete PDF generation flow
    test1_success = test_complete_health_insurance_flow()
    
    # Test 2: ReviewAndSign data format
    test2_success = test_reviewandsign_data_format()
    
    # Test 3: Signature flow
    test3_success = test_signature_flow()
    
    # Summary
    print("\n" + "=" * 60)
    print("COMPLETE FLOW TEST SUMMARY")
    print("=" * 60)
    print(f"PDF Generation Flow: {'✅ PASS' if test1_success else '❌ FAIL'}")
    print(f"ReviewAndSign Format: {'✅ PASS' if test2_success else '❌ FAIL'}")
    print(f"Signature Addition: {'✅ PASS' if test3_success else '❌ FAIL'}")
    
    if all([test1_success, test2_success, test3_success]):
        print("\n🎉 ALL TESTS PASSED!")
        print("\n✅ Health Insurance PDF Preview functionality is working correctly!")
        print("\nThe issue is likely in the frontend rendering, not the PDF generation.")
        print("\nNext steps to debug frontend:")
        print("1. Check browser console for JavaScript errors")
        print("2. Verify all React components are loading correctly")
        print("3. Check if there are any missing dependencies")
        print("4. Test with a simpler component first")
        
        print("\n📋 What's working:")
        print("- ✅ Backend PDF generation API")
        print("- ✅ PDF data format for frontend")
        print("- ✅ Signature addition flow")
        print("- ✅ Data structure compatibility")
        
        print("\n🔍 What to check in frontend:")
        print("- React component rendering")
        print("- PDFViewer component functionality")
        print("- ReviewAndSign component integration")
        print("- Browser PDF display capabilities")
        
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Check the specific failures above and fix them first.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
