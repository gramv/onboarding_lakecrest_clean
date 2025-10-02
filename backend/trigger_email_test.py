#!/usr/bin/env python3
"""
Create a test job application directly and send email notification
"""

import asyncio
import uuid
from datetime import datetime
from app.supabase_service_enhanced import EnhancedSupabaseService, enhanced_supabase_service
from app.email_service import email_service
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def trigger_email_notification():
    """Create test application and send email notification"""
    
    # Create new instance or use singleton
    supabase = EnhancedSupabaseService() if not enhanced_supabase_service else enhanced_supabase_service
    
    print("📝 Creating Test Job Application")
    print("=" * 70)
    
    # Your property ID
    property_id = "ae926aac-eb0f-4616-8629-87898e8b0d70"
    
    # Create test application data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    application_id = str(uuid.uuid4())
    
    # Applicant details go in applicant_data JSON field
    applicant_details = {
        "first_name": "Email",
        "middle_initial": "T",
        "last_name": f"Test_{timestamp}",
        "email": f"test.email.{timestamp}@example.com",
        "phone": "555-0123",
        "address": "123 Test Street",
        "city": "Dallas",
        "state": "TX", 
        "zip_code": "75001",
        "additional_comments": f"Test email notification at {datetime.now().strftime('%I:%M %p')}"
    }
    
    # Main table fields
    application_data = {
        "id": application_id,
        "property_id": property_id,
        "position": "Front Desk Supervisor",
        "department": "Front Desk",
        "status": "pending",
        "applicant_data": applicant_details,  # Store applicant details as JSON
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    print(f"Applicant: {applicant_details['first_name']} {applicant_details['last_name']}")
    print(f"Position: {application_data['position']}")
    print(f"Application ID: {application_id}")
    print()
    
    # Insert into database
    print("💾 Inserting into database...")
    try:
        # Access the client directly
        result = supabase.client.table("job_applications").insert(application_data).execute()
        if result.data:
            print("✅ Application created successfully!")
            print()
            
            # Now send email notification
            print("📧 SENDING EMAIL NOTIFICATION")
            print("=" * 70)
            
            # Get property details
            property_data = await supabase.get_property_by_id(property_id)
            property_name = property_data.name if property_data else "Your Property"
            
            # Get email recipients
            recipients = await supabase.get_email_recipients_by_property(property_id)
            
            print("📬 Recipients who will receive email:")
            to_emails = []
            for recipient in recipients:
                print(f"  ✉️  {recipient['email']} ({recipient['type']})")
                to_emails.append(recipient['email'])
            
            if to_emails:
                print()
                print("📨 Sending email...")
                
                # Create email content
                subject = f"New Job Application - {applicant_details['first_name']} {applicant_details['last_name']}"
                
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background: #2563eb; color: white; padding: 20px; text-align: center; }}
                        .content {{ background: #f9fafb; padding: 20px; margin: 20px 0; }}
                        .info-row {{ margin: 10px 0; }}
                        .label {{ font-weight: bold; color: #374151; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>New Job Application Received</h1>
                        </div>
                        <div class="content">
                            <h2>Application Details</h2>
                            <div class="info-row">
                                <span class="label">Name:</span> {applicant_details['first_name']} {applicant_details['last_name']}
                            </div>
                            <div class="info-row">
                                <span class="label">Position:</span> {application_data['position']}
                            </div>
                            <div class="info-row">
                                <span class="label">Department:</span> {application_data['department']}
                            </div>
                            <div class="info-row">
                                <span class="label">Email:</span> {applicant_details['email']}
                            </div>
                            <div class="info-row">
                                <span class="label">Phone:</span> {applicant_details['phone']}
                            </div>
                            <div class="info-row">
                                <span class="label">Property:</span> {property_name}
                            </div>
                            <div class="info-row">
                                <span class="label">Submitted:</span> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
                            </div>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:3000/manager/applications?highlight={application_id}" 
                               style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                View All Applications
                            </a>
                        </div>
                        <p style="text-align: center; color: #6b7280; font-size: 14px;">
                            Or copy this link: http://localhost:3000/manager/applications?highlight={application_id}
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="text-align: center; color: #9ca3af; font-size: 12px;">
                            This is an automated notification from your Hotel Onboarding System.
                        </p>
                    </div>
                </body>
                </html>
                """
                
                # Send email to all recipients
                for email in to_emails:
                    success = await email_service.send_email(
                        to_email=email,  # Singular, not plural
                        subject=subject,
                        html_content=html_content
                    )
                    if success:
                        print(f"  ✅ Sent to {email}")
                    else:
                        print(f"  ❌ Failed to send to {email}")
                
                if success:
                    print()
                    print("🎉 ✅ EMAIL SENT SUCCESSFULLY!")
                    print("=" * 70)
                    print()
                    print("📬 Emails sent to:")
                    for email in to_emails:
                        print(f"  ✅ {email}")
                    print()
                    print("👀 CHECK YOUR INBOX NOW!")
                    print("   The email should arrive within seconds.")
                    print()
                    print("📨 Email Details:")
                    print(f"  • Subject: {subject}")
                    print("  • From: tech.nj@lakecrest.com")
                    print("  • Via: Gmail SMTP (Production)")
                else:
                    print("❌ Failed to send email")
            else:
                print("❌ No email recipients configured")
                
        else:
            print("❌ Failed to create application")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(trigger_email_notification())