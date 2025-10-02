#!/usr/bin/env python3
"""
Test script to verify email retry logic and failure handling
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.email_service import email_service

async def test_email_retry():
    """Test email retry functionality"""
    
    print("=" * 60)
    print("EMAIL RETRY LOGIC TEST")
    print("=" * 60)
    
    # Test 1: Valid email with retry logic
    print("\n1. Testing valid email with retry logic...")
    success = await email_service.send_email_with_retry(
        to_email="test@example.com",
        subject="Test Email with Retry",
        html_content="<h1>Test Email</h1><p>This is a test email with retry logic.</p>",
        text_content="Test Email\n\nThis is a test email with retry logic."
    )
    print(f"   Result: {'SUCCESS' if success else 'FAILED'}")
    
    # Test 2: Invalid email format (should fail immediately)
    print("\n2. Testing invalid email format...")
    success = await email_service.send_email_with_retry(
        to_email="invalid-email",
        subject="Test Invalid Email",
        html_content="<p>This should fail validation.</p>",
        text_content="This should fail validation."
    )
    print(f"   Result: {'SUCCESS' if success else 'FAILED (as expected)'}")
    
    # Test 3: Get email statistics
    print("\n3. Email Service Statistics:")
    stats = email_service.get_email_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Test 4: Check failed emails queue
    print("\n4. Failed Emails Queue:")
    failed_emails = await email_service.get_failed_emails(limit=5)
    if failed_emails:
        for email in failed_emails:
            print(f"   - To: {email.get('to_email')}")
            print(f"     Reason: {email.get('reason')}")
            print(f"     Error: {email.get('error')[:50]}...")
            print(f"     Attempts: {email.get('attempts')}")
    else:
        print("   No failed emails in queue")
    
    # Test 5: Test retry of failed email (if any exist)
    if failed_emails:
        print("\n5. Testing retry of first failed email...")
        first_failed = failed_emails[0]
        success = await email_service.retry_failed_email(first_failed.get('id'))
        print(f"   Retry result: {'SUCCESS' if success else 'FAILED'}")
    
    # Test 6: Test batch retry
    print("\n6. Testing batch retry of failed emails...")
    results = await email_service.retry_all_failed(batch_size=3)
    print(f"   Succeeded: {results['succeeded']}")
    print(f"   Failed: {results['failed']}")
    
    print("\n" + "=" * 60)
    print("EMAIL RETRY LOGIC TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_email_retry())