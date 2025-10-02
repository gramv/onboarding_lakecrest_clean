#!/usr/bin/env python3
"""
Check the actual field values in generated PDFs
"""

import fitz  # PyMuPDF

def check_pdf_fields(pdf_path):
    """Check form field values in a PDF"""
    print(f"\n{'='*60}")
    print(f"Checking PDF: {pdf_path}")
    print(f"{'='*60}")
    
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    # Get all form fields and their values
    fields_of_interest = [
        'employee_name',
        'social_security_number',
        'employee_email',
        'employee_date',
        'bank1_name',
        'bank1_routing_number',
        'bank1_account_number',
        'bank1_deposit_amount',
        'bank1_checking',
        'bank1_savings',
        'bank1_entire_net_amount'
    ]
    
    print("\nField Values:")
    print("-" * 40)
    for widget in page.widgets():
        if widget.field_name in fields_of_interest:
            value = widget.field_value
            if value:
                print(f"  {widget.field_name}: '{value}'")
            else:
                print(f"  {widget.field_name}: [EMPTY]")
    
    # Check if text was rendered on the page
    text = page.get_text()
    
    # Look for specific values in the text
    print("\nSearching for expected values in PDF text:")
    print("-" * 40)
    
    test_values = {
        "Test 1 (Full)": ["John Smith", "123-45-6789", "Chase Bank"],
        "Test 2 (Partial)": ["Jane Doe", "987-65-4321", "Bank of America", "$500.00"]
    }
    
    # Check which test this might be
    for test_name, values in test_values.items():
        found_count = 0
        for value in values:
            if value in text:
                found_count += 1
                print(f"  ✓ Found '{value}' (from {test_name})")
        
        if found_count > 0:
            print(f"  => Likely {test_name}: {found_count}/{len(values)} values found")
    
    doc.close()

if __name__ == "__main__":
    # Check the first two test outputs
    check_pdf_fields("test_output/test_1_full_deposit.pdf")
    check_pdf_fields("test_output/test_2_partial_deposit.pdf")