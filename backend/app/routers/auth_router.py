"""
Authentication Router
Handles all authentication-related endpoints including login, logout, password reset, and user info
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import json
import os
import jwt
import logging
import secrets
import uuid

# Import audit logger
from ..audit_logger import audit_logger, AuditAction, ActionCategory

# Import models and authentication utilities
from ..models import User
from ..response_models import (
    LoginResponse, LoginResponseData, UserInfoResponse, UserInfoData,
    ErrorCode
)
from ..response_utils import error_response, success_response
from ..auth import (
    get_current_user, get_current_user_optional,
    require_manager_role, require_hr_role, require_hr_or_manager_role,
    OnboardingTokenManager, security
)
from fastapi.security import HTTPAuthorizationCredentials

# Import services
from ..supabase_service_enhanced import EnhancedSupabaseService
from ..email_service import email_service

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router with prefix
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Initialize Supabase service
supabase_service = EnhancedSupabaseService()

@router.post("/login", response_model=LoginResponse)
async def login(request: Request):
    """Login with Supabase user lookup"""
    try:
        # Try to parse JSON body with better error handling
        try:
            body = await request.json()
        except json.JSONDecodeError as json_err:
            logger.error(f"JSON parsing error in login: {json_err}")
            return error_response(
                message="Invalid request format",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400,
                detail="Request body must be valid JSON"
            )
        except Exception as parse_err:
            logger.error(f"Request parsing error in login: {parse_err}")
            return error_response(
                message="Invalid request",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400,
                detail="Unable to parse request body"
            )
        
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")
        
        if not email or not password:
            return error_response(
                message="Email and password are required",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400,
                detail="Both email and password fields must be provided"
            )
        
        # Find user in Supabase
        existing_user = supabase_service.get_user_by_email_sync(email)
        if not existing_user:
            # Log failed login attempt
            await audit_logger.log_action(
                action=AuditAction.LOGIN,
                action_category=ActionCategory.AUTHENTICATION,
                request=request,
                new_data={"email": email, "status": "failed", "reason": "user_not_found"},
                error_message="User not found"
            )
            return error_response(
                message="Invalid credentials",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail="Email or password is incorrect"
            )
        
        # Verify password from Supabase stored hash
        if not existing_user.password_hash:
            return error_response(
                message="Invalid credentials",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail="Account not properly configured"
            )
        
        # Use the enhanced supabase service password verification
        if not supabase_service.verify_password(password, existing_user.password_hash):
            return error_response(
                message="Invalid credentials",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail="Email or password is incorrect"
            )
        
        property_ids: Optional[List[str]] = None

        # Generate token
        if existing_user.role == "manager":
            # Get manager properties from property_managers table (single source of truth)
            manager_properties = supabase_service.get_manager_properties_sync(existing_user.id)
            if not manager_properties:
                return error_response(
                    message="Manager not configured",
                    error_code=ErrorCode.AUTHORIZATION_ERROR,
                    status_code=403,
                    detail="Manager account is not assigned to any property"
                )

            # Extract property IDs from property_managers table
            property_ids = [prop.id for prop in manager_properties if getattr(prop, "id", None)]
            if not property_ids:
                return error_response(
                    message="Manager not configured",
                    error_code=ErrorCode.AUTHORIZATION_ERROR,
                    status_code=403,
                    detail="Manager account has no valid property assignments"
                )

            # Use first property as primary (for backward compatibility)
            primary_property_id = property_ids[0]

            expire = datetime.now(timezone.utc) + timedelta(hours=24)

            payload = {
                "sub": existing_user.id,  # Standard JWT field for subject (user ID)
                "role": existing_user.role,
                "property_id": primary_property_id,
                "property_ids": property_ids,
                "token_type": "manager_auth",
                "exp": expire
            }
            token = jwt.encode(payload, os.getenv("JWT_SECRET_KEY", "fallback-secret"), algorithm="HS256")
            token_type = "manager_auth"

        elif existing_user.role == "hr":
            expire = datetime.now(timezone.utc) + timedelta(hours=24)
            payload = {
                "sub": existing_user.id,  # Standard JWT field for subject (user ID)
                "role": existing_user.role,
                "token_type": "hr_auth",
                "exp": expire
            }
            token = jwt.encode(payload, os.getenv("JWT_SECRET_KEY", "fallback-secret"), algorithm="HS256")
            token_type = "hr_auth"
        else:
            return error_response(
                message="Role not authorized",
                error_code=ErrorCode.AUTHORIZATION_ERROR,
                status_code=403,
                detail=f"Role '{existing_user.role}' is not authorized for login"
            )
        
        # Prepare user data for response
        user_data = {
            "id": existing_user.id,
            "email": existing_user.email,
            "role": existing_user.role,
            "first_name": existing_user.first_name,
            "last_name": existing_user.last_name,
        }

        # For managers, use property_managers table data instead of users.property_id
        if existing_user.role == "manager":
            user_data["property_id"] = primary_property_id
            user_data["property_ids"] = property_ids
        else:
            user_data["property_id"] = None
            user_data["property_ids"] = None

        login_data = LoginResponseData(
            token=token,
            user=user_data,
            expires_at=expire.isoformat(),
            token_type="Bearer"
        )
        
        # Log successful login
        await audit_logger.log_action(
            action=AuditAction.LOGIN,
            action_category=ActionCategory.AUTHENTICATION,
            request=request,
            user_id=existing_user.id,
            new_data={
                "email": email,
                "role": existing_user.role,
                "status": "success",
                "token_type": token_type,
                "expires_at": expire.isoformat()
            }
        )
        
        return success_response(
            data=login_data.model_dump(),
            message="Login successful"
        )
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return error_response(
            message="Login failed",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500,
            detail="An unexpected error occurred during login"
        )

@router.post("/refresh-token")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Refresh JWT token before it expires
    Preserves session data and supports all token types (onboarding, manager, hr)
    """
    try:
        if not credentials:
            return error_response(
                message="No authorization token provided",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail="Bearer token required"
            )
        
        current_token = credentials.credentials
        
        # Use the OnboardingTokenManager to refresh the token
        try:
            refresh_result = OnboardingTokenManager.refresh_token(current_token)
            
            # If token wasn't refreshed (still has > 1 day validity)
            if not refresh_result.get("refreshed", False):
                return success_response(
                    data={
                        "token": refresh_result["token"],
                        "expires_at": refresh_result["expires_at"].isoformat(),
                        "refreshed": False,
                        "message": refresh_result.get("message", "Token still valid")
                    },
                    message="Token still has sufficient validity"
                )
            
            # Token was successfully refreshed
            refresh_data = {
                "token": refresh_result["token"],
                "expires_at": refresh_result["expires_at"].isoformat(),
                "token_type": "Bearer",
                "refreshed": True,
                "expires_in_hours": refresh_result.get("expires_in_hours", 168)
            }
            
            # Log token refresh
            await audit_logger.log_action(
                action=AuditAction.TOKEN_REFRESH,
                action_category=ActionCategory.AUTHENTICATION,
                request=request,
                new_data={
                    "refreshed": True,
                    "old_token_id": refresh_result.get("old_token_id"),
                    "new_token_id": refresh_result.get("token_id"),
                    "expires_at": refresh_result["expires_at"].isoformat()
                }
            )
            
            return success_response(
                data=refresh_data,
                message="Token refreshed successfully"
            )
            
        except jwt.ExpiredSignatureError:
            return error_response(
                message="Token has expired",
                error_code=ErrorCode.TOKEN_EXPIRED,
                status_code=401,
                detail="Token has already expired and cannot be refreshed. Please login again."
            )
        except jwt.InvalidTokenError as e:
            return error_response(
                message="Invalid token",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401,
                detail=str(e)
            )
            
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return error_response(
            message="Token refresh failed",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500,
            detail="An unexpected error occurred during token refresh"
        )

