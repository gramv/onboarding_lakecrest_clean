"""
Company Policies Document Generator - Final Complete Version
Generates a legally compliant PDF with ALL policies from the actual onboarding system
Including proper signature display and metadata
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Line
from io import BytesIO
from datetime import datetime
from typing import Dict, Any
import base64

class FinalPolicyDocumentGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom styles for the document"""
        self.styles.add(ParagraphStyle(
            name='PolicyTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            alignment=TA_CENTER,
            spaceBefore=0
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=10,
            spaceBefore=20,
            keepWithNext=True
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicySubHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#374151'),
            spaceAfter=8,
            spaceBefore=12,
            keepWithNext=True
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
            name='PolicyBullet',
            parent=self.styles['Normal'],
            fontSize=10,
            leftIndent=20,
            bulletIndent=10,
            spaceAfter=6
        ))
        
        self.styles.add(ParagraphStyle(
            name='InitialLine',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#059669'),
            spaceBefore=15,
            spaceAfter=15,
            borderWidth=1,
            borderColor=colors.HexColor('#059669'),
            borderPadding=5
        ))
        
        self.styles.add(ParagraphStyle(
            name='SignatureStyle',
            parent=self.styles['Normal'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            alignment=TA_CENTER,
            spaceAfter=10
        ))
    
    def generate_policy_document(self, 
                               employee_data: Dict[str, Any],
                               policy_data: Dict[str, Any],
                               signature_data: Dict[str, Any]) -> bytes:
        """Generate a complete, legally compliant PDF document for company policies"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=72, 
            leftMargin=72,
            topMargin=72, 
            bottomMargin=72,
            title="Company Policies and Employee Handbook",
            author=employee_data.get('property_name', 'Hotel Company'),
            subject="Employee Policy Acknowledgment"
        )
        
        story = []
        
        # Cover Page
        story.append(Spacer(1, 1.5*inch))
        story.append(Paragraph("EMPLOYEE HANDBOOK", self.styles['PolicyTitle']))
        story.append(Paragraph("&", ParagraphStyle(name='amp', parent=self.styles['PolicyTitle'], fontSize=14)))
        story.append(Paragraph("COMPANY POLICIES ACKNOWLEDGMENT", self.styles['PolicyTitle']))
        story.append(Spacer(1, 0.8*inch))
        
        # Property Logo/Name
        story.append(Paragraph(employee_data.get('property_name', 'Hotel Property'), 
                             ParagraphStyle(name='propname', parent=self.styles['PolicyTitle'], fontSize=24)))
        story.append(Spacer(1, 1.5*inch))
        
        # Employee Information Box
        emp_data = [
            ["Employee Name:", employee_data.get('name', 'N/A')],
            ["Employee ID:", employee_data.get('id', 'N/A')],
            ["Position:", employee_data.get('position', 'N/A')],
            ["Department:", employee_data.get('department', 'N/A')],
            ["Start Date:", employee_data.get('start_date', datetime.now().strftime('%B %d, %Y'))],
            ["Document Date:", datetime.now().strftime('%B %d, %Y')]
        ]
        
        emp_table = Table(emp_data, colWidths=[2.5*inch, 3.5*inch])
        emp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db'))
        ]))
        story.append(emp_table)
        story.append(PageBreak())
        
        # Table of Contents
        story.append(Paragraph("TABLE OF CONTENTS", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.3*inch))
        
        toc_items = [
            "1. At-Will Employment",
            "2. Workplace Violence Prevention Policy",
            "3. Surveillance Policy", 
            "4. Pay, Pay Period and Pay Day",
            "5. Electronic Communication and Internet Use",
            "6. Telephone Use Policy",
            "7. No Smoking Policy",
            "8. Drug and Alcohol Policy",
            "9. Punctuality and Attendance",
            "10. Standards of Conduct",
            "11. Internal Complaint Procedures",
            "12. Anti-Retaliation Policy",
            "13. Health and Safety",
            "14. Sexual and Other Unlawful Harassment Policy*",
            "15. Equal Employment Opportunity Policy*",
            "",
            "* Requires Employee Initials"
        ]
        
        for item in toc_items:
            if item:
                style = self.styles['PolicyText'] if not item.startswith('*') else ParagraphStyle(
                    name='tocnote', parent=self.styles['PolicyText'], 
                    fontSize=9, textColor=colors.HexColor('#6b7280'), italic=True
                )
                story.append(Paragraph(item, style))
        
        story.append(PageBreak())
        
        # Section 1: General Company Policies
        story.append(Paragraph("SECTION I: GENERAL COMPANY POLICIES", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 1: At-Will Employment
        story.append(Paragraph("1. AT-WILL EMPLOYMENT", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Your employment relationship with the Hotel is 'At-Will' which means that it is a voluntary one which may be terminated 
            by either the Hotel or yourself, with or without cause, and with or without notice, at any time. Nothing in these policies 
            shall be interpreted to be in conflict with or to eliminate or modify in any way the 'employment-at-will' status of Hotel 
            associates. No supervisor, manager, or employee of the Hotel has any authority to enter into an agreement for employment 
            for any specified period of time or to make an agreement for employment other than at-will. Only the CEO/President of the 
            Hotel has the authority to make any such agreement and then only in writing signed by both parties.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 2: Workplace Violence Prevention
        story.append(Paragraph("2. WORKPLACE VIOLENCE PREVENTION POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel strives to maintain a productive work environment free of violence and the threat of violence. We are committed 
            to the safety of our associates, vendors, customers and visitors.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """The Hotel does not tolerate any type of workplace violence committed by or against associates. Any threats or acts of 
            violence against an associate, vendor, customer, visitor or property will not be tolerated. Any associate who threatens 
            violence or acts in a violent manner while on Hotel premises, or during working hours will be subject to disciplinary 
            action, up to and including termination.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph("Examples of prohibited conduct include but are not limited to:", self.styles['PolicyText']))
        
        violence_examples = [
            "Physical assault, threat to assault or stalking an associate or customer",
            "Possessing or threatening with a weapon on hotel premises", 
            "Intentionally damaging property of the Hotel or personal property of another",
            "Aggressive or hostile behavior that creates a reasonable fear of injury to another person",
            "Harassing or intimidating statements, phone calls, voice mails, or e-mail messages",
            "Racial or cultural epithets or other derogatory remarks associated with hate crime threats",
            "Conduct that threatens, intimidates or coerces another associate, customer, vendor or business associate",
            "Use of hotel resources to threaten, stalk or harass anyone at the workplace or outside of the workplace"
        ]
        
        for example in violence_examples:
            story.append(Paragraph(f"• {example}", self.styles['PolicyBullet']))
        
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 3: Surveillance
        story.append(Paragraph("3. SURVEILLANCE", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """For safety and security purposes, visual and audio recording devices are installed throughout the property and the 
            footage is recorded. The Hotel reserves the right to use this footage for any lawful purpose including but not limited 
            to: investigating accidents, investigating policy violations, security purposes, training, and legal proceedings. 
            Employees should have no expectation of privacy in public areas of the hotel. Surveillance equipment is not placed in 
            areas where employees have a reasonable expectation of privacy such as restrooms or changing areas.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 4: Pay Information
        story.append(Paragraph("4. PAY, PAY PERIOD AND PAY DAY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Associates are paid biweekly (every other week) for their hours worked during the preceding pay period.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph("Pay Period Information:", self.styles['PolicyText']))
        story.append(Paragraph("• A pay period consists of two consecutive pay weeks, at 7 days per week", self.styles['PolicyBullet']))
        story.append(Paragraph("• Pay periods run from Sunday through Saturday", self.styles['PolicyBullet']))
        story.append(Paragraph("• Payday is typically on Friday following the end of the pay period", self.styles['PolicyBullet']))
        story.append(Paragraph(
            "• For employees who have elected direct deposit as payment method, a pay stub will not be issued at the Hotel. "
            "Contact your General Manager for electronic access to your pay stub through the payroll portal",
            self.styles['PolicyBullet']
        ))
        story.append(Paragraph(
            "• Paper checks must be picked up in person with valid ID. Checks not picked up within 30 days may be mailed to address on file",
            self.styles['PolicyBullet']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Continue with additional policies...
        # Policy 5: Electronic Communication
        story.append(Paragraph("5. ELECTRONIC COMMUNICATION AND INTERNET USE", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel's electronic communication systems, including computers, e-mail, internet, and telephones, are provided 
            primarily for business use. Limited personal use is permitted provided it does not interfere with work responsibilities, 
            violate any company policies, or incur additional costs to the Hotel.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """All electronic communications using Hotel systems are property of the Hotel and may be monitored, accessed, and 
            reviewed at any time without notice. Employees should have no expectation of privacy when using Hotel electronic 
            systems. This includes all emails, internet browsing history, files stored on Hotel computers, and telephone 
            conversations on Hotel phones.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph("Prohibited uses include but are not limited to:", self.styles['PolicyText']))
        electronic_prohibited = [
            "Accessing pornographic, sexually explicit, or offensive websites",
            "Sending harassing, discriminatory, or threatening emails or messages",
            "Downloading or distributing copyrighted materials without authorization",
            "Installing unauthorized software or applications",
            "Using Hotel systems for personal business ventures",
            "Sharing confidential Hotel or guest information without authorization",
            "Excessive personal use that interferes with work duties"
        ]
        for item in electronic_prohibited:
            story.append(Paragraph(f"• {item}", self.styles['PolicyBullet']))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 6: Telephone Use
        story.append(Paragraph("6. TELEPHONE USE POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Hotel telephones are primarily for business use. Personal calls should be limited to emergencies and kept brief. 
            Excessive personal use of Hotel phones may result in disciplinary action. Long-distance personal calls are prohibited 
            unless authorized by management. Employees may be required to reimburse the Hotel for unauthorized long-distance calls.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 7: No Smoking
        story.append(Paragraph("7. NO SMOKING POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """In compliance with state and local laws and to promote a healthy work environment, smoking is prohibited in all 
            enclosed areas of Hotel property, including but not limited to: offices, hallways, waiting rooms, restrooms, lunch rooms, 
            elevators, conference rooms, employee break rooms, and Hotel vehicles. This policy applies to all forms of smoking 
            including cigarettes, cigars, pipes, e-cigarettes, vaping devices, and any other smoking devices.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Smoking is only permitted in designated outdoor smoking areas. Employees must dispose of cigarette butts and other 
            smoking materials in designated receptacles. Violations of this policy will result in disciplinary action up to and 
            including termination.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 8: Drug and Alcohol
        story.append(Paragraph("8. DRUG AND ALCOHOL POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel is committed to maintaining a drug and alcohol-free workplace. The use, possession, sale, transfer, 
            purchase, or being under the influence of illegal drugs or alcohol during work hours, on Hotel property, or while 
            conducting Hotel business is strictly prohibited and will result in immediate termination.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Employees taking prescription medications that may impair their ability to safely perform their job duties must 
            notify their supervisor. The Hotel reserves the right to conduct drug and alcohol testing as permitted by law, 
            including but not limited to: pre-employment testing, reasonable suspicion testing, post-accident testing, and 
            random testing where permitted.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 9: Punctuality and Attendance
        story.append(Paragraph("9. PUNCTUALITY AND ATTENDANCE", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Regular attendance and punctuality are essential job functions for all positions. Employees are expected to report 
            to work on time and ready to work their scheduled hours. If you will be late or absent, you must notify your supervisor 
            as soon as possible, preferably at least 2 hours before your scheduled start time.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Excessive absenteeism or tardiness, whether excused or unexcused, may result in disciplinary action up to and 
            including termination. Three consecutive days of no-call, no-show will be considered job abandonment and result in 
            immediate termination of employment.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 10: Standards of Conduct
        story.append(Paragraph("10. STANDARDS OF CONDUCT", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Employees are expected to maintain high standards of conduct and professionalism at all times. This includes treating 
            all individuals with respect and courtesy, maintaining confidentiality of Hotel and guest information, dressing 
            appropriately according to Hotel dress code, being honest and ethical in all business dealings, following all safety 
            rules and regulations, and reporting any illegal, unethical, or unsafe activities to management immediately.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 11: Internal Complaint
        story.append(Paragraph("11. INTERNAL COMPLAINT PROCEDURES", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel is committed to providing a work environment free from discrimination, harassment, and retaliation. If you 
            experience or witness any conduct that violates Hotel policies, you should immediately report it to your supervisor, 
            Human Resources, or any member of management. All complaints will be promptly and thoroughly investigated.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Complaints may be made verbally or in writing, and anonymously if desired. The Hotel will maintain confidentiality 
            to the extent possible consistent with conducting a thorough investigation. The Hotel strictly prohibits retaliation 
            against anyone who makes a good faith complaint or participates in an investigation.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 12: Anti-Retaliation
        story.append(Paragraph("12. ANTI-RETALIATION POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel strictly prohibits retaliation against any employee who in good faith reports a violation of Hotel policy, 
            participates in an investigation, or exercises any right protected by law. Retaliation includes any adverse employment 
            action such as termination, demotion, suspension, harassment, or discrimination. Any employee who engages in retaliation 
            will be subject to disciplinary action up to and including termination.""",
            self.styles['PolicyText']
        ))
        story.append(Spacer(1, 0.2*inch))
        
        # Policy 13: Health and Safety
        story.append(Paragraph("13. HEALTH AND SAFETY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """The Hotel is committed to providing a safe and healthy work environment. All employees must follow safety rules and 
            regulations, use required safety equipment, report unsafe conditions immediately, and report all accidents and injuries 
            no matter how minor. Workers' compensation insurance covers work-related injuries and illnesses. All injuries must be 
            reported immediately to ensure proper medical treatment and documentation.""",
            self.styles['PolicyText']
        ))
        
        story.append(PageBreak())
        
        # Section 2: Policies Requiring Initials
        story.append(Paragraph("SECTION II: POLICIES REQUIRING SPECIAL ACKNOWLEDGMENT", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.3*inch))
        
        # Sexual Harassment Policy
        story.append(Paragraph("14. SEXUAL AND OTHER UNLAWFUL HARASSMENT POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """We are committed to providing a work environment that is free from sexual discrimination and sexual harassment in any 
            form, as well as unlawful harassment based upon any other protected characteristic. In keeping with that commitment, we 
            have established procedures by which allegations of sexual or other unlawful harassment may be reported, investigated 
            and resolved. Each manager and associate has the responsibility to maintain a workplace free of sexual and other 
            unlawful harassment.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Sexual harassment is a form of associate misconduct which interferes with work productivity and wrongfully deprives 
            associates of the opportunity to work in an environment free from unsolicited and unwelcome sexual advances, requests 
            for sexual favors and other such verbal or physical conduct.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            "Prohibited conduct includes, but is not limited to, unwelcome sexual advances, requests for sexual favors and other "
            "similar verbal or physical contact of a sexual nature where:",
            self.styles['PolicyText']
        ))
        harassment_items = [
            "Submission to such conduct is either an explicit or implicit condition of employment",
            "Submission to or rejection of such conduct is used as a basis for making an employment-related decision",
            "The conduct unreasonably interferes with an individual's work performance",
            "The conduct creates a hostile, intimidating or offensive work environment"
        ]
        for item in harassment_items:
            story.append(Paragraph(f"• {item}", self.styles['PolicyBullet']))
        
        story.append(Paragraph(
            """All associates are required to report any incidents of sexual or other unlawful harassment. If you ever feel aggrieved 
            because of sexual harassment, you have an obligation to communicate the problem immediately and should report such 
            concerns to your manager, and/or the offending associate directly. If this is not an acceptable option, you should 
            report your concern directly to the administrative office confidentially at (908) 444-8139 or via email at 
            njbackoffice@lakecrest.com.""",
            self.styles['PolicyText']
        ))
        
        # Initial Box for Sexual Harassment
        story.append(Spacer(1, 0.2*inch))
        sh_initial_data = [[
            "I have read and understand the Sexual and Other Unlawful Harassment Policy:",
            f"{policy_data.get('sexualHarassmentInitials', '________')}"
        ]]
        sh_table = Table(sh_initial_data, colWidths=[5*inch, 1.5*inch])
        sh_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#f59e0b'))
        ]))
        story.append(sh_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Equal Employment Opportunity Policy
        story.append(Paragraph("15. EQUAL EMPLOYMENT OPPORTUNITY POLICY", self.styles['PolicySubHeader']))
        story.append(Paragraph(
            """Your employer (the "Hotel") provides equal employment opportunities to all employees and applicants for employment 
            without regard to race, color, religion, sex, sexual orientation, gender identity, national origin, age, disability, 
            genetic predisposition, military or veteran status, or any other characteristic protected by federal, state or local 
            laws. This policy applies to all terms and conditions of employment, including but not limited to, hiring, placement, 
            promotion, termination, transfer, leaves of absence, compensation, and training.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """The Hotel will make reasonable accommodations for qualified individuals with known disabilities unless doing so would 
            result in an undue hardship. The Hotel will also make reasonable accommodations for employees whose work requirements 
            interfere with a religious belief, unless doing so would result in undue hardship.""",
            self.styles['PolicyText']
        ))
        story.append(Paragraph(
            """Any employee who believes they have been subjected to discrimination should immediately report the matter to their 
            supervisor, Human Resources, or any member of management. All complaints will be promptly and thoroughly investigated. 
            The Hotel will not tolerate retaliation against any employee who makes a complaint or participates in an investigation.""",
            self.styles['PolicyText']
        ))
        
        # Initial Box for EEO
        story.append(Spacer(1, 0.2*inch))
        eeo_initial_data = [[
            "I have read and understand the Equal Employment Opportunity Policy:",
            f"{policy_data.get('eeoInitials', '________')}"
        ]]
        eeo_table = Table(eeo_initial_data, colWidths=[5*inch, 1.5*inch])
        eeo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#f59e0b'))
        ]))
        story.append(eeo_table)
        
        story.append(PageBreak())
        
        # Final Acknowledgment and Agreement
        story.append(Paragraph("ACKNOWLEDGMENT AND AGREEMENT", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.3*inch))
        
        acknowledgment_text = """In consideration of my employment, I agree to conform to the rules and regulations of the Hotel. 
        I understand my employment and compensation can be terminated, with or without cause, with or without notice, at any time 
        and at the option of either the Hotel or myself. I understand that no representative of the Hotel has any authority to 
        enter into any agreement of employment for any specific period of time or to make any agreement contrary to this paragraph.
        
        I further understand that if, during the course of my employment, I acquire confidential or proprietary information about 
        the Company or any division thereof, and its clients, that this information is to be handled in strict confidence and will 
        not be disclosed to or discussed with outsiders during the term of my employment or any time thereafter.
        
        I acknowledge that I have received and read a copy of the Hotel's Employee Handbook and Company Policies. I understand the 
        policies and procedures described within and agree to comply with them. I understand that the Hotel has the right to change, 
        modify, or abolish any or all of the policies, benefits, rules, and regulations contained or described in the handbook at 
        any time, with or without notice.
        
        I understand that this handbook supersedes all previous employment policies, written and oral, expressed and implied. I also 
        understand that this handbook is not a contract of employment and does not guarantee employment for any specific duration.
        
        I acknowledge that it is my responsibility to read, understand, and comply with all policies contained in this handbook. 
        If I have questions about any policy or procedure, I will seek clarification from my supervisor or Human Resources.
        
        I also understand that should I have any questions or concerns, at any point during my employment, I may speak to my direct 
        supervisor, or if necessary, contact the administrative office at (908) 444-8139 or via email at njbackoffice@lakecrest.com.
        
        Note - while every attempt has been made to create these policies consistent with federal and state law, if an inconsistency 
        arises, the policy(ies) will be enforced consistent with the applicable law."""
        
        story.append(Paragraph(acknowledgment_text, self.styles['PolicyText']))
        story.append(Spacer(1, 0.5*inch))
        
        # Electronic Signature Section
        story.append(Paragraph("ELECTRONIC SIGNATURE", self.styles['PolicyHeader']))
        story.append(Spacer(1, 0.2*inch))
        
        # If we have actual signature data, display it
        if signature_data.get('signatureImage'):
            story.append(Paragraph("I hereby acknowledge that I have read, understood, and agree to all the policies and procedures outlined above.", self.styles['PolicyText']))
            story.append(Spacer(1, 0.3*inch))
            
            # Decode and add the signature image
            try:
                # Extract base64 data from data URL if present
                sig_data = signature_data.get('signatureImage', '')
                if sig_data.startswith('data:image'):
                    sig_data = sig_data.split(',')[1]
                
                # Decode base64 to bytes
                sig_bytes = base64.b64decode(sig_data)
                sig_img = Image(io.BytesIO(sig_bytes), width=3*inch, height=1*inch, kind='proportional')
                
                # Center the signature image
                sig_table = Table([[sig_img]], colWidths=[6.5*inch])
                sig_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(sig_table)
            except Exception as e:
                # Fallback to text signature if image fails
                story.append(Paragraph(signature_data.get('name', 'Employee Name'), self.styles['SignatureStyle']))
            
            story.append(Spacer(1, 0.2*inch))
        
        # Signature metadata table
        sig_info = [
            ["Electronic Signature:", signature_data.get('name', 'N/A')],
            ["Signature Type:", signature_data.get('signatureType', 'Electronic Signature')],
            ["Date & Time Signed:", signature_data.get('timestamp', 'N/A')],
            ["IP Address:", signature_data.get('ipAddress', 'N/A')],
            ["Signature ID:", signature_data.get('signatureId', 'N/A')],
            ["User Agent:", signature_data.get('userAgent', 'N/A')[:50] + '...' if len(signature_data.get('userAgent', '')) > 50 else signature_data.get('userAgent', 'N/A')],
            ["Legal Compliance:", "E-SIGN Act Compliant Electronic Signature"]
        ]
        
        sig_metadata_table = Table(sig_info, colWidths=[2*inch, 4*inch])
        sig_metadata_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#9ca3af'))
        ]))
        story.append(sig_metadata_table)
        
        # Legal Notice Footer
        story.append(Spacer(1, 0.5*inch))
        legal_notice = """This document has been electronically signed and is legally binding under the Electronic Signatures in Global 
        and National Commerce Act (E-SIGN Act) and the Uniform Electronic Transactions Act (UETA). The electronic signature and 
        associated metadata constitute a valid and enforceable signature. A copy of this acknowledgment will be maintained in your 
        personnel file for the duration required by federal and state law. The Hotel reserves the right to update these policies at 
        any time. Employees will be notified of significant changes."""
        
        story.append(Paragraph(legal_notice, ParagraphStyle(
            name='LegalNotice',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#6b7280'),
            alignment=TA_JUSTIFY,
            borderWidth=1,
            borderColor=colors.HexColor('#e5e7eb'),
            borderPadding=10,
            backColor=colors.HexColor('#f9fafb')
        )))
        
        # Document control footer
        story.append(Spacer(1, 0.3*inch))
        control_info = f"Document ID: {signature_data.get('documentId', 'POL-' + datetime.now().strftime('%Y%m%d-%H%M%S'))}"
        control_info += f" | Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p %Z')}"
        control_info += f" | Property: {employee_data.get('property_name', 'N/A')}"
        
        story.append(Paragraph(control_info, ParagraphStyle(
            name='DocControl',
            parent=self.styles['Normal'],
            fontSize=7,
            textColor=colors.HexColor('#9ca3af'),
            alignment=TA_CENTER
        )))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.read()

# Test the generator
if __name__ == "__main__":
    generator = FinalPolicyDocumentGenerator()
    
    # Test data
    employee_data = {
        'name': 'John Doe',
        'id': 'EMP-12345',
        'property_name': 'Grand Hotel & Resort',
        'position': 'Front Desk Agent',
        'department': 'Guest Services',
        'start_date': 'January 15, 2025'
    }
    
    policy_data = {
        'sexualHarassmentInitials': 'JD',
        'eeoInitials': 'JD',
        'acknowledgmentChecked': True
    }
    
    # Use a pre-generated test signature (simple black signature on transparent background)
    test_signature = """data:image/png;base64,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"""
    
    signature_data = {
        'name': 'John Doe',
        'signatureType': 'Electronic Signature',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z'),
        'ipAddress': '192.168.1.100',
        'userAgent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'signatureId': 'SIG-' + datetime.now().strftime('%Y%m%d-%H%M%S'),
        'documentId': 'POL-' + datetime.now().strftime('%Y%m%d-%H%M%S'),
        'signatureImage': test_signature
    }
    
    pdf_bytes = generator.generate_policy_document(employee_data, policy_data, signature_data)
    
    # Save test PDF
    with open('final_complete_policy_document.pdf', 'wb') as f:
        f.write(pdf_bytes)
    
    print("Generated final_complete_policy_document.pdf")
    print(f"File size: {len(pdf_bytes)} bytes")
    print(f"Approximate page count: {len(pdf_bytes) // 3000} pages")