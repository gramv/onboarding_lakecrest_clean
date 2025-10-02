#!/usr/bin/env python3
"""
Task 2.8: CHECKPOINT Beta - End-to-End Application Test
This is a critical checkpoint testing the complete workflow:
1. Manager logs in (manager@demo.com)
2. Views pending applications 
3. Approves an application
4. Onboarding token is generated
5. Employee can access /onboard?token={jwt}
6. Full workflow functions without errors
"""

import asyncio
import requests
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
import time

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# Test colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
CYAN = "\033[96m"
RESET = "\033[0m"

def print_test_header(test_name: str):
    """Print a formatted test header"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")

def print_success(message: str):
    """Print success message"""
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message: str):
    """Print error message"""
    print(f"{RED}✗ {message}{RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"{YELLOW}ℹ {message}{RESET}")
    
def print_step(step_num: int, message: str):
    """Print step progress"""
    print(f"\n{CYAN}[Step {step_num}] {message}{RESET}")

def print_json(data: Any, title: str = ""):
    """Pretty print JSON data"""
    if title:
        print(f"\n{BLUE}{title}:{RESET}")
    print(json.dumps(data, indent=2, default=str))

class EndToEndWorkflowTester:
    def __init__(self):
        self.manager_token = None
        self.onboarding_token = None
        self.application_id = None
        self.employee_id = None
        self.session_id = None
        self.test_results = {}
        
    def step1_manager_login(self) -> bool:
        """Step 1: Manager logs in"""
        print_step(1, "Manager Login")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": "manager@demo.com",
                    "password": "Password123!"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract token from nested structure
                if "data" in data and isinstance(data["data"], dict):
                    self.manager_token = data["data"].get("token")
                    user_info = data["data"].get("user", {})
                else:
                    # Fallback for flat structure
                    self.manager_token = data.get("token") or data.get("access_token")
                    user_info = data.get("user", {})
                
                print_success(f"Manager logged in successfully")
                print_info(f"Manager email: manager@demo.com")
                if self.manager_token:
                    print_info(f"Token received (truncated): {self.manager_token[:30]}...")
                else:
                    print_error("No token in response!")
                    print_json(data, "Login Response")
                
                # Try to get user info
                if user_info:
                    print_info(f"Manager: {user_info.get('first_name', '')} {user_info.get('last_name', '')}")
                    print_info(f"Role: {user_info.get('role', 'N/A')}")
                
                return True
            else:
                print_error(f"Login failed with status {response.status_code}")
                if response.text:
                    print_error(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Login request failed: {e}")
            return False
    
    def step2_view_applications(self) -> bool:
        """Step 2: View pending applications"""
        print_step(2, "View Pending Applications")
        
        if not self.manager_token:
            print_error("No manager token available")
            return False
            
        try:
            response = requests.get(
                f"{BASE_URL}/manager/applications",
                headers={"Authorization": f"Bearer {self.manager_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract applications from nested structure
                if "data" in data and isinstance(data.get("data"), list):
                    applications = data["data"]
                elif "applications" in data:
                    applications = data["applications"]
                elif isinstance(data, list):
                    applications = data
                else:
                    applications = []
                
                if isinstance(applications, list):
                    pending_apps = [app for app in applications if app.get("status") == "pending"]
                    print_success(f"Retrieved {len(applications)} total applications")
                    print_info(f"Pending applications: {len(pending_apps)}")
                    
                    if pending_apps:
                        # Show first pending application
                        app = pending_apps[0]
                        print_info(f"First pending application:")
                        print_info(f"  - ID: {app.get('id', 'N/A')}")
                        print_info(f"  - Name: {app.get('first_name', '')} {app.get('last_name', '')}")
                        print_info(f"  - Email: {app.get('email', 'N/A')}")
                        print_info(f"  - Position: {app.get('position', 'N/A')}")
                        
                        self.application_id = app.get('id')
                        return True
                    else:
                        print_error("No pending applications found")
                        
                        # Create a test application if none exist
                        print_info("Creating test application...")
                        if self.create_test_application():
                            return self.step2_view_applications()  # Retry after creating
                        return False
                else:
                    print_error(f"Unexpected response format: {type(applications)}")
                    return False
                    
            else:
                print_error(f"Failed to get applications: {response.status_code}")
                if response.text:
                    print_error(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Request failed: {e}")
            return False
    
    def create_test_application(self) -> bool:
        """Create a test application for approval"""
        try:
            # Submit a test job application (no auth needed for public endpoint)
            test_app_data = {
                "property_id": "85837d95-1595-4322-b291-fd130cff17c1",  # Demo Hotel
                "first_name": "Test",
                "last_name": f"Applicant{datetime.now().strftime('%H%M%S')}",
                "email": f"test.applicant{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
                "phone": "555-0100",
                "position": "Front Desk",
                "availability": "immediate",
                "experience_years": "2",
                "emergency_contact_name": "Emergency Contact",
                "emergency_contact_phone": "555-0101",
                "emergency_contact_relationship": "Friend"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/apply",
                json=test_app_data
            )
            
            if response.status_code in [200, 201]:
                print_success("Test application created successfully")
                return True
            else:
                print_error(f"Failed to create test application: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Failed to create test application: {e}")
            return False
    
    def step3_approve_application(self) -> bool:
        """Step 3: Approve an application"""
        print_step(3, "Approve Application")
        
        if not self.application_id:
            print_error("No application ID available")
            return False
            
        try:
            # Prepare approval data
            approval_data = {
                "job_title": "Front Desk Agent",
                "start_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                "start_time": "09:00 AM",
                "pay_rate": 15.00,
                "pay_frequency": "hourly",
                "benefits_eligible": "yes",
                "supervisor": "John Manager",
                "special_instructions": "Welcome to the team!"
            }
            
            print_info(f"Approving application: {self.application_id}")
            
            response = requests.post(
                f"{BASE_URL}/applications/{self.application_id}/approve",
                data=approval_data,  # Form data, not JSON
                headers={"Authorization": f"Bearer {self.manager_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Application approved successfully")
                
                # Extract data from nested structure
                if "data" in data and isinstance(data["data"], dict):
                    approval_data = data["data"]
                else:
                    approval_data = data
                
                # Extract onboarding token
                if "onboarding_token" in approval_data:
                    self.onboarding_token = approval_data["onboarding_token"]
                    print_success(f"Onboarding token received")
                    print_info(f"Token (truncated): {self.onboarding_token[:50]}...")
                    
                if "employee_id" in approval_data:
                    self.employee_id = approval_data["employee_id"]
                    print_info(f"Employee ID: {self.employee_id}")
                    
                if "onboarding_url" in approval_data:
                    print_info(f"Onboarding URL: {approval_data['onboarding_url']}")
                    
                return True
            else:
                print_error(f"Approval failed: {response.status_code}")
                if response.text:
                    print_error(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Approval request failed: {e}")
            return False
    
    def step4_verify_token_generation(self) -> bool:
        """Step 4: Verify onboarding token was generated"""
        print_step(4, "Verify Token Generation")
        
        if not self.onboarding_token:
            print_error("No onboarding token was generated")
            return False
            
        print_success("Onboarding token exists")
        print_info(f"Token length: {len(self.onboarding_token)} characters")
        
        # Verify token format (should be a random string, not a JWT)
        if "." in self.onboarding_token:
            print_info("Token appears to be JWT format")
        else:
            print_info("Token is session-based (stored in database)")
            
        return True
    
    def step5_access_onboarding_portal(self) -> bool:
        """Step 5: Test employee can access onboarding portal"""
        print_step(5, "Access Onboarding Portal")
        
        if not self.onboarding_token:
            print_error("No onboarding token available")
            return False
            
        try:
            # Test the onboarding welcome endpoint
            response = requests.get(
                f"{BASE_URL}/api/onboarding/welcome/{self.onboarding_token}"
            )
            
            if response.status_code == 200:
                data = response.json()
                print_success("Onboarding portal accessible")
                
                # Verify response contains expected data
                if "employee" in data:
                    emp = data["employee"]
                    print_info(f"Employee: {emp.get('first_name', '')} {emp.get('last_name', '')}")
                    print_info(f"Email: {emp.get('email', 'N/A')}")
                    
                if "property" in data:
                    prop = data["property"]
                    print_info(f"Property: {prop.get('name', 'N/A')}")
                    
                if "session_id" in data:
                    self.session_id = data["session_id"]
                    print_info(f"Session ID: {self.session_id}")
                    
                if "language" in data:
                    print_info(f"Language: {data['language']}")
                    
                # Build and display the frontend URL
                frontend_url = f"{FRONTEND_URL}/onboard?token={self.onboarding_token}"
                print_success(f"Employee can access: {frontend_url}")
                
                return True
            else:
                print_error(f"Failed to access onboarding portal: {response.status_code}")
                if response.text:
                    print_error(f"Error: {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Portal access failed: {e}")
            return False
    
    def step6_verify_full_workflow(self) -> bool:
        """Step 6: Verify full workflow functions without errors"""
        print_step(6, "Verify Full Workflow")
        
        print_info("Checking all components...")
        
        # Check manager access
        if self.manager_token:
            print_success("✓ Manager authentication working")
        else:
            print_error("✗ Manager authentication failed")
            
        # Check application management
        if self.application_id:
            print_success("✓ Application management working")
        else:
            print_error("✗ Application management failed")
            
        # Check approval process
        if self.onboarding_token:
            print_success("✓ Approval process working")
        else:
            print_error("✗ Approval process failed")
            
        # Check onboarding portal
        if self.session_id:
            print_success("✓ Onboarding portal working")
        else:
            print_error("✗ Onboarding portal failed")
            
        # Overall status
        all_working = all([
            self.manager_token,
            self.application_id,
            self.onboarding_token,
            self.session_id
        ])
        
        if all_working:
            print_success("✓ Full workflow functioning without errors")
        else:
            print_error("✗ Some workflow components failed")
            
        return all_working
    
    def run_full_test(self) -> bool:
        """Run the complete end-to-end test"""
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}TASK 2.8: CHECKPOINT BETA - END-TO-END TEST{RESET}")
        print(f"{BLUE}{'='*70}{RESET}")
        
        # Track results for each step
        steps = [
            ("Manager Login", self.step1_manager_login),
            ("View Applications", self.step2_view_applications),
            ("Approve Application", self.step3_approve_application),
            ("Verify Token Generation", self.step4_verify_token_generation),
            ("Access Onboarding Portal", self.step5_access_onboarding_portal),
            ("Verify Full Workflow", self.step6_verify_full_workflow)
        ]
        
        results = {}
        
        for step_name, step_func in steps:
            try:
                results[step_name] = step_func()
                if not results[step_name]:
                    print_error(f"Step failed: {step_name}")
                    # Continue with other steps to see full picture
            except Exception as e:
                print_error(f"Step {step_name} raised exception: {e}")
                results[step_name] = False
        
        # Print final summary
        print(f"\n{BLUE}{'='*70}{RESET}")
        print(f"{BLUE}CHECKPOINT BETA - TEST SUMMARY{RESET}")
        print(f"{BLUE}{'='*70}{RESET}")
        
        total_steps = len(results)
        passed_steps = sum(1 for v in results.values() if v)
        
        for step_name, passed in results.items():
            status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
            print(f"  {step_name}: {status}")
        
        print(f"\n{BLUE}Overall: {passed_steps}/{total_steps} steps passed{RESET}")
        
        if passed_steps == total_steps:
            print(f"\n{GREEN}{'='*70}{RESET}")
            print(f"{GREEN}✓ CHECKPOINT BETA PASSED - System Ready for Beta Testing!{RESET}")
            print(f"{GREEN}{'='*70}{RESET}")
            
            # Print access information
            print(f"\n{CYAN}System Access Information:{RESET}")
            print(f"  Manager Portal: {FRONTEND_URL}/manager")
            print(f"  Manager Login: manager@demo.com / Password123!")
            if self.onboarding_token:
                print(f"  Employee Onboarding: {FRONTEND_URL}/onboard?token={self.onboarding_token}")
            print(f"  API Documentation: {BASE_URL}/docs")
            
            return True
        else:
            print(f"\n{RED}{'='*70}{RESET}")
            print(f"{RED}✗ CHECKPOINT BETA FAILED - Issues Need Resolution{RESET}")
            print(f"{RED}{'='*70}{RESET}")
            
            # List failed components
            failed = [k for k, v in results.items() if not v]
            if failed:
                print(f"\n{YELLOW}Failed Components:{RESET}")
                for component in failed:
                    print(f"  - {component}")
            
            return False

if __name__ == "__main__":
    tester = EndToEndWorkflowTester()
    success = tester.run_full_test()
    exit(0 if success else 1)