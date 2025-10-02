#!/usr/bin/env python3
"""
Test the Direct Deposit AcroForm by filling it with sample data
"""

import fitz  # PyMuPDF
from pathlib import Path

def fill_form_with_sample_data():
    """Fill the AcroForm with sample data to demonstrate it works"""
    
    # Open the AcroForm PDF
    input_path = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct-deposit-acroform.pdf")
    output_path = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct-deposit-filled-sample.pdf")
    
    doc = fitz.open(str(input_path))
    
    # Sample data to fill the form
    sample_data = {
        # Company Information
        "company_code": "HTL001",
        "company_name": "Grand Vista Hotels & Resorts",
        "employee_file_number": "EMP2024",
        "payroll_mgr_name": "Sarah Johnson",
        "payroll_mgr_signature": "Sarah Johnson",
        
        # Employee Information
        "employee_name": "John Smith",
        "ssn": "123-45-6789",
        "employee_email": "john.smith@email.com",
        "employee_signature": "John Smith",
        "signature_date": "08/25/2024",
        
        # Primary Bank Account
        "bank1_name_city_state": "Wells Fargo Bank, Phoenix, AZ",
        "bank1_routing": "121000248",
        "bank1_account": "1234567890",
        "bank1_checking": True,  # Check the checking box
        "bank1_entire": True,  # Entire net amount
        
        # Optional Second Account (for demonstration)
        "bank2_name_city_state": "Chase Bank, Scottsdale, AZ",
        "bank2_routing": "021000021",
        "bank2_account": "9876543210",
        "bank2_savings": True,  # Savings account
        "bank2_amount": "$200.00",
    }
    
    # Fill the form fields
    page = doc[0]
    for widget in page.widgets():
        if widget.field_name in sample_data:
            value = sample_data[widget.field_name]
            
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                # For checkboxes, set to "Yes" if True
                if value:
                    widget.field_value = "Yes"
                    widget.update()
            else:
                # For text fields
                widget.field_value = str(value)
                widget.update()
    
    # Save the filled form
    doc.save(str(output_path))
    doc.close()
    
    print(f"✅ Sample filled form created successfully!")
    print(f"📄 Output: {output_path}")
    print(f"\n📋 Sample data filled:")
    print(f"  - Company: Grand Vista Hotels & Resorts")
    print(f"  - Employee: John Smith")
    print(f"  - Primary Account: Wells Fargo (Checking - Entire Net)")
    print(f"  - Secondary Account: Chase Bank (Savings - $200)")
    print(f"\n🎯 Your official form style is completely preserved!")
    print(f"   Only the fields are filled - no visual changes!")

if __name__ == "__main__":
    fill_form_with_sample_data()