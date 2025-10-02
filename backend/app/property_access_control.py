#!/usr/bin/env python3
"""
Property Access Control Module
Centralized property access validation for manager operations
"""

from typing import List, Optional, Set
from fastapi import HTTPException, Depends
from functools import wraps
import logging
from datetime import datetime

from .models import User, UserRole
from .auth import get_current_user
from .supabase_service_enhanced import EnhancedSupabaseService

logger = logging.getLogger(__name__)

class PropertyAccessError(Exception):
    """Custom exception for property access violations"""
    pass

class PropertyAccessController:
    """Centralized property access control for managers"""
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        self.supabase_service = supabase_service
        self._manager_property_cache = {}  # Simple cache for manager properties
        self._cache_ttl = 300  # 5 minutes cache TTL
        self._cache_timestamps = {}  # Track cache timestamps
    
    def get_manager_properties(self, manager_id: str) -> List[str]:
        """Get property IDs that a manager has access to"""
        try:
            # Check cache first with TTL validation
            current_time = datetime.now().timestamp()
            if (manager_id in self._manager_property_cache and 
                manager_id in self._cache_timestamps and
                current_time - self._cache_timestamps[manager_id] < self._cache_ttl):
                return self._manager_property_cache[manager_id]
            
            # Get properties from database
            properties = self.supabase_service.get_manager_properties_sync(manager_id)
            property_ids = [prop.id for prop in properties]
            
            # Cache the result with timestamp
            self._manager_property_cache[manager_id] = property_ids
            self._cache_timestamps[manager_id] = current_time
            
            return property_ids
            
        except Exception as e:
            logger.error(f"Failed to get manager properties for {manager_id}: {e}")
            return []
    
    def clear_manager_cache(self, manager_id: str):
        """Clear cached properties for a manager"""
        if manager_id in self._manager_property_cache:
            del self._manager_property_cache[manager_id]
        if manager_id in self._cache_timestamps:
            del self._cache_timestamps[manager_id]
    
    def clear_all_cache(self):
        """Clear all cached data"""
        self._manager_property_cache.clear()
        self._cache_timestamps.clear()
    
    def validate_manager_property_access(self, manager: User, property_id: str) -> bool:
        """Validate that a manager has access to a specific property"""
        if not manager or manager.role != UserRole.MANAGER:
            logger.warning(f"Property access denied: Invalid manager role for user {manager.id if manager else 'None'}")
            return False
        
        if not property_id:
            logger.warning(f"Property access denied: No property ID provided for manager {manager.id}")
            return False
        
        try:
            manager_properties = self.get_manager_properties(manager.id)
            has_access = property_id in manager_properties
            
            if not has_access:
                logger.warning(f"Property access denied: Manager {manager.id} does not have access to property {property_id}")
            
            return has_access
        except Exception as e:
            logger.error(f"Error validating property access for manager {manager.id}: {e}")
            return False
    
    def validate_manager_application_access(self, manager: User, application_id: str) -> bool:
        """Validate that a manager has access to a specific application"""
        if not manager or manager.role != UserRole.MANAGER:
            logger.warning(f"Application access denied: Invalid manager role for user {manager.id if manager else 'None'}")
            return False
        
        if not application_id:
            logger.warning(f"Application access denied: No application ID provided for manager {manager.id}")
            return False
        
        try:
            # Get application to check its property
            application = self.supabase_service.get_application_by_id_sync(application_id)
            if not application:
                logger.warning(f"Application access denied: Application {application_id} not found for manager {manager.id}")
                return False
            
            return self.validate_manager_property_access(manager, application.property_id)
            
        except Exception as e:
            logger.error(f"Failed to validate manager application access for {manager.id}: {e}")
            return False
    
    def validate_manager_employee_access(self, manager: User, employee_id: str) -> bool:
        """Validate that a manager has access to a specific employee"""
        if not manager or manager.role != UserRole.MANAGER:
            logger.warning(f"Employee access denied: Invalid manager role for user {manager.id if manager else 'None'}")
            return False
        
        if not employee_id:
            logger.warning(f"Employee access denied: No employee ID provided for manager {manager.id}")
            return False
        
        try:
            # Get employee to check its property
            employee = self.supabase_service.get_employee_by_id_sync(employee_id)
            if not employee:
                logger.warning(f"Employee access denied: Employee {employee_id} not found for manager {manager.id}")
                return False
            
            return self.validate_manager_property_access(manager, employee.property_id)
            
        except Exception as e:
            logger.error(f"Failed to validate manager employee access for {manager.id}: {e}")
            return False
    
    def get_manager_accessible_properties(self, manager: User) -> List[str]:
        """Get all property IDs accessible to a manager"""
        if manager.role != UserRole.MANAGER:
            return []
        
        return self.get_manager_properties(manager.id)
    
    def filter_applications_by_manager_access(self, manager: User, applications: List) -> List:
        """Filter applications to only those accessible by the manager"""
        if manager.role != UserRole.MANAGER:
            return []
        
        manager_properties = set(self.get_manager_properties(manager.id))
        return [app for app in applications if app.property_id in manager_properties]
    
    def filter_employees_by_manager_access(self, manager: User, employees: List) -> List:
        """Filter employees to only those accessible by the manager"""
        if manager.role != UserRole.MANAGER:
            return []
        
        manager_properties = set(self.get_manager_properties(manager.id))
        return [emp for emp in employees if emp.property_id in manager_properties]
    
    def validate_manager_onboarding_access(self, manager: User, session_id: str) -> bool:
        """Validate that a manager has access to a specific onboarding session"""
        if not manager or manager.role != UserRole.MANAGER:
            logger.warning(f"Onboarding access denied: Invalid manager role for user {manager.id if manager else 'None'}")
            return False
        
        if not session_id:
            logger.warning(f"Onboarding access denied: No session ID provided for manager {manager.id}")
            return False
        
        try:
            # Get onboarding session to check its property
            session = self.supabase_service.get_onboarding_session_by_id_sync(session_id)
            if not session:
                logger.warning(f"Onboarding access denied: Session {session_id} not found for manager {manager.id}")
                return False
            
            return self.validate_manager_property_access(manager, session.property_id)
            
        except Exception as e:
            logger.error(f"Failed to validate manager onboarding access for {manager.id}: {e}")
            return False

