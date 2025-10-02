#!/usr/bin/env python3
"""
Extract and display all form field names and their properties from the Direct Deposit PDF
"""
import fitz  # PyMuPDF
import json
from datetime import datetime

# Path to the Direct Deposit template
template_path = "/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend/static/direct-deposit-template.pdf"

print("\n" + "="*80)
print("DIRECT DEPOSIT PDF FORM FIELD MAPPING")
print("="*80)
print(f"Template: {template_path}")
print(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("="*80)

try:
    # Open the PDF
    doc = fitz.open(template_path)
    print(f"\n📄 PDF Information:")
    print(f"   Pages: {len(doc)}")
    print(f"   Format: {doc.metadata.get('format', 'Unknown')}")
    print(f"   Producer: {doc.metadata.get('producer', 'Unknown')}")
    
    # Collect all fields with their properties
    all_fields = []
    
    for page_num, page in enumerate(doc):
        print(f"\n📑 Page {page_num + 1} Fields:")
        print("-" * 60)
        
        widgets = list(page.widgets())
        
        if not widgets:
            print("   No form fields found on this page")
            continue
            
        # Group fields by category
        company_fields = []
        employee_fields = []
        bank1_fields = []
        bank2_fields = []
        bank3_fields = []
        other_fields = []
        
        for widget in widgets:
            field_info = {
                "name": widget.field_name,
                "type": widget.field_type_string,
                "value": widget.field_value,
                "rect": {
                    "x": widget.rect.x0,
                    "y": widget.rect.y0,
                    "width": widget.rect.width,
                    "height": widget.rect.height
                }
            }
            
            all_fields.append(field_info)
            
            # Categorize fields
            if widget.field_name:
                if widget.field_name.startswith("company_"):
                    company_fields.append(field_info)
                elif widget.field_name.startswith("employee_"):
                    employee_fields.append(field_info)
                elif widget.field_name.startswith("bank1_"):
                    bank1_fields.append(field_info)
                elif widget.field_name.startswith("bank2_"):
                    bank2_fields.append(field_info)
                elif widget.field_name.startswith("bank3_"):
                    bank3_fields.append(field_info)
                else:
                    other_fields.append(field_info)
        
        # Display categorized fields
        if company_fields:
            print("\n🏢 COMPANY/PAYROLL SECTION:")
            for field in company_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
                if field['value'] and field['value'] not in ['Off', '']:
                    print(f"     Current Value: '{field['value']}'")
        
        if employee_fields:
            print("\n👤 EMPLOYEE INFORMATION SECTION:")
            for field in employee_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
                if field['value'] and field['value'] not in ['Off', '']:
                    print(f"     Current Value: '{field['value']}'")
        
        if bank1_fields:
            print("\n🏦 BANK ACCOUNT 1 (PRIMARY):")
            for field in bank1_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
                if field['value'] and field['value'] not in ['Off', '']:
                    print(f"     Current Value: '{field['value']}'")
        
        if bank2_fields:
            print("\n🏦 BANK ACCOUNT 2 (SECONDARY):")
            for field in bank2_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
                if field['value'] and field['value'] not in ['Off', '']:
                    print(f"     Current Value: '{field['value']}'")
        
        if bank3_fields:
            print("\n🏦 BANK ACCOUNT 3 (TERTIARY):")
            for field in bank3_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
                if field['value'] and field['value'] not in ['Off', '']:
                    print(f"     Current Value: '{field['value']}'")
        
        if other_fields:
            print("\n📝 OTHER FIELDS:")
            for field in other_fields:
                print(f"   • {field['name']:<30} [{field['type']:<10}] Position: ({field['rect']['x']:.1f}, {field['rect']['y']:.1f})")
    
    # Summary statistics
    print("\n" + "="*80)
    print("📊 FIELD SUMMARY:")
    print("-" * 60)
    print(f"Total Fields: {len(all_fields)}")
    
    # Count by type
    text_fields = sum(1 for f in all_fields if 'Text' in f.get('type', ''))
    checkbox_fields = sum(1 for f in all_fields if 'CheckBox' in f.get('type', ''))
    
    print(f"   Text Fields: {text_fields}")
    print(f"   Checkboxes: {checkbox_fields}")
    
    # Export to JSON for reference
    output_file = "direct_deposit_field_mappings.json"
    with open(output_file, 'w') as f:
        json.dump({
            "template": template_path,
            "analysis_date": datetime.now().isoformat(),
            "total_fields": len(all_fields),
            "fields": all_fields
        }, f, indent=2, default=str)
    
    print(f"\n💾 Field mappings exported to: {output_file}")
    
    # Create mapping guide
    print("\n" + "="*80)
    print("🗺️ FIELD MAPPING GUIDE FOR DEVELOPERS:")
    print("-" * 60)
    print("\nTo fill this PDF, use these exact field names in your code:")
    print("\n# Employee Information:")
    print('  set_field_value("employee_name", full_name)')
    print('  set_field_value("social_security_number", ssn)')
    print('  set_field_value("employee_email", email)')
    print('  set_field_value("employee_signature", signature_data)  # For signature')
    print('  set_field_value("employee_date", current_date)  # MM/DD/YYYY')
    
    print("\n# Primary Bank Account:")
    print('  set_field_value("bank1_name", bank_name_with_location)')
    print('  set_field_value("bank1_routing_number", routing_number)')
    print('  set_field_value("bank1_account_number", account_number)')
    print('  set_field_value("bank1_checking", True)  # For checking account')
    print('  set_field_value("bank1_savings", True)   # For savings account')
    print('  set_field_value("bank1_entire_net_amount", True)  # For full deposit')
    print('  set_field_value("bank1_deposit_amount", amount)  # For partial')
    
    print("\n# Company/Payroll (Usually filled by HR):")
    print('  set_field_value("company_code", company_code)')
    print('  set_field_value("company_name", company_name)')
    print('  set_field_value("employee_file_number", employee_id)')
    
    doc.close()
    
    print("\n" + "="*80)
    print("✅ Analysis Complete!")
    print("="*80)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()