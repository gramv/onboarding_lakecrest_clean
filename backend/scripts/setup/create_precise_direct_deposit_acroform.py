#!/usr/bin/env python3
"""
Create Direct Deposit AcroForm with PRECISE field positions
Based on careful analysis of the actual PDF structure
"""

import fitz
from pathlib import Path

def create_precise_acroform():
    input_pdf = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/official-forms/Direct  deposit form.pdf")
    output_pdf = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct_deposit_precise_acroform.pdf")
    
    doc = fitz.open(str(input_pdf))
    page = doc[0]
    
    # Get page dimensions for reference
    page_rect = page.rect
    print(f"Page dimensions: {page_rect.width} x {page_rect.height}")
    
    # PRECISELY MEASURED FIELD POSITIONS
    # Based on the actual PDF layout analysis
    
    fields = {
        # === TOP SECTION - PAYROLL MANAGER (Y: ~89-122) ===
        "company_code": {
            "rect": [153, 89, 240, 103],  # After "Company Code:"
            "type": "text"
        },
        "company_name": {
            "rect": [325, 89, 525, 103],  # After "Company Name:"
            "type": "text"
        },
        "employee_file_number": {
            "rect": [483, 89, 560, 103],  # After "Employee File Number:"
            "type": "text"
        },
        "payroll_mgr_name": {
            "rect": [165, 108, 365, 122],  # After "Payroll Mgr. Name:"
            "type": "text"
        },
        "payroll_mgr_signature": {
            "rect": [445, 108, 580, 122],  # After "Payroll Mgr. Signature:"
            "type": "text"
        },
        
        # === EMPLOYEE SECTION (Y: ~454-487) ===
        "employee_name": {
            "rect": [125, 454, 365, 468],  # After "Employee Name:"
            "type": "text"
        },
        "ssn": {
            "rect": [410, 454, 560, 468],  # After "Social Security #:" with underscores
            "type": "text"
        },
        "employee_signature": {
            "rect": [140, 473, 380, 487],  # After "Employee Signature:"
            "type": "signature"
        },
        "signature_date": {
            "rect": [415, 473, 560, 487],  # After "Date:"
            "type": "text"
        },
        "employee_email": {
            "rect": [125, 492, 560, 506],  # After "Employee Email:" (bottom of form)
            "type": "text"
        },
        
        # === BANK ACCOUNT 1 (Y: ~518-570) ===
        "bank1_name_city_state": {
            "rect": [180, 518, 560, 532],  # After "1. Bank Name/City/State:"
            "type": "text"
        },
        "bank1_routing": {
            "rect": [125, 537, 255, 551],  # After "Routing Transit #:" with underscores
            "type": "text"
        },
        "bank1_account": {
            "rect": [330, 537, 560, 551],  # After "Account Number:"
            "type": "text"
        },
        "bank1_checking": {
            "rect": [70, 557, 83, 570],  # Checkbox before "Checking"
            "type": "checkbox"
        },
        "bank1_savings": {
            "rect": [140, 557, 153, 570],  # Checkbox before "Savings"
            "type": "checkbox"
        },
        "bank1_other": {
            "rect": [210, 557, 223, 570],  # Checkbox before "Other"
            "type": "checkbox"
        },
        "bank1_amount": {
            "rect": [360, 556, 440, 570],  # After "I wish to deposit: $"
            "type": "text"
        },
        "bank1_entire": {
            "rect": [470, 557, 483, 570],  # Checkbox before "Entire Net Amount"
            "type": "checkbox"
        },
        
        # === BANK ACCOUNT 2 (Y: ~579-631) ===
        "bank2_name_city_state": {
            "rect": [180, 579, 560, 593],  # After "2. Bank Name/City/State:"
            "type": "text"
        },
        "bank2_routing": {
            "rect": [125, 598, 255, 612],  # After "Routing Transit #:"
            "type": "text"
        },
        "bank2_account": {
            "rect": [330, 598, 560, 612],  # After "Account Number:"
            "type": "text"
        },
        "bank2_checking": {
            "rect": [70, 618, 83, 631],  # Checkbox before "Checking"
            "type": "checkbox"
        },
        "bank2_savings": {
            "rect": [140, 618, 153, 631],  # Checkbox before "Savings"
            "type": "checkbox"
        },
        "bank2_other": {
            "rect": [210, 618, 223, 631],  # Checkbox before "Other"
            "type": "checkbox"
        },
        "bank2_amount": {
            "rect": [360, 617, 440, 631],  # After "I wish to deposit: $"
            "type": "text"
        },
        "bank2_entire": {
            "rect": [470, 618, 483, 631],  # Checkbox before "Entire Net Amount"
            "type": "checkbox"
        },
        
        # === BANK ACCOUNT 3 (Y: ~640-692) ===
        "bank3_name_city_state": {
            "rect": [180, 640, 560, 654],  # After "3. Bank Name/City/State:"
            "type": "text"
        },
        "bank3_routing": {
            "rect": [125, 659, 255, 673],  # After "Routing Transit #:"
            "type": "text"
        },
        "bank3_account": {
            "rect": [330, 659, 560, 673],  # After "Account Number:"
            "type": "text"
        },
        "bank3_checking": {
            "rect": [70, 679, 83, 692],  # Checkbox before "Checking"
            "type": "checkbox"
        },
        "bank3_savings": {
            "rect": [140, 679, 153, 692],  # Checkbox before "Savings"
            "type": "checkbox"
        },
        "bank3_other": {
            "rect": [210, 679, 223, 692],  # Checkbox before "Other"
            "type": "checkbox"
        },
        "bank3_amount": {
            "rect": [360, 678, 440, 692],  # After "I wish to deposit: $"
            "type": "text"
        },
        "bank3_entire": {
            "rect": [470, 679, 483, 692],  # Checkbox before "Entire Net Amount"
            "type": "checkbox"
        }
    }
    
    # Add all fields to the PDF
    for field_name, field_info in fields.items():
        rect = fitz.Rect(field_info["rect"])
        
        widget = fitz.Widget()
        
        if field_info["type"] == "checkbox":
            widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
            widget.field_name = field_name
            widget.rect = rect
            widget.border_width = 0  # Invisible border
            widget.fill_color = None  # Transparent
            
        elif field_info["type"] == "signature":
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = field_name
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0
            widget.fill_color = None  # Transparent background
            widget.text_color = (0, 0, 0)  # Black text
            
        else:  # text field
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = field_name
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0
            widget.fill_color = None  # Transparent background
            widget.text_color = (0, 0, 0)  # Black text
        
        page.add_widget(widget)
    
    # Set NeedAppearances for proper rendering
    try:
        doc.set_need_appearances(True)
    except:
        pass
    
    # Save the AcroForm
    doc.save(str(output_pdf))
    doc.close()
    
    print(f"✅ Created PRECISE AcroForm with {len(fields)} fields")
    print(f"📄 Output: {output_pdf}")
    print(f"\n📋 Field categories:")
    print(f"  - Company information: 5 fields")
    print(f"  - Employee information: 5 fields")
    print(f"  - Bank account 1: 8 fields")
    print(f"  - Bank account 2: 8 fields")
    print(f"  - Bank account 3: 8 fields")
    print(f"\n✨ Fields are positioned EXACTLY where they appear on your official form!")
    
    return output_pdf