@router.post("/refresh")
async def refresh_token_legacy(current_user: User = Depends(get_current_user)):
    """
    Legacy refresh endpoint - kept for backward compatibility
    Redirects to new /refresh-token endpoint
    """
    logger.warning("Legacy /refresh endpoint used - please update to /refresh-token")
    # This endpoint still works but is deprecated
    return error_response(
        message="This endpoint is deprecated. Please use /api/auth/refresh-token",
        error_code=ErrorCode.DEPRECATED,
        status_code=410,
        detail="Update your client to use the new refresh-token endpoint"
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user (token invalidation handled client-side)"""
    return success_response(
        message="Logged out successfully"
    )

@router.post("/request-password-reset")
async def request_password_reset(request: Request):
    """Request password reset email"""
    try:
        body = await request.json()
        email = body.get("email", "").strip().lower()
        
        if not email:
            return error_response(
                message="Email is required",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Find user in Supabase
        user = supabase_service.get_user_by_email_sync(email)
        
        # Always return success to prevent email enumeration
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return success_response(
                message="If an account exists with this email, you will receive a password reset link."
            )
        
        # Check if user is manager or HR (not employees)
        if user.role not in ["manager", "hr"]:
            logger.info(f"Password reset attempted for non-authorized role: {user.role}")
            return success_response(
                message="If an account exists with this email, you will receive a password reset link."
            )
        
        # Check rate limiting
        rate_limit_ok = supabase_service.check_password_reset_rate_limit_sync(user.id)
        if not rate_limit_ok:
            logger.warning(f"Rate limit exceeded for password reset: {user.id}")
            return error_response(
                message="Too many password reset attempts. Please try again later.",
                error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
                status_code=429
            )
        
        # Generate secure token
        reset_token = f"{uuid.uuid4()}-{secrets.token_urlsafe(32)}"
        
        # Store token in database with 1-hour expiration
        token_data = {
            "user_id": user.id,
            "token": reset_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        }
        
        result = supabase_service.client.table("password_reset_tokens").insert(token_data).execute()
        if not result.data:
            logger.error(f"Failed to create password reset token for user: {user.id}")
            return error_response(
                message="Failed to process password reset request",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                status_code=500
            )
        
        # Send password reset email
        user_name = f"{user.first_name} {user.last_name}".strip() or user.email
        email_sent = await email_service.send_password_reset_email(
            email=user.email,
            reset_token=reset_token,
            user_name=user_name
        )
        
        if not email_sent:
            # Delete token if email failed
            supabase_service.client.table("password_reset_tokens").delete().eq("token", reset_token).execute()
            return error_response(
                message="Failed to send password reset email",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                status_code=500
            )
        
        return success_response(
            message="If an account exists with this email, you will receive a password reset link."
        )
        
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        return error_response(
            message="Failed to process password reset request",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )

@router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    try:
        if not token:
            return error_response(
                message="Token is required",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Check token in database
        result = supabase_service.client.table("password_reset_tokens").select("*").eq("token", token).eq("used", False).execute()
        
        if not result.data or len(result.data) == 0:
            return error_response(
                message="Invalid or expired token",
                error_code=ErrorCode.INVALID_TOKEN,
                status_code=400
            )
        
        token_data = result.data[0]
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            return error_response(
                message="Token has expired",
                error_code=ErrorCode.TOKEN_EXPIRED,
                status_code=400
            )
        
        return success_response(
            data={"valid": True},
            message="Token is valid"
        )
        
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        return error_response(
            message="Failed to verify token",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )

@router.post("/reset-password")
async def reset_password(request: Request):
    """Reset password using token"""
    try:
        body = await request.json()
        token = body.get("token", "")
        new_password = body.get("password", "")
        
        if not token or not new_password:
            return error_response(
                message="Token and password are required",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Validate password strength
        if len(new_password) < 8:
            return error_response(
                message="Password must be at least 8 characters long",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Check token in database
        result = supabase_service.client.table("password_reset_tokens").select("*").eq("token", token).eq("used", False).execute()
        
        if not result.data or len(result.data) == 0:
            return error_response(
                message="Invalid or expired token",
                error_code=ErrorCode.INVALID_TOKEN,
                status_code=400
            )
        
        token_data = result.data[0]
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            return error_response(
                message="Token has expired",
                error_code=ErrorCode.TOKEN_EXPIRED,
                status_code=400
            )
        
        # Hash new password
        hashed_password = supabase_service.hash_password(new_password)
        
        # Update user's password
        user_result = supabase_service.client.table("users").update({
            "password_hash": hashed_password,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", token_data['user_id']).execute()
        
        if not user_result.data:
            logger.error(f"Failed to update password for user: {token_data['user_id']}")
            return error_response(
                message="Failed to reset password",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                status_code=500
            )
        
        # Mark token as used
        supabase_service.client.table("password_reset_tokens").update({
            "used": True,
            "used_at": datetime.now(timezone.utc).isoformat()
        }).eq("token", token).execute()
        
        # Store password in history for audit
        try:
            supabase_service.client.table("password_history").insert({
                "user_id": token_data['user_id'],
                "password_hash": hashed_password
            }).execute()
        except Exception as e:
            # Log but don't fail if password_history tracking fails
            logger.warning(f"Failed to store password history: {e}")
        
        # Get user details for email
        user = supabase_service.get_user_by_id_sync(token_data['user_id'])
        if user:
            user_name = f"{user.first_name} {user.last_name}".strip() or user.email
            # Send confirmation email
            await email_service.send_password_change_confirmation(
                email=user.email,
                user_name=user_name
            )
        
        return success_response(
            message="Password has been reset successfully"
        )
        
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        return error_response(
            message="Failed to reset password",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )

@router.post("/change-password")
async def change_password(request: Request, current_user: User = Depends(get_current_user)):
    """Change password for logged-in user"""
    try:
        body = await request.json()
        current_password = body.get("current_password", "")
        new_password = body.get("new_password", "")
        
        if not current_password or not new_password:
            return error_response(
                message="Current password and new password are required",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Validate new password strength
        if len(new_password) < 8:
            return error_response(
                message="Password must be at least 8 characters long",
                error_code=ErrorCode.VALIDATION_ERROR,
                status_code=400
            )
        
        # Get current user's password hash
        user = supabase_service.get_user_by_id_sync(current_user.id)
        if not user or not user.password_hash:
            return error_response(
                message="User not found",
                error_code=ErrorCode.NOT_FOUND,
                status_code=404
            )
        
        # Verify current password
        if not supabase_service.verify_password(current_password, user.password_hash):
            return error_response(
                message="Current password is incorrect",
                error_code=ErrorCode.AUTHENTICATION_ERROR,
                status_code=401
            )
        
        # Hash new password
        hashed_password = supabase_service.hash_password(new_password)
        
        # Update password
        result = supabase_service.client.table("users").update({
            "password_hash": hashed_password,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", current_user.id).execute()
        
        if not result.data:
            return error_response(
                message="Failed to update password",
                error_code=ErrorCode.INTERNAL_SERVER_ERROR,
                status_code=500
            )
        
        # Store password in history for audit
        try:
            supabase_service.client.table("password_history").insert({
                "user_id": current_user.id,
                "password_hash": hashed_password
            }).execute()
        except Exception as e:
            # Log but don't fail if password_history tracking fails
            logger.warning(f"Failed to store password history: {e}")
        
        # Send confirmation email
        user_name = f"{user.first_name} {user.last_name}".strip() or user.email
        await email_service.send_password_change_confirmation(
            email=user.email,
            user_name=user_name
        )
        
        return success_response(
            message="Password changed successfully"
        )
        
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return error_response(
            message="Failed to change password",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )

@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information with enhanced property resolution"""
    try:
        # Get fresh user data from Supabase
        user = supabase_service.get_user_by_id_sync(current_user.id)
        if not user:
            return error_response(
                message="User not found",
                error_code=ErrorCode.NOT_FOUND,
                status_code=404
            )

        # Log user data for debugging
        logger.info(f"[/me] User data fetched: {user.email}, role: {user.role}, property_id: {getattr(user, 'property_id', 'None')}")

        user_data = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None
        }

        # Enhanced property resolution for managers using property_managers table
        if user.role == "manager":
            try:
                # Get manager properties from property_managers table (single source of truth)
                manager_properties = supabase_service.get_manager_properties_sync(user.id)

                if manager_properties:
                    # Extract property IDs
                    property_ids = [prop.id for prop in manager_properties if getattr(prop, "id", None)]

                    if property_ids:
                        # Use first property as primary (for backward compatibility)
                        primary_property_id = property_ids[0]
                        user_data["property_id"] = primary_property_id
                        user_data["property_ids"] = property_ids

                        # Get property details for primary property
                        property_data = supabase_service.get_property_by_id_sync(primary_property_id)
                        if property_data:
                            # Handle both dict and object cases
                            if isinstance(property_data, dict):
                                user_data["property_name"] = property_data.get("name")
                                property_name = property_data.get('name')
                            else:
                                user_data["property_name"] = getattr(property_data, 'name', None)
                                property_name = getattr(property_data, 'name', None)
                            logger.info(f"[/me] Manager {user.email} assigned to property: {property_name}")
                    else:
                        logger.warning(f"[/me] Manager {user.email} has property_managers entries but no valid property IDs")
                        user_data["property_id"] = None
                        user_data["property_ids"] = []
                else:
                    logger.warning(f"[/me] Manager {user.email} has no property assignments in property_managers table")
                    user_data["property_id"] = None
                    user_data["property_ids"] = []

            except Exception as e:
                logger.error(f"[/me] Error getting manager properties: {e}")
                user_data["property_id"] = None
                user_data["property_ids"] = []
        
        return success_response(
            data=user_data,
            message="User information retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        return error_response(
            message="Failed to retrieve user information",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )


# Legacy endpoint - for backward compatibility
# This will be removed in Phase 4 after verifying the new router works
@router.post("/login", response_model=LoginResponse, include_in_schema=False)
async def legacy_login(request: Request):
    """Legacy login endpoint (duplicate for backward compatibility)"""
    return await login(request)
