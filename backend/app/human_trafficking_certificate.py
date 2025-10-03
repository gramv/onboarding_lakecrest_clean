"""
Human Trafficking Training Certificate Generator
Generates a certificate matching the hotel's compliance requirements
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Any
import base64
import io
import uuid

class HumanTraffickingCertificateGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom styles for the certificate"""
        self.styles.add(ParagraphStyle(
            name='CertTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CertSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#374151'),
            spaceAfter=20,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='CertText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceAfter=12,
            leading=16
        ))
        
        self.styles.add(ParagraphStyle(
            name='CertBullet',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceAfter=8,
            leftIndent=30,
            bulletIndent=15,
            leading=14
        ))
        
        self.styles.add(ParagraphStyle(
            name='SignatureLabel',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceBefore=5
        ))
    
    def generate_certificate(self, 
                           employee_data: Dict[str, Any],
                           signature_data: Dict[str, Any],
                           training_date: str = None,
                           is_preview: bool = False) -> Dict[str, Any]:
        """Generate a certificate matching the compliance document format"""
        
        buffer = BytesIO()
        
        # Create canvas for more control over positioning
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # No border - clean document style
        
        # Hotel Name Section
        c.setFont("Helvetica", 12)
        c.drawString(60, height - 100, "Hotel Name:")
        c.line(150, height - 102, 550, height - 102)
        c.setFont("Helvetica", 12)
        c.drawString(155, height - 100, employee_data.get('property_name', ''))
        
        # Certification Statement
        c.setFont("Helvetica", 11)
        text_y = height - 150
        
        statement = (
            "By signing this form, I attest that I have completed Human Trafficking Prevention "
            "Training through AHLA/ECPATUSA, as mandated by my employer, on the date below, "
            "which included, but was not limited to, the following:"
        )
        
        # Word wrap the statement
        from reportlab.lib.utils import simpleSplit
        lines = simpleSplit(statement, "Helvetica", 11, width - 120)
        for line in lines:
            c.drawString(60, text_y, line)
            text_y -= 15
        
        text_y -= 10
        
        # Training Points (bullets) - exact text from image
        c.setFont("Helvetica", 11)
        training_points = [
            "The definition of human trafficking and commercial exploitation of children.",
            "Guidance on how to identify individuals most at risk for human trafficking.",
            "The difference between labor and sex trafficking specific to the hotel sector.",
            "Guidance on the role of hospitality employees in reporting and responding to this",
            "issue; and",
            "The contact information of appropriate agencies."
        ]
        
        for point in training_points:
            c.drawString(75, text_y, "•")
            # Word wrap each point
            point_lines = simpleSplit(point, "Helvetica", 11, width - 150)
            for i, line in enumerate(point_lines):
                if i == 0:
                    c.drawString(90, text_y, line)
                else:
                    c.drawString(90, text_y - 15, line)
                    text_y -= 15
            if len(point_lines) == 1:
                text_y -= 20
            else:
                text_y -= 5
        
        text_y -= 10
        
        # Understanding statement
        c.drawString(60, text_y, "I understand the responsibilities I have with respect to the training taken.")
        text_y -= 50
        
        # Date of Training Taken
        c.setFont("Helvetica", 12)
        c.drawString(60, text_y, "Date of Training Taken:")
        c.line(220, text_y - 2, 400, text_y - 2)
        c.setFont("Helvetica-Bold", 12)
        if training_date:
            c.drawString(225, text_y, training_date)
        else:
            c.drawString(225, text_y, datetime.now().strftime('%m/%d/%Y'))
        text_y -= 40
        
        # Employee Name
        c.setFont("Helvetica", 12)
        c.drawString(60, text_y, "Employee Name:")
        c.line(175, text_y - 2, 500, text_y - 2)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(180, text_y, employee_data.get('name', ''))
        text_y -= 40
        
        # Employee Signature
        c.setFont("Helvetica", 12)
        c.drawString(60, text_y, "Employee Signature:")
        c.line(200, text_y - 2, 500, text_y - 2)
        
        # Add signature image if provided and not preview
        # ✅ FIX: Check for both 'signatureImage' and 'signature' keys (frontend sends 'signature')
        sig_data_raw = signature_data.get('signatureImage') or signature_data.get('signature')

        if not is_preview and sig_data_raw:
            try:
                sig_data = sig_data_raw
                if sig_data.startswith('data:image'):
                    sig_data = sig_data.split(',')[1]

                # Decode the base64 signature
                sig_bytes = base64.b64decode(sig_data)

                print(f"✅ Human Trafficking - Processing signature: {len(sig_bytes)} bytes")
                
                # Process signature image for proper display
                from PIL import Image as PILImage
                import io as pil_io
                from reportlab.lib.utils import ImageReader
                
                # Open the signature image
                sig_img = PILImage.open(pil_io.BytesIO(sig_bytes))
                
                # Convert to RGBA if not already
                if sig_img.mode != 'RGBA':
                    sig_img = sig_img.convert('RGBA')
                
                # Create a white background
                background = PILImage.new('RGBA', sig_img.size, (255, 255, 255, 255))
                
                # Process the image to ensure black signature on white background
                # Get the data
                data = sig_img.getdata()
                newData = []
                for item in data:
                    # If pixel is mostly white/transparent, make it fully transparent
                    if item[3] < 50 or (item[0] > 240 and item[1] > 240 and item[2] > 240):
                        newData.append((255, 255, 255, 0))  # Transparent
                    else:
                        # Make signature black for better visibility
                        newData.append((0, 0, 0, item[3]))  # Black with original alpha
                
                sig_img.putdata(newData)
                
                # Composite onto white background
                final_img = PILImage.alpha_composite(background, sig_img)
                
                # Convert to RGB for ReportLab
                final_img = final_img.convert('RGB')
                
                # Resize to fit signature area (maintain aspect ratio)
                max_width = 180
                max_height = 40
                final_img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
                
                # Save to bytes for ReportLab
                img_buffer = pil_io.BytesIO()
                final_img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                # Draw the signature using ImageReader
                c.saveState()
                img_reader = ImageReader(img_buffer)
                c.drawImage(img_reader, 210, text_y - 30, width=final_img.width, height=final_img.height, preserveAspectRatio=True, mask='auto')
                c.restoreState()
                
                print(f"Successfully drew signature image at position (210, {text_y - 30})")
                
            except Exception as e:
                print(f"Error drawing signature image: {e}")
                import traceback
                traceback.print_exc()
                
                # Fallback to text signature
                c.setFont("Helvetica-Oblique", 12)
                c.drawString(210, text_y, signature_data.get('name', 'Employee Signature'))
        elif is_preview:
            # Preview mode - show placeholder
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(210, text_y, "[Signature will appear here]")
            c.setFillColor(colors.black)
        
        text_y -= 40
        
        # Date Signed
        c.setFont("Helvetica", 12)
        c.drawString(60, text_y, "Date Signed:")
        c.line(145, text_y - 2, 325, text_y - 2)
        c.setFont("Helvetica", 12)
        if not is_preview:
            c.drawString(150, text_y, datetime.now().strftime('%m/%d/%Y'))
        else:
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(150, text_y, "[Date will appear here]")
            c.setFillColor(colors.black)
        
        # Save the PDF
        c.save()
        buffer.seek(0)
        pdf_bytes = buffer.read()
        
        # Return certificate data
        return {
            'pdf_bytes': pdf_bytes,
            'employee_name': employee_data.get('name'),
            'property_name': employee_data.get('property_name'),
            'training_date': training_date or datetime.now().strftime('%m/%d/%Y'),
            'is_preview': is_preview
        }
    
    def verify_certificate(self, certificate_id: str, issue_date: str) -> Dict[str, Any]:
        """Verify if a certificate is valid"""
        try:
            issue_dt = datetime.fromisoformat(issue_date)
            expiry_dt = issue_dt + timedelta(days=365)
            now = datetime.now()
            
            is_valid = now < expiry_dt
            days_until_expiry = (expiry_dt - now).days
            
            return {
                'valid': is_valid,
                'days_until_expiry': days_until_expiry if is_valid else 0,
                'expired': not is_valid,
                'expiry_date': expiry_dt.isoformat()
            }
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }

# Example usage
if __name__ == "__main__":
    generator = HumanTraffickingCertificateGenerator()
    
    # Test data
    employee_data = {
        'name': 'Mohammad Abdullah',
        'id': 'EMP-12345',
        'property_name': 'Motel 6',
        'position': 'Front Desk Agent'
    }
    
    signature_data = {
        'name': 'Mohammad Abdullah',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ipAddress': '192.168.1.1'
    }
    
    result = generator.generate_certificate(
        employee_data, 
        signature_data,
        training_date='08/12/2025'
    )
    
    # Save test certificate
    with open('test_trafficking_certificate.pdf', 'wb') as f:
        f.write(result['pdf_bytes'])
    
    print(f"Generated certificate: {result['certificate_id']}")
    print(f"Valid until: {result['expiry_date']}")