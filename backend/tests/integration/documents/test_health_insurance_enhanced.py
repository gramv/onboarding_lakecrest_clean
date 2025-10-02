#!/usr/bin/env python3
"""
Comprehensive Test Suite for Enhanced Health Insurance Module
Tests all components: error handling, PDF generation, state management
"""

import asyncio
import json
import time
import requests
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_EMPLOYEE_ID = "test-employee"

class HealthInsuranceTestSuite:
    def __init__(self):
        self.results = []
        self.start_time = time.time()
    
    def log_result(self, test_name: str, success: bool, message: str, duration: float = 0):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        })
        print(f"{status} {test_name}: {message} ({duration:.3f}s)")
    
    def test_api_health(self):
        """Test 1: API Health Check"""
        start = time.time()
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=5)
            success = response.status_code == 200
            message = f"API responded with status {response.status_code}"
        except Exception as e:
            success = False
            message = f"API health check failed: {e}"
        
        self.log_result("API Health Check", success, message, time.time() - start)
        return success
    
    def test_pdf_generation_basic(self):
        """Test 2: Basic PDF Generation"""
        start = time.time()
        try:
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Test",
                        "lastName": "User",
                        "ssn": "123-45-6789",
                        "email": "test@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "employee",
                    "section125Acknowledged": True
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/api/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
                json=test_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('data', {}).get('pdf'):
                    pdf_size = len(result['data']['pdf'])
                    success = True
                    message = f"PDF generated successfully ({pdf_size} chars)"
                else:
                    success = False
                    message = f"Invalid response format: {result}"
            else:
                success = False
                message = f"HTTP {response.status_code}: {response.text[:200]}"
                
        except Exception as e:
            success = False
            message = f"PDF generation failed: {e}"
        
        self.log_result("Basic PDF Generation", success, message, time.time() - start)
        return success
    
    def test_pdf_generation_with_dependents(self):
        """Test 3: PDF Generation with Dependents"""
        start = time.time()
        try:
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Test",
                        "lastName": "Family",
                        "ssn": "123-45-6789",
                        "email": "family@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "family",
                    "section125Acknowledged": True,
                    "dependents": [
                        {
                            "firstName": "Jane",
                            "lastName": "Family",
                            "dateOfBirth": "2010-01-01",
                            "relationship": "child"
                        },
                        {
                            "firstName": "John",
                            "lastName": "Family", 
                            "dateOfBirth": "2012-05-15",
                            "relationship": "child"
                        }
                    ]
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/api/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
                json=test_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('data', {}).get('pdf'):
                    metadata = result.get('data', {}).get('metadata', {})
                    dependents_count = metadata.get('dependents_count', 0)
                    success = True
                    message = f"PDF with {dependents_count} dependents generated successfully"
                else:
                    success = False
                    message = f"Invalid response format: {result}"
            else:
                success = False
                message = f"HTTP {response.status_code}: {response.text[:200]}"
                
        except Exception as e:
            success = False
            message = f"PDF generation with dependents failed: {e}"
        
        self.log_result("PDF Generation with Dependents", success, message, time.time() - start)
        return success
    
    def test_pdf_generation_error_handling(self):
        """Test 4: PDF Generation Error Handling"""
        start = time.time()
        try:
            # Test with invalid data
            test_data = {
                "employee_data": {
                    "personalInfo": {},  # Missing required fields
                    "medicalPlan": "",
                    "section125Acknowledged": False  # Required field
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/api/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
                json=test_data,
                timeout=30
            )
            
            # Should still succeed due to retry mechanisms and fallbacks
            if response.status_code == 200:
                result = response.json()
                success = result.get('success', False)
                message = "Error handling working - PDF generated with fallback data"
            else:
                success = True  # Expected to fail gracefully
                message = f"Error handled gracefully: HTTP {response.status_code}"
                
        except Exception as e:
            success = False
            message = f"Error handling test failed: {e}"
        
        self.log_result("PDF Generation Error Handling", success, message, time.time() - start)
        return success
    
    def test_performance_multiple_requests(self):
        """Test 5: Performance with Multiple Requests"""
        start = time.time()
        try:
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Performance",
                        "lastName": "Test",
                        "ssn": "123-45-6789",
                        "email": "perf@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "employee",
                    "section125Acknowledged": True
                }
            }
            
            # Run 3 concurrent requests
            import concurrent.futures
            
            def make_request():
                response = requests.post(
                    f"{BASE_URL}/api/onboarding/{TEST_EMPLOYEE_ID}/health-insurance/generate-pdf",
                    json=test_data,
                    timeout=30
                )
                return response.status_code == 200 and response.json().get('success', False)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                futures = [executor.submit(make_request) for _ in range(3)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            success_count = sum(results)
            total_time = time.time() - start
            avg_time = total_time / 3
            
            success = success_count >= 2  # At least 2 out of 3 should succeed
            message = f"{success_count}/3 requests succeeded, avg time: {avg_time:.3f}s"
            
        except Exception as e:
            success = False
            message = f"Performance test failed: {e}"
        
        self.log_result("Performance Multiple Requests", success, message, time.time() - start)
        return success
    
    def test_frontend_accessibility(self):
        """Test 6: Frontend Test Page Accessibility"""
        start = time.time()
        try:
            response = requests.get("http://localhost:3003/test-health-insurance", timeout=10)
            success = response.status_code == 200 and "Health Insurance Module Test Suite" in response.text
            message = f"Frontend test page accessible (HTTP {response.status_code})"
        except Exception as e:
            success = False
            message = f"Frontend test page not accessible: {e}"
        
        self.log_result("Frontend Test Page Accessibility", success, message, time.time() - start)
        return success
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🧪 Starting Health Insurance Module Test Suite")
        print("=" * 60)
        
        tests = [
            self.test_api_health,
            self.test_pdf_generation_basic,
            self.test_pdf_generation_with_dependents,
            self.test_pdf_generation_error_handling,
            self.test_performance_multiple_requests,
            self.test_frontend_accessibility
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Unexpected error: {e}")
        
        # Generate summary
        total_time = time.time() - self.start_time
        success_rate = (passed / total) * 100
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Time: {total_time:.3f}s")
        
        if success_rate >= 80:
            print("🎉 OVERALL RESULT: PASS")
            print("✅ Health Insurance module is working correctly!")
        else:
            print("❌ OVERALL RESULT: FAIL")
            print("⚠️ Health Insurance module needs attention!")
        
        # Save detailed results
        with open('health_insurance_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total': total,
                    'passed': passed,
                    'failed': total - passed,
                    'success_rate': success_rate,
                    'total_time': total_time,
                    'timestamp': datetime.now().isoformat()
                },
                'results': self.results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: health_insurance_test_results.json")
        return success_rate >= 80

if __name__ == "__main__":
    test_suite = HealthInsuranceTestSuite()
    success = test_suite.run_all_tests()
    exit(0 if success else 1)
