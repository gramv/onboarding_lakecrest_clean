#!/usr/bin/env python3
"""
Test I-9 document storage and retrieval
"""
import asyncio
import base64
import os
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
API_URL = "http://localhost:8000/api"
TEST_EMPLOYEE_ID = "test-i9-" + datetime.now().strftime("%Y%m%d%H%M%S")

def test_i9_section1_generation():
    """Test generating and saving a signed I-9 Section 1 PDF"""
    print("=" * 80)
    print("TESTING I-9 SECTION 1 DOCUMENT STORAGE")
    print("=" * 80)

    # Test data
    test_data = {
        "employee_data": {
            "first_name": "John",
            "last_name": "Doe",
            "middle_initial": "M",
            "date_of_birth": "01/15/1990",
            "ssn": "123-45-6789",
            "email": "john.doe@test.com",
            "phone": "(555) 123-4567",
            "address": "123 Main St",
            "city": "Test City",
            "state": "CA",
            "zip_code": "12345",
            "citizenship_status": "citizen"
        },
        "signature_data": {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "signedAt": datetime.now().isoformat()
        }
    }

    print(f"\n1. Generating signed I-9 Section 1 PDF for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    try:
        # Generate PDF
        response = requests.post(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/i9-section1/generate-pdf",
            json=test_data
        )

        if response.status_code != 200:
            print(f"✗ Failed to generate PDF: {response.status_code}")
            print(f"  Error: {response.text}")
            return False

        data = response.json()

        if not data.get("success"):
            print(f"✗ API returned error: {data.get('message')}")
            return False

        pdf_data = data.get("data", {})

        # Check if PDF was generated
        if not pdf_data.get("pdf"):
            print("✗ No PDF data in response")
            return False

        print("✓ PDF generated successfully")
        print(f"  Filename: {pdf_data.get('filename')}")

        # Check if document was saved to Supabase
        if pdf_data.get("pdf_url"):
            print("✓ PDF saved to Supabase storage")
            print(f"  URL: {pdf_data['pdf_url'][:100]}...")
        else:
            print("⚠️  No Supabase URL - document may not be saved")

        # Check document metadata
        doc_metadata = pdf_data.get("document_metadata")
        if doc_metadata:
            print("✓ Document metadata saved:")
            print(f"  Bucket: {doc_metadata.get('bucket')}")
            print(f"  Path: {doc_metadata.get('path')}")
            print(f"  Signed URL expires: {doc_metadata.get('signed_url_expires_at')}")
        else:
            print("⚠️  No document metadata in response")

        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_retrieve_i9_document():
    """Test retrieving the saved I-9 document"""
    print(f"\n2. Retrieving saved I-9 Section 1 for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    try:
        # Get document metadata
        response = requests.get(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/documents/i9-section1",
            params={"token": "test-token"}
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("data", {}).get("has_document"):
                print("✓ I-9 Section 1 document found")
                metadata = data["data"].get("document_metadata", {})
                print(f"  Signed URL: {'Yes' if metadata.get('signed_url') else 'No'}")
                print(f"  Filename: {metadata.get('filename')}")
                print(f"  Signed at: {metadata.get('signed_at')}")
                return True
            else:
                print("⚠️  No I-9 document found")
                return False
        else:
            print(f"✗ Failed to retrieve document: {response.status_code}")
            return False

    except Exception as e:
        print(f"✗ Error retrieving document: {e}")
        return False

def test_document_upload():
    """Test uploading DL/SSN documents"""
    print(f"\n3. Testing document upload for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    # Create a test image file
    test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\xd8\xdc\xd4b\x00\x00\x00\x00IEND\xaeB`\x82'

    try:
        # Upload DL document
        files = {'file': ('drivers_license.png', test_image, 'image/png')}
        data = {
            'document_type': 'drivers_license',
            'document_category': 'dl'
        }

        response = requests.post(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/documents/upload",
            files=files,
            data=data
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                doc_data = result.get("data", {})
                print("✓ Driver's License uploaded successfully")
                print(f"  Document ID: {doc_data.get('document_id')}")
                print(f"  Signed URL: {'Yes' if doc_data.get('signed_url') else 'No'}")
                print(f"  Storage path: {doc_data.get('path')}")
                return True
            else:
                print(f"✗ Upload failed: {result.get('message')}")
                return False
        else:
            print(f"✗ Upload failed with status: {response.status_code}")
            print(f"  Error: {response.text}")
            return False

    except Exception as e:
        print(f"✗ Error uploading document: {e}")
        return False

def test_retrieve_uploaded_documents():
    """Test retrieving uploaded I-9 documents"""
    print(f"\n4. Retrieving uploaded documents for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    try:
        response = requests.get(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/documents/i9-uploads"
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                documents = data.get("data", {}).get("documents", [])
                print(f"✓ Found {len(documents)} uploaded document(s)")
                for doc in documents:
                    print(f"  - {doc.get('filename')} ({doc.get('category')})")
                    print(f"    Document ID: {doc.get('document_id')}")
                    print(f"    Has URL: {'Yes' if doc.get('signed_url') else 'No'}")
                return True
            else:
                print(f"✗ Failed to retrieve documents: {data.get('message')}")
                return False
        else:
            print(f"✗ Failed with status: {response.status_code}")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def check_database():
    """Check if documents were saved to signed_documents table"""
    print(f"\n5. Checking database for saved documents")
    print("-" * 40)

    try:
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            print("⚠️  Supabase credentials not found in environment")
            return False

        supabase = create_client(supabase_url, supabase_key)

        # Query signed_documents table for I-9 documents
        result = supabase.table("signed_documents").select("*").eq(
            "employee_id", TEST_EMPLOYEE_ID
        ).execute()

        if result.data and len(result.data) > 0:
            print(f"✓ Found {len(result.data)} document(s) in signed_documents table")
            for doc in result.data:
                print(f"  Document type: {doc.get('document_type')}")
                print(f"  Document name: {doc.get('document_name')}")
                print(f"  PDF URL: {'Yes' if doc.get('pdf_url') else 'No'}")
                print(f"  Created: {doc.get('created_at')}")
                print()
            return True
        else:
            print("⚠️  No documents found in signed_documents table")
            return False

    except Exception as e:
        print(f"✗ Error checking database: {e}")
        return False

def main():
    """Run all tests"""
    results = []

    # Test 1: Generate I-9 Section 1
    results.append(("I-9 Section 1 Generation", test_i9_section1_generation()))

    # Test 2: Retrieve I-9 Section 1
    results.append(("I-9 Section 1 Retrieval", test_retrieve_i9_document()))

    # Test 3: Upload documents
    results.append(("Document Upload", test_document_upload()))

    # Test 4: Retrieve uploaded documents
    results.append(("Uploaded Documents Retrieval", test_retrieve_uploaded_documents()))

    # Test 5: Database check
    results.append(("Database Check", check_database()))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    passed = sum(1 for _, success in results if success)
    failed = len(results) - passed

    for name, success in results:
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed} passed, {failed} failed")

    if failed == 0:
        print("\n✅ All tests passed! I-9 document storage is working correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the issues above.")

if __name__ == "__main__":
    main()