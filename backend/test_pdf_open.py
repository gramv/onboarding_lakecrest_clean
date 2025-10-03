#!/usr/bin/env python3
"""
Test if we can open the health insurance PDF template
"""
import os
import fitz  # PyMuPDF

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
HI_TEMPLATE_PATH = os.path.join(STATIC_DIR, "HI Form_final3.pdf")

print(f"Template path: {HI_TEMPLATE_PATH}")
print(f"File exists: {os.path.exists(HI_TEMPLATE_PATH)}")

if os.path.exists(HI_TEMPLATE_PATH):
    print(f"File size: {os.path.getsize(HI_TEMPLATE_PATH)} bytes")
    
    try:
        print("\nAttempting to open PDF...")
        doc = fitz.open(HI_TEMPLATE_PATH)
        print(f"✅ PDF opened successfully!")
        print(f"   - Page count: {doc.page_count}")
        print(f"   - Metadata: {doc.metadata}")
        
        if doc.page_count > 0:
            page1 = doc[0]
            print(f"\nPage 1 info:")
            print(f"   - Size: {page1.rect}")
            print(f"   - Rotation: {page1.rotation}")
            
            # Check for form fields
            widgets = list(page1.widgets())
            print(f"   - Form fields: {len(widgets)}")
            if widgets:
                print(f"   - First 5 field names: {[w.field_name for w in widgets[:5]]}")
        
        doc.close()
        print("\n✅ PDF test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error opening PDF: {e}")
        import traceback
        traceback.print_exc()
else:
    print("❌ Template file not found!")

