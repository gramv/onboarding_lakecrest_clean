"""
Weapons Policy Document Generator
Generates a formatted PDF document for weapons prohibition policy - federal requirement for certain industries
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

class WeaponsPolicyDocumentGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom styles for the document"""
        self.styles.add(ParagraphStyle(
            name='WeaponsTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#991b1b'),  # Dark red for weapons policy
            spaceAfter=12,
            alignment=TA_CENTER
        ))
        
        self.styles.add(ParagraphStyle(
            name='WeaponsHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#991b1b'),
            spaceAfter=10
        ))
        
        self.styles.add(ParagraphStyle(
            name='WeaponsText',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=8
        ))
        
        self.styles.add(ParagraphStyle(
            name='WeaponsBullet',
            parent=self.styles['Normal'],
            fontSize=11,
            alignment=TA_LEFT,
            spaceAfter=6,
            leftIndent=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyWarning',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#dc2626'),
            spaceBefore=10,
            spaceAfter=10,
            alignment=TA_CENTER
        ))
    
    def generate_weapons_policy_document(self, 
                                       employee_data: Dict[str, Any],
                                       signature_data: Dict[str, Any]) -> bytes:
        """Generate a formatted PDF document for weapons prohibition policy"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=72)
        
        story = []
        
        # Title Page
        story.append(Paragraph("WEAPONS PROHIBITION POLICY", self.styles['WeaponsTitle']))
        story.append(Paragraph("WORKPLACE SAFETY REQUIREMENT", self.styles['WeaponsTitle']))
        story.append(Spacer(1, 0.5*inch))
        
        # Employee Information - Pull from employee_data
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
        
        # Policy Statement
        story.append(Paragraph("POLICY STATEMENT", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "The Company is committed to providing a safe and secure workplace for all employees, guests, "
            "and visitors. To ensure this safety, the Company strictly prohibits the possession, use, or "
            "storage of weapons on Company property or while conducting Company business.",
            self.styles['WeaponsText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Definition of Weapons
        story.append(Paragraph("DEFINITION OF WEAPONS", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "For the purposes of this policy, 'weapons' include but are not limited to:",
            self.styles['WeaponsText']
        ))
        story.append(Spacer(1, 0.1*inch))
        
        weapons_list = [
            "Firearms of any kind, whether loaded or unloaded",
            "Knives with blades longer than 3 inches (except kitchen knives used in work areas)",
            "Explosives or explosive devices",
            "Tasers, stun guns, or other electroshock weapons",
            "Chemical weapons (mace, pepper spray, tear gas)",
            "Clubs, batons, or blackjacks",
            "Brass knuckles or similar weapons",
            "Martial arts weapons",
            "Ammunition",
            "Any object used in a threatening or harmful manner"
        ]
        
        for weapon in weapons_list:
            story.append(Paragraph(f"• {weapon}", self.styles['WeaponsBullet']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Prohibited Areas
        story.append(Paragraph("PROHIBITED AREAS", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "This weapons prohibition applies to all Company property and work areas including:",
            self.styles['WeaponsText']
        ))
        story.append(Spacer(1, 0.1*inch))
        
        areas_list = [
            "All buildings and facilities",
            "Company parking lots and garages",
            "Company vehicles",
            "Off-site locations during Company business",
            "Company-sponsored events",
            "Employee break rooms and locker areas"
        ]
        
        for area in areas_list:
            story.append(Paragraph(f"• {area}", self.styles['WeaponsBullet']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Exceptions
        story.append(Paragraph("EXCEPTIONS", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "Limited exceptions to this policy may include:",
            self.styles['WeaponsText']
        ))
        story.append(Paragraph("• Law enforcement officers required to carry weapons as part of their official duties", self.styles['WeaponsBullet']))
        story.append(Paragraph("• Security personnel specifically authorized by Company management", self.styles['WeaponsBullet']))
        story.append(Paragraph("• Tools or equipment required for specific job functions (with prior approval)", self.styles['WeaponsBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        # Enforcement and Consequences
        story.append(Paragraph("ENFORCEMENT AND CONSEQUENCES", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "Violation of this weapons policy will result in:",
            self.styles['WeaponsText']
        ))
        story.append(Paragraph("• Immediate removal from Company property", self.styles['WeaponsBullet']))
        story.append(Paragraph("• Disciplinary action up to and including termination", self.styles['WeaponsBullet']))
        story.append(Paragraph("• Potential criminal prosecution", self.styles['WeaponsBullet']))
        story.append(Paragraph("• Permanent ban from Company property", self.styles['WeaponsBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        story.append(PageBreak())
        
        # Reporting Procedures
        story.append(Paragraph("REPORTING PROCEDURES", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "If you observe or become aware of weapons on Company property:",
            self.styles['WeaponsText']
        ))
        story.append(Paragraph("1. <b>DO NOT</b> confront the individual", self.styles['WeaponsBullet']))
        story.append(Paragraph("2. <b>DO NOT</b> attempt to confiscate the weapon", self.styles['WeaponsBullet']))
        story.append(Paragraph("3. <b>DO</b> immediately notify security or management", self.styles['WeaponsBullet']))
        story.append(Paragraph("4. <b>DO</b> call 911 if there is immediate danger", self.styles['WeaponsBullet']))
        story.append(Paragraph("5. <b>DO</b> provide detailed information to authorities", self.styles['WeaponsBullet']))
        story.append(Spacer(1, 0.3*inch))
        
        # Search Policy
        story.append(Paragraph("SEARCH POLICY", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "The Company reserves the right to conduct searches of Company property, including but not "
            "limited to desks, lockers, vehicles on Company property, and personal belongings brought "
            "onto Company property. Refusal to cooperate with a search may result in disciplinary "
            "action including termination.",
            self.styles['WeaponsText']
        ))
        story.append(Spacer(1, 0.3*inch))
        
        # State Law Compliance
        story.append(Paragraph("STATE LAW COMPLIANCE", self.styles['WeaponsHeader']))
        story.append(Paragraph(
            "This policy is designed to comply with all applicable federal, state, and local laws. "
            "In states with specific concealed carry or other weapons laws, this policy will be "
            "applied in accordance with those requirements while maintaining workplace safety.",
            self.styles['WeaponsText']
        ))
        story.append(Spacer(1, 0.5*inch))
        
        # Warning Box
        story.append(Paragraph(
            "⚠️ WARNING: ZERO TOLERANCE POLICY ⚠️",
            self.styles['PolicyWarning']
        ))
        story.append(Paragraph(
            "Violations of this policy will result in immediate disciplinary action",
            self.styles['PolicyWarning']
        ))
        story.append(Spacer(1, 0.5*inch))
        
        # Acknowledgment Section
        story.append(Paragraph("EMPLOYEE ACKNOWLEDGMENT", self.styles['WeaponsHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        story.append(Paragraph(
            "By signing below, I acknowledge that I have received, read, understood, and agree to comply with "
            "the Company's Weapons Prohibition Policy. I understand that violation of this policy may result "
            "in disciplinary action up to and including termination of employment and possible criminal prosecution. "
            "I further understand that this policy may be modified at any time and I will be notified of any changes.",
            self.styles['WeaponsText']
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
            "This weapons prohibition policy has been electronically signed and is legally binding. "
            "A copy will be maintained in your personnel file. This policy is subject to change at "
            "the Company's discretion with appropriate notice to employees.",
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
    generator = WeaponsPolicyDocumentGenerator()
    
    # Test data - NEVER use hardcoded names in production
    employee_data = {
        'name': 'Test Employee',  # This should come from PersonalInfoStep data
        'id': 'EMP-12345',
        'property_name': 'Grand Hotel & Resort',
        'position': 'Front Desk Agent'
    }
    
    signature_data = {
        'name': 'Test Employee',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ipAddress': '192.168.1.1',
        'signatureId': 'SIG-WP123'
    }
    
    pdf_bytes = generator.generate_weapons_policy_document(employee_data, signature_data)
    
    # Save test PDF
    with open('test_weapons_policy_document.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print("Generated test_weapons_policy_document.pdf")