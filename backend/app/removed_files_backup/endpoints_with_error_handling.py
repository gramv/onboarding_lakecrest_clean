"""
Example endpoints refactored to use centralized error handling
These show the pattern for Phase 3 implementation
"""

from typing import Optional
from fastapi import Depends, Request, Query
from datetime import datetime

from .models import User
from .auth import get_current_user, require_hr_role
from .core import error_handler, ErrorContext
from .supabase_service_enhanced import EnhancedSupabaseService
from .response_utils import success_response

# Example 1: Login endpoint with error handling
@error_handler.handle_errors("user login")
async def login_with_error_handling(request: Request, supabase_service: EnhancedSupabaseService):
    """Login endpoint with centralized error handling"""
    
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")
    
    if not email or not password:
        raise ValueError("Email and password are required")
    
    # Find user - errors automatically handled
    existing_user = supabase_service.get_user_by_email_sync(email)
    if not existing_user:
        raise ValueError("Invalid credentials")
    
    # Verify password
    if not existing_user.password_hash or not supabase_service.verify_password(password, existing_user.password_hash):
        raise ValueError("Invalid credentials")
    
    # Generate token logic here...
    return success_response(data={"token": "..."})


# Example 2: Get applications with error handling
@error_handler.handle_errors("retrieve applications")
async def get_applications_with_error_handling(
    property_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    supabase_service: EnhancedSupabaseService = None
):
    """Get applications with centralized error handling"""
    
    context = ErrorContext()
    context.user_id = current_user.id
    context.property_id = property_id
    
    # Database operations - errors automatically caught and formatted
    if property_id:
        applications = await supabase_service.get_applications_by_property(property_id)
    else:
        applications = await supabase_service.get_all_applications()
    
    # Apply filters
    if status:
        applications = [app for app in applications if app.status == status]
    
    return success_response(
        data=applications,
        message=f"Retrieved {len(applications)} applications"
    )


# Example 3: Create property with error handling
@error_handler.handle_errors("create property")
async def create_property_with_error_handling(
    request: Request,
    current_user: User = Depends(require_hr_role),
    supabase_service: EnhancedSupabaseService = None
):
    """Create property with centralized error handling"""
    
    body = await request.json()
    
    # Validation - will be caught as ValidationError
    required_fields = ["name", "address", "city", "state", "zip_code"]
    for field in required_fields:
        if field not in body:
            raise ValueError(f"Missing required field: {field}")
    
    # Create property - database errors automatically handled
    new_property = await supabase_service.create_property(body)
    
    return success_response(
        data=new_property,
        message="Property created successfully"
    )


# Example 4: Property access with specific error handling
async def get_manager_data_with_property_check(
    property_id: str,
    current_user: User = Depends(get_current_user),
    supabase_service: EnhancedSupabaseService = None
):
    """Example with property access error handling"""
    
    # Check property access
    if current_user.role == "manager":
        manager_properties = supabase_service.get_manager_properties_sync(current_user.id)
        property_ids = [p.id for p in manager_properties]
        
        if property_id not in property_ids:
            # Use specific property access error
            return error_handler.handle_property_access_error(
                user_id=current_user.id,
                property_id=property_id,
                action="view manager data"
            )
    
    try:
        # Get data
        data = await supabase_service.get_property_data(property_id)
        return success_response(data=data)
        
    except Exception as e:
        # Handle with context
        context = ErrorContext()
        context.user_id = current_user.id
        context.property_id = property_id
        return error_handler.handle_database_error(e, context, "retrieve property data")


# Example 5: Federal compliance with specific error handling  
async def submit_i9_form_with_compliance_check(
    form_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Example with compliance error handling"""
    
    try:
        # Validate I-9 requirements
        if not form_data.get("ssn"):
            raise ValueError("SSN is required for I-9 form")
        
        if not form_data.get("citizenship_status"):
            raise ValueError("Citizenship status must be selected")
        
        # Check deadline
        hire_date = datetime.fromisoformat(form_data.get("hire_date"))
        if (datetime.now() - hire_date).days > 3:
            # Use specific compliance error
            return error_handler.handle_compliance_error(
                Exception("I-9 Section 1 must be completed by first day of work"),
                form_type="I9"
            )
        
        # Process form
        return success_response(message="I-9 form submitted successfully")
        
    except ValueError as e:
        context = ErrorContext()
        context.user_id = current_user.id
        return error_handler.handle_validation_error(e, context)
    except Exception as e:
        return error_handler.handle_compliance_error(e, "I9")