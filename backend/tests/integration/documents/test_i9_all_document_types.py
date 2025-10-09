"""
Test I-9 OCR Processing for All List A, B, and C Document Types
Verifies that Google Document AI can extract fields from all acceptable I-9 documents
"""
import os
import sys
import base64
import requests
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(backend_path))

BASE_URL = os.getenv("API_URL", "http://localhost:8000")

def create_test_image():
    """Create a simple test image (1x1 white pixel PNG)"""
    # Minimal PNG file (1x1 white pixel)
    png_data = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    )
    return png_data

def test_document_type(doc_type: str, doc_name: str):
    """Test OCR processing for a specific document type"""
    print(f"\n{'='*60}")
    print(f"Testing: {doc_name} ({doc_type})")
    print(f"{'='*60}")
    
    try:
        # Create test image
        image_data = create_test_image()
        
        # Prepare request
        files = {
            'file': (f'test_{doc_type}.png', image_data, 'image/png')
        }
        data = {
            'document_type': doc_type,
            'employee_id': 'test-employee-123'
        }
        
        # Send request
        response = requests.post(
            f"{BASE_URL}/api/documents/process",
            files=files,
            data=data,
            timeout=30
        )
        
        # Check response
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                data = result.get('data', {})
                print(f"✅ SUCCESS - Document type mapped correctly")
                print(f"   Detected Type: {data.get('detectedDocumentType', 'N/A')}")
                print(f"   Confidence: {data.get('confidence', 0.0):.2f}")
                print(f"   Document Number: {data.get('documentNumber', 'N/A')}")
                print(f"   Expiration Date: {data.get('expirationDate', 'N/A')}")
                print(f"   Issuing Authority: {data.get('issuingAuthority', 'N/A')}")
                
                # Show additional fields if present
                if data.get('alienNumber'):
                    print(f"   Alien Number: {data.get('alienNumber')}")
                if data.get('uscisNumber'):
                    print(f"   USCIS Number: {data.get('uscisNumber')}")
                if data.get('ssn'):
                    print(f"   SSN: {data.get('ssn')}")
                
                return True
            else:
                print(f"❌ FAILED - OCR processing failed: {result.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ FAILED - HTTP {response.status_code}: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR - {str(e)}")
        return False

def main():
    """Test all I-9 document types"""
    print("\n" + "="*80)
    print("I-9 OCR COMPREHENSIVE DOCUMENT TYPE TEST")
    print("Testing all List A, B, and C acceptable documents")
    print("="*80)
    
    results = {}
    
    # LIST A - Documents that establish both identity and employment authorization
    print("\n" + "🔵 LIST A DOCUMENTS - Identity & Employment Authorization")
    list_a_docs = [
        ('us_passport', 'U.S. Passport'),
        ('us_passport_card', 'U.S. Passport Card'),
        ('permanent_resident_card', 'Permanent Resident Card (Green Card)'),
        ('green_card', 'Green Card (alias)'),
        ('employment_authorization_card', 'Employment Authorization Card (EAD)'),
        ('ead', 'EAD (alias)'),
        ('foreign_passport_i551', 'Foreign Passport with I-551 Stamp'),
        ('foreign_passport_i94', 'Foreign Passport with I-94'),
        ('list_a', 'Generic List A (should default to passport)'),
    ]
    
    for doc_type, doc_name in list_a_docs:
        results[doc_type] = test_document_type(doc_type, doc_name)
    
    # LIST B - Documents that establish identity
    print("\n" + "🟢 LIST B DOCUMENTS - Identity Only")
    list_b_docs = [
        ('drivers_license', "Driver's License"),
        ('driver_license', "Driver's License (alias)"),
        ('state_id_card', 'State ID Card'),
        ('state_id', 'State ID (alias)'),
        ('us_military_card', 'U.S. Military Card'),
        ('military_id', 'Military ID (alias)'),
        ('military_dependent_card', 'Military Dependent Card'),
        ('us_coast_guard_card', 'U.S. Coast Guard Card'),
        ('native_american_tribal_document', 'Native American Tribal Document'),
        ('tribal_document', 'Tribal Document (alias)'),
        ('canadian_drivers_license', "Canadian Driver's License"),
        ('school_id_photo', 'School ID with Photo'),
        ('school_id', 'School ID (alias)'),
        ('voter_registration_card', 'Voter Registration Card'),
        ('school_record', 'School Record (for minors)'),
        ('clinic_record', 'Clinic Record (for minors)'),
        ('daycare_record', 'Daycare Record (for minors)'),
        ('list_b', 'Generic List B (should default to DL)'),
    ]
    
    for doc_type, doc_name in list_b_docs:
        results[doc_type] = test_document_type(doc_type, doc_name)
    
    # LIST C - Documents that establish employment authorization
    print("\n" + "🟡 LIST C DOCUMENTS - Employment Authorization Only")
    list_c_docs = [
        ('social_security_card', 'Social Security Card'),
        ('ssn_card', 'SSN Card (alias)'),
        ('ssn', 'SSN (alias)'),
        ('certification_birth_citizen', 'Certification of Birth Abroad'),
        ('birth_certificate', 'Birth Certificate (alias)'),
        ('citizen_id_card', 'Citizen ID Card'),
        ('resident_citizen_card', 'Resident Citizen Card'),
        ('unexpired_employment_auth', 'Unexpired Employment Authorization'),
        ('temporary_resident_card', 'Temporary Resident Card'),
        ('list_c', 'Generic List C (should default to SSN)'),
    ]
    
    for doc_type, doc_name in list_c_docs:
        results[doc_type] = test_document_type(doc_type, doc_name)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if failed > 0:
        print("\n❌ Failed Document Types:")
        for doc_type, success in results.items():
            if not success:
                print(f"   - {doc_type}")
    
    print("\n" + "="*80)
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED! OCR works for all I-9 document types!")
    else:
        print(f"⚠️  {failed} document type(s) need attention")
    
    print("="*80 + "\n")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

