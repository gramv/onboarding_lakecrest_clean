#!/usr/bin/env python3
"""Automated test for email functionality"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv(".env")

from app.email_service import EmailService

async def test_email_auto():
    """Test email sending automatically"""
    email_service = EmailService()

    print("=" * 60)
    print("AUTOMATED EMAIL TESTING")
    print("=" * 60)
    print(f"\nEmail Configuration:")
    print(f"  Environment: {email_service.environment}")
    print(f"  Force Dev Mode: {email_service.force_dev_mode}")
    print(f"  Is Configured: {email_service.is_configured}")
    print(f"  SMTP Host: {email_service.smtp_host}:{email_service.smtp_port}")
    print(f"  From Email: {email_service.from_email}")
    print()

    # Test sending approval notification
    print("Testing approval notification email to gthmvemula@gmail.com...")

    try:
        success = await email_service.send_approval_notification(
            applicant_email="gthmvemula@gmail.com",
            applicant_name="Gouthum Vemula",
            property_name="Lakecrest Hotel",
            position="Front Desk Agent",
            job_title="Guest Service Representative",
            start_date="2025-02-01",
            pay_rate=18.50,
            onboarding_link="http://localhost:3000/onboarding/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjllZTU1NWMzLTc5MmMtNGJkZS1hZGMxLThmNzVhMjEzYjBlMCIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1OTAxMDk5MSwiZXhwIjoxNzU5MjcwMTkxLCJqdGkiOiJKblpMMTBfQlM1Q18xNnpRYkJrWmdnIn0.q1igMRpqrh5mNJgTzONt32xBBHGDMvwO0t7aiowC0tc",
            manager_name="HR Manager",
            manager_email="hr@lakecresthotel.com"
        )

        if success:
            print("✅ SUCCESS: Approval notification email sent successfully!")
            print("   Check gthmvemula@gmail.com inbox for the email.")
        else:
            print("❌ FAILED: Email sending failed (returned False)")

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 60)
    print("EMAIL TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_email_auto())