"""
Standardized API Response Models for Backend-Frontend Integration
Implements consistent response formats across all endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union, Generic, TypeVar
from datetime import datetime
from enum import Enum

# Generic type for response data
T = TypeVar('T')

class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"

class ErrorCode(str, Enum):
    # Authentication errors
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"
    
    # Resource errors
    NOT_FOUND = "NOT_FOUND"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Business logic errors
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    
    # System errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    PROCESSING_ERROR = "PROCESSING_ERROR"
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # API versioning
    DEPRECATED = "DEPRECATED"

class ValidationError(BaseModel):
    """Individual field validation error"""
    field: str = Field(..., description="Field name that failed validation")
    message: str = Field(..., description="Human-readable error message")
    code: Optional[str] = Field(None, description="Machine-readable error code")
    value: Optional[Any] = Field(None, description="The invalid value that was provided")

class PaginationMeta(BaseModel):
    """Pagination metadata for list responses"""
    page: int = Field(..., description="Current page number (1-based)")
    per_page: int = Field(..., description="Number of items per page")
    total_items: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

class APIResponse(BaseModel, Generic[T]):
    """Standardized API response wrapper"""
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    message: Optional[str] = Field(None, description="Human-readable message")
    error: Optional[str] = Field(None, description="Error message for failed requests")
    error_code: Optional[ErrorCode] = Field(None, description="Machine-readable error code")
    errors: Optional[List[ValidationError]] = Field(None, description="List of validation errors")
    pagination: Optional[PaginationMeta] = Field(None, description="Pagination metadata for list responses")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    request_id: Optional[str] = Field(None, description="Unique request identifier for tracing")

class APIError(BaseModel):
    """Standardized error response"""
    success: bool = Field(False, description="Always false for error responses")
    error: str = Field(..., description="Human-readable error message")
    error_code: ErrorCode = Field(..., description="Machine-readable error code")
    detail: Optional[str] = Field(None, description="Detailed error information")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error context")
    field_errors: Optional[Dict[str, List[str]]] = Field(None, description="Field-specific validation errors")
    status_code: int = Field(..., description="HTTP status code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Unique request identifier for tracing")

# Success response helpers
class SuccessResponse(APIResponse[T]):
    """Success response with data"""
    success: bool = Field(True, description="Always true for success responses")

class MessageResponse(APIResponse[None]):
    """Success response with just a message"""
    success: bool = Field(True, description="Always true for success responses")
    data: None = Field(None, description="No data for message-only responses")

class ListResponse(APIResponse[List[T]]):
    """Success response for list data with pagination"""
    success: bool = Field(True, description="Always true for success responses")

# Authentication response models
class LoginResponseData(BaseModel):
    """Login response data structure"""
    token: str = Field(..., description="JWT authentication token")
    refresh_token: Optional[str] = Field(None, description="Refresh token for token renewal")
    user: Dict[str, Any] = Field(..., description="User information")
    expires_at: str = Field(..., description="Token expiration timestamp")
    token_type: str = Field("Bearer", description="Token type")

class UserInfoData(BaseModel):
    """User information data structure"""
    id: str
    email: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    property_id: Optional[str] = None

# Dashboard response models
class DashboardStatsData(BaseModel):
    """Dashboard statistics data structure"""
    totalProperties: Optional[int] = None
    totalManagers: Optional[int] = None
    totalEmployees: Optional[int] = None
    pendingApplications: Optional[int] = None
    approvedApplications: Optional[int] = None
    totalApplications: Optional[int] = None
    activeEmployees: Optional[int] = None
    onboardingInProgress: Optional[int] = None

class PropertyData(BaseModel):
    """Property data structure"""
    id: str
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: Optional[str] = None
    manager_ids: List[str] = []
    qr_code_url: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

class ApplicationData(BaseModel):
    """Application data structure"""
    id: str
    property_id: str
    property_name: Optional[str] = None
    department: str
    position: str
    applicant_data: Dict[str, Any]
    status: str
    applied_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class EmployeeData(BaseModel):
    """Employee data structure"""
    id: str
    property_id: str
    department: str
    position: str
    hire_date: Optional[str] = None
    pay_rate: Optional[float] = None
    employment_type: str
    employment_status: str
    onboarding_status: str

class ManagerData(BaseModel):
    """Manager data structure"""
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None

# Health check response
class HealthCheckData(BaseModel):
    """Health check response data"""
    status: str
    timestamp: datetime
    version: str
    database: str
    connection: Optional[Dict[str, Any]] = None
    services: Optional[Dict[str, str]] = None

# WebSocket related models
class WebSocketStatsData(BaseModel):
    """WebSocket connection statistics"""
    total_connections: int = Field(..., description="Total connections since start")
    active_connections: int = Field(..., description="Currently active connections")
    active_rooms: int = Field(..., description="Number of active rooms")
    messages_sent: int = Field(..., description="Total messages sent")
    events_broadcasted: int = Field(..., description="Total events broadcasted")
    connection_errors: int = Field(..., description="Number of connection errors")
    room_details: Dict[str, int] = Field(default_factory=dict, description="Room member counts")

class WebSocketRoomInfo(BaseModel):
    """WebSocket room information"""
    room_id: str = Field(..., description="Room identifier")
    member_count: int = Field(..., description="Number of members in room")
    members: List[str] = Field(default_factory=list, description="List of member user IDs")
    created_at: str = Field(..., description="Room creation timestamp")

class WebSocketRoomsData(BaseModel):
    """WebSocket rooms list"""
    rooms: List[WebSocketRoomInfo] = Field(default_factory=list, description="List of active rooms")

class WebSocketBroadcastRequest(BaseModel):
    """Request model for broadcasting WebSocket events"""
    event_type: str = Field(..., description="Type of event to broadcast")
    data: Dict[str, Any] = Field(..., description="Event data payload")
    target_rooms: Optional[List[str]] = Field(None, description="Specific rooms to target")
    target_users: Optional[List[str]] = Field(None, description="Specific users to target")

class WebSocketUserNotificationRequest(BaseModel):
    """Request model for user-specific notifications"""
    user_id: str = Field(..., description="ID of the user to notify")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    severity: str = Field(default="info", description="Notification severity")
    action_url: Optional[str] = Field(None, description="Optional action URL")

# Common response type aliases for better type hints
LoginResponse = APIResponse[LoginResponseData]
UserInfoResponse = APIResponse[UserInfoData]
DashboardStatsResponse = APIResponse[DashboardStatsData]
PropertyResponse = APIResponse[PropertyData]
PropertiesResponse = APIResponse[List[PropertyData]]
ApplicationResponse = APIResponse[ApplicationData]
ApplicationsResponse = APIResponse[List[ApplicationData]]
EmployeeResponse = APIResponse[EmployeeData]
EmployeesResponse = APIResponse[List[EmployeeData]]
ManagerResponse = APIResponse[ManagerData]
ManagersResponse = APIResponse[List[ManagerData]]
HealthResponse = APIResponse[HealthCheckData]

# WebSocket response type aliases
WebSocketStatsResponse = APIResponse[WebSocketStatsData]
WebSocketRoomsResponse = APIResponse[WebSocketRoomsData]
