"""
Company Policies Document Generator - Complete Legal Version
Generates a legally compliant PDF document with full policy text
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
from datetime import datetime
from typing import Dict, Any
import base64

class CompletePolicyDocumentGenerator:
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
            spaceAfter=10,
            spaceBefore=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicySubHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=8,
            spaceBefore=12
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyText',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14
        ))
        
        self.styles.add(ParagraphStyle(
            name='InitialLine',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#059669'),
            spaceBefore=10,
            spaceAfter=10
        ))
    
    def get_full_policies_text(self):
        """Return the complete text of all company policies"""
        return {
            "Employment at Will": """
                Your employment with the Company is at will. This means that either you or the Company may terminate the employment relationship at any time, 
                with or without cause, and with or without notice. Nothing in this employee handbook or in any document or statement shall limit the right 
                to terminate employment at will. No manager, supervisor, or employee of the Company has any authority to enter into an agreement for employment 
                for any specified period of time or to make an agreement for employment other than at will. Only the CEO of the Company has the authority to 
                make any such agreement and then only in writing.
            """,
            
            "Electronic Communication and Internet Use": """
                The Company's electronic communication systems, including computers, e-mail, internet, and telephones, are provided for business use. 
                Personal use should be minimal and must not interfere with work responsibilities. All electronic communications are Company property 
                and may be monitored. Employees have no right to privacy when using Company systems. Inappropriate use includes but is not limited to: 
                accessing pornographic or offensive websites, sending harassing emails, downloading unauthorized software, or engaging in illegal activities. 
                Violations may result in disciplinary action up to and including termination.
            """,
            
            "Telephone Use": """
                Company telephones are for business use. Personal calls should be limited to emergencies and kept brief. Excessive personal use of 
                Company phones may result in disciplinary action. Long-distance personal calls are prohibited unless authorized by management. 
                Cell phone use should not interfere with work duties and must comply with all applicable laws while driving.
            """,
            
            "No Smoking": """
                Smoking is prohibited in all enclosed areas of Company property, including offices, hallways, waiting rooms, restrooms, lunch rooms, 
                elevators, conference rooms, and Company vehicles. Smoking is only permitted in designated outdoor areas. This policy applies to all 
                forms of smoking, including cigarettes, cigars, pipes, and e-cigarettes/vaping devices. Employees who violate this policy will be 
                subject to disciplinary action up to and including termination.
            """,
            
            "Drug and Alcohol": """
                The Company maintains a drug and alcohol-free workplace. The use, possession, sale, transfer, or being under the influence of illegal 
                drugs or alcohol during work hours, on Company property, or while conducting Company business is strictly prohibited. Employees taking 
                prescription medications that may impair their ability to safely perform their job must notify their supervisor. The Company reserves 
                the right to conduct drug and alcohol testing as permitted by law. Violations will result in immediate termination. Employees struggling 
                with substance abuse are encouraged to seek help through our Employee Assistance Program before it affects their employment.
            """,
            
            "Punctuality and Attendance": """
                Regular attendance and punctuality are essential to the efficient operation of our business. Employees are expected to report to work 
                on time and ready to work their scheduled hours. If you will be late or absent, you must notify your supervisor as soon as possible, 
                preferably before your scheduled start time. Excessive absenteeism or tardiness, whether excused or unexcused, may result in 
                disciplinary action up to and including termination. Three consecutive days of no-call, no-show will be considered job abandonment 
                and result in immediate termination.
            """,
            
            "Standards of Conduct": """
                Employees are expected to maintain high standards of conduct and professionalism at all times. This includes: treating all individuals 
                with respect and courtesy; maintaining confidentiality of Company and guest information; dressing appropriately according to Company 
                dress code; being honest and ethical in all business dealings; following all safety rules and regulations; reporting any illegal, 
                unethical, or unsafe activities to management immediately. Violations of Company standards may result in disciplinary action including 
                verbal warnings, written warnings, suspension, or termination depending on the severity of the violation.
            """,
            
            "Internal Complaint": """
                The Company is committed to providing a work environment free from discrimination, harassment, and retaliation. If you experience or 
                witness any conduct that violates Company policies, you should immediately report it to your supervisor, Human Resources, or any 
                member of management. All complaints will be promptly and thoroughly investigated. The Company prohibits retaliation against anyone 
                who makes a good faith complaint or participates in an investigation. Complaints may be made verbally or in writing, and anonymously 
                if desired. The Company will maintain confidentiality to the extent possible consistent with conducting a thorough investigation.
            """,
            
            "Anti-Retaliation": """
                The Company strictly prohibits retaliation against any employee who in good faith reports a violation of Company policy, participates 
                in an investigation, or exercises any right protected by law. Retaliation includes any adverse employment action such as termination, 
                demotion, suspension, harassment, or discrimination. Any employee who engages in retaliation will be subject to disciplinary action 
                up to and including termination. If you believe you have experienced retaliation, report it immediately to Human Resources or senior 
                management.
            """,
            
            "Health and Safety": """
                The Company is committed to providing a safe and healthy work environment. All employees must follow safety rules and regulations, 
                use required safety equipment, report unsafe conditions immediately, and report all accidents and injuries no matter how minor. 
                Employees are prohibited from engaging in horseplay, fighting, or any conduct that endangers themselves or others. Failure to follow 
                safety rules may result in disciplinary action. Workers' compensation insurance covers work-related injuries and illnesses. All 
                injuries must be reported immediately to ensure proper medical treatment and documentation.
            """,
            
            "Benefits Overview": """
                The Company offers a comprehensive benefits package to eligible employees, which may include health insurance, dental insurance, 
                vision insurance, life insurance, disability insurance, retirement plans, paid time off, and holiday pay. Specific benefits vary 
                based on employment status (full-time vs. part-time) and length of service. Detailed information about benefits eligibility, 
                enrollment, and coverage is available from Human Resources. The Company reserves the right to modify or terminate benefits at any 
                time with appropriate notice to employees.
            """,
            
            "Disciplinary Actions": """
                The Company uses progressive discipline to address performance and conduct issues. The progressive discipline process may include: 
                verbal warning, written warning, final written warning, suspension, and termination. However, the Company reserves the right to skip 
                steps or terminate employment immediately for serious violations. All disciplinary actions will be documented in the employee's 
                personnel file. Employees may be asked to sign disciplinary documents acknowledging receipt, though signature does not necessarily 
                indicate agreement. The disciplinary process is not a contract and does not alter the at-will nature of employment.
            """,
            
            "Employment Verifications": """
                All employment verification requests must be directed to Human Resources. The Company will only verify dates of employment, positions 
                held, and salary information with written authorization from the employee. References beyond basic verification require written consent. 
                Employees may not provide employment references on behalf of the Company without authorization from Human Resources. This policy ensures 
                consistency and protects both the Company and employees from potential liability.
            """
        }
    
    def generate_policy_document(self, 
                               employee_data: Dict[str, Any],
                               policy_data: Dict[str, Any],
                               signature_data: Dict[str, Any]) -> bytes:
        """Generate a complete, legally compliant PDF document for company policies"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                              rightMargin=72, leftMargin=72,
                              topMargin=72, bottomMargin=72)
        
        story = []
        
        # Title Page
        story.append(Paragraph("EMPLOYEE HANDBOOK & COMPANY POLICIES", self.styles['PolicyTitle']))
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("ACKNOWLEDGMENT OF RECEIPT", self.styles['PolicyTitle']))
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
        story.append(PageBreak())
        
        # Table of Contents
        story.append(Paragraph("TABLE OF CONTENTS", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        policies = self.get_full_policies_text()
        toc_data = []
        for i, (title, _) in enumerate(policies.items(), 1):
            toc_data.append([f"{i}.", title])
        
        # Add special policies at the end
        toc_data.append([f"{len(policies)+1}.", "Sexual Harassment Policy"])
        toc_data.append([f"{len(policies)+2}.", "Equal Employment Opportunity Policy"])
        
        toc_table = Table(toc_data, colWidths=[0.5*inch, 5*inch])
        toc_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('LEFTPADDING', (1, 0), (1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(toc_table)
        story.append(PageBreak())
        
        # Full text of each policy
        for i, (title, content) in enumerate(policies.items(), 1):
            # Keep policy title and content together
            policy_elements = []
            policy_elements.append(Paragraph(f"{i}. {title.upper()}", self.styles['PolicyHeader']))
            policy_elements.append(Spacer(1, 0.1*inch))
            policy_elements.append(Paragraph(content.strip(), self.styles['PolicyText']))
            
            story.append(KeepTogether(policy_elements))
            story.append(Spacer(1, 0.3*inch))
        
        story.append(PageBreak())
        
        # Sexual Harassment Policy - Requires Initials
        story.append(Paragraph(f"{len(policies)+1}. SEXUAL HARASSMENT POLICY", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.1*inch))
        
        sexual_harassment_text = """
        The Company is committed to providing a work environment free from sexual harassment. Sexual harassment is a form of unlawful sex 
        discrimination and violates Title VII of the Civil Rights Act of 1964.
        
        Sexual harassment includes unwelcome sexual advances, requests for sexual favors, and other verbal, visual, or physical conduct of a 
        sexual nature when: (1) submission to such conduct is made either explicitly or implicitly a term or condition of employment; 
        (2) submission to or rejection of such conduct is used as the basis for employment decisions; or (3) such conduct has the purpose or 
        effect of unreasonably interfering with an individual's work performance or creating an intimidating, hostile, or offensive work environment.
        
        Examples of sexual harassment include but are not limited to: unwanted sexual advances or propositions; offering employment benefits in 
        exchange for sexual favors; making or threatening reprisals after a negative response to sexual advances; visual conduct such as leering, 
        making sexual gestures, displaying sexually suggestive objects or pictures; verbal conduct such as making or using derogatory comments, 
        epithets, slurs, and jokes; verbal sexual advances or propositions; verbal abuse of a sexual nature, graphic verbal commentaries about an 
        individual's body, sexually degrading words used to describe an individual; physical conduct such as touching, assault, impeding or 
        blocking movements.
        
        Any employee who believes they have been subjected to sexual harassment should immediately report the matter to their supervisor, Human 
        Resources, or any member of management. All complaints will be promptly and thoroughly investigated. The Company will not tolerate 
        retaliation against any employee who makes a complaint or participates in an investigation. Any employee found to have engaged in sexual 
        harassment will be subject to disciplinary action up to and including termination.
        """
        
        story.append(Paragraph(sexual_harassment_text.strip(), self.styles['PolicyText']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(
            f"<b>I have read and understand the Sexual Harassment Policy. Employee Initials:</b> {policy_data.get('sexualHarassmentInitials', '____')}",
            self.styles['InitialLine']
        ))
        
        story.append(Spacer(1, 0.5*inch))
        
        # Equal Employment Opportunity Policy - Requires Initials
        story.append(Paragraph(f"{len(policies)+2}. EQUAL EMPLOYMENT OPPORTUNITY POLICY", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.1*inch))
        
        eeo_text = """
        The Company is an equal opportunity employer and is committed to providing equal employment opportunities to all employees and applicants 
        without regard to race, color, religion, sex (including pregnancy, gender identity, and sexual orientation), national origin, age (40 or 
        older), disability, genetic information, or any other characteristic protected by federal, state, or local laws.
        
        This policy applies to all terms and conditions of employment, including but not limited to: hiring, placement, promotion, termination, 
        layoff, recall, transfer, leaves of absence, compensation, and training. The Company expressly prohibits any form of unlawful employment 
        discrimination based on any protected characteristic.
        
        The Company will make reasonable accommodations for qualified individuals with known disabilities unless doing so would result in an undue 
        hardship. The Company will also make reasonable accommodations for employees whose work requirements interfere with a religious belief, 
        unless doing so would result in undue hardship.
        
        Any employee who believes they have been subjected to discrimination should immediately report the matter to their supervisor, Human 
        Resources, or any member of management. All complaints will be promptly and thoroughly investigated. The Company will not tolerate 
        retaliation against any employee who makes a complaint or participates in an investigation. Any employee found to have engaged in 
        discrimination will be subject to disciplinary action up to and including termination.
        
        The Company is committed to maintaining a diverse workforce and creating an inclusive environment where all employees can succeed. We 
        believe that diversity strengthens our organization and better enables us to serve our diverse customer base.
        """
        
        story.append(Paragraph(eeo_text.strip(), self.styles['PolicyText']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(
            f"<b>I have read and understand the Equal Employment Opportunity Policy. Employee Initials:</b> {policy_data.get('eeoInitials', '____')}",
            self.styles['InitialLine']
        ))
        
        story.append(PageBreak())
        
        # Final Acknowledgment Section
        story.append(Paragraph("ACKNOWLEDGMENT AND AGREEMENT", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        acknowledgment_text = """
        I acknowledge that I have received and read a copy of the Company's Employee Handbook and Company Policies. I understand the policies 
        and procedures described within and agree to comply with them. I understand that the Company has the right to change, modify, or abolish 
        any or all of the policies, benefits, rules, and regulations contained or described in the handbook at any time, with or without notice.
        
        I acknowledge that my employment with the Company is at-will, meaning that either the Company or I may terminate the employment 
        relationship at any time, with or without cause, and with or without notice. I understand that no representative of the Company, other 
        than the CEO, has the authority to enter into any agreement contrary to the at-will employment relationship, and any such agreement must 
        be in writing and signed by the CEO.
        
        I understand that this handbook supersedes all previous employment policies, written and oral, expressed and implied. I also understand 
        that this handbook is not a contract of employment and does not guarantee employment for any specific duration.
        
        I acknowledge that it is my responsibility to read, understand, and comply with all policies contained in this handbook. If I have 
        questions about any policy or procedure, I will seek clarification from my supervisor or Human Resources.
        
        I understand that violations of Company policies may result in disciplinary action up to and including termination of employment.
        """
        
        story.append(Paragraph(acknowledgment_text.strip(), self.styles['PolicyText']))
        story.append(Spacer(1, 0.5*inch))
        
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
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(
            "This document has been electronically signed and is legally binding. A copy of this acknowledgment will be maintained in your personnel file. "
            "The Company reserves the right to update these policies at any time. Employees will be notified of significant changes.",
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
    generator = CompletePolicyDocumentGenerator()
    
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
    with open('complete_policy_document.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print("Generated complete_policy_document.pdf")
    print(f"File size: {len(pdf_bytes)} bytes (should be much larger)")