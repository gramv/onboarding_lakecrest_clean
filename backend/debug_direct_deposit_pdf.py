#!/usr/bin/env python3
"""
Debug Direct Deposit PDF to see why it's empty
"""
import fitz  # PyMuPDF
import json

# Path to the Direct Deposit template
template_path = "/Users/gouthamvemula/onbclaude/onbdev-demo/hotel-onboarding-backend/static/direct-deposit-template.pdf"

print("\n" + "="*60)
print("Analyzing Direct Deposit PDF Template")
print("="*60)

try:
    # Open the PDF
    doc = fitz.open(template_path)
    print(f"\n✓ Opened PDF: {template_path}")
    print(f"  Pages: {len(doc)}")
    
    # Check each page for form fields
    for page_num, page in enumerate(doc):
        print(f"\n📄 Page {page_num + 1}:")
        
        # Get all widgets (form fields)
        widgets = list(page.widgets())
        print(f"  Total form fields found: {len(widgets)}")
        
        if widgets:
            print("\n  Field Details:")
            for widget in widgets:
                field_info = {
                    "name": widget.field_name,
                    "type": widget.field_type_string,
                    "value": widget.field_value,
                    "flags": widget.field_flags,
                }
                print(f"    • {widget.field_name or 'UNNAMED'}")
                print(f"      Type: {widget.field_type_string}")
                print(f"      Current Value: '{widget.field_value or ''}'")
        else:
            print("  ⚠️ No form fields found on this page")
            
            # Check for text annotations that might be placeholders
            annots = list(page.annots())
            if annots:
                print(f"\n  Found {len(annots)} annotations that might be form placeholders")
    
    # Try to fill a test field
    print("\n" + "="*60)
    print("Testing Field Population")
    print("="*60)
    
    page = doc[0]
    test_filled = False
    
    for widget in page.widgets():
        if widget.field_name:
            print(f"\nTrying to fill field: {widget.field_name}")
            widget.field_value = "TEST VALUE"
            widget.update()
            test_filled = True
            print(f"  ✓ Set value to 'TEST VALUE'")
            break
    
    if test_filled:
        # Save test PDF
        test_output = "test_direct_deposit_filled.pdf"
        doc.save(test_output)
        print(f"\n✓ Saved test PDF to: {test_output}")
    else:
        print("\n⚠️ No fields could be filled - PDF might not have fillable form fields")
    
    doc.close()
    
    print("\n" + "="*60)
    print("Analysis Complete")
    print("="*60)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()