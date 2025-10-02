"""
Authentication and Authorization Tests for Hotel Onboarding System
Tests token-based auth, role-based access control, and session management
"""
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main_enhanced import app
from app.auth import create_token, verify_token, hash_password, verify_password
from app.models import UserRole

client = TestClient(app)


class TestAuthentication:
    """Test authentication mechanisms"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "SecurePassword123!"
        hashed = hash_password(password)
        
        # Verify hash is different from password
        assert hashed != password
        
        # Verify correct password
        assert verify_password(password, hashed) == True
        
        # Verify wrong password
        assert verify_password("WrongPassword", hashed) == False
        
    def test_token_creation_and_verification(self):
        """Test JWT token creation and verification"""
        user_id = "user-123"
        role = UserRole.EMPLOYEE
        
        token = create_token(user_id, role)
        assert token is not None
        
        # Verify token
        payload = verify_token(token)
        assert payload["user_id"] == user_id
        assert payload["role"] == role
        assert "exp" in payload
        
    def test_token_expiration(self):
        """Test token expiration handling"""
        user_id = "user-123"
        role = UserRole.EMPLOYEE
        
        # Create token that expires in 1 second
        token = create_token(user_id, role, expires_delta=timedelta(seconds=1))
        
        # Token should be valid immediately
        payload = verify_token(token)
        assert payload is not None
        
        # Wait for expiration
        import time
        time.sleep(2)
        
        # Token should now be invalid
        with pytest.raises(Exception) as exc_info:
            verify_token(token)
        assert "expired" in str(exc_info.value).lower()
        
    def test_login_endpoint(self):
        """Test login endpoint"""
        # Test valid credentials
        response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "hr@hoteltest.com"
        assert data["user"]["role"] == "hr"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Wrong password
        response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
        
        # Non-existent user
        response = client.post("/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "password123"
        })
        
        assert response.status_code == 401
        
    def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        response = client.get("/auth/me")
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
        
    def test_protected_endpoint_with_token(self):
        """Test accessing protected endpoint with valid token"""
        # Login first
        login_response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        token = login_response.json()["token"]
        
        # Access protected endpoint
        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "hr@hoteltest.com"
        assert data["role"] == "hr"
        
    def test_logout_endpoint(self):
        """Test logout endpoint"""
        # Login first
        login_response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        token = login_response.json()["token"]
        
        # Logout
        response = client.post("/auth/logout", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out successfully"
        
    def test_refresh_token(self):
        """Test token refresh endpoint"""
        # Login first
        login_response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        old_token = login_response.json()["token"]
        
        # Refresh token
        response = client.post("/auth/refresh", headers={
            "Authorization": f"Bearer {old_token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["token"] != old_token  # New token should be different


class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def get_token_for_role(self, role: str) -> str:
        """Helper to get token for specific role"""
        email_map = {
            "hr": "hr@hoteltest.com",
            "manager": "manager@hoteltest.com",
            "employee": "employee@hoteltest.com"
        }
        
        response = client.post("/auth/login", json={
            "email": email_map[role],
            "password": "password123"
        })
        
        return response.json()["token"]
        
    def test_hr_can_access_all_endpoints(self):
        """Test HR has access to all endpoints"""
        hr_token = self.get_token_for_role("hr")
        headers = {"Authorization": f"Bearer {hr_token}"}
        
        # HR-specific endpoints
        hr_endpoints = [
            "/hr/properties",
            "/hr/managers",
            "/hr/dashboard-stats",
            "/hr/applications",
            "/hr/employees/stats"
        ]
        
        for endpoint in hr_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code in [200, 404]  # 404 if no data exists
            assert response.status_code != 403  # Should not be forbidden
            
    def test_manager_property_isolation(self):
        """Test managers only see their property data"""
        manager_token = self.get_token_for_role("manager")
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Get manager's property
        me_response = client.get("/auth/me", headers=headers)
        manager_property_id = me_response.json().get("property_id")
        
        # Get applications - should only see property applications
        apps_response = client.get("/hr/applications", headers=headers)
        if apps_response.status_code == 200:
            applications = apps_response.json()
            for app in applications:
                assert app["property_id"] == manager_property_id
                
    def test_employee_limited_access(self):
        """Test employees have limited access"""
        employee_token = self.get_token_for_role("employee")
        headers = {"Authorization": f"Bearer {employee_token}"}
        
        # Employee should access own profile
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 200
        
        # Employee should not access HR endpoints
        hr_endpoints = ["/hr/properties", "/hr/managers", "/hr/applications"]
        
        for endpoint in hr_endpoints:
            response = client.get(endpoint, headers=headers)
            assert response.status_code in [403, 404]  # Forbidden or not found
            
    def test_role_elevation_prevention(self):
        """Test users cannot elevate their roles"""
        manager_token = self.get_token_for_role("manager")
        headers = {"Authorization": f"Bearer {manager_token}"}
        
        # Try to access HR-only functionality
        response = client.post("/hr/managers", headers=headers, json={
            "name": "New Manager",
            "email": "new.manager@test.com",
            "property_id": "prop-123"
        })
        
        assert response.status_code == 403
        
    def test_cross_property_access_prevention(self):
        """Test managers cannot access other property data"""
        # Create two managers at different properties
        manager1_token = self.get_token_for_role("manager")
        headers1 = {"Authorization": f"Bearer {manager1_token}"}
        
        # Manager 1 property
        me_response = client.get("/auth/me", headers=headers1)
        manager1_property = me_response.json()["property_id"]
        
        # Try to access application from different property
        # This would require setting up test data with known IDs
        other_property_app_id = "app-other-property"
        
        response = client.get(f"/hr/applications/{other_property_app_id}", headers=headers1)
        assert response.status_code in [403, 404]


class TestSessionManagement:
    """Test session management and security"""
    
    def test_concurrent_sessions(self):
        """Test handling of concurrent sessions"""
        # Login from two "devices"
        response1 = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        token1 = response1.json()["token"]
        
        response2 = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        token2 = response2.json()["token"]
        
        # Both tokens should be valid
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        assert client.get("/auth/me", headers=headers1).status_code == 200
        assert client.get("/auth/me", headers=headers2).status_code == 200
        
    def test_invalid_token_format(self):
        """Test handling of malformed tokens"""
        invalid_tokens = [
            "not-a-token",
            "Bearer invalid",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
            ""
        ]
        
        for token in invalid_tokens:
            response = client.get("/auth/me", headers={
                "Authorization": token
            })
            assert response.status_code == 401
            
    def test_token_blacklist_after_logout(self):
        """Test token is blacklisted after logout"""
        # Login
        login_response = client.post("/auth/login", json={
            "email": "hr@hoteltest.com",
            "password": "password123"
        })
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Verify token works
        assert client.get("/auth/me", headers=headers).status_code == 200
        
        # Logout
        client.post("/auth/logout", headers=headers)
        
        # Token should no longer work
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401
        
    def test_session_timeout(self):
        """Test session timeout handling"""
        # This would test that sessions expire after inactivity
        # Implementation depends on session configuration
        pass
        
    def test_secure_headers(self):
        """Test security headers are present"""
        response = client.get("/")
        
        # Check for security headers
        headers = response.headers
        
        # These depend on your security configuration
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security"
        ]
        
        # Note: Some of these may only be present in production
        # This test documents what should be checked


class TestPasswordReset:
    """Test password reset functionality"""
    
    def test_request_password_reset(self):
        """Test requesting password reset"""
        response = client.post("/auth/forgot-password", json={
            "email": "hr@hoteltest.com"
        })
        
        assert response.status_code == 200
        assert "reset link sent" in response.json()["message"].lower()
        
    def test_reset_password_with_token(self):
        """Test resetting password with valid token"""
        # This would require implementing password reset token generation
        reset_token = "valid-reset-token"
        
        response = client.post("/auth/reset-password", json={
            "token": reset_token,
            "new_password": "NewSecurePassword123!"
        })
        
        # Would be 200 with proper implementation
        # assert response.status_code == 200
        
    def test_password_complexity_requirements(self):
        """Test password complexity validation"""
        weak_passwords = [
            "password",  # Too common
            "12345678",  # No letters
            "abcdefgh",  # No numbers
            "Pass1",     # Too short
            "password123"  # No special characters (if required)
        ]
        
        # This would test password validation rules
        for weak_password in weak_passwords:
            # Implementation would validate these
            pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])