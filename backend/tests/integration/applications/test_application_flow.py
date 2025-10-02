#!/usr/bin/env python3
"""
Comprehensive test of the hotel onboarding application flow
Tests all critical endpoints and verifies the improvements didn't break anything
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional

BASE_URL = "http://localhost:8000"

# Test credentials
HR_CREDENTIALS = {"email": "hr@demo.com", "password": "Test1234!"}
MANAGER_CREDENTIALS = {"email": "manager@demo2.com", "password": "Gouthi321@"}

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BLUE = "\033[94m"


def test_endpoint(
    method: str,
    path: str,
    headers: Optional[Dict] = None,
    data: Optional[Dict] = None,
    expected_status: int = 200,
    test_name: str = ""
) -> Dict:
    """Test a single endpoint"""
    url = f"{BASE_URL}{path}"
    
    print(f"\n{BLUE}Testing: {test_name or path}{RESET}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        else:
            response = requests.request(method, url, headers=headers, json=data)
        
        success = response.status_code == expected_status
        
        if success:
            print(f"{GREEN}✓ {test_name}: Status {response.status_code}{RESET}")
            try:
                return response.json()
            except:
                return {"status": "success", "content": response.text}
        else:
            print(f"{RED}✗ {test_name}: Expected {expected_status}, got {response.status_code}{RESET}")
            try:
                error_data = response.json()
                print(f"  Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"  Response: {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"{RED}✗ {test_name}: Exception - {str(e)}{RESET}")
        return None


def run_tests():
    """Run comprehensive test suite"""
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}HOTEL ONBOARDING SYSTEM - COMPREHENSIVE TEST{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")
    
    results = {
        "passed": 0,
        "failed": 0,
        "warnings": []
    }
    
    # 1. Test Health Check
    print(f"\n{YELLOW}1. SYSTEM HEALTH{RESET}")
    health = test_endpoint("GET", "/healthz", test_name="Health Check")
    if health:
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # 2. Test Authentication
    print(f"\n{YELLOW}2. AUTHENTICATION{RESET}")
    
    # HR Login
    hr_login = test_endpoint(
        "POST",
        "/api/auth/login",
        data=HR_CREDENTIALS,
        test_name="HR Login"
    )
    if hr_login and hr_login.get("success"):
        hr_token = hr_login["data"]["token"]
        hr_headers = {"Authorization": f"Bearer {hr_token}"}
        results["passed"] += 1
        print(f"  HR Role: {hr_login['data']['user']['role']}")
    else:
        results["failed"] += 1
        hr_headers = {}
    
    # Manager Login
    manager_login = test_endpoint(
        "POST",
        "/api/auth/login",
        data=MANAGER_CREDENTIALS,
        test_name="Manager Login"
    )
    if manager_login and manager_login.get("success"):
        manager_token = manager_login["data"]["token"]
        manager_headers = {"Authorization": f"Bearer {manager_token}"}
        manager_property_id = manager_login["data"]["user"]["property_id"]
        results["passed"] += 1
        print(f"  Manager Role: {manager_login['data']['user']['role']}")
        print(f"  Property ID: {manager_property_id}")
    else:
        results["failed"] += 1
        manager_headers = {}
        manager_property_id = None
    
    # 3. Test HR Dashboard
    print(f"\n{YELLOW}3. HR DASHBOARD{RESET}")
    
    hr_stats = test_endpoint(
        "GET",
        "/api/hr/dashboard-stats",
        headers=hr_headers,
        test_name="HR Dashboard Stats"
    )
    if hr_stats and hr_stats.get("success"):
        results["passed"] += 1
        print(f"  Total Properties: {hr_stats['data']['totalProperties']}")
        print(f"  Total Managers: {hr_stats['data']['totalManagers']}")
        print(f"  Total Employees: {hr_stats['data']['totalEmployees']}")
    else:
        results["failed"] += 1
    
    # Test HR employees endpoint
    hr_employees = test_endpoint(
        "GET",
        "/api/hr/employees",
        headers=hr_headers,
        test_name="HR Get All Employees"
    )
    if hr_employees:
        results["passed"] += 1
        if isinstance(hr_employees, dict) and hr_employees.get("success"):
            print(f"  Employees Found: {len(hr_employees['data'])}")
        elif isinstance(hr_employees, list):
            print(f"  Employees Found: {len(hr_employees)}")
    else:
        results["failed"] += 1
    
    # 4. Test Manager Dashboard
    print(f"\n{YELLOW}4. MANAGER DASHBOARD{RESET}")
    
    manager_stats = test_endpoint(
        "GET",
        "/api/manager/dashboard-stats",
        headers=manager_headers,
        test_name="Manager Dashboard Stats"
    )
    if manager_stats and manager_stats.get("success"):
        results["passed"] += 1
        print(f"  Property Employees: {manager_stats['data']['property_employees']}")
        print(f"  Property Applications: {manager_stats['data']['property_applications']}")
    else:
        results["failed"] += 1
    
    # Test Manager applications endpoint
    manager_apps = test_endpoint(
        "GET",
        "/api/manager/applications",
        headers=manager_headers,
        test_name="Manager Get Applications"
    )
    if manager_apps and manager_apps.get("success"):
        results["passed"] += 1
        print(f"  Applications Found: {len(manager_apps['data'])}")
    else:
        results["failed"] += 1
    
    # 5. Test Cache Behavior
    print(f"\n{YELLOW}5. CACHE BEHAVIOR{RESET}")
    
    # Make two consecutive calls to check cache
    start_time = time.time()
    cache_test_1 = test_endpoint(
        "GET",
        "/api/hr/dashboard-stats",
        headers=hr_headers,
        test_name="First Call (Cache Miss Expected)"
    )
    first_call_time = time.time() - start_time
    
    start_time = time.time()
    cache_test_2 = test_endpoint(
        "GET",
        "/api/hr/dashboard-stats",
        headers=hr_headers,
        test_name="Second Call (Cache Hit Expected)"
    )
    second_call_time = time.time() - start_time
    
    if cache_test_1 and cache_test_2:
        results["passed"] += 1
        print(f"  First call time: {first_call_time:.3f}s")
        print(f"  Second call time: {second_call_time:.3f}s")
        if second_call_time < first_call_time:
            print(f"  {GREEN}Cache appears to be working (second call faster){RESET}")
        else:
            results["warnings"].append("Cache may not be optimally configured")
    else:
        results["failed"] += 1
    
    # 6. Test Property Isolation
    print(f"\n{YELLOW}6. PROPERTY ISOLATION{RESET}")
    
    # Manager should only see their property's data
    if manager_apps and manager_apps.get("success"):
        apps_data = manager_apps['data']
        if apps_data:
            # Check all applications belong to manager's property
            other_property_apps = [
                app for app in apps_data 
                if app.get('property_id') != manager_property_id
            ]
            if not other_property_apps:
                results["passed"] += 1
                print(f"  {GREEN}✓ Property isolation working correctly{RESET}")
            else:
                results["failed"] += 1
                print(f"  {RED}✗ Found {len(other_property_apps)} applications from other properties!{RESET}")
                results["warnings"].append(f"CRITICAL: Property isolation may be broken!")
        else:
            print(f"  {YELLOW}No applications to test isolation{RESET}")
    
    # 7. Test Error Handling
    print(f"\n{YELLOW}7. ERROR HANDLING{RESET}")
    
    # Test with invalid credentials
    bad_login = test_endpoint(
        "POST",
        "/api/auth/login",
        data={"email": "invalid@test.com", "password": "wrong"},
        expected_status=401,
        test_name="Invalid Login (Should Fail)"
    )
    if bad_login:  # Got correct error response
        results["passed"] += 1
        print(f"  {GREEN}Error handling working correctly{RESET}")
    else:
        results["failed"] += 1
    
    # Test unauthorized access
    unauth_test = test_endpoint(
        "GET",
        "/api/hr/dashboard-stats",
        headers={"Authorization": "Bearer invalid_token"},
        expected_status=401,
        test_name="Unauthorized Access (Should Fail)"
    )
    if unauth_test:  # Got correct error response
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # 8. Summary
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{YELLOW}TEST SUMMARY{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")
    
    total_tests = results["passed"] + results["failed"]
    success_rate = (results["passed"] / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n{GREEN}Passed: {results['passed']}{RESET}")
    print(f"{RED}Failed: {results['failed']}{RESET}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if results["warnings"]:
        print(f"\n{YELLOW}Warnings:{RESET}")
        for warning in results["warnings"]:
            print(f"  ⚠️  {warning}")
    
    if results["failed"] == 0:
        print(f"\n{GREEN}✓ ALL CRITICAL TESTS PASSED!{RESET}")
        print(f"{GREEN}The system improvements have not broken the application.{RESET}")
    else:
        print(f"\n{RED}✗ SOME TESTS FAILED!{RESET}")
        print(f"{RED}Please review the failures above.{RESET}")
    
    return results["failed"] == 0


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)