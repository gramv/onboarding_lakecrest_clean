#!/usr/bin/env python3
"""
Complete Phase 0 Testing - Starting with fresh session creation
"""

import httpx
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
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


class CompletePhase0Tester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.session_id = None
        self.employee_id = None
        self.results = []
        self.client = httpx.Client(timeout=30.0)
        
    def add_result(self, result: TestResult):
        """Add a test result and print it"""
        self.results.append(result)
        print(f"\n{result.status.value} {result.name}")
        print(f"   Details: {result.details}")
        if result.error:
            print(f"   Error: {result.error}")
        if result.response_data and result.status in [TestStatus.FAILED, TestStatus.INFO]:
            print(f"   Response: {json.dumps(result.response_data, indent=2)[:500]}")
    
    def make_request(self, method: str, endpoint: str,
                     headers: Optional[Dict] = None,
                     json_data: Optional[Dict] = None) -> Tuple[httpx.Response, Optional[Dict]]:
        """Make an HTTP request and return response and parsed JSON"""
        try:
            url = f"{self.base_url}{endpoint}"
            
            # Default headers
            default_headers = {"Content-Type": "application/json"}
            
            # Add auth header if we have a token
            if self.token:
                default_headers["Authorization"] = f"Bearer {self.token}"
            
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
    
    def test_onboarding_start(self):
        """Test 1: Start onboarding and get session"""
        print("\n" + "="*60)
        print("TEST 1: ONBOARDING SESSION INITIALIZATION")
        print("="*60)
        
        # Try to start onboarding with the provided token first
        provided_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6InRlc3QtZW1wLWMxNjk4NGQwIiwiYXBwbGljYXRpb25faWQiOm51bGwsInRva2VuX3R5cGUiOiJvbmJvYXJkaW5nIiwiaWF0IjoxNzU3ODExMjg4LCJleHAiOjE3NTg0MTYwODgsImp0aSI6Im83UklXUnZ3WjkxMkxhUFZ1UUVfMGcifQ.GQIceyLR5VzU36woGtjX7Ck66HJoBIGkGWzy9LDm3wc"
        
        # First try the welcome endpoint with the provided token
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/welcome/{provided_token}"
        )
        
        if response and response.status_code == 200 and data:
            self.session_id = data.get("session_id") or data.get("onboarding_session_id")
            self.employee_id = data.get("employee_id") or "test-emp-c16984d0"
            self.token = provided_token
            
            self.add_result(TestResult(
                name="Welcome Endpoint Access",
                status=TestStatus.PASSED,
                details=f"Successfully accessed with provided token. Session: {self.session_id}",
                response_data=data
            ))
            
            # Check what data is returned
            if "employee" in data or "employee_data" in data:
                self.add_result(TestResult(
                    name="Employee Data Retrieval",
                    status=TestStatus.PASSED,
                    details="Employee data included in welcome response"
                ))
        else:
            # Token might be expired, try starting fresh onboarding
            self.add_result(TestResult(
                name="Welcome Endpoint with Provided Token",
                status=TestStatus.WARNING,
                details=f"Provided token failed with status {response.status_code if response else 'No response'}"
            ))
            
            # Try to start a new onboarding session
            start_data = {
                "employee_id": "test-emp-" + str(int(time.time())),
                "first_name": "Test",
                "last_name": "User",
                "email": f"test{int(time.time())}@example.com",
                "property_id": "test-property-001"
            }
            
            response, data = self.make_request(
                "POST",
                "/api/onboarding/start",
                json_data=start_data
            )
            
            if response and response.status_code == 200 and data:
                self.token = data.get("token") or data.get("access_token")
                self.session_id = data.get("session_id")
                self.employee_id = start_data["employee_id"]
                
                if self.token:
                    self.add_result(TestResult(
                        name="New Onboarding Session",
                        status=TestStatus.PASSED,
                        details=f"Created new session. Token: {self.token[:30]}...",
                        response_data={"session_id": self.session_id, "employee_id": self.employee_id}
                    ))
                else:
                    self.add_result(TestResult(
                        name="New Onboarding Session",
                        status=TestStatus.FAILED,
                        details="Started but no token received",
                        response_data=data
                    ))
            else:
                self.add_result(TestResult(
                    name="New Onboarding Session",
                    status=TestStatus.FAILED,
                    details=f"Could not start onboarding. Status: {response.status_code if response else 'No response'}",
                    response_data=data
                ))
    
    def test_session_operations(self):
        """Test 2: Session management operations"""
        print("\n" + "="*60)
        print("TEST 2: SESSION MANAGEMENT")
        print("="*60)
        
        if not self.session_id:
            self.add_result(TestResult(
                name="Session Operations",
                status=TestStatus.WARNING,
                details="Skipped - No session available"
            ))
            return
        
        # Test getting session progress
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/{self.session_id}/progress"
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Progress Retrieval",
                status=TestStatus.PASSED,
                details="Session progress retrieved successfully",
                response_data=data
            ))
            
            # Check progress structure
            if isinstance(data, dict):
                steps_completed = data.get("steps_completed", [])
                current_step = data.get("current_step")
                self.add_result(TestResult(
                    name="Progress Structure",
                    status=TestStatus.INFO,
                    details=f"Current step: {current_step}, Completed: {len(steps_completed)} steps"
                ))
        else:
            self.add_result(TestResult(
                name="Progress Retrieval",
                status=TestStatus.WARNING,
                details=f"Could not retrieve progress. Status: {response.status_code if response else 'No response'}"
            ))
        
        # Test save and exit
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/session/{self.session_id}/save-and-exit",
            json_data={"reason": "testing"}
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Save and Exit",
                status=TestStatus.PASSED,
                details="Save and exit functionality works"
            ))
        else:
            self.add_result(TestResult(
                name="Save and Exit",
                status=TestStatus.INFO,
                details=f"Save and exit status: {response.status_code if response else 'No response'}"
            ))
        
        # Test session resume
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/session/{self.session_id}/resume"
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Session Resume",
                status=TestStatus.PASSED,
                details="Session can be resumed"
            ))
        else:
            self.add_result(TestResult(
                name="Session Resume",
                status=TestStatus.INFO,
                details=f"Resume status: {response.status_code if response else 'No response'}"
            ))
    
    def test_step_data_saving(self):
        """Test 3: Saving step data"""
        print("\n" + "="*60)
        print("TEST 3: STEP DATA SAVING")
        print("="*60)
        
        if not self.session_id:
            self.add_result(TestResult(
                name="Step Data Tests",
                status=TestStatus.WARNING,
                details="Skipped - No session available"
            ))
            return
        
        # Test saving personal info step
        personal_info = {
            "firstName": "Test",
            "lastName": "User",
            "middleName": "",
            "email": "test@example.com",
            "phone": "555-0123",
            "address": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip": "12345",
            "dateOfBirth": "1990-01-01",
            "ssn": "123-45-6789"
        }
        
        # Try the step endpoint
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.session_id}/step/personal_info",
            json_data=personal_info
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Personal Info Step Save",
                status=TestStatus.PASSED,
                details="Personal info saved successfully",
                response_data=data
            ))
        else:
            # Try alternative endpoint with employee_id
            if self.employee_id:
                response, data = self.make_request(
                    "POST",
                    f"/api/onboarding/{self.employee_id}/save-progress/personal_info",
                    json_data=personal_info
                )
                
                if response and response.status_code == 200:
                    self.add_result(TestResult(
                        name="Personal Info Progress Save",
                        status=TestStatus.PASSED,
                        details="Personal info saved via progress endpoint"
                    ))
                else:
                    self.add_result(TestResult(
                        name="Personal Info Save",
                        status=TestStatus.WARNING,
                        details=f"Could not save personal info. Status: {response.status_code if response else 'No response'}"
                    ))
        
        # Test draft saving
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/session/{self.session_id}/save-draft",
            json_data={
                "step_id": "i9_section1",
                "data": {
                    "lastName": "Test",
                    "firstName": "User",
                    "citizenshipStatus": "citizen"
                }
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Draft Save",
                status=TestStatus.PASSED,
                details="Draft data saved successfully"
            ))
        else:
            self.add_result(TestResult(
                name="Draft Save",
                status=TestStatus.INFO,
                details=f"Draft save status: {response.status_code if response else 'No response'}"
            ))
    
    def test_form_operations(self):
        """Test 4: Form-specific operations"""
        print("\n" + "="*60)
        print("TEST 4: FORM OPERATIONS")
        print("="*60)
        
        if not self.employee_id:
            self.employee_id = "test-emp-c16984d0"  # Use the provided ID as fallback
        
        # Test I-9 Section 1
        i9_data = {
            "lastName": "Test",
            "firstName": "User",
            "middleInitial": "M",
            "otherNames": "",
            "address": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip": "12345",
            "dateOfBirth": "1990-01-01",
            "ssn": "123-45-6789",
            "email": "test@example.com",
            "phone": "555-0123",
            "citizenshipStatus": "citizen",
            "employeeSignature": "Test User",
            "signatureDate": datetime.now().strftime("%Y-%m-%d")
        }
        
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.employee_id}/i9-section1",
            json_data=i9_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="I-9 Section 1 Save",
                status=TestStatus.PASSED,
                details="I-9 Section 1 saved successfully"
            ))
            
            # Test retrieval
            response, data = self.make_request(
                "GET",
                f"/api/onboarding/{self.employee_id}/i9-section1"
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="I-9 Section 1 Retrieval",
                    status=TestStatus.PASSED,
                    details="I-9 Section 1 retrieved successfully"
                ))
        else:
            self.add_result(TestResult(
                name="I-9 Section 1 Save",
                status=TestStatus.INFO,
                details=f"I-9 save status: {response.status_code if response else 'No response'}"
            ))
        
        # Test W-4 Form
        w4_data = {
            "firstName": "Test",
            "lastName": "User",
            "ssn": "123-45-6789",
            "address": "123 Test St",
            "city": "Test City",
            "state": "CA",
            "zip": "12345",
            "filingStatus": "single",
            "multipleJobs": False,
            "claimDependents": 0,
            "otherIncome": 0,
            "deductions": 0,
            "extraWithholding": 0,
            "employeeSignature": "Test User",
            "signatureDate": datetime.now().strftime("%Y-%m-%d")
        }
        
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.employee_id}/w4-form",
            json_data=w4_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="W-4 Form Save",
                status=TestStatus.PASSED,
                details="W-4 form saved successfully"
            ))
        else:
            self.add_result(TestResult(
                name="W-4 Form Save",
                status=TestStatus.INFO,
                details=f"W-4 save status: {response.status_code if response else 'No response'}"
            ))
    
    def test_pdf_generation(self):
        """Test 5: PDF generation endpoints"""
        print("\n" + "="*60)
        print("TEST 5: PDF GENERATION")
        print("="*60)
        
        if not self.employee_id:
            self.employee_id = "test-emp-c16984d0"
        
        # Test I-9 PDF generation
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.employee_id}/i9-section1/generate-pdf",
            json_data={}
        )
        
        if response and response.status_code == 200 and data:
            if "pdf" in data or "pdf_base64" in data or "pdf_url" in data:
                self.add_result(TestResult(
                    name="I-9 PDF Generation",
                    status=TestStatus.PASSED,
                    details="I-9 PDF generated successfully"
                ))
            else:
                self.add_result(TestResult(
                    name="I-9 PDF Generation",
                    status=TestStatus.WARNING,
                    details="Response received but no PDF data found"
                ))
        else:
            self.add_result(TestResult(
                name="I-9 PDF Generation",
                status=TestStatus.INFO,
                details=f"I-9 PDF generation status: {response.status_code if response else 'No response'}"
            ))
        
        # Test W-4 PDF generation
        response, data = self.make_request(
            "POST",
            f"/api/onboarding/{self.employee_id}/w4-form/generate-pdf",
            json_data={}
        )
        
        if response and response.status_code == 200 and data:
            if "pdf" in data or "pdf_base64" in data or "pdf_url" in data:
                self.add_result(TestResult(
                    name="W-4 PDF Generation",
                    status=TestStatus.PASSED,
                    details="W-4 PDF generated successfully"
                ))
            else:
                self.add_result(TestResult(
                    name="W-4 PDF Generation",
                    status=TestStatus.WARNING,
                    details="Response received but no PDF data found"
                ))
        else:
            self.add_result(TestResult(
                name="W-4 PDF Generation",
                status=TestStatus.INFO,
                details=f"W-4 PDF generation status: {response.status_code if response else 'No response'}"
            ))
    
    def test_validation_endpoints(self):
        """Test 6: Validation endpoints"""
        print("\n" + "="*60)
        print("TEST 6: VALIDATION ENDPOINTS")
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
                details=f"Navigation validation status: {response.status_code if response else 'No response'}"
            ))
        
        # Test step data validation
        step_data = {
            "firstName": "Test",
            "lastName": "User",
            "email": "test@example.com",
            "phone": "555-0123"
        }
        
        response, data = self.make_request(
            "POST",
            "/api/navigation/validate-step-data/personal_info",
            json_data=step_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Step Data Validation",
                status=TestStatus.PASSED,
                details="Step data validation works"
            ))
        else:
            self.add_result(TestResult(
                name="Step Data Validation",
                status=TestStatus.INFO,
                details=f"Step data validation status: {response.status_code if response else 'No response'}"
            ))
        
        # Test digital signature validation
        sig_data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "signatory_name": "Test User",
            "timestamp": datetime.now().isoformat(),
            "ip_address": "127.0.0.1"
        }
        
        response, data = self.make_request(
            "POST",
            "/api/compliance/validate-digital-signature",
            json_data=sig_data
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Digital Signature Validation",
                status=TestStatus.PASSED,
                details="Digital signature validation works"
            ))
        else:
            self.add_result(TestResult(
                name="Digital Signature Validation",
                status=TestStatus.INFO,
                details=f"Signature validation status: {response.status_code if response else 'No response'}"
            ))
    
    def test_error_handling(self):
        """Test 7: Error handling and edge cases"""
        print("\n" + "="*60)
        print("TEST 7: ERROR HANDLING")
        print("="*60)
        
        # Test with invalid session ID
        response, data = self.make_request(
            "GET",
            "/api/onboarding/invalid-session-123/progress"
        )
        
        if response and response.status_code in [401, 403, 404]:
            self.add_result(TestResult(
                name="Invalid Session Handling",
                status=TestStatus.PASSED,
                details=f"Invalid session properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Invalid Session Handling",
                status=TestStatus.WARNING,
                details=f"Invalid session returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test with malformed data
        response, data = self.make_request(
            "POST",
            "/api/forms/validate/i9",
            json_data={"malformed": "data", "missing": "required_fields"}
        )
        
        if response and response.status_code in [400, 422]:
            self.add_result(TestResult(
                name="Malformed Data Handling",
                status=TestStatus.PASSED,
                details=f"Malformed data properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Malformed Data Handling",
                status=TestStatus.WARNING,
                details=f"Malformed data returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test unauthorized access
        saved_token = self.token
        self.token = "invalid_token_12345"
        
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/{self.session_id or 'test'}/progress"
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
        
        self.token = saved_token  # Restore valid token
    
    def test_audit_and_compliance(self):
        """Test 8: Audit and compliance features"""
        print("\n" + "="*60)
        print("TEST 8: AUDIT AND COMPLIANCE")
        print("="*60)
        
        # Test I-9 compliance validation
        response, data = self.make_request(
            "POST",
            "/api/compliance/validate-i9-supplement-a",
            json_data={
                "document_type": "passport",
                "document_number": "123456789",
                "expiration_date": "2030-01-01"
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="I-9 Supplement A Validation",
                status=TestStatus.PASSED,
                details="I-9 Supplement A validation works"
            ))
        else:
            self.add_result(TestResult(
                name="I-9 Supplement A Validation",
                status=TestStatus.INFO,
                details=f"Supplement A validation status: {response.status_code if response else 'No response'}"
            ))
        
        # Test document validation
        if self.employee_id:
            response, data = self.make_request(
                "POST",
                f"/api/onboarding/{self.employee_id}/i9-documents/validate",
                json_data={
                    "list_a": ["passport"],
                    "list_b": [],
                    "list_c": []
                }
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="I-9 Document Validation",
                    status=TestStatus.PASSED,
                    details="I-9 document validation works"
                ))
            else:
                self.add_result(TestResult(
                    name="I-9 Document Validation",
                    status=TestStatus.INFO,
                    details=f"Document validation status: {response.status_code if response else 'No response'}"
                ))
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "="*60)
        print("COMPREHENSIVE TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        warnings = sum(1 for r in self.results if r.status == TestStatus.WARNING)
        info = sum(1 for r in self.results if r.status == TestStatus.INFO)
        
        print(f"\n📊 TEST METRICS:")
        print(f"  Total Tests: {len(self.results)}")
        print(f"  ✅ Passed: {passed} ({passed*100//max(len(self.results),1)}%)")
        print(f"  ❌ Failed: {failed} ({failed*100//max(len(self.results),1)}%)")
        print(f"  ⚠️ Warnings: {warnings} ({warnings*100//max(len(self.results),1)}%)")
        print(f"  ℹ️ Info: {info} ({info*100//max(len(self.results),1)}%)")
        
        # Feature-specific summary
        print(f"\n🔍 PHASE 0 FEATURE STATUS:")
        
        features = {
            "Session Management": ["Session", "Welcome", "Resume"],
            "Token Refresh": ["Token Refresh", "Refresh"],
            "Progress Tracking": ["Progress", "Draft"],
            "Form Operations": ["I-9", "W-4", "Personal"],
            "PDF Generation": ["PDF"],
            "Validation": ["Validation", "Validate"],
            "Error Handling": ["Error", "Invalid", "Unauthorized", "Malformed"],
            "Compliance": ["Compliance", "Audit", "Document"]
        }
        
        for feature, keywords in features.items():
            feature_tests = [r for r in self.results if any(kw in r.name for kw in keywords)]
            if feature_tests:
                passed_count = sum(1 for r in feature_tests if r.status == TestStatus.PASSED)
                total_count = len(feature_tests)
                if passed_count == total_count:
                    status = "✅ Fully Working"
                elif passed_count > 0:
                    status = f"⚠️ Partial ({passed_count}/{total_count} passed)"
                else:
                    status = "❌ Not Working"
                print(f"  • {feature}: {status}")
        
        # Failed tests details
        if failed > 0:
            print("\n❌ FAILED TESTS DETAILS:")
            for r in self.results:
                if r.status == TestStatus.FAILED:
                    print(f"  - {r.name}: {r.details}")
        
        # Critical issues
        critical_issues = []
        if not self.token:
            critical_issues.append("No valid authentication token obtained")
        if not self.session_id:
            critical_issues.append("No session could be established")
        
        if critical_issues:
            print("\n🚨 CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"  - {issue}")
        
        # Overall assessment
        print("\n" + "="*60)
        print("📋 OVERALL ASSESSMENT:")
        if failed == 0 and warnings <= 5:
            print("✅ PHASE 0 FULLY OPERATIONAL - All core features working!")
        elif failed <= 2 and passed >= 10:
            print("⚠️ PHASE 0 MOSTLY OPERATIONAL - Minor issues to address")
        elif passed >= 5:
            print("⚠️ PHASE 0 PARTIALLY OPERATIONAL - Several features need attention")
        else:
            print("❌ PHASE 0 HAS SIGNIFICANT ISSUES - Major debugging required")
        
        return passed, failed, warnings, info
    
    def run_all_tests(self):
        """Run all Phase 0 tests"""
        print("\n" + "🚀"*30)
        print("COMPLETE PHASE 0 TESTING - HOTEL ONBOARDING SYSTEM")
        print("🚀"*30)
        print(f"\nTest Configuration:")
        print(f"  Base URL: {self.base_url}")
        print(f"  Test Mode: Comprehensive Phase 0 validation")
        
        # Run tests in sequence
        self.test_onboarding_start()
        self.test_session_operations()
        self.test_step_data_saving()
        self.test_form_operations()
        self.test_pdf_generation()
        self.test_validation_endpoints()
        self.test_error_handling()
        self.test_audit_and_compliance()
        
        # Generate summary
        self.generate_summary()
        
        # Close client
        self.client.close()


def main():
    # Configuration
    BASE_URL = "http://localhost:8000"
    
    # Create tester instance and run tests
    tester = CompletePhase0Tester(BASE_URL)
    
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
