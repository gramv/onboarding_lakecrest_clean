"""
Integration tests for the Hotel Onboarding Backend API
Tests complete user workflows and API integration
"""
import pytest
import requests
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import time

# Test Configuration
BASE_URL = "http://127.0.0.1:8000"
TEST_TIMEOUT = 30

class APITestClient:
    """Helper class for API testing"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.token: Optional[str] = None
        
    def set_auth_token(self, token: str):
        """Set authentication token for requests"""
        self.token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def clear_auth(self):
        """Clear authentication"""
        self.token = None
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
            
    def post(self, endpoint: str, **kwargs) -> requests.Response:
        """POST request with error handling"""
        try:
            response = self.session.post(f"{self.base_url}{endpoint}", timeout=TEST_TIMEOUT, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Request failed: {e}")
            
    def get(self, endpoint: str, **kwargs) -> requests.Response:
        """GET request with error handling"""
        try:
            response = self.session.get(f"{self.base_url}{endpoint}", timeout=TEST_TIMEOUT, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Request failed: {e}")
            
    def put(self, endpoint: str, **kwargs) -> requests.Response:
        """PUT request with error handling"""
        try:
            response = self.session.put(f"{self.base_url}{endpoint}", timeout=TEST_TIMEOUT, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Request failed: {e}")
            
    def delete(self, endpoint: str, **kwargs) -> requests.Response:
        """DELETE request with error handling"""
        try:
            response = self.session.delete(f"{self.base_url}{endpoint}", timeout=TEST_TIMEOUT, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Request failed: {e}")

@pytest.fixture
def api_client():
    """Fixture providing API test client"""
    return APITestClient()

@pytest.fixture
def hr_client(api_client):
    """Fixture providing authenticated HR client"""
    # Login as HR user
    response = api_client.post("/auth/login", json={
        "email": "hr@hoteltest.com",
        "password": "password123"
    })
    
    if response.status_code != 200:
        pytest.fail(f"HR login failed: {response.status_code} - {response.text}")
        
    token = response.json()["token"]
    api_client.set_auth_token(token)
    return api_client

@pytest.fixture
def manager_client(api_client):
    """Fixture providing authenticated Manager client"""
    # Login as Manager user
    response = api_client.post("/auth/login", json={
        "email": "manager@hoteltest.com", 
        "password": "password123"
    })
    
    if response.status_code != 200:
        pytest.fail(f"Manager login failed: {response.status_code} - {response.text}")
        
    token = response.json()["token"]
    api_client.set_auth_token(token)
    return api_client

class TestAuthenticationIntegration:
    """Test authentication workflows"""
    
    def test_hr_login_workflow(self, api_client):
        """Test complete HR login workflow"""
        # Test successful login
        response = api_client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "hr"
        assert data["user"]["email"] == "hr@hoteltest.com"
        
        # Test token validation
        api_client.set_auth_token(data["token"])
        me_response = api_client.get("/auth/me")
        
        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["email"] == "hr@hoteltest.com"
        assert user_data["role"] == "hr"
        
    def test_manager_login_workflow(self, api_client):
        """Test complete Manager login workflow"""
        # Test successful login
        response = api_client.post("/auth/login", json={
            "email": "manager@hoteltest.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "manager"
        assert data["user"]["email"] == "manager@hoteltest.com"
        assert "property_id" in data["user"]
        
        # Test token validation
        api_client.set_auth_token(data["token"])
        me_response = api_client.get("/auth/me")
        
        assert me_response.status_code == 200
        user_data = me_response.json()
        assert user_data["email"] == "manager@hoteltest.com"
        assert user_data["role"] == "manager"
        
    def test_invalid_login_attempts(self, api_client):
        """Test invalid login attempts"""
        # Test invalid email
        response = api_client.post("/auth/login", json={
            "email": "invalid@test.com",
            "password": "password123"
        })
        assert response.status_code == 401
        
        # Test invalid password
        response = api_client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
        # Test malformed request
        response = api_client.post("/auth/login", json={
            "email": "not-an-email",
            "password": ""
        })
        assert response.status_code in [400, 422]  # Validation error
        
    def test_token_refresh_workflow(self, hr_client):
        """Test token refresh workflow"""
        # Test token refresh
        response = hr_client.post("/auth/refresh")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "expires_at" in data
        
        # Verify new token works
        hr_client.set_auth_token(data["token"])
        me_response = hr_client.get("/auth/me")
        assert me_response.status_code == 200
        
    def test_logout_workflow(self, hr_client):
        """Test logout workflow"""
        # Test logout
        response = hr_client.post("/auth/logout")
        assert response.status_code == 200
        
        # Clear token and verify access is denied
        hr_client.clear_auth()
        me_response = hr_client.get("/auth/me")
        assert me_response.status_code == 401

class TestRoleBasedAccessControl:
    """Test role-based access control"""
    
    def test_hr_exclusive_endpoints(self, hr_client, manager_client):
        """Test endpoints that should be HR-only"""
        hr_only_endpoints = [
            "/hr/properties",
            "/hr/managers",
            "/hr/dashboard-stats",
            "/hr/employees/stats",
            "/hr/managers/performance"
        ]
        
        for endpoint in hr_only_endpoints:
            # HR should have access
            hr_response = hr_client.get(endpoint)
            assert hr_response.status_code in [200, 404], f"HR access denied to {endpoint}"
            
            # Manager should be denied or get filtered results
            manager_response = manager_client.get(endpoint)
            # Some endpoints may return filtered data for managers, others may deny access
            assert manager_response.status_code in [200, 403, 404], f"Unexpected response for manager on {endpoint}"
            
    def test_manager_property_filtering(self, manager_client):
        """Test that managers only see their property data"""
        # Get manager's property ID
        me_response = manager_client.get("/auth/me")
        assert me_response.status_code == 200
        manager_data = me_response.json()
        manager_property_id = manager_data.get("property_id")
        
        if manager_property_id:
            # Test applications filtering
            apps_response = manager_client.get("/hr/applications")
            if apps_response.status_code == 200:
                applications = apps_response.json()
                for app in applications:
                    assert app["property_id"] == manager_property_id, "Manager seeing applications from other properties"
                    
            # Test employees filtering  
            emp_response = manager_client.get("/api/employees")
            if emp_response.status_code == 200:
                employees_data = emp_response.json()
                employees = employees_data.get("employees", [])
                for emp in employees:
                    assert emp["property_id"] == manager_property_id, "Manager seeing employees from other properties"
                    
    def test_unauthenticated_access_denied(self, api_client):
        """Test that unauthenticated requests are denied"""
        protected_endpoints = [
            "/auth/me",
            "/hr/properties", 
            "/hr/applications",
            "/hr/managers",
            "/api/employees"
        ]
        
        for endpoint in protected_endpoints:
            response = api_client.get(endpoint)
            assert response.status_code == 401, f"Unauthenticated access allowed to {endpoint}"

class TestHRWorkflowIntegration:
    """Test complete HR workflows"""
    
    def test_property_management_workflow(self, hr_client):
        """Test complete property management workflow"""
        # Create property
        property_data = {
            "name": "Test Integration Hotel",
            "address": "123 Test Street", 
            "city": "Test City",
            "state": "TS",
            "zip_code": "12345",
            "phone": "555-0123"
        }
        
        create_response = hr_client.post("/hr/properties", data=property_data)
        assert create_response.status_code == 200
        
        created_property = create_response.json()
        property_id = created_property["id"]
        
        # Verify property was created
        get_response = hr_client.get(f"/hr/properties/{property_id}")
        assert get_response.status_code == 200
        
        property_details = get_response.json()
        assert property_details["name"] == property_data["name"]
        assert property_details["address"] == property_data["address"]
        
        # Update property
        update_data = {
            "name": "Updated Test Hotel",
            "address": property_data["address"],
            "city": property_data["city"], 
            "state": property_data["state"],
            "zip_code": property_data["zip_code"],
            "phone": "555-9999"
        }
        
        update_response = hr_client.put(f"/hr/properties/{property_id}", data=update_data)
        assert update_response.status_code == 200
        
        # Verify update
        updated_response = hr_client.get(f"/hr/properties/{property_id}")
        assert updated_response.status_code == 200
        updated_property = updated_response.json()
        assert updated_property["name"] == "Updated Test Hotel"
        assert updated_property["phone"] == "555-9999"
        
        # Test property activation/deactivation
        deactivate_response = hr_client.post(f"/hr/properties/{property_id}/deactivate")
        assert deactivate_response.status_code == 200
        
        activate_response = hr_client.post(f"/hr/properties/{property_id}/activate")
        assert activate_response.status_code == 200
        
        # Clean up - delete property
        delete_response = hr_client.delete(f"/hr/properties/{property_id}")
        assert delete_response.status_code == 200
        
    def test_manager_assignment_workflow(self, hr_client):
        """Test manager assignment workflow"""
        # Get existing properties and managers
        properties_response = hr_client.get("/hr/properties")
        assert properties_response.status_code == 200
        properties = properties_response.json()
        
        managers_response = hr_client.get("/hr/managers")
        assert managers_response.status_code == 200
        managers = managers_response.json()
        
        if properties and managers:
            property_id = properties[0]["id"]
            manager_id = managers[0]["id"]
            
            # Assign manager to property
            assign_response = hr_client.post(f"/hr/properties/{property_id}/managers", data={
                "manager_id": manager_id
            })
            assert assign_response.status_code == 200
            
            # Verify assignment
            property_managers_response = hr_client.get(f"/hr/properties/{property_id}/managers")
            assert property_managers_response.status_code == 200
            property_managers = property_managers_response.json()
            
            manager_ids = [m["id"] for m in property_managers]
            assert manager_id in manager_ids
            
    def test_dashboard_stats_workflow(self, hr_client):
        """Test dashboard statistics workflow"""
        response = hr_client.get("/hr/dashboard-stats")
        assert response.status_code == 200
        
        stats = response.json()
        required_fields = ["totalProperties", "totalManagers", "totalEmployees", "pendingApplications"]
        
        for field in required_fields:
            assert field in stats, f"Missing required field: {field}"
            assert isinstance(stats[field], int), f"Field {field} should be integer"
            assert stats[field] >= 0, f"Field {field} should be non-negative"

class TestManagerWorkflowIntegration:
    """Test complete Manager workflows"""
    
    def test_manager_dashboard_data_access(self, manager_client):
        """Test manager dashboard data access"""
        # Get manager info
        me_response = manager_client.get("/auth/me")
        assert me_response.status_code == 200
        manager_data = me_response.json()
        
        # Test property access
        properties_response = manager_client.get("/hr/properties")
        assert properties_response.status_code == 200
        properties = properties_response.json()
        
        # Manager should only see their assigned property
        if manager_data.get("property_id"):
            manager_property_ids = [p["id"] for p in properties]
            assert manager_data["property_id"] in manager_property_ids
            
        # Test applications access
        applications_response = manager_client.get("/hr/applications")
        assert applications_response.status_code == 200
        applications = applications_response.json()
        
        # All applications should be for manager's property
        if manager_data.get("property_id"):
            for app in applications:
                assert app["property_id"] == manager_data["property_id"]
                
        # Test employees access
        employees_response = manager_client.get("/api/employees")
        assert employees_response.status_code == 200
        employees_data = employees_response.json()
        employees = employees_data.get("employees", [])
        
        # All employees should be for manager's property
        if manager_data.get("property_id"):
            for emp in employees:
                assert emp["property_id"] == manager_data["property_id"]
                
    def test_application_review_workflow(self, manager_client):
        """Test application review workflow"""
        # Get pending applications
        applications_response = manager_client.get("/hr/applications")
        assert applications_response.status_code == 200
        applications = applications_response.json()
        
        pending_applications = [app for app in applications if app["status"] == "pending"]
        
        if pending_applications:
            app_id = pending_applications[0]["id"]
            
            # Get application details
            details_response = manager_client.get(f"/hr/applications/{app_id}")
            assert details_response.status_code == 200
            
            app_details = details_response.json()
            assert "applicant_data" in app_details
            assert "status" in app_details
            assert app_details["status"] == "pending"
            
            # Test approval workflow (without actually approving to preserve test data)
            job_offer_data = {
                "job_title": "Test Position",
                "start_date": "2025-08-01",
                "start_time": "09:00",
                "pay_rate": "18.50",
                "pay_frequency": "bi-weekly",
                "benefits_eligible": "yes",
                "direct_supervisor": "Test Supervisor"
            }
            
            # Note: We're not actually calling the approve endpoint to preserve test data
            # In a real test environment, you would call:
            # approve_response = manager_client.post(f"/hr/applications/{app_id}/approve", data=job_offer_data)
            # assert approve_response.status_code == 200

class TestAPIIntegration:
    """Test API integration and error handling"""
    
    def test_api_error_handling(self, hr_client):
        """Test API error handling"""
        # Test 404 errors
        response = hr_client.get("/hr/properties/nonexistent-id")
        assert response.status_code == 404
        
        response = hr_client.get("/hr/applications/nonexistent-id")
        assert response.status_code == 404
        
        # Test validation errors
        response = hr_client.post("/hr/properties", data={
            "name": "",  # Empty name should fail validation
            "address": "123 Test St"
        })
        assert response.status_code in [400, 422]
        
    def test_api_response_formats(self, hr_client):
        """Test API response formats"""
        # Test properties endpoint
        response = hr_client.get("/hr/properties")
        assert response.status_code == 200
        assert response.headers.get("content-type", "").startswith("application/json")
        
        properties = response.json()
        assert isinstance(properties, list)
        
        if properties:
            property_obj = properties[0]
            required_fields = ["id", "name", "address", "city", "state", "zip_code", "is_active", "created_at"]
            for field in required_fields:
                assert field in property_obj, f"Missing field: {field}"
                
        # Test applications endpoint
        response = hr_client.get("/hr/applications")
        assert response.status_code == 200
        
        applications = response.json()
        assert isinstance(applications, list)
        
        if applications:
            app = applications[0]
            required_fields = ["id", "property_id", "status", "applicant_data", "applied_at"]
            for field in required_fields:
                assert field in app, f"Missing field: {field}"
                
    def test_api_pagination_and_filtering(self, hr_client):
        """Test API pagination and filtering"""
        # Test applications with status filter
        response = hr_client.get("/hr/applications?status=pending")
        assert response.status_code == 200
        
        applications = response.json()
        for app in applications:
            assert app["status"] == "pending"
            
        # Test employees with property filter
        properties_response = hr_client.get("/hr/properties")
        if properties_response.status_code == 200:
            properties = properties_response.json()
            if properties:
                property_id = properties[0]["id"]
                
                response = hr_client.get(f"/api/employees?property_id={property_id}")
                assert response.status_code == 200
                
                employees_data = response.json()
                employees = employees_data.get("employees", [])
                for emp in employees:
                    assert emp["property_id"] == property_id
                    
    def test_concurrent_api_requests(self, hr_client):
        """Test handling of concurrent API requests"""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            try:
                response = hr_client.get("/hr/dashboard-stats")
                results.put(response.status_code)
            except Exception as e:
                results.put(f"Error: {e}")
                
        # Make 5 concurrent requests
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
            
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        # Check results
        success_count = 0
        while not results.empty():
            result = results.get()
            if result == 200:
                success_count += 1
                
        assert success_count >= 4, "Most concurrent requests should succeed"

class TestDataConsistency:
    """Test data consistency across API operations"""
    
    def test_property_manager_consistency(self, hr_client):
        """Test consistency between properties and managers"""
        # Get all properties
        properties_response = hr_client.get("/hr/properties")
        assert properties_response.status_code == 200
        properties = properties_response.json()
        
        # Get all managers
        managers_response = hr_client.get("/hr/managers")
        assert managers_response.status_code == 200
        managers = managers_response.json()
        
        # Check that manager property assignments are consistent
        for manager in managers:
            if manager.get("property_id"):
                property_ids = [p["id"] for p in properties]
                assert manager["property_id"] in property_ids, f"Manager {manager['id']} assigned to non-existent property"
                
    def test_application_property_consistency(self, hr_client):
        """Test consistency between applications and properties"""
        # Get all applications
        applications_response = hr_client.get("/hr/applications")
        assert applications_response.status_code == 200
        applications = applications_response.json()
        
        # Get all properties
        properties_response = hr_client.get("/hr/properties")
        assert properties_response.status_code == 200
        properties = properties_response.json()
        
        property_ids = [p["id"] for p in properties]
        
        # Check that all applications reference valid properties
        for app in applications:
            assert app["property_id"] in property_ids, f"Application {app['id']} references non-existent property"
            
    def test_employee_property_consistency(self, hr_client):
        """Test consistency between employees and properties"""
        # Get all employees
        employees_response = hr_client.get("/api/employees")
        assert employees_response.status_code == 200
        employees_data = employees_response.json()
        employees = employees_data.get("employees", [])
        
        # Get all properties
        properties_response = hr_client.get("/hr/properties")
        assert properties_response.status_code == 200
        properties = properties_response.json()
        
        property_ids = [p["id"] for p in properties]
        
        # Check that all employees reference valid properties
        for emp in employees:
            assert emp["property_id"] in property_ids, f"Employee {emp['id']} references non-existent property"

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])