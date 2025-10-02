#!/usr/bin/env python3
"""Test script for Direct Deposit form overlay functionality"""

import sys
import os
import base64

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.pdf_forms import PDFFormFiller

# Create test data
test_data = {
    "first_name": "John",
    "last_name": "Doe",
    "ssn": "123-45-6789",
    "email": "john.doe@example.com",
    "direct_deposit": {
        "bank_name": "Chase Bank",
        "routing_number": "021000021",
        "account_number": "1234567890",
        "account_type": "checking",
        "deposit_type": "full",
        "deposit_amount": ""
    },
    "property": {
        "name": "Grand Hotel & Resort"
    }
}

print("="*80)
print("TESTING DIRECT DEPOSIT FORM OVERLAY")
print("="*80)

try:
    # Create PDF filler instance
    pdf_filler = PDFFormFiller()
    
    # Generate the PDF using the new overlay function
    print("\n📄 Generating Direct Deposit PDF with template overlay...")
    pdf_bytes = pdf_filler.fill_direct_deposit_form(test_data)
    
    # Save the PDF for inspection
    output_path = "test_direct_deposit_overlay_output.pdf"
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    
    print(f"✅ PDF generated successfully using template overlay!")
    print(f"📁 Saved to: {output_path}")
    print(f"📊 PDF size: {len(pdf_bytes):,} bytes")
    
    # Also save as base64 (like the API returns)
    pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
    print(f"🔤 Base64 length: {len(pdf_base64):,} characters")
    
    # Summary of what should be visible
    print("\n" + "="*80)
    print("EXPECTED VISIBLE FIELDS IN OVERLAY PDF:")
    print("-" * 60)
    print("✓ Employee Name: John Doe")
    print("✓ SSN: 123-45-6789")
    print("✓ Email: john.doe@example.com")
    print("✓ Bank Name: Chase Bank")
    print("✓ Routing Number: 021000021")
    print("✓ Account Number: 1234567890")
    print("✓ Account Type: Checking (checkbox)")
    print("✓ Deposit Type: Entire Net Amount (checkbox)")
    print("✓ Property Name: Grand Hotel & Resort")
    print("✓ Date: Today's date")
    print("="*80)
    
    print("\n✅ SUCCESS: Direct Deposit form overlay is working!")
    print("Please check the generated PDF to verify all fields are correctly positioned.")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    print("\nPlease check:")
    print("1. PyMuPDF is installed: pip install pymupdf")
    print("2. Template exists at: static/direct-deposit-template.pdf")
    print("3. Field mappings exist at: direct_deposit_field_mappings.json")