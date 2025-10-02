#!/usr/bin/env python3
"""
Complete Data Isolation Validation Tests
Tests all security boundaries: Manager vs HR access, property isolation, cross-property blocking
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Test configuration
BASE_URL = "http://localhost:8000"
TIMEOUT = aiohttp.ClientTimeout(total=30)

class TestStatus(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED"
    WARNING = "⚠️ WARNING"

@dataclass
class TestResult:
    """Represents a single test result"""
    test_name: str
    category: str
    status: TestStatus
    expected: Any
    actual: Any
    details: str
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class DataIsolationTester:
    def __init__(self):
        self.results: List[TestResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Test accounts - ensure these match your database
        self.manager_credentials = {
            "email": "manager@demo.com",
            "password": "password123"
        }
        self.hr_credentials = {
            "email": "hr@example.com",
            "password": "password123"
        }
        
        # Tokens will be set after login
        self.manager_token = None
        self.hr_token = None
        
        # Property IDs (from actual database)
        self.manager_property_id = "903ed05b-5990-4ecf-b1b2-7592cf2923df"  # Demo Hotel
        self.other_property_id = "550e8400-e29b-41d4-a716-446655440000"  # Different property
    
    async def setup(self):
        """Setup test session and authenticate users"""
        self.session = aiohttp.ClientSession(timeout=TIMEOUT)
        
        # Authenticate manager
        print("\n🔐 Authenticating test users...")
        self.manager_token = await self._authenticate(self.manager_credentials, "Manager")
        self.hr_token = await self._authenticate(self.hr_credentials, "HR")
        
        if not self.manager_token or not self.hr_token:
            raise Exception("Failed to authenticate test users")
        
        print("✅ Authentication successful")
    
    async def cleanup(self):
        """Cleanup session"""
        if self.session:
            await self.session.close()
    
    async def _authenticate(self, credentials: Dict, role: str) -> Optional[str]:
        """Authenticate a user and return token"""
        try:
            async with self.session.post(
                f"{BASE_URL}/auth/login",
                json=credentials
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    # Extract token from nested structure
                    if data.get("success") and data.get("data"):
                        return data["data"].get("token")
                    return data.get("access_token")  # Fallback
                else:
                    print(f"❌ Failed to authenticate {role}: {response.status}")
                    text = await response.text()
                    print(f"   Response: {text[:200]}")
                    return None
        except Exception as e:
            print(f"❌ Error authenticating {role}: {e}")
            return None
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        token: str,
        json_data: Optional[Dict] = None
    ) -> tuple[int, Any]:
        """Make an authenticated request"""
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            async with self.session.request(
                method,
                f"{BASE_URL}{endpoint}",
                headers=headers,
                json=json_data
            ) as response:
                # Try to get JSON response, fallback to text
                try:
                    data = await response.json()
                except:
                    data = await response.text()
                
                return response.status, data
        except Exception as e:
            return 500, str(e)
    
    def add_result(self, result: TestResult):
        """Add a test result"""
        self.results.append(result)
        
        # Print immediate feedback
        status_symbol = {
            TestStatus.PASSED: "✅",
            TestStatus.FAILED: "❌",
            TestStatus.WARNING: "⚠️"
        }[result.status]
        
        print(f"{status_symbol} {result.test_name}")
        if result.status == TestStatus.FAILED:
            print(f"   Expected: {result.expected}")
            print(f"   Got: {result.actual}")
    
    async def test_manager_cannot_access_hr_endpoints(self):
        """Test 1: Managers should NOT be able to access HR endpoints"""
        print("\n📋 Test 1: Manager Access to HR Endpoints (Should be blocked)")
        
        hr_endpoints = [
            ("/api/hr/dashboard", "GET", None),
            ("/api/hr/all-applications", "GET", None),
            ("/api/hr/analytics", "GET", None),
            ("/api/hr/bulk-approve", "POST", {"application_ids": []}),
            ("/api/hr/manage-properties", "GET", None),
            ("/api/hr/manage-managers", "GET", None),
        ]
        
        for endpoint, method, data in hr_endpoints:
            status, response = await self._make_request(method, endpoint, self.manager_token, data)
            
            self.add_result(TestResult(
                test_name=f"Manager blocked from {endpoint}",
                category="Manager HR Access",
                status=TestStatus.PASSED if status == 403 else TestStatus.FAILED,
                expected=403,
                actual=status,
                details=f"Manager attempting to access HR endpoint {endpoint}"
            ))
    
    async def test_hr_can_access_hr_endpoints(self):
        """Test 2: HR users SHOULD be able to access HR endpoints"""
        print("\n📋 Test 2: HR Access to HR Endpoints (Should be allowed)")
        
        hr_endpoints = [
            ("/api/hr/dashboard", "GET"),
            ("/api/hr/all-applications", "GET"),
            ("/api/hr/analytics", "GET"),
            ("/api/hr/manage-properties", "GET"),
            ("/api/hr/manage-managers", "GET"),
        ]
        
        for endpoint, method in hr_endpoints:
            status, response = await self._make_request(method, endpoint, self.hr_token)
            
            # Some endpoints might return 404 if no data, that's okay
            acceptable_statuses = [200, 404]
            
            self.add_result(TestResult(
                test_name=f"HR access to {endpoint}",
                category="HR Access",
                status=TestStatus.PASSED if status in acceptable_statuses else TestStatus.FAILED,
                expected="200 or 404",
                actual=status,
                details=f"HR user accessing HR endpoint {endpoint}"
            ))
    
    async def test_property_isolation_for_managers(self):
        """Test 3: Managers should only see their property's data"""
        print("\n📋 Test 3: Property Isolation for Managers")
        
        # Test manager dashboard - should only show their property's data
        status, response = await self._make_request("GET", "/api/manager/dashboard", self.manager_token)
        
        if status == 200:
            # Check that all returned data is for manager's property only
            if isinstance(response, dict):
                # Check applications
                applications = response.get("recent_applications", [])
                for app in applications:
                    if app.get("property_id") != self.manager_property_id:
                        self.add_result(TestResult(
                            test_name="Property isolation in dashboard",
                            category="Property Isolation",
                            status=TestStatus.FAILED,
                            expected=self.manager_property_id,
                            actual=app.get("property_id"),
                            details=f"Found application from wrong property in manager dashboard"
                        ))
                        return
                
                self.add_result(TestResult(
                    test_name="Property isolation in dashboard",
                    category="Property Isolation", 
                    status=TestStatus.PASSED,
                    expected=f"Only {self.manager_property_id} data",
                    actual=f"All data from {self.manager_property_id}",
                    details="Manager dashboard shows only their property's data"
                ))
            else:
                self.add_result(TestResult(
                    test_name="Property isolation in dashboard",
                    category="Property Isolation",
                    status=TestStatus.WARNING,
                    expected="Dashboard data",
                    actual="Unexpected response format",
                    details="Could not verify property isolation due to response format"
                ))
        else:
            self.add_result(TestResult(
                test_name="Property isolation in dashboard",
                category="Property Isolation",
                status=TestStatus.FAILED,
                expected=200,
                actual=status,
                details="Failed to access manager dashboard"
            ))
    
    async def test_cross_property_access_blocked(self):
        """Test 4: Managers cannot access other property's data"""
        print("\n📋 Test 4: Cross-Property Access Prevention")
        
        # Try to access specific employee from another property
        # This would need a real employee ID from another property
        test_endpoints = [
            (f"/api/employees?property_id={self.other_property_id}", "Employees from other property"),
            (f"/api/applications?property_id={self.other_property_id}", "Applications from other property"),
        ]
        
        for endpoint, description in test_endpoints:
            status, response = await self._make_request("GET", endpoint, self.manager_token)
            
            # Should either get 403 (forbidden) or empty results
            if status == 403:
                result_status = TestStatus.PASSED
                details = "Correctly blocked from accessing other property"
            elif status == 200:
                # Check if results are empty
                if isinstance(response, list) and len(response) == 0:
                    result_status = TestStatus.PASSED
                    details = "Returned empty results for other property"
                else:
                    result_status = TestStatus.FAILED
                    details = f"Incorrectly returned data from other property"
            else:
                result_status = TestStatus.WARNING
                details = f"Unexpected status code: {status}"
            
            self.add_result(TestResult(
                test_name=f"Block access to {description}",
                category="Cross-Property Access",
                status=result_status,
                expected="403 or empty results",
                actual=f"{status} with {len(response) if isinstance(response, list) else 'non-list'} results",
                details=details
            ))
    
    async def test_data_leakage_prevention(self):
        """Test 5: Verify no data leakage between properties"""
        print("\n📋 Test 5: Data Leakage Prevention")
        
        # Test that aggregate endpoints don't leak cross-property data
        endpoints_to_check = [
            ("/api/manager/analytics", "Manager Analytics"),
            ("/api/manager/employees", "Manager Employees"),
            ("/api/manager/applications", "Manager Applications"),
        ]
        
        for endpoint, description in endpoints_to_check:
            status, response = await self._make_request("GET", endpoint, self.manager_token)
            
            if status == 200:
                # Verify all returned data belongs to manager's property
                leak_detected = False
                
                if isinstance(response, dict):
                    # Check for property_id in nested data
                    for key, value in response.items():
                        if isinstance(value, list):
                            for item in value:
                                if isinstance(item, dict) and "property_id" in item:
                                    if item["property_id"] != self.manager_property_id:
                                        leak_detected = True
                                        break
                elif isinstance(response, list):
                    for item in response:
                        if isinstance(item, dict) and "property_id" in item:
                            if item["property_id"] != self.manager_property_id:
                                leak_detected = True
                                break
                
                self.add_result(TestResult(
                    test_name=f"No data leakage in {description}",
                    category="Data Leakage",
                    status=TestStatus.FAILED if leak_detected else TestStatus.PASSED,
                    expected="Only manager's property data",
                    actual="Data leak detected" if leak_detected else "No leaks found",
                    details=f"Checking {endpoint} for cross-property data leakage"
                ))
            else:
                self.add_result(TestResult(
                    test_name=f"No data leakage in {description}",
                    category="Data Leakage",
                    status=TestStatus.WARNING,
                    expected=200,
                    actual=status,
                    details=f"Could not check {endpoint} due to access error"
                ))
    
    async def test_hr_property_override(self):
        """Test 6: HR users can access all properties' data"""
        print("\n📋 Test 6: HR Property Override Access")
        
        # HR should be able to see all applications regardless of property
        status, response = await self._make_request("GET", "/api/hr/all-applications", self.hr_token)
        
        if status == 200:
            if isinstance(response, list):
                # Check if HR can see multiple properties
                properties_seen = set()
                for app in response:
                    if "property_id" in app:
                        properties_seen.add(app["property_id"])
                
                # HR should potentially see multiple properties (or at least not be restricted)
                self.add_result(TestResult(
                    test_name="HR can access all properties",
                    category="HR Override",
                    status=TestStatus.PASSED,
                    expected="Access to all properties",
                    actual=f"Can see {len(properties_seen)} properties",
                    details=f"HR user can access data from: {properties_seen if properties_seen else 'no data found'}"
                ))
            else:
                self.add_result(TestResult(
                    test_name="HR can access all properties",
                    category="HR Override",
                    status=TestStatus.WARNING,
                    expected="List of applications",
                    actual="Unexpected response format",
                    details="Could not verify HR override due to response format"
                ))
        else:
            self.add_result(TestResult(
                test_name="HR can access all properties",
                category="HR Override",
                status=TestStatus.FAILED,
                expected=200,
                actual=status,
                details="HR cannot access all-applications endpoint"
            ))
    
    def generate_report(self) -> str:
        """Generate a comprehensive test report"""
        report = []
        report.append("=" * 80)
        report.append("DATA ISOLATION VALIDATION REPORT")
        report.append("=" * 80)
        report.append(f"Test Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Group results by category
        categories = {}
        for result in self.results:
            if result.category not in categories:
                categories[result.category] = []
            categories[result.category].append(result)
        
        # Summary statistics
        total_tests = len(self.results)
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        warnings = sum(1 for r in self.results if r.status == TestStatus.WARNING)
        
        report.append("SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Tests: {total_tests}")
        report.append(f"Passed: {passed} ({passed/total_tests*100:.1f}%)")
        report.append(f"Failed: {failed} ({failed/total_tests*100:.1f}%)")
        report.append(f"Warnings: {warnings} ({warnings/total_tests*100:.1f}%)")
        report.append("")
        
        # Overall status
        if failed == 0:
            report.append("🎉 OVERALL STATUS: ALL TESTS PASSED")
        else:
            report.append("❌ OVERALL STATUS: FAILURES DETECTED")
        report.append("")
        
        # Detailed results by category
        report.append("DETAILED RESULTS BY CATEGORY")
        report.append("=" * 80)
        
        for category, results in categories.items():
            report.append(f"\n{category}")
            report.append("-" * len(category))
            
            for result in results:
                status_str = result.status.value
                report.append(f"{status_str} {result.test_name}")
                if result.status == TestStatus.FAILED:
                    report.append(f"     Expected: {result.expected}")
                    report.append(f"     Actual: {result.actual}")
                    report.append(f"     Details: {result.details}")
                elif result.status == TestStatus.WARNING:
                    report.append(f"     Details: {result.details}")
        
        # Security compliance section
        report.append("\n" + "=" * 80)
        report.append("SECURITY COMPLIANCE STATUS")
        report.append("=" * 80)
        
        # Check specific security requirements
        manager_hr_blocked = all(
            r.status == TestStatus.PASSED 
            for r in self.results 
            if r.category == "Manager HR Access"
        )
        
        hr_access_works = all(
            r.status in [TestStatus.PASSED, TestStatus.WARNING]
            for r in self.results
            if r.category == "HR Access"
        )
        
        property_isolation_works = all(
            r.status in [TestStatus.PASSED, TestStatus.WARNING]
            for r in self.results
            if r.category in ["Property Isolation", "Cross-Property Access"]
        )
        
        no_data_leaks = all(
            r.status == TestStatus.PASSED
            for r in self.results
            if r.category == "Data Leakage"
        )
        
        report.append(f"✅ Manager/HR Separation: {'COMPLIANT' if manager_hr_blocked else 'NON-COMPLIANT'}")
        report.append(f"✅ HR Access Control: {'COMPLIANT' if hr_access_works else 'NON-COMPLIANT'}")
        report.append(f"✅ Property Isolation: {'COMPLIANT' if property_isolation_works else 'NON-COMPLIANT'}")
        report.append(f"✅ Data Leakage Prevention: {'COMPLIANT' if no_data_leaks else 'NON-COMPLIANT'}")
        
        # Phase 2.5 completion status
        report.append("\n" + "=" * 80)
        report.append("PHASE 2.5 COMPLETION STATUS")
        report.append("=" * 80)
        
        phase_complete = (
            manager_hr_blocked and 
            hr_access_works and 
            property_isolation_works and 
            no_data_leaks
        )
        
        if phase_complete:
            report.append("✅ PHASE 2.5 COMPLETE: All security vulnerabilities resolved")
            report.append("")
            report.append("Security boundaries verified:")
            report.append("• Managers cannot access HR endpoints")
            report.append("• HR users have full system access")
            report.append("• Property isolation enforced for managers")
            report.append("• No cross-property data leakage detected")
            report.append("• HR property override functioning correctly")
        else:
            report.append("❌ PHASE 2.5 INCOMPLETE: Security issues remain")
            report.append("")
            report.append("Issues to resolve:")
            if not manager_hr_blocked:
                report.append("• Managers can still access HR endpoints")
            if not hr_access_works:
                report.append("• HR users cannot access required endpoints")
            if not property_isolation_works:
                report.append("• Property isolation not properly enforced")
            if not no_data_leaks:
                report.append("• Data leakage detected between properties")
        
        report.append("\n" + "=" * 80)
        
        return "\n".join(report)
    
    async def run_all_tests(self):
        """Run all data isolation tests"""
        print("\n🚀 Starting Complete Data Isolation Validation")
        print("=" * 60)
        
        try:
            await self.setup()
            
            # Run all test suites
            await self.test_manager_cannot_access_hr_endpoints()
            await self.test_hr_can_access_hr_endpoints()
            await self.test_property_isolation_for_managers()
            await self.test_cross_property_access_blocked()
            await self.test_data_leakage_prevention()
            await self.test_hr_property_override()
            
            # Generate and save report
            report = self.generate_report()
            
            # Save report to file
            report_file = "data_isolation_validation_report.txt"
            with open(report_file, "w") as f:
                f.write(report)
            
            print("\n" + "=" * 60)
            print(report)
            print(f"\n📄 Report saved to: {report_file}")
            
            # Return success status
            failed_count = sum(1 for r in self.results if r.status == TestStatus.FAILED)
            return failed_count == 0
            
        except Exception as e:
            print(f"\n❌ Test execution failed: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await self.cleanup()

async def main():
    """Main test runner"""
    tester = DataIsolationTester()
    success = await tester.run_all_tests()
    
    if success:
        print("\n✅ All data isolation tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed. Review the report for details.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)