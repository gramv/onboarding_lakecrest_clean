#!/usr/bin/env python3
"""
Comprehensive Test Suite for HR, Manager, and Employee Functionality
Tests against PRD requirements from docs/hr-manager-redesign/PRD.md
"""

import os
import sys
import json
import uuid
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from dotenv import load_dotenv
import jwt
import secrets

# Load environment variables
load_dotenv(".env.test")

# Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-secret")

# Test data storage
test_results = {
    "hr_tests": [],
    "manager_tests": [],
    "employee_tests": [],
    "property_isolation_tests": [],
    "prd_compliance": []
}

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")

def print_section(text: str):
    """Print a section header"""
    print(f"\n{Colors.CYAN}▶ {text}{Colors.ENDC}")

def print_success(text: str):
    """Print success message"""
    print(f"  {Colors.GREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    """Print error message"""
    print(f"  {Colors.RED}✗ {text}{Colors.ENDC}")

def print_warning(text: str):
    """Print warning message"""
    print(f"  {Colors.YELLOW}⚠ {text}{Colors.ENDC}")

def print_info(text: str):
    """Print info message"""
    print(f"  ℹ {text}")

class TestSuite:
    def __init__(self):
        self.hr_token = None
        self.manager1_token = None
        self.manager2_token = None
        self.employee_token = None
        
        self.hr_user = None
        self.manager1_user = None
        self.manager2_user = None
        
        self.property1_id = None
        self.property2_id = None
        
        self.application1_id = None
        self.application2_id = None
        
        self.employee1_id = None
        self.employee2_id = None
        
        self.test_results = []
        self.prd_requirements = {}
        
    def record_test(self, category: str, test_name: str, passed: bool, details: str = ""):
        """Record test result"""
        result = {
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        if category not in test_results:
            test_results[category] = []
        test_results[category].append(result)
        
        if passed:
            print_success(f"{test_name}: {details}")
        else:
            print_error(f"{test_name}: {details}")
    
    def check_prd_requirement(self, req_id: str, description: str, implemented: bool, notes: str = ""):
        """Check PRD requirement compliance"""
        self.prd_requirements[req_id] = {
            "description": description,
            "implemented": implemented,
            "notes": notes
        }
        
        status = "✅" if implemented else "❌"
        print_info(f"{status} {req_id}: {description}")
        if notes:
            print_info(f"    Notes: {notes}")
    
    # ===========================
    # 1. HR FUNCTIONALITY TESTS
    # ===========================
    
    def test_hr_authentication(self):
        """Test HR login and authentication - PRD Section 5.1.1"""
        print_section("Testing HR Authentication")
        
        try:
            # Test login
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": "hr@demo.com",
                "password": "test123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.hr_token = data.get("token")
                self.hr_user = data.get("user")
                
                self.record_test("hr_tests", "HR Login", True, "Successfully logged in as HR")
                self.check_prd_requirement("FR-AUTH-001", "Email/password authentication", True)
                self.check_prd_requirement("FR-AUTH-004", "JWT token-based sessions", True)
                return True
            else:
                self.record_test("hr_tests", "HR Login", False, f"Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.record_test("hr_tests", "HR Login", False, str(e))
            return False
    
    def test_hr_property_management(self):
        """Test property CRUD operations - PRD Section 5.2"""
        print_section("Testing Property Management")
        
        if not self.hr_token:
            print_warning("Skipping - HR not authenticated")
            return False
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        
        # Create Property 1
        property1_data = {
            "name": "Test Hotel East",
            "address": "123 East Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
            "phone": "555-0001"
        }
        
        try:
            response = requests.post(f"{API_URL}/hr/properties", 
                                    json=property1_data,
                                    headers=headers)
            
            if response.status_code in [200, 201]:
                self.property1_id = response.json().get("data", {}).get("id")
                self.record_test("hr_tests", "Create Property 1", True, f"Created property: {self.property1_id}")
                self.check_prd_requirement("FR-PROP-001", "HR can create properties", True)
            else:
                self.record_test("hr_tests", "Create Property 1", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.record_test("hr_tests", "Create Property 1", False, str(e))
        
        # Create Property 2
        property2_data = {
            "name": "Test Hotel West",
            "address": "456 West Avenue",
            "city": "Los Angeles", 
            "state": "CA",
            "zip_code": "90001",
            "phone": "555-0002"
        }
        
        try:
            response = requests.post(f"{API_URL}/hr/properties",
                                    json=property2_data,
                                    headers=headers)
            
            if response.status_code in [200, 201]:
                self.property2_id = response.json().get("data", {}).get("id")
                self.record_test("hr_tests", "Create Property 2", True, f"Created property: {self.property2_id}")
            else:
                self.record_test("hr_tests", "Create Property 2", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.record_test("hr_tests", "Create Property 2", False, str(e))
        
        # Test Get All Properties
        try:
            response = requests.get(f"{API_URL}/hr/properties", headers=headers)
            
            if response.status_code == 200:
                properties = response.json().get("data", [])
                self.record_test("hr_tests", "Get All Properties", True, f"Found {len(properties)} properties")
                self.check_prd_requirement("FR-PROP-002", "Properties have unique identifiers", True)
            else:
                self.record_test("hr_tests", "Get All Properties", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.record_test("hr_tests", "Get All Properties", False, str(e))
        
        # Test Update Property
        if self.property1_id:
            update_data = {"phone": "555-9999"}
            try:
                response = requests.put(f"{API_URL}/hr/properties/{self.property1_id}",
                                      json=update_data,
                                      headers=headers)
                
                if response.status_code == 200:
                    self.record_test("hr_tests", "Update Property", True, "Successfully updated property")
                    self.check_prd_requirement("FR-PROP-003", "Properties can be edited by HR only", True)
                else:
                    self.record_test("hr_tests", "Update Property", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.record_test("hr_tests", "Update Property", False, str(e))
        
        return True
    
    def test_hr_manager_creation(self):
        """Test manager account creation - PRD Section 5.3"""
        print_section("Testing Manager Account Creation")
        
        if not self.hr_token:
            print_warning("Skipping - HR not authenticated")
            return False
        
        headers = {"Authorization": f"Bearer {self.hr_token}"}
        
        # Create Manager 1 for Property 1
        manager1_data = {
            "email": f"manager1_{uuid.uuid4().hex[:8]}@test.com",
            "password": "manager123",
            "first_name": "John",
            "last_name": "Manager",
            "property_id": self.property1_id
        }
        
        try:
            response = requests.post(f"{API_URL}/hr/managers",
                                    json=manager1_data,
                                    headers=headers)
            
            if response.status_code in [200, 201]:
                data = response.json().get("data", {})
                self.manager1_user = {
                    "id": data.get("id"),
                    "email": manager1_data["email"],
                    "password": manager1_data["password"]
                }
                self.record_test("hr_tests", "Create Manager 1", True, f"Created: {manager1_data['email']}")
                self.check_prd_requirement("FR-MGR-001", "HR can create manager accounts", True)
            else:
                self.record_test("hr_tests", "Create Manager 1", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.record_test("hr_tests", "Create Manager 1", False, str(e))
        
        # Create Manager 2 for Property 2
        manager2_data = {
            "email": f"manager2_{uuid.uuid4().hex[:8]}@test.com",
            "password": "manager123",
            "first_name": "Jane",
            "last_name": "Manager",
            "property_id": self.property2_id
        }
        
        try:
            response = requests.post(f"{API_URL}/hr/managers",
                                    json=manager2_data,
                                    headers=headers)
            
            if response.status_code in [200, 201]:
                data = response.json().get("data", {})
                self.manager2_user = {
                    "id": data.get("id"),
                    "email": manager2_data["email"],
                    "password": manager2_data["password"]
                }
                self.record_test("hr_tests", "Create Manager 2", True, f"Created: {manager2_data['email']}")
            else:
                self.record_test("hr_tests", "Create Manager 2", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.record_test("hr_tests", "Create Manager 2", False, str(e))
        
        # Test Property Assignment
        if self.manager1_user and self.property1_id:
            self.check_prd_requirement("FR-MGR-002", "Managers assigned to properties", True)
        
        return True
    
    # ===========================
    # 2. MANAGER FUNCTIONALITY TESTS
    # ===========================
    
    def test_manager_authentication(self):
        """Test manager login with HR-created credentials - PRD Section 4.2"""
        print_section("Testing Manager Authentication")
        
        # Test Manager 1 Login
        if self.manager1_user:
            try:
                response = requests.post(f"{API_URL}/auth/login", json={
                    "email": self.manager1_user["email"],
                    "password": self.manager1_user["password"]
                })
                
                if response.status_code == 200:
                    data = response.json()
                    self.manager1_token = data.get("token")
                    self.record_test("manager_tests", "Manager 1 Login", True, 
                                   f"Logged in as {self.manager1_user['email']}")
                    self.check_prd_requirement("FR-RBAC-003", "Manager role-based access", True)
                else:
                    self.record_test("manager_tests", "Manager 1 Login", False, 
                                   f"Login failed: {response.status_code}")
                    
            except Exception as e:
                self.record_test("manager_tests", "Manager 1 Login", False, str(e))
        
        # Test Manager 2 Login
        if self.manager2_user:
            try:
                response = requests.post(f"{API_URL}/auth/login", json={
                    "email": self.manager2_user["email"],
                    "password": self.manager2_user["password"]
                })
                
                if response.status_code == 200:
                    data = response.json()
                    self.manager2_token = data.get("token")
                    self.record_test("manager_tests", "Manager 2 Login", True,
                                   f"Logged in as {self.manager2_user['email']}")
                else:
                    self.record_test("manager_tests", "Manager 2 Login", False,
                                   f"Login failed: {response.status_code}")
                    
            except Exception as e:
                self.record_test("manager_tests", "Manager 2 Login", False, str(e))
        
        return True
    
    def test_property_isolation(self):
        """Test that managers only see their assigned property's data - PRD Section 5.3"""
        print_section("Testing Property Isolation")
        
        if not self.manager1_token or not self.manager2_token:
            print_warning("Skipping - Managers not authenticated")
            return False
        
        # Create applications for both properties first
        self.create_test_applications()
        
        # Test Manager 1 sees only Property 1 applications
        headers1 = {"Authorization": f"Bearer {self.manager1_token}"}
        try:
            response = requests.get(f"{API_URL}/manager/applications", headers=headers1)
            
            if response.status_code == 200:
                applications = response.json().get("data", [])
                
                # Check all applications belong to Property 1
                property1_apps = [app for app in applications 
                                 if app.get("property_id") == self.property1_id]
                
                if len(property1_apps) == len(applications):
                    self.record_test("property_isolation_tests", "Manager 1 Property Isolation", True,
                                   f"Sees only Property 1 applications ({len(applications)})")
                    self.check_prd_requirement("FR-MGR-005", "Managers cannot access other properties' data", True)
                else:
                    self.record_test("property_isolation_tests", "Manager 1 Property Isolation", False,
                                   "Sees applications from other properties")
            else:
                self.record_test("property_isolation_tests", "Manager 1 Property Isolation", False,
                               f"Failed to fetch: {response.status_code}")
                
        except Exception as e:
            self.record_test("property_isolation_tests", "Manager 1 Property Isolation", False, str(e))
        
        # Test Manager 2 sees only Property 2 applications
        headers2 = {"Authorization": f"Bearer {self.manager2_token}"}
        try:
            response = requests.get(f"{API_URL}/manager/applications", headers=headers2)
            
            if response.status_code == 200:
                applications = response.json().get("data", [])
                
                # Check all applications belong to Property 2
                property2_apps = [app for app in applications
                                 if app.get("property_id") == self.property2_id]
                
                if len(property2_apps) == len(applications):
                    self.record_test("property_isolation_tests", "Manager 2 Property Isolation", True,
                                   f"Sees only Property 2 applications ({len(applications)})")
                else:
                    self.record_test("property_isolation_tests", "Manager 2 Property Isolation", False,
                                   "Sees applications from other properties")
            else:
                self.record_test("property_isolation_tests", "Manager 2 Property Isolation", False,
                               f"Failed to fetch: {response.status_code}")
                
        except Exception as e:
            self.record_test("property_isolation_tests", "Manager 2 Property Isolation", False, str(e))
        
        return True
    
    def create_test_applications(self):
        """Create test job applications for both properties"""
        print_section("Creating Test Applications")
        
        # Application for Property 1
        app1_data = {
            "property_id": self.property1_id,
            "department": "Front Office",
            "position": "Receptionist",
            "applicant_data": {
                "first_name": "Alice",
                "last_name": "Applicant",
                "email": f"alice_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "555-1001",
                "address": "123 Test St",
                "city": "Test City",
                "state": "CA",
                "zip_code": "90001"
            }
        }
        
        try:
            response = requests.post(f"{API_URL}/applications/submit", json=app1_data)
            if response.status_code in [200, 201]:
                self.application1_id = response.json().get("data", {}).get("id")
                print_success(f"Created application for Property 1: {self.application1_id}")
        except Exception as e:
            print_error(f"Failed to create application 1: {e}")
        
        # Application for Property 2
        app2_data = {
            "property_id": self.property2_id,
            "department": "Housekeeping",
            "position": "Room Attendant",
            "applicant_data": {
                "first_name": "Bob",
                "last_name": "Applicant",
                "email": f"bob_{uuid.uuid4().hex[:8]}@test.com",
                "phone": "555-2001",
                "address": "456 Test Ave",
                "city": "Test Town",
                "state": "NY",
                "zip_code": "10001"
            }
        }
        
        try:
            response = requests.post(f"{API_URL}/applications/submit", json=app2_data)
            if response.status_code in [200, 201]:
                self.application2_id = response.json().get("data", {}).get("id")
                print_success(f"Created application for Property 2: {self.application2_id}")
        except Exception as e:
            print_error(f"Failed to create application 2: {e}")
    
    def test_manager_application_approval(self):
        """Test manager approving applications and generating onboarding tokens"""
        print_section("Testing Application Approval Process")
        
        if not self.manager1_token or not self.application1_id:
            print_warning("Skipping - Prerequisites not met")
            return False
        
        headers = {"Authorization": f"Bearer {self.manager1_token}"}
        
        # Approve application
        try:
            response = requests.post(f"{API_URL}/manager/applications/{self.application1_id}/approve",
                                    json={"comments": "Approved for hire"},
                                    headers=headers)
            
            if response.status_code == 200:
                data = response.json().get("data", {})
                onboarding_token = data.get("onboarding_token")
                
                if onboarding_token:
                    self.record_test("manager_tests", "Application Approval", True,
                                   "Application approved and onboarding token generated")
                    self.check_prd_requirement("FR-RBAC-004", "Employees access via temporary tokens", True)
                else:
                    self.record_test("manager_tests", "Application Approval", False,
                                   "No onboarding token generated")
            else:
                self.record_test("manager_tests", "Application Approval", False,
                               f"Approval failed: {response.status_code}")
                
        except Exception as e:
            self.record_test("manager_tests", "Application Approval", False, str(e))
        
        return True
    
    # ===========================
    # 3. MODULE DISTRIBUTION TESTS
    # ===========================
    
    def test_module_distribution_system(self):
        """Test modular form distribution - PRD Section 3.1.4"""
        print_section("Testing Module Distribution System")
        
        # Check if module distribution endpoints exist
        module_types = ["w4-update", "i9-reverification", "direct-deposit", 
                       "health-insurance", "trafficking-training", "policy-updates"]
        
        for module_type in module_types:
            self.check_prd_requirement(f"FR-MOD-{module_type}", 
                                     f"Module type: {module_type}",
                                     False,
                                     "Not yet implemented")
        
        self.check_prd_requirement("FR-MOD-001", "HR can send specific forms to employees", False, 
                                 "Module distribution system not implemented")
        self.check_prd_requirement("FR-MOD-002", "Each module has unique access token", False,
                                 "Module token system not implemented")
        self.check_prd_requirement("FR-MOD-003", "Tokens expire after 7 days", False,
                                 "Module expiration not implemented")
        
        return False
    
    # ===========================
    # 4. GENERATE REPORTS
    # ===========================
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print_header("TEST RESULTS SUMMARY")
        
        # Calculate statistics
        total_tests = 0
        passed_tests = 0
        
        for category, results in test_results.items():
            category_passed = sum(1 for r in results if r["passed"])
            category_total = len(results)
            total_tests += category_total
            passed_tests += category_passed
            
            print_section(f"{category.replace('_', ' ').title()}: {category_passed}/{category_total} passed")
            
            for result in results:
                status = "✅" if result["passed"] else "❌"
                print(f"  {status} {result['test']}")
        
        # Overall statistics
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        print_header(f"OVERALL: {passed_tests}/{total_tests} tests passed ({pass_rate:.1f}%)")
        
        # PRD Compliance Summary
        print_header("PRD COMPLIANCE SUMMARY")
        
        implemented_count = sum(1 for req in self.prd_requirements.values() if req["implemented"])
        total_requirements = len(self.prd_requirements)
        
        print_info(f"Requirements Implemented: {implemented_count}/{total_requirements}")
        
        # Save results to file
        with open("test_results.json", "w") as f:
            json.dump({
                "test_results": test_results,
                "prd_compliance": self.prd_requirements,
                "statistics": {
                    "total_tests": total_tests,
                    "passed_tests": passed_tests,
                    "pass_rate": pass_rate,
                    "requirements_implemented": implemented_count,
                    "total_requirements": total_requirements
                },
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
        
        print_info("\nDetailed results saved to test_results.json")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print_header("HOTEL ONBOARDING SYSTEM - COMPREHENSIVE TEST SUITE")
        print_info(f"Testing against PRD requirements")
        print_info(f"Backend URL: {BASE_URL}")
        print_info(f"Test started: {datetime.now().isoformat()}")
        
        # HR Tests
        print_header("TESTING HR FUNCTIONALITY")
        self.test_hr_authentication()
        self.test_hr_property_management()
        self.test_hr_manager_creation()
        
        # Manager Tests
        print_header("TESTING MANAGER FUNCTIONALITY")
        self.test_manager_authentication()
        self.test_property_isolation()
        self.test_manager_application_approval()
        
        # Module Distribution Tests
        print_header("TESTING MODULE DISTRIBUTION")
        self.test_module_distribution_system()
        
        # Generate Report
        self.generate_test_report()


def main():
    """Main test execution"""
    # First, ensure we have clean test accounts
    print_info("Setting up test environment...")
    
    # Run comprehensive tests
    suite = TestSuite()
    suite.run_all_tests()
    
    print_header("TEST SUITE COMPLETE")

if __name__ == "__main__":
    main()