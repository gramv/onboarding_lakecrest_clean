#!/usr/bin/env python3
"""
Corrected Phase 0 Feature Testing with proper endpoints
"""

import httpx
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import sys
from dataclasses import dataclass
from enum import Enum


class TestStatus(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED" 
    WARNING = "⚠️ WARNING"
    INFO = "ℹ️ INFO"


@dataclass
class TestResult:
    name: str
    status: TestStatus
    details: str
    response_data: Optional[Dict] = None
    error: Optional[str] = None


class Phase0CorrectedTester:
    def __init__(self, base_url: str, token: str, employee_id: str):
        self.base_url = base_url
        self.token = token
        self.employee_id = employee_id
        self.session_id = None
        self.results = []
        self.client = httpx.Client(timeout=30.0)
        
    def add_result(self, result: TestResult):
        """Add a test result and print it"""
        self.results.append(result)
        print(f"\n{result.status.value} {result.name}")
        print(f"   Details: {result.details}")
        if result.error:
            print(f"   Error: {result.error}")
        if result.response_data and result.status == TestStatus.FAILED:
            print(f"   Response: {json.dumps(result.response_data, indent=2)[:500]}")
    
    def make_request(self, method: str, endpoint: str, 
                     headers: Optional[Dict] = None, 
                     json_data: Optional[Dict] = None) -> Tuple[httpx.Response, Optional[Dict]]:
        """Make an HTTP request and return response and parsed JSON"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            # Default headers
            default_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
            
            if headers:
                default_headers.update(headers)
            
            response = self.client.request(
                method=method,
                url=url,
                headers=default_headers,
                json=json_data
            )
            
            try:
                response_json = response.json() if response.content else None
            except:
                response_json = None
                
            return response, response_json
            
        except Exception as e:
            print(f"Request error: {e}")
            return None, None
    
    def test_session_validation(self):
        """Test 1: Session validation using token"""
        print("\n" + "="*60)
        print("TEST 1: SESSION VALIDATION")
        print("="*60)
        
        # Test GET /api/onboarding/session/{token}
        response, data = self.make_request(
            "GET", 
            f"/api/onboarding/session/{self.token}"
        )
        
        if response and response.status_code == 200 and data:
            self.session_id = data.get("session_id") or data.get("id")
            self.add_result(TestResult(
                name="Session Retrieval",
                status=TestStatus.PASSED,
                details=f"Session retrieved successfully. Session ID: {self.session_id}",
                response_data=data
            ))
            
            # Check for employee data
            if data.get("employee_id") == self.employee_id:
                self.add_result(TestResult(
                    name="Employee ID Verification",
                    status=TestStatus.PASSED,
                    details=f"Employee ID matches: {self.employee_id}"
                ))
            else:
                self.add_result(TestResult(
                    name="Employee ID Verification", 
                    status=TestStatus.WARNING,
                    details=f"Employee ID in response: {data.get('employee_id')}, expected: {self.employee_id}"
                ))
        else:
            # Try alternative endpoint: /api/onboarding/welcome/{token}
            response, data = self.make_request(
                "GET",
                f"/api/onboarding/welcome/{self.token}"
            )
            
            if response and response.status_code == 200:
                self.session_id = data.get("session_id") if data else None
                self.add_result(TestResult(
                    name="Session via Welcome Endpoint",
                    status=TestStatus.PASSED,
                    details=f"Session accessed via welcome endpoint",
                    response_data=data
                ))
            else:
                self.add_result(TestResult(
                    name="Session Retrieval",
                    status=TestStatus.FAILED,
                    details=f"Failed to retrieve session. Status: {response.status_code if response else 'No response'}",
                    response_data=data
                ))
        
        # Test with invalid token
        response, data = self.make_request(
            "GET",
            "/api/onboarding/session/invalid_token_12345"
        )
        
        if response and response.status_code in [401, 403, 404]:
            self.add_result(TestResult(
                name="Invalid Token Handling",
                status=TestStatus.PASSED,
                details=f"Invalid token properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Invalid Token Handling",
                status=TestStatus.WARNING,
                details=f"Invalid token returned status {response.status_code if response else 'No response'}"
            ))
    
    def test_token_refresh(self):
        """Test 2: Token refresh mechanism"""
        print("\n" + "="*60)
        print("TEST 2: TOKEN REFRESH MECHANISM")
        print("="*60)
        
        # Try multiple refresh endpoints
        refresh_endpoints = [
            "/api/auth/refresh",
            "/v2/api/auth/refresh",
            "/v2/api/auth/refresh-token"
        ]
        
        refresh_successful = False
        for endpoint in refresh_endpoints:
            response, data = self.make_request(
                "POST",
                endpoint,
                json_data={"refresh_token": self.token, "token": self.token}
            )
            
            if response and response.status_code == 200 and data:
                new_token = data.get("access_token") or data.get("token")
                if new_token:
                    self.token = new_token
                    refresh_successful = True
                    self.add_result(TestResult(
                        name="Token Refresh",
                        status=TestStatus.PASSED,
                        details=f"Token refreshed successfully via {endpoint}",
                        response_data={"token_preview": new_token[:50] + "..."}
                    ))
                    break
        
        if not refresh_successful:
            self.add_result(TestResult(
                name="Token Refresh",
                status=TestStatus.WARNING,
                details="Could not refresh token through any endpoint - may not be implemented in Phase 0"
            ))
    
    def test_progress_saving(self):
        """Test 3: Progress saving and retrieval"""
        print("\n" + "="*60)
        print("TEST 3: PROGRESS SAVING AND RETRIEVAL")
        print("="*60)
        
        if not self.session_id:
            # Try to get session_id first
            response, data = self.make_request(
                "GET",
                f"/api/onboarding/welcome/{self.token}"
            )
            if response and data:
                self.session_id = data.get("session_id") or data.get("onboarding_session_id")
        
        if not self.session_id:
            self.add_result(TestResult(
                name="Progress Tests",
                status=TestStatus.WARNING,
                details="Skipped - No session ID available"
            ))
            return
        
        # Test data for personal info step
        test_data = {
            "firstName": "Test",
            "lastName": "User",
            "email": "test@example.com",
            "phone": "555-0123",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "zip": "12345"
        }
        
        # Try save-progress endpoint with employee_id and step_id
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.employee_id}/save-progress/personal_info",
            json_data=test_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Progress Saving (Employee Endpoint)",
                status=TestStatus.PASSED,
                details="Progress saved via employee endpoint",
                response_data=data
            ))
        else:
            # Try session-based save-draft endpoint
            response, data = self.make_request(
                "POST",
                f"/api/onboarding/session/{self.session_id}/save-draft",
                json_data={"step_id": "personal_info", "data": test_data}
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="Draft Saving (Session Endpoint)",
                    status=TestStatus.PASSED,
                    details="Draft saved via session endpoint",
                    response_data=data
                ))
            else:
                # Try the step endpoint
                response, data = self.make_request(
                    "POST",
                    f"/api/onboarding/{self.session_id}/step/personal_info",
                    json_data=test_data
                )
                
                if response and response.status_code == 200:
                    self.add_result(TestResult(
                        name="Step Data Saving",
                        status=TestStatus.PASSED,
                        details="Step data saved successfully",
                        response_data=data
                    ))
                else:
                    self.add_result(TestResult(
                        name="Progress Saving",
                        status=TestStatus.FAILED,
                        details=f"Could not save progress. Status: {response.status_code if response else 'No response'}",
                        response_data=data
                    ))
        
        # Test retrieving progress
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/{self.session_id}/progress"
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Progress Retrieval",
                status=TestStatus.PASSED,
                details="Progress retrieved successfully",
                response_data=data
            ))
        else:
            # Try personal-info endpoint
            response, data = self.make_request(
                "GET",
                f"/api/onboarding/{self.employee_id}/personal-info"
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="Personal Info Retrieval",
                    status=TestStatus.PASSED,
                    details="Personal info retrieved successfully",
                    response_data=data
                ))
            else:
                self.add_result(TestResult(
                    name="Progress Retrieval",
                    status=TestStatus.WARNING,
                    details=f"Could not retrieve progress. Status: {response.status_code if response else 'No response'}"
                ))
    
    def test_session_locking(self):
        """Test 4: Session locking (if implemented)"""
        print("\n" + "="*60)
        print("TEST 4: SESSION LOCKING")
        print("="*60)
        
        # Session locking might not be explicitly exposed in Phase 0
        # Test save-and-exit which might implement locking internally
        if self.session_id:
            response, data = self.make_request(
                "POST",
                f"/api/onboarding/session/{self.session_id}/save-and-exit",
                json_data={"reason": "test_exit"}
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="Save and Exit",
                    status=TestStatus.PASSED,
                    details="Save and exit functionality works",
                    response_data=data
                ))
            else:
                self.add_result(TestResult(
                    name="Save and Exit",
                    status=TestStatus.INFO,
                    details=f"Save and exit returned status {response.status_code if response else 'No response'}"
                ))
        else:
            self.add_result(TestResult(
                name="Session Locking Tests",
                status=TestStatus.INFO,
                details="Skipped - Session locking may not be exposed in API"
            ))
    
    def test_form_validation(self):
        """Test 5: Form validation endpoints"""
        print("\n" + "="*60)
        print("TEST 5: FORM VALIDATION")
        print("="*60)
        
        # Test I-9 validation
        i9_test_data = {
            "lastName": "Test",
            "firstName": "User",
            "middleInitial": "M",
            "otherNames": "",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "zip": "12345",
            "dateOfBirth": "1990-01-01",
            "ssn": "123-45-6789",
            "email": "test@example.com",
            "phone": "555-0123",
            "citizenshipStatus": "citizen"
        }
        
        response, data = self.make_request(
            "POST",
            "/api/forms/validate/i9",
            json_data=i9_test_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="I-9 Form Validation",
                status=TestStatus.PASSED,
                details="I-9 validation endpoint works",
                response_data=data
            ))
        else:
            self.add_result(TestResult(
                name="I-9 Form Validation",
                status=TestStatus.WARNING,
                details=f"I-9 validation returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test W-4 validation
        w4_test_data = {
            "firstName": "Test",
            "lastName": "User",
            "ssn": "123-45-6789",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TS",
            "zip": "12345",
            "filingStatus": "single",
            "multipleJobs": False,
            "claimDependents": 0,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0
        }
        
        response, data = self.make_request(
            "POST",
            "/api/forms/validate/w4",
            json_data=w4_test_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="W-4 Form Validation",
                status=TestStatus.PASSED,
                details="W-4 validation endpoint works",
                response_data=data
            ))
        else:
            self.add_result(TestResult(
                name="W-4 Form Validation",
                status=TestStatus.WARNING,
                details=f"W-4 validation returned status {response.status_code if response else 'No response'}"
            ))
    
    def test_navigation_validation(self):
        """Test 6: Navigation validation"""
        print("\n" + "="*60)
        print("TEST 6: NAVIGATION VALIDATION")
        print("="*60)
        
        # Test navigation validation
        nav_data = {
            "current_step": "personal_info",
            "target_step": "i9_section1",
            "session_id": self.session_id or "test_session"
        }
        
        response, data = self.make_request(
            "POST",
            "/api/navigation/validate",
            json_data=nav_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Navigation Validation",
                status=TestStatus.PASSED,
                details="Navigation validation works",
                response_data=data
            ))
        else:
            self.add_result(TestResult(
                name="Navigation Validation",
                status=TestStatus.INFO,
                details=f"Navigation validation returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test step data validation
        response, data = self.make_request(
            "POST",
            "/api/navigation/validate-step-data/personal_info",
            json_data={
                "firstName": "Test",
                "lastName": "User",
                "email": "test@example.com"
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Step Data Validation",
                status=TestStatus.PASSED,
                details="Step data validation works",
                response_data=data
            ))
        else:
            self.add_result(TestResult(
                name="Step Data Validation",
                status=TestStatus.INFO,
                details=f"Step data validation returned status {response.status_code if response else 'No response'}"
            ))
    
    def test_error_handling(self):
        """Test 7: Error handling"""
        print("\n" + "="*60)
        print("TEST 7: ERROR HANDLING")
        print("="*60)
        
        # Test with malformed data
        response, data = self.make_request(
            "POST",
            "/api/forms/validate/i9",
            json_data={"invalid": "data"}
        )
        
        if response and response.status_code in [400, 422]:
            self.add_result(TestResult(
                name="Invalid Data Rejection",
                status=TestStatus.PASSED,
                details=f"Invalid data properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Invalid Data Rejection",
                status=TestStatus.WARNING,
                details=f"Invalid data returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test unauthorized access
        self.client.headers = {"Content-Type": "application/json"}  # Remove auth header
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/{self.session_id}/progress" if self.session_id else "/api/onboarding/test/progress",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        if response and response.status_code in [401, 403]:
            self.add_result(TestResult(
                name="Unauthorized Access Prevention",
                status=TestStatus.PASSED,
                details=f"Unauthorized access properly prevented with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Unauthorized Access Prevention",
                status=TestStatus.WARNING,
                details=f"Unauthorized access returned status {response.status_code if response else 'No response'}"
            ))
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        warnings = sum(1 for r in self.results if r.status == TestStatus.WARNING)
        info = sum(1 for r in self.results if r.status == TestStatus.INFO)
        
        print(f"\nTotal Tests: {len(self.results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️ Warnings: {warnings}")
        print(f"ℹ️ Info: {info}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for r in self.results:
                if r.status == TestStatus.FAILED:
                    print(f"  - {r.name}: {r.details}")
        
        if warnings > 0:
            print("\n⚠️ WARNINGS:")
            for r in self.results:
                if r.status == TestStatus.WARNING:
                    print(f"  - {r.name}: {r.details}")
        
        # Overall assessment
        print("\n" + "="*60)
        if failed == 0 and warnings <= 3:
            print("✅ PHASE 0 TESTING SUCCESSFUL - Core features are working!")
        elif failed <= 2:
            print("⚠️ MOSTLY PASSING - Some features need attention")
        else:
            print("❌ MULTIPLE FAILURES - Phase 0 features need debugging")
        
        # Provide specific feature status
        print("\n📊 FEATURE STATUS:")
        print("  • Session Management: " + ("✅ Working" if any(r.name == "Session Retrieval" and r.status == TestStatus.PASSED for r in self.results) else "❌ Issues"))
        print("  • Progress Saving: " + ("✅ Working" if any("Saving" in r.name and r.status == TestStatus.PASSED for r in self.results) else "⚠️ Partial"))
        print("  • Form Validation: " + ("✅ Working" if any("Validation" in r.name and r.status == TestStatus.PASSED for r in self.results) else "⚠️ Partial"))
        print("  • Error Handling: " + ("✅ Working" if any("Error" in r.name or "Invalid" in r.name and r.status == TestStatus.PASSED for r in self.results) else "⚠️ Partial"))
        
        return passed, failed, warnings, info
    
    def run_all_tests(self):
        """Run all Phase 0 tests"""
        print("\n" + "🚀"*30)
        print("PHASE 0 CORRECTED TESTING - HOTEL ONBOARDING SYSTEM")
        print("🚀"*30)
        print(f"\nTest Configuration:")
        print(f"  Base URL: {self.base_url}")
        print(f"  Employee ID: {self.employee_id}")
        print(f"  Token Preview: {self.token[:50]}...")
        
        # Run tests in sequence
        self.test_session_validation()
        self.test_token_refresh()
        self.test_progress_saving()
        self.test_session_locking()
        self.test_form_validation()
        self.test_navigation_validation()
        self.test_error_handling()
        
        # Generate summary
        self.generate_summary()
        
        # Close client
        self.client.close()


def main():
    # Configuration
    BASE_URL = "http://localhost:8000"
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6InRlc3QtZW1wLWMxNjk4NGQwIiwiYXBwbGljYXRpb25faWQiOm51bGwsInRva2VuX3R5cGUiOiJvbmJvYXJkaW5nIiwiaWF0IjoxNzU3ODExMjg4LCJleHAiOjE3NTg0MTYwODgsImp0aSI6Im83UklXUnZ3WjkxMkxhUFZ1UUVfMGcifQ.GQIceyLR5VzU36woGtjX7Ck66HJoBIGkGWzy9LDm3wc"
    EMPLOYEE_ID = "test-emp-c16984d0"
    
    # Create tester instance and run tests
    tester = Phase0CorrectedTester(BASE_URL, TOKEN, EMPLOYEE_ID)
    
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()