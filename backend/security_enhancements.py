"""
Security Enhancements for Hotel Onboarding System
Implements recommended security measures
"""

# File: app/security_middleware.py

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Dict, List
import time
import hashlib
import secrets

# Rate limiting configuration
limiter = Limiter(key_func=get_remote_address)

# CSRF token storage (in production, use Redis or similar)
csrf_tokens: Dict[str, float] = {}

class SecurityMiddleware:
    """Enhanced security middleware for FastAPI"""
    
    @staticmethod
    async def add_security_headers(request: Request, call_next):
        """Add security headers to all responses"""
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Content Security Policy
        csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  # Adjust as needed
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp)
        
        return response
    
    @staticmethod
    def generate_csrf_token() -> str:
        """Generate a secure CSRF token"""
        token = secrets.token_urlsafe(32)
        csrf_tokens[token] = time.time()
        
        # Clean old tokens (older than 1 hour)
        current_time = time.time()
        for t, timestamp in list(csrf_tokens.items()):
            if current_time - timestamp > 3600:
                del csrf_tokens[t]
        
        return token
    
    @staticmethod
    def verify_csrf_token(token: str) -> bool:
        """Verify CSRF token"""
        if token not in csrf_tokens:
            return False
        
        # Check if token is not expired (1 hour)
        if time.time() - csrf_tokens[token] > 3600:
            del csrf_tokens[token]
            return False
        
        return True


# File: app/input_sanitizer.py

import re
import html
from typing import Any, Dict, List, Union

class InputSanitizer:
    """Sanitize and validate user inputs"""
    
    # Dangerous patterns to detect
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe',
        r'<object',
        r'<embed',
        r'<svg',
        r'<img[^>]+src[\\s]*=[\\s]*["\']javascript:',
    ]
    
    SQL_PATTERNS = [
        r"('\s*(;|--|#|/\*|\*/|union|select|insert|update|delete|drop|create|alter|exec|script))",
        r'(union.*select)',
        r'(select.*from)',
        r'(insert.*into)',
        r'(delete.*from)',
        r'(drop.*table)',
        r'(update.*set)',
    ]
    
    @classmethod
    def sanitize_html(cls, text: str) -> str:
        """Remove HTML tags and escape special characters"""
        if not isinstance(text, str):
            return text
        
        # Remove all HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # HTML escape remaining special characters
        text = html.escape(text)
        
        return text
    
    @classmethod
    def detect_xss(cls, text: str) -> bool:
        """Detect potential XSS attempts"""
        if not isinstance(text, str):
            return False
        
        text_lower = text.lower()
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE | re.DOTALL):
                return True
        
        return False
    
    @classmethod
    def detect_sql_injection(cls, text: str) -> bool:
        """Detect potential SQL injection attempts"""
        if not isinstance(text, str):
            return False
        
        text_lower = text.lower()
        for pattern in cls.SQL_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    @classmethod
    def sanitize_input(cls, data: Union[str, Dict, List]) -> Union[str, Dict, List]:
        """Recursively sanitize all string inputs in data structure"""
        if isinstance(data, str):
            # Check for malicious patterns
            if cls.detect_xss(data) or cls.detect_sql_injection(data):
                raise ValueError(f"Potentially malicious input detected")
            
            # Sanitize the string
            return cls.sanitize_html(data)
        
        elif isinstance(data, dict):
            return {key: cls.sanitize_input(value) for key, value in data.items()}
        
        elif isinstance(data, list):
            return [cls.sanitize_input(item) for item in data]
        
        else:
            return data
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Enhanced email validation"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, email):
            return False
        
        # Additional checks
        if '..' in email or email.startswith('.') or email.endswith('.'):
            return False
        
        # Check for XSS/SQLi in email
        if cls.detect_xss(email) or cls.detect_sql_injection(email):
            return False
        
        return True
    
    @classmethod
    def validate_phone(cls, phone: str) -> bool:
        """Enhanced phone validation"""
        # US phone format: (XXX) XXX-XXXX
        phone_pattern = r'^\(\d{3}\) \d{3}-\d{4}$'
        
        return bool(re.match(phone_pattern, phone))
    
    @classmethod
    def validate_ssn(cls, ssn: str) -> bool:
        """Enhanced SSN validation"""
        # Format: XXX-XX-XXXX
        ssn_pattern = r'^\d{3}-\d{2}-\d{4}$'
        
        if not re.match(ssn_pattern, ssn):
            return False
        
        # Check for invalid SSNs
        parts = ssn.split('-')
        
        # Invalid area numbers
        if parts[0] in ['000', '666'] or parts[0].startswith('9'):
            return False
        
        # Invalid group number
        if parts[1] == '00':
            return False
        
        # Invalid serial number
        if parts[2] == '0000':
            return False
        
        return True


# File: app/security_utils.py

import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import os

class SecurityUtils:
    """Security utility functions"""
    
    # In production, use environment variable
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
    ALGORITHM = "HS256"
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(hours=24)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SecurityUtils.SECRET_KEY, algorithm=SecurityUtils.ALGORITHM)
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict]:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, SecurityUtils.SECRET_KEY, algorithms=[SecurityUtils.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None


# Example implementation in main_enhanced.py

"""
from security_middleware import SecurityMiddleware, limiter, RateLimitExceeded, _rate_limit_exceeded_handler
from input_sanitizer import InputSanitizer
from security_utils import SecurityUtils

# Add to app initialization
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add security middleware
app.middleware("http")(SecurityMiddleware.add_security_headers)

# Add to job application endpoint
@app.post("/apply/{property_id}")
@limiter.limit("5/minute")  # Rate limit: 5 submissions per minute
async def submit_application(
    property_id: str,
    application: JobApplication,
    request: Request
):
    # Sanitize all inputs
    try:
        sanitized_data = InputSanitizer.sanitize_input(application.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Additional validation
    if not InputSanitizer.validate_email(sanitized_data['email']):
        raise HTTPException(status_code=422, detail="Invalid email format")
    
    if not InputSanitizer.validate_phone(sanitized_data['phone']):
        raise HTTPException(status_code=422, detail="Invalid phone format")
    
    # Continue with normal processing...

# Add CSRF endpoint
@app.get("/csrf-token")
async def get_csrf_token():
    token = SecurityMiddleware.generate_csrf_token()
    return {"csrf_token": token}

# Protected endpoint example
@app.post("/protected-endpoint")
async def protected_endpoint(request: Request):
    csrf_token = request.headers.get("X-CSRF-Token")
    
    if not csrf_token or not SecurityMiddleware.verify_csrf_token(csrf_token):
        raise HTTPException(status_code=403, detail="Invalid CSRF token")
    
    # Process request...
"""

if __name__ == "__main__":
    print("Security Enhancements for Hotel Onboarding System")
    print("=" * 50)
    print("\nThis file contains:")
    print("1. SecurityMiddleware - Security headers and CSRF protection")
    print("2. InputSanitizer - Input validation and sanitization")
    print("3. SecurityUtils - Password hashing and JWT tokens")
    print("\nIntegrate these modules into main_enhanced.py for enhanced security")