#!/usr/bin/env python3
"""
Analyze the generated PDF content to understand what's being written
"""

import fitz  # PyMuPDF
import json

def analyze_pdf(pdf_path: str):
    """Analyze PDF content and structure"""
    print(f"\n{'='*60}")
    print(f"Analyzing: {pdf_path}")
    print(f"{'='*60}")
    
    try:
        # Open PDF
        doc = fitz.open(pdf_path)
        
        for page_num, page in enumerate(doc):
            print(f"\nPage {page_num + 1}:")
            print("-" * 40)
            
            # Get text
            text = page.get_text()
            print("\nExtracted Text (first 500 chars):")
            print(text[:500] if text else "No text extracted")
            
            # Check for form fields
            widgets = page.widgets()
            if widgets:
                print(f"\nFound {len(list(widgets))} form widgets")
                for widget in page.widgets():
                    print(f"  - {widget.field_name}: {widget.field_value}")
            else:
                print("\nNo form widgets found")
            
            # Check for annotations
            annots = page.annots()
            if annots:
                print(f"\nFound {len(list(annots))} annotations")
            
            # Check for images
            image_list = page.get_images()
            if image_list:
                print(f"\nFound {len(image_list)} images")
                for img_index, img in enumerate(image_list):
                    print(f"  - Image {img_index}: xref={img[0]}")
            
            # Get drawings (lines, rectangles, etc.)
            drawings = page.get_drawings()
            rect_count = 0
            text_count = 0
            for drawing in drawings:
                if 'rect' in drawing:
                    rect_count += 1
                if 'text' in drawing:
                    text_count += 1
            
            if rect_count > 0 or text_count > 0:
                print(f"\nDrawings: {rect_count} rectangles, {text_count} text insertions")
        
        doc.close()
        
    except Exception as e:
        print(f"Error analyzing PDF: {e}")

if __name__ == "__main__":
    # Analyze the first test PDF
    analyze_pdf("test_output/test_1_full_deposit.pdf")
    
    # Also analyze a partial deposit
    analyze_pdf("test_output/test_2_partial_deposit.pdf")