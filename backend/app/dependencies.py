"""
FastAPI Dependencies
Centralized dependency injection for authentication and authorization
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

# Import from auth module
from app.auth import (
    get_current_user as _get_current_user,
    get_current_user_optional as _get_current_user_optional,
    require_manager_role as _require_manager_role,
    require_hr_role as _require_hr_role,
    require_hr_or_manager_role as _require_hr_or_manager_role,
    security
)

logger = logging.getLogger(__name__)

# Re-export for convenience
get_current_user = _get_current_user
get_current_user_optional = _get_current_user_optional
require_manager_role = _require_manager_role
require_hr_role = _require_hr_role
require_hr_or_manager_role = _require_hr_or_manager_role

__all__ = [
    'get_current_user',
    'get_current_user_optional',
    'require_manager_role',
    'require_hr_role',
    'require_hr_or_manager_role',
    'security'
]

