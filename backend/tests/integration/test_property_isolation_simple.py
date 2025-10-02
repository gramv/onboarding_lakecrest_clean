#!/usr/bin/env python3
"""
Simple Cross-Property Data Isolation Test
Tests multi-tenant security using existing accounts
"""

import asyncio
import httpx
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"

# Test with existing accounts
MANAGER_ACCOUNT = {
    "email": "manager@demo.com",
    "password": "password123"  # From setup_test_accounts.py
}

HR_ACCOUNT = {
    "email": "hr@demo.com", 
    "password": "password123"  # Using same password for testing
}

class SimplePropertyIsolationTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.manager_token = None
        self.hr_token = None
        self.manager_property_id = None
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

    async def login_accounts(self):
        """Login with existing test accounts"""
        self.print_header("LOGGING IN WITH TEST ACCOUNTS")

        # Login as manager
        self.print_subheader("Manager Login")
        try:
            response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": MANAGER_ACCOUNT["email"],
                    "password": MANAGER_ACCOUNT["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                # Handle nested response structure
                if "data" in data and "token" in data["data"]:
                    self.manager_token = data["data"]["token"]
                elif "token" in data:
                    self.manager_token = data["token"]
                elif "access_token" in data:
                    self.manager_token = data["access_token"]
                else:
                    self.print_error(f"Unexpected token structure: {data.keys()}")
                    return
                    
                self.print_success(f"Manager logged in: {MANAGER_ACCOUNT['email']}")
                
                # Get manager's property
                headers = {"Authorization": f"Bearer {self.manager_token}"}
                prop_response = await self.client.get(
                    f"{BASE_URL}/manager/property",
                    headers=headers
                )
                
                if prop_response.status_code == 200:
                    prop_data = prop_response.json()
                    self.manager_property_id = prop_data.get("id")
                    self.print_info(f"Manager property: {prop_data.get('name')} (ID: {self.manager_property_id})")
                else:
                    self.print_error(f"Failed to get manager property: {prop_response.text}")
                    
            else:
                self.print_error(f"Manager login failed: {response.text}")
                
        except Exception as e:
            self.print_error(f"Error logging in manager: {str(e)}")

        # Login as HR
        self.print_subheader("HR Login")
        try:
            response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": HR_ACCOUNT["email"],
                    "password": HR_ACCOUNT["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                # Handle nested response structure
                if "data" in data and "token" in data["data"]:
                    self.hr_token = data["data"]["token"]
                elif "token" in data:
                    self.hr_token = data["token"]
                elif "access_token" in data:
                    self.hr_token = data["access_token"]
                else:
                    self.print_error(f"Unexpected token structure for HR: {data.keys()}")
                    return
                    
                self.print_success(f"HR logged in: {HR_ACCOUNT['email']}")
            else:
                self.print_error(f"HR login failed: {response.text}")
                
        except Exception as e:
            self.print_error(f"Error logging in HR: {str(e)}")

    async def test_manager_property_isolation(self):
        """Test that manager can only see their property's data"""
        self.print_header("TESTING MANAGER PROPERTY ISOLATION")
        
        if not self.manager_token:
            self.print_error("Manager token not available - skipping manager tests")
            return

        headers = {"Authorization": f"Bearer {self.manager_token}"}

        # Test 1: Manager can see own applications
        self.print_subheader("Test 1: Manager's Own Applications")
        response = await self.client.get(
            f"{BASE_URL}/manager/applications",
            headers=headers
        )
        
        if response.status_code == 200:
            apps = response.json()
            
            # Check if response is list or has applications key
            if isinstance(apps, dict) and "applications" in apps:
                applications = apps["applications"]
            else:
                applications = apps if isinstance(apps, list) else []
            
            # Verify all applications belong to manager's property
            if self.manager_property_id:
                other_property_apps = [
                    app for app in applications 
                    if app.get("property_id") and app.get("property_id") != self.manager_property_id
                ]
                
                if other_property_apps:
                    self.print_error(f"SECURITY BREACH: Manager can see {len(other_property_apps)} application(s) from other properties!")
                    for app in other_property_apps[:3]:  # Show first 3 as examples
                        self.print_info(f"  - App ID: {app.get('id')}, Property: {app.get('property_id')}")
                else:
                    self.print_success(f"Manager sees only own property's applications ({len(applications)} total)")
            else:
                self.print_info(f"Manager sees {len(applications)} application(s)")
        else:
            self.print_error(f"Failed to get applications: {response.status_code}")

        # Test 2: Manager dashboard stats
        self.print_subheader("Test 2: Manager Dashboard Stats")
        response = await self.client.get(
            f"{BASE_URL}/manager/dashboard-stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            self.print_success("Manager can access dashboard stats")
            self.print_info(f"  - Total Applications: {stats.get('total_applications', 0)}")
            self.print_info(f"  - Pending: {stats.get('pending_applications', 0)}")
            
            # Verify stats are for manager's property only
            if "property_id" in stats:
                if stats["property_id"] == self.manager_property_id:
                    self.print_success("Stats correctly filtered to manager's property")
                else:
                    self.print_error("SECURITY BREACH: Stats from wrong property!")
        else:
            self.print_warning(f"Dashboard stats returned: {response.status_code}")

        # Test 3: Try to access other property's data directly
        self.print_subheader("Test 3: Cross-Property Access Attempt")
        
        # Try to access applications with a different property ID
        fake_property_id = "other-property-123"
        response = await self.client.get(
            f"{BASE_URL}/manager/applications?property_id={fake_property_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            apps = response.json()
            if isinstance(apps, dict) and "applications" in apps:
                applications = apps["applications"]
            else:
                applications = apps if isinstance(apps, list) else []
            
            # Check if we got any applications from the fake property
            if applications:
                self.print_error(f"SECURITY BREACH: Manager accessed data with fake property ID!")
            else:
                self.print_success("Manager cannot access other property's data")
        elif response.status_code in [403, 404]:
            self.print_success("Cross-property access correctly blocked")
        else:
            self.print_info(f"Cross-property attempt returned: {response.status_code}")

    async def test_hr_full_access(self):
        """Test that HR can access all properties"""
        self.print_header("TESTING HR FULL ACCESS")
        
        if not self.hr_token:
            self.print_error("HR token not available - skipping HR tests")
            return

        headers = {"Authorization": f"Bearer {self.hr_token}"}

        # Test 1: HR can see all applications
        self.print_subheader("Test 1: HR Access to All Applications")
        response = await self.client.get(
            f"{BASE_URL}/hr/applications",
            headers=headers
        )
        
        if response.status_code == 200:
            apps = response.json()
            
            # Check if response is list or has applications key
            if isinstance(apps, dict) and "applications" in apps:
                applications = apps["applications"]
            else:
                applications = apps if isinstance(apps, list) else []
            
            # Count applications per property
            property_counts = {}
            for app in applications:
                prop_id = app.get("property_id", "unknown")
                property_counts[prop_id] = property_counts.get(prop_id, 0) + 1
            
            self.print_success(f"HR can see applications from {len(property_counts)} different properties")
            for prop_id, count in property_counts.items():
                self.print_info(f"  - Property {prop_id}: {count} application(s)")
        else:
            self.print_error(f"Failed to get HR applications: {response.status_code}")

        # Test 2: HR stats
        self.print_subheader("Test 2: HR System-Wide Statistics")
        response = await self.client.get(
            f"{BASE_URL}/hr/applications/stats",
            headers=headers
        )
        
        if response.status_code == 200:
            stats = response.json()
            self.print_success("HR can access system-wide statistics")
            self.print_info(f"  - Total Applications: {stats.get('total', 0)}")
            self.print_info(f"  - Pending: {stats.get('pending', 0)}")
            self.print_info(f"  - Approved: {stats.get('approved', 0)}")
            self.print_info(f"  - Rejected: {stats.get('rejected', 0)}")
        else:
            self.print_warning(f"HR stats returned: {response.status_code}")

        # Test 3: HR can access all properties
        self.print_subheader("Test 3: HR Access to All Properties")
        response = await self.client.get(
            f"{BASE_URL}/properties",
            headers=headers
        )
        
        if response.status_code == 200:
            properties = response.json()
            self.print_success(f"HR can see {len(properties)} properties")
            for prop in properties[:3]:  # Show first 3
                self.print_info(f"  - {prop.get('name')} (ID: {prop.get('id')})")
        else:
            self.print_warning(f"Properties endpoint returned: {response.status_code}")

    async def test_security_boundaries(self):
        """Test security boundaries and edge cases"""
        self.print_header("TESTING SECURITY BOUNDARIES")

        # Test 1: Unauthorized access
        self.print_subheader("Test 1: Unauthorized Access")
        response = await self.client.get(f"{BASE_URL}/manager/applications")
        
        if response.status_code == 401:
            self.print_success("Unauthorized access correctly blocked")
        else:
            self.print_error(f"Unauthorized access not blocked! Status: {response.status_code}")

        # Test 2: Invalid token
        self.print_subheader("Test 2: Invalid Token")
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token"
        headers = {"Authorization": f"Bearer {invalid_token}"}
        
        response = await self.client.get(
            f"{BASE_URL}/manager/applications",
            headers=headers
        )
        
        if response.status_code == 401:
            self.print_success("Invalid token correctly rejected")
        else:
            self.print_error(f"Invalid token not rejected! Status: {response.status_code}")

        # Test 3: Manager vs HR access differentiation
        if self.manager_token and self.hr_token:
            self.print_subheader("Test 3: Role-Based Access Control")
            
            # Manager tries to access HR endpoint
            manager_headers = {"Authorization": f"Bearer {self.manager_token}"}
            response = await self.client.get(
                f"{BASE_URL}/hr/applications/stats",
                headers=manager_headers
            )
            
            if response.status_code in [401, 403]:
                self.print_success("Manager correctly blocked from HR endpoints")
            else:
                self.print_error(f"Manager accessed HR endpoint! Status: {response.status_code}")

    async def generate_report(self):
        """Generate test report"""
        self.print_header("PROPERTY ISOLATION TEST REPORT")

        # Count results
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        total = len(self.test_results)

        self.print_subheader("TEST SUMMARY")
        print(f"\nTotal Tests Run: {total}")
        print(f"Tests Passed: {passed}")
        print(f"Tests Failed: {failed}")
        
        if failed == 0:
            print(f"\n{'='*80}")
            print(f"✓ ALL TESTS PASSED - PROPERTY ISOLATION IS WORKING CORRECTLY")
            print(f"{'='*80}")
        else:
            print(f"\n{'='*80}")
            print(f"✗ FAILURES DETECTED - REVIEW PROPERTY ISOLATION IMPLEMENTATION")
            print(f"{'='*80}")
            
            # Show failed tests
            print("\nFailed Tests:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"  • {result['test']}")

        print(f"\nReport Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    async def cleanup(self):
        """Close client connection"""
        await self.client.aclose()

    async def run_all_tests(self):
        """Run complete test suite"""
        try:
            await self.login_accounts()
            await self.test_manager_property_isolation()
            await self.test_hr_full_access()
            await self.test_security_boundaries()
            await self.generate_report()
        except Exception as e:
            self.print_error(f"Test suite failed: {str(e)}")
        finally:
            await self.cleanup()

    def print_warning(self, text: str):
        """Print warning message"""
        print(f"⚠ {text}")

async def main():
    """Main test execution"""
    print(f"{'='*80}")
    print(f"SIMPLIFIED PROPERTY ISOLATION TEST")
    print(f"Testing with Existing Accounts")
    print(f"{'='*80}")
    
    tester = SimplePropertyIsolationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())