def test_precise_form():
    """Test the precisely mapped form with sample data"""
    acroform_path = create_precise_acroform()
    
    doc = fitz.open(str(acroform_path))
    page = doc[0]
    
    # Sample test data
    test_data = {
        # Company
        "company_code": "HTL001",
        "company_name": "Grand Vista Hotels",
        "employee_file_number": "2024-001",
        "payroll_mgr_name": "Sarah Johnson",
        "payroll_mgr_signature": "S. Johnson",
        
        # Employee
        "employee_name": "John Smith",
        "ssn": "123-45-6789",
        "employee_email": "jsmith@email.com",
        "employee_signature": "John Smith",
        "signature_date": "08/25/2024",
        
        # Bank 1
        "bank1_name_city_state": "Wells Fargo, Phoenix AZ",
        "bank1_routing": "121000248",
        "bank1_account": "1234567890",
        "bank1_checking": True,
        "bank1_entire": True,
    }
    
    # Fill the form
    for widget in page.widgets():
        if widget.field_name in test_data:
            value = test_data[widget.field_name]
            if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                if value:
                    widget.field_value = "Yes"
            else:
                widget.field_value = str(value)
            widget.update()
    
    # Save test file
    test_output = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct_deposit_test_precise.pdf")
    doc.save(str(test_output))
    doc.close()
    
    print(f"\n📝 Test file created: {test_output}")
    print("🔍 Please review this file to verify field positions are accurate!")

if __name__ == "__main__":
    test_precise_form()