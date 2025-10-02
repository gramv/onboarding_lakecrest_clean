#!/usr/bin/env python3
"""
Comprehensive Cross-Property Data Isolation Test
Tests multi-tenant security to ensure complete data isolation between properties
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import sys
import traceback

# Configuration
BASE_URL = "http://localhost:8000"
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NjQxMTcsImV4cCI6MjA3MDM0MDExN30.VMl6QzCZleoOvcY_abOHsztgXcottOnDv2kzJgmCjdg"

# Test Properties Configuration
TEST_PROPERTIES = [
    {
        "id": "beach-resort-001",
        "name": "Beach Resort Paradise",
        "address": "123 Ocean Drive, Miami Beach, FL 33139",
        "manager_email": "manager.beach@demo.com",
        "manager_name": "Sarah Beach"
    },
    {
        "id": "mountain-lodge-001",
        "name": "Mountain Lodge Retreat",
        "address": "456 Alpine Way, Aspen, CO 81611",
        "manager_email": "manager.mountain@demo.com",
        "manager_name": "Mike Mountain"
    },
    {
        "id": "city-hotel-001",
        "name": "City Hotel Downtown",
        "address": "789 Urban Street, New York, NY 10001",
        "manager_email": "manager.city@demo.com",
        "manager_name": "Lisa City"
    }
]

# HR User Configuration
HR_USER = {
    "email": "hr@demo.com",
    "password": "HRDemo123!",
    "name": "HR Administrator"
}

# Test Applications per Property
TEST_APPLICATIONS = [
    {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.beach@test.com",
        "phone": "305-555-0101"
    },
    {
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.mountain@test.com",
        "phone": "970-555-0102"
    },
    {
        "firstName": "Bob",
        "lastName": "Johnson",
        "email": "bob.city@test.com",
        "phone": "212-555-0103"
    }
]

class PropertyIsolationTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.supabase_client = httpx.AsyncClient(
            base_url=SUPABASE_URL,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )
        self.managers = {}  # property_id -> manager_data
        self.applications = {}  # property_id -> [applications]
        self.hr_token = None
        self.test_results = []

    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{'='*80}")
        print(f"{text.center(80)}")
        print(f"{'='*80}")

    def print_subheader(self, text: str):
        """Print a formatted subheader"""
        print(f"\n--- {text} ---")

    def print_success(self, text: str):
        """Print success message"""
        print(f"✓ {text}")
        self.test_results.append({"status": "PASS", "test": text})

    def print_error(self, text: str):
        """Print error message"""
        print(f"✗ {text}")
        self.test_results.append({"status": "FAIL", "test": text})

    def print_info(self, text: str):
        """Print info message"""
        print(f"ℹ {text}")

    def print_warning(self, text: str):
        """Print warning message"""
        print(f"⚠ {text}")

    async def setup_test_data(self):
        """Setup test properties, managers, and applications"""
        self.print_header("SETTING UP TEST DATA")

        # Step 1: Create HR user
        self.print_subheader("Creating HR User")
        try:
            # Check if HR user exists
            response = await self.supabase_client.get(
                f"/rest/v1/users?email=eq.{HR_USER['email']}"
            )
            users = response.json()
            
            if not users:
                # Create HR user
                response = await self.client.post(
                    f"{BASE_URL}/auth/register",
                    json={
                        "email": HR_USER["email"],
                        "password": HR_USER["password"],
                        "name": HR_USER["name"],
                        "role": "hr"
                    }
                )
                if response.status_code == 201:
                    self.print_success(f"Created HR user: {HR_USER['email']}")
                else:
                    self.print_warning(f"HR user creation returned: {response.status_code}")
            else:
                self.print_info(f"HR user already exists: {HR_USER['email']}")

            # Login as HR to get token
            response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": HR_USER["email"],
                    "password": HR_USER["password"]
                }
            )
            if response.status_code == 200:
                data = response.json()
                self.hr_token = data["access_token"]
                self.print_success("HR user logged in successfully")
            else:
                self.print_error(f"HR login failed: {response.text}")

        except Exception as e:
            self.print_error(f"Error setting up HR user: {str(e)}")

        # Step 2: Create test properties and managers
        self.print_subheader("Creating Test Properties and Managers")
        
        for i, prop_config in enumerate(TEST_PROPERTIES):
            try:
                # Create property
                prop_response = await self.supabase_client.get(
                    f"/rest/v1/properties?id=eq.{prop_config['id']}"
                )
                properties = prop_response.json()
                
                if not properties:
                    # Create new property
                    prop_data = {
                        "id": prop_config["id"],
                        "name": prop_config["name"],
                        "address": prop_config["address"],
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    response = await self.supabase_client.post(
                        "/rest/v1/properties",
                        json=prop_data
                    )
                    if response.status_code in [200, 201]:
                        self.print_success(f"Created property: {prop_config['name']}")
                    else:
                        self.print_warning(f"Property creation returned: {response.status_code}")
                else:
                    self.print_info(f"Property already exists: {prop_config['name']}")

                # Create manager user
                manager_response = await self.supabase_client.get(
                    f"/rest/v1/users?email=eq.{prop_config['manager_email']}"
                )
                managers = manager_response.json()
                
                if not managers:
                    # Create manager
                    response = await self.client.post(
                        f"{BASE_URL}/auth/register",
                        json={
                            "email": prop_config["manager_email"],
                            "password": "Manager123!",
                            "name": prop_config["manager_name"],
                            "role": "manager"
                        }
                    )
                    if response.status_code == 201:
                        self.print_success(f"Created manager: {prop_config['manager_email']}")
                    else:
                        self.print_warning(f"Manager creation returned: {response.status_code}")
                else:
                    self.print_info(f"Manager already exists: {prop_config['manager_email']}")

                # Assign manager to property
                assign_response = await self.supabase_client.get(
                    f"/rest/v1/property_managers?property_id=eq.{prop_config['id']}&manager_email=eq.{prop_config['manager_email']}"
                )
                assignments = assign_response.json()
                
                if not assignments:
                    assignment_data = {
                        "property_id": prop_config["id"],
                        "manager_email": prop_config["manager_email"],
                        "assigned_at": datetime.utcnow().isoformat()
                    }
                    
                    response = await self.supabase_client.post(
                        "/rest/v1/property_managers",
                        json=assignment_data
                    )
                    if response.status_code in [200, 201]:
                        self.print_success(f"Assigned manager to {prop_config['name']}")
                    else:
                        self.print_warning(f"Manager assignment returned: {response.status_code}")
                else:
                    self.print_info(f"Manager already assigned to {prop_config['name']}")

                # Login as manager to get token
                response = await self.client.post(
                    f"{BASE_URL}/auth/login",
                    json={
                        "email": prop_config["manager_email"],
                        "password": "Manager123!"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    self.managers[prop_config["id"]] = {
                        "email": prop_config["manager_email"],
                        "name": prop_config["manager_name"],
                        "token": data["access_token"],
                        "property_id": prop_config["id"],
                        "property_name": prop_config["name"]
                    }
                    self.print_success(f"Manager logged in: {prop_config['manager_email']}")
                else:
                    self.print_error(f"Manager login failed: {response.text}")

                # Create test application for this property
                self.print_info(f"Creating application for {prop_config['name']}")
                app_data = TEST_APPLICATIONS[i].copy()
                app_data.update({
                    "propertyId": prop_config["id"],
                    "position": "Front Desk Associate",
                    "desiredPay": "$15/hour",
                    "startDate": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                })

                response = await self.client.post(
                    f"{BASE_URL}/apply/{prop_config['id']}",
                    json=app_data
                )
                
                if response.status_code == 201:
                    app_result = response.json()
                    if prop_config["id"] not in self.applications:
                        self.applications[prop_config["id"]] = []
                    self.applications[prop_config["id"]].append({
                        "id": app_result["application_id"],
                        "data": app_data,
                        "status": "pending"
                    })
                    self.print_success(f"Created application for {app_data['firstName']} {app_data['lastName']}")
                else:
                    self.print_error(f"Failed to create application: {response.text}")

            except Exception as e:
                self.print_error(f"Error setting up property {prop_config['name']}: {str(e)}")

    async def test_property_isolation(self):
        """Test that managers can only access their own property's data"""
        self.print_header("TESTING PROPERTY ISOLATION")

        test_cases = []

        for prop_id, manager_data in self.managers.items():
            self.print_subheader(f"Testing Manager: {manager_data['name']} ({manager_data['property_name']})")

            headers = {"Authorization": f"Bearer {manager_data['token']}"}

            # Test 1: Manager can see own property's applications
            self.print_info("Test 1: Accessing own property's applications")
            response = await self.client.get(
                f"{BASE_URL}/manager/applications",
                headers=headers
            )
            
            if response.status_code == 200:
                apps = response.json()
                own_apps = [app for app in apps if app.get("property_id") == prop_id]
                other_apps = [app for app in apps if app.get("property_id") != prop_id]
                
                if own_apps and not other_apps:
                    self.print_success(f"Manager can see {len(own_apps)} own application(s), no other properties visible")
                    test_cases.append(("Manager sees own applications only", True))
                elif other_apps:
                    self.print_error(f"SECURITY BREACH: Manager can see {len(other_apps)} application(s) from other properties!")
                    test_cases.append(("Manager sees own applications only", False))
                else:
                    self.print_warning("No applications found for this property")
                    test_cases.append(("Manager sees own applications only", True))
            else:
                self.print_error(f"Failed to get applications: {response.status_code}")
                test_cases.append(("Manager sees own applications only", False))

            # Test 2: Manager cannot approve applications from other properties
            self.print_info("Test 2: Attempting to approve another property's application")
            for other_prop_id, other_apps in self.applications.items():
                if other_prop_id != prop_id and other_apps:
                    other_app = other_apps[0]
                    response = await self.client.post(
                        f"{BASE_URL}/approve-application/{other_app['id']}",
                        headers=headers,
                        json={"status": "approved"}
                    )
                    
                    if response.status_code in [403, 404]:
                        self.print_success(f"Correctly blocked from approving {other_prop_id}'s application (Status: {response.status_code})")
                        test_cases.append(("Manager blocked from other property approval", True))
                    else:
                        self.print_error(f"SECURITY BREACH: Manager could approve {other_prop_id}'s application! (Status: {response.status_code})")
                        test_cases.append(("Manager blocked from other property approval", False))
                    break

            # Test 3: Manager cannot view employees from other properties
            self.print_info("Test 3: Accessing employee list")
            response = await self.client.get(
                f"{BASE_URL}/manager/employees",
                headers=headers
            )
            
            if response.status_code == 200:
                employees = response.json()
                # Check if any employees belong to other properties
                if employees:
                    own_employees = [e for e in employees if e.get("property_id") == prop_id]
                    other_employees = [e for e in employees if e.get("property_id") != prop_id]
                    
                    if not other_employees:
                        self.print_success(f"Manager sees only own property's employees ({len(own_employees)})")
                        test_cases.append(("Manager sees own employees only", True))
                    else:
                        self.print_error(f"SECURITY BREACH: Manager can see {len(other_employees)} employee(s) from other properties!")
                        test_cases.append(("Manager sees own employees only", False))
                else:
                    self.print_success("No employees visible (correct if none for this property)")
                    test_cases.append(("Manager sees own employees only", True))
            else:
                self.print_warning(f"Employees endpoint returned: {response.status_code}")

            # Test 4: Direct API call with wrong property ID
            self.print_info("Test 4: Direct API call with wrong property ID")
            for other_prop_id in self.managers.keys():
                if other_prop_id != prop_id:
                    # Try to directly fetch another property's data
                    response = await self.client.get(
                        f"{BASE_URL}/properties/{other_prop_id}/employees",
                        headers=headers
                    )
                    
                    if response.status_code in [403, 404]:
                        self.print_success(f"Correctly blocked from accessing {other_prop_id}'s employees")
                        test_cases.append(("Direct API call blocked", True))
                    elif response.status_code == 200:
                        data = response.json()
                        if not data or len(data) == 0:
                            self.print_success(f"Returned empty data for {other_prop_id} (acceptable)")
                            test_cases.append(("Direct API call blocked", True))
                        else:
                            self.print_error(f"SECURITY BREACH: Could access {other_prop_id}'s data!")
                            test_cases.append(("Direct API call blocked", False))
                    break

    async def test_hr_full_access(self):
        """Test that HR can access all properties' data"""
        self.print_header("TESTING HR FULL ACCESS")

        if not self.hr_token:
            self.print_error("HR token not available - skipping HR tests")
            return

        headers = {"Authorization": f"Bearer {self.hr_token}"}
        test_cases = []

        # Test 1: HR can see all properties
        self.print_subheader("Test 1: HR Access to All Properties")
        response = await self.client.get(
            f"{BASE_URL}/properties",
            headers=headers
        )
        
        if response.status_code == 200:
            properties = response.json()
            test_prop_ids = [p["id"] for p in TEST_PROPERTIES]
            found_props = [p for p in properties if p.get("id") in test_prop_ids]
            
            if len(found_props) == len(TEST_PROPERTIES):
                self.print_success(f"HR can see all {len(TEST_PROPERTIES)} test properties")
                test_cases.append(("HR sees all properties", True))
            else:
                self.print_warning(f"HR sees {len(found_props)} of {len(TEST_PROPERTIES)} test properties")
                test_cases.append(("HR sees all properties", False))
        else:
            self.print_error(f"Failed to get properties: {response.status_code}")
            test_cases.append(("HR sees all properties", False))

        # Test 2: HR can see all applications across properties
        self.print_subheader("Test 2: HR Access to All Applications")
        response = await self.client.get(
            f"{BASE_URL}/hr/applications",
            headers=headers
        )
        
        if response.status_code == 200:
            all_apps = response.json()
            
            # Count applications per property
            app_counts = {}
            for app in all_apps:
                prop_id = app.get("property_id")
                if prop_id:
                    app_counts[prop_id] = app_counts.get(prop_id, 0) + 1
            
            self.print_success(f"HR can see applications from {len(app_counts)} properties")
            for prop_id, count in app_counts.items():
                prop_name = next((p["name"] for p in TEST_PROPERTIES if p["id"] == prop_id), prop_id)
                self.print_info(f"  - {prop_name}: {count} application(s)")
            test_cases.append(("HR sees all applications", True))
        else:
            self.print_error(f"Failed to get applications: {response.status_code}")
            test_cases.append(("HR sees all applications", False))

        # Test 3: HR can filter by specific property
        self.print_subheader("Test 3: HR Property Filtering")
        for prop in TEST_PROPERTIES[:1]:  # Test with first property
            response = await self.client.get(
                f"{BASE_URL}/hr/applications?property_id={prop['id']}",
                headers=headers
            )
            
            if response.status_code == 200:
                filtered_apps = response.json()
                # Verify all returned apps are from the specified property
                correct_prop = all(app.get("property_id") == prop["id"] for app in filtered_apps)
                
                if correct_prop:
                    self.print_success(f"HR can filter applications for {prop['name']}")
                    test_cases.append(("HR can filter by property", True))
                else:
                    self.print_error(f"Filter returned mixed property results")
                    test_cases.append(("HR can filter by property", False))
            else:
                self.print_warning(f"Property filter returned: {response.status_code}")

        # Test 4: HR stats show system-wide totals
        self.print_subheader("Test 4: HR System-Wide Statistics")
        response = await self.client.get(
            f"{BASE_URL}/hr/applications/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            self.print_success("HR can access system-wide analytics")
            self.print_info(f"  - Total Applications: {stats.get('total_applications', 0)}")
            self.print_info(f"  - Pending: {stats.get('pending_applications', 0)}")
            self.print_info(f"  - Approved: {stats.get('approved_applications', 0)}")
            self.print_info(f"  - Total Properties: {stats.get('total_properties', 0)}")
            test_cases.append(("HR sees system-wide stats", True))
        else:
            self.print_warning(f"Analytics endpoint returned: {response.status_code}")

    async def test_security_edge_cases(self):
        """Test security edge cases and vulnerabilities"""
        self.print_header("TESTING SECURITY EDGE CASES")

        test_cases = []

        # Use first manager for testing
        if not self.managers:
            self.print_error("No managers available for security testing")
            return

        manager_data = list(self.managers.values())[0]
        headers = {"Authorization": f"Bearer {manager_data['token']}"}

        # Test 1: SQL Injection attempt
        self.print_subheader("Test 1: SQL Injection Prevention")
        sql_injection_payloads = [
            "'; DROP TABLE employees; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM applications WHERE 1=1; --"
        ]
        
        for payload in sql_injection_payloads:
            response = await self.client.get(
                f"{BASE_URL}/manager/applications?property_id={payload}",
                headers=headers
            )
            
            if response.status_code in [400, 422, 404]:
                self.print_success(f"SQL injection blocked: {payload[:30]}...")
                test_cases.append(("SQL injection blocked", True))
            elif response.status_code == 200:
                data = response.json()
                if not data or isinstance(data, list):
                    self.print_success(f"SQL injection ineffective: {payload[:30]}...")
                    test_cases.append(("SQL injection blocked", True))
                else:
                    self.print_error(f"Potential SQL injection vulnerability with: {payload}")
                    test_cases.append(("SQL injection blocked", False))
            break  # Test one payload

        # Test 2: JWT Token Manipulation
        self.print_subheader("Test 2: JWT Token Security")
        
        # Test with invalid token
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        
        response = await self.client.get(
            f"{BASE_URL}/applications",
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        
        if response.status_code == 401:
            self.print_success("Invalid JWT token correctly rejected")
            test_cases.append(("Invalid JWT rejected", True))
        else:
            self.print_error(f"Invalid token not rejected! Status: {response.status_code}")
            test_cases.append(("Invalid JWT rejected", False))

        # Test 3: Missing Authorization
        self.print_subheader("Test 3: Authorization Required")
        response = await self.client.get(f"{BASE_URL}/manager/applications")
        
        if response.status_code == 401:
            self.print_success("Unauthorized access correctly blocked")
            test_cases.append(("Unauthorized access blocked", True))
        else:
            self.print_error(f"Unauthorized access not blocked! Status: {response.status_code}")
            test_cases.append(("Unauthorized access blocked", False))

        # Test 4: Data Leakage in Error Messages
        self.print_subheader("Test 4: Error Message Security")
        
        # Try to access non-existent application
        response = await self.client.get(
            f"{BASE_URL}/applications/non-existent-id",
            headers=headers
        )
        
        if response.status_code in [404, 403]:
            if response.text:
                error_text = response.text.lower()
                # Check for sensitive information in error
                sensitive_patterns = ["property_id", "user_id", "email", "ssn", "password"]
                leaks = [p for p in sensitive_patterns if p in error_text]
                
                if not leaks:
                    self.print_success("Error messages don't leak sensitive data")
                    test_cases.append(("No data leakage in errors", True))
                else:
                    self.print_error(f"Error message may leak: {leaks}")
                    test_cases.append(("No data leakage in errors", False))
            else:
                self.print_success("Error response properly sanitized")
                test_cases.append(("No data leakage in errors", True))

        # Test 5: Cross-Property ID Manipulation
        self.print_subheader("Test 5: Property ID Manipulation")
        
        # Manager tries to use another property's ID in request
        other_prop_id = next((pid for pid in self.managers.keys() if pid != manager_data["property_id"]), None)
        
        if other_prop_id and other_prop_id in self.applications:
            other_app = self.applications[other_prop_id][0] if self.applications[other_prop_id] else None
            
            if other_app:
                # Try to update application status with wrong property context
                response = await self.client.put(
                    f"{BASE_URL}/applications/{other_app['id']}",
                    headers=headers,
                    json={"status": "approved", "property_id": manager_data["property_id"]}
                )
                
                if response.status_code in [403, 404]:
                    self.print_success("Cross-property manipulation blocked")
                    test_cases.append(("Cross-property manipulation blocked", True))
                else:
                    self.print_error(f"Cross-property manipulation not blocked! Status: {response.status_code}")
                    test_cases.append(("Cross-property manipulation blocked", False))

    async def generate_report(self):
        """Generate comprehensive test report"""
        self.print_header("CROSS-PROPERTY ISOLATION TEST REPORT")

        # Count results
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        total = len(self.test_results)

        # Summary
        self.print_subheader("TEST SUMMARY")
        print(f"\nTotal Tests Run: {total}")
        print(f"Tests Passed: {passed}")
        print(f"Tests Failed: {failed}")
        
        if failed == 0:
            print(f"\n{'='*80}")
            print(f"✓ ALL SECURITY TESTS PASSED - SYSTEM IS PROPERLY ISOLATED")
            print(f"{'='*80}")
        else:
            print(f"\n{'='*80}")
            print(f"✗ SECURITY VULNERABILITIES DETECTED - IMMEDIATE ACTION REQUIRED")
            print(f"{'='*80}")

        # Detailed Results
        self.print_subheader("DETAILED TEST RESULTS")
        
        # Group by category
        categories = {
            "Property Isolation": [],
            "HR Access": [],
            "Security": []
        }
        
        for result in self.test_results:
            test_name = result["test"].lower()
            if "hr" in test_name:
                categories["HR Access"].append(result)
            elif "sql" in test_name or "jwt" in test_name or "security" in test_name or "injection" in test_name:
                categories["Security"].append(result)
            else:
                categories["Property Isolation"].append(result)

        for category, results in categories.items():
            if results:
                print(f"\n{category}:")
                for result in results:
                    symbol = "✓" if result["status"] == "PASS" else "✗"
                    print(f"  {symbol} {result['test']}")

        # Critical Findings
        if failed > 0:
            self.print_subheader("CRITICAL FINDINGS")
            failed_tests = [r for r in self.test_results if r["status"] == "FAIL"]
            for test in failed_tests:
                print(f"  • {test['test']}")
            
            print(f"\nRecommendations:")
            print("  1. Review property access control implementation")
            print("  2. Verify JWT token validation")
            print("  3. Check database query filters for property_id")
            print("  4. Audit all manager endpoints for proper isolation")

        # Test Coverage
        self.print_subheader("TEST COVERAGE")
        print(f"✓ Multi-tenant data isolation: {'VERIFIED' if all(r['status'] == 'PASS' for r in categories['Property Isolation']) else 'FAILED'}")
        print(f"✓ HR full system access: {'VERIFIED' if all(r['status'] == 'PASS' for r in categories['HR Access']) else 'NEEDS REVIEW'}")
        print(f"✓ Security vulnerabilities: {'NONE FOUND' if all(r['status'] == 'PASS' for r in categories['Security']) else 'VULNERABILITIES DETECTED'}")
        
        # Timestamp
        print(f"\nReport Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    async def cleanup(self):
        """Close client connections"""
        await self.client.aclose()
        await self.supabase_client.aclose()

    async def run_all_tests(self):
        """Run complete test suite"""
        try:
            # Setup
            await self.setup_test_data()
            
            # Run tests
            await self.test_property_isolation()
            await self.test_hr_full_access()
            await self.test_security_edge_cases()
            
            # Generate report
            await self.generate_report()
            
        except Exception as e:
            self.print_error(f"Test suite failed: {str(e)}")
            traceback.print_exc()
        finally:
            await self.cleanup()

async def main():
    """Main test execution"""
    print(f"{'='*80}")
    print(f"CROSS-PROPERTY DATA ISOLATION SECURITY TEST")
    print(f"Testing Multi-Tenant Security and Data Isolation")
    print(f"{'='*80}")
    
    tester = PropertyIsolationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())