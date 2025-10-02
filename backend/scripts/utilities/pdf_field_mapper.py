#!/usr/bin/env python3
"""
Interactive PDF Field Mapper - Click on the PDF to get exact field coordinates
This will help map fields accurately on your official Direct Deposit form
"""

import fitz  # PyMuPDF
import tkinter as tk
from tkinter import ttk, scrolledtext
from PIL import Image, ImageTk
import json
from pathlib import Path
import io

class PDFFieldMapper:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.doc = fitz.open(pdf_path)
        self.current_page = 0
        self.page = self.doc[self.current_page]
        self.fields = {}
        self.current_field = None
        self.rect_start = None
        
        # Setup GUI
        self.root = tk.Tk()
        self.root.title("PDF Field Mapper - Click to Map Fields")
        self.root.geometry("1400x900")
        
        # Create main frames
        self.create_ui()
        
        # Load and display PDF
        self.display_page()
        
    def create_ui(self):
        # Top frame for controls
        control_frame = ttk.Frame(self.root)
        control_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(control_frame, text="Field Name:").pack(side=tk.LEFT, padx=5)
        self.field_name_var = tk.StringVar()
        self.field_name_entry = ttk.Entry(control_frame, textvariable=self.field_name_var, width=30)
        self.field_name_entry.pack(side=tk.LEFT, padx=5)
        
        ttk.Label(control_frame, text="Field Type:").pack(side=tk.LEFT, padx=5)
        self.field_type_var = tk.StringVar(value="text")
        field_type_combo = ttk.Combobox(control_frame, textvariable=self.field_type_var, 
                                        values=["text", "checkbox", "signature"], width=15)
        field_type_combo.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(control_frame, text="Export Fields", command=self.export_fields).pack(side=tk.LEFT, padx=20)
        ttk.Button(control_frame, text="Clear All", command=self.clear_fields).pack(side=tk.LEFT, padx=5)
        ttk.Button(control_frame, text="Test Fill", command=self.test_fill).pack(side=tk.LEFT, padx=5)
        
        # Instructions
        instructions = ttk.Label(control_frame, text="📍 Enter field name, then click & drag on PDF to mark field area", 
                                foreground="blue")
        instructions.pack(side=tk.LEFT, padx=20)
        
        # Main content frame
        content_frame = ttk.Frame(self.root)
        content_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # PDF display canvas (left side)
        pdf_frame = ttk.LabelFrame(content_frame, text="PDF Preview (Click & Drag to Mark Fields)")
        pdf_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        
        # Create canvas with scrollbars
        canvas_frame = ttk.Frame(pdf_frame)
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        v_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.VERTICAL)
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        h_scrollbar = ttk.Scrollbar(canvas_frame, orient=tk.HORIZONTAL)
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)
        
        self.canvas = tk.Canvas(canvas_frame, bg="gray", 
                                yscrollcommand=v_scrollbar.set,
                                xscrollcommand=h_scrollbar.set)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        v_scrollbar.config(command=self.canvas.yview)
        h_scrollbar.config(command=self.canvas.xview)
        
        # Bind mouse events
        self.canvas.bind("<ButtonPress-1>", self.on_mouse_press)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_release)
        
        # Fields list (right side)
        fields_frame = ttk.LabelFrame(content_frame, text="Mapped Fields")
        fields_frame.pack(side=tk.RIGHT, fill=tk.BOTH, padx=5)
        
        self.fields_text = scrolledtext.ScrolledText(fields_frame, width=50, height=40)
        self.fields_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Status bar
        self.status_var = tk.StringVar(value="Ready to map fields...")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, relief=tk.SUNKEN)
        status_bar.pack(side=tk.BOTTOM, fill=tk.X)
        
    def display_page(self):
        # Render PDF page to image
        mat = fitz.Matrix(2, 2)  # 2x zoom for clarity
        pix = self.page.get_pixmap(matrix=mat, alpha=False)
        img_data = pix.tobytes("ppm")
        
        # Convert to PIL Image then to PhotoImage
        img = Image.open(io.BytesIO(img_data))
        self.photo = ImageTk.PhotoImage(img)
        
        # Display on canvas
        self.canvas.delete("all")
        self.canvas_image = self.canvas.create_image(0, 0, anchor=tk.NW, image=self.photo)
        self.canvas.config(scrollregion=self.canvas.bbox("all"))
        
        # Redraw existing fields
        self.redraw_fields()
        
    def on_mouse_press(self, event):
        if not self.field_name_var.get():
            self.status_var.set("⚠️ Please enter a field name first!")
            return
            
        # Get canvas coordinates
        canvas_x = self.canvas.canvasx(event.x)
        canvas_y = self.canvas.canvasy(event.y)
        
        # Convert to PDF coordinates (accounting for 2x zoom)
        self.rect_start = (canvas_x / 2, canvas_y / 2)
        
        # Create rectangle for visual feedback
        self.current_rect = self.canvas.create_rectangle(
            canvas_x, canvas_y, canvas_x, canvas_y,
            outline="red", width=2, tags="current"
        )
        
    def on_mouse_drag(self, event):
        if self.current_rect and self.rect_start:
            canvas_x = self.canvas.canvasx(event.x)
            canvas_y = self.canvas.canvasy(event.y)
            
            # Update rectangle
            x0, y0 = self.rect_start[0] * 2, self.rect_start[1] * 2
            self.canvas.coords(self.current_rect, x0, y0, canvas_x, canvas_y)
            
    def on_mouse_release(self, event):
        if not self.rect_start:
            return
            
        # Get end coordinates
        canvas_x = self.canvas.canvasx(event.x)
        canvas_y = self.canvas.canvasy(event.y)
        rect_end = (canvas_x / 2, canvas_y / 2)
        
        # Calculate field rectangle
        x1 = min(self.rect_start[0], rect_end[0])
        y1 = min(self.rect_start[1], rect_end[1])
        x2 = max(self.rect_start[0], rect_end[0])
        y2 = max(self.rect_start[1], rect_end[1])
        
        # Minimum size check
        if abs(x2 - x1) < 10 or abs(y2 - y1) < 5:
            self.canvas.delete("current")
            self.status_var.set("⚠️ Field too small, please drag a larger area")
            return
            
        # Save field
        field_name = self.field_name_var.get()
        self.fields[field_name] = {
            "rect": [x1, y1, x2, y2],
            "type": self.field_type_var.get(),
            "page": self.current_page
        }
        
        # Update display
        self.canvas.delete("current")
        self.redraw_fields()
        self.update_fields_list()
        
        # Clear for next field
        self.field_name_var.set("")
        self.rect_start = None
        self.status_var.set(f"✅ Added field: {field_name}")
        
    def redraw_fields(self):
        # Remove old field rectangles
        self.canvas.delete("field")
        
        # Draw all fields
        for name, field in self.fields.items():
            x1, y1, x2, y2 = field["rect"]
            color = {"text": "blue", "checkbox": "green", "signature": "purple"}.get(field["type"], "blue")
            
            # Draw rectangle (with 2x zoom)
            rect = self.canvas.create_rectangle(
                x1 * 2, y1 * 2, x2 * 2, y2 * 2,
                outline=color, width=2, tags="field"
            )
            
            # Add label
            self.canvas.create_text(
                x1 * 2, y1 * 2 - 5,
                text=name, anchor=tk.SW,
                fill=color, font=("Arial", 10, "bold"),
                tags="field"
            )
            
    def update_fields_list(self):
        self.fields_text.delete(1.0, tk.END)
        for name, field in self.fields.items():
            self.fields_text.insert(tk.END, f"{name}:\n")
            self.fields_text.insert(tk.END, f"  Type: {field['type']}\n")
            self.fields_text.insert(tk.END, f"  Rect: {field['rect']}\n")
            self.fields_text.insert(tk.END, f"  Page: {field['page']}\n\n")
            
    def export_fields(self):
        if not self.fields:
            self.status_var.set("⚠️ No fields to export!")
            return
            
        # Save as JSON
        output_path = Path(self.pdf_path).stem + "_field_mapping.json"
        with open(output_path, 'w') as f:
            json.dump(self.fields, f, indent=2)
            
        # Also generate Python code
        python_path = Path(self.pdf_path).stem + "_acroform_generator.py"
        self.generate_python_code(python_path)
        
        self.status_var.set(f"✅ Exported to {output_path} and {python_path}")
        
    def generate_python_code(self, output_path):
        """Generate Python code to create AcroForm with mapped fields"""
        code = f'''#!/usr/bin/env python3
"""
Auto-generated AcroForm creator for {Path(self.pdf_path).name}
Generated by PDF Field Mapper
"""

import fitz
from pathlib import Path

def create_acroform():
    input_pdf = "{self.pdf_path}"
    output_pdf = "{Path(self.pdf_path).stem}_acroform.pdf"
    
    doc = fitz.open(input_pdf)
    page = doc[0]
    
    fields = {json.dumps(self.fields, indent=8)}
    
    for name, field_info in fields.items():
        rect = fitz.Rect(field_info["rect"])
        
        if field_info["type"] == "checkbox":
            widget = fitz.Widget()
            widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
            widget.field_name = name
            widget.rect = rect
            widget.border_width = 0
            page.add_widget(widget)
        else:
            widget = fitz.Widget()
            widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
            widget.field_name = name
            widget.rect = rect
            widget.text_fontsize = 10
            widget.border_width = 0
            widget.fill_color = None
            page.add_widget(widget)
    
    doc.save(output_pdf)
    doc.close()
    print(f"✅ Created AcroForm: {{output_pdf}}")

if __name__ == "__main__":
    create_acroform()
'''
        
        with open(output_path, 'w') as f:
            f.write(code)
            
    def test_fill(self):
        """Create a test-filled version of the form"""
        if not self.fields:
            self.status_var.set("⚠️ No fields mapped yet!")
            return
            
        test_pdf = Path(self.pdf_path).stem + "_test_filled.pdf"
        doc = fitz.open(self.pdf_path)
        page = doc[0]
        
        # Add test data to each field
        for name, field_info in self.fields.items():
            rect = fitz.Rect(field_info["rect"])
            
            # Add red rectangle to show field location
            page.draw_rect(rect, color=(1, 0, 0), width=0.5)
            
            # Add sample text
            if field_info["type"] == "checkbox":
                # Draw an X for checkboxes
                page.draw_line(rect.tl, rect.br, color=(0, 0, 1), width=2)
                page.draw_line(rect.tr, rect.bl, color=(0, 0, 1), width=2)
            else:
                # Add sample text
                sample_text = f"[{name}]"
                page.insert_text(rect.tl + (2, 12), sample_text, fontsize=10, color=(0, 0, 1))
        
        doc.save(test_pdf)
        doc.close()
        self.status_var.set(f"✅ Created test file: {test_pdf}")
        
    def clear_fields(self):
        self.fields = {}
        self.redraw_fields()
        self.update_fields_list()
        self.status_var.set("Cleared all fields")
        
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    # Use the official Direct Deposit form
    pdf_path = "/Users/gouthamvemula/onbclaude/onbdev-demo/official-forms/Direct  deposit form.pdf"
    mapper = PDFFieldMapper(pdf_path)
    mapper.run()