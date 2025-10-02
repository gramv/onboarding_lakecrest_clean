"""
Unit tests for token refresh mechanism
Tests the token refresh functionality and session preservation
"""

import pytest
import jwt
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, AsyncMock
import json

from app.auth import OnboardingTokenManager, JWT_SECRET_KEY, JWT_ALGORITHM
from app.routers.auth_router import refresh_token


class TestTokenRefresh:
    """Test suite for token refresh functionality"""
    
    def test_refresh_token_with_valid_token(self):
        """Test refreshing a valid token that's about to expire"""
        # Create a token that expires in 30 minutes
        expire_soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": expire_soon,
            "iat": datetime.now(timezone.utc),
            "jti": "original-token-id"
        }
        
        original_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Refresh the token
        result = OnboardingTokenManager.refresh_token(original_token)
        
        # Verify refresh occurred
        assert result["refreshed"] is True
        assert result["old_token_id"] == "original-token-id"
        assert result["token"] != original_token
        
        # Decode and verify new token
        new_payload = jwt.decode(result["token"], JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        assert new_payload["employee_id"] == "test-employee-123"
        assert new_payload["token_type"] == "onboarding"
        assert new_payload["refreshed_from"] == "original-token-id"
        assert new_payload["jti"] != "original-token-id"
    
    def test_refresh_token_with_long_validity(self):
        """Test that tokens with > 1 day validity are not refreshed"""
        # Create a token that expires in 2 days
        expire_later = datetime.now(timezone.utc) + timedelta(days=2)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": expire_later,
            "iat": datetime.now(timezone.utc),
            "jti": "long-validity-token"
        }
        
        original_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Attempt refresh
        result = OnboardingTokenManager.refresh_token(original_token)
        
        # Verify no refresh occurred
        assert result["refreshed"] is False
        assert result["token"] == original_token
        assert "message" in result
    
    def test_refresh_expired_token_fails(self):
        """Test that expired tokens cannot be refreshed"""
        # Create an expired token
        expired = datetime.now(timezone.utc) - timedelta(hours=1)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": expired,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "jti": "expired-token"
        }
        
        expired_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Attempt refresh should raise exception
        with pytest.raises(jwt.ExpiredSignatureError):
            OnboardingTokenManager.refresh_token(expired_token)
    
    def test_refresh_invalid_token_fails(self):
        """Test that invalid tokens cannot be refreshed"""
        invalid_token = "invalid.token.here"
        
        # Attempt refresh should raise exception
        with pytest.raises(jwt.InvalidTokenError):
            OnboardingTokenManager.refresh_token(invalid_token)
    
    def test_refresh_preserves_all_claims(self):
        """Test that token refresh preserves all original claims"""
        # Create a token with various claims
        expire_soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            "employee_id": "test-employee-123",
            "application_id": "app-456",
            "property_id": "prop-789",
            "token_type": "onboarding",
            "custom_claim": "custom_value",
            "exp": expire_soon,
            "iat": datetime.now(timezone.utc),
            "jti": "original-token-id"
        }
        
        original_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Refresh the token
        result = OnboardingTokenManager.refresh_token(original_token)
        
        # Decode and verify claims are preserved
        new_payload = jwt.decode(result["token"], JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        assert new_payload["employee_id"] == "test-employee-123"
        assert new_payload["application_id"] == "app-456"
        assert new_payload["property_id"] == "prop-789"
        assert new_payload["custom_claim"] == "custom_value"
    
    def test_refresh_updates_timestamps(self):
        """Test that token refresh updates iat and exp timestamps"""
        # Create a token
        old_iat = datetime.now(timezone.utc) - timedelta(hours=1)
        old_exp = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": old_exp,
            "iat": old_iat,
            "jti": "original-token-id"
        }
        
        original_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Refresh the token
        result = OnboardingTokenManager.refresh_token(original_token)
        
        # Decode and verify timestamps are updated
        new_payload = jwt.decode(result["token"], JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # New iat should be recent (within last minute)
        new_iat = datetime.fromtimestamp(new_payload["iat"], tz=timezone.utc)
        assert (datetime.now(timezone.utc) - new_iat).total_seconds() < 60
        
        # New exp should be extended
        new_exp = datetime.fromtimestamp(new_payload["exp"], tz=timezone.utc)
        assert new_exp > old_exp
    
    def test_refresh_generates_new_jti(self):
        """Test that refreshed tokens get new unique JTI"""
        # Create a token
        expire_soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": expire_soon,
            "iat": datetime.now(timezone.utc),
            "jti": "original-jti-123"
        }
        
        original_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Refresh the token multiple times
        jtis = set()
        for _ in range(5):
            result = OnboardingTokenManager.refresh_token(original_token)
            new_payload = jwt.decode(result["token"], JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            jtis.add(new_payload["jti"])
        
        # All JTIs should be unique
        assert len(jtis) == 5
        assert "original-jti-123" not in jtis


class TestTokenRefreshIntegration:
    """Integration tests for token refresh with API endpoints"""
    
    @pytest.mark.asyncio
    async def test_refresh_endpoint_with_valid_token(self):
        """Test the /api/auth/refresh-token endpoint"""
        from fastapi.testclient import TestClient
        from fastapi.security import HTTPAuthorizationCredentials
        from app.main_enhanced import app
        
        # Create a test token
        expire_soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {
            "employee_id": "test-employee-123",
            "token_type": "onboarding",
            "exp": expire_soon,
            "iat": datetime.now(timezone.utc),
            "jti": "test-jti"
        }
        test_token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Mock the security dependency
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=test_token
        )
        
        # Create mock request
        mock_request = Mock()
        mock_request.headers = {"Authorization": f"Bearer {test_token}"}
        
        # Test would require full FastAPI test client setup
        # This is a placeholder for integration test structure
        # with TestClient(app) as client:
        #     response = client.post(
        #         "/api/auth/refresh-token",
        #         headers={"Authorization": f"Bearer {test_token}"}
        #     )
        #     assert response.status_code == 200
        #     data = response.json()
        #     assert data["success"] is True
        #     assert data["data"]["refreshed"] is True
    
    @pytest.mark.asyncio
    async def test_session_preservation_during_refresh(self):
        """Test that session data in localStorage is preserved during token refresh"""
        # This test would require browser/frontend testing
        # Placeholder for E2E test structure
        pass


class TestTokenExpiryCheck:
    """Tests for token expiry checking logic"""
    
    def test_token_about_to_expire_detection(self):
        """Test detection of tokens about to expire"""
        # Token expiring in 30 minutes - should be refreshable
        expire_soon = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload_soon = {
            "exp": expire_soon,
            "iat": datetime.now(timezone.utc),
            "jti": "soon-to-expire"
        }
        token_soon = jwt.encode(payload_soon, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Token expiring in 2 days - should not be refreshable yet
        expire_later = datetime.now(timezone.utc) + timedelta(days=2)
        payload_later = {
            "exp": expire_later,
            "iat": datetime.now(timezone.utc),
            "jti": "expires-later"
        }
        token_later = jwt.encode(payload_later, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        # Test refresh decisions
        result_soon = OnboardingTokenManager.refresh_token(token_soon)
        result_later = OnboardingTokenManager.refresh_token(token_later)
        
        assert result_soon["refreshed"] is True
        assert result_later["refreshed"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])