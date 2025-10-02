#!/usr/bin/env python3
"""
End-to-End Onboarding Flow Test
Creates a test application, approves it, and generates a working onboarding link
"""

import asyncio
import json
from datetime import datetime
import httpx
import jwt
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "manager@demo.com"
MANAGER_PASSWORD = "password123"
TEST_APPLICANT = {
    # Personal Information
    "first_name": "Goutam",
    "middle_initial": "R",
    "last_name": "V",
    "email": "goutamramv@gmail.com",
    "phone": "555-0123",
    "phone_is_cell": True,
    "address": "123 Test Street",
    "city": "San Francisco",
    "state": "CA",
    "zip_code": "94102",
    
    # Position Information
    "department": "Technology",
    "position": "Software Engineer",
    "shift_preference": "flexible",
    "desired_hours": 40,
    "start_date": "2025-09-01",
    
    # Employment Information
    "previously_employed": False,
    "eligible_to_work": True,
    "over_18": True,
    "have_transportation": True,
    
    # Additional Information
    "emergency_contact_name": "Emergency Contact",
    "emergency_contact_phone": "555-0456",
    "emergency_contact_relation": "Friend",
    
    # Property
    "property_id": "prop_001"  # Demo Hotel
}

class OnboardingFlowTester:
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=30.0)
        self.manager_token = None
        self.application_id = None
        self.onboarding_token = None
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "steps": [],
            "success": False,
            "onboarding_url": None,
            "errors": []
        }
    
    async def close(self):
        await self.client.aclose()
    
    def log_step(self, step: str, status: str, details: Any = None):
        """Log a test step"""
        entry = {
            "step": step,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
        if details:
            entry["details"] = details
        self.results["steps"].append(entry)
        
        # Print to console
        status_emoji = "✅" if status == "success" else "❌" if status == "error" else "⏳"
        print(f"{status_emoji} {step}: {status}")
        if details and status == "error":
            print(f"   Details: {details}")
    
    async def test_backend_health(self) -> bool:
        """Test backend health"""
        try:
            response = await self.client.get("/healthz")
            if response.status_code == 200:
                self.log_step("Backend Health Check", "success", response.json())
                return True
            else:
                self.log_step("Backend Health Check", "error", f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_step("Backend Health Check", "error", str(e))
            return False
    
    async def manager_login(self) -> bool:
        """Login as manager"""
        try:
            response = await self.client.post("/auth/login", json={
                "email": MANAGER_EMAIL,
                "password": MANAGER_PASSWORD
            })
            
            if response.status_code == 200:
                result = response.json()
                # Extract token from the nested structure
                if "data" in result and "token" in result["data"]:
                    self.manager_token = result["data"]["token"]
                    user_data = result["data"].get("user", {})
                    self.log_step("Manager Login", "success", {
                        "email": MANAGER_EMAIL,
                        "user_id": user_data.get("id"),
                        "role": user_data.get("role")
                    })
                    return True
                else:
                    self.log_step("Manager Login", "error", f"Unexpected response structure: {result}")
                    return False
            else:
                self.log_step("Manager Login", "error", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_step("Manager Login", "error", str(e))
            return False
    
    async def create_application(self) -> bool:
        """Create a job application"""
        try:
            # First check if application already exists via manager endpoint
            check_response = await self.client.get(
                f"/manager/applications",
                headers={"Authorization": f"Bearer {self.manager_token}"}
            )
            
            if check_response.status_code == 200:
                result = check_response.json()
                applications = result.get("data", []) if isinstance(result, dict) else result
                
                # Check if our test applicant already has an application
                for app in applications:
                    if app.get("email") == TEST_APPLICANT["email"]:
                        self.application_id = app["id"]
                        self.log_step("Found Existing Application", "success", {
                            "application_id": self.application_id,
                            "status": app.get("status"),
                            "applicant": app.get("full_name")
                        })
                        
                        # If already approved, get the token
                        if app.get("status") == "approved" and app.get("onboarding_token"):
                            self.onboarding_token = app.get("onboarding_token")
                        return True
            
            # Create new application using the submit endpoint
            # The endpoint expects property_id in the path
            # Remove property_id from the data being sent
            application_data = {k: v for k, v in TEST_APPLICANT.items() if k != "property_id"}
            response = await self.client.post(
                f"/apply/{TEST_APPLICANT['property_id']}", 
                json=application_data
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                # Extract application ID from response
                if isinstance(result, dict):
                    if "data" in result:
                        data = result["data"]
                        self.application_id = data.get("id") or data.get("application_id")
                    else:
                        self.application_id = result.get("id") or result.get("application_id")
                
                full_name = f"{TEST_APPLICANT['first_name']} {TEST_APPLICANT['last_name']}"
                self.log_step("Create Application", "success", {
                    "application_id": self.application_id,
                    "applicant": full_name,
                    "email": TEST_APPLICANT["email"],
                    "position": TEST_APPLICANT["position"]
                })
                return True
            else:
                self.log_step("Create Application", "error", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_step("Create Application", "error", str(e))
            return False
    
    async def approve_application(self) -> bool:
        """Approve the application as manager"""
        try:
            # If we already have a token from finding an existing approved application
            if self.onboarding_token:
                self.log_step("Application Already Approved", "success", {
                    "application_id": self.application_id,
                    "onboarding_token": self.onboarding_token[:20] + "..." if self.onboarding_token else None
                })
                return True
            
            # Approve the application using the correct endpoint (POST not PUT)
            response = await self.client.post(
                f"/applications/{self.application_id}/approve",
                headers={"Authorization": f"Bearer {self.manager_token}"},
                data={"manager_notes": "Approved for testing"}  # Using form data, not JSON
            )
            
            if response.status_code == 200:
                result = response.json()
                # Extract token from response
                if isinstance(result, dict):
                    if "data" in result:
                        data = result["data"]
                        self.onboarding_token = data.get("onboarding_token") or data.get("token")
                        email_sent = data.get("email_sent", False)
                    else:
                        self.onboarding_token = result.get("onboarding_token") or result.get("token")
                        email_sent = result.get("email_sent", False)
                
                self.log_step("Approve Application", "success", {
                    "application_id": self.application_id,
                    "onboarding_token": self.onboarding_token[:20] + "..." if self.onboarding_token else None,
                    "email_sent": email_sent
                })
                return True
            else:
                self.log_step("Approve Application", "error", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_step("Approve Application", "error", str(e))
            return False
    
    async def verify_token(self) -> bool:
        """Verify the onboarding token works"""
        try:
            if not self.onboarding_token:
                self.log_step("Verify Token", "error", "No onboarding token available")
                return False
            
            # Test the welcome endpoint with token
            response = await self.client.get(
                f"/onboarding/welcome",
                params={"token": self.onboarding_token}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_step("Verify Onboarding Token", "success", {
                    "employee_name": data.get("employee_name"),
                    "property_name": data.get("property_name"),
                    "position": data.get("position"),
                    "token_valid": True
                })
                return True
            else:
                self.log_step("Verify Onboarding Token", "error", f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_step("Verify Onboarding Token", "error", str(e))
            return False
    
    async def test_email_content(self) -> bool:
        """Test what the approval email would contain"""
        try:
            # Construct the onboarding URL as it would appear in the email
            onboarding_url = f"http://localhost:3000/onboard?token={self.onboarding_token}"
            
            # Decode token to get details
            try:
                decoded = jwt.decode(self.onboarding_token, options={"verify_signature": False})
                self.log_step("Email Content Test", "success", {
                    "recipient": TEST_APPLICANT["email"],
                    "subject": "Welcome to Demo Hotel - Complete Your Onboarding",
                    "onboarding_url": onboarding_url,
                    "token_expires": decoded.get("exp"),
                    "employee_id": decoded.get("employee_id"),
                    "property_id": decoded.get("property_id")
                })
                return True
            except Exception as e:
                self.log_step("Email Content Test", "warning", f"Could not decode token: {e}")
                return True
        except Exception as e:
            self.log_step("Email Content Test", "error", str(e))
            return False
    
    async def run_full_test(self):
        """Run the complete end-to-end test"""
        print("\n" + "="*60)
        print("🚀 STARTING END-TO-END ONBOARDING FLOW TEST")
        print("="*60 + "\n")
        
        try:
            # Step 1: Health check
            if not await self.test_backend_health():
                self.results["errors"].append("Backend not healthy")
                return
            
            # Step 2: Manager login
            if not await self.manager_login():
                self.results["errors"].append("Manager login failed")
                return
            
            # Step 3: Create application
            if not await self.create_application():
                self.results["errors"].append("Failed to create application")
                return
            
            # Step 4: Approve application
            if not await self.approve_application():
                self.results["errors"].append("Failed to approve application")
                return
            
            # Step 5: Verify token
            if not await self.verify_token():
                self.results["errors"].append("Token verification failed")
                return
            
            # Step 6: Test email content
            await self.test_email_content()
            
            # Generate the final onboarding URL
            self.results["onboarding_url"] = f"http://localhost:3000/onboard?token={self.onboarding_token}"
            self.results["success"] = True
            
            # Print summary
            print("\n" + "="*60)
            print("✅ TEST COMPLETED SUCCESSFULLY!")
            print("="*60)
            full_name = f"{TEST_APPLICANT['first_name']} {TEST_APPLICANT['last_name']}"
            print(f"\n📧 Test Applicant: {full_name}")
            print(f"📧 Email: {TEST_APPLICANT['email']}")
            print(f"🏢 Property: Demo Hotel")
            print(f"💼 Position: {TEST_APPLICANT['position']}")
            print(f"\n🔑 Application ID: {self.application_id}")
            print(f"\n🎫 Onboarding Token (first 50 chars):")
            print(f"   {self.onboarding_token[:50]}...")
            print(f"\n🔗 WORKING ONBOARDING URL:")
            print(f"   {self.results['onboarding_url']}")
            print("\n📝 Instructions:")
            print("   1. Copy the URL above")
            print("   2. Open it in your browser")
            print(f"   3. You should see the welcome page for {full_name}")
            print("   4. Click 'Start Onboarding' to begin the process")
            print("\n" + "="*60)
            
        except Exception as e:
            self.results["errors"].append(f"Unexpected error: {str(e)}")
            print(f"\n❌ Test failed with error: {e}")
        
        finally:
            await self.close()
            
            # Save results to file
            with open("e2e_test_results.json", "w") as f:
                json.dump(self.results, f, indent=2)
            print(f"\n📊 Full test results saved to: e2e_test_results.json")

async def main():
    tester = OnboardingFlowTester()
    await tester.run_full_test()

if __name__ == "__main__":
    asyncio.run(main())