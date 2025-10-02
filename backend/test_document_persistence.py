#!/usr/bin/env python3
"""
Test document persistence and cross-browser synchronization
This simulates uploading documents and generating PDFs in one session,
then verifying they're accessible from another session.
"""

import requests
import json
import time
import base64
from datetime import datetime

# API base URL
API_URL = "http://localhost:8000/api"

# Test data - use a real test token if available
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"
TEST_EMPLOYEE_ID = "19310a36-797c-4464-945b-a4a06a5e17c2"

def test_generate_pdf(document_type, form_data=None):
    """Generate a PDF and verify it's saved to Supabase"""
    print(f"\n📄 Generating {document_type} PDF...")
    
    endpoint_map = {
        "w4": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/w4-form/generate-pdf",
        "direct-deposit": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/direct-deposit/generate-pdf",
        "health-insurance": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
        "company-policies": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/company-policies/generate-pdf",
        "weapons-policy": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/weapons-policy/generate-pdf",
        "human-trafficking": f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/human-trafficking/generate-pdf",
    }
    
    if document_type not in endpoint_map:
        print(f"❌ Unknown document type: {document_type}")
        return None
    
    try:
        # Prepare request data
        request_data = {}
        if form_data:
            request_data['employee_data'] = form_data
        
        response = requests.post(
            endpoint_map[document_type],
            json=request_data,
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                pdf_data = data['data']
                print(f"✅ PDF generated successfully!")
                print(f"   Filename: {pdf_data.get('filename')}")
                
                # Check if Supabase URL was created
                if pdf_data.get('pdf_url'):
                    print(f"✅ PDF saved to Supabase!")
                    print(f"   URL: {pdf_data['pdf_url'][:100]}...")
                    return pdf_data['pdf_url']
                else:
                    print(f"⚠️  PDF generated but not saved to Supabase")
                    return None
        else:
            print(f"❌ Failed to generate PDF: {response.status_code}")
            print(f"   Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        return None

def test_upload_document(document_type, file_data=None):
    """Simulate uploading a document (I-9 docs, voided check)"""
    print(f"\n📤 Uploading {document_type}...")
    
    if document_type == "voided-check":
        # Create a simple test image as base64
        if not file_data:
            # Create a minimal 1x1 pixel PNG in base64
            file_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        try:
            response = requests.post(
                f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/direct-deposit/validate-check",
                json={
                    "image_data": file_data,
                    "file_name": "test_voided_check.png",
                    "manual_data": {
                        "routing_number": "123456789",
                        "account_number": "987654321"
                    }
                },
                headers={"Authorization": f"Bearer {TEST_TOKEN}"}
            )
            
            if response.status_code == 200:
                print("✅ Voided check uploaded and processed!")
                return True
            else:
                print(f"❌ Failed to upload voided check: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error uploading voided check: {e}")
            return False
    
    return False

def test_load_progress_from_cloud():
    """Test loading all saved progress and documents from cloud"""
    print("\n🌐 Loading progress from cloud (simulating different browser)...")
    
    try:
        # Get welcome data with saved progress
        response = requests.get(
            f"{API_URL}/onboarding/welcome/{TEST_TOKEN}",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if 'data' in data:
                welcome_data = data['data']
                
                # Check for saved form data
                if 'savedFormData' in welcome_data and welcome_data['savedFormData']:
                    print("✅ Found saved form data!")
                    for step_id, step_data in welcome_data['savedFormData'].items():
                        print(f"   - {step_id}: {len(str(step_data))} bytes")
                
                # Check for saved progress
                if 'savedProgress' in welcome_data and welcome_data['savedProgress']:
                    print("✅ Found saved progress!")
                    for step_id, progress_data in welcome_data['savedProgress'].items():
                        print(f"   - {step_id}: completed={progress_data.get('completed', False)}")
                        
                        # Check for saved PDF URLs
                        if progress_data.get('data'):
                            step_data = progress_data['data']
                            if step_data.get('pdf_url'):
                                print(f"     📄 PDF URL saved: {step_data['pdf_url'][:50]}...")
                            if step_data.get('voided_check_url'):
                                print(f"     🏦 Voided check URL saved: {step_data['voided_check_url'][:50]}...")
                
                return True
            else:
                print("⚠️  No saved data found in welcome response")
                return False
        else:
            print(f"❌ Failed to load welcome data: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error loading progress: {e}")
        return False

def test_recovery_endpoint():
    """Test the dedicated recovery endpoint for progress data"""
    print("\n🔄 Testing recovery endpoint...")
    
    try:
        response = requests.get(
            f"{API_URL}/onboarding/recover-progress/{TEST_EMPLOYEE_ID}",
            params={"token": TEST_TOKEN},
            headers={"Authorization": f"Bearer {TEST_TOKEN}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'savedProgress' in data['data']:
                saved_progress = data['data']['savedProgress']
                if saved_progress:
                    print("✅ Recovery endpoint working!")
                    print(f"   Found {len(saved_progress)} steps with saved data")
                    
                    # Check for document URLs
                    doc_count = 0
                    for step_id, progress in saved_progress.items():
                        if progress.get('data'):
                            step_data = progress['data']
                            if step_data.get('pdf_url') or step_data.get('voided_check_url'):
                                doc_count += 1
                    
                    if doc_count > 0:
                        print(f"   📁 Found {doc_count} steps with saved documents")
                    
                    return True
            
            print("⚠️  Recovery endpoint returned no data")
            return False
        else:
            print(f"❌ Recovery endpoint failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling recovery endpoint: {e}")
        return False

def main():
    """Run comprehensive document persistence tests"""
    print("=" * 60)
    print("DOCUMENT PERSISTENCE & CROSS-BROWSER SYNC TEST")
    print("=" * 60)
    print(f"Using Employee ID: {TEST_EMPLOYEE_ID}")
    print(f"API URL: {API_URL}")
    
    results = {}
    
    # Test 1: Generate various PDFs
    print("\n📝 PHASE 1: Generating Documents")
    print("-" * 40)
    
    # Generate W-4 PDF
    w4_data = {
        "first_name": "John",
        "last_name": "Doe",
        "ssn": "123-45-6789",
        "filing_status": "single",
        "address": "123 Test St",
        "city": "Test City",
        "state": "TS",
        "zip_code": "12345"
    }
    results['w4_pdf'] = test_generate_pdf("w4", w4_data)
    
    # Generate Direct Deposit PDF
    dd_data = {
        "firstName": "John",
        "lastName": "Doe",
        "primaryAccount": {
            "bankName": "Test Bank",
            "accountType": "checking",
            "routingNumber": "123456789",
            "accountNumber": "987654321"
        },
        "depositType": "full"
    }
    results['dd_pdf'] = test_generate_pdf("direct-deposit", dd_data)
    
    # Generate Company Policies PDF
    results['policies_pdf'] = test_generate_pdf("company-policies")
    
    # Test 2: Upload voided check
    print("\n📝 PHASE 2: Uploading Documents")
    print("-" * 40)
    results['voided_check'] = test_upload_document("voided-check")
    
    # Wait for database sync
    print("\n⏳ Waiting 3 seconds for database sync...")
    time.sleep(3)
    
    # Test 3: Load progress from "different browser"
    print("\n📝 PHASE 3: Cross-Browser Verification")
    print("-" * 40)
    results['cloud_load'] = test_load_progress_from_cloud()
    results['recovery'] = test_recovery_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, result in results.items():
        status = "PASSED" if result else "FAILED"
        if not result:
            all_passed = False
        print(f"{'✅' if result else '❌'} {test_name}: {status}")
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED!")
        print("Documents are being saved to Supabase and are accessible across browsers!")
    else:
        print("\n⚠️  Some tests failed - check the output above for details")
        print("Note: Make sure the backend is running and Supabase buckets are created")

if __name__ == "__main__":
    main()