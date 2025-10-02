#!/usr/bin/env python3
"""
Retrieve and save Company Policies, I-9, and W-4 documents from Supabase
"""

import os
import json
import base64
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from supabase import create_client, Client
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
import PyPDF2

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kzommszdhapvqpekpvnt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzM4MDAsImV4cCI6MjA2OTI0OTgwMH0.I_qsO9Y7iqtP-YW9vhyp3OOxsLCBZ_13feCfV-5zUMI")

# Employee ID to retrieve documents for
EMPLOYEE_ID = "dbf6ebdd-f88e-4b9e-a06d-ab173205b7ef"

# Create output directory
OUTPUT_DIR = Path("saved_documents")
OUTPUT_DIR.mkdir(exist_ok=True)

def init_supabase() -> Client:
    """Initialize Supabase client"""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_company_policies_pdf(data: dict) -> bytes:
    """Generate Company Policies PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("Company Policies Agreement", title_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Employee Information
    if 'step_data' in data and data['step_data']:
        step_data = data['step_data'] if isinstance(data['step_data'], dict) else json.loads(data['step_data'])
        
        info_style = styles['Normal']
        story.append(Paragraph("<b>Employee Information:</b>", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        # Get personal info from other steps if available
        personal_info = step_data.get('personalInfo', {})
        if personal_info:
            story.append(Paragraph(f"Name: {personal_info.get('firstName', '')} {personal_info.get('lastName', '')}", info_style))
            story.append(Paragraph(f"Email: {personal_info.get('email', '')}", info_style))
            story.append(Paragraph(f"Phone: {personal_info.get('phone', '')}", info_style))
        
        story.append(Spacer(1, 0.3*inch))
    
    # Policies Content
    story.append(Paragraph("<b>Company Policies:</b>", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    policies_text = """
    By signing this document, I acknowledge that I have read, understood, and agree to comply with all company policies including but not limited to:
    
    • Code of Conduct and Ethics
    • Anti-Harassment and Non-Discrimination Policy
    • Workplace Safety Guidelines
    • Confidentiality and Data Protection
    • Attendance and Punctuality Requirements
    • Dress Code and Professional Appearance
    • Technology and Internet Usage Policy
    • Social Media Guidelines
    • Conflict of Interest Policy
    • Drug and Alcohol-Free Workplace Policy
    """
    
    story.append(Paragraph(policies_text, styles['Normal']))
    story.append(Spacer(1, 0.5*inch))
    
    # Signature Section
    if 'signature_data' in data and data['signature_data']:
        story.append(Paragraph("<b>Employee Signature:</b>", styles['Heading3']))
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("Signed electronically", info_style))
        story.append(Paragraph(f"Date: {data.get('completed_at', datetime.now().isoformat())}", info_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.read()

def generate_i9_pdf(i9_data: dict, onboarding_data: dict) -> bytes:
    """Generate I-9 Form PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("Form I-9: Employment Eligibility Verification", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Parse form data
    form_data = i9_data.get('form_data', {})
    if isinstance(form_data, str):
        form_data = json.loads(form_data)
    
    # Section 1: Employee Information
    story.append(Paragraph("<b>Section 1: Employee Information and Attestation</b>", styles['Heading2']))
    story.append(Spacer(1, 0.2*inch))
    
    info_style = styles['Normal']
    
    # Personal Information
    story.append(Paragraph(f"<b>Name:</b> {form_data.get('last_name', '')} {form_data.get('first_name', '')} {form_data.get('middle_name', '')}", info_style))
    story.append(Paragraph(f"<b>Date of Birth:</b> {form_data.get('date_of_birth', '')}", info_style))
    story.append(Paragraph(f"<b>SSN:</b> {form_data.get('ssn', '')}", info_style))
    story.append(Paragraph(f"<b>Email:</b> {form_data.get('email', '')}", info_style))
    story.append(Paragraph(f"<b>Phone:</b> {form_data.get('phone', '')}", info_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Address
    story.append(Paragraph(f"<b>Address:</b> {form_data.get('address', '')}", info_style))
    story.append(Paragraph(f"{form_data.get('city', '')}, {form_data.get('state', '')} {form_data.get('zip_code', '')}", info_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Citizenship Status
    citizenship = form_data.get('citizenship_status', '')
    citizenship_text = {
        'citizen': 'A citizen of the United States',
        'noncitizen_national': 'A noncitizen national of the United States',
        'permanent_resident': 'A lawful permanent resident',
        'authorized_alien': 'An alien authorized to work'
    }.get(citizenship, citizenship)
    
    story.append(Paragraph(f"<b>Citizenship/Immigration Status:</b> {citizenship_text}", info_style))
    
    if citizenship == 'permanent_resident':
        story.append(Paragraph(f"<b>USCIS Number:</b> {form_data.get('uscis_number', '')}", info_style))
    elif citizenship == 'authorized_alien':
        story.append(Paragraph(f"<b>Work Authorization Expiration:</b> {form_data.get('work_auth_expiration', '')}", info_style))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Section 2: Employer Review (if OCR data exists)
    if 'ocr_data' in form_data and form_data['ocr_data']:
        story.append(PageBreak())
        story.append(Paragraph("<b>Section 2: Employer or Authorized Representative Review and Verification</b>", styles['Heading2']))
        story.append(Spacer(1, 0.2*inch))
        
        ocr_data = form_data['ocr_data']
        if isinstance(ocr_data, str):
            ocr_data = json.loads(ocr_data)
        
        # Document Information
        story.append(Paragraph("<b>Documents Reviewed:</b>", styles['Heading3']))
        story.append(Spacer(1, 0.1*inch))
        
        # List A Document (if driver's license was scanned)
        if 'driver_license' in ocr_data:
            dl_data = ocr_data['driver_license']
            story.append(Paragraph("<b>List A - Driver's License:</b>", info_style))
            story.append(Paragraph(f"Document Title: Driver's License", info_style))
            story.append(Paragraph(f"Issuing Authority: {dl_data.get('state', 'TN')}", info_style))
            story.append(Paragraph(f"Document Number: {dl_data.get('license_number', '')}", info_style))
            story.append(Paragraph(f"Expiration Date: {dl_data.get('expiration_date', '')}", info_style))
            story.append(Spacer(1, 0.2*inch))
        
        # List B Document (if SSN card was scanned)
        if 'ssn_card' in ocr_data:
            ssn_data = ocr_data['ssn_card']
            story.append(Paragraph("<b>List C - Social Security Card:</b>", info_style))
            story.append(Paragraph(f"Document Title: Social Security Card", info_style))
            story.append(Paragraph(f"Document Number: {ssn_data.get('ssn', '')}", info_style))
            story.append(Spacer(1, 0.2*inch))
    
    # Signature Section
    story.append(Spacer(1, 0.5*inch))
    if i9_data.get('signed'):
        story.append(Paragraph("<b>Employee Signature:</b>", styles['Heading3']))
        story.append(Paragraph("Signed electronically", info_style))
        story.append(Paragraph(f"Date: {i9_data.get('completed_at', datetime.now().isoformat())}", info_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.read()

def generate_w4_pdf(data: dict) -> bytes:
    """Generate W-4 Form PDF"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("Form W-4 (2025): Employee's Withholding Certificate", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Parse form data
    form_data = data.get('step_data', {})
    if isinstance(form_data, str):
        form_data = json.loads(form_data)
    
    w4_data = form_data.get('w4Data', {}) if form_data else {}
    
    # Step 1: Personal Information
    story.append(Paragraph("<b>Step 1: Enter Personal Information</b>", styles['Heading2']))
    story.append(Spacer(1, 0.1*inch))
    
    info_style = styles['Normal']
    story.append(Paragraph(f"<b>Name:</b> {w4_data.get('firstName', '')} {w4_data.get('lastName', '')}", info_style))
    story.append(Paragraph(f"<b>SSN:</b> {w4_data.get('ssn', '')}", info_style))
    story.append(Paragraph(f"<b>Address:</b> {w4_data.get('address', '')}", info_style))
    story.append(Paragraph(f"{w4_data.get('city', '')}, {w4_data.get('state', '')} {w4_data.get('zip', '')}", info_style))
    
    filing_status = w4_data.get('filingStatus', '')
    filing_text = {
        'single': 'Single or Married filing separately',
        'married': 'Married filing jointly',
        'head': 'Head of household'
    }.get(filing_status, filing_status)
    story.append(Paragraph(f"<b>Filing Status:</b> {filing_text}", info_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Step 2: Multiple Jobs
    if w4_data.get('multipleJobs'):
        story.append(Paragraph("<b>Step 2: Multiple Jobs or Spouse Works</b>", styles['Heading2']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph("✓ Multiple jobs or spouse works", info_style))
        story.append(Spacer(1, 0.2*inch))
    
    # Step 3: Claim Dependents
    if w4_data.get('dependents'):
        story.append(Paragraph("<b>Step 3: Claim Dependents</b>", styles['Heading2']))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(f"Number of qualifying children: {w4_data.get('qualifyingChildren', 0)}", info_style))
        story.append(Paragraph(f"Number of other dependents: {w4_data.get('otherDependents', 0)}", info_style))
        story.append(Spacer(1, 0.2*inch))
    
    # Step 4: Other Adjustments
    story.append(Paragraph("<b>Step 4: Other Adjustments (Optional)</b>", styles['Heading2']))
    story.append(Spacer(1, 0.1*inch))
    
    if w4_data.get('otherIncome'):
        story.append(Paragraph(f"(a) Other income: ${w4_data.get('otherIncome', 0)}", info_style))
    if w4_data.get('deductions'):
        story.append(Paragraph(f"(b) Deductions: ${w4_data.get('deductions', 0)}", info_style))
    if w4_data.get('extraWithholding'):
        story.append(Paragraph(f"(c) Extra withholding: ${w4_data.get('extraWithholding', 0)}", info_style))
    
    story.append(Spacer(1, 0.5*inch))
    
    # Step 5: Sign
    story.append(Paragraph("<b>Step 5: Sign Here</b>", styles['Heading2']))
    story.append(Spacer(1, 0.1*inch))
    
    if data.get('signature_data'):
        story.append(Paragraph("Employee signature: Signed electronically", info_style))
        story.append(Paragraph(f"Date: {data.get('completed_at', datetime.now().isoformat())}", info_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.read()

def main():
    """Main function to retrieve and save documents"""
    print("🔄 Connecting to Supabase...")
    supabase = init_supabase()
    
    print(f"📥 Retrieving documents for employee: {EMPLOYEE_ID}")
    
    summary = []
    
    try:
        # 1. Retrieve Company Policies
        print("\n1️⃣ Retrieving Company Policies...")
        policies_response = supabase.table('onboarding_form_data').select('*').eq('employee_id', EMPLOYEE_ID).eq('step_id', 'company-policies').execute()
        
        if policies_response.data:
            policies_data = policies_response.data[0]
            pdf_bytes = generate_company_policies_pdf(policies_data)
            
            file_path = OUTPUT_DIR / "company_policies_signed.pdf"
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"✅ Company Policies saved to: {file_path}")
            summary.append({
                'document': 'Company Policies',
                'status': 'Saved',
                'path': str(file_path),
                'completed_at': policies_data.get('completed_at', 'N/A')
            })
        else:
            print("❌ No Company Policies found")
            summary.append({'document': 'Company Policies', 'status': 'Not Found'})
        
        # 2. Retrieve I-9 Form
        print("\n2️⃣ Retrieving I-9 Form...")
        i9_response = supabase.table('i9_forms').select('*').eq('employee_id', EMPLOYEE_ID).execute()
        onboarding_response = supabase.table('onboarding_form_data').select('*').eq('employee_id', EMPLOYEE_ID).eq('step_id', 'i9-complete').execute()
        
        if i9_response.data:
            i9_data = i9_response.data[0]
            onboarding_data = onboarding_response.data[0] if onboarding_response.data else {}
            pdf_bytes = generate_i9_pdf(i9_data, onboarding_data)
            
            file_path = OUTPUT_DIR / "i9_form_complete.pdf"
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"✅ I-9 Form saved to: {file_path}")
            summary.append({
                'document': 'I-9 Form',
                'status': 'Saved',
                'path': str(file_path),
                'section': i9_data.get('section', 'N/A'),
                'signed': i9_data.get('signed', False),
                'completed_at': i9_data.get('completed_at', 'N/A')
            })
        else:
            print("❌ No I-9 Form found")
            summary.append({'document': 'I-9 Form', 'status': 'Not Found'})
        
        # 3. Retrieve W-4 Form
        print("\n3️⃣ Retrieving W-4 Form...")
        # First try w4_forms table
        w4_response = None
        try:
            w4_direct = supabase.table('w4_forms').select('*').eq('employee_id', EMPLOYEE_ID).execute()
            if w4_direct.data:
                w4_response = w4_direct
                print("   Found in w4_forms table")
        except:
            pass
        
        # If not found, check onboarding_form_data
        if not w4_response or not w4_response.data:
            w4_response = supabase.table('onboarding_form_data').select('*').eq('employee_id', EMPLOYEE_ID).eq('step_id', 'w4').execute()
            if w4_response.data:
                print("   Found in onboarding_form_data table")
        
        if w4_response and w4_response.data:
            w4_data = w4_response.data[0]
            pdf_bytes = generate_w4_pdf(w4_data)
            
            file_path = OUTPUT_DIR / "w4_form_2025.pdf"
            with open(file_path, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"✅ W-4 Form saved to: {file_path}")
            summary.append({
                'document': 'W-4 Form',
                'status': 'Saved',
                'path': str(file_path),
                'completed_at': w4_data.get('completed_at', 'N/A')
            })
        else:
            print("❌ No W-4 Form found")
            summary.append({'document': 'W-4 Form', 'status': 'Not Found'})
        
        # Create summary report
        print("\n📊 Creating summary report...")
        report_path = OUTPUT_DIR / "document_summary.txt"
        with open(report_path, 'w') as f:
            f.write("DOCUMENT RETRIEVAL SUMMARY\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Employee ID: {EMPLOYEE_ID}\n")
            f.write(f"Retrieval Date: {datetime.now().isoformat()}\n\n")
            
            for item in summary:
                f.write(f"\n{item['document']}:\n")
                for key, value in item.items():
                    if key != 'document':
                        f.write(f"  {key}: {value}\n")
            
            f.write("\n" + "=" * 50 + "\n")
            f.write("All documents have been saved to: saved_documents/\n")
        
        print(f"✅ Summary report saved to: {report_path}")
        
        print("\n🎉 SUCCESS! All available documents have been retrieved and saved.")
        print(f"📁 Documents saved in: {OUTPUT_DIR.absolute()}")
        
        # Display summary
        print("\n" + "=" * 50)
        print("SUMMARY:")
        print("=" * 50)
        for item in summary:
            status_emoji = "✅" if item['status'] == 'Saved' else "❌"
            print(f"{status_emoji} {item['document']}: {item['status']}")
            if 'path' in item:
                print(f"   📄 {item['path']}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()