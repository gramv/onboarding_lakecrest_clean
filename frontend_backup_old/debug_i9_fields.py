#!/usr/bin/env python3
"""
Debug script to extract all field names from the I-9 PDF form.
This script uses PyMuPDF (fitz) to open the PDF and list all form field names.
"""

import fitz  # PyMuPDF
import sys
from pathlib import Path

def extract_pdf_field_names(pdf_path):
    """
    Extract all field names from a PDF form.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        dict: Dictionary containing field information
    """
    try:
        # Open the PDF document
        doc = fitz.open(pdf_path)
        print(f"Successfully opened PDF: {pdf_path}")
        print(f"Number of pages: {doc.page_count}")
        print("-" * 80)
        
        all_fields = {}
        field_count = 0
        
        # Iterate through all pages
        for page_num in range(doc.page_count):
            page = doc[page_num]
            print(f"\nPage {page_num + 1}:")
            print("-" * 40)
            
            # Get all form widgets on this page
            widgets = page.widgets()
            page_fields = []
            
            if not widgets:
                print("  No form fields found on this page")
                continue
                
            for widget in widgets:
                field_info = {
                    'name': widget.field_name,
                    'type': widget.field_type_string,
                    'value': widget.field_value,
                    'rect': widget.rect,
                    'page': page_num + 1
                }
                
                page_fields.append(field_info)
                field_count += 1
                
                # Print field information
                print(f"  Field {field_count}:")
                print(f"    Name: '{widget.field_name}'")
                print(f"    Type: {widget.field_type_string}")
                print(f"    Current Value: '{widget.field_value}'")
                print(f"    Position: {widget.rect}")
                print()
            
            all_fields[f'page_{page_num + 1}'] = page_fields
        
        doc.close()
        
        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total fields found: {field_count}")
        
        # List all field names for easy copying
        print("\nAll field names (for easy copying):")
        print("-" * 40)
        all_field_names = []
        for page_key, fields in all_fields.items():
            for field in fields:
                if field['name']:  # Only include fields with names
                    all_field_names.append(field['name'])
        
        # Remove duplicates and sort
        unique_field_names = sorted(set(all_field_names))
        
        for i, field_name in enumerate(unique_field_names, 1):
            print(f"{i:2d}. '{field_name}'")
        
        # Group by field type
        print("\nFields grouped by type:")
        print("-" * 40)
        fields_by_type = {}
        for page_key, fields in all_fields.items():
            for field in fields:
                field_type = field['type']
                if field_type not in fields_by_type:
                    fields_by_type[field_type] = []
                if field['name']:  # Only include fields with names
                    fields_by_type[field_type].append(field['name'])
        
        for field_type, names in fields_by_type.items():
            unique_names = sorted(set(names))
            print(f"\n{field_type} fields ({len(unique_names)}):")
            for name in unique_names:
                print(f"  - '{name}'")
        
        return all_fields
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}")
        return None

def main():
    """Main function to run the field extraction."""
    pdf_path = "/Users/gouthamvemula/onbclaude/onbdev/official-forms/i9-form-latest.pdf"
    
    # Check if file exists
    if not Path(pdf_path).exists():
        print(f"Error: PDF file not found at {pdf_path}")
        sys.exit(1)
    
    print("I-9 PDF Form Field Extractor")
    print("=" * 80)
    print(f"Analyzing: {pdf_path}")
    print()
    
    # Extract field names
    fields = extract_pdf_field_names(pdf_path)
    
    if fields:
        print("\n" + "=" * 80)
        print("Field extraction completed successfully!")
        print("You can now use these exact field names in your form mapping.")
    else:
        print("Failed to extract fields from the PDF.")
        sys.exit(1)

if __name__ == "__main__":
    main()