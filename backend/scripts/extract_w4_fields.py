#!/usr/bin/env python3
"""Extract field names from W-4 PDF form"""

import fitz  # PyMuPDF
import json
from pathlib import Path

def extract_w4_fields():
    """Extract all field names and properties from W-4 PDF"""
    
    # Path to the W-4 form
    pdf_path = Path("/Users/gouthamvemula/onbclaude/onbdev/official-forms/w4-form-latest.pdf")
    
    if not pdf_path.exists():
        print(f"❌ W-4 form not found at: {pdf_path}")
        return
    
    print(f"✅ Found W-4 form at: {pdf_path}")
    
    try:
        # Open the PDF
        pdf = fitz.open(pdf_path)
        
        # Get all fields
        fields = []
        
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            widgets = page.widgets()
            
            for widget in widgets:
                field_info = {
                    "field_name": widget.field_name,
                    "field_type": widget.field_type_string,
                    "field_value": widget.field_value,
                    "field_display": widget.field_display,
                    "page": page_num + 1,
                    "rect": list(widget.rect),
                    "field_flags": widget.field_flags,
                }
                
                # Add specific properties for different field types
                if widget.field_type_string == "CheckBox":
                    field_info["is_checked"] = widget.field_value == widget.on_state()
                    field_info["on_state"] = widget.on_state()
                elif widget.field_type_string == "RadioButton":
                    field_info["is_selected"] = widget.field_value == widget.on_state()
                    field_info["on_state"] = widget.on_state()
                
                fields.append(field_info)
        
        pdf.close()
        
        # Group fields by page
        fields_by_page = {}
        for field in fields:
            page = field["page"]
            if page not in fields_by_page:
                fields_by_page[page] = []
            fields_by_page[page].append(field)
        
        # Print summary
        print(f"\n📊 W-4 Form Field Analysis")
        print(f"Total fields found: {len(fields)}")
        
        # Print fields by page
        for page, page_fields in sorted(fields_by_page.items()):
            print(f"\n📄 Page {page}: {len(page_fields)} fields")
            print("-" * 50)
            
            # Group by field type
            by_type = {}
            for field in page_fields:
                ftype = field["field_type"]
                if ftype not in by_type:
                    by_type[ftype] = []
                by_type[ftype].append(field)
            
            for ftype, type_fields in by_type.items():
                print(f"\n{ftype} fields ({len(type_fields)}):")
                for field in type_fields:
                    print(f"  - {field['field_name']}")
                    if field.get("field_value"):
                        print(f"    Current value: {field['field_value']}")
        
        # Save to JSON for reference
        output_path = Path(__file__).parent / "w4_field_mapping.json"
        with open(output_path, 'w') as f:
            json.dump({
                "total_fields": len(fields),
                "fields_by_page": fields_by_page,
                "all_fields": fields
            }, f, indent=2)
        
        print(f"\n✅ Field mapping saved to: {output_path}")
        
        # Print key fields for W-4
        print("\n🔑 Key W-4 Fields for Mapping:")
        print("-" * 50)
        
        key_patterns = [
            "name", "Name", "address", "Address", "city", "City", 
            "state", "State", "zip", "ZIP", "ssn", "SSN", "social",
            "filing", "Filing", "withholding", "Withholding",
            "dependent", "Dependent", "child", "Child", "multiple", "Multiple",
            "deduction", "Deduction", "income", "Income", "extra", "Extra"
        ]
        
        for field in fields:
            field_name = field["field_name"]
            if any(pattern.lower() in field_name.lower() for pattern in key_patterns):
                print(f"Field: {field_name}")
                print(f"  Type: {field['field_type']}")
                print(f"  Page: {field['page']}")
                print()
        
    except Exception as e:
        print(f"❌ Error processing PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    extract_w4_fields()