#!/usr/bin/env python
"""Test email sending functionality"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv(".env")

from app.email_service import EmailService

async def test_email():
    """Test sending a simple email"""
    email_service = EmailService()

    print(f"Email Configuration:")
    print(f"  SMTP Host: {email_service.smtp_host}")
    print(f"  SMTP Port: {email_service.smtp_port}")
    print(f"  SMTP Username: {email_service.smtp_username}")
    print(f"  From Email: {email_service.from_email}")
    print(f"  Is Configured: {email_service.is_configured}")
    print(f"  Environment: {email_service.environment}")
    print(f"  Force Dev Mode: {email_service.force_dev_mode}")
    print()

    # Test sending an email
    test_email_address = input("Enter email address to test (or press Enter to skip): ").strip()

    if test_email_address:
        print(f"\nSending test email to {test_email_address}...")

        success = await email_service.send_email(
            to_email=test_email_address,
            subject="Test Email - Hotel Onboarding System",
            html_content="""
                <h2>Test Email</h2>
                <p>This is a test email from the Hotel Onboarding System.</p>
                <p>If you received this email, the email configuration is working correctly!</p>
            """,
            text_content="Test email from Hotel Onboarding System. Configuration is working!"
        )

        if success:
            print("✅ Email sent successfully!")
        else:
            print("❌ Failed to send email")
    else:
        print("\nSkipping email test")

    # Test approval notification
    print("\n" + "="*50)
    print("Testing Approval Notification Email")
    print("="*50)

    test_approval = input("Test approval notification? (y/n): ").strip().lower()

    if test_approval == 'y':
        recipient = input("Enter recipient email: ").strip()
        if recipient:
            success = await email_service.send_approval_notification(
                applicant_email=recipient,
                applicant_name="John Doe",
                property_name="Grand Hotel",
                position="Front Desk Agent",
                job_title="Guest Service Representative",
                start_date="2025-02-01",
                pay_rate=18.50,
                onboarding_link="http://localhost:3000/onboarding/test-token",
                manager_name="Jane Manager",
                manager_email="manager@grandhotel.com"
            )

            if success:
                print("✅ Approval notification sent successfully!")
            else:
                print("❌ Failed to send approval notification")

if __name__ == "__main__":
    asyncio.run(test_email())