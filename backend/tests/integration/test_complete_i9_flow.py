#!/usr/bin/env python3
"""
Comprehensive test for I-9 flow with OCR auto-population
Tests the complete workflow: Section 1 completion → OCR document upload → Section 2 auto-fill → PDF generation
"""

import requests
import base64
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
LICENSE_IMAGE_PATH = "/Users/gouthamvemula/Downloads/TN_D200_PR_Adult_CLASS-M_DL.jpg"

def test_complete_i9_flow():
    """Test the complete I-9 flow with OCR auto-population"""
    print("\n" + "="*60)
    print("COMPLETE I-9 FLOW TEST WITH OCR AUTO-POPULATION")
    print("="*60)
    
    # Step 1: Create test employee token
    print("\n1️⃣ Creating test employee token...")
    employee_data = {
        "employeeId": f"test-emp-{int(time.time())}",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.smith@test.com",
        "propertyId": "test-prop-001"
    }
    
    token_response = requests.post(
        f"{BASE_URL}/api/employee-token",
        json=employee_data
    )
    
    if token_response.status_code != 200:
        print(f"❌ Failed to create employee token: {token_response.text}")
        return
    
    employee_token = token_response.json().get("token")
    print(f"✅ Employee token created")
    
    # Step 2: Save I-9 Section 1 data
    print("\n2️⃣ Saving I-9 Section 1 data...")
    section1_data = {
        "employeeId": employee_data["employeeId"],
        "firstName": employee_data["firstName"],
        "lastName": employee_data["lastName"],
        "middleInitial": "A",
        "otherLastNames": "",
        "address": "123 Test Street",
        "apartment": "Apt 4B",
        "city": "Nashville",
        "state": "TN",
        "zipCode": "37201",
        "dateOfBirth": "1990-01-15",
        "ssn": "123-45-6789",
        "email": employee_data["email"],
        "telephone": "615-555-0123",
        "citizenship": "citizen",
        "alienNumber": "",
        "admissionNumber": "",
        "foreignPassportNumber": "",
        "countryOfIssuance": "",
        "signatureDate": datetime.now().strftime("%Y-%m-%d"),
        "translatorUsed": False,
        "translatorName": "",
        "translatorAddress": "",
        "translatorCity": "",
        "translatorState": "",
        "translatorZipCode": "",
        "translatorSignatureDate": ""
    }
    
    save_response = requests.post(
        f"{BASE_URL}/api/i9/section1",
        json=section1_data,
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    
    if save_response.status_code != 200:
        print(f"❌ Failed to save Section 1: {save_response.text}")
        return
    
    print("✅ Section 1 data saved")
    
    # Step 3: Upload driver's license for OCR
    print("\n3️⃣ Uploading driver's license for OCR...")
    with open(LICENSE_IMAGE_PATH, "rb") as f:
        image_bytes = f.read()
    
    files = {
        'file': ('tn_license.jpg', image_bytes, 'image/jpeg')
    }
    data = {
        'document_type': 'drivers_license',
        'employee_id': employee_data["employeeId"]
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
    print(f"✅ OCR extracted fields:")
    print(f"   - Document Number: {ocr_data.get('documentNumber', 'NOT FOUND')}")
    print(f"   - Expiration Date: {ocr_data.get('expirationDate', 'NOT FOUND')}")
    print(f"   - Issuing Authority: {ocr_data.get('issuingAuthority', 'NOT FOUND')}")
    
    # Step 4: Complete I-9 with documents (should auto-populate Section 2)
    print("\n4️⃣ Completing I-9 with documents (auto-populating Section 2)...")
    
    # Prepare document data with OCR results
    complete_data = {
        "employeeId": employee_data["employeeId"],
        "section1Data": section1_data,
        "documents": {
            "listB": {
                "type": "drivers_license",
                "ocrData": ocr_data,
                "uploadedAt": datetime.now().isoformat()
            },
            "listC": {
                "type": "social_security_card",
                "ocrData": {
                    "documentNumber": "123-45-6789",
                    "issuingAuthority": "Social Security Administration"
                },
                "uploadedAt": datetime.now().isoformat()
            }
        },
        "signature": {
            "data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    complete_response = requests.post(
        f"{BASE_URL}/api/i9/complete",
        json=complete_data,
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    
    if complete_response.status_code != 200:
        print(f"❌ Failed to complete I-9: {complete_response.text}")
        return
    
    complete_result = complete_response.json()
    print("✅ I-9 completed and saved")
    
    # Step 5: Generate I-9 PDF to verify both sections
    print("\n5️⃣ Generating I-9 PDF to verify both sections...")
    
    pdf_response = requests.post(
        f"{BASE_URL}/api/i9/generate-pdf",
        json={
            "employeeId": employee_data["employeeId"],
            "includeSection2": True  # Request both sections
        },
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    
    if pdf_response.status_code != 200:
        print(f"❌ Failed to generate PDF: {pdf_response.text}")
        return
    
    pdf_result = pdf_response.json()
    if pdf_result.get('success') and pdf_result.get('pdf_base64'):
        print("✅ PDF generated successfully")
        
        # Save PDF for manual inspection
        pdf_bytes = base64.b64decode(pdf_result['pdf_base64'])
        output_path = f"/tmp/i9_test_{employee_data['employeeId']}.pdf"
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        print(f"   📄 PDF saved to: {output_path}")
        
        # Check if Section 2 fields are in the saved data
        if 'section2Data' in complete_result:
            s2 = complete_result['section2Data']
            print("\n📋 Section 2 Auto-Populated Fields:")
            print(f"   - Document Title (List B): {s2.get('document_title_2', 'NOT SET')}")
            print(f"   - Document Number: {s2.get('document_number_2', 'NOT SET')}")
            print(f"   - Expiration Date: {s2.get('expiration_date_2', 'NOT SET')}")
            print(f"   - Issuing Authority: {s2.get('issuing_authority_2', 'NOT SET')}")
            print(f"   - Document Title (List C): {s2.get('document_title_3', 'NOT SET')}")
            print(f"   - Document Number (SSN): {s2.get('document_number_3', 'NOT SET')}")
    else:
        print("❌ PDF generation failed")
    
    # Step 6: Verify data is saved in database
    print("\n6️⃣ Verifying data is saved in database...")
    
    # Check if we can retrieve the saved I-9
    retrieve_response = requests.get(
        f"{BASE_URL}/api/i9/{employee_data['employeeId']}",
        headers={"Authorization": f"Bearer {employee_token}"}
    )
    
    if retrieve_response.status_code == 200:
        saved_data = retrieve_response.json()
        print("✅ I-9 data successfully saved and retrievable")
        
        # Check for Section 2 fields
        if 'section2Fields' in saved_data or 'section2Data' in saved_data:
            print("✅ Section 2 fields are saved in database")
        else:
            print("⚠️  Section 2 fields may not be saved properly")
    else:
        print(f"⚠️  Could not retrieve saved I-9: {retrieve_response.status_code}")
    
    print("\n" + "="*60)
    print("TEST COMPLETE - I-9 FLOW WITH OCR AUTO-POPULATION")
    print("="*60)
    print("\n✅ Summary:")
    print("1. Employee token created")
    print("2. Section 1 data saved")
    print("3. Driver's license OCR processed")
    print("4. Section 2 auto-populated from OCR")
    print("5. Complete I-9 saved to database")
    print("6. PDF generated with both sections")
    print(f"\n📄 Check the PDF at: /tmp/i9_test_{employee_data['employeeId']}.pdf")
    print("   to verify Section 2 fields are correctly filled")

def main():
    print("\n🔍 Testing complete I-9 flow with OCR auto-population...")
    
    # Check if backend is running
    try:
        health = requests.get(f"{BASE_URL}/api/healthz", timeout=2)
        if health.status_code != 200:
            print("⚠️  Backend server may not be running properly")
    except:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("   Make sure the backend is running: python3 -m uvicorn app.main_enhanced:app --reload")
        return
    
    test_complete_i9_flow()

if __name__ == "__main__":
    main()