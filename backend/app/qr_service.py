"""
QR Code Generation Service for Job Applications
"""
import qrcode
import io
import base64
from typing import Dict, Any
import os
from PIL import Image


class QRCodeService:
    """Service for generating QR codes for job applications"""
    
    def __init__(self):
        # Use FRONTEND_URL env var with sensible default
        self.base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    def generate_qr_code(self, property_id: str) -> Dict[str, Any]:
        """
        Generate QR code for property job application
        
        Args:
            property_id: The property ID to generate QR code for
            
        Returns:
            Dictionary containing QR code data and URL
        """
        # Create the application URL
        application_url = f"{self.base_url}/apply/{property_id}"
        
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,  # Controls the size of the QR Code
            error_correction=qrcode.constants.ERROR_CORRECT_L,  # About 7% or less errors can be corrected
            box_size=10,  # Controls how many pixels each "box" of the QR code is
            border=4,  # Controls how many boxes thick the border should be
        )
        
        # Add data to QR code
        qr.add_data(application_url)
        qr.make(fit=True)
        
        # Create QR code image
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64 for storage/transmission
        img_buffer = io.BytesIO()
        qr_image.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        # Create base64 encoded string
        qr_code_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        qr_code_data_url = f"data:image/png;base64,{qr_code_base64}"
        
        return {
            "qr_code_url": qr_code_data_url,
            "application_url": application_url,
            "property_id": property_id,
            "format": "PNG",
            "size": qr_image.size
        }
    
    def generate_printable_qr_code(self, property_id: str, property_name: str) -> Dict[str, Any]:
        """
        Generate a printable QR code with property name and instructions
        
        Args:
            property_id: The property ID to generate QR code for
            property_name: The name of the property
            
        Returns:
            Dictionary containing printable QR code data
        """
        # Generate basic QR code first
        qr_data = self.generate_qr_code(property_id)
        
        # Create a larger image with text
        from PIL import Image, ImageDraw, ImageFont
        
        # Create QR code with larger size for printing
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=15,  # Larger for printing
            border=4,
        )
        
        application_url = f"{self.base_url}/apply/{property_id}"
        qr.add_data(application_url)
        qr.make(fit=True)
        
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert QR image to RGB mode to match canvas
        qr_image = qr_image.convert('RGB')
        
        # Create a larger canvas for the printable version
        canvas_width = 600
        canvas_height = 800
        canvas = Image.new('RGB', (canvas_width, canvas_height), 'white')
        
        # Calculate QR code position (centered horizontally, upper portion)
        qr_width, qr_height = qr_image.size
        qr_x = (canvas_width - qr_width) // 2
        qr_y = 100
        
        # Paste QR code onto canvas
        canvas.paste(qr_image, (qr_x, qr_y))
        
        # Add text using PIL's default font
        draw = ImageDraw.Draw(canvas)
        
        try:
            # Try to use a better font if available
            title_font = ImageFont.truetype("Arial", 36)
            subtitle_font = ImageFont.truetype("Arial", 24)
            url_font = ImageFont.truetype("Arial", 16)
        except:
            # Fallback to default font
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            url_font = ImageFont.load_default()
        
        # Add property name at the top
        title_text = property_name
        title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (canvas_width - title_width) // 2
        draw.text((title_x, 30), title_text, fill='black', font=title_font)
        
        # Add "Scan to Apply" text below QR code
        scan_text = "Scan to Apply for Jobs"
        scan_bbox = draw.textbbox((0, 0), scan_text, font=subtitle_font)
        scan_width = scan_bbox[2] - scan_bbox[0]
        scan_x = (canvas_width - scan_width) // 2
        scan_y = qr_y + qr_height + 30
        draw.text((scan_x, scan_y), scan_text, fill='black', font=subtitle_font)
        
        # Add URL at the bottom
        url_text = application_url
        url_bbox = draw.textbbox((0, 0), url_text, font=url_font)
        url_width = url_bbox[2] - url_bbox[0]
        url_x = (canvas_width - url_width) // 2
        url_y = scan_y + 60
        draw.text((url_x, url_y), url_text, fill='gray', font=url_font)
        
        # Convert to base64
        img_buffer = io.BytesIO()
        canvas.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        printable_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        printable_data_url = f"data:image/png;base64,{printable_base64}"
        
        return {
            "qr_code_url": qr_data["qr_code_url"],  # Regular QR code
            "printable_qr_url": printable_data_url,  # Printable version with text
            "application_url": application_url,
            "property_id": property_id,
            "property_name": property_name,
            "format": "PNG",
            "canvas_size": (canvas_width, canvas_height)
        }


# Global service instance
qr_service = QRCodeService()