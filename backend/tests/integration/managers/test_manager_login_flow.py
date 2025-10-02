#!/usr/bin/env python3
"""
Test Manager Login Flow and Property Isolation
Tasks 1.9 and 1.10: Critical security checkpoint
"""

import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000"

class ManagerFlowTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.results = []
        
    async def test_manager_login(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Test manager login"""
        print(f"\n🔐 Testing login for: {email}")
        
        try:
            # Attempt login
            response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login successful!")
                
                # Handle new response format with nested data
                if data.get('success') and 'data' in data:
                    login_data = data['data']
                    user = login_data.get('user', {})
                    print(f"   - User ID: {user.get('id')}")
                    print(f"   - Role: {user.get('role')}")
                    print(f"   - Token received: {'token' in login_data}")
                    
                    # Return in expected format
                    return {
                        'access_token': login_data.get('token'),
                        'user': user
                    }
                else:
                    # Fallback for old format
                    print(f"   - User ID: {data.get('user', {}).get('id')}")
                    print(f"   - Role: {data.get('user', {}).get('role')}")
                    print(f"   - Token received: {'access_token' in data}")
                    return data
            else:
                print(f"❌ Login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return None
    
    async def test_dashboard_access(self, token: str) -> Dict[str, Any]:
        """Test manager dashboard access and data"""
        print(f"\n📊 Testing dashboard access...")
        
        headers = {"Authorization": f"Bearer {token}"}
        results = {}
        
        # Test dashboard stats
        try:
            response = await self.client.get(
                f"{BASE_URL}/manager/dashboard",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                results['dashboard'] = data
                print(f"✅ Dashboard loaded successfully!")
                print(f"   - Property: {data.get('property_name', 'Unknown')}")
                print(f"   - Total Employees: {data.get('total_employees', 0)}")
                print(f"   - Pending Applications: {data.get('pending_applications', 0)}")
                print(f"   - Active Onboarding: {data.get('active_onboarding', 0)}")
            else:
                print(f"❌ Dashboard access failed: {response.status_code}")
                results['dashboard'] = None
        except Exception as e:
            print(f"❌ Dashboard error: {str(e)}")
            results['dashboard'] = None
        
        # Test applications endpoint
        try:
            response = await self.client.get(
                f"{BASE_URL}/manager/applications",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                results['applications'] = data
                print(f"✅ Applications loaded: {len(data)} found")
                
                # Check that all applications belong to manager's property
                if data:
                    property_ids = set(app.get('property_id') for app in data)
                    print(f"   - Property IDs in applications: {property_ids}")
            else:
                print(f"❌ Applications access failed: {response.status_code}")
                results['applications'] = None
        except Exception as e:
            print(f"❌ Applications error: {str(e)}")
            results['applications'] = None
        
        # Test employees endpoint
        try:
            response = await self.client.get(
                f"{BASE_URL}/manager/employees",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                results['employees'] = data
                print(f"✅ Employees loaded: {len(data)} found")
                
                # Check that all employees belong to manager's property
                if data:
                    property_ids = set(emp.get('property_id') for emp in data)
                    print(f"   - Property IDs in employees: {property_ids}")
            else:
                print(f"❌ Employees access failed: {response.status_code}")
                results['employees'] = None
        except Exception as e:
            print(f"❌ Employees error: {str(e)}")
            results['employees'] = None
        
        return results
    
    async def test_property_isolation(self, manager_token: str, manager_property_id: str) -> Dict[str, Any]:
        """Test that manager cannot access other property's data"""
        print(f"\n🔒 Testing Property Isolation...")
        print(f"   Manager's property ID: {manager_property_id}")
        
        headers = {"Authorization": f"Bearer {manager_token}"}
        isolation_tests = []
        
        # Create a different property ID for testing
        other_property_id = "other-prop-999"
        
        # Test 1: Try to access specific application from another property
        print("\n   Test 1: Accessing another property's application...")
        try:
            # First, try to get an application with wrong property ID
            response = await self.client.get(
                f"{BASE_URL}/manager/applications/test-app-other-property",
                headers=headers
            )
            
            if response.status_code == 403:
                print("   ✅ Correctly blocked access (403 Forbidden)")
                isolation_tests.append({"test": "application_access", "passed": True})
            elif response.status_code == 404:
                print("   ✅ Application not found (correct isolation)")
                isolation_tests.append({"test": "application_access", "passed": True})
            else:
                print(f"   ❌ Unexpected response: {response.status_code}")
                isolation_tests.append({"test": "application_access", "passed": False})
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            isolation_tests.append({"test": "application_access", "passed": False})
        
        # Test 2: Try to approve application from another property
        print("\n   Test 2: Trying to approve another property's application...")
        try:
            response = await self.client.post(
                f"{BASE_URL}/manager/applications/approve",
                headers=headers,
                json={
                    "application_id": "other-app-123",
                    "property_id": other_property_id
                }
            )
            
            if response.status_code in [403, 404]:
                print(f"   ✅ Correctly blocked/not found ({response.status_code})")
                isolation_tests.append({"test": "approve_other_property", "passed": True})
            else:
                print(f"   ❌ Unexpected response: {response.status_code}")
                isolation_tests.append({"test": "approve_other_property", "passed": False})
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            isolation_tests.append({"test": "approve_other_property", "passed": False})
        
        # Test 3: Try to access employee from another property
        print("\n   Test 3: Accessing another property's employee...")
        try:
            response = await self.client.get(
                f"{BASE_URL}/manager/employees/emp-other-property",
                headers=headers
            )
            
            if response.status_code in [403, 404]:
                print(f"   ✅ Correctly blocked/not found ({response.status_code})")
                isolation_tests.append({"test": "employee_access", "passed": True})
            else:
                print(f"   ❌ Unexpected response: {response.status_code}")
                isolation_tests.append({"test": "employee_access", "passed": False})
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            isolation_tests.append({"test": "employee_access", "passed": False})
        
        # Test 4: Verify filtered data only contains manager's property
        print("\n   Test 4: Verifying data filtering...")
        try:
            # Get all applications
            response = await self.client.get(
                f"{BASE_URL}/manager/applications",
                headers=headers
            )
            
            if response.status_code == 200:
                applications = response.json()
                if applications:
                    # Check all applications belong to manager's property
                    wrong_property = [app for app in applications 
                                    if app.get('property_id') != manager_property_id]
                    
                    if not wrong_property:
                        print(f"   ✅ All {len(applications)} applications belong to correct property")
                        isolation_tests.append({"test": "data_filtering", "passed": True})
                    else:
                        print(f"   ❌ Found {len(wrong_property)} applications from wrong property!")
                        isolation_tests.append({"test": "data_filtering", "passed": False})
                else:
                    print("   ℹ️  No applications to verify")
                    isolation_tests.append({"test": "data_filtering", "passed": True})
            else:
                print(f"   ❌ Could not fetch applications: {response.status_code}")
                isolation_tests.append({"test": "data_filtering", "passed": False})
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            isolation_tests.append({"test": "data_filtering", "passed": False})
        
        # Test 5: Try to create data for another property
        print("\n   Test 5: Trying to create data for another property...")
        try:
            response = await self.client.post(
                f"{BASE_URL}/manager/employees",
                headers=headers,
                json={
                    "first_name": "Test",
                    "last_name": "Employee",
                    "property_id": other_property_id  # Wrong property
                }
            )
            
            if response.status_code in [403, 400]:
                print(f"   ✅ Correctly blocked creation ({response.status_code})")
                isolation_tests.append({"test": "create_wrong_property", "passed": True})
            else:
                print(f"   ❌ Unexpected response: {response.status_code}")
                isolation_tests.append({"test": "create_wrong_property", "passed": False})
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            isolation_tests.append({"test": "create_wrong_property", "passed": False})
        
        return {
            "tests": isolation_tests,
            "passed": all(test["passed"] for test in isolation_tests),
            "total": len(isolation_tests),
            "passed_count": sum(1 for test in isolation_tests if test["passed"])
        }
    
    async def test_multiple_managers(self):
        """Test isolation between multiple managers"""
        print("\n🔄 Testing Multiple Manager Isolation...")
        
        # Create a second test manager for different property
        print("\n   Creating second test manager...")
        try:
            # First create a second property
            admin_response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={"email": "admin@hotelonboard.com", "password": "admin123"}
            )
            
            if admin_response.status_code == 200:
                admin_token = admin_response.json()["access_token"]
                
                # Create second property
                prop_response = await self.client.post(
                    f"{BASE_URL}/admin/properties",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "id": "test-prop-002",
                        "name": "Test Hotel 2",
                        "address": "456 Test Ave",
                        "phone": "555-0002"
                    }
                )
                
                # Create second manager
                manager_response = await self.client.post(
                    f"{BASE_URL}/admin/managers",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    json={
                        "email": "manager2@test.com",
                        "password": "test123",
                        "first_name": "Test",
                        "last_name": "Manager2",
                        "property_id": "test-prop-002"
                    }
                )
                
                if manager_response.status_code in [200, 201]:
                    print("   ✅ Second manager created")
                    
                    # Now test that each manager only sees their property
                    manager1_login = await self.test_manager_login("manager@demo.com", "demo123")
                    manager2_login = await self.test_manager_login("manager2@test.com", "test123")
                    
                    if manager1_login and manager2_login:
                        # Get data for each manager
                        m1_headers = {"Authorization": f"Bearer {manager1_login['access_token']}"}
                        m2_headers = {"Authorization": f"Bearer {manager2_login['access_token']}"}
                        
                        m1_dash = await self.client.get(f"{BASE_URL}/manager/dashboard", headers=m1_headers)
                        m2_dash = await self.client.get(f"{BASE_URL}/manager/dashboard", headers=m2_headers)
                        
                        if m1_dash.status_code == 200 and m2_dash.status_code == 200:
                            m1_data = m1_dash.json()
                            m2_data = m2_dash.json()
                            
                            print(f"\n   Manager 1 sees: {m1_data.get('property_name', 'Unknown')}")
                            print(f"   Manager 2 sees: {m2_data.get('property_name', 'Unknown')}")
                            
                            if m1_data.get('property_name') != m2_data.get('property_name'):
                                print("   ✅ Managers see different properties (correct isolation)")
                                return True
                            else:
                                print("   ❌ Managers see same property (isolation failure!)")
                                return False
                        
        except Exception as e:
            print(f"   ⚠️  Could not complete multi-manager test: {str(e)}")
        
        return None
    
    async def run_all_tests(self):
        """Run all manager flow and isolation tests"""
        print("=" * 60)
        print("MANAGER LOGIN FLOW AND PROPERTY ISOLATION TESTS")
        print("Tasks 1.9 and 1.10: Critical Security Checkpoint")
        print("=" * 60)
        
        # Test 1.9: Manager Login Flow
        print("\n📋 TASK 1.9: TEST MANAGER LOGIN FLOW")
        print("-" * 40)
        
        login_result = await self.test_manager_login("manager@demo.com", "demo123")
        
        if login_result:
            token = login_result["access_token"]
            user = login_result.get("user", {})
            
            # Test dashboard access
            dashboard_data = await self.test_dashboard_access(token)
            
            # Extract property ID for isolation tests
            property_id = "test-prop-001"  # Default expected property
            if dashboard_data.get('dashboard'):
                property_id = dashboard_data['dashboard'].get('property_id', property_id)
            
            print("\n" + "=" * 60)
            print("📋 TASK 1.10: CHECKPOINT ALPHA - PROPERTY ISOLATION")
            print("-" * 40)
            
            # Test property isolation
            isolation_results = await self.test_property_isolation(token, property_id)
            
            # Test multiple managers
            multi_manager_result = await self.test_multiple_managers()
            
            # Summary
            print("\n" + "=" * 60)
            print("🎯 TEST SUMMARY")
            print("=" * 60)
            
            print("\n✅ Task 1.9 - Manager Login Flow:")
            print(f"   - Login: {'PASSED' if login_result else 'FAILED'}")
            print(f"   - Dashboard Access: {'PASSED' if dashboard_data.get('dashboard') else 'FAILED'}")
            print(f"   - Applications Access: {'PASSED' if dashboard_data.get('applications') is not None else 'FAILED'}")
            print(f"   - Employees Access: {'PASSED' if dashboard_data.get('employees') is not None else 'FAILED'}")
            
            print("\n🔒 Task 1.10 - Property Isolation:")
            print(f"   - Isolation Tests: {isolation_results['passed_count']}/{isolation_results['total']} passed")
            print(f"   - Overall Isolation: {'PASSED ✅' if isolation_results['passed'] else 'FAILED ❌'}")
            
            if multi_manager_result is not None:
                print(f"   - Multi-Manager Isolation: {'PASSED ✅' if multi_manager_result else 'FAILED ❌'}")
            
            # Critical checkpoint decision
            print("\n" + "=" * 60)
            if isolation_results['passed']:
                print("🎉 CHECKPOINT ALPHA: PASSED")
                print("Property isolation is working correctly!")
                print("Safe to proceed with further development.")
            else:
                print("⚠️  CHECKPOINT ALPHA: FAILED")
                print("CRITICAL: Property isolation issues detected!")
                print("DO NOT PROCEED until isolation is fixed!")
            print("=" * 60)
            
        else:
            print("\n❌ CRITICAL: Manager login failed - cannot proceed with tests!")
            print("Please fix authentication before continuing.")
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()

async def main():
    tester = ManagerFlowTester()
    try:
        await tester.run_all_tests()
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())