#!/usr/bin/env python3
"""
Final Performance Test for Enhanced Health Insurance Module
Verifies sub-200ms response times and memory efficiency
"""

import requests
import time
import json
from datetime import datetime
import concurrent.futures

class PerformanceTestSuite:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.results = []
    
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
    
    def test_api_response_times(self):
        """Test 1: API Response Times"""
        start = time.time()
        try:
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Speed",
                        "lastName": "Test",
                        "ssn": "123-45-6789",
                        "email": "speed@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "employee",
                    "section125Acknowledged": True
                }
            }
            
            # Run 10 requests to get average response time
            response_times = []
            for i in range(10):
                req_start = time.time()
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/speed-test-{i}/health-insurance/generate-pdf",
                    json=test_data,
                    timeout=5
                )
                req_duration = time.time() - req_start
                response_times.append(req_duration)
                
                if response.status_code != 200:
                    break
            
            avg_time = sum(response_times) / len(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            
            # Target: Average < 200ms, Max < 500ms
            success = avg_time < 0.2 and max_time < 0.5
            message = f"Response times - Avg: {avg_time*1000:.1f}ms, Min: {min_time*1000:.1f}ms, Max: {max_time*1000:.1f}ms"
            
        except Exception as e:
            success = False
            message = f"API response time test failed: {e}"
        
        self.log_result("API Response Times", success, message, time.time() - start)
        return success
    
    def test_memory_efficiency(self):
        """Test 2: Memory Efficiency"""
        start = time.time()
        try:
            # Get initial memory usage
            initial_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            
            # Run multiple PDF generations
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Memory",
                        "lastName": "Test",
                        "ssn": "123-45-6789",
                        "email": "memory@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "family",
                    "section125Acknowledged": True,
                    "dependents": [
                        {
                            "firstName": "Child1",
                            "lastName": "Test",
                            "dateOfBirth": "2010-01-01",
                            "relationship": "child"
                        },
                        {
                            "firstName": "Child2",
                            "lastName": "Test",
                            "dateOfBirth": "2012-01-01",
                            "relationship": "child"
                        }
                    ]
                }
            }
            
            # Generate 20 PDFs to test memory usage
            for i in range(20):
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/memory-test-{i}/health-insurance/generate-pdf",
                    json=test_data,
                    timeout=10
                )
                if response.status_code != 200:
                    break
            
            # Check final memory usage
            final_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = final_memory - initial_memory
            
            # Target: Memory increase < 50MB for 20 PDFs
            success = memory_increase < 50
            message = f"Memory usage - Initial: {initial_memory:.1f}MB, Final: {final_memory:.1f}MB, Increase: {memory_increase:.1f}MB"
            
        except Exception as e:
            success = False
            message = f"Memory efficiency test failed: {e}"
        
        self.log_result("Memory Efficiency", success, message, time.time() - start)
        return success
    
    def test_concurrent_load_handling(self):
        """Test 3: Concurrent Load Handling"""
        start = time.time()
        try:
            test_data = {
                "employee_data": {
                    "personalInfo": {
                        "firstName": "Concurrent",
                        "lastName": "Test",
                        "ssn": "123-45-6789",
                        "email": "concurrent@example.com"
                    },
                    "medicalPlan": "hra6k",
                    "medicalTier": "employee",
                    "section125Acknowledged": True
                }
            }
            
            # Run 10 concurrent requests
            def make_concurrent_request(request_id):
                req_start = time.time()
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/concurrent-{request_id}/health-insurance/generate-pdf",
                    json=test_data,
                    timeout=15
                )
                req_duration = time.time() - req_start
                return response.status_code == 200, req_duration
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_concurrent_request, i) for i in range(10)]
                results = [future.result() for future in concurrent.futures.as_completed(futures)]
            
            success_count = sum(1 for success, _ in results if success)
            avg_duration = sum(duration for _, duration in results) / len(results)
            max_duration = max(duration for _, duration in results)
            
            # Target: 90% success rate, avg < 1s
            performance_ok = success_count >= 9 and avg_duration < 1.0
            
            success = performance_ok
            message = f"Concurrent load - {success_count}/10 success, avg: {avg_duration:.3f}s, max: {max_duration:.3f}s"
            
        except Exception as e:
            success = False
            message = f"Concurrent load test failed: {e}"
        
        self.log_result("Concurrent Load Handling", success, message, time.time() - start)
        return success
    
    def test_error_recovery_performance(self):
        """Test 4: Error Recovery Performance"""
        start = time.time()
        try:
            # Test that error responses are fast
            invalid_data = {"employee_data": {"personalInfo": {}}}
            
            error_times = []
            for i in range(5):
                req_start = time.time()
                response = requests.post(
                    f"{self.backend_url}/api/onboarding/error-perf-{i}/health-insurance/generate-pdf",
                    json=invalid_data,
                    timeout=5
                )
                req_duration = time.time() - req_start
                error_times.append(req_duration)
            
            avg_error_time = sum(error_times) / len(error_times)
            max_error_time = max(error_times)
            
            # Target: Error responses < 50ms average
            success = avg_error_time < 0.05 and max_error_time < 0.1
            message = f"Error recovery - Avg: {avg_error_time*1000:.1f}ms, Max: {max_error_time*1000:.1f}ms"
            
        except Exception as e:
            success = False
            message = f"Error recovery performance test failed: {e}"
        
        self.log_result("Error Recovery Performance", success, message, time.time() - start)
        return success
    
    def run_performance_tests(self):
        """Run all performance tests"""
        print("⚡ Starting Health Insurance Performance Test Suite")
        print("=" * 80)
        
        tests = [
            self.test_api_response_times,
            self.test_memory_efficiency,
            self.test_concurrent_load_handling,
            self.test_error_recovery_performance
        ]
        
        passed = 0
        total = len(tests)
        start_time = time.time()
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ FAIL {test.__name__}: Unexpected error: {e}")
        
        # Generate summary
        total_time = time.time() - start_time
        success_rate = (passed / total) * 100
        
        print("\n" + "=" * 80)
        print("⚡ PERFORMANCE TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Total Time: {total_time:.3f}s")
        
        if success_rate >= 90:
            print("🚀 PERFORMANCE RESULT: EXCELLENT")
            print("✅ Performance targets exceeded!")
        elif success_rate >= 75:
            print("🚀 PERFORMANCE RESULT: GOOD")
            print("✅ Performance targets met!")
        else:
            print("❌ PERFORMANCE RESULT: NEEDS OPTIMIZATION")
            print("⚠️ Performance issues need attention!")
        
        # Save results
        with open('performance_test_results.json', 'w') as f:
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
        
        print(f"\n📄 Performance results saved to: performance_test_results.json")
        return success_rate >= 75

if __name__ == "__main__":
    test_suite = PerformanceTestSuite()
    success = test_suite.run_performance_tests()
    exit(0 if success else 1)
