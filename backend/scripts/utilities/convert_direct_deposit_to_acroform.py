#!/usr/bin/env python3
"""
Convert the official Direct Deposit form to AcroForm with invisible fields
that preserve the exact appearance of the original form.
"""

import fitz  # PyMuPDF
import sys
from pathlib import Path

def add_form_fields(doc):
    """Add invisible form fields to the Direct Deposit PDF"""
    page = doc[0]  # First page
    page_width = page.rect.width
    page_height = page.rect.height
    
    # Define all form fields with their exact positions
    # These coordinates are based on the visual analysis of the PDF
    fields = [
        # === PAYROLL MANAGER SECTION (Top) ===
        {"name": "company_code", "rect": [210, 89, 280, 103], "type": "text"},
        {"name": "company_name", "rect": [355, 89, 565, 103], "type": "text"},
        {"name": "employee_file_number", "rect": [650, 89, 740, 103], "type": "text"},
        {"name": "payroll_mgr_name", "rect": [140, 108, 340, 122], "type": "text"},
        {"name": "payroll_mgr_signature", "rect": [430, 108, 630, 122], "type": "text"},
        
        # === EMPLOYEE INFORMATION SECTION ===
        {"name": "employee_name", "rect": [140, 454, 400, 468], "type": "text"},
        {"name": "ssn", "rect": [470, 454, 590, 468], "type": "text"},
        {"name": "employee_email", "rect": [140, 435, 550, 449], "type": "text"},
        
        # === SIGNATURE SECTION ===
        {"name": "employee_signature", "rect": [150, 473, 400, 487], "type": "signature"},
        {"name": "signature_date", "rect": [480, 473, 590, 487], "type": "text"},
        
        # === ACCOUNT 1 ===
        {"name": "bank1_name_city_state", "rect": [200, 518, 590, 532], "type": "text"},
        {"name": "bank1_routing", "rect": [140, 537, 260, 551], "type": "text"},
        {"name": "bank1_account", "rect": [340, 537, 590, 551], "type": "text"},
        {"name": "bank1_checking", "rect": [95, 557, 108, 570], "type": "checkbox"},
        {"name": "bank1_savings", "rect": [165, 557, 178, 570], "type": "checkbox"},
        {"name": "bank1_other", "rect": [235, 557, 248, 570], "type": "checkbox"},
        {"name": "bank1_amount", "rect": [380, 556, 460, 570], "type": "text"},
        {"name": "bank1_entire", "rect": [495, 557, 508, 570], "type": "checkbox"},
        
        # === ACCOUNT 2 ===
        {"name": "bank2_name_city_state", "rect": [200, 579, 590, 593], "type": "text"},
        {"name": "bank2_routing", "rect": [140, 598, 260, 612], "type": "text"},
        {"name": "bank2_account", "rect": [340, 598, 590, 612], "type": "text"},
        {"name": "bank2_checking", "rect": [95, 618, 108, 631], "type": "checkbox"},
        {"name": "bank2_savings", "rect": [165, 618, 178, 631], "type": "checkbox"},
        {"name": "bank2_other", "rect": [235, 618, 248, 631], "type": "checkbox"},
        {"name": "bank2_amount", "rect": [380, 617, 460, 631], "type": "text"},
        {"name": "bank2_entire", "rect": [495, 618, 508, 631], "type": "checkbox"},
        
        # === ACCOUNT 3 ===
        {"name": "bank3_name_city_state", "rect": [200, 640, 590, 654], "type": "text"},
        {"name": "bank3_routing", "rect": [140, 659, 260, 673], "type": "text"},
        {"name": "bank3_account", "rect": [340, 659, 590, 673], "type": "text"},
        {"name": "bank3_checking", "rect": [95, 679, 108, 692], "type": "checkbox"},
        {"name": "bank3_savings", "rect": [165, 679, 178, 692], "type": "checkbox"},
        {"name": "bank3_other", "rect": [235, 679, 248, 692], "type": "checkbox"},
        {"name": "bank3_amount", "rect": [380, 678, 460, 692], "type": "text"},
        {"name": "bank3_entire", "rect": [495, 679, 508, 692], "type": "checkbox"},
    ]
    
    # Add each field to the PDF
    for field in fields:
        rect = fitz.Rect(field["rect"])
        
        if field["type"] == "text":
            widget = fitz.Widget()
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = field["name"]
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_style = "U"  # Underline style
            widget.border_width = 0  # No visible border
            widget.fill_color = None  # Transparent background
            widget.text_color = (0, 0, 0)  # Black text
            page.add_widget(widget)
            
        elif field["type"] == "checkbox":
            widget = fitz.Widget()
            widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
            widget.field_name = field["name"]
            widget.rect = rect
            widget.border_width = 0  # Invisible border
            widget.fill_color = None  # Transparent
            page.add_widget(widget)
            
        elif field["type"] == "signature":
            widget = fitz.Widget()
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT  # Use text field for signature
            widget.field_name = field["name"]
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0  # No visible border
            widget.fill_color = None  # Transparent background
            page.add_widget(widget)
    
    return doc

def main():
    # Input and output paths
    input_path = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/official-forms/Direct  deposit form.pdf")
    output_path = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct-deposit-acroform.pdf")
    
    if not input_path.exists():
        print(f"Error: Input PDF not found: {input_path}")
        sys.exit(1)
    
    # Open the PDF
    doc = fitz.open(str(input_path))
    
    # Add form fields
    doc = add_form_fields(doc)
    
    # Set NeedAppearances flag so fields render properly
    try:
        doc.set_need_appearances(True)
    except:
        pass
    
    # Save the AcroForm PDF
    doc.save(str(output_path))
    doc.close()
    
    print(f"✅ AcroForm PDF created successfully!")
    print(f"📄 Output: {output_path}")
    print(f"\n📝 Form fields added:")
    print("  - Employee information (name, SSN, email)")
    print("  - Company information (code, name, file number)")
    print("  - Up to 3 bank accounts with routing/account numbers")
    print("  - Account type checkboxes (checking/savings/other)")
    print("  - Deposit amount fields")
    print("  - Signature fields")
    print("\n✨ The form appearance is preserved exactly as the original!")

if __name__ == "__main__":
    main()