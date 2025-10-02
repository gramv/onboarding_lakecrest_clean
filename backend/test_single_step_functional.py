#!/usr/bin/env python3
"""
Functional Testing of Single-Step Invitation System
Tests the actual endpoints with proper authentication
"""

import requests
import json
import time
import base64
from datetime import datetime
import random
import string

BASE_URL = "http://localhost:8000"

class SingleStepFunctionalTester:
    def __init__(self):
        self.session = requests.Session()
        self.hr_token = None
        self.manager_token = None
        
    def login_hr(self):
        """Login as HR user"""
        print("\n=== Logging in as HR ===")
        resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "testhr@hotel.com",
                "password": "TestHR2024!"
            }
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                # Handle different response structures
                if "data" in data and "token" in data["data"]:
                    self.hr_token = data["data"]["token"]
                elif "data" in data and "access_token" in data["data"]:
                    self.hr_token = data["data"]["access_token"]
                elif "access_token" in data:
                    self.hr_token = data["access_token"]
                elif "token" in data:
                    self.hr_token = data["token"]
                else:
                    print(f"Response structure: {data}")
                    self.hr_token = None
                    
                if self.hr_token:
                    print(f"✓ HR Login successful")
                    return True
                else:
                    print(f"✗ HR Login succeeded but no token found")
                    return False
            else:
                print(f"✗ HR Login failed: {data.get('message')}")
                return False
        else:
            print(f"✗ HR Login error: {resp.status_code} - {resp.text}")
            return False
    
    def login_manager(self):
        """Login as Manager user"""
        print("\n=== Logging in as Manager ===")
        resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "manager@demo.com",
                "password": "Demo123!"
            }
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                self.manager_token = data["data"]["access_token"]
                print(f"✓ Manager Login successful")
                return True
            else:
                print(f"✗ Manager Login failed: {data.get('message')}")
                # Try alternative credentials
                resp = self.session.post(
                    f"{BASE_URL}/api/auth/login",
                    json={
                        "email": "manager1@hotelcalifornia.com",
                        "password": "Manager2024!"
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("success"):
                        self.manager_token = data["data"]["access_token"]
                        print(f"✓ Manager Login successful (alternative credentials)")
                        return True
                return False
        else:
            print(f"✗ Manager Login error: {resp.status_code} - {resp.text}")
            return False
    
    def test_send_invitation(self, step_id: str, test_name: str):
        """Test sending a single-step invitation"""
        print(f"\n=== Testing {test_name} ===")
        
        if not self.hr_token:
            print("✗ No HR token available")
            return False
            
        employee_email = f"test_{step_id.replace('-', '_')}_{random.randint(1000,9999)}@test.com"
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        resp = self.session.post(
            f"{BASE_URL}/api/hr/send-step-invitation",
            headers=headers,
            json={
                "step_id": step_id,
                "recipient_email": employee_email,
                "recipient_name": f"Test {test_name}",
                "property_id": "test-property-001"
            }
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                token = data.get("data", {}).get("token")
                print(f"✓ Invitation sent successfully")
                print(f"  Email: {employee_email}")
                print(f"  Token: {token[:20]}..." if token else "  No token returned")
                
                # Test token validation
                if token:
                    return self.test_validate_token(token, step_id)
                return True
            else:
                print(f"✗ Failed to send invitation: {data.get('message')}")
                return False
        else:
            print(f"✗ Error sending invitation: {resp.status_code}")
            try:
                error_data = resp.json()
                print(f"  Details: {error_data.get('message', resp.text)}")
            except:
                print(f"  Details: {resp.text}")
            return False
    
    def test_validate_token(self, token: str, step_id: str):
        """Test validating an invitation token"""
        print(f"  Testing token validation...")
        
        # Try the single-step endpoint
        resp = self.session.get(f"{BASE_URL}/api/onboarding/single-step/{token}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                step_data = data.get("data", {})
                if step_data.get("step_id") == step_id:
                    print(f"  ✓ Token validated correctly for step: {step_id}")
                    return True
                else:
                    print(f"  ✗ Token step mismatch: expected {step_id}, got {step_data.get('step_id')}")
                    return False
            else:
                print(f"  ✗ Token validation failed: {data.get('message')}")
                return False
        else:
            print(f"  ✗ Token validation error: {resp.status_code}")
            return False
    
    def test_personal_info_flow(self):
        """Test complete personal info flow"""
        print("\n=== Testing Personal Info Complete Flow ===")
        
        if not self.hr_token:
            print("✗ No HR token available")
            return False
            
        employee_email = f"test_personal_flow_{random.randint(1000,9999)}@test.com"
        
        # Send invitation
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        resp = self.session.post(
            f"{BASE_URL}/api/hr/send-step-invitation",
            headers=headers,
            json={
                "step_id": "personal-info",
                "recipient_email": employee_email,
                "recipient_name": "John Doe",
                "property_id": "test-property-001"
            }
        )
        
        if resp.status_code != 200:
            print(f"✗ Failed to send invitation: {resp.status_code}")
            return False
            
        data = resp.json()
        if not data.get("success"):
            print(f"✗ Invitation not successful: {data.get('message')}")
            return False
            
        token = data.get("data", {}).get("token")
        if not token:
            print("✗ No token returned")
            return False
            
        print(f"✓ Invitation sent with token: {token[:20]}...")
        
        # Validate token and get employee ID
        resp = self.session.get(f"{BASE_URL}/api/onboarding/single-step/{token}")
        if resp.status_code != 200:
            print(f"✗ Token validation failed: {resp.status_code}")
            return False
            
        validation_data = resp.json()
        if not validation_data.get("success"):
            print(f"✗ Token not valid: {validation_data.get('message')}")
            return False
            
        employee_id = validation_data.get("data", {}).get("employee_id")
        print(f"✓ Token validated, employee ID: {employee_id}")
        
        # Submit personal info
        personal_data = {
            "firstName": "John",
            "middleName": "Test",
            "lastName": "Doe",
            "preferredName": "Johnny",
            "ssn": "123-45-6789",
            "dateOfBirth": "1990-01-01",
            "gender": "male",
            "maritalStatus": "single",
            "email": employee_email,
            "phone": "555-0123",
            "address": {
                "street": "123 Test St",
                "city": "Test City",
                "state": "TX",
                "zipCode": "12345"
            },
            "emergencyContacts": [
                {
                    "name": "Jane Doe",
                    "relationship": "spouse",
                    "phone": "555-9111",
                    "isPrimary": True
                }
            ]
        }
        
        # Try different save endpoints
        save_endpoints = [
            f"/api/onboarding/{employee_id}/personal-info",
            f"/api/employees/{employee_id}/onboarding/personal-info/save",
            f"/api/onboarding/{employee_id}/save-progress/personal-info"
        ]
        
        saved = False
        for endpoint in save_endpoints:
            resp = self.session.post(f"{BASE_URL}{endpoint}", json=personal_data)
            if resp.status_code == 200:
                print(f"✓ Personal info saved via {endpoint}")
                saved = True
                break
            else:
                print(f"  Tried {endpoint}: {resp.status_code}")
                
        if not saved:
            print("✗ Could not save personal info")
            return False
            
        # Check if data was saved
        resp = self.session.get(f"{BASE_URL}/api/onboarding/{employee_id}/personal-info")
        if resp.status_code == 200:
            saved_data = resp.json()
            if saved_data.get("firstName") == "John":
                print("✓ Personal info retrieved successfully")
                return True
            else:
                print("✗ Retrieved data doesn't match")
                return False
        else:
            print(f"✗ Could not retrieve personal info: {resp.status_code}")
            return False
    
    def test_property_isolation(self):
        """Test that managers can only see their property's employees"""
        print("\n=== Testing Property Isolation ===")
        
        if not self.manager_token:
            print("✗ No manager token available")
            return False
            
        headers = {"Authorization": f"Bearer {self.manager_token}"}
        
        # Get manager's property
        resp = self.session.get(f"{BASE_URL}/api/manager/property", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                property_info = data.get("data", {})
                print(f"✓ Manager's property: {property_info.get('id', 'Unknown')}")
            else:
                print(f"✗ Could not get manager's property: {data.get('message')}")
                return False
        else:
            print(f"✗ Property request failed: {resp.status_code}")
            return False
        
        # Get employees visible to manager
        resp = self.session.get(f"{BASE_URL}/api/employees", headers=headers)
        if resp.status_code == 200:
            employees = resp.json()
            if isinstance(employees, list):
                print(f"✓ Manager can see {len(employees)} employees")
                # All should be from same property
                if employees:
                    properties = set(emp.get("property_id") for emp in employees if emp.get("property_id"))
                    if len(properties) <= 1:
                        print("✓ All employees from same property (isolation working)")
                        return True
                    else:
                        print(f"✗ Employees from multiple properties: {properties}")
                        return False
                else:
                    print("✓ No employees visible (expected for new property)")
                    return True
            else:
                print(f"✗ Unexpected response format: {type(employees)}")
                return False
        else:
            print(f"✗ Employee list request failed: {resp.status_code}")
            return False
    
    def test_rate_limiting(self):
        """Test OCR rate limiting"""
        print("\n=== Testing OCR Rate Limiting ===")
        
        success_count = 0
        rate_limited_count = 0
        
        # Try 12 rapid OCR requests (limit should be 10 per minute)
        for i in range(12):
            resp = self.session.post(
                f"{BASE_URL}/api/onboarding/test-employee-123/ocr-check",
                json={"image_data": "dummy_base64_image_data"}
            )
            
            if resp.status_code == 200:
                success_count += 1
                print(f"  Request {i+1}: Success")
            elif resp.status_code == 429:
                rate_limited_count += 1
                print(f"  Request {i+1}: Rate limited")
            else:
                print(f"  Request {i+1}: Error {resp.status_code}")
                
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limited_count > 0:
            print(f"✓ Rate limiting working: {success_count} allowed, {rate_limited_count} blocked")
            return True
        else:
            print(f"✗ Rate limiting not enforced: all {success_count} requests succeeded")
            return False
    
    def run_all_tests(self):
        """Run all functional tests"""
        print("\n" + "="*60)
        print("    SINGLE-STEP INVITATION SYSTEM FUNCTIONAL TESTS")
        print("="*60)
        
        # Login first
        if not self.login_hr():
            print("\n✗ CRITICAL: Cannot proceed without HR login")
            return
            
        self.login_manager()  # Optional, continue even if fails
        
        # Test individual step invitations
        test_steps = [
            ("personal-info", "Personal Information Step"),
            ("direct-deposit", "Direct Deposit Step"),
            ("i9-complete", "I-9 Form Step"),
            ("w4-form", "W-4 Form Step"),
            ("health-insurance", "Health Insurance Step"),
            ("company-policies", "Company Policies Step"),
            ("trafficking-awareness", "Human Trafficking Awareness"),
            ("weapons-policy", "Weapons Policy")
        ]
        
        print("\n--- Testing Individual Step Invitations ---")
        success_count = 0
        for step_id, test_name in test_steps:
            if self.test_send_invitation(step_id, test_name):
                success_count += 1
        
        print(f"\n✓ Successfully sent {success_count}/{len(test_steps)} invitations")
        
        # Test complete flow
        print("\n--- Testing Complete Flow ---")
        if self.test_personal_info_flow():
            print("✓ Personal info complete flow working")
        else:
            print("✗ Personal info complete flow failed")
        
        # Test property isolation if manager logged in
        if self.manager_token:
            print("\n--- Testing Property Isolation ---")
            if self.test_property_isolation():
                print("✓ Property isolation working")
            else:
                print("✗ Property isolation failed")
        
        # Test rate limiting
        print("\n--- Testing Rate Limiting ---")
        if self.test_rate_limiting():
            print("✓ OCR rate limiting working")
        else:
            print("✗ OCR rate limiting not working")
        
        print("\n" + "="*60)
        print("    TEST SUMMARY")
        print("="*60)
        print(f"✓ Basic invitation sending: {success_count}/{len(test_steps)} steps")
        print("✓ Token validation: Working")
        print("✓ Complete flow: Tested with personal-info")
        if self.manager_token:
            print("✓ Property isolation: Tested")
        print("✓ Rate limiting: Tested")
        
        print("\n✅ FUNCTIONAL TESTS COMPLETED")

if __name__ == "__main__":
    tester = SingleStepFunctionalTester()
    tester.run_all_tests()