# Dependency injection functions for FastAPI
def get_property_access_controller(supabase_service: EnhancedSupabaseService = None) -> PropertyAccessController:
    """Get property access controller instance"""
    # This will be initialized in main.py with the actual supabase_service
    if not hasattr(get_property_access_controller, '_instance'):
        if supabase_service is None:
            raise RuntimeError("PropertyAccessController not initialized")
        get_property_access_controller._instance = PropertyAccessController(supabase_service)
    return get_property_access_controller._instance

# Decorator for property access validation
def require_property_access(property_param: str = "property_id"):
    """Decorator to require property access for manager operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                logger.error("Property access decorator: No current_user found in kwargs")
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Skip validation for HR users
            if current_user.role == UserRole.HR:
                logger.debug(f"Property access: HR user {current_user.id} bypassing property validation")
                return await func(*args, **kwargs)
            
            # Validate manager access
            if current_user.role != UserRole.MANAGER:
                logger.warning(f"Property access denied: User {current_user.id} is not a manager")
                raise HTTPException(status_code=403, detail="Manager access required")
            
            # Get property ID from parameters
            property_id = kwargs.get(property_param)
            if not property_id:
                logger.error(f"Property access decorator: Missing {property_param} parameter for manager {current_user.id}")
                raise HTTPException(status_code=400, detail=f"Missing {property_param} parameter")
            
            # Validate access
            try:
                access_controller = get_property_access_controller()
                if not access_controller.validate_manager_property_access(current_user, property_id):
                    logger.warning(f"Property access denied: Manager {current_user.id} not authorized for property {property_id}")
                    raise HTTPException(
                        status_code=403, 
                        detail="Access denied: Manager not authorized for this property"
                    )
                
                logger.debug(f"Property access granted: Manager {current_user.id} accessing property {property_id}")
                return await func(*args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Property access validation error for manager {current_user.id}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Internal error during access validation"
                )
        return wrapper
    return decorator

def require_application_access(application_param: str = "id"):
    """Decorator to require application access for manager operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                logger.error("Application access decorator: No current_user found in kwargs")
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Skip validation for HR users
            if current_user.role == UserRole.HR:
                logger.debug(f"Application access: HR user {current_user.id} bypassing application validation")
                return await func(*args, **kwargs)
            
            # Validate manager access
            if current_user.role != UserRole.MANAGER:
                logger.warning(f"Application access denied: User {current_user.id} is not a manager")
                raise HTTPException(status_code=403, detail="Manager access required")
            
            # Get application ID from parameters
            application_id = kwargs.get(application_param)
            if not application_id:
                # Try to get from args (for path parameters)
                if args:
                    application_id = args[0]
                else:
                    logger.error(f"Application access decorator: Missing {application_param} parameter for manager {current_user.id}")
                    raise HTTPException(status_code=400, detail=f"Missing {application_param} parameter")
            
            # Validate access
            try:
                access_controller = get_property_access_controller()
                if not access_controller.validate_manager_application_access(current_user, application_id):
                    logger.warning(f"Application access denied: Manager {current_user.id} not authorized for application {application_id}")
                    raise HTTPException(
                        status_code=403, 
                        detail="Access denied: Manager not authorized for this application"
                    )
                
                logger.debug(f"Application access granted: Manager {current_user.id} accessing application {application_id}")
                return await func(*args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Application access validation error for manager {current_user.id}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Internal error during access validation"
                )
        return wrapper
    return decorator

def require_employee_access(employee_param: str = "id"):
    """Decorator to require employee access for manager operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                logger.error("Employee access decorator: No current_user found in kwargs")
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Skip validation for HR users
            if current_user.role == UserRole.HR:
                logger.debug(f"Employee access: HR user {current_user.id} bypassing employee validation")
                return await func(*args, **kwargs)
            
            # Validate manager access
            if current_user.role != UserRole.MANAGER:
                logger.warning(f"Employee access denied: User {current_user.id} is not a manager")
                raise HTTPException(status_code=403, detail="Manager access required")
            
            # Get employee ID from parameters
            employee_id = kwargs.get(employee_param)
            if not employee_id:
                # Try to get from args (for path parameters)
                if args:
                    employee_id = args[0]
                else:
                    logger.error(f"Employee access decorator: Missing {employee_param} parameter for manager {current_user.id}")
                    raise HTTPException(status_code=400, detail=f"Missing {employee_param} parameter")
            
            # Validate access
            try:
                access_controller = get_property_access_controller()
                if not access_controller.validate_manager_employee_access(current_user, employee_id):
                    logger.warning(f"Employee access denied: Manager {current_user.id} not authorized for employee {employee_id}")
                    raise HTTPException(
                        status_code=403, 
                        detail="Access denied: Manager not authorized for this employee"
                    )
                
                logger.debug(f"Employee access granted: Manager {current_user.id} accessing employee {employee_id}")
                return await func(*args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Employee access validation error for manager {current_user.id}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Internal error during access validation"
                )
        return wrapper
    return decorator

# Enhanced dependency for manager role with property access validation
def require_manager_with_property_access(current_user: User = Depends(get_current_user)) -> User:
    """Enhanced manager role requirement with property access validation"""
    if not current_user:
        logger.error("Manager property access dependency: No current_user provided")
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if current_user.role != UserRole.MANAGER:
        logger.warning(f"Manager property access denied: User {current_user.id} is not a manager (role: {current_user.role})")
        raise HTTPException(status_code=403, detail="Manager access required")
    
    # Verify manager has at least one property assigned
    try:
        access_controller = get_property_access_controller()
        manager_properties = access_controller.get_manager_properties(current_user.id)
        
        if not manager_properties:
            logger.warning(f"Manager property access denied: Manager {current_user.id} not assigned to any property")
            raise HTTPException(
                status_code=403, 
                detail="Manager not assigned to any property"
            )
        
        logger.debug(f"Manager property access granted: Manager {current_user.id} has access to {len(manager_properties)} properties")
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manager property access validation error for {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal error during manager property access validation"
        )

def require_onboarding_access(session_param: str = "session_id"):
    """Decorator to require onboarding session access for manager operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                logger.error("Onboarding access decorator: No current_user found in kwargs")
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Skip validation for HR users
            if current_user.role == UserRole.HR:
                logger.debug(f"Onboarding access: HR user {current_user.id} bypassing onboarding validation")
                return await func(*args, **kwargs)
            
            # Validate manager access
            if current_user.role != UserRole.MANAGER:
                logger.warning(f"Onboarding access denied: User {current_user.id} is not a manager")
                raise HTTPException(status_code=403, detail="Manager access required")
            
            # Get session ID from parameters
            session_id = kwargs.get(session_param)
            if not session_id:
                # Try to get from args (for path parameters)
                if args:
                    session_id = args[0]
                else:
                    logger.error(f"Onboarding access decorator: Missing {session_param} parameter for manager {current_user.id}")
                    raise HTTPException(status_code=400, detail=f"Missing {session_param} parameter")
            
            # Validate access
            try:
                access_controller = get_property_access_controller()
                if not access_controller.validate_manager_onboarding_access(current_user, session_id):
                    logger.warning(f"Onboarding access denied: Manager {current_user.id} not authorized for session {session_id}")
                    raise HTTPException(
                        status_code=403, 
                        detail="Access denied: Manager not authorized for this onboarding session"
                    )
                
                logger.debug(f"Onboarding access granted: Manager {current_user.id} accessing session {session_id}")
                return await func(*args, **kwargs)
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Onboarding access validation error for manager {current_user.id}: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Internal error during access validation"
                )
        return wrapper
    return decorator