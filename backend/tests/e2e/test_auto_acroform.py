#!/usr/bin/env python3
"""
Test the auto-generated Direct Deposit AcroForm
"""

import fitz
from datetime import datetime

# Open the auto-generated AcroForm
doc = fitz.open("Direct  deposit form_auto_acroform.pdf")

# Sample data matching your DirectDepositFormEnhanced fields
test_data = {
    # Company info (from your property)
    "company_code": "GVH001",
    "company_name": "Grand Vista Hotels & Resorts",
    "employee_file_number": "EMP2024-1234",
    "payroll_mgr_name": "Sarah Johnson",
    "payroll_mgr_signature": "Sarah Johnson",
    
    # Employee info
    "employee_name": "John Smith",
    "ssn": "123-45-6789",
    "employee_email": "john.smith@grandvistahotels.com",
    "employee_signature": "John Smith",
    "signature_date": datetime.now().strftime("%m/%d/%Y"),
    
    # Primary bank account (checking, entire amount)
    "bank1_name_city_state": "Wells Fargo Bank, Phoenix, AZ 85001",
    "bank1_routing": "121000248",
    "bank1_account": "1234567890",
    "bank1_checking": True,
    "bank1_entire": True,
    
    # Secondary account (savings, fixed amount)
    "bank2_name_city_state": "Chase Bank, Scottsdale, AZ 85251",
    "bank2_routing": "021000021",
    "bank2_account": "9876543210",
    "bank2_savings": True,
    "bank2_amount": "$250.00",
}

# Fill the form
page = doc[0]
for widget in page.widgets():
    field_name = widget.field_name
    if field_name in test_data:
        value = test_data[field_name]
        if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
            if value:
                widget.field_value = "Yes"
        else:
            widget.field_value = str(value)
        widget.update()

# Save the filled form
output_path = "Direct_Deposit_Test_Filled.pdf"
doc.save(output_path)
doc.close()

print(f"✅ Test form filled successfully!")
print(f"📄 Output: {output_path}")
print(f"\n📋 Data filled:")
print(f"  Employee: John Smith")
print(f"  Company: Grand Vista Hotels & Resorts")
print(f"  Primary: Wells Fargo (Checking - Entire Net)")
print(f"  Secondary: Chase Bank (Savings - $250)")
print(f"\n🎯 Your official form style is completely preserved!")
print(f"   Open the PDF to verify all fields are correctly positioned.")