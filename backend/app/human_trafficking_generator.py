"""
Human Trafficking Awareness Document Generator
Generates a formatted PDF document for human trafficking awareness training - federal requirement for hospitality industry
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
from typing import Dict, Any
import base64
import io

class HumanTraffickingDocumentGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom styles for the document"""
        self.styles.add(ParagraphStyle(
            name='TrafficTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#dc2626'),
            spaceAfter=12,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='TrafficHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#dc2626'),
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='TrafficText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='TrafficBullet',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceAfter=6,
            leftIndent=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='HotlineStyle',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.HexColor('#dc2626'),
            spaceBefore=10,
            spaceAfter=10,
            alignment=TA_CENTER
        ))
    
    def generate_human_trafficking_document(self, 
                                          employee_data: Dict[str, Any],
                                          signature_data: Dict[str, Any]) -> bytes:
        """Generate a formatted PDF document for human trafficking awareness"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=72)
        
        story = []
        
        # Title Page
        story.append(Paragraph("HUMAN TRAFFICKING AWARENESS", self.styles['TrafficTitle']))
        story.append(Paragraph("FEDERAL REQUIREMENT FOR HOSPITALITY INDUSTRY", self.styles['TrafficTitle']))
        story.append(Spacer(1, 0.5*inch))
        
        # Employee Information
        employee_info = [
            ["Employee Name:", employee_data.get('name', 'N/A')],
            ["Employee ID:", employee_data.get('id', 'N/A')],
            ["Property:", employee_data.get('property_name', 'N/A')],
            ["Position:", employee_data.get('position', 'N/A')],
            ["Date:", datetime.now().strftime('%B %d, %Y')]
        ]
        
        info_table = Table(employee_info, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, -1), 11),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.5*inch))
        
        # Introduction
        story.append(Paragraph("WHAT IS HUMAN TRAFFICKING?", self.styles['TrafficHeader']))
        story.append(Paragraph(
            "Human trafficking is a form of modern-day slavery that involves the use of force, fraud, "
            "or coercion to obtain labor or commercial sex acts. It affects millions of people worldwide, "
            "including in the United States, and can happen in any community.",
            self.styles['TrafficText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Types of Trafficking
        story.append(Paragraph("TYPES OF HUMAN TRAFFICKING", self.styles['TrafficHeader']))
        story.append(Paragraph("• <b>Labor Trafficking:</b> The recruitment, harboring, transportation, provision, or obtaining of a person for labor or services through force, fraud, or coercion.", self.styles['TrafficBullet']))
        story.append(Paragraph("• <b>Sex Trafficking:</b> The recruitment, harboring, transportation, provision, obtaining, or advertising of a person for commercial sex acts through force, fraud, or coercion.", self.styles['TrafficBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        # Signs in Hospitality Industry
        story.append(Paragraph("WARNING SIGNS IN THE HOSPITALITY INDUSTRY", self.styles['TrafficHeader']))
        story.append(Paragraph(
            "As a hospitality worker, you may encounter situations that could indicate human trafficking. "
            "Be aware of these warning signs:",
            self.styles['TrafficText']
        ))
        story.append(Spacer(1, 0.1*inch))
        
        # Warning signs
        warning_signs = [
            "Guests who appear malnourished, injured, or show signs of physical abuse",
            "Individuals who seem fearful, anxious, or not allowed to speak for themselves",
            "People who lack control of their identification documents",
            "Guests who appear to be under the control or influence of others",
            "Individuals who seem disoriented or unfamiliar with their location",
            "Multiple people sharing a room with very few personal belongings",
            "Guests who avoid eye contact or interaction with staff",
            "Evidence of excessive security measures (cameras, locks, bars on windows)",
            "Individuals who appear to be living or staying at the property long-term",
            "Signs of people being transported in groups at unusual hours"
        ]
        
        for sign in warning_signs:
            story.append(Paragraph(f"• {sign}", self.styles['TrafficBullet']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # National Hotline
        story.append(Paragraph("NATIONAL HUMAN TRAFFICKING HOTLINE", self.styles['TrafficHeader']))
        story.append(Paragraph(
            "<b>1-888-373-7888</b>",
            self.styles['HotlineStyle']
        ))
        story.append(Paragraph(
            "Available 24/7 • Confidential • Multilingual • Free",
            ParagraphStyle(
                name='HotlineDetail',
                parent=self.styles['Normal'],
                fontSize=12,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#059669')
            )
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # Reporting Procedures
        story.append(Paragraph("REPORTING PROCEDURES", self.styles['TrafficHeader']))
        story.append(Paragraph(
            "If you suspect human trafficking at your workplace:",
            self.styles['TrafficText']
        ))
        story.append(Paragraph("1. <b>DO NOT</b> confront suspected traffickers or attempt to rescue victims", self.styles['TrafficBullet']))
        story.append(Paragraph("2. <b>DO NOT</b> take photos or videos", self.styles['TrafficBullet']))
        story.append(Paragraph("3. <b>DO</b> call the National Human Trafficking Hotline: 1-888-373-7888", self.styles['TrafficBullet']))
        story.append(Paragraph("4. <b>DO</b> report to local law enforcement if there is immediate danger: 911", self.styles['TrafficBullet']))
        story.append(Paragraph("5. <b>DO</b> notify your supervisor or HR department", self.styles['TrafficBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        story.append(PageBreak())
        
        # Legal Requirements
        story.append(Paragraph("LEGAL REQUIREMENTS FOR HOSPITALITY WORKERS", self.styles['TrafficHeader']))
        story.append(Paragraph(
            "Federal law requires hospitality businesses to train employees to recognize and report "
            "suspected human trafficking. This training is mandatory for all employees who may come "
            "into contact with guests or the public.",
            self.styles['TrafficText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Employer Responsibilities
        story.append(Paragraph("EMPLOYER RESPONSIBILITIES", self.styles['TrafficHeader']))
        story.append(Paragraph("• Provide annual human trafficking awareness training to all employees", self.styles['TrafficBullet']))
        story.append(Paragraph("• Post information about human trafficking resources in employee areas", self.styles['TrafficBullet']))
        story.append(Paragraph("• Maintain procedures for reporting suspected trafficking", self.styles['TrafficBullet']))
        story.append(Paragraph("• Cooperate with law enforcement investigations", self.styles['TrafficBullet']))
        story.append(Paragraph("• Protect employees from retaliation for good faith reporting", self.styles['TrafficBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        # Resources
        story.append(Paragraph("ADDITIONAL RESOURCES", self.styles['TrafficHeader']))
        story.append(Paragraph("• <b>Polaris Project:</b> polarisproject.org", self.styles['TrafficBullet']))
        story.append(Paragraph("• <b>Department of Homeland Security:</b> dhs.gov/human-trafficking", self.styles['TrafficBullet']))
        story.append(Paragraph("• <b>Department of Justice:</b> justice.gov/humantrafficking", self.styles['TrafficBullet']))
        story.append(Paragraph("• <b>National Human Trafficking Training:</b> nationalhttc.org", self.styles['TrafficBullet']))
        story.append(Spacer(1, 0.5*inch))
        
        # Acknowledgment Section
        story.append(Paragraph("EMPLOYEE ACKNOWLEDGMENT", self.styles['TrafficHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "By signing below, I acknowledge that I have received, read, understood, and will comply with "
            "the human trafficking awareness training requirements. I understand my responsibility to report "
            "suspected human trafficking activities and agree to follow the reporting procedures outlined "
            "in this document.",
            self.styles['TrafficText']
        ))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Add drawn signature if available
        if signature_data.get('signatureImage'):
            try:
                # Extract base64 data from data URL if present
                sig_data = signature_data.get('signatureImage', '')
                if sig_data.startswith('data:image'):
                    sig_data = sig_data.split(',')[1]
                
                # Decode base64 to bytes
                sig_bytes = base64.b64decode(sig_data)
                sig_img = Image(io.BytesIO(sig_bytes), width=3*inch, height=1*inch, kind='proportional')
                
                # Center the signature image
                sig_img_table = Table([[sig_img]], colWidths=[6.5*inch])
                sig_img_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(sig_img_table)
                story.append(Spacer(1, 0.3*inch))
            except Exception as e:
                # If signature image fails, just continue without it
                pass
        
        # Signature Section
        signature_info = [
            ["Electronic Signature:", signature_data.get('name', 'N/A')],
            ["Date Signed:", signature_data.get('timestamp', 'N/A')],
            ["IP Address:", signature_data.get('ipAddress', 'N/A')],
            ["Signature ID:", signature_data.get('signatureId', 'N/A')]
        ]
        
        sig_table = Table(signature_info, colWidths=[2*inch, 4*inch])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, -1), 11),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LINEBELOW', (1, 0), (1, 0), 1, colors.black),
        ]))
        story.append(sig_table)
        
        # Legal Notice
        story.append(Spacer(1, 1*inch))
        story.append(Paragraph(
            "This human trafficking awareness training document has been electronically signed and is legally binding. "
            "A copy will be maintained in your personnel file and may be provided to law enforcement or regulatory agencies as required by law.",
            ParagraphStyle(
                name='LegalNotice',
                parent=self.styles['Normal'],
                fontSize=9,
                textColor=colors.HexColor('#6b7280'),
                alignment=TA_CENTER
            )
        ))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.read()

# Example usage
if __name__ == "__main__":
    generator = HumanTraffickingDocumentGenerator()
    
    # Test data
    employee_data = {
        'name': 'John Doe',
        'id': 'EMP-12345',
        'property_name': 'Grand Hotel & Resort',
        'position': 'Front Desk Agent'
    }
    
    signature_data = {
        'name': 'John Doe',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ipAddress': '192.168.1.1',
        'signatureId': 'SIG-HT123'
    }
    
    pdf_bytes = generator.generate_human_trafficking_document(employee_data, signature_data)
    
    # Save test PDF
    with open('test_human_trafficking_document.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print("Generated test_human_trafficking_document.pdf")