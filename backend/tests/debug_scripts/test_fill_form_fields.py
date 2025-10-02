#!/usr/bin/env python3
"""
Test filling PDF form fields directly using PyMuPDF
"""

import fitz  # PyMuPDF
import os

def test_fill_form_fields():
    """Test filling form fields in the Direct Deposit template"""
    
    # Get the template path
    template_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "static",
        "direct-deposit-template.pdf"
    )
    
    print(f"Opening template: {template_path}")
    
    # Open the PDF
    doc = fitz.open(template_path)
    page = doc[0]
    
    # Test data
    test_data = {
        "employee_name": "John Smith",
        "social_security_number": "123-45-6789",
        "employee_email": "john.smith@hotel.com",
        "employee_date": "08/28/2025",
        "bank1_name": "Chase Bank",
        "bank1_routing_number": "021000021",
        "bank1_account_number": "1234567890",
        "bank1_deposit_amount": "",  # Empty for full deposit
        "bank1_checking": True,
        "bank1_savings": False,
        "bank1_entire_net_amount": True  # Full deposit
    }
    
    print("\nFilling form fields...")
    
    # Get all widgets (form fields) on the page
    for widget in page.widgets():
        field_name = widget.field_name
        
        if field_name in test_data:
            value = test_data[field_name]
            
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                # Handle checkbox
                widget.field_value = value
                widget.update()
                print(f"  ✓ Set checkbox {field_name} to {value}")
            elif widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                # Handle text field
                widget.field_value = str(value) if value else ""
                widget.update()
                print(f"  ✓ Set text field {field_name} to '{value}'")
            else:
                # Other field types
                widget.field_value = str(value) if value else ""
                widget.update()
                print(f"  ✓ Set field {field_name} to '{value}'")
    
    # Save the filled PDF
    output_path = "test_output/test_form_filled_directly.pdf"
    os.makedirs("test_output", exist_ok=True)
    doc.save(output_path)
    doc.close()
    
    print(f"\n✅ PDF saved to: {output_path}")
    
    # Verify the fields were filled
    print("\nVerifying filled fields...")
    doc = fitz.open(output_path)
    page = doc[0]
    
    for widget in page.widgets():
        if widget.field_name in test_data:
            print(f"  {widget.field_name}: {widget.field_value}")
    
    doc.close()

if __name__ == "__main__":
    test_fill_form_fields()