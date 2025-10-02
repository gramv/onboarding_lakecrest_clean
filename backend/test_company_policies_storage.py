#!/usr/bin/env python3
"""
Test Company Policies document storage and retrieval
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
TEST_EMPLOYEE_ID = "test-emp-" + datetime.now().strftime("%Y%m%d%H%M%S")
TEST_PROPERTY_ID = "test-property"

def test_generate_and_save():
    """Test generating and saving a signed Company Policies PDF"""
    print("=" * 80)
    print("TESTING COMPANY POLICIES DOCUMENT STORAGE")
    print("=" * 80)

    # Test data
    test_data = {
        "employee_data": {
            "id": TEST_EMPLOYEE_ID,
            "firstName": "John",
            "lastName": "Doe",
            "property_name": "Test Hotel",
            "position": "Test Position",
            "email": "john.doe@test.com"
        },
        "form_data": {
            "companyPoliciesInitials": "JD",
            "eeoInitials": "JD",
            "sexualHarassmentInitials": "JD",
            "acknowledgmentChecked": True
        },
        "signature_data": {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "signedAt": datetime.now().isoformat()
        }
    }

    print(f"\n1. Generating signed Company Policies PDF for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    try:
        # Generate PDF
        response = requests.post(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/company-policies/generate-pdf",
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

def test_retrieve_document():
    """Test retrieving the saved document"""
    print(f"\n2. Retrieving saved document for employee: {TEST_EMPLOYEE_ID}")
    print("-" * 40)

    try:
        # Get document metadata
        response = requests.get(
            f"{API_URL}/onboarding/{TEST_EMPLOYEE_ID}/documents/company-policies",
            params={"token": "test-token"}
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("document_metadata"):
                print("✓ Document metadata retrieved successfully")
                metadata = data["document_metadata"]
                print(f"  Signed URL: {metadata.get('signed_url', 'Not found')[:100] if metadata.get('signed_url') else 'Not found'}")
                print(f"  Has document: {data.get('has_document')}")
                return True
            else:
                print("⚠️  No document metadata found")
                return False
        else:
            print(f"✗ Failed to retrieve document: {response.status_code}")
            return False

    except Exception as e:
        print(f"✗ Error retrieving document: {e}")
        return False

def check_database():
    """Check if document was saved to signed_documents table"""
    print(f"\n3. Checking database for saved document")
    print("-" * 40)

    try:
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            print("⚠️  Supabase credentials not found in environment")
            return False

        supabase = create_client(supabase_url, supabase_key)

        # Query signed_documents table
        result = supabase.table("signed_documents").select("*").eq(
            "employee_id", TEST_EMPLOYEE_ID
        ).eq("document_type", "company-policies").execute()

        if result.data and len(result.data) > 0:
            print(f"✓ Found {len(result.data)} document(s) in signed_documents table")
            for doc in result.data:
                print(f"  ID: {doc['id']}")
                print(f"  Document name: {doc.get('document_name')}")
                print(f"  PDF URL: {'Yes' if doc.get('pdf_url') else 'No'}")
                print(f"  Created: {doc.get('created_at')}")

                # Check metadata
                metadata = doc.get('metadata')
                if metadata:
                    print(f"  Metadata:")
                    print(f"    Bucket: {metadata.get('bucket')}")
                    print(f"    Path: {metadata.get('path')}")
                    print(f"    Size: {metadata.get('size')} bytes")
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

    # Test 1: Generate and save
    results.append(("Generate and Save", test_generate_and_save()))

    # Test 2: Retrieve document
    results.append(("Retrieve Document", test_retrieve_document()))

    # Test 3: Check database
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
        print("\n✅ All tests passed! Company Policies document storage is working correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please check the issues above.")

if __name__ == "__main__":
    main()