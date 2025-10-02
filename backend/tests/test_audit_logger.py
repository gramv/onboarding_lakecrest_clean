"""
Unit tests for audit logging functionality
Tests the audit logger service and compliance tracking
"""

import pytest
import asyncio
from datetime import datetime, timezone
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import json

from app.audit_logger import (
    AuditLogger, AuditEntry, AuditAction, ActionCategory, 
    ComplianceFlags, audit_logger
)


class TestAuditLogger:
    """Test suite for audit logger functionality"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Create a mock Supabase service"""
        mock = Mock()
        mock.client.table.return_value.insert.return_value.execute.return_value.data = [{"id": "test-audit-id"}]
        return mock
    
    @pytest.fixture
    def audit_logger_instance(self, mock_supabase):
        """Create an audit logger instance with mocked dependencies"""
        logger = AuditLogger()
        logger.supabase_service = mock_supabase
        return logger
    
    @pytest.fixture
    def mock_request(self):
        """Create a mock FastAPI request"""
        request = Mock()
        request.headers = {
            "Authorization": "Bearer test-token",
            "User-Agent": "TestAgent/1.0",
            "X-Forwarded-For": "192.168.1.100"
        }
        request.method = "POST"
        request.url.path = "/api/test/endpoint"
        request.client = Mock(host="192.168.1.100")
        return request
    
    @pytest.mark.asyncio
    async def test_log_action_basic(self, audit_logger_instance, mock_request):
        """Test basic audit log creation"""
        await audit_logger_instance.log_action(
            action=AuditAction.LOGIN,
            action_category=ActionCategory.AUTHENTICATION,
            request=mock_request,
            user_id="user-123",
            immediate=True
        )
        
        # Verify database insert was called
        audit_logger_instance.supabase_service.client.table.assert_called_with("audit_logs")
        audit_logger_instance.supabase_service.client.table().insert.assert_called_once()
        
        # Check the logged data
        call_args = audit_logger_instance.supabase_service.client.table().insert.call_args[0][0]
        assert call_args["action"] == AuditAction.LOGIN
        assert call_args["action_category"] == ActionCategory.AUTHENTICATION
        assert call_args["user_id"] == "user-123"
        assert call_args["ip_address"] == "192.168.1.100"
    
    @pytest.mark.asyncio
    async def test_log_form_save_with_sanitization(self, audit_logger_instance, mock_request):
        """Test form save logging with PII sanitization"""
        sensitive_form_data = {
            "firstName": "John",
            "lastName": "Doe",
            "ssn": "123-45-6789",
            "bank_account": "1234567890",
            "routing_number": "987654321",
            "email": "john@example.com"
        }
        
        await audit_logger_instance.log_form_save(
            request=mock_request,
            employee_id="emp-123",
            step_id="personal-info",
            form_data=sensitive_form_data,
            session_id="session-456",
            is_federal_form=False
        )
        
        # Get the logged data
        call_args = audit_logger_instance.supabase_service.client.table().insert.call_args[0][0]
        
        # Verify sensitive data is sanitized
        assert call_args["new_data"]["ssn"] == "***REDACTED***"
        assert call_args["new_data"]["bank_account"] == "***REDACTED***"
        assert call_args["new_data"]["routing_number"] == "***REDACTED***"
        
        # Non-sensitive data should be preserved
        assert call_args["new_data"]["firstName"] == "John"
        assert call_args["new_data"]["email"] == "john@example.com"
    
    @pytest.mark.asyncio
    async def test_log_signature_with_compliance(self, audit_logger_instance, mock_request):
        """Test signature logging with compliance flags"""
        metadata = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_address": "192.168.1.100",
            "consent": True
        }
        
        await audit_logger_instance.log_signature(
            request=mock_request,
            employee_id="emp-123",
            document_type="i9-section1",
            signature_type="employee_signature",
            metadata=metadata,
            session_id="session-456"
        )
        
        # Get the logged data
        call_args = audit_logger_instance.supabase_service.client.table().insert.call_args[0][0]
        
        # Verify compliance flags
        assert call_args["action"] == AuditAction.SIGNATURE_ADDED
        assert call_args["action_category"] == ActionCategory.SIGNATURE
        assert call_args["compliance_flags"]["federal_form"] is True
        assert call_args["compliance_flags"]["signature_type"] == "employee_signature"
        assert call_args["compliance_flags"]["document_type"] == "i9-section1"
        assert call_args["compliance_flags"]["retention_required"] is True
    
    @pytest.mark.asyncio
    async def test_log_navigation(self, audit_logger_instance, mock_request):
        """Test navigation logging between steps"""
        await audit_logger_instance.log_navigation(
            request=mock_request,
            employee_id="emp-123",
            from_step="personal-info",
            to_step="i9-section1",
            session_id="session-456"
        )
        
        # Get the logged data
        call_args = audit_logger_instance.supabase_service.client.table().insert.call_args[0][0]
        
        assert call_args["action"] == AuditAction.STEP_NAVIGATION
        assert call_args["action_category"] == ActionCategory.NAVIGATION
        assert call_args["old_data"]["step"] == "personal-info"
        assert call_args["new_data"]["step"] == "i9-section1"
        assert call_args["step_id"] == "i9-section1"
    
    @pytest.mark.asyncio
    async def test_batch_processing(self, audit_logger_instance):
        """Test batch processing of audit entries"""
        # Set small batch size for testing
        audit_logger_instance._batch_size = 2
        
        # Add entries without immediate flag
        for i in range(3):
            entry = AuditEntry(
                action=f"test_action_{i}",
                action_category=ActionCategory.SYSTEM,
                user_id=f"user_{i}"
            )
            await audit_logger_instance._add_to_batch(entry)
        
        # First two should trigger batch flush
        assert audit_logger_instance.supabase_service.client.table().insert.call_count >= 1
        
        # Third entry should still be in queue
        assert len(audit_logger_instance._batch_queue) == 1
        
        # Manual flush should process remaining
        await audit_logger_instance.flush_batch()
        assert len(audit_logger_instance._batch_queue) == 0
    
    @pytest.mark.asyncio
    async def test_immediate_logging_for_critical_actions(self, audit_logger_instance, mock_request):
        """Test that critical actions are logged immediately"""
        # Signature actions should be immediate
        await audit_logger_instance.log_action(
            action=AuditAction.SIGNATURE_ADDED,
            action_category=ActionCategory.SIGNATURE,
            request=mock_request,
            employee_id="emp-123"
        )
        
        # Should write immediately, not batch
        assert audit_logger_instance.supabase_service.client.table().insert.call_count == 1
        assert len(audit_logger_instance._batch_queue) == 0
    
    def test_extract_token_info(self, audit_logger_instance):
        """Test JWT token info extraction"""
        import jwt
        
        # Create a test token
        payload = {
            "jti": "token-id-123",
            "sub": "user-456",
            "employee_id": "emp-789"
        }
        test_token = jwt.encode(payload, "secret", algorithm="HS256")
        
        # Create mock request with token
        request = Mock()
        request.headers = {"Authorization": f"Bearer {test_token}"}
        
        token_id, user_id = audit_logger_instance.extract_token_info(request)
        
        assert token_id == "token-id-123"
        assert user_id == "user-456"
    
    def test_extract_request_metadata(self, audit_logger_instance):
        """Test request metadata extraction"""
        request = Mock()
        request.headers = {
            "User-Agent": "Mozilla/5.0",
            "X-Forwarded-For": "10.0.0.1, 192.168.1.1",
            "X-Request-ID": "req-123"
        }
        request.method = "POST"
        request.url = Mock(path="/api/test")
        request.client = Mock(host="192.168.1.100")
        
        metadata = audit_logger_instance.extract_request_metadata(request)
        
        assert metadata["ip_address"] == "10.0.0.1"  # First IP from X-Forwarded-For
        assert metadata["user_agent"] == "Mozilla/5.0"
        assert metadata["http_method"] == "POST"
        assert metadata["endpoint"] == "/api/test"
        assert metadata["request_id"] == "req-123"
    
    @pytest.mark.asyncio
    async def test_query_audit_logs(self, audit_logger_instance):
        """Test querying audit logs with filters"""
        # Mock the query response
        mock_data = [
            {"id": "1", "action": "login", "timestamp": "2024-01-01T00:00:00Z"},
            {"id": "2", "action": "form_save", "timestamp": "2024-01-01T01:00:00Z"}
        ]
        
        mock_query = Mock()
        mock_query.eq.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.lte.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.execute.return_value.data = mock_data
        
        audit_logger_instance.supabase_service.client.table.return_value.select.return_value = mock_query
        
        # Query with filters
        results = await audit_logger_instance.query_audit_logs(
            employee_id="emp-123",
            action=AuditAction.LOGIN,
            start_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
            limit=10
        )
        
        assert len(results) == 2
        assert results[0]["action"] == "login"
        
        # Verify filters were applied
        mock_query.eq.assert_any_call("employee_id", "emp-123")
        mock_query.eq.assert_any_call("action", AuditAction.LOGIN)
        mock_query.limit.assert_called_with(10)


class TestComplianceFlags:
    """Test compliance flag handling"""
    
    def test_compliance_flags_model(self):
        """Test ComplianceFlags model"""
        flags = ComplianceFlags(
            federal_form=True,
            i9_section=1,
            w4_year=2024,
            signature_type="employee",
            document_type="i9_form",
            retention_required=True,
            pii_accessed=True
        )
        
        assert flags.federal_form is True
        assert flags.i9_section == 1
        assert flags.w4_year == 2024
        assert flags.retention_required is True
    
    def test_compliance_flags_serialization(self):
        """Test ComplianceFlags serialization"""
        flags = ComplianceFlags(
            federal_form=True,
            signature_type="manager"
        )
        
        serialized = flags.model_dump()
        
        assert serialized["federal_form"] is True
        assert serialized["signature_type"] == "manager"
        assert serialized["i9_section"] is None


class TestAuditContextManager:
    """Test the audit context manager"""
    
    @pytest.mark.asyncio
    async def test_audit_context_success(self):
        """Test audit context manager for successful operations"""
        from app.audit_logger import audit_context
        
        mock_request = Mock()
        mock_request.headers = {}
        
        with patch.object(audit_logger, 'log_action', new_callable=AsyncMock) as mock_log:
            async with audit_context(
                request=mock_request,
                action="test_action",
                action_category=ActionCategory.SYSTEM,
                user_id="user-123"
            ):
                # Simulate some work
                await asyncio.sleep(0.01)
            
            # Verify logging was called
            mock_log.assert_called_once()
            call_args = mock_log.call_args[1]
            assert call_args["action"] == "test_action"
            assert call_args["error_message"] is None
            assert "duration_ms" in call_args["new_data"]
    
    @pytest.mark.asyncio
    async def test_audit_context_with_error(self):
        """Test audit context manager when an error occurs"""
        from app.audit_logger import audit_context
        
        mock_request = Mock()
        mock_request.headers = {}
        
        with patch.object(audit_logger, 'log_action', new_callable=AsyncMock) as mock_log:
            with pytest.raises(ValueError):
                async with audit_context(
                    request=mock_request,
                    action="test_action",
                    action_category=ActionCategory.SYSTEM
                ):
                    raise ValueError("Test error")
            
            # Verify error was logged
            mock_log.assert_called_once()
            call_args = mock_log.call_args[1]
            assert call_args["error_message"] == "Test error"
            assert call_args["response_status"] == 500


if __name__ == "__main__":
    pytest.main([__file__, "-v"])