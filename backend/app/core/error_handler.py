"""
Centralized Error Handler
Provides consistent error handling and logging across the application
Phase 3: Error Handling Standardization
"""

import logging
import traceback
from typing import Optional, Dict, Any, Union
from datetime import datetime
from functools import wraps
import asyncio

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, DataError
import jwt

from ..response_utils import error_response, ErrorCode

logger = logging.getLogger(__name__)


class ErrorContext:
    """Context information for error tracking"""
    
    def __init__(self, request: Optional[Request] = None):
        self.request = request
        self.timestamp = datetime.utcnow()
        self.request_id = None
        self.user_id = None
        self.property_id = None
        
        if request:
            self.request_id = request.headers.get("X-Request-ID")
            # Extract user info from JWT if available
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                try:
                    token = auth_header.replace("Bearer ", "")
                    # Decode without verification just to get user info for logging
                    payload = jwt.decode(token, options={"verify_signature": False})
                    self.user_id = payload.get("user_id") or payload.get("employee_id")
                except:
                    pass
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for logging"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "request_id": self.request_id,
            "user_id": self.user_id,
            "property_id": self.property_id
        }


class CentralizedErrorHandler:
    """
    Centralized error handling for consistent responses and logging
    """
    
    def __init__(self):
        self.error_counts = {}
        self.last_errors = {}
        self.suppressed_errors = set()
    
    # ==========================================
    # Database Error Handlers
    # ==========================================
    
    def handle_database_error(
        self, 
        error: Exception, 
        context: Optional[ErrorContext] = None,
        operation: str = "database operation"
    ) -> JSONResponse:
        """Handle database-related errors"""
        
        error_id = self._generate_error_id()
        
        # Log the full error with context
        logger.error(
            f"Database error during {operation}",
            extra={
                "error_id": error_id,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "operation": operation,
                "context": context.to_dict() if context else {},
                "traceback": traceback.format_exc()
            }
        )
        
        # Determine specific error response based on exception type
        if isinstance(error, IntegrityError):
            # Handle constraint violations
            if "duplicate key" in str(error).lower():
                return error_response(
                    message="A record with this information already exists",
                    error_code=ErrorCode.RESOURCE_CONFLICT,
                    status_code=409,
                    detail={"error_id": error_id}
                )
            elif "foreign key" in str(error).lower():
                return error_response(
                    message="Related record not found",
                    error_code=ErrorCode.VALIDATION_ERROR,
                    status_code=400,
                    detail={"error_id": error_id}
                )
        
        elif isinstance(error, DataError):
            return error_response(
                message="Invalid data format provided",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400,
                detail={"error_id": error_id}
            )
        
        # Generic database error
        return error_response(
            message=f"Database {operation} failed",
            error_code=ErrorCode.DATABASE_ERROR,
            status_code=500,
            detail={
                "error_id": error_id,
                "hint": "Please try again later or contact support if the issue persists"
            }
        )
    
    # ==========================================
    # Authentication/Authorization Error Handlers
    # ==========================================
    
    def handle_auth_error(
        self,
        error: Exception,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle authentication and authorization errors"""
        
        error_id = self._generate_error_id()
        
        logger.warning(
            "Authentication/Authorization error",
            extra={
                "error_id": error_id,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.to_dict() if context else {}
            }
        )
        
        if isinstance(error, jwt.ExpiredSignatureError):
            return error_response(
                message="Session has expired. Please log in again",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail={"error_id": error_id, "error_type": "token_expired"}
            )
        
        elif isinstance(error, jwt.InvalidTokenError):
            return error_response(
                message="Invalid authentication token",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail={"error_id": error_id, "error_type": "invalid_token"}
            )
        
        elif "permission" in str(error).lower() or "access denied" in str(error).lower():
            return error_response(
                message="You don't have permission to access this resource",
                error_code=ErrorCode.AUTHORIZATION_ERROR,
                status_code=403,
                detail={"error_id": error_id}
            )
        
        # Generic auth error
        return error_response(
            message="Authentication failed",
            error_code=ErrorCode.AUTHENTICATION_ERROR,
            status_code=401,
            detail={"error_id": error_id}
        )
    
    # ==========================================
    # Validation Error Handlers
    # ==========================================
    
    def handle_validation_error(
        self,
        error: Union[ValidationError, ValueError],
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle validation errors"""
        
        error_id = self._generate_error_id()
        
        logger.info(
            "Validation error",
            extra={
                "error_id": error_id,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.to_dict() if context else {}
            }
        )
        
        # Parse Pydantic validation errors
        if isinstance(error, ValidationError):
            field_errors = {}
            for err in error.errors():
                field = ".".join(str(x) for x in err["loc"])
                if field not in field_errors:
                    field_errors[field] = []
                field_errors[field].append(err["msg"])
            
            return error_response(
                message="Validation failed",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=422,
                detail={
                    "error_id": error_id,
                    "field_errors": field_errors
                }
            )
        
        # Generic validation error
        return error_response(
            message=str(error),
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=400,
            detail={"error_id": error_id}
        )
    
    # ==========================================
    # External Service Error Handlers
    # ==========================================
    
    def handle_external_service_error(
        self,
        error: Exception,
        service_name: str,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle errors from external services (Supabase, email, etc)"""
        
        error_id = self._generate_error_id()
        
        logger.error(
            f"External service error: {service_name}",
            extra={
                "error_id": error_id,
                "service": service_name,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.to_dict() if context else {},
                "traceback": traceback.format_exc()
            }
        )
        
        # Don't expose service details to users
        return error_response(
            message=f"Service temporarily unavailable",
            error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            status_code=503,
            detail={
                "error_id": error_id,
                "retry_after": 60,  # Suggest retry after 60 seconds
                "hint": "Please try again in a moment"
            }
        )
    
    # ==========================================
    # Property Access Error Handlers
    # ==========================================
    
    def handle_property_access_error(
        self,
        user_id: str,
        property_id: str,
        action: str,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle property-based access control errors"""
        
        error_id = self._generate_error_id()
        
        logger.warning(
            f"Property access denied",
            extra={
                "error_id": error_id,
                "user_id": user_id,
                "property_id": property_id,
                "action": action,
                "context": context.to_dict() if context else {}
            }
        )
        
        return error_response(
            message="You don't have access to this property's data",
            error_code=ErrorCode.AUTHORIZATION_ERROR,
            status_code=403,
            detail={
                "error_id": error_id,
                "property_id": property_id
            }
        )
    
    # ==========================================
    # Federal Compliance Error Handlers
    # ==========================================
    
    def handle_compliance_error(
        self,
        error: Exception,
        form_type: str,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle federal compliance-related errors"""
        
        error_id = self._generate_error_id()
        
        # Compliance errors are critical - always log at ERROR level
        logger.error(
            f"Federal compliance error for {form_type}",
            extra={
                "error_id": error_id,
                "form_type": form_type,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.to_dict() if context else {},
                "traceback": traceback.format_exc()
            }
        )
        
        # Compliance-specific messages
        compliance_messages = {
            "i9": "I-9 form validation failed. Please ensure all required fields are completed according to federal guidelines.",
            "w4": "W-4 form validation failed. Please verify your tax withholding information.",
            "deadline": "Federal compliance deadline has passed for this action."
        }
        
        message = compliance_messages.get(
            form_type.lower(),
            "Federal compliance validation failed"
        )
        
        return error_response(
            message=message,
            error_code=ErrorCode.COMPLIANCE_ERROR,
            status_code=422,
            detail={
                "error_id": error_id,
                "form_type": form_type,
                "compliance_link": "https://www.uscis.gov/i-9" if "i9" in form_type.lower() else None
            }
        )
    
    # ==========================================
    # Generic Error Handler
    # ==========================================
    
    def handle_unexpected_error(
        self,
        error: Exception,
        context: Optional[ErrorContext] = None
    ) -> JSONResponse:
        """Handle unexpected errors"""
        
        error_id = self._generate_error_id()
        
        # Log at ERROR level with full traceback
        logger.error(
            "Unexpected error occurred",
            extra={
                "error_id": error_id,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context.to_dict() if context else {},
                "traceback": traceback.format_exc()
            }
        )
        
        # Don't expose internal errors to users
        return error_response(
            message="An unexpected error occurred",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500,
            detail={
                "error_id": error_id,
                "hint": "Please try again. If the problem persists, contact support with the error ID."
            }
        )
    
    # ==========================================
    # Decorator for Automatic Error Handling
    # ==========================================
    
    def handle_errors(self, operation: str = "operation"):
        """
        Decorator to automatically handle errors in endpoint functions
        
        Usage:
            @error_handler.handle_errors("get user profile")
            async def get_user_profile(...):
                # endpoint code
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    # Extract request if available
                    request = None
                    for arg in args:
                        if isinstance(arg, Request):
                            request = arg
                            break
                    for key, value in kwargs.items():
                        if isinstance(value, Request):
                            request = value
                            break
                    
                    context = ErrorContext(request)
                    
                    # Execute the function
                    if asyncio.iscoroutinefunction(func):
                        result = await func(*args, **kwargs)
                    else:
                        result = func(*args, **kwargs)
                    
                    return result
                    
                except HTTPException:
                    # Re-raise FastAPI HTTP exceptions
                    raise
                    
                except (IntegrityError, DataError, SQLAlchemyError) as e:
                    return self.handle_database_error(e, context, operation)
                    
                except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
                    return self.handle_auth_error(e, context)
                    
                except (ValidationError, ValueError) as e:
                    return self.handle_validation_error(e, context)
                    
                except Exception as e:
                    return self.handle_unexpected_error(e, context)
            
            return wrapper
        return decorator
    
    # ==========================================
    # Utility Methods
    # ==========================================
    
    def _generate_error_id(self) -> str:
        """Generate unique error ID for tracking"""
        import uuid
        return f"ERR-{uuid.uuid4().hex[:8].upper()}"
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics for monitoring"""
        return {
            "error_counts": self.error_counts,
            "last_errors": self.last_errors,
            "suppressed_count": len(self.suppressed_errors)
        }
    
    def suppress_error(self, error_pattern: str):
        """Suppress specific error patterns from logging"""
        self.suppressed_errors.add(error_pattern)
    
    def clear_suppression(self):
        """Clear all error suppressions"""
        self.suppressed_errors.clear()


# Global error handler instance
error_handler = CentralizedErrorHandler()


# ==========================================
# Utility Functions
# ==========================================

def log_error_with_context(
    error: Exception,
    operation: str,
    **extra_context
) -> str:
    """
    Log error with additional context and return error ID
    """
    error_id = f"ERR-{datetime.utcnow().timestamp()}"
    
    logger.error(
        f"Error during {operation}",
        extra={
            "error_id": error_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "operation": operation,
            **extra_context
        }
    )
    
    return error_id