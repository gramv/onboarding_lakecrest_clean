#!/usr/bin/env python3
"""
Test Direct Deposit PDF generation with text overlay
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.pdf_forms import PDFFormFiller
from datetime import datetime
import base64

# Initialize the PDF filler
pdf_filler = PDFFormFiller()

# Test data that mimics what the frontend sends
test_data = {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "ssn": "123-45-6789",
    "paymentMethod": "direct_deposit",
    "primaryAccount": {
        "bankName": "JPMorgan Chase Bank, N.A.",
        "routingNumber": "021000021",
        "accountNumber": "123456789012",
        "accountType": "checking"
    },
    "secondaryAccount": {
        "bankName": "Bank of America",
        "routingNumber": "026009593", 
        "accountNumber": "987654321098",
        "accountType": "savings",
        "depositAmount": "500"
    },
    # Add a test signature (small 1x1 black pixel as base64)
    "signatureData": {
        "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    }
}

print("\n" + "="*80)
print("TESTING DIRECT DEPOSIT PDF GENERATION WITH TEXT OVERLAY")
print("="*80)
print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*80)

try:
    # Generate the PDF
    print("\n📄 Generating Direct Deposit PDF...")
    pdf_bytes = pdf_filler.fill_direct_deposit_form(test_data)
    
    # Save the PDF for inspection
    output_path = "test_direct_deposit_output.pdf"
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    
    print(f"✅ PDF generated successfully!")
    print(f"📁 Saved to: {output_path}")
    print(f"📊 PDF size: {len(pdf_bytes):,} bytes")
    
    # Also save as base64 (like the API returns)
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    print(f"🔤 Base64 length: {len(pdf_base64):,} characters")
    
    # Summary of what should be visible
    print("\n" + "="*80)
    print("EXPECTED VISIBLE FIELDS IN PDF:")
    print("-" * 60)
    print("✓ Employee Name: John Doe")
    print("✓ Email: john.doe@example.com")
    print("✓ SSN: 123-45-6789")
    print("✓ Bank 1: JPMorgan Chase Bank, N.A.")
    print("✓ Routing 1: 021000021")
    print("✓ Account 1: 123456789012 (Checking)")
    print("✓ Bank 2: Bank of America")
    print("✓ Routing 2: 026009593")
    print("✓ Account 2: 987654321098 (Savings)")
    print("✓ Amount 2: $500")
    print("✓ Signature: Digital signature added")
    print("="*80)
    
    print("\n🎯 Please open 'test_direct_deposit_output.pdf' to verify all fields are visible!")
    
except Exception as e:
    print(f"\n❌ Error generating PDF: {e}")
    import traceback
    traceback.print_exc()