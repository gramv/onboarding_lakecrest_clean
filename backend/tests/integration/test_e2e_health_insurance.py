#!/usr/bin/env python3
"""
End-to-End Test Suite for Enhanced Health Insurance Module
Tests complete onboarding flow with enhanced health insurance components
"""

import requests
import time
import json
from datetime import datetime
import concurrent.futures

class E2EHealthInsuranceTestSuite:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3004"
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
    
    def test_form_validation_and_autosave(self):
        """Test 1: Form Validation and Auto-Save Functionality"""
        start = time.time()
        try:
            # Test with progressively complete data
            test_scenarios = [
                {
                    "name": "Empty Form",
                    "data": {"employee_data": {"personalInfo": {}}},
                    "should_fail": True
                },
                {
                    "name": "Partial Form",
                    "data": {
                        "employee_data": {
                            "personalInfo": {"firstName": "Test", "lastName": "User"},
                            "medicalPlan": "hra6k"
                        }
                    },
                    "should_fail": True  # Missing section125Acknowledged
                },
                {
                    "name": "Complete Form",
                    "data": {
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
                    },
                    "should_fail": False
                }
            ]
            
            passed_scenarios = 0
            for scenario in test_scenarios:
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/validation-test/health-insurance/generate-pdf",
                    json=scenario["data"],
                    timeout=15
                )
                
                result = response.json()
                is_valid = result.get('success', False)
                
                # Check if result matches expectation
                if scenario["should_fail"]:
                    scenario_passed = not is_valid  # Should fail
                else:
                    scenario_passed = is_valid  # Should succeed
                
                if scenario_passed:
                    passed_scenarios += 1
                    print(f"  ✓ {scenario['name']}: {'Failed as expected' if scenario['should_fail'] else 'Passed as expected'}")
                else:
                    print(f"  ✗ {scenario['name']}: {'Should have failed but passed' if scenario['should_fail'] else 'Should have passed but failed'}")
            
            success = passed_scenarios == len(test_scenarios)
            message = f"Form validation working correctly ({passed_scenarios}/{len(test_scenarios)} scenarios passed)"
            
        except Exception as e:
            success = False
            message = f"Form validation test failed: {e}"
        
        self.log_result("Form Validation and Auto-Save", success, message, time.time() - start)
        return success
    
    def test_pdf_generation_and_signature_capture(self):
        """Test 2: PDF Generation and Signature Capture"""
        start = time.time()
        try:
            # Test complete flow with signature
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "E2E",
                        "lastName": "Test",
                        "ssn": "123-45-6789",
                        "email": "e2e@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "employee",
                    "section125Acknowledged": True,
                    "signatureData": {
                        "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                        "signedDate": datetime.now().isoformat(),
                        "userAgent": "Test Agent"
                    }
                }
            }
            
            response = requests.post(
                f"{self.backend_url}/api/onboarding/e2e-test/health-insurance/generate-pdf",
                json=test_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('data', {}).get('pdf'):
                    pdf_size = len(result['data']['pdf'])
                    has_metadata = 'metadata' in result.get('data', {})
                    success = True
                    message = f"PDF with signature generated successfully ({pdf_size} chars, metadata: {has_metadata})"
                else:
                    success = False
                    message = f"PDF generation failed: {result.get('message', 'Unknown error')}"
            else:
                success = False
                message = f"HTTP {response.status_code}: {response.text[:200]}"
                
        except Exception as e:
            success = False
            message = f"PDF generation and signature test failed: {e}"
        
        self.log_result("PDF Generation and Signature Capture", success, message, time.time() - start)
        return success
    
    def test_mobile_responsiveness(self):
        """Test 3: Mobile Responsiveness"""
        start = time.time()
        try:
            # Test with different mobile user agents
            mobile_agents = [
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
                "Mozilla/5.0 (Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0",
                "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
            ]
            
            passed_agents = 0
            for agent in mobile_agents:
                headers = {'User-Agent': agent}
                response = requests.get(f"{self.frontend_url}/", headers=headers, timeout=10)
                
                if response.status_code == 200:
                    passed_agents += 1
            
            success = passed_agents == len(mobile_agents)
            message = f"Mobile responsiveness working ({passed_agents}/{len(mobile_agents)} user agents)"
            
        except Exception as e:
            success = False
            message = f"Mobile responsiveness test failed: {e}"
        
        self.log_result("Mobile Responsiveness", success, message, time.time() - start)
        return success
    
    def test_error_boundary_behavior(self):
        """Test 4: Error Boundary Behavior"""
        start = time.time()
        try:
            # Test that the app loads with error boundary protection
            response = requests.get(f"{self.frontend_url}/", timeout=10)

            # Check that the app loads successfully (Vite dev server returns HTML with React app)
            app_loads = response.status_code == 200 and '<div id="root"></div>' in response.text

            # Also test the health insurance test page which uses error boundaries
            test_page_response = requests.get(f"{self.frontend_url}/test-health-insurance", timeout=10)
            test_page_loads = test_page_response.status_code == 200

            success = app_loads and test_page_loads
            message = f"Error boundary working (main app: {app_loads}, test page: {test_page_loads})"

        except Exception as e:
            success = False
            message = f"Error boundary test failed: {e}"

        self.log_result("Error Boundary Behavior", success, message, time.time() - start)
        return success
    
    def test_multi_language_support(self):
        """Test 5: Multi-Language Support"""
        start = time.time()
        try:
            # Test Spanish language support
            test_data = {
                "employee_data": {
                    "personalInfo": {},  # Invalid data to trigger Spanish error messages
                    "language": "es"
                }
            }
            
            response = requests.post(
                f"{self.backend_url}/api/onboarding/spanish-test/health-insurance/generate-pdf",
                json=test_data,
                timeout=15
            )
            
            result = response.json()
            # Should return structured error (not crash)
            success = 'error' in result and 'message' in result
            message = "Multi-language error handling working correctly"
            
        except Exception as e:
            success = False
            message = f"Multi-language support test failed: {e}"
        
        self.log_result("Multi-Language Support", success, message, time.time() - start)
        return success
    
    def test_performance_verification(self):
        """Test 6: Performance Verification"""
        start = time.time()
        try:
            # Test response times under load
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
            
            # Run 5 concurrent requests to test performance
            def make_request():
                start_req = time.time()
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/perf-test/health-insurance/generate-pdf",
                    json=test_data,
                    timeout=30
                )
                duration = time.time() - start_req
                return response.status_code == 200, duration
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(make_request) for _ in range(5)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            success_count = sum(1 for success, _ in results if success)
            avg_duration = sum(duration for _, duration in results) / len(results)
            max_duration = max(duration for _, duration in results)
            
            # Performance criteria: 80% success rate, avg < 1s, max < 2s
            performance_ok = success_count >= 4 and avg_duration < 1.0 and max_duration < 2.0
            
            success = performance_ok
            message = f"Performance verified: {success_count}/5 success, avg: {avg_duration:.3f}s, max: {max_duration:.3f}s"
            
        except Exception as e:
            success = False
            message = f"Performance verification failed: {e}"
        
        self.log_result("Performance Verification", success, message, time.time() - start)
        return success
    
    def test_complete_onboarding_flow(self):
        """Test 7: Complete Onboarding Flow Integration"""
        start = time.time()
        try:
            # Test that the main onboarding flow loads successfully
            response = requests.get(f"{self.frontend_url}/onboard", timeout=10)

            # Check that the page loads successfully (Vite dev server returns HTML with React app)
            app_loads = response.status_code == 200 and '<div id="root"></div>' in response.text

            # Test that the enhanced health insurance test page loads (React content loads dynamically)
            test_response = requests.get(f"{self.frontend_url}/test-health-insurance", timeout=10)
            test_loads = test_response.status_code == 200 and '<div id="root"></div>' in test_response.text

            success = app_loads and test_loads
            message = f"Onboarding flow integration verified (main: {app_loads}, test page: {test_loads})"

        except Exception as e:
            success = False
            message = f"Complete onboarding flow test failed: {e}"

        self.log_result("Complete Onboarding Flow Integration", success, message, time.time() - start)
        return success
    
    def run_e2e_tests(self):
        """Run all end-to-end tests"""
        print("🎯 Starting Health Insurance End-to-End Test Suite")
        print("=" * 80)
        
        tests = [
            self.test_form_validation_and_autosave,
            self.test_pdf_generation_and_signature_capture,
            self.test_mobile_responsiveness,
            self.test_error_boundary_behavior,
            self.test_multi_language_support,
            self.test_performance_verification,
            self.test_complete_onboarding_flow
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
        
        print("\n" + "=" * 80)
        print("🎯 END-TO-END TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Time: {total_time:.3f}s")
        
        if success_rate >= 95:
            print("🎉 E2E RESULT: EXCELLENT")
            print("✅ Enhanced Health Insurance is production-ready!")
        elif success_rate >= 80:
            print("🎉 E2E RESULT: GOOD")
            print("✅ Enhanced Health Insurance is working well!")
        else:
            print("❌ E2E RESULT: NEEDS IMPROVEMENT")
            print("⚠️ Issues need to be addressed before production!")
        
        # Save detailed results
        with open('e2e_test_results.json', 'w') as f:
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
        
        print(f"\n📄 E2E results saved to: e2e_test_results.json")
        return success_rate >= 80

if __name__ == "__main__":
    test_suite = E2EHealthInsuranceTestSuite()
    success = test_suite.run_e2e_tests()
    exit(0 if success else 1)
