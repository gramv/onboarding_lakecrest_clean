#!/usr/bin/env python3
"""
Debug script to extract all form fields from the health insurance PDF
to understand the actual checkbox structure for dental and vision coverage.
"""

import fitz  # PyMuPDF
import os

def analyze_health_insurance_pdf():
    """Analyze the health insurance PDF form fields."""
    
    # Path to the health insurance PDF template
    pdf_path = "/Users/gouthamvemula/onbclaude/onbdev-production/hotel-onboarding-backend/static/HI Form_final3.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"❌ PDF not found at: {pdf_path}")
        return
    
    print("🔍 ANALYZING HEALTH INSURANCE PDF FORM FIELDS")
    print("=" * 80)
    
    try:
        # Open the PDF
        doc = fitz.open(pdf_path)
        
        total_fields = 0
        all_checkboxes = []
        dental_related = []
        vision_related = []
        
        # Analyze each page
        for page_num in range(doc.page_count):
            page = doc[page_num]
            print(f"\n📄 PAGE {page_num + 1}")
            print("-" * 40)
            
            # Get all form widgets on this page
            widgets = list(page.widgets())

            if not widgets:
                print("  No form fields found on this page")
                continue
            
            page_checkboxes = []
            
            for widget in widgets:
                field_info = {
                    'name': widget.field_name,
                    'type': widget.field_type_string,
                    'value': widget.field_value,
                    'page': page_num + 1
                }
                
                total_fields += 1
                
                # Focus on checkboxes
                if widget.field_type_string == "CheckBox":
                    all_checkboxes.append(field_info)
                    page_checkboxes.append(field_info)
                    
                    # Check for dental-related checkboxes
                    field_name_lower = widget.field_name.lower()
                    if any(term in field_name_lower for term in ['dental', 'employee only_6', 'employee  spouse_7', 'employee  children_8', 'employee  family_8']):
                        dental_related.append(field_info)
                    
                    # Check for vision-related checkboxes
                    if any(term in field_name_lower for term in ['vision', 'employee only_5', 'employee  spouse_6', 'employee  family_7']):
                        vision_related.append(field_info)
                
                # Print all fields for reference
                print(f"  {widget.field_type_string}: '{widget.field_name}' = '{widget.field_value}'")
            
            print(f"\n  📊 Page {page_num + 1} Summary: {len(page_checkboxes)} checkboxes out of {len(widgets)} total fields")
        
        doc.close()
        
        # Summary analysis
        print("\n" + "=" * 80)
        print("📊 SUMMARY ANALYSIS")
        print("=" * 80)
        print(f"Total form fields: {total_fields}")
        print(f"Total checkboxes: {len(all_checkboxes)}")
        
        print(f"\n🦷 DENTAL-RELATED CHECKBOXES ({len(dental_related)}):")
        for checkbox in dental_related:
            print(f"  - '{checkbox['name']}' (Page {checkbox['page']})")
        
        print(f"\n👁️  VISION-RELATED CHECKBOXES ({len(vision_related)}):")
        for checkbox in vision_related:
            print(f"  - '{checkbox['name']}' (Page {checkbox['page']})")
        
        print(f"\n📋 ALL CHECKBOXES:")
        for i, checkbox in enumerate(all_checkboxes, 1):
            print(f"  {i:2d}. '{checkbox['name']}' (Page {checkbox['page']})")
        
        # Look for patterns
        print(f"\n🔍 PATTERN ANALYSIS:")
        
        # Group checkboxes by similar patterns
        employee_only_checkboxes = [cb for cb in all_checkboxes if 'employee only' in cb['name'].lower()]
        employee_spouse_checkboxes = [cb for cb in all_checkboxes if 'employee  spouse' in cb['name'].lower()]
        employee_children_checkboxes = [cb for cb in all_checkboxes if 'employee  children' in cb['name'].lower()]
        employee_family_checkboxes = [cb for cb in all_checkboxes if 'employee  family' in cb['name'].lower()]
        decline_checkboxes = [cb for cb in all_checkboxes if 'decline' in cb['name'].lower()]
        
        print(f"  Employee Only variations: {len(employee_only_checkboxes)}")
        for cb in employee_only_checkboxes:
            print(f"    - '{cb['name']}'")
        
        print(f"  Employee + Spouse variations: {len(employee_spouse_checkboxes)}")
        for cb in employee_spouse_checkboxes:
            print(f"    - '{cb['name']}'")
        
        print(f"  Employee + Children variations: {len(employee_children_checkboxes)}")
        for cb in employee_children_checkboxes:
            print(f"    - '{cb['name']}'")
        
        print(f"  Employee + Family variations: {len(employee_family_checkboxes)}")
        for cb in employee_family_checkboxes:
            print(f"    - '{cb['name']}'")
        
        print(f"  Decline variations: {len(decline_checkboxes)}")
        for cb in decline_checkboxes:
            print(f"    - '{cb['name']}'")
        
        print("\n" + "=" * 80)
        print("✅ ANALYSIS COMPLETE")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error analyzing PDF: {e}")

if __name__ == "__main__":
    analyze_health_insurance_pdf()
