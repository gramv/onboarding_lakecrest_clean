"""
Test script to verify PyPDF2 password protection works correctly
"""
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def create_sample_pdf():
    """Create a simple test PDF"""
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.drawString(100, 750, "Test Document - Employee Onboarding")
    c.drawString(100, 730, "This is a test PDF for password protection")
    c.drawString(100, 710, "Employee: John Doe")
    c.drawString(100, 690, "SSN: 123-45-6789")
    c.save()
    return buffer.getvalue()

def add_password_protection(pdf_bytes, password="7935"):
    """Add password protection to PDF"""
    try:
        # Read the input PDF
        pdf_reader = PdfReader(BytesIO(pdf_bytes))
        pdf_writer = PdfWriter()
        
        # Copy all pages
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
        
        # Add password protection
        pdf_writer.encrypt(
            user_password=password,
            owner_password=password,
            permissions_flag=0b0000_0100  # Allow printing
        )
        
        # Write to bytes
        output = BytesIO()
        pdf_writer.write(output)
        return output.getvalue()
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

def test_password_protection():
    """Test the password protection"""
    print("=" * 60)
    print("Testing PDF Password Protection")
    print("=" * 60)
    
    # Step 1: Create sample PDF
    print("\n1. Creating sample PDF...")
    original_pdf = create_sample_pdf()
    print(f"   ✅ Created PDF: {len(original_pdf)} bytes")
    
    # Step 2: Add password protection
    print("\n2. Adding password protection (password: 7935)...")
    protected_pdf = add_password_protection(original_pdf, password="7935")
    print(f"   ✅ Protected PDF: {len(protected_pdf)} bytes")
    
    # Step 3: Try to read without password (should fail)
    print("\n3. Testing without password...")
    try:
        reader = PdfReader(BytesIO(protected_pdf))
        # Try to access pages without password
        num_pages = len(reader.pages)
        print(f"   ❌ FAIL: Could read {num_pages} pages without password!")
    except Exception as e:
        print(f"   ✅ PASS: Cannot read without password (expected)")
        print(f"      Error: {type(e).__name__}")
    
    # Step 4: Try with wrong password (should fail)
    print("\n4. Testing with wrong password (1234)...")
    try:
        reader = PdfReader(BytesIO(protected_pdf))
        if reader.decrypt("1234") == 0:
            print(f"   ✅ PASS: Wrong password rejected")
        else:
            print(f"   ❌ FAIL: Wrong password accepted!")
    except Exception as e:
        print(f"   ✅ PASS: Wrong password rejected")
        print(f"      Error: {type(e).__name__}")
    
    # Step 5: Try with correct password (should work)
    print("\n5. Testing with correct password (7935)...")
    try:
        reader = PdfReader(BytesIO(protected_pdf))
        result = reader.decrypt("7935")
        if result > 0:
            num_pages = len(reader.pages)
            print(f"   ✅ PASS: Correct password accepted")
            print(f"      Successfully read {num_pages} page(s)")
            
            # Try to extract text
            page = reader.pages[0]
            text = page.extract_text()
            if "John Doe" in text:
                print(f"      ✅ Can extract text after decryption")
        else:
            print(f"   ❌ FAIL: Correct password rejected!")
    except Exception as e:
        print(f"   ❌ FAIL: Error with correct password: {e}")
    
    # Step 6: Save protected PDF for manual testing
    print("\n6. Saving protected PDF for manual testing...")
    with open("/tmp/test_protected.pdf", "wb") as f:
        f.write(protected_pdf)
    print(f"   ✅ Saved to: /tmp/test_protected.pdf")
    print(f"      You can open this file manually and test password: 7935")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_password_protection()

