"""
Audit Logger Service for Comprehensive Compliance Tracking
Handles all audit logging operations with focus on federal compliance
"""

import logging
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from enum import Enum
import asyncio
from contextlib import asynccontextmanager

from fastapi import Request, Response
from pydantic import BaseModel, Field
import jwt

# Import database service
from .supabase_service_enhanced import EnhancedSupabaseService

# Configure logging
logger = logging.getLogger(__name__)


class ActionCategory(str, Enum):
    """Categories of actions for audit logging"""
    ONBOARDING = "onboarding"
    AUTHENTICATION = "authentication"
    DOCUMENT = "document"
    SIGNATURE = "signature"
    ADMIN = "admin"
    NAVIGATION = "navigation"
    DATA_CHANGE = "data_change"
    COMPLIANCE = "compliance"
    SYSTEM = "system"


class AuditAction(str, Enum):
    """Specific actions that are logged"""
    # Authentication actions
    LOGIN = "login"
    LOGOUT = "logout"
    TOKEN_REFRESH = "token_refresh"
    TOKEN_EXPIRED = "token_expired"
    
    # Onboarding actions
    ONBOARDING_START = "onboarding_start"
    ONBOARDING_RESUME = "onboarding_resume"
    STEP_NAVIGATION = "step_navigation"
    STEP_COMPLETE = "step_complete"
    FORM_SAVE = "form_save"
    FORM_SUBMIT = "form_submit"
    FORM_VALIDATION_ERROR = "form_validation_error"
    
    # Document actions
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_GENERATE = "document_generate"
    DOCUMENT_VIEW = "document_view"
    DOCUMENT_DOWNLOAD = "document_download"
    PDF_PREVIEW = "pdf_preview"
    
    # Signature actions
    SIGNATURE_ADDED = "signature_added"
    SIGNATURE_VERIFIED = "signature_verified"
    SIGNATURE_REJECTED = "signature_rejected"
    
    # Federal compliance actions
    I9_SECTION1_COMPLETE = "i9_section1_complete"
    I9_SECTION2_COMPLETE = "i9_section2_complete"
    W4_COMPLETE = "w4_complete"
    FEDERAL_FORM_COMPLETE = "federal_form_complete"
    
    # Admin actions
    EMPLOYEE_APPROVED = "employee_approved"
    EMPLOYEE_REJECTED = "employee_rejected"
    PROPERTY_CREATED = "property_created"
    MANAGER_ASSIGNED = "manager_assigned"
    
    # System actions
    AUDIT_CLEANUP = "audit_cleanup"
    ERROR_OCCURRED = "error_occurred"


class ComplianceFlags(BaseModel):
    """Compliance-specific flags for audit entries"""
    federal_form: Optional[bool] = None
    i9_section: Optional[int] = None
    w4_year: Optional[int] = None
    signature_type: Optional[str] = None
    document_type: Optional[str] = None
    retention_required: Optional[bool] = None
    pii_accessed: Optional[bool] = None


class AuditEntry(BaseModel):
    """Model for audit log entries"""
    action: str
    action_category: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    token_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    employee_id: Optional[str] = None
    application_id: Optional[str] = None
    step_id: Optional[str] = None
    property_id: Optional[str] = None
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    http_method: Optional[str] = None
    endpoint: Optional[str] = None
    response_status: Optional[int] = None
    error_message: Optional[str] = None
    compliance_flags: Optional[Dict[str, Any]] = None


class AuditLogger:
    """Service for logging audit entries with batching and async support"""
    
    def __init__(self):
        self.supabase_service = EnhancedSupabaseService()
        self._batch_queue: List[AuditEntry] = []
        self._batch_size = 10
        self._batch_interval = 5.0  # seconds
        self._last_flush = datetime.now(timezone.utc)
        self._flush_lock = asyncio.Lock()
        self._background_task = None
        
    async def start_background_flush(self):
        """Start background task for periodic batch flushing"""
        if self._background_task is None:
            self._background_task = asyncio.create_task(self._periodic_flush())
    
    async def stop_background_flush(self):
        """Stop background flush task"""
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
            self._background_task = None
    
    async def _periodic_flush(self):
        """Periodically flush audit log batch"""
        while True:
            try:
                await asyncio.sleep(self._batch_interval)
                await self.flush_batch()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic flush: {e}")
    
    def extract_token_info(self, request: Request) -> tuple[Optional[str], Optional[str]]:
        """Extract token ID and user ID from JWT token in request"""
        try:
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return None, None
            
            token = auth_header.replace("Bearer ", "")
            # Decode without verification to get claims (verification happens elsewhere)
            payload = jwt.decode(token, options={"verify_signature": False})
            
            token_id = payload.get("jti")
            user_id = payload.get("sub") or payload.get("user_id") or payload.get("employee_id")
            
            return token_id, user_id
        except Exception:
            return None, None
    
    def extract_request_metadata(self, request: Request) -> Dict[str, Any]:
        """Extract metadata from HTTP request"""
        # Get client IP, handling proxy headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip_address = forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.client.host if request.client else None
        
        return {
            "ip_address": ip_address,
            "user_agent": request.headers.get("User-Agent"),
            "http_method": request.method,
            "endpoint": str(request.url.path),
            "request_id": request.headers.get("X-Request-ID") or str(uuid.uuid4())
        }
    
    async def log_action(
        self,
        action: str,
        action_category: str,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
        user_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        application_id: Optional[str] = None,
        session_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        step_id: Optional[str] = None,
        property_id: Optional[str] = None,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        changes: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        compliance_flags: Optional[ComplianceFlags] = None,
        immediate: bool = False
    ):
        """
        Log an audit entry
        
        Args:
            action: The action being performed
            action_category: Category of the action
            request: FastAPI request object (optional)
            response: FastAPI response object (optional)
            immediate: If True, write immediately instead of batching
            ... other audit fields
        """
        try:
            # Extract request metadata if available
            metadata = {}
            token_id = None
            
            if request:
                metadata = self.extract_request_metadata(request)
                token_id, extracted_user_id = self.extract_token_info(request)
                if not user_id and extracted_user_id:
                    user_id = extracted_user_id
                
                # Extract session ID from headers or cookies
                if not session_id:
                    session_id = request.headers.get("X-Session-ID") or \
                                request.cookies.get("session_id")
            
            # Build audit entry
            entry = AuditEntry(
                action=action,
                action_category=action_category,
                user_id=user_id,
                session_id=session_id,
                token_id=token_id,
                resource_type=resource_type,
                resource_id=resource_id,
                employee_id=employee_id,
                application_id=application_id,
                step_id=step_id,
                property_id=property_id,
                old_data=old_data,
                new_data=new_data,
                changes=changes,
                error_message=error_message,
                compliance_flags=compliance_flags.model_dump() if compliance_flags else None,
                response_status=response.status_code if response else None,
                **metadata
            )
            
            # Log immediately for critical actions or add to batch
            if immediate or action_category in [ActionCategory.SIGNATURE, ActionCategory.COMPLIANCE]:
                await self._write_entry(entry)
            else:
                await self._add_to_batch(entry)
                
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}")
    
    async def _add_to_batch(self, entry: AuditEntry):
        """Add entry to batch queue"""
        async with self._flush_lock:
            self._batch_queue.append(entry)
            
            # Flush if batch is full
            if len(self._batch_queue) >= self._batch_size:
                await self._flush_batch_internal()
    
    async def flush_batch(self):
        """Manually flush the batch queue"""
        async with self._flush_lock:
            await self._flush_batch_internal()
    
    async def _flush_batch_internal(self):
        """Internal method to flush batch (must be called with lock held)"""
        if not self._batch_queue:
            return
        
        try:
            # Convert entries to dict format for database
            # Exclude action_category as it doesn't exist in the database yet
            batch_data = [
                {k: v for k, v in entry.model_dump().items()
                 if v is not None and k != 'action_category'}
                for entry in self._batch_queue
            ]
            
            # Insert batch into database
            result = self.supabase_service.client.table("audit_logs").insert(batch_data).execute()
            
            if result.data:
                logger.info(f"Flushed {len(batch_data)} audit entries to database")
            
            # Clear the queue
            self._batch_queue.clear()
            self._last_flush = datetime.now(timezone.utc)
            
        except Exception as e:
            logger.error(f"Failed to flush audit batch: {e}")
            # Keep entries in queue for retry
    
    async def _write_entry(self, entry: AuditEntry):
        """Write a single audit entry immediately"""
        try:
            # Exclude action_category as it doesn't exist in the database yet
            entry_data = {k: v for k, v in entry.model_dump().items()
                         if v is not None and k != 'action_category'}
            result = self.supabase_service.client.table("audit_logs").insert(entry_data).execute()
            
            if result.data:
                logger.debug(f"Audit entry written: {entry.action}")
                
        except Exception as e:
            logger.error(f"Failed to write audit entry: {e}")
    
    # Convenience methods for common audit scenarios
    
    async def log_navigation(
        self,
        request: Request,
        employee_id: str,
        from_step: Optional[str],
        to_step: str,
        session_id: Optional[str] = None
    ):
        """Log navigation between onboarding steps"""
        await self.log_action(
            action=AuditAction.STEP_NAVIGATION,
            action_category=ActionCategory.NAVIGATION,
            request=request,
            employee_id=employee_id,
            session_id=session_id,
            old_data={"step": from_step} if from_step else None,
            new_data={"step": to_step},
            step_id=to_step
        )
    
    async def log_form_save(
        self,
        request: Request,
        employee_id: str,
        step_id: str,
        form_data: Dict[str, Any],
        session_id: Optional[str] = None,
        is_federal_form: bool = False
    ):
        """Log form save action with appropriate compliance flags"""
        compliance_flags = None
        if is_federal_form:
            compliance_flags = ComplianceFlags(
                federal_form=True,
                retention_required=True,
                pii_accessed=True
            )
            
            # Add specific form flags
            if "i9" in step_id.lower():
                compliance_flags.i9_section = 1 if "section1" in step_id.lower() else 2
            elif "w4" in step_id.lower() or "w-4" in step_id.lower():
                compliance_flags.w4_year = datetime.now().year
        
        # Remove sensitive data from form_data before logging
        sanitized_data = self._sanitize_form_data(form_data)
        
        await self.log_action(
            action=AuditAction.FORM_SAVE,
            action_category=ActionCategory.ONBOARDING,
            request=request,
            employee_id=employee_id,
            session_id=session_id,
            step_id=step_id,
            new_data=sanitized_data,
            compliance_flags=compliance_flags,
            immediate=is_federal_form  # Federal forms logged immediately
        )
    
    async def log_signature(
        self,
        request: Request,
        employee_id: str,
        document_type: str,
        signature_type: str,
        metadata: Dict[str, Any],
        session_id: Optional[str] = None
    ):
        """Log digital signature event with full compliance metadata"""
        compliance_flags = ComplianceFlags(
            federal_form="i9" in document_type.lower() or "w4" in document_type.lower(),
            signature_type=signature_type,
            document_type=document_type,
            retention_required=True
        )
        
        await self.log_action(
            action=AuditAction.SIGNATURE_ADDED,
            action_category=ActionCategory.SIGNATURE,
            request=request,
            employee_id=employee_id,
            session_id=session_id,
            resource_type="document",
            resource_id=document_type,
            new_data=metadata,
            compliance_flags=compliance_flags,
            immediate=True  # Signatures always logged immediately
        )
    
    def _sanitize_form_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from form data before logging"""
        if not data:
            return {}
        
        # List of sensitive fields to exclude or mask
        sensitive_fields = {
            "ssn", "social_security_number", "tax_id", "ein",
            "bank_account", "routing_number", "account_number",
            "password", "pin", "security_code"
        }
        
        sanitized = {}
        for key, value in data.items():
            key_lower = key.lower()
            
            # Check if field is sensitive
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                # Mask the value but indicate it was provided
                if value:
                    sanitized[key] = "***REDACTED***"
                else:
                    sanitized[key] = None
            else:
                # Include non-sensitive data
                sanitized[key] = value
        
        return sanitized
    
    async def query_audit_logs(
        self,
        employee_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        action_category: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Query audit logs with various filters"""
        try:
            query = self.supabase_service.client.table("audit_logs").select("*")
            
            if employee_id:
                query = query.eq("employee_id", employee_id)
            if user_id:
                query = query.eq("user_id", user_id)
            if action:
                query = query.eq("action", action)
            if action_category:
                query = query.eq("action_category", action_category)
            if start_date:
                query = query.gte("timestamp", start_date.isoformat())
            if end_date:
                query = query.lte("timestamp", end_date.isoformat())
            
            query = query.order("timestamp", desc=True).limit(limit)
            
            result = query.execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to query audit logs: {e}")
            return []


# Create singleton instance
audit_logger = AuditLogger()


# Context manager for audit logging within a request
@asynccontextmanager
async def audit_context(
    request: Request,
    action: str,
    action_category: str,
    **kwargs
):
    """Context manager for automatic audit logging with error handling"""
    start_time = datetime.now(timezone.utc)
    error_message = None
    response_status = 200
    
    try:
        yield
    except Exception as e:
        error_message = str(e)
        response_status = 500
        raise
    finally:
        # Log the action with timing information
        duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        
        if not kwargs.get("new_data"):
            kwargs["new_data"] = {}
        kwargs["new_data"]["duration_ms"] = duration_ms
        
        await audit_logger.log_action(
            action=action,
            action_category=action_category,
            request=request,
            error_message=error_message,
            response_status=response_status,
            **kwargs
        )