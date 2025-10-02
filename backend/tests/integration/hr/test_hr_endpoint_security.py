#!/usr/bin/env python3
"""
Test HR endpoint security to ensure managers cannot access HR-only endpoints
"""

import asyncio
import httpx
from typing import Dict, Tuple
import sys

# Test configuration
BASE_URL = "http://localhost:8000"

# Test credentials
MANAGER_EMAIL = "manager@demo.com"
MANAGER_PASSWORD = "Demo1234!"
HR_EMAIL = "hr@demo.com"
HR_PASSWORD = "Demo1234!"

# HR-only endpoints to test
HR_ENDPOINTS = [
    ("GET", "/hr/dashboard-stats"),
    ("GET", "/hr/applications/stats"),
    ("GET", "/hr/applications/departments"),
    ("GET", "/hr/applications/positions"),
    ("GET", "/hr/properties"),
    ("GET", "/hr/users"),
    ("GET", "/hr/managers"),
    ("GET", "/hr/employees"),
    ("GET", "/hr/employees/stats"),
    ("GET", "/hr/properties/test-prop-001/managers"),
]

# Manager-specific endpoints (should work for managers)
MANAGER_ENDPOINTS = [
    ("GET", "/manager/applications/stats"),
    ("GET", "/manager/applications/departments"),
    ("GET", "/manager/applications/positions"),
    ("GET", "/manager/dashboard-stats"),
    ("GET", "/manager/property"),
]

async def login(email: str, password: str) -> Tuple[bool, str]:
    """Login and get JWT token"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                # The token is in data.data.token
                if "data" in data and "token" in data["data"]:
                    return True, data["data"]["token"]
                # Fallback for different response formats
                elif "token" in data:
                    return True, data["token"]
                elif "access_token" in data:
                    return True, data["access_token"]
                else:
                    print(f"Unexpected login response format: {data}")
                    return False, ""
            else:
                print(f"Login failed for {email}: {response.status_code}")
                return False, ""
        except Exception as e:
            print(f"Login error for {email}: {e}")
            return False, ""

async def test_endpoint(method: str, path: str, token: str) -> Tuple[int, str]:
    """Test an endpoint with given token"""
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        headers = {"Authorization": f"Bearer {token}"}
        try:
            if method == "GET":
                response = await client.get(f"{BASE_URL}{path}", headers=headers)
            elif method == "POST":
                response = await client.post(f"{BASE_URL}{path}", headers=headers)
            else:
                return 0, f"Unsupported method: {method}"
            
            return response.status_code, response.text[:200] if response.text else ""
        except httpx.ConnectError as e:
            print(f"    Connection error for {path}: {e}")
            return 0, f"Connection error: {str(e)}"
        except httpx.TimeoutException as e:
            print(f"    Timeout for {path}: {e}")
            return 0, f"Timeout: {str(e)}"
        except Exception as e:
            print(f"    Error for {path}: {e}")
            return 0, str(e)

async def main():
    print("=" * 80)
    print("HR ENDPOINT SECURITY TEST")
    print("=" * 80)
    
    # Login as manager
    print("\n1. Logging in as manager...")
    manager_success, manager_token = await login(MANAGER_EMAIL, MANAGER_PASSWORD)
    if not manager_success:
        print("❌ Failed to login as manager")
        sys.exit(1)
    print("✅ Manager login successful")
    
    # Login as HR
    print("\n2. Logging in as HR...")
    hr_success, hr_token = await login(HR_EMAIL, HR_PASSWORD)
    if not hr_success:
        print("❌ Failed to login as HR")
        sys.exit(1)
    print("✅ HR login successful")
    
    # Test HR endpoints with manager token (should fail)
    print("\n3. Testing HR endpoints with manager token (should all return 403)...")
    print("-" * 60)
    
    manager_violations = []
    for method, path in HR_ENDPOINTS:
        status, response = await test_endpoint(method, path, manager_token)
        if status == 403:
            print(f"✅ {method:6} {path:50} - 403 Forbidden (correct)")
        elif status == 401:
            print(f"⚠️  {method:6} {path:50} - 401 Unauthorized (token issue)")
        elif status == 200:
            print(f"❌ {method:6} {path:50} - 200 OK (SECURITY VIOLATION!)")
            manager_violations.append((method, path))
        else:
            print(f"⚠️  {method:6} {path:50} - {status} (unexpected)")
    
    # Test HR endpoints with HR token (should succeed)
    print("\n4. Testing HR endpoints with HR token (should all return 200)...")
    print("-" * 60)
    
    hr_failures = []
    for method, path in HR_ENDPOINTS:
        status, response = await test_endpoint(method, path, hr_token)
        if status == 200:
            print(f"✅ {method:6} {path:50} - 200 OK (correct)")
        else:
            print(f"❌ {method:6} {path:50} - {status} (should be accessible)")
            hr_failures.append((method, path, status))
    
    # Test manager endpoints with manager token (should succeed)
    print("\n5. Testing manager endpoints with manager token (should work)...")
    print("-" * 60)
    
    manager_endpoint_failures = []
    for method, path in MANAGER_ENDPOINTS:
        status, response = await test_endpoint(method, path, manager_token)
        if status == 200:
            print(f"✅ {method:6} {path:50} - 200 OK (correct)")
        else:
            print(f"❌ {method:6} {path:50} - {status} (should be accessible)")
            manager_endpoint_failures.append((method, path, status))
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    if manager_violations:
        print(f"\n❌ CRITICAL SECURITY VIOLATIONS FOUND!")
        print(f"   Managers can access {len(manager_violations)} HR-only endpoints:")
        for method, path in manager_violations:
            print(f"   - {method} {path}")
    else:
        print("\n✅ Security is properly enforced - managers cannot access HR endpoints")
    
    if hr_failures:
        print(f"\n⚠️  HR access issues found:")
        print(f"   HR cannot access {len(hr_failures)} endpoints that should be available:")
        for method, path, status in hr_failures:
            print(f"   - {method} {path} (status: {status})")
    
    if manager_endpoint_failures:
        print(f"\n⚠️  Manager endpoint issues found:")
        print(f"   Managers cannot access {len(manager_endpoint_failures)} of their own endpoints:")
        for method, path, status in manager_endpoint_failures:
            print(f"   - {method} {path} (status: {status})")
    
    # Exit with appropriate code
    if manager_violations:
        sys.exit(1)  # Security violation
    elif hr_failures or manager_endpoint_failures:
        sys.exit(2)  # Functional issues
    else:
        print("\n🎉 All security tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())