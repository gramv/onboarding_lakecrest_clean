#!/usr/bin/env python3
"""
Create Direct Deposit AcroForm using YOUR exact coordinates
These coordinates are precisely measured from your form
"""

import fitz
from pathlib import Path
from datetime import datetime

def create_acroform_with_exact_coords():
    input_pdf = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/official-forms/Direct  deposit form.pdf")
    output_pdf = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct_deposit_exact_acroform.pdf")
    
    doc = fitz.open(str(input_pdf))
    page = doc[0]
    
    # Page height for coordinate conversion (PDF uses bottom-left origin)
    page_height = 792  # Letter size
    
    # Your exact field definitions
    fields = {
        # Header Section (Payroll Manager)
        "company_code": {"x": 120, "y": 720, "width": 60, "height": 14, "type": "text"},
        "company_name": {"x": 270, "y": 720, "width": 200, "height": 14, "type": "text"},
        "employee_file_number": {"x": 520, "y": 720, "width": 70, "height": 14, "type": "text"},
        "payroll_manager_name": {"x": 130, "y": 700, "width": 150, "height": 14, "type": "text"},
        "payroll_manager_signature": {"x": 370, "y": 700, "width": 150, "height": 14, "type": "text"},
        
        # Employee Information
        "employee_name": {"x": 130, "y": 510, "width": 200, "height": 14, "type": "text"},
        "ssn1": {"x": 380, "y": 510, "width": 25, "height": 14, "type": "text"},
        "ssn2": {"x": 415, "y": 510, "width": 20, "height": 14, "type": "text"},
        "ssn3": {"x": 450, "y": 510, "width": 35, "height": 14, "type": "text"},
        "employee_signature": {"x": 140, "y": 485, "width": 200, "height": 14, "type": "signature"},
        "signature_date": {"x": 420, "y": 485, "width": 100, "height": 14, "type": "text"},
        "employee_email": {"x": 130, "y": 460, "width": 300, "height": 14, "type": "text"},
        
        # Bank Account 1
        "bank1_name_city_state": {"x": 200, "y": 380, "width": 350, "height": 14, "type": "text"},
        "bank1_routing_1": {"x": 125, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_2": {"x": 140, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_3": {"x": 155, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_4": {"x": 170, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_5": {"x": 185, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_6": {"x": 200, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_7": {"x": 215, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_8": {"x": 230, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_routing_9": {"x": 245, "y": 355, "width": 12, "height": 14, "type": "text"},
        "bank1_account": {"x": 350, "y": 355, "width": 150, "height": 14, "type": "text"},
        "bank1_checking": {"x": 75, "y": 335, "width": 13, "height": 13, "type": "checkbox"},
        "bank1_savings": {"x": 145, "y": 335, "width": 13, "height": 13, "type": "checkbox"},
        "bank1_other": {"x": 205, "y": 335, "width": 13, "height": 13, "type": "checkbox"},
        "bank1_amount": {"x": 340, "y": 335, "width": 70, "height": 14, "type": "text"},
        "bank1_entire": {"x": 460, "y": 335, "width": 13, "height": 13, "type": "checkbox"},
        
        # Bank Account 2
        "bank2_name_city_state": {"x": 200, "y": 290, "width": 350, "height": 14, "type": "text"},
        "bank2_routing_1": {"x": 125, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_2": {"x": 140, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_3": {"x": 155, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_4": {"x": 170, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_5": {"x": 185, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_6": {"x": 200, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_7": {"x": 215, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_8": {"x": 230, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_routing_9": {"x": 245, "y": 265, "width": 12, "height": 14, "type": "text"},
        "bank2_account": {"x": 350, "y": 265, "width": 150, "height": 14, "type": "text"},
        "bank2_checking": {"x": 75, "y": 245, "width": 13, "height": 13, "type": "checkbox"},
        "bank2_savings": {"x": 145, "y": 245, "width": 13, "height": 13, "type": "checkbox"},
        "bank2_other": {"x": 205, "y": 245, "width": 13, "height": 13, "type": "checkbox"},
        "bank2_amount": {"x": 340, "y": 245, "width": 70, "height": 14, "type": "text"},
        "bank2_entire": {"x": 460, "y": 245, "width": 13, "height": 13, "type": "checkbox"},
        
        # Bank Account 3
        "bank3_name_city_state": {"x": 200, "y": 200, "width": 350, "height": 14, "type": "text"},
        "bank3_routing_1": {"x": 125, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_2": {"x": 140, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_3": {"x": 155, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_4": {"x": 170, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_5": {"x": 185, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_6": {"x": 200, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_7": {"x": 215, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_8": {"x": 230, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_routing_9": {"x": 245, "y": 175, "width": 12, "height": 14, "type": "text"},
        "bank3_account": {"x": 350, "y": 175, "width": 150, "height": 14, "type": "text"},
        "bank3_checking": {"x": 75, "y": 155, "width": 13, "height": 13, "type": "checkbox"},
        "bank3_savings": {"x": 145, "y": 155, "width": 13, "height": 13, "type": "checkbox"},
        "bank3_other": {"x": 205, "y": 155, "width": 13, "height": 13, "type": "checkbox"},
        "bank3_amount": {"x": 340, "y": 155, "width": 70, "height": 14, "type": "text"},
        "bank3_entire": {"x": 460, "y": 155, "width": 13, "height": 13, "type": "checkbox"},
    }
    
    # Add fields to PDF
    for field_name, field_info in fields.items():
        # Convert coordinates (PDF origin is bottom-left, Y increases upward)
        # Your coordinates appear to already be in PDF coordinate system
        x = field_info["x"]
        y = field_info["y"]
        width = field_info["width"]
        height = field_info.get("height", 14)
        
        # Create rectangle (x1, y1, x2, y2)
        rect = fitz.Rect(x, page_height - y - height, x + width, page_height - y)
        
        widget = fitz.Widget()
        
        if field_info["type"] == "checkbox":
            widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
            widget.field_name = field_name
            widget.rect = rect
            widget.border_width = 0
            widget.fill_color = None
            
        elif field_info["type"] == "signature":
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = field_name
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0
            widget.fill_color = None
            widget.text_color = (0, 0, 0)
            
        else:  # text
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = field_name
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0
            widget.fill_color = None
            widget.text_color = (0, 0, 0)
        
        page.add_widget(widget)
    
    # Set NeedAppearances
    try:
        doc.set_need_appearances(True)
    except:
        pass
    
    doc.save(str(output_pdf))
    doc.close()
    
    print(f"✅ Created AcroForm with YOUR exact coordinates")
    print(f"📄 Output: {output_pdf}")
    
    return output_pdf

def fill_with_sample_data():
    """Fill the form with sample data to test accuracy"""
    acroform_path = create_acroform_with_exact_coords()
    
    doc = fitz.open(str(acroform_path))
    page = doc[0]
    
    # Sample data
    test_data = {
        # Company info
        "company_code": "GVH001",
        "company_name": "Grand Vista Hotels & Resorts",
        "employee_file_number": "2024-123",
        "payroll_manager_name": "Sarah Johnson",
        "payroll_manager_signature": "Sarah Johnson",
        
        # Employee info
        "employee_name": "John Michael Smith",
        "ssn1": "123",
        "ssn2": "45",
        "ssn3": "6789",
        "employee_signature": "John M. Smith",
        "signature_date": datetime.now().strftime("%m/%d/%Y"),
        "employee_email": "john.smith@grandvistahotels.com",
        
        # Bank 1 - Primary checking account (entire net)
        "bank1_name_city_state": "Wells Fargo Bank, Phoenix, AZ 85001",
        "bank1_routing_1": "1",
        "bank1_routing_2": "2",
        "bank1_routing_3": "1",
        "bank1_routing_4": "0",
        "bank1_routing_5": "0",
        "bank1_routing_6": "0",
        "bank1_routing_7": "2",
        "bank1_routing_8": "4",
        "bank1_routing_9": "8",
        "bank1_account": "1234567890",
        "bank1_checking": True,
        "bank1_entire": True,
        
        # Bank 2 - Savings account (fixed amount)
        "bank2_name_city_state": "Chase Bank, Scottsdale, AZ 85251",
        "bank2_routing_1": "0",
        "bank2_routing_2": "2",
        "bank2_routing_3": "1",
        "bank2_routing_4": "0",
        "bank2_routing_5": "0",
        "bank2_routing_6": "0",
        "bank2_routing_7": "0",
        "bank2_routing_8": "2",
        "bank2_routing_9": "1",
        "bank2_account": "9876543210",
        "bank2_savings": True,
        "bank2_amount": "$250.00",
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
    
    # Save filled form
    test_output = Path("/Users/gouthamvemula/onbclaude/onbdev-demo/direct_deposit_sample_filled.pdf")
    doc.save(str(test_output))
    doc.close()
    
    print(f"\n📝 Sample filled form created: {test_output}")
    print("\n📋 Sample data filled:")
    print(f"  Employee: John Michael Smith")
    print(f"  Company: Grand Vista Hotels & Resorts")
    print(f"  Primary Bank: Wells Fargo (Checking - Entire Net)")
    print(f"  Secondary Bank: Chase (Savings - $250.00)")
    print(f"\n✨ Your coordinates have been applied exactly as specified!")
    print("🔍 Please check the PDF to verify all fields are positioned correctly.")

if __name__ == "__main__":
    fill_with_sample_data()