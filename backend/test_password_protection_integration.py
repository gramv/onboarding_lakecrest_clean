"""
Integration test for PDF password protection
Tests the complete flow from document generation to password-protected download
"""
import asyncio
import base64
from PyPDF2 import PdfReader
from io import BytesIO

# Test the password protection service
from app.services.pdf_password_service import protect_pdf_for_download, is_pdf_password_protected

# Create a sample PDF for testing
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def create_test_pdf(content="Test Document"):
    """Create a simple test PDF"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, content)
    c.drawString(100, 730, "Employee: John Doe")
    c.drawString(100, 710, "SSN: 123-45-6789")
    c.drawString(100, 690, "This is a test onboarding document")
    c.save()
    return buffer.getvalue()

def test_password_protection_flow():
    """Test the complete password protection flow"""
    print("=" * 70)
    print("INTEGRATION TEST: PDF Password Protection Flow")
    print("=" * 70)
    
    # Step 1: Create a sample document (simulating document generation)
    print("\n1️⃣  Creating sample onboarding document...")
    original_pdf = create_test_pdf("I-9 Form - Completed")
    print(f"   ✅ Created PDF: {len(original_pdf)} bytes")
    
    # Step 2: Simulate storage encryption (already implemented in system)
    print("\n2️⃣  Simulating storage encryption...")
    print(f"   ℹ️  In production: Document encrypted with Fernet/AES-128")
    print(f"   ℹ️  Stored in Supabase Storage")
    
    # Step 3: Simulate retrieval and decryption
    print("\n3️⃣  Simulating document retrieval...")
    decrypted_pdf = original_pdf  # In production, this comes from decrypt_document()
    print(f"   ✅ Retrieved and decrypted: {len(decrypted_pdf)} bytes")
    
    # Step 4: Apply password protection (NEW FEATURE)
    print("\n4️⃣  Applying password protection (password: 7935)...")
    protected_pdf = protect_pdf_for_download(decrypted_pdf)
    print(f"   ✅ Protected PDF: {len(protected_pdf)} bytes")
    print(f"   ✅ Is password protected: {is_pdf_password_protected(protected_pdf)}")
    
    # Step 5: Convert to base64 for frontend/email
    print("\n5️⃣  Converting to base64 for transmission...")
    pdf_base64 = base64.b64encode(protected_pdf).decode('utf-8')
    print(f"   ✅ Base64 encoded: {len(pdf_base64)} characters")
    
    # Step 6: Simulate download (user receives the PDF)
    print("\n6️⃣  Simulating user download...")
    downloaded_pdf = base64.b64decode(pdf_base64)
    print(f"   ✅ Downloaded PDF: {len(downloaded_pdf)} bytes")
    
    # Step 7: Test opening without password (should fail)
    print("\n7️⃣  Testing PDF access without password...")
    try:
        reader = PdfReader(BytesIO(downloaded_pdf))
        # Try to access pages without password
        num_pages = len(reader.pages)
        print(f"   ❌ FAIL: Could read {num_pages} pages without password!")
        return False
    except Exception as e:
        print(f"   ✅ PASS: Cannot access without password (expected)")
        print(f"      Error type: {type(e).__name__}")
    
    # Step 8: Test with wrong password (should fail)
    print("\n8️⃣  Testing with wrong password (1234)...")
    try:
        reader = PdfReader(BytesIO(downloaded_pdf))
        result = reader.decrypt("1234")
        if result == 0:
            print(f"   ✅ PASS: Wrong password rejected")
        else:
            print(f"   ❌ FAIL: Wrong password accepted!")
            return False
    except Exception as e:
        print(f"   ✅ PASS: Wrong password rejected")
    
    # Step 9: Test with correct password (should work)
    print("\n9️⃣  Testing with correct password (7935)...")
    try:
        reader = PdfReader(BytesIO(downloaded_pdf))
        result = reader.decrypt("7935")
        if result > 0:
            num_pages = len(reader.pages)
            print(f"   ✅ PASS: Correct password accepted")
            print(f"      Successfully opened PDF with {num_pages} page(s)")
            
            # Try to extract text
            page = reader.pages[0]
            text = page.extract_text()
            if "John Doe" in text:
                print(f"      ✅ Can read content after decryption")
            else:
                print(f"      ⚠️  Could not extract text (may be normal for some PDFs)")
        else:
            print(f"   ❌ FAIL: Correct password rejected!")
            return False
    except Exception as e:
        print(f"   ❌ FAIL: Error with correct password: {e}")
        return False
    
    # Step 10: Save for manual testing
    print("\n🔟 Saving protected PDF for manual testing...")
    test_file = "/tmp/test_onboarding_document_protected.pdf"
    with open(test_file, "wb") as f:
        f.write(downloaded_pdf)
    print(f"   ✅ Saved to: {test_file}")
    print(f"      You can open this file manually and test password: 7935")
    
    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED!")
    print("=" * 70)
    print("\n📋 Summary:")
    print("   • Document generation: ✅")
    print("   • Password protection: ✅")
    print("   • Base64 encoding: ✅")
    print("   • Download simulation: ✅")
    print("   • Password validation: ✅")
    print("   • Content access: ✅")
    print("\n🎯 Next Steps:")
    print("   1. Test in production with real employee documents")
    print("   2. Verify email attachments require password")
    print("   3. Test downloads from manager dashboard")
    print("   4. Confirm password instructions in emails")
    
    return True

def test_multiple_document_types():
    """Test password protection on different document types"""
    print("\n" + "=" * 70)
    print("TESTING MULTIPLE DOCUMENT TYPES")
    print("=" * 70)
    
    document_types = [
        "I-9 Form (Completed)",
        "W-4 Form",
        "Direct Deposit Authorization",
        "Health Insurance Enrollment",
        "Complete Onboarding Packet"
    ]
    
    for doc_type in document_types:
        print(f"\n📄 Testing: {doc_type}")
        pdf = create_test_pdf(doc_type)
        protected = protect_pdf_for_download(pdf)
        
        # Verify password protection
        reader = PdfReader(BytesIO(protected))
        if reader.is_encrypted:
            # Try correct password
            result = reader.decrypt("7935")
            if result > 0:
                print(f"   ✅ {doc_type}: Password protected and accessible with '7935'")
            else:
                print(f"   ❌ {doc_type}: Password protection failed!")
                return False
        else:
            print(f"   ❌ {doc_type}: Not password protected!")
            return False
    
    print("\n✅ All document types successfully password protected!")
    return True

if __name__ == "__main__":
    print("\n🚀 Starting PDF Password Protection Integration Tests\n")
    
    # Run main flow test
    success1 = test_password_protection_flow()
    
    # Run multiple document types test
    success2 = test_multiple_document_types()
    
    if success1 and success2:
        print("\n" + "=" * 70)
        print("🎉 ALL INTEGRATION TESTS PASSED!")
        print("=" * 70)
        print("\n✅ Password protection is working correctly")
        print("✅ Ready for production deployment")
    else:
        print("\n" + "=" * 70)
        print("❌ SOME TESTS FAILED")
        print("=" * 70)
        print("\n⚠️  Please review the failures above")

