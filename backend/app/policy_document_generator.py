"""
Company Policies Document Generator
Generates a formatted PDF document for signed company policies
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

class PolicyDocumentGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom styles for the document"""
        self.styles.add(ParagraphStyle(
            name='PolicyTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='InitialLine',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#059669'),
            spaceBefore=10,
            spaceAfter=10
        ))
    
    def generate_policy_document(self, 
                               employee_data: Dict[str, Any],
                               policy_data: Dict[str, Any],
                               signature_data: Dict[str, Any]) -> bytes:
        """Generate a formatted PDF document for company policies"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=72)
        
        story = []
        
        # Title Page
        story.append(Paragraph("COMPANY POLICIES ACKNOWLEDGMENT", self.styles['PolicyTitle']))
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
        
        # General Policies Section
        story.append(Paragraph("GENERAL COMPANY POLICIES", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "The employee has read and acknowledged the following company policies:",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # List of policies
        policies = [
            "Employment at Will Policy",
            "Electronic Communication and Internet Use Policy", 
            "Telephone Use Policy",
            "No Smoking Policy",
            "Drug and Alcohol Policy",
            "Punctuality and Attendance Policy",
            "Standards of Conduct Policy",
            "Internal Complaint Policy",
            "Anti-Retaliation Policy",
            "Health and Safety Policy",
            "Benefits Overview",
            "Disciplinary Actions Policy",
            "Employment Verifications Policy"
        ]
        
        for i, policy in enumerate(policies, 1):
            story.append(Paragraph(f"{i}. {policy}", self.styles['PolicyText']))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Sexual Harassment Policy
        story.append(Paragraph("SEXUAL HARASSMENT POLICY", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "The Company prohibits sexual harassment in any form, including verbal, physical, "
            "and visual harassment. This policy applies to all employees, contractors, and visitors. "
            "Any violations should be reported immediately to HR or management.",
            self.styles['PolicyText']
        ))
        
        story.append(Paragraph(
            f"<b>Employee Initials:</b> {policy_data.get('sexualHarassmentInitials', 'N/A')}",
            self.styles['InitialLine']
        ))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Equal Employment Opportunity Policy
        story.append(Paragraph("EQUAL EMPLOYMENT OPPORTUNITY POLICY", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "The Company is committed to providing equal employment opportunities to all employees "
            "and applicants without regard to race, color, religion, sex, national origin, age, "
            "disability, genetic information, or any other legally protected status.",
            self.styles['PolicyText']
        ))
        
        story.append(Paragraph(
            f"<b>Employee Initials:</b> {policy_data.get('eeoInitials', 'N/A')}",
            self.styles['InitialLine']
        ))
        
        story.append(PageBreak())
        
        # Acknowledgment Section
        story.append(Paragraph("ACKNOWLEDGMENT OF RECEIPT", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "By signing below, I acknowledge that I have received, read, understood, and agree to "
            "comply with all the policies and procedures outlined in this document. I understand "
            "that violation of these policies may result in disciplinary action, up to and including "
            "termination of employment.",
            self.styles['PolicyText']
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
            "This document has been electronically signed and is legally binding. "
            "A copy of this acknowledgment will be maintained in your personnel file.",
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
    generator = PolicyDocumentGenerator()
    
    # Test data
    employee_data = {
        'name': 'John Doe',
        'id': 'EMP-12345',
        'property_name': 'Grand Hotel & Resort',
        'position': 'Front Desk Agent'
    }
    
    policy_data = {
        'sexualHarassmentInitials': 'JD',
        'eeoInitials': 'JD',
        'acknowledgmentChecked': True
    }
    
    signature_data = {
        'name': 'John Doe',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ipAddress': '192.168.1.1',
        'signatureId': 'SIG-ABC123'
    }
    
    pdf_bytes = generator.generate_policy_document(employee_data, policy_data, signature_data)
    
    # Save test PDF
    with open('test_policy_document.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print("Generated test_policy_document.pdf")