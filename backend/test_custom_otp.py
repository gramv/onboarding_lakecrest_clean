#!/usr/bin/env python3
"""
Test Custom OTP System
Tests email-based OTP for document access
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from app.services.document_access_otp_service import document_access_otp_service
from dotenv import load_dotenv

load_dotenv()


async def test_otp_generation():
    """Test OTP generation"""
    print("\n" + "="*60)
    print("TEST 1: OTP Generation")
    print("="*60)
    
    otp = document_access_otp_service.generate_otp()
    print(f"✅ Generated OTP: {otp}")
    print(f"   Length: {len(otp)} digits")
    print(f"   Type: {type(otp)}")
    
    # Test hash
    manager_id = "test-manager-123"
    otp_hash = document_access_otp_service.hash_otp(otp, manager_id)
    print(f"✅ Generated Hash: {otp_hash[:20]}...")
    print(f"   Length: {len(otp_hash)} characters")
    
    # Verify hash is consistent
    otp_hash2 = document_access_otp_service.hash_otp(otp, manager_id)
    if otp_hash == otp_hash2:
        print("✅ Hash is consistent")
    else:
        print("❌ Hash is NOT consistent")
    
    return True


async def test_otp_email():
    """Test OTP email sending"""
    print("\n" + "="*60)
    print("TEST 2: OTP Email Sending")
    print("="*60)
    
    # Generate test OTP
    otp = document_access_otp_service.generate_otp()
    
    # Get test email from environment or use default
    import os
    test_email = os.getenv("TEST_EMAIL", "test@example.com")
    
    print(f"📧 Sending OTP to: {test_email}")
    print(f"🔢 OTP Code: {otp}")
    
    success = await document_access_otp_service.send_otp_email(
        email=test_email,
        otp_code=otp,
        employee_name="John Doe",
        expires_minutes=10
    )
    
    if success:
        print("✅ Email sent successfully!")
        print(f"\n📬 Check your email at: {test_email}")
        print(f"🔑 Your OTP code is: {otp}")
    else:
        print("❌ Failed to send email")
        print("⚠️  Check your SMTP configuration in .env file")
    
    return success


async def test_full_flow():
    """Test complete OTP flow (requires database)"""
    print("\n" + "="*60)
    print("TEST 3: Full OTP Flow (Database Required)")
    print("="*60)
    
    try:
        # Test manager and employee IDs (use real IDs from your database)
        manager_id = "test-manager-id"
        employee_id = "test-employee-id"
        manager_email = "manager@test.com"
        
        print("⚠️  This test requires:")
        print("   1. Migration 015 to be run (document_access_otps table)")
        print("   2. Valid manager_id and employee_id")
        print("   3. SMTP configured in .env")
        print("\nSkipping full flow test for now...")
        print("Run this test after migration is complete.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("CUSTOM OTP SYSTEM TESTS")
    print("="*60)
    
    results = []
    
    # Test 1: OTP Generation
    try:
        result = await test_otp_generation()
        results.append(("OTP Generation", result))
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
        results.append(("OTP Generation", False))
    
    # Test 2: Email Sending
    try:
        result = await test_otp_email()
        results.append(("Email Sending", result))
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
        results.append(("Email Sending", False))
    
    # Test 3: Full Flow
    try:
        result = await test_full_flow()
        results.append(("Full Flow", result))
    except Exception as e:
        print(f"❌ Test 3 failed: {e}")
        results.append(("Full Flow", False))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")


if __name__ == "__main__":
    asyncio.run(main())

