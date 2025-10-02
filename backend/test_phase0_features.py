#!/usr/bin/env python3
"""
Comprehensive Phase 0 Feature Testing for Hotel Onboarding System
Tests token refresh, session locking, session management, progress saving, and audit logging
"""

import httpx
import json
import time
from datetime import datetime, timedelta
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


class Phase0Tester:
    def __init__(self, base_url: str, token: str, employee_id: str):
        self.base_url = base_url
        self.token = token
        self.employee_id = employee_id
        self.session_id = None
        self.lock_token = None
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
            return None, None
    
    def test_session_validation(self):
        """Test 1: Token validation and session creation"""
        print("\n" + "="*60)
        print("TEST 1: SESSION VALIDATION AND CREATION")
        print("="*60)
        
        # Test valid token validation
        response, data = self.make_request(
            "POST", 
            "/api/onboarding/validate-token",
            json_data={"token": self.token}
        )
        
        if response and response.status_code == 200 and data:
            self.session_id = data.get("session_id")
            self.add_result(TestResult(
                name="Token Validation",
                status=TestStatus.PASSED,
                details=f"Session created successfully. Session ID: {self.session_id}",
                response_data=data
            ))
            
            # Verify session data
            if data.get("valid") and data.get("employee_id") == self.employee_id:
                self.add_result(TestResult(
                    name="Session Data Verification",
                    status=TestStatus.PASSED,
                    details=f"Employee ID matches: {data.get('employee_id')}"
                ))
            else:
                self.add_result(TestResult(
                    name="Session Data Verification",
                    status=TestStatus.FAILED,
                    details="Employee ID mismatch or invalid session",
                    response_data=data
                ))
        else:
            self.add_result(TestResult(
                name="Token Validation",
                status=TestStatus.FAILED,
                details=f"Failed to validate token. Status: {response.status_code if response else 'No response'}",
                response_data=data,
                error=str(response.text if response else "No response")
            ))
        
        # Test invalid token
        response, data = self.make_request(
            "POST",
            "/api/onboarding/validate-token",
            json_data={"token": "invalid_token_12345"}
        )
        
        if response and response.status_code in [401, 403]:
            self.add_result(TestResult(
                name="Invalid Token Rejection",
                status=TestStatus.PASSED,
                details=f"Invalid token properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Invalid Token Rejection",
                status=TestStatus.FAILED,
                details=f"Invalid token not properly rejected. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
    
    def test_token_refresh(self):
        """Test 2: Token refresh mechanism"""
        print("\n" + "="*60)
        print("TEST 2: TOKEN REFRESH MECHANISM")
        print("="*60)
        
        # Test token refresh
        response, data = self.make_request(
            "POST",
            "/api/onboarding/refresh-token",
            json_data={"token": self.token}
        )
        
        if response and response.status_code == 200 and data:
            new_token = data.get("token")
            if new_token and new_token != self.token:
                self.token = new_token  # Update to new token for future requests
                self.add_result(TestResult(
                    name="Token Refresh",
                    status=TestStatus.PASSED,
                    details=f"Token refreshed successfully. New token received.",
                    response_data={"token_preview": new_token[:50] + "..."}
                ))
                
                # Verify expiration extension
                if "expires_at" in data:
                    self.add_result(TestResult(
                        name="Token Expiration Extension",
                        status=TestStatus.PASSED,
                        details=f"Token expiration extended to: {data.get('expires_at')}"
                    ))
            else:
                self.add_result(TestResult(
                    name="Token Refresh",
                    status=TestStatus.FAILED,
                    details="No new token received or token unchanged",
                    response_data=data
                ))
        else:
            self.add_result(TestResult(
                name="Token Refresh",
                status=TestStatus.FAILED,
                details=f"Failed to refresh token. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
        
        # Test immediate re-refresh (should be rejected if <1 day validity)
        response, data = self.make_request(
            "POST",
            "/api/onboarding/refresh-token",
            json_data={"token": self.token}
        )
        
        if response and response.status_code in [400, 429]:
            self.add_result(TestResult(
                name="Premature Refresh Rejection",
                status=TestStatus.PASSED,
                details=f"Premature refresh properly rejected with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Premature Refresh Rejection",
                status=TestStatus.WARNING,
                details=f"Premature refresh may not be properly controlled. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
    
    def test_session_locking(self):
        """Test 3: Session locking system"""
        print("\n" + "="*60)
        print("TEST 3: SESSION LOCKING SYSTEM")
        print("="*60)
        
        if not self.session_id:
            self.add_result(TestResult(
                name="Session Locking Tests",
                status=TestStatus.WARNING,
                details="Skipped - No session ID available"
            ))
            return
        
        # Test lock acquisition
        response, data = self.make_request(
            "POST",
            "/api/onboarding/session/lock",
            json_data={
                "session_id": self.session_id,
                "action": "acquire"
            }
        )
        
        if response and response.status_code == 200 and data:
            self.lock_token = data.get("lock_token")
            if self.lock_token:
                self.add_result(TestResult(
                    name="Lock Acquisition",
                    status=TestStatus.PASSED,
                    details=f"Lock acquired successfully. Lock token: {self.lock_token[:20]}...",
                    response_data=data
                ))
            else:
                self.add_result(TestResult(
                    name="Lock Acquisition",
                    status=TestStatus.FAILED,
                    details="No lock token received",
                    response_data=data
                ))
        else:
            self.add_result(TestResult(
                name="Lock Acquisition",
                status=TestStatus.FAILED,
                details=f"Failed to acquire lock. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
        
        # Test duplicate lock prevention
        response, data = self.make_request(
            "POST",
            "/api/onboarding/session/lock",
            json_data={
                "session_id": self.session_id,
                "action": "acquire"
            }
        )
        
        if response and response.status_code in [409, 423]:
            self.add_result(TestResult(
                name="Duplicate Lock Prevention",
                status=TestStatus.PASSED,
                details=f"Duplicate lock properly prevented with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Duplicate Lock Prevention",
                status=TestStatus.FAILED,
                details=f"Duplicate lock not properly prevented. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
        
        # Test lock release
        if self.lock_token:
            response, data = self.make_request(
                "POST",
                "/api/onboarding/session/lock",
                json_data={
                    "session_id": self.session_id,
                    "action": "release",
                    "lock_token": self.lock_token
                }
            )
            
            if response and response.status_code == 200:
                self.add_result(TestResult(
                    name="Lock Release",
                    status=TestStatus.PASSED,
                    details="Lock released successfully",
                    response_data=data
                ))
                
                # Test re-acquisition after release
                response, data = self.make_request(
                    "POST",
                    "/api/onboarding/session/lock",
                    json_data={
                        "session_id": self.session_id,
                        "action": "acquire"
                    }
                )
                
                if response and response.status_code == 200:
                    self.add_result(TestResult(
                        name="Re-acquisition After Release",
                        status=TestStatus.PASSED,
                        details="Lock can be re-acquired after release"
                    ))
                    
                    # Clean up - release the lock again
                    if data and data.get("lock_token"):
                        self.make_request(
                            "POST",
                            "/api/onboarding/session/lock",
                            json_data={
                                "session_id": self.session_id,
                                "action": "release",
                                "lock_token": data.get("lock_token")
                            }
                        )
            else:
                self.add_result(TestResult(
                    name="Lock Release",
                    status=TestStatus.FAILED,
                    details=f"Failed to release lock. Status: {response.status_code if response else 'No response'}",
                    response_data=data
                ))
    
    def test_progress_saving(self):
        """Test 4: Progress saving and retrieval"""
        print("\n" + "="*60)
        print("TEST 4: PROGRESS SAVING AND RETRIEVAL")
        print("="*60)
        
        # Prepare test data
        test_progress_data = {
            "step_id": "personal_info",
            "data": {
                "firstName": "Test",
                "lastName": "User",
                "email": "test@example.com",
                "phone": "555-0123",
                "address": {
                    "street": "123 Test St",
                    "city": "Test City",
                    "state": "TS",
                    "zip": "12345"
                }
            },
            "completed": False,
            "timestamp": datetime.now().isoformat()
        }
        
        # Test saving progress
        response, data = self.make_request(
            "POST",
            "/api/onboarding/save-progress",
            json_data={
                "session_id": self.session_id,
                "progress_data": test_progress_data
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Progress Saving",
                status=TestStatus.PASSED,
                details="Progress saved successfully",
                response_data=data
            ))
            
            # Test retrieving saved progress
            response, data = self.make_request(
                "GET",
                f"/api/onboarding/progress/{self.session_id}"
            )
            
            if response and response.status_code == 200 and data:
                # Verify the saved data matches
                if "progress_data" in data or "data" in data:
                    saved_data = data.get("progress_data") or data.get("data")
                    if saved_data and isinstance(saved_data, dict):
                        # Check if our test data is present
                        if saved_data.get("step_id") == "personal_info":
                            self.add_result(TestResult(
                                name="Progress Retrieval",
                                status=TestStatus.PASSED,
                                details="Progress retrieved successfully and data matches",
                                response_data={"step_id": saved_data.get("step_id"), "has_data": bool(saved_data.get("data"))}
                            ))
                        else:
                            self.add_result(TestResult(
                                name="Progress Retrieval",
                                status=TestStatus.WARNING,
                                details="Progress retrieved but data structure differs",
                                response_data=data
                            ))
                    else:
                        self.add_result(TestResult(
                            name="Progress Retrieval",
                            status=TestStatus.PASSED,
                            details="Progress endpoint accessible",
                            response_data=data
                        ))
                else:
                    self.add_result(TestResult(
                        name="Progress Retrieval",
                        status=TestStatus.WARNING,
                        details="Progress retrieved but structure unexpected",
                        response_data=data
                    ))
            else:
                self.add_result(TestResult(
                    name="Progress Retrieval",
                    status=TestStatus.FAILED,
                    details=f"Failed to retrieve progress. Status: {response.status_code if response else 'No response'}",
                    response_data=data
                ))
        else:
            self.add_result(TestResult(
                name="Progress Saving",
                status=TestStatus.FAILED,
                details=f"Failed to save progress. Status: {response.status_code if response else 'No response'}",
                response_data=data
            ))
        
        # Test updating progress
        updated_progress_data = {
            "step_id": "personal_info",
            "data": {
                **test_progress_data["data"],
                "middleName": "Updated"
            },
            "completed": True,
            "timestamp": datetime.now().isoformat()
        }
        
        response, data = self.make_request(
            "POST",
            "/api/onboarding/save-progress",
            json_data={
                "session_id": self.session_id,
                "progress_data": updated_progress_data
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Progress Update",
                status=TestStatus.PASSED,
                details="Progress updated successfully"
            ))
        else:
            self.add_result(TestResult(
                name="Progress Update",
                status=TestStatus.WARNING,
                details=f"Progress update returned status {response.status_code if response else 'No response'}"
            ))
    
    def test_audit_logging(self):
        """Test 5: Audit logging verification"""
        print("\n" + "="*60)
        print("TEST 5: AUDIT LOGGING")
        print("="*60)
        
        # Test if audit logs are being created (by checking audit endpoints if available)
        # First, let's try to access audit logs endpoint
        response, data = self.make_request(
            "GET",
            f"/api/onboarding/audit/{self.employee_id}"
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Audit Log Retrieval",
                status=TestStatus.PASSED,
                details="Audit logs accessible",
                response_data={"log_count": len(data) if isinstance(data, list) else "N/A"}
            ))
            
            # Check for PII sanitization
            if isinstance(data, list) and len(data) > 0:
                has_pii = False
                for log in data:
                    if isinstance(log, dict):
                        log_str = json.dumps(log).lower()
                        # Check for common PII patterns
                        if any(pii in log_str for pii in ["ssn", "social security", "bank account", "routing number"]):
                            has_pii = True
                            break
                
                if not has_pii:
                    self.add_result(TestResult(
                        name="PII Sanitization",
                        status=TestStatus.PASSED,
                        details="No obvious PII found in audit logs"
                    ))
                else:
                    self.add_result(TestResult(
                        name="PII Sanitization",
                        status=TestStatus.WARNING,
                        details="Potential PII detected in audit logs"
                    ))
        elif response and response.status_code == 404:
            self.add_result(TestResult(
                name="Audit Log Endpoint",
                status=TestStatus.INFO,
                details="Audit log retrieval endpoint not found (may not be implemented)"
            ))
        else:
            self.add_result(TestResult(
                name="Audit Log Retrieval",
                status=TestStatus.INFO,
                details=f"Audit log endpoint returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test audit log creation by performing an auditable action
        audit_test_data = {
            "step_id": "audit_test",
            "data": {"test": "audit_logging_verification"},
            "timestamp": datetime.now().isoformat()
        }
        
        response, data = self.make_request(
            "POST",
            "/api/onboarding/save-progress",
            json_data={
                "session_id": self.session_id,
                "progress_data": audit_test_data
            }
        )
        
        if response and response.status_code == 200:
            self.add_result(TestResult(
                name="Audit Log Creation",
                status=TestStatus.INFO,
                details="Auditable action performed (progress save) - audit logs should be created server-side"
            ))
    
    def test_error_handling(self):
        """Test 6: Error handling scenarios"""
        print("\n" + "="*60)
        print("TEST 6: ERROR HANDLING SCENARIOS")
        print("="*60)
        
        # Test missing required fields
        response, data = self.make_request(
            "POST",
            "/api/onboarding/save-progress",
            json_data={}  # Missing session_id and progress_data
        )
        
        if response and response.status_code in [400, 422]:
            self.add_result(TestResult(
                name="Missing Fields Validation",
                status=TestStatus.PASSED,
                details=f"Missing fields properly validated with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Missing Fields Validation",
                status=TestStatus.FAILED,
                details=f"Missing fields not properly validated. Status: {response.status_code if response else 'No response'}"
            ))
        
        # Test invalid session ID
        response, data = self.make_request(
            "GET",
            "/api/onboarding/progress/invalid-session-id-12345"
        )
        
        if response and response.status_code in [404, 403]:
            self.add_result(TestResult(
                name="Invalid Session Handling",
                status=TestStatus.PASSED,
                details=f"Invalid session properly handled with status {response.status_code}"
            ))
        else:
            self.add_result(TestResult(
                name="Invalid Session Handling",
                status=TestStatus.WARNING,
                details=f"Invalid session handling returned status {response.status_code if response else 'No response'}"
            ))
        
        # Test malformed JSON (using raw request)
        try:
            response = self.client.post(
                f"{self.base_url}/api/onboarding/save-progress",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}"
                },
                content=b'{"invalid json": '  # Malformed JSON
            )
            
            if response.status_code in [400, 422]:
                self.add_result(TestResult(
                    name="Malformed JSON Handling",
                    status=TestStatus.PASSED,
                    details=f"Malformed JSON properly rejected with status {response.status_code}"
                ))
            else:
                self.add_result(TestResult(
                    name="Malformed JSON Handling",
                    status=TestStatus.WARNING,
                    details=f"Malformed JSON handling returned status {response.status_code}"
                ))
        except:
            self.add_result(TestResult(
                name="Malformed JSON Handling",
                status=TestStatus.INFO,
                details="Could not test malformed JSON handling"
            ))
    
    def test_concurrent_operations(self):
        """Test 7: Concurrent operations handling"""
        print("\n" + "="*60)
        print("TEST 7: CONCURRENT OPERATIONS")
        print("="*60)
        
        # Test rapid sequential progress saves
        success_count = 0
        for i in range(3):
            response, data = self.make_request(
                "POST",
                "/api/onboarding/save-progress",
                json_data={
                    "session_id": self.session_id,
                    "progress_data": {
                        "step_id": f"concurrent_test_{i}",
                        "data": {"iteration": i},
                        "timestamp": datetime.now().isoformat()
                    }
                }
            )
            if response and response.status_code == 200:
                success_count += 1
            time.sleep(0.1)  # Small delay between requests
        
        if success_count == 3:
            self.add_result(TestResult(
                name="Rapid Sequential Saves",
                status=TestStatus.PASSED,
                details=f"All {success_count} rapid saves successful"
            ))
        else:
            self.add_result(TestResult(
                name="Rapid Sequential Saves",
                status=TestStatus.WARNING,
                details=f"Only {success_count}/3 rapid saves successful"
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
        if failed == 0:
            print("✅ ALL CRITICAL TESTS PASSED - Phase 0 features are working correctly!")
        elif failed <= 2:
            print("⚠️ MOSTLY PASSING - Some issues need attention")
        else:
            print("❌ MULTIPLE FAILURES - Phase 0 features need debugging")
        
        return passed, failed, warnings, info
    
    def run_all_tests(self):
        """Run all Phase 0 tests"""
        print("\n" + "🚀"*30)
        print("PHASE 0 FEATURE TESTING - HOTEL ONBOARDING SYSTEM")
        print("🚀"*30)
        print(f"\nTest Configuration:")
        print(f"  Base URL: {self.base_url}")
        print(f"  Employee ID: {self.employee_id}")
        print(f"  Token Preview: {self.token[:50]}...")
        
        # Run tests in sequence
        self.test_session_validation()
        self.test_token_refresh()
        self.test_session_locking()
        self.test_progress_saving()
        self.test_audit_logging()
        self.test_error_handling()
        self.test_concurrent_operations()
        
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
    tester = Phase0Tester(BASE_URL, TOKEN, EMPLOYEE_ID)
    
    try:
        tester.run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error during testing: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()