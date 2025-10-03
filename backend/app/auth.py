"""
Authentication and token management for the onboarding system
"""
import jwt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from passlib.context import CryptContext
import os
import logging
from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Load from main .env file, not .env.test
load_dotenv()

# Import User model and supabase service (avoiding circular imports)
from .models import User

# Configure logging
logger = logging.getLogger(__name__)

# HTTP Bearer security scheme with auto_error=False to allow optional authentication
security = HTTPBearer(auto_error=False)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
# IMPORTANT: Must use a stable secret key for tokens to validate correctly
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    # Check if we're in development mode
    if os.getenv("ENVIRONMENT", "").lower() in ["dev", "development", "local"]:
        # Only allow development secret in explicitly development environments
        JWT_SECRET_KEY = "development-secret-key-do-not-use-in-production-must-be-32-chars"
        logger.warning("JWT_SECRET_KEY not set in environment, using development default (ONLY for development)")
    else:
        # Fail fast in production to prevent security vulnerabilities
        error_msg = "CRITICAL: JWT_SECRET_KEY must be set in environment variables for production"
        logger.error(error_msg)
        raise EnvironmentError(error_msg)

JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "168"))  # 7 days default

class OnboardingTokenManager:
    """Manages secure onboarding tokens with JWT"""
    
    @staticmethod
    def create_onboarding_token(
        employee_id: str,
        application_id: Optional[str] = None,
        expires_hours: int = JWT_ACCESS_TOKEN_EXPIRE_HOURS
    ) -> Dict[str, Any]:
        """
        Create a secure onboarding token for an employee
        
        Args:
            employee_id: The employee's ID
            application_id: Optional application ID if coming from job application
            expires_hours: Token expiration in hours
            
        Returns:
            Dictionary containing token and expiration info
        """
        expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
        
        # Create payload with necessary information
        payload = {
            "employee_id": employee_id,
            "application_id": application_id,
            "token_type": "onboarding",
            "iat": datetime.now(timezone.utc),
            "exp": expire,
            "jti": secrets.token_urlsafe(16)  # Unique token ID for revocation if needed
        }
        
        # Generate JWT token
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        return {
            "token": token,
            "expires_at": expire,
            "expires_in_hours": expires_hours,
            "token_id": payload["jti"]
        }

    @staticmethod
    def create_step_invitation_token(
        employee_id: str,
        step_id: str,
        property_id: Optional[str] = None,
        expires_hours: int = JWT_ACCESS_TOKEN_EXPIRE_HOURS
    ) -> Dict[str, Any]:
        """
        Create a secure step invitation token for single-step onboarding

        Args:
            employee_id: The employee's ID
            step_id: The specific step this invitation is for
            property_id: Optional property ID for multi-property organizations
            expires_hours: Token expiration in hours

        Returns:
            Dictionary containing token and expiration info
        """
        expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

        # Create payload with step-specific restrictions
        payload = {
            "employee_id": employee_id,
            "token_type": "step_invitation",
            "allowed_step": step_id,
            "property_id": property_id,
            "iat": datetime.now(timezone.utc),
            "exp": expire,
            "jti": secrets.token_urlsafe(16)  # Unique token ID for revocation if needed
        }

        # Generate JWT token
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

        return {
            "token": token,
            "expires_at": expire,
            "expires_in_hours": expires_hours,
            "token_id": payload["jti"],
            "step_id": step_id,
            "property_id": property_id
        }
    
    @staticmethod
    def verify_onboarding_token(token: str) -> Dict[str, Any]:
        """
        Verify and decode an onboarding token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Dictionary containing token payload if valid
            
        Raises:
            jwt.ExpiredSignatureError: If token is expired
            jwt.InvalidTokenError: If token is invalid
        """
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Verify token type - accept both onboarding and step_invitation tokens
            token_type = payload.get("token_type")
            if token_type not in ["onboarding", "step_invitation"]:
                raise jwt.InvalidTokenError("Invalid token type")
            
            result = {
                "valid": True,
                "employee_id": payload.get("employee_id"),
                "application_id": payload.get("application_id"),
                "token_type": token_type,
                "token_id": payload.get("jti"),
                "issued_at": datetime.fromtimestamp(payload.get("iat"), timezone.utc) if payload.get("iat") else datetime.now(timezone.utc),
                "expires_at": datetime.fromtimestamp(payload.get("exp"), timezone.utc) if payload.get("exp") else None
            }
            
            # Include step-specific data for step_invitation tokens
            if token_type == "step_invitation":
                result["allowed_step"] = payload.get("allowed_step")
                result["property_id"] = payload.get("property_id")
            
            return result
            
        except jwt.ExpiredSignatureError:
            return {
                "valid": False,
                "error": "Token has expired",
                "error_code": "TOKEN_EXPIRED"
            }
        except jwt.InvalidTokenError as e:
            return {
                "valid": False,
                "error": f"Invalid token: {str(e)}",
                "error_code": "INVALID_TOKEN"
            }
    
    @staticmethod
    def create_manager_token(manager_id: str, property_id: str) -> Dict[str, Any]:
        """Create a secure token for manager authentication"""
        expire = datetime.now(timezone.utc) + timedelta(hours=24)  # Shorter expiration for managers
        
        payload = {
            "manager_id": manager_id,
            "property_id": property_id,
            "token_type": "manager_auth",
            "iat": datetime.now(timezone.utc),
            "exp": expire,
            "jti": secrets.token_urlsafe(16)
        }
        
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        
        return {
            "token": token,
            "expires_at": expire,
            "token_id": payload["jti"]
        }
    
    @staticmethod
    def refresh_token(current_token: str) -> Dict[str, Any]:
        """
        Refresh an existing token before it expires
        
        Args:
            current_token: The current valid JWT token
            
        Returns:
            Dictionary containing new token and expiration info
            
        Raises:
            jwt.InvalidTokenError: If token is invalid
            jwt.ExpiredSignatureError: If token is already expired
        """
        try:
            # Decode the current token
            payload = jwt.decode(current_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            # Check if token is within refresh window (last hour before expiry)
            exp_datetime = datetime.fromtimestamp(payload['exp'], tz=timezone.utc)
            now = datetime.now(timezone.utc)
            time_until_expiry = exp_datetime - now
            
            # Allow refresh if token expires within 1 hour or has less than 1 day left
            if time_until_expiry.total_seconds() > 86400:  # More than 1 day left
                # For tokens with more than 1 day left, return the same token info
                return {
                    "token": current_token,
                    "expires_at": exp_datetime,
                    "refreshed": False,
                    "message": "Token still has more than 1 day validity"
                }
            
            # Create new token with same claims but new expiry
            new_expire = datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_TOKEN_EXPIRE_HOURS)
            
            # Preserve all original claims except exp, iat
            new_payload = {
                k: v for k, v in payload.items() 
                if k not in ['exp', 'iat']
            }
            
            # Add new timestamps
            new_payload.update({
                "iat": datetime.now(timezone.utc),
                "exp": new_expire,
                "refreshed_from": payload.get("jti"),  # Track token lineage
                "jti": secrets.token_urlsafe(16)  # New unique token ID
            })
            
            # Generate new JWT token
            new_token = jwt.encode(new_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            
            return {
                "token": new_token,
                "expires_at": new_expire,
                "expires_in_hours": JWT_ACCESS_TOKEN_EXPIRE_HOURS,
                "token_id": new_payload["jti"],
                "refreshed": True,
                "old_token_id": payload.get("jti")
            }
            
        except jwt.ExpiredSignatureError:
            raise jwt.ExpiredSignatureError("Token has already expired and cannot be refreshed")
        except jwt.InvalidTokenError as e:
            raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")
    
    @staticmethod
    def verify_manager_token(token: str) -> Dict[str, Any]:
        """Verify manager authentication token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            if payload.get("token_type") != "manager_auth":
                raise jwt.InvalidTokenError("Invalid token type")
            
            return {
                "valid": True,
                "manager_id": payload.get("manager_id"),
                "property_id": payload.get("property_id"),
                "token_id": payload.get("jti")
            }
            
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token expired"}
        except jwt.InvalidTokenError as e:
            return {"valid": False, "error": f"Invalid token: {str(e)}"}

class PasswordManager:
    """Utility class for password hashing and verification"""
    
    def __init__(self):
        # Simple in-memory password storage for development
        self.passwords = {}
    
    def store_password(self, email: str, password: str):
        """Store a password (hashed) for a user"""
        hashed = self.hash_password(password)
        self.passwords[email] = hashed
    
    def verify_user_password(self, email: str, password: str) -> bool:
        """Verify a user's password"""
        if email not in self.passwords:
            return False
        return self.verify_password(password, self.passwords[email])
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_secure_code(length: int = 8) -> str:
        """Generate a secure random code for access codes"""
        return secrets.token_urlsafe(length)[:length].upper()


def create_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token for WebSocket authentication
    
    Args:
        user_id: User ID
        role: User role (hr, manager, employee)
        expires_delta: Token expiration time (default: 24 hours)
    
    Returns:
        JWT token string
    """
    if expires_delta is None:
        expires_delta = timedelta(hours=24)
    
    expire = datetime.now(timezone.utc) + expires_delta
    
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "token_type": "websocket_auth"
    }
    
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


# Import supabase service here to avoid circular imports
def get_supabase_service():
    """Get supabase service instance to avoid circular imports"""
    from .supabase_service_enhanced import EnhancedSupabaseService
    return EnhancedSupabaseService()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """JWT token validation with Supabase lookup"""
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    token = credentials.credentials
    
    try:
        # Use the same JWT_SECRET_KEY that was used for token creation
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        token_type = payload.get("token_type")
        
        # Get supabase service instance
        supabase_service = get_supabase_service()
        
        if token_type == "manager_auth":
            # Use 'sub' field (standard JWT) with fallback to 'manager_id' for backward compatibility
            user_id = payload.get("sub") or payload.get("manager_id")
            user = supabase_service.get_user_by_id_sync(user_id)
            if not user or user.role != "manager":
                raise HTTPException(
                    status_code=401, 
                    detail="Manager not found"
                )
            return user
            
        elif token_type == "hr_auth":
            # Use 'sub' field (standard JWT) with fallback to 'user_id' for backward compatibility
            user_id = payload.get("sub") or payload.get("user_id")
            user = supabase_service.get_user_by_id_sync(user_id)
            if not user or user.role != "hr":
                raise HTTPException(
                    status_code=401, 
                    detail="HR user not found"
                )
            return user
        
        raise HTTPException(
            status_code=401, 
            detail="Invalid token type"
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401, 
            detail="Invalid token"
        )


def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """Optional JWT token validation - returns None if no token provided"""
    if not credentials:
        return None
    
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


def require_manager_role(current_user: User = Depends(get_current_user)) -> User:
    """Require manager role"""
    if current_user.role != "manager":
        raise HTTPException(
            status_code=403, 
            detail="Manager access required"
        )
    return current_user


def require_hr_role(current_user: User = Depends(get_current_user)) -> User:
    """Require HR role"""
    if current_user.role != "hr":
        raise HTTPException(
            status_code=403, 
            detail="HR access required"
        )
    return current_user


def require_hr_or_manager_role(current_user: User = Depends(get_current_user)) -> User:
    """Require HR or Manager role"""
    if current_user.role not in ["hr", "manager"]:
        raise HTTPException(
            status_code=403,
            detail="HR or Manager access required"
        )
    return current_user


# Alias for manager review API
get_current_manager = require_manager_role