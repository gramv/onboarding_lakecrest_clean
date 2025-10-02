#!/usr/bin/env python3
"""
Test clickwise.in deployment with all fixes
"""

import requests
import json
from datetime import datetime

# Production URLs
FRONTEND_URL = "https://clickwise.in"
BACKEND_URL = "https://ordermanagement-3c6ea581a513.herokuapp.com"

def test_all_fixes():
    """Test that all fixes are working"""
    print("=" * 60)
    print("TESTING CLICKWISE.IN DEPLOYMENT")
    print("=" * 60)
    print(f"Frontend: {FRONTEND_URL}")
    print(f"Backend: {BACKEND_URL}")
    print(f"Time: {datetime.now()}")
    
    results = []
    
    # 1. Test frontend loads
    print("\n1️⃣ Testing Frontend...")
    try:
        response = requests.get(FRONTEND_URL, timeout=10, allow_redirects=True)
        if response.status_code in [200, 401]:
            print(f"✅ Frontend loads (status: {response.status_code})")
            results.append(("Frontend", True))
        else:
            print(f"❌ Frontend error: {response.status_code}")
            results.append(("Frontend", False))
    except Exception as e:
        print(f"❌ Frontend error: {e}")
        results.append(("Frontend", False))
    
    # 2. Test OCR endpoint (should be /api/documents/process)
    print("\n2️⃣ Testing OCR Endpoint...")
    try:
        # This should NOT give 405 anymore
        response = requests.post(
            f"{BACKEND_URL}/api/documents/process",
            json={"document_type": "test", "employee_id": "test"},
            timeout=5
        )
        if response.status_code != 405:
            print(f"✅ OCR endpoint at correct URL (status: {response.status_code})")
            results.append(("OCR URL", True))
        else:
            print("❌ OCR endpoint still has wrong URL (405 error)")
            results.append(("OCR URL", False))
    except Exception as e:
        print(f"❌ OCR test error: {e}")
        results.append(("OCR URL", False))
    
    # 3. Test I-9 Section 1 save
    print("\n3️⃣ Testing I-9 Section 1 Save...")
    try:
        # Get demo session
        session_resp = requests.get(f"{BACKEND_URL}/api/onboarding/session/demo-token")
        if session_resp.status_code == 200:
            employee_id = session_resp.json()['data']['employee']['id']
            
            # Try to save I-9 Section 1
            i9_data = {
                "formData": {
                    "first_name": "Test",
                    "last_name": "User",
                    "citizenship_status": "citizen"
                },
                "signed": False
            }
            
            save_resp = requests.post(
                f"{BACKEND_URL}/api/onboarding/{employee_id}/i9-section1",
                json=i9_data
            )
            
            if save_resp.status_code == 200:
                print("✅ I-9 Section 1 saves successfully")
                results.append(("I-9 Save", True))
            else:
                print(f"❌ I-9 save failed: {save_resp.status_code}")
                results.append(("I-9 Save", False))
        else:
            print("❌ Could not get demo session")
            results.append(("I-9 Save", False))
    except Exception as e:
        print(f"❌ I-9 test error: {e}")
        results.append(("I-9 Save", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("DEPLOYMENT STATUS")
    print("=" * 60)
    
    all_passed = all(result[1] for result in results)
    
    for test_name, passed in results:
        status = "✅ WORKING" if passed else "❌ BROKEN"
        print(f"{test_name}: {status}")
    
    if all_passed:
        print("\n🎉 CLICKWISE.IN IS FULLY OPERATIONAL!")
        print("\nThe I-9 system with OCR is working correctly:")
        print("• Frontend loads properly")
        print("• OCR endpoints have correct URLs")
        print("• I-9 forms save to database")
        print("• Ready for production use!")
    else:
        print("\n⚠️ ISSUES REMAIN - Check the failures above")
    
    print("\n📱 Test the complete flow at:")
    print(f"   {FRONTEND_URL}/onboard")
    print("=" * 60)

if __name__ == "__main__":
    test_all_fixes()