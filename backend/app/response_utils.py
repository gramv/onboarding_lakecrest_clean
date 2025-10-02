"""
Response Utilities for Standardized API Responses
Provides helper functions and middleware for consistent response formatting
"""
import uuid
import traceback
from typing import Any, Dict, List, Optional, Type, TypeVar, Union
from datetime import datetime
from fastapi import HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError as PydanticValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from .response_models import (
    APIResponse, APIError, SuccessResponse, MessageResponse, ListResponse,
    ValidationError, PaginationMeta, ErrorCode, T
)

# Type variable for generic response data
ResponseData = TypeVar('ResponseData')

class ResponseFormatter:
    """Utility class for formatting standardized API responses"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: Optional[str] = None,
        pagination: Optional[PaginationMeta] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a standardized success response"""
        response = {
            "success": True,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if message:
            response["message"] = message
        if pagination:
            response["pagination"] = pagination.dict()
        if request_id:
            response["request_id"] = request_id
            
        return response
    
    @staticmethod
    def error(
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        field_errors: Optional[Dict[str, List[str]]] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a standardized error response"""
        response = {
            "success": False,
            "error": message,
            "error_code": error_code.value,
            "status_code": status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if detail:
            response["detail"] = detail
        if details:
            response["details"] = details
        if field_errors:
            response["field_errors"] = field_errors
        if request_id:
            response["request_id"] = request_id
            
        return response
    
    @staticmethod
    def validation_error(
        errors: List[ValidationError],
        message: str = "Validation failed",
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a standardized validation error response"""
        field_errors = {}
        for error in errors:
            if error.field not in field_errors:
                field_errors[error.field] = []
            field_errors[error.field].append(error.message)
        
        return ResponseFormatter.error(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=422,
            detail="One or more fields failed validation",
            field_errors=field_errors,
            request_id=request_id
        )
    
    @staticmethod
    def paginated_list(
        items: List[Any],
        page: int,
        per_page: int,
        total_items: int,
        message: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a standardized paginated list response"""
        total_pages = (total_items + per_page - 1) // per_page
        
        pagination = PaginationMeta(
            page=page,
            per_page=per_page,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )
        
        return ResponseFormatter.success(
            data=items,
            message=message,
            pagination=pagination,
            request_id=request_id
        )

class ResponseMiddleware(BaseHTTPMiddleware):
    """Middleware to standardize all API responses and handle errors"""
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            return await self._handle_exception(exc, request_id)
    
    async def _handle_exception(self, exc: Exception, request_id: str) -> JSONResponse:
        """Handle exceptions and return standardized error responses"""
        
        if isinstance(exc, HTTPException):
            return self._handle_http_exception(exc, request_id)
        elif isinstance(exc, RequestValidationError):
            return self._handle_validation_error(exc, request_id)
        elif isinstance(exc, PydanticValidationError):
            return self._handle_pydantic_validation_error(exc, request_id)
        else:
            return self._handle_generic_exception(exc, request_id)
    
    def _handle_http_exception(self, exc: HTTPException, request_id: str) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        error_code_map = {
            400: ErrorCode.VALIDATION_ERROR,
            401: ErrorCode.AUTHENTICATION_ERROR,
            403: ErrorCode.AUTHORIZATION_ERROR,
            404: ErrorCode.RESOURCE_NOT_FOUND,
            409: ErrorCode.RESOURCE_CONFLICT,
            422: ErrorCode.VALIDATION_ERROR,
            429: ErrorCode.RATE_LIMIT_EXCEEDED,
            500: ErrorCode.INTERNAL_SERVER_ERROR
        }
        
        error_code = error_code_map.get(exc.status_code, ErrorCode.INTERNAL_SERVER_ERROR)
        
        error_response = ResponseFormatter.error(
            message=exc.detail,
            error_code=error_code,
            status_code=exc.status_code,
            detail=exc.detail,
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response
        )
    
    def _handle_validation_error(self, exc: RequestValidationError, request_id: str) -> JSONResponse:
        """Handle FastAPI request validation errors"""
        validation_errors = []
        field_errors = {}
        
        for error in exc.errors():
            field_name = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body' prefix
            error_msg = error["msg"]
            
            validation_errors.append(ValidationError(
                field=field_name,
                message=error_msg,
                code=error["type"]
            ))
            
            if field_name not in field_errors:
                field_errors[field_name] = []
            field_errors[field_name].append(error_msg)
        
        error_response = ResponseFormatter.error(
            message="Request validation failed",
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=422,
            detail="One or more request fields are invalid",
            field_errors=field_errors,
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=422,
            content=error_response
        )
    
    def _handle_pydantic_validation_error(self, exc: PydanticValidationError, request_id: str) -> JSONResponse:
        """Handle Pydantic model validation errors"""
        validation_errors = []
        field_errors = {}
        
        for error in exc.errors():
            field_name = ".".join(str(loc) for loc in error["loc"])
            error_msg = error["msg"]
            
            validation_errors.append(ValidationError(
                field=field_name,
                message=error_msg,
                code=error["type"]
            ))
            
            if field_name not in field_errors:
                field_errors[field_name] = []
            field_errors[field_name].append(error_msg)
        
        error_response = ResponseFormatter.error(
            message="Data validation failed",
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=422,
            detail="One or more data fields are invalid",
            field_errors=field_errors,
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=422,
            content=error_response
        )
    
    def _handle_generic_exception(self, exc: Exception, request_id: str) -> JSONResponse:
        """Handle unexpected exceptions"""
        # Log the full traceback for debugging
        error_trace = traceback.format_exc()
        print(f"Unhandled exception (Request ID: {request_id}): {error_trace}")
        
        error_response = ResponseFormatter.error(
            message="An internal server error occurred",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500,
            detail="Please contact support if this error persists",
            details={"request_id": request_id},
            request_id=request_id
        )
        
        return JSONResponse(
            status_code=500,
            content=error_response
        )

# Convenience functions for common response patterns
def success_response(
    data: Any = None,
    message: Optional[str] = None,
    status_code: int = 200
) -> JSONResponse:
    """Create a success JSON response"""
    content = ResponseFormatter.success(data=data, message=message)
    return JSONResponse(status_code=status_code, content=content)

def error_response(
    message: str,
    error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    status_code: int = 500,
    detail: Optional[str] = None
) -> JSONResponse:
    """Create an error JSON response"""
    content = ResponseFormatter.error(
        message=message,
        error_code=error_code,
        status_code=status_code,
        detail=detail
    )
    return JSONResponse(status_code=status_code, content=content)

def validation_error_response(
    errors: List[ValidationError],
    message: str = "Validation failed"
) -> JSONResponse:
    """Create a validation error JSON response"""
    content = ResponseFormatter.validation_error(errors=errors, message=message)
    return JSONResponse(status_code=422, content=content)

def not_found_response(message: str = "Resource not found") -> JSONResponse:
    """Create a 404 not found response"""
    return error_response(
        message=message,
        error_code=ErrorCode.RESOURCE_NOT_FOUND,
        status_code=404
    )

def unauthorized_response(message: str = "Authentication required") -> JSONResponse:
    """Create a 401 unauthorized response"""
    return error_response(
        message=message,
        error_code=ErrorCode.AUTHENTICATION_ERROR,
        status_code=401
    )

def forbidden_response(message: str = "Access denied") -> JSONResponse:
    """Create a 403 forbidden response"""
    return error_response(
        message=message,
        error_code=ErrorCode.AUTHORIZATION_ERROR,
        status_code=403
    )

def conflict_response(message: str = "Resource conflict") -> JSONResponse:
    """Create a 409 conflict response"""
    return error_response(
        message=message,
        error_code=ErrorCode.RESOURCE_CONFLICT,
        status_code=409
    )

# Decorator for automatic response wrapping
def standardize_response(func):
    """Decorator to automatically wrap endpoint responses in standard format"""
    async def wrapper(*args, **kwargs):
        try:
            result = await func(*args, **kwargs)
            
            # If result is already a JSONResponse, return as-is
            if isinstance(result, JSONResponse):
                return result
            
            # If result is a dict with 'success' key, assume it's already formatted
            if isinstance(result, dict) and 'success' in result:
                return JSONResponse(content=result)
            
            # Otherwise, wrap in success response
            return success_response(data=result)
            
        except HTTPException:
            # Let HTTPExceptions bubble up to be handled by middleware
            raise
        except Exception as e:
            # Convert unexpected exceptions to HTTPExceptions
            raise HTTPException(status_code=500, detail=str(e))
    
    return wrapper