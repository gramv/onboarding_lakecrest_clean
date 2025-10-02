#!/usr/bin/env python3
"""
Automatically detect form fields in PDF using text analysis
This finds underlines, boxes, and blank spaces that indicate form fields
"""

import fitz  # PyMuPDF
import re
from pathlib import Path
import json

class PDFFieldDetector:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.fields = {}
        
    def detect_fields(self):
        """Automatically detect fields based on text patterns and visual elements"""
        page = self.doc[0]
        
        # Get all text with positions
        text_instances = page.get_text("dict")
        
        # Pattern matching for common field indicators
        field_patterns = {
            # Employee information
            r"Employee Name:": {"name": "employee_name", "type": "text"},
            r"Social Security #:": {"name": "ssn", "type": "text"},
            r"Employee Email:": {"name": "employee_email", "type": "text"},
            r"Employee Signature:": {"name": "employee_signature", "type": "signature"},
            r"Date:": {"name": "signature_date", "type": "text"},
            
            # Company information
            r"Company Code:": {"name": "company_code", "type": "text"},
            r"Company Name:": {"name": "company_name", "type": "text"},
            r"Employee File Number:": {"name": "employee_file_number", "type": "text"},
            r"Payroll Mgr\. Name:": {"name": "payroll_mgr_name", "type": "text"},
            r"Payroll Mgr\. Signature:": {"name": "payroll_mgr_signature", "type": "text"},
            
            # Bank account patterns
            r"Bank Name/City/State:": {"prefix": "bank", "suffix": "_name_city_state", "type": "text"},
            r"Routing Transit #:": {"prefix": "bank", "suffix": "_routing", "type": "text"},
            r"Account Number:": {"prefix": "bank", "suffix": "_account", "type": "text"},
            r"Checking": {"prefix": "bank", "suffix": "_checking", "type": "checkbox"},
            r"Savings": {"prefix": "bank", "suffix": "_savings", "type": "checkbox"},
            r"Other": {"prefix": "bank", "suffix": "_other", "type": "checkbox"},
            r"I wish to deposit:": {"prefix": "bank", "suffix": "_amount", "type": "text"},
            r"Entire Net Amount": {"prefix": "bank", "suffix": "_entire", "type": "checkbox"},
        }
        
        # Track which bank account we're processing (1, 2, or 3)
        bank_counter = {"current": 0, "last_y": 0}
        
        # Process each text block
        for block in text_instances.get("blocks", []):
            if block.get("type") == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        bbox = span.get("bbox", [])
                        
                        if not text or not bbox:
                            continue
                        
                        # Check if this is a bank section (numbered 1, 2, or 3)
                        if re.match(r"^[123]\.", text):
                            bank_counter["current"] = int(text[0])
                            bank_counter["last_y"] = bbox[1]
                            continue
                        
                        # Match field patterns
                        for pattern, field_info in field_patterns.items():
                            if re.search(pattern, text, re.IGNORECASE):
                                # Determine field position (after the label)
                                field_rect = self.calculate_field_rect(bbox, text, pattern)
                                
                                # Handle bank account fields
                                if "prefix" in field_info:
                                    # Determine which bank based on Y position
                                    if bank_counter["current"] == 0:
                                        # Try to detect based on Y position
                                        y_pos = bbox[1]
                                        if y_pos < 550:
                                            bank_num = 1
                                        elif y_pos < 610:
                                            bank_num = 2
                                        else:
                                            bank_num = 3
                                    else:
                                        bank_num = bank_counter["current"]
                                    
                                    field_name = f"{field_info['prefix']}{bank_num}{field_info['suffix']}"
                                else:
                                    field_name = field_info["name"]
                                
                                self.fields[field_name] = {
                                    "rect": field_rect,
                                    "type": field_info["type"],
                                    "page": 0
                                }
        
        # Also detect underlines and boxes (visual indicators of fields)
        self.detect_visual_fields(page)
        
        return self.fields
    
    def calculate_field_rect(self, label_bbox, label_text, pattern):
        """Calculate where the field should be based on the label position"""
        x1, y1, x2, y2 = label_bbox
        
        # Field typically starts after the label
        # Estimate based on common patterns
        if ":" in label_text:
            # Field starts after the colon
            field_x1 = x2 + 5
            field_x2 = field_x1 + 200  # Default width
        else:
            # Checkbox - field is near the label
            field_x1 = x1 - 15
            field_x2 = x1 - 2
        
        # Height is similar to label height
        field_y1 = y1
        field_y2 = y2
        
        return [field_x1, field_y1, field_x2, field_y2]
    
    def detect_visual_fields(self, page):
        """Detect fields based on visual elements like lines and rectangles"""
        # Get all drawings on the page
        drawings = page.get_drawings()
        
        # Look for horizontal lines (underlines) that indicate text fields
        for drawing in drawings:
            if drawing["type"] == "l":  # Line
                # Check if it's roughly horizontal
                points = drawing["items"]
                if len(points) >= 2:
                    p1, p2 = points[0], points[1]
                    if abs(p1[1] - p2[1]) < 2:  # Horizontal line
                        # This could be an underline for a field
                        y_pos = p1[1]
                        x_start = min(p1[0], p2[0])
                        x_end = max(p1[0], p2[0])
                        
                        # Check if we already have a field near this position
                        # If not, it might be an additional field we missed
                        field_rect = [x_start, y_pos - 15, x_end, y_pos]
                        
                        # You can add logic here to identify what field this might be
                        # based on its position relative to known text
    
    def export_mapping(self, output_path=None):
        """Export the detected fields to JSON"""
        if output_path is None:
            output_path = Path(self.pdf_path).stem + "_auto_detected_fields.json"
        
        with open(output_path, 'w') as f:
            json.dump(self.fields, f, indent=2)
        
        print(f"✅ Exported {len(self.fields)} detected fields to {output_path}")
        return output_path
    
    def create_acroform(self, output_path=None):
        """Create AcroForm PDF with detected fields"""
        if output_path is None:
            output_path = Path(self.pdf_path).stem + "_auto_acroform.pdf"
        
        # Create a new document with form fields
        doc = fitz.open(self.pdf_path)
        page = doc[0]
        
        for field_name, field_info in self.fields.items():
            rect = fitz.Rect(field_info["rect"])
            
            if field_info["type"] == "checkbox":
                widget = fitz.Widget()
                widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
                widget.field_name = field_name
                widget.rect = rect
                widget.border_width = 0
                page.add_widget(widget)
            elif field_info["type"] == "signature":
                widget = fitz.Widget()
                widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
                widget.field_name = field_name
                widget.rect = rect
                widget.text_fontsize = 10
                widget.border_width = 0
                widget.fill_color = None
                page.add_widget(widget)
            else:  # text
                widget = fitz.Widget()
                widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
                widget.field_name = field_name
                widget.rect = rect
                widget.text_fontsize = 10
                widget.border_width = 0
                widget.fill_color = None
                page.add_widget(widget)
        
        doc.save(str(output_path))
        doc.close()
        
        print(f"✅ Created AcroForm with {len(self.fields)} fields: {output_path}")
        return output_path
    
    def visualize_fields(self, output_path=None):
        """Create a PDF with rectangles showing detected field positions"""
        if output_path is None:
            output_path = Path(self.pdf_path).stem + "_field_visualization.pdf"
        
        doc = fitz.open(self.pdf_path)
        page = doc[0]
        
        colors = {
            "text": (0, 0, 1),      # Blue
            "checkbox": (0, 1, 0),   # Green  
            "signature": (1, 0, 1),  # Magenta
        }
        
        for field_name, field_info in self.fields.items():
            rect = fitz.Rect(field_info["rect"])
            color = colors.get(field_info["type"], (0, 0, 0))
            
            # Draw rectangle around field
            page.draw_rect(rect, color=color, width=1)
            
            # Add field name as label
            page.insert_text(
                rect.tl + (0, -2),
                field_name,
                fontsize=8,
                color=color
            )
        
        doc.save(str(output_path))
        doc.close()
        
        print(f"✅ Created field visualization: {output_path}")
        return output_path

def main():
    # Path to your official form
    pdf_path = "/Users/gouthamvemula/onbclaude/onbdev-demo/official-forms/Direct  deposit form.pdf"
    
    print("🔍 Auto-detecting fields in Direct Deposit form...")
    detector = PDFFieldDetector(pdf_path)
    
    # Detect fields
    fields = detector.detect_fields()
    print(f"📊 Detected {len(fields)} fields")
    
    # Show detected fields
    print("\n📋 Detected fields:")
    for name, info in fields.items():
        print(f"  - {name}: {info['type']}")
    
    # Export mapping
    mapping_file = detector.export_mapping()
    
    # Create visualization
    viz_file = detector.visualize_fields()
    
    # Create AcroForm
    acroform_file = detector.create_acroform()
    
    print(f"\n✅ Complete! Generated files:")
    print(f"  1. Field mapping: {mapping_file}")
    print(f"  2. Visualization: {viz_file}")
    print(f"  3. AcroForm PDF: {acroform_file}")

if __name__ == "__main__":
    main()