#!/usr/bin/env python3
"""Test script for final Direct Deposit PDF generation with all fixes"""

import sys
import os
import base64
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.pdf_forms import PDFFormFiller

# Create test data with all required fields
test_data = {
    "firstName": "John",
    "lastName": "Doe",
    "ssn": "123-45-6789",
    "email": "john.doe@example.com",
    "primaryAccount": {
        "bankName": "Chase Bank",
        "routingNumber": "021000021",
        "accountNumber": "1234567890",
        "accountType": "checking",
        "depositAmount": ""
    },
    "depositType": "full",
    # Add signature data
    "signatureData": {
        "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "signedAt": datetime.now().isoformat()
    }
}

print("="*80)
print("TESTING DIRECT DEPOSIT PDF GENERATION - FINAL VERSION")
print("="*80)

try:
    # Create PDF filler instance
    pdf_filler = PDFFormFiller()
    
    print("\n📄 Generating Direct Deposit PDF with template overlay...")
    print("   Using fill_direct_deposit_form (overlay method only)")
    
    # Convert to the format expected by the PDF filler
    pdf_data = {
        "first_name": test_data["firstName"],
        "last_name": test_data["lastName"],
        "ssn": test_data["ssn"],
        "email": test_data["email"],
        "direct_deposit": {
            "bank_name": test_data["primaryAccount"]["bankName"],
            "routing_number": test_data["primaryAccount"]["routingNumber"],
            "account_number": test_data["primaryAccount"]["accountNumber"],
            "account_type": test_data["primaryAccount"]["accountType"],
            "deposit_type": test_data["depositType"],
            "deposit_amount": test_data["primaryAccount"]["depositAmount"]
        },
        "signatureData": test_data["signatureData"]
    }
    
    # Generate the PDF
    pdf_bytes = pdf_filler.fill_direct_deposit_form(pdf_data)
    
    # Save the PDF for inspection
    output_path = "test_direct_deposit_final.pdf"
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    
    print(f"\n✅ PDF generated successfully!")
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
    print("✓ SSN: 123-45-6789")
    print("✓ Email: john.doe@example.com")
    print("✓ Bank Name: Chase Bank")
    print("✓ Routing Number: 021000021")
    print("✓ Account Number: 1234567890")
    print("✓ Account Type: Checking ☑")
    print("✓ Deposit Type: Entire Net Amount ☑")
    print("✓ Date: " + datetime.now().strftime("%m/%d/%Y"))
    print("✓ Signature: Should appear above the signature line")
    print("="*80)
    
    print("\n✅ SUCCESS: Direct Deposit PDF generation complete!")
    print("\n⚠️  IMPORTANT NOTES:")
    print("1. The create_direct_deposit_pdf function has been removed")
    print("2. Only fill_direct_deposit_form (overlay method) is now used")
    print("3. Signature positioning has been improved (180x35 box)")
    print("4. All fields use exact coordinates from field mappings")
    print("\nPlease open the PDF to verify all fields are correctly positioned.")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nPlease check:")
    print("1. PyMuPDF is installed: pip install pymupdf")
    print("2. Template exists at: static/direct-deposit-template.pdf")
    print("3. Field mappings exist at: direct_deposit_field_mappings.json")