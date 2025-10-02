#!/usr/bin/env python3
"""
Debug script to test Direct Deposit PDF generation data flow
"""
import json
import sys
import os
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.pdf_forms import PDFFormFiller

def test_direct_deposit_pdf_generation():
    """Test Direct Deposit PDF generation with sample data"""

    print("=== DIRECT DEPOSIT PDF GENERATION DEBUG ===")

    # Sample data that mimics what the frontend sends
    sample_form_data = {
        "paymentMethod": "direct_deposit",
        "depositType": "full",
        "primaryAccount": {
            "bankName": "Sample Bank",
            "routingNumber": "123456789",
            "accountNumber": "1234567890",
            "accountType": "checking",
            "depositAmount": "",
            "percentage": 100
        },
        "ssn": "123-45-6789",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com"
    }

    print(f"Sample form data: {json.dumps(sample_form_data, indent=2)}")

    # Create the data structure expected by fill_direct_deposit_form
    pdf_data = {
        "first_name": sample_form_data.get("firstName", ""),
        "last_name": sample_form_data.get("lastName", ""),
        "employee_id": "test-employee-123",
        "email": sample_form_data.get("email", ""),
        "ssn": sample_form_data.get("ssn", ""),
        "direct_deposit": {
            "bank_name": sample_form_data["primaryAccount"]["bankName"],
            "account_type": sample_form_data["primaryAccount"]["accountType"],
            "routing_number": sample_form_data["primaryAccount"]["routingNumber"],
            "account_number": sample_form_data["primaryAccount"]["accountNumber"],
            "deposit_type": sample_form_data.get("depositType", "full"),
            "deposit_amount": sample_form_data["primaryAccount"].get("depositAmount", ""),
        },
        "signatureData": "",
        "property": {"name": "Test Property"},
    }

    print(f"\nPDF data structure: {json.dumps(pdf_data, indent=2)}")

    # Initialize PDF form filler
    try:
        pdf_filler = PDFFormFiller()
        print("\n✅ PDFFormFiller initialized successfully")

        # Test the fill_direct_deposit_form method
        print("\n🔄 Testing fill_direct_deposit_form...")
        pdf_bytes = pdf_filler.fill_direct_deposit_form(pdf_data)

        if pdf_bytes:
            print(f"✅ PDF generated successfully! Size: {len(pdf_bytes)} bytes")

            # Save the PDF for inspection
            output_path = os.path.join(os.path.dirname(__file__), "test_direct_deposit_debug.pdf")
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
            print(f"📄 PDF saved to: {output_path}")
        else:
            print("❌ PDF generation returned empty bytes")

    except Exception as e:
        print(f"❌ Error during PDF generation: {e}")
        import traceback
        traceback.print_exc()

    # Test individual components
    print("\n=== TESTING INDIVIDUAL COMPONENTS ===")

    # Test template file existence
    template_path = os.path.join(os.path.dirname(__file__), "static", "direct-deposit-template.pdf")
    if os.path.exists(template_path):
        print(f"✅ Template file exists: {template_path}")
    else:
        print(f"❌ Template file missing: {template_path}")

    # Test PyMuPDF functionality
    try:
        import fitz
        doc = fitz.open(template_path)
        print(f"✅ Template loaded successfully. Pages: {len(doc)}")

        # List form fields
        page = doc[0]
        widgets = list(page.widgets())
        print(f"Form fields found: {len(widgets)}")

        for i, widget in enumerate(widgets[:10]):  # Show first 10 fields
            print(f"  Field {i+1}: {widget.field_name} (type: {widget.field_type})")

        doc.close()
    except Exception as e:
        print(f"❌ Error loading template: {e}")

if __name__ == "__main__":
    test_direct_deposit_pdf_generation()
