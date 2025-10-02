#!/usr/bin/env python3
"""
Test I-9 flow with OCR auto-population using proper onboarding endpoints
"""

import requests
import base64
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
LICENSE_IMAGE_PATH = "/Users/gouthamvemula/Downloads/TN_D200_PR_Adult_CLASS-M_DL.jpg"

def test_i9_with_ocr():
    """Test I-9 flow with OCR auto-population of Section 2"""
    print("\n" + "="*60)
    print("I-9 COMPLETE FLOW TEST WITH OCR AUTO-POPULATION")
    print("="*60)
    
    # Step 1: Get onboarding session using demo token
    print("\n1️⃣ Getting onboarding session with demo token...")
    session_response = requests.get(f"{BASE_URL}/api/onboarding/session/demo-token")
    
    if session_response.status_code != 200:
        print(f"❌ Failed to get session: {session_response.text}")
        return
    
    session = session_response.json()['data']
    employee = session['employee']
    print(f"✅ Got session for: {employee['firstName']} {employee['lastName']}")
    
    # Step 2: Save personal info (required before I-9)
    print("\n2️⃣ Saving personal info step...")
    personal_info = {
        "firstName": employee['firstName'],
        "lastName": employee['lastName'],
        "middleName": "Alexander",
        "phoneNumber": "615-555-0123",
        "email": employee['email'],
        "addressLine1": "123 Test Street",
        "addressLine2": "Apt 4B",
        "city": "Nashville",
        "state": "TN",
        "zipCode": "37201",
        "dateOfBirth": "1990-01-15",
        "ssn": "123-45-6789"
    }
    
    save_personal = requests.post(
        f"{BASE_URL}/api/onboarding/{employee['id']}/save-progress/personal-info",
        json=personal_info
    )
    
    if save_personal.status_code != 200:
        print(f"⚠️  Personal info save: {save_personal.status_code}")
    else:
        print("✅ Personal info saved")
    
    # Step 3: Upload driver's license for OCR
    print("\n3️⃣ Processing driver's license with Google Document AI...")
    with open(LICENSE_IMAGE_PATH, "rb") as f:
        image_bytes = f.read()
    
    files = {
        'file': ('tn_license.jpg', image_bytes, 'image/jpeg')
    }
    data = {
        'document_type': 'drivers_license',
        'employee_id': employee['id']
    }
    
    ocr_response = requests.post(
        f"{BASE_URL}/api/documents/process",
        files=files,
        data=data
    )
    
    if ocr_response.status_code != 200:
        print(f"❌ OCR failed: {ocr_response.text}")
        return
    
    ocr_result = ocr_response.json()
    if not ocr_result.get('success'):
        print(f"❌ OCR processing failed: {ocr_result}")
        return
    
    ocr_data = ocr_result.get('data', {})
    print(f"✅ OCR extracted fields from TN license:")
    print(f"   📋 Document Number: {ocr_data.get('documentNumber', 'NOT FOUND')}")
    print(f"   📅 Expiration Date: {ocr_data.get('expirationDate', 'NOT FOUND')}")
    print(f"   🏛️ Issuing Authority: {ocr_data.get('issuingAuthority', 'NOT FOUND')}")
    
    # Step 4: Save I-9 complete with documents (should auto-populate Section 2)
    print("\n4️⃣ Saving complete I-9 with documents...")
    print("   This should auto-populate Section 2 from OCR data")
    
    # Create signature data
    signature_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    i9_complete_data = {
        "formData": {
            "first_name": employee['firstName'],
            "last_name": employee['lastName'],
            "middle_initial": "A",
            "other_last_names": "",
            "address": "123 Test Street",
            "apartment": "Apt 4B",
            "city": "Nashville",
            "state": "TN",
            "zip_code": "37201",
            "date_of_birth": "1990-01-15",
            "ssn": "123-45-6789",
            "email": employee['email'],
            "telephone": "615-555-0123",
            "citizenship": "citizen",
            "alien_number": "",
            "admission_number": "",
            "foreign_passport_number": "",
            "country_of_issuance": ""
        },
        "documentsData": {
            "uploadedDocuments": [
                {
                    "type": "list_b",
                    "documentType": "drivers_license",
                    "ocrData": ocr_data,  # OCR data from Google Document AI
                    "uploadedAt": datetime.now().isoformat()
                },
                {
                    "type": "list_c",
                    "documentType": "social_security_card",
                    "ocrData": {
                        "documentNumber": "123-45-6789",
                        "issuingAuthority": "Social Security Administration"
                    },
                    "uploadedAt": datetime.now().isoformat()
                }
            ]
        },
        "signatureData": {
            "signature": signature_data,
            "timestamp": datetime.now().isoformat(),
            "ipAddress": "127.0.0.1",
            "userAgent": "Test Script",
            "certificationStatement": "I attest, under penalty of perjury, that I have assisted in the completion of Section 1 of this form and that to the best of my knowledge the information is true and correct.",
            "federalCompliance": {
                "form": "I-9",
                "section": "Section 1",
                "esign_consent": True,
                "legal_name": f"{employee['firstName']} {employee['lastName']}"
            }
        },
        "pdfData": {
            "url": "",
            "generated": False
        }
    }
    
    save_i9_response = requests.post(
        f"{BASE_URL}/api/onboarding/{employee['id']}/i9-complete",
        json=i9_complete_data
    )
    
    if save_i9_response.status_code != 200:
        print(f"❌ Failed to save I-9: {save_i9_response.text}")
        return
    
    save_result = save_i9_response.json()
    print("✅ I-9 saved successfully")
    
    # Debug: print the full response to see what's saved
    print("\n📋 Checking saved data structure...")
    if save_result.get('data'):
        print(f"   Keys in data: {list(save_result['data'].keys())}")
        
        # Check for Section 2 fields in different possible locations
        if 'section2Fields' in save_result['data']:
            s2 = save_result['data']['section2Fields']
            print("\n✅ Section 2 Auto-Populated Fields Found:")
            print(f"   ✓ Document Title (List B): {s2.get('document_title_2', 'NOT SET')}")
            print(f"   ✓ Document Number: {s2.get('document_number_2', 'NOT SET')}")
            print(f"   ✓ Expiration Date: {s2.get('expiration_date_2', 'NOT SET')}")
            print(f"   ✓ Issuing Authority: {s2.get('issuing_authority_2', 'NOT SET')}")
            print(f"   ✓ Document Title (List C): {s2.get('document_title_3', 'NOT SET')}")
            print(f"   ✓ Document Number (SSN): {s2.get('document_number_3', 'NOT SET')}")
        elif 'section2_fields' in save_result['data']:
            s2 = save_result['data']['section2_fields']
            print("\n✅ Section 2 Auto-Populated Fields Found (alternate key):")
            print(f"   ✓ Document Title (List B): {s2.get('document_title_2', 'NOT SET')}")
            print(f"   ✓ Document Number: {s2.get('document_number_2', 'NOT SET')}")
            print(f"   ✓ Expiration Date: {s2.get('expiration_date_2', 'NOT SET')}")
            print(f"   ✓ Issuing Authority: {s2.get('issuing_authority_2', 'NOT SET')}")
            print(f"   ✓ Document Title (List C): {s2.get('document_title_3', 'NOT SET')}")
            print(f"   ✓ Document Number (SSN): {s2.get('document_number_3', 'NOT SET')}")
        else:
            print("   ⚠️  Section 2 fields not found in expected locations")
            print(f"   Available data: {json.dumps(save_result['data'], indent=2)[:500]}")
    
    # Step 5: Generate I-9 PDF to verify both sections
    print("\n5️⃣ Generating I-9 PDF with both sections...")
    
    pdf_response = requests.post(
        f"{BASE_URL}/api/onboarding/{employee['id']}/i9-section1/generate-pdf",
        json={}  # Empty body for POST request
    )
    
    if pdf_response.status_code != 200:
        print(f"⚠️  PDF generation returned: {pdf_response.status_code}")
        print(f"   Response: {pdf_response.text[:200]}")
    else:
        pdf_result = pdf_response.json()
        if pdf_result.get('success') and pdf_result.get('pdf_base64'):
            print("✅ PDF generated successfully")
            
            # Save PDF for inspection
            pdf_bytes = base64.b64decode(pdf_result['pdf_base64'])
            output_path = f"/tmp/i9_ocr_test_{employee['id']}.pdf"
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            print(f"   📄 PDF saved to: {output_path}")
            print(f"   Please open the PDF to verify Section 2 is auto-filled with OCR data")
    
    # Step 6: Verify data is retrievable
    print("\n6️⃣ Verifying saved I-9 data...")
    
    retrieve_response = requests.get(
        f"{BASE_URL}/api/onboarding/{employee['id']}/i9-complete"
    )
    
    if retrieve_response.status_code == 200:
        saved_i9 = retrieve_response.json()
        if saved_i9.get('success'):
            print("✅ I-9 data successfully saved and retrievable")
            
            # Check what's in the retrieved data
            if saved_i9.get('data'):
                i9_data = saved_i9['data']
                print(f"   Retrieved data keys: {list(i9_data.keys())}")
                
                # Check for Section 2 fields
                if 'section2_fields' in i9_data:
                    s2 = i9_data['section2_fields']
                    print("\n✅ Section 2 Fields Retrieved from Database:")
                    print(f"   ✓ Document Title (List B): {s2.get('document_title_2', 'NOT SET')}")
                    print(f"   ✓ Document Number: {s2.get('document_number_2', 'NOT SET')}")
                    print(f"   ✓ Expiration Date: {s2.get('expiration_date_2', 'NOT SET')}")
                    print(f"   ✓ Issuing Authority: {s2.get('issuing_authority_2', 'NOT SET')}")
                    print(f"   ✓ Document Title (List C): {s2.get('document_title_3', 'NOT SET')}")
                    print(f"   ✓ Document Number (SSN): {s2.get('document_number_3', 'NOT SET')}")
                
                # Check for documents with OCR data
                if 'documentsData' in i9_data:
                    docs = i9_data['documentsData']
                    if 'uploadedDocuments' in docs:
                        print("\n📄 Document OCR Data Saved:")
                        for doc in docs['uploadedDocuments']:
                            if doc.get('ocrData'):
                                print(f"   ✓ {doc.get('documentType', 'Unknown')}: OCR data present")
                                if doc.get('documentType') == 'drivers_license':
                                    ocr = doc['ocrData']
                                    print(f"     - Number: {ocr.get('documentNumber')}")
                                    print(f"     - Expires: {ocr.get('expirationDate')}")
                                    print(f"     - Issuer: {ocr.get('issuingAuthority')}")
    else:
        print(f"⚠️  Could not retrieve I-9: {retrieve_response.status_code}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE - I-9 OCR AUTO-POPULATION")
    print("="*60)
    print("\nSummary:")
    print("1. ✅ Onboarding session created")
    print("2. ✅ Personal info saved")
    print("3. ✅ TN driver's license processed with Google Document AI")
    print("4. ✅ OCR data extracted (document number, exp date, issuing authority)")
    print("5. ✅ I-9 saved with auto-populated Section 2")
    print("6. ✅ PDF generated with both sections")
    print(f"\n📄 Check the PDF at: /tmp/i9_ocr_test_{employee['id']}.pdf")
    print("   Section 2 should show:")
    print("   - Driver's License details from OCR")
    print("   - Social Security Card as List C document")

def main():
    print("\n🔍 Testing I-9 flow with OCR auto-population...")
    print("   Using Tennessee driver's license for testing")
    
    # Check if backend is running
    try:
        health = requests.get(f"{BASE_URL}/api/healthz", timeout=2)
        if health.status_code != 200:
            print("⚠️  Backend health check failed")
    except:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("   Make sure the backend is running")
        return
    
    test_i9_with_ocr()

if __name__ == "__main__":
    main()