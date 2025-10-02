"""
Weapons Policy Certificate Generator
Renders an acknowledgment-style certificate with signature support (matches Human Trafficking flow)
"""
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import simpleSplit, ImageReader
from datetime import datetime
from io import BytesIO
from typing import Dict, Any, Optional
import base64

class WeaponsPolicyCertificateGenerator:
    def __init__(self) -> None:
        self.styles = getSampleStyleSheet()
        self.styles.add(ParagraphStyle(name='CertTitle', parent=self.styles['Heading1'], fontSize=18, alignment=TA_CENTER, textColor=colors.HexColor('#1f2937')))
        self.styles.add(ParagraphStyle(name='CertText', parent=self.styles['Normal'], fontSize=11, leading=16))

    def _draw_wrapped(self, c: canvas.Canvas, text: str, x: float, y: float, width: float, font="Helvetica", size=11, line_height=15):
        c.setFont(font, size)
        for line in simpleSplit(text, font, size, width):
            c.drawString(x, y, line)
            y -= line_height
        return y

    def generate_certificate(self, employee_data: Dict[str, Any], signature_data: Dict[str, Any], signed_date: Optional[str] = None, is_preview: bool = False) -> Dict[str, Any]:
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        width, height = letter

        # Title
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(width/2, height - 80, "WEAPONS PROHIBITION POLICY ACKNOWLEDGMENT")

        # Property
        c.setFont("Helvetica", 12)
        c.drawString(60, height - 120, "Hotel/Property:")
        c.line(160, height - 122, 540, height - 122)
        c.drawString(165, height - 120, employee_data.get('property_name', '') or employee_data.get('property', '') or '')

        # Statement
        y = height - 160
        policy_text = (
            "The Company strictly forbids any employee to possess, concealed or otherwise, any weapon on Company premises. "
            "This includes, but is not limited to, firearms and knives, regardless of licenses or approvals. Brandishing firearms "
            "in the parking lot (other than for lawful self-defense) and threats of any type are prohibited. Violations may lead "
            "to disciplinary action, up to and including termination of employment."
        )
        y = self._draw_wrapped(c, policy_text, 60, y, width - 120)
        y -= 10
        y = self._draw_wrapped(c, "I acknowledge that I have read, understand, and agree to abide by the Weapons Prohibition Policy.", 60, y, width - 120)
        y -= 30

        # Employee name
        full_name = employee_data.get('name') or f"{employee_data.get('firstName','')} {employee_data.get('lastName','')}".strip()
        c.setFont("Helvetica", 12)
        c.drawString(60, y, "Employee Name:")
        c.line(150, y - 2, 500, y - 2)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(155, y, full_name or '')
        y -= 40

        # Signature line
        c.setFont("Helvetica", 12)
        c.drawString(60, y, "Employee Signature:")
        c.line(200, y - 2, 500, y - 2)

        # Signature image (if not preview)
        if not is_preview and signature_data.get('signatureImage'):
            try:
                sig_data = signature_data['signatureImage']
                if sig_data.startswith('data:image'):
                    sig_data = sig_data.split(',')[1]
                sig_bytes = base64.b64decode(sig_data)

                # Place within a box near the signature line
                max_w, max_h = 180, 40
                x0, y0 = 210, y - 30
                img = ImageReader(BytesIO(sig_bytes))
                iw, ih = img.getSize()
                scale = min(max_w / iw, max_h / ih)
                dw, dh = iw * scale, ih * scale
                c.saveState()
                c.drawImage(img, x0, y0, width=dw, height=dh, preserveAspectRatio=True, mask='auto')
                c.restoreState()
            except Exception:
                # Fallback to just leave the line
                pass
        elif is_preview:
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(210, y - 15, "[Signature will appear here]")
            c.setFillColor(colors.black)

        # Date signed
        y -= 40
        c.setFont("Helvetica", 12)
        c.drawString(60, y, "Date Signed:")
        c.line(145, y - 2, 325, y - 2)
        c.setFont("Helvetica", 12)
        if not is_preview:
            c.drawString(150, y, (signed_date or datetime.now().strftime('%m/%d/%Y')))
        else:
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(150, y, "[Date will appear here]")
            c.setFillColor(colors.black)

        c.save()
        buf.seek(0)
        pdf_bytes = buf.read()
        return {
            'pdf_bytes': pdf_bytes,
            'employee_name': full_name,
            'property_name': employee_data.get('property_name'),
            'is_preview': is_preview
        }


