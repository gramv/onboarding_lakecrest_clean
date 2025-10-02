"""
Company Policies Generator with version tracking and draft saving
Ensures consistency between frontend and backend PDF generation
"""

import io
from datetime import datetime
from typing import Dict, Any, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
import pymupdf  # For adding signature to existing PDF
import base64

# Version tracking for compliance audits
POLICY_VERSION = "2.0.0"
LAST_UPDATED = "2024-03-15"
POLICY_REVISION_HISTORY = [
    {"version": "1.0.0", "date": "2024-01-01", "changes": "Initial policies"},
    {"version": "1.5.0", "date": "2024-02-01", "changes": "Added Data Privacy Policy"},
    {"version": "2.0.0", "date": "2024-03-15", "changes": "Added all 13 comprehensive policies"}
]

# Define signature coordinates for consistency
SIGNATURE_COORDINATES = {
    "employee_signature": {"x": 150, "y": 650},  # From left edge, from bottom edge in PyMuPDF
    "date_field": {"x": 400, "y": 650}
}

class CompanyPoliciesGenerator:
    """Generate comprehensive company policies PDF with all 13 required policies"""
    
    # All 13 company policies definition
    POLICIES = [
        {
            "id": "anti_harassment",
            "title": "ANTI-HARASSMENT POLICY",
            "content": """The Hotel is committed to providing a work environment free from harassment based on race, color, religion, sex, sexual orientation, gender identity, national origin, age, disability, genetic information, or any other protected characteristic. 

All forms of harassment are prohibited, including verbal, physical, and visual harassment. This includes offensive jokes, slurs, epithets, physical assaults or threats, intimidation, ridicule, insults, offensive objects or pictures, and interference with work performance.

Any employee who believes they have been harassed should immediately report the incident to their supervisor, HR department, or use the confidential hotline. All complaints will be investigated promptly and confidentially. Retaliation against anyone who reports harassment or participates in an investigation is strictly prohibited.

Violations of this policy will result in disciplinary action, up to and including termination.""",
            "requires_initials": True
        },
        {
            "id": "equal_employment",
            "title": "EQUAL EMPLOYMENT OPPORTUNITY",
            "content": """Your employer (the "Hotel") provides equal employment opportunities to all employees and applicants for employment without regard to race, color, religion, sex, sexual orientation, national origin, age, disability, genetic predisposition, military or veteran status in accordance with applicable federal, state or local laws. 

This policy applies to all terms and conditions of employment, including but not limited to, hiring, placement, promotion, termination, transfer, leaves of absence, compensation, and training.

The Hotel will make reasonable accommodations for qualified individuals with known disabilities unless doing so would result in an undue hardship. This policy governs all aspects of employment, including selection, job assignment, compensation, discipline, termination, and access to benefits and training.""",
            "requires_initials": True
        },
        {
            "id": "code_of_conduct",
            "title": "CODE OF CONDUCT",
            "content": """All employees are expected to conduct themselves in a professional manner that promotes a positive work environment and upholds the Hotel's reputation. This includes:

Professional Behavior:
• Treating all guests, colleagues, and vendors with respect and courtesy
• Maintaining a professional appearance according to dress code standards
• Being punctual and reliable in attendance
• Following all safety procedures and protocols
• Protecting company property and resources

Prohibited Conduct:
• Theft or unauthorized removal of property
• Fighting or threatening violence in the workplace
• Boisterous or disruptive activity in the workplace
• Negligence or improper conduct leading to damage of property
• Violation of safety or health rules
• Smoking in prohibited areas
• Sexual or other unlawful harassment
• Possession of dangerous or unauthorized materials
• Excessive absenteeism or any absence without notice
• Unauthorized disclosure of business secrets or confidential information

Violation of these standards may result in disciplinary action, up to and including termination.""",
            "requires_initials": False
        },
        {
            "id": "safety_procedures",
            "title": "SAFETY PROCEDURES",
            "content": """The Hotel is committed to providing a safe and healthy workplace for all employees. All employees must:

Safety Requirements:
• Follow all posted safety rules and procedures
• Report unsafe conditions immediately to management
• Report all injuries, no matter how minor, to your supervisor immediately
• Participate in safety training programs
• Use required personal protective equipment
• Follow proper lifting techniques and ergonomic practices
• Know the location of fire extinguishers and emergency exits

Emergency Procedures:
• In case of fire, activate the nearest alarm and evacuate immediately
• Know your designated evacuation route and assembly point
• Never use elevators during a fire emergency
• Report all emergencies to 911 and then notify management
• Follow all instructions from emergency responders

Hazard Communication:
A Hazard Communication Plan is located in the Hotel, which each employee is required to review prior to start of their first shift of work. Please ask your General Manager where it is located.""",
            "requires_initials": False
        },
        {
            "id": "dress_code",
            "title": "DRESS CODE",
            "content": """Professional appearance is essential to creating a positive impression with our guests. All employees must adhere to the following dress code standards:

General Requirements:
• Clothing must be clean, pressed, and in good repair
• Uniforms must be worn as required by department
• Name tags must be worn and visible at all times
• Personal hygiene must be maintained at the highest standard
• Hair must be clean, neat, and professionally styled
• Jewelry should be minimal and professional
• Tattoos may need to be covered depending on position
• Strong fragrances should be avoided

Prohibited Items:
• Torn, dirty, or wrinkled clothing
• Revealing or inappropriate attire
• Open-toed shoes in food service or housekeeping areas
• Excessive jewelry that could pose a safety hazard
• Visible undergarments
• Clothing with offensive language or images

Department-specific requirements will be provided by your supervisor.""",
            "requires_initials": False
        },
        {
            "id": "attendance_policy",
            "title": "ATTENDANCE POLICY",
            "content": """Regular attendance and punctuality are essential for the successful operation of the Hotel. 

Attendance Expectations:
• Report to work on time and ready to begin work at your scheduled time
• Notify your supervisor at least 2 hours before your shift if you will be absent
• Provide documentation for absences exceeding 3 consecutive days
• Schedule personal appointments outside of work hours when possible
• Request time off in advance according to department procedures

Tardiness:
• Employees are expected to be at their workstation ready to work at their scheduled time
• Excessive tardiness (more than 3 times in a 30-day period) may result in disciplinary action

Unexcused Absences:
• No-call/no-show is grounds for immediate termination
• Two consecutive days of no-call/no-show will be considered job abandonment
• Unexcused absences will result in progressive discipline

Leave Policies:
• Vacation time must be requested and approved in advance
• Sick leave should be used for personal illness or medical appointments
• FMLA and other statutory leaves will be administered according to law""",
            "requires_initials": False
        },
        {
            "id": "social_media",
            "title": "SOCIAL MEDIA POLICY",
            "content": """This policy provides guidance for employee use of social media, which includes personal websites, blogs, social networking sites, and other online platforms.

Guidelines:
• Do not post confidential or proprietary information about the Hotel, guests, or employees
• Do not post photos or videos taken on Hotel property without permission
• Be respectful and professional in all online interactions
• Identify yourself as a Hotel employee only if relevant and appropriate
• Make it clear that your views are your own and not those of the Hotel
• Do not use Hotel logos or trademarks without permission
• Do not post content that could be viewed as malicious, obscene, threatening, or intimidating

Prohibited Activities:
• Posting discriminatory remarks, harassment, or threats of violence
• Sharing guest information or photos without written consent
• Engaging in social media during work hours except for business purposes
• Creating a hostile work environment through online activity
• Violating any other Hotel policies through social media use

Remember that online conduct can affect your employment. The Hotel may take disciplinary action for inappropriate social media use.""",
            "requires_initials": False
        },
        {
            "id": "confidentiality",
            "title": "CONFIDENTIALITY AGREEMENT",
            "content": """During your employment, you may have access to confidential information about the Hotel, its guests, and employees. This information must be protected at all times.

Confidential Information Includes:
• Guest personal and payment information
• Employee personal information and records
• Business strategies and financial information
• Vendor agreements and pricing
• Security procedures and protocols
• Trade secrets and proprietary methods
• Internal communications and memoranda

Your Obligations:
• Maintain strict confidentiality of all protected information
• Use confidential information only for legitimate business purposes
• Do not discuss confidential matters in public areas
• Do not share login credentials or access codes
• Report any suspected breach of confidentiality immediately
• Return all company property and information upon termination

These obligations continue even after your employment ends. Violation of confidentiality may result in termination and legal action.""",
            "requires_initials": True
        },
        {
            "id": "drug_alcohol",
            "title": "DRUG AND ALCOHOL POLICY",
            "content": """The Hotel is committed to maintaining a drug-free workplace. The use, possession, distribution, or being under the influence of illegal drugs or alcohol during work hours is strictly prohibited.

Policy Requirements:
• Reporting to work under the influence of drugs or alcohol is prohibited
• Use, possession, or sale of illegal drugs on Hotel property is prohibited
• Abuse of prescription medications is prohibited
• Employees must notify management of any medications that may affect job performance

Testing:
• Pre-employment drug screening may be required
• Random drug testing may be conducted where permitted by law
• Post-accident testing may be required
• Reasonable suspicion testing may be conducted
• Refusal to submit to testing may result in termination

Violations:
• First offense may result in termination
• Employees may be referred to an Employee Assistance Program if available
• Return to work may require completion of rehabilitation program
• Follow-up testing may be required

This policy is enforced to ensure the safety of all employees and guests.""",
            "requires_initials": False
        },
        {
            "id": "information_security",
            "title": "INFORMATION SECURITY",
            "content": """All employees are responsible for protecting the Hotel's information systems and data from unauthorized access, disclosure, modification, or destruction.

Security Requirements:
• Use strong passwords and change them regularly
• Never share passwords or access credentials
• Lock computers when stepping away from your workstation
• Report suspicious emails or phishing attempts
• Do not install unauthorized software
• Use only approved devices for business purposes
• Encrypt sensitive data when required
• Follow clean desk policy for sensitive documents

Prohibited Activities:
• Accessing systems or data without authorization
• Attempting to bypass security controls
• Using Hotel systems for personal business
• Downloading or distributing copyrighted materials
• Visiting inappropriate websites
• Connecting personal devices without IT approval

Data Protection:
• Handle credit card data according to PCI compliance standards
• Protect personally identifiable information (PII)
• Report any data breach immediately to management
• Dispose of sensitive documents through secure shredding

Violations may result in disciplinary action and potential legal consequences.""",
            "requires_initials": False
        },
        {
            "id": "workplace_violence",
            "title": "WORKPLACE VIOLENCE PREVENTION",
            "content": """The Hotel strives to maintain a productive work environment free of violence and the threat of violence. We are committed to the safety of our associates, vendors, customers and visitors.

The Hotel does not tolerate any type of workplace violence committed by or against associates. Any threats or acts of violence against an associate, vendor, customer, visitor or property will not be tolerated.

Prohibited Conduct:
• Physical assault, threat to assault or stalking
• Possessing or threatening with a weapon on hotel premises
• Intentionally damaging property
• Aggressive or hostile behavior creating fear of injury
• Harassing or intimidating communications
• Racial or cultural epithets associated with threats
• Use of hotel resources to threaten or harass

Weapons Policy:
The Hotel strictly forbids any employee to possess any weapon on their person while on Hotel premises, including but not limited to firearms. This applies regardless of licenses or permits.

Reporting:
• Report all threats or violent conduct immediately to management
• Contact administrative office at (908) 444-8139 if uncomfortable reporting locally
• Email feedback@lakecrest.com for confidential reporting
• The Hotel will not retaliate against good-faith reports

Violations will result in disciplinary action, up to and including termination.""",
            "requires_initials": False
        },
        {
            "id": "ethics_compliance",
            "title": "ETHICS AND COMPLIANCE",
            "content": """All employees must conduct business with the highest ethical standards and in compliance with all applicable laws and regulations.

Ethical Standards:
• Act with honesty and integrity in all business dealings
• Avoid conflicts of interest or the appearance thereof
• Do not accept gifts or favors that could influence business decisions
• Report suspected violations of law or policy
• Cooperate fully with investigations
• Maintain accurate business records
• Use company resources responsibly

Compliance Requirements:
• Follow all federal, state, and local laws
• Adhere to industry regulations and standards
• Complete required compliance training
• Report suspected violations through proper channels
• Do not retaliate against those who report concerns

Conflicts of Interest:
• Disclose any personal relationships that may conflict with job duties
• Do not engage in outside employment that conflicts with Hotel interests
• Avoid financial interests in competitors or suppliers
• Do not use position for personal gain

Anti-Corruption:
• Never offer or accept bribes or kickbacks
• Report any suspected corruption immediately
• Maintain transparency in all business dealings

Violations may result in termination and referral to law enforcement.""",
            "requires_initials": False
        },
        {
            "id": "data_privacy",
            "title": "DATA PRIVACY POLICY",
            "content": """The Hotel is committed to protecting the privacy of personal information belonging to guests, employees, and business partners.

Privacy Principles:
• Collect only necessary personal information
• Use information only for stated business purposes
• Limit access to those with legitimate business need
• Protect information with appropriate security measures
• Retain information only as long as necessary
• Dispose of information securely

Employee Responsibilities:
• Access personal data only when authorized
• Do not share personal data without proper authorization
• Report any suspected privacy breach immediately
• Follow data retention and disposal policies
• Complete privacy training as required
• Respect individual privacy rights

Guest Privacy:
• Protect guest registration and payment information
• Do not share guest information with unauthorized parties
• Maintain confidentiality of guest stays and activities
• Handle guest requests for information according to policy

Breach Response:
• Report suspected breaches immediately to management
• Cooperate with breach investigation and response
• Do not attempt to cover up or hide breaches
• Follow notification procedures as required by law

Compliance with data privacy laws including CCPA, GDPR where applicable, is mandatory.""",
            "requires_initials": False
        }
    ]
    
    def __init__(self):
        """Initialize the generator with styles"""
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the document"""
        self.styles.add(ParagraphStyle(
            name='PolicyTitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            textColor=colors.black,
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            alignment=TA_JUSTIFY
        ))
        
        self.styles.add(ParagraphStyle(
            name='PolicyContent',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=13,
            alignment=TA_JUSTIFY,
            spaceAfter=6
        ))
        
        self.styles.add(ParagraphStyle(
            name='InitialsLine',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            spaceBefore=6
        ))
        
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER
        ))
    
    def generate_pdf(self, employee_data: Dict[str, Any], 
                    policy_acknowledgments: Optional[Dict[str, Dict]] = None,
                    signature_data: Optional[str] = None) -> bytes:
        """
        Generate the complete company policies PDF
        
        Args:
            employee_data: Employee information
            policy_acknowledgments: Dictionary tracking which policies have been read/acknowledged
            signature_data: Base64 encoded signature image
            
        Returns:
            PDF bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=72  # More space for footer
        )
        
        story = []
        
        # Add header
        story.extend(self._create_header(employee_data))
        
        # Add version info
        story.extend(self._create_version_info())
        
        # Add all policies
        for policy in self.POLICIES:
            story.extend(self._create_policy_section(
                policy, 
                employee_data,
                policy_acknowledgments
            ))
        
        # Add acknowledgment section
        story.extend(self._create_acknowledgment_section(employee_data))
        
        # Add signature section if provided
        if signature_data:
            story.extend(self._create_signature_section(employee_data, signature_data))
        
        # Build the document
        doc.build(story, onFirstPage=self._add_footer, onLaterPages=self._add_footer)
        
        # Get the PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        # Add signature image if provided
        if signature_data:
            pdf_bytes = self._add_signature_to_pdf(pdf_bytes, signature_data)
        
        return pdf_bytes
    
    def _create_header(self, employee_data: Dict[str, Any]) -> List:
        """Create the document header"""
        story = []
        
        # Title
        story.append(Paragraph(
            "COMPANY POLICIES & PROCEDURES",
            self.styles['Title']
        ))
        story.append(Paragraph(
            "Employee Acknowledgment Form",
            self.styles['Heading2']
        ))
        story.append(Spacer(1, 20))
        
        # Employee information
        employee_name = f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip()
        property_name = employee_data.get('property_name', 'Hotel Property')
        
        info_data = [
            ['Employee:', employee_name],
            ['Property:', property_name],
            ['Date:', datetime.now().strftime('%B %d, %Y')],
            ['Employee ID:', employee_data.get('id', 'N/A')]
        ]
        
        info_table = Table(info_data, colWidths=[100, 300])
        info_table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        return story
    
    def _create_version_info(self) -> List:
        """Create version tracking information"""
        story = []
        
        version_text = f"<b>Document Version:</b> {POLICY_VERSION} | <b>Last Updated:</b> {LAST_UPDATED}"
        story.append(Paragraph(version_text, self.styles['PolicyContent']))
        story.append(Spacer(1, 12))
        
        return story
    
    def _create_policy_section(self, policy: Dict, employee_data: Dict, 
                              acknowledgments: Optional[Dict] = None) -> List:
        """Create a single policy section"""
        story = []
        
        # Policy title
        story.append(Paragraph(policy['title'], self.styles['PolicyTitle']))
        
        # Policy content
        # Handle content with proper paragraph breaks
        content_lines = policy['content'].split('\n\n')
        for line in content_lines:
            if line.strip():
                # Check if it's a bulleted list
                if '•' in line:
                    # Handle bullet points
                    bullets = line.split('•')
                    if bullets[0].strip():  # There's text before bullets
                        story.append(Paragraph(bullets[0].strip(), self.styles['PolicyContent']))
                    for bullet in bullets[1:]:
                        if bullet.strip():
                            story.append(Paragraph(f"• {bullet.strip()}", self.styles['PolicyContent']))
                else:
                    story.append(Paragraph(line.strip(), self.styles['PolicyContent']))
        
        # Add initials line if required
        if policy.get('requires_initials'):
            initials_text = f"Employee Initials: _______ (Please initial to acknowledge you have read and understood this policy)"
            story.append(Spacer(1, 6))
            story.append(Paragraph(initials_text, self.styles['InitialsLine']))
        
        # Track acknowledgment if provided
        if acknowledgments and policy['id'] in acknowledgments:
            ack = acknowledgments[policy['id']]
            if ack.get('acknowledged'):
                ack_text = f"<i>Acknowledged on: {ack.get('timestamp', 'N/A')}</i>"
                story.append(Paragraph(ack_text, self.styles['Footer']))
        
        story.append(Spacer(1, 12))
        
        # Add page break after every 3 policies to improve readability
        policy_index = next((i for i, p in enumerate(self.POLICIES) if p['id'] == policy['id']), 0)
        if policy_index > 0 and (policy_index + 1) % 3 == 0:
            story.append(PageBreak())
        
        return story
    
    def _create_acknowledgment_section(self, employee_data: Dict) -> List:
        """Create the final acknowledgment section"""
        story = []
        
        story.append(PageBreak())
        story.append(Paragraph("EMPLOYEE ACKNOWLEDGMENT", self.styles['Title']))
        story.append(Spacer(1, 20))
        
        acknowledgment_text = """
        In consideration of my employment, I agree to conform to the rules and regulations of the Hotel. 
        I understand my employment and compensation can be terminated, with or without cause, with or without 
        notice, at any time and at the option of either the Hotel or myself.
        
        I understand that no representative of the Hotel has any authority to enter into any agreement of 
        employment for any specific period of time or to make any agreement contrary to this paragraph.
        
        I further understand that if, during the course of my employment, I acquire confidential or proprietary 
        information about the Company or any division thereof, and its clients, that this information is to be 
        handled in strict confidence and will not be disclosed to or discussed with outsiders during the term 
        of my employment or any time thereafter.
        
        I understand that should I have any questions or concerns, at any point during my employment, I may 
        speak to my direct supervisor, or if necessary, contact the administrative office at (908) 444-8139 
        or via email at njbackoffice@lakecrest.com.
        
        My signature below certifies that I have read and understood all company policies and procedures 
        outlined in this document. I agree to abide by these policies during my employment with the Hotel.
        """
        
        for paragraph in acknowledgment_text.strip().split('\n\n'):
            story.append(Paragraph(paragraph.strip(), self.styles['PolicyContent']))
            story.append(Spacer(1, 8))
        
        return story
    
    def _create_signature_section(self, employee_data: Dict, signature_data: Optional[str] = None) -> List:
        """Create the signature section"""
        story = []
        
        story.append(Spacer(1, 30))
        
        # Signature line
        sig_data = [
            ['_' * 50, '_' * 30],
            ['Employee Signature', 'Date'],
        ]
        
        sig_table = Table(sig_data, colWidths=[300, 150])
        sig_table.setStyle(TableStyle([
            ('FONT', (0, 1), (-1, 1), 'Helvetica', 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('TOPPADDING', (0, 1), (-1, 1), 12),
        ]))
        
        story.append(sig_table)
        story.append(Spacer(1, 20))
        
        # Print name section
        employee_name = f"{employee_data.get('firstName', '')} {employee_data.get('lastName', '')}".strip()
        print_name_text = f"<b>Print Name:</b> {employee_name}"
        story.append(Paragraph(print_name_text, self.styles['PolicyContent']))
        
        return story
    
    def _add_footer(self, canvas, doc):
        """Add footer to each page"""
        canvas.saveState()
        
        # Version and page number
        page_num = canvas.getPageNumber()
        footer_text = f"Version {POLICY_VERSION} | Last Updated: {LAST_UPDATED} | Page {page_num}"
        
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.grey)
        canvas.drawCentredString(
            doc.pagesize[0] / 2,
            36,  # 0.5 inch from bottom
            footer_text
        )
        
        canvas.restoreState()
    
    def _add_signature_to_pdf(self, pdf_bytes: bytes, signature_data) -> bytes:
        """Add signature image to the PDF"""
        try:
            # Handle signature_data if it's a dictionary
            if isinstance(signature_data, dict):
                signature_data = signature_data.get('signature', '')
            
            # If no signature data, return original PDF
            if not signature_data:
                return pdf_bytes
            
            # Decode the base64 signature
            if signature_data.startswith('data:image'):
                signature_data = signature_data.split(',')[1]
            
            signature_bytes = base64.b64decode(signature_data)

            # Process signature: make near-white transparent, keep RGBA (exactly like W-4)
            from PIL import Image
            import io

            img = Image.open(io.BytesIO(signature_bytes))
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            datas = img.getdata()
            new_data = []
            for r, g, b, a in datas:
                if r > 240 and g > 240 and b > 240:
                    new_data.append((255, 255, 255, 0))  # Make near-white transparent
                else:
                    new_data.append((r, g, b, 255))  # Keep signature opaque
            img.putdata(new_data)

            # Convert back to bytes
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            processed_signature_bytes = img_buffer.getvalue()

            # Open the PDF
            pdf_document = pymupdf.open(stream=pdf_bytes, filetype="pdf")

            # Get the last page (where signature section is)
            last_page = pdf_document[-1]

            # Add the signature image
            img_rect = pymupdf.Rect(
                SIGNATURE_COORDINATES["employee_signature"]["x"],
                SIGNATURE_COORDINATES["employee_signature"]["y"] - 40,  # Height adjustment
                SIGNATURE_COORDINATES["employee_signature"]["x"] + 150,  # Width
                SIGNATURE_COORDINATES["employee_signature"]["y"]
            )

            last_page.insert_image(img_rect, stream=processed_signature_bytes)
            
            # Add the date
            date_point = pymupdf.Point(
                SIGNATURE_COORDINATES["date_field"]["x"],
                SIGNATURE_COORDINATES["date_field"]["y"]
            )
            last_page.insert_text(
                date_point,
                datetime.now().strftime('%m/%d/%Y'),
                fontsize=10
            )
            
            # Save the modified PDF
            output_buffer = io.BytesIO()
            pdf_document.save(output_buffer)
            modified_pdf = output_buffer.getvalue()
            
            pdf_document.close()
            output_buffer.close()
            
            return modified_pdf
            
        except Exception as e:
            print(f"Error adding signature to PDF: {e}")
            return pdf_bytes  # Return original if signature fails
    
    def save_draft(self, employee_id: str, draft_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save draft state for the policies form
        
        Args:
            employee_id: Employee identifier
            draft_data: Dictionary containing:
                - policies_read: List of policy IDs that have been read
                - policies_acknowledged: Dict of policy acknowledgments
                - scroll_positions: Dict of scroll positions per policy
                - last_viewed: Timestamp
                - current_section: Current section being viewed
                
        Returns:
            Success status and saved data
        """
        # This would typically save to database
        # For now, return the structure that would be saved
        return {
            "employee_id": employee_id,
            "draft_version": POLICY_VERSION,
            "saved_at": datetime.now().isoformat(),
            "draft_data": draft_data
        }
    
    def get_policy_list(self) -> List[Dict[str, str]]:
        """
        Get list of all policies with their IDs and titles
        Used for frontend sync
        """
        return [
            {
                "id": policy["id"],
                "title": policy["title"],
                "requires_initials": policy.get("requires_initials", False)
            }
            for policy in self.POLICIES
        ]
    
    def get_policy_content(self, policy_id: str) -> Optional[Dict[str, Any]]:
        """Get content for a specific policy"""
        for policy in self.POLICIES:
            if policy["id"] == policy_id:
                return policy
        return None


# Export for use in endpoints
company_policies_generator = CompanyPoliciesGenerator()