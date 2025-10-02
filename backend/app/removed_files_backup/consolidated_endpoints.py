"""
Consolidated API Endpoints
Unified handlers that eliminate duplicates while maintaining backward compatibility
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import HTTPException, Depends, Query
import logging

from .models import User, UserRole
from .response_models import ApplicationData
from .auth import require_hr_role, require_hr_or_manager_role
from .supabase_service_enhanced import EnhancedSupabaseService
from .response_utils import success_response, error_response, ErrorCode

logger = logging.getLogger(__name__)

class ConsolidatedEndpoints:
    """Consolidated endpoint handlers to eliminate duplicates"""
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        self.supabase_service = supabase_service
    
    async def get_applications_unified(
        self,
        property_id: Optional[str] = None,
        status: Optional[str] = None,
        department: Optional[str] = None,
        position: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "applied_at",
        sort_order: Optional[str] = "desc",
        limit: Optional[int] = None,
        current_user: User = None
    ):
        """
        Unified handler for getting applications.
        Supports both HR and Manager roles with appropriate filtering.
        Consolidates the functionality of both duplicate endpoints.
        """
        try:
            # Role-based data access
            if current_user.role == UserRole.MANAGER:
                # Manager: restricted to their properties
                manager_properties = self.supabase_service.get_manager_properties_sync(current_user.id)
                if not manager_properties:
                    return success_response(data=[], message="No applications found")
                
                property_ids = [prop.id for prop in manager_properties]
                applications = await self.supabase_service.get_applications_by_properties(property_ids)
                
                # Apply property filter if specified (must be in manager's properties)
                if property_id:
                    if property_id not in property_ids:
                        return error_response(
                            message="Access denied to specified property",
                            error_code=ErrorCode.AUTHORIZATION_ERROR,
                            status_code=403
                        )
                    applications = [app for app in applications if app.property_id == property_id]
            else:
                # HR: full system access
                if property_id:
                    applications = await self.supabase_service.get_applications_by_property(property_id)
                else:
                    applications = await self.supabase_service.get_all_applications()
            
            # Apply common filters
            applications = self._apply_filters(
                applications,
                status=status,
                department=department,
                position=position,
                search=search,
                date_from=date_from,
                date_to=date_to
            )
            
            # Sort applications
            applications = self._sort_applications(applications, sort_by, sort_order)
            
            # Apply limit
            if limit and limit > 0:
                applications = applications[:limit]
            
            # Convert to response format
            result = self._format_applications(applications)
            
            return success_response(
                data=result,
                message=f"Retrieved {len(result)} applications"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to retrieve applications: {e}")
            return error_response(
                message="Failed to retrieve applications",
                error_code=ErrorCode.DATABASE_ERROR,
                status_code=500,
                detail=str(e) if logger.level == logging.DEBUG else None
            )
    
    async def get_managers_unified(
        self,
        property_id: Optional[str] = None,
        active_only: bool = True,
        include_stats: bool = False,
        current_user: User = None
    ):
        """
        Unified handler for getting managers.
        Consolidates duplicate manager endpoints.
        """
        try:
            # Only HR can access manager list
            if current_user.role != UserRole.HR:
                return error_response(
                    message="Access denied",
                    error_code=ErrorCode.AUTHORIZATION_ERROR,
                    status_code=403
                )
            
            # Get managers
            managers = await self.supabase_service.get_all_managers()
            
            # Apply filters
            if property_id:
                # Filter managers by property assignment
                property_managers = await self.supabase_service.get_property_managers(property_id)
                manager_ids = [pm.manager_id for pm in property_managers]
                managers = [m for m in managers if m.id in manager_ids]
            
            if active_only:
                managers = [m for m in managers if m.is_active]
            
            # Format response
            result = []
            for manager in managers:
                manager_data = {
                    "id": manager.id,
                    "email": manager.email,
                    "first_name": getattr(manager, 'first_name', ''),
                    "last_name": getattr(manager, 'last_name', ''),
                    "is_active": manager.is_active,
                    "created_at": manager.created_at.isoformat() if manager.created_at else None,
                    "last_login": getattr(manager, 'last_login', None)
                }
                
                # Add statistics if requested
                if include_stats:
                    stats = await self._get_manager_stats(manager.id)
                    manager_data["stats"] = stats
                
                result.append(manager_data)
            
            return success_response(
                data=result,
                message=f"Retrieved {len(result)} managers"
            )
            
        except Exception as e:
            logger.error(f"Failed to retrieve managers: {e}")
            return error_response(
                message="Failed to retrieve managers",
                error_code=ErrorCode.DATABASE_ERROR,
                status_code=500
            )
    
    async def get_employees_unified(
        self,
        property_id: Optional[str] = None,
        status: Optional[str] = None,
        department: Optional[str] = None,
        search: Optional[str] = None,
        include_onboarding_status: bool = True,
        current_user: User = None
    ):
        """
        Unified handler for getting employees.
        Supports both HR (all employees) and Manager (property-specific) access.
        """
        try:
            # Role-based access control
            if current_user.role == UserRole.MANAGER:
                # Manager: restricted to their properties
                manager_properties = self.supabase_service.get_manager_properties_sync(current_user.id)
                if not manager_properties:
                    return success_response(data=[], message="No employees found")
                
                property_ids = [prop.id for prop in manager_properties]
                
                # Get employees for manager's properties
                employees = []
                for prop_id in property_ids:
                    prop_employees = await self.supabase_service.get_employees_by_property(prop_id)
                    employees.extend(prop_employees)
                
                # Apply property filter if specified
                if property_id:
                    if property_id not in property_ids:
                        return error_response(
                            message="Access denied to specified property",
                            error_code=ErrorCode.AUTHORIZATION_ERROR,
                            status_code=403
                        )
                    employees = [emp for emp in employees if emp.property_id == property_id]
            else:
                # HR: full system access
                if property_id:
                    employees = await self.supabase_service.get_employees_by_property(property_id)
                else:
                    employees = await self.supabase_service.get_all_employees()
            
            # Apply filters
            if status:
                employees = [emp for emp in employees if 
                           getattr(emp, 'status', None) == status]
            
            if department:
                employees = [emp for emp in employees if 
                           getattr(emp, 'department', '').lower() == department.lower()]
            
            if search:
                search_lower = search.lower()
                employees = [emp for emp in employees if
                           search_lower in emp.first_name.lower() or
                           search_lower in emp.last_name.lower() or
                           search_lower in emp.email.lower()]
            
            # Format response
            result = []
            for emp in employees:
                emp_data = {
                    "id": emp.id,
                    "property_id": emp.property_id,
                    "first_name": emp.first_name,
                    "last_name": emp.last_name,
                    "email": emp.email,
                    "phone": getattr(emp, 'phone', ''),
                    "department": getattr(emp, 'department', ''),
                    "position": getattr(emp, 'position', ''),
                    "start_date": getattr(emp, 'start_date', None),
                    "status": getattr(emp, 'status', 'active'),
                    "created_at": emp.created_at.isoformat() if emp.created_at else None
                }
                
                # Add onboarding status if requested
                if include_onboarding_status:
                    onboarding = await self.supabase_service.get_employee_onboarding_status(emp.id)
                    emp_data["onboarding_status"] = onboarding
                
                result.append(emp_data)
            
            return success_response(
                data=result,
                message=f"Retrieved {len(result)} employees"
            )
            
        except Exception as e:
            logger.error(f"Failed to retrieve employees: {e}")
            return error_response(
                message="Failed to retrieve employees",
                error_code=ErrorCode.DATABASE_ERROR,
                status_code=500
            )
    
    # Helper methods
    def _apply_filters(self, applications, **filters):
        """Apply filters to application list"""
        filtered = applications
        
        if filters.get('status'):
            filtered = [app for app in filtered if app.status == filters['status']]
        
        if filters.get('department'):
            filtered = [app for app in filtered if 
                      app.department.lower() == filters['department'].lower()]
        
        if filters.get('position'):
            filtered = [app for app in filtered if 
                      app.position.lower() == filters['position'].lower()]
        
        if filters.get('search'):
            search_lower = filters['search'].lower()
            filtered = [app for app in filtered if
                      search_lower in app.applicant_data.get('first_name', '').lower() or
                      search_lower in app.applicant_data.get('last_name', '').lower() or
                      search_lower in app.applicant_data.get('email', '').lower()]
        
        # Date filtering
        if filters.get('date_from'):
            try:
                from_date = datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
                filtered = [app for app in filtered if app.applied_at >= from_date]
            except ValueError:
                logger.warning(f"Invalid date_from format: {filters['date_from']}")
        
        if filters.get('date_to'):
            try:
                to_date = datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))
                filtered = [app for app in filtered if app.applied_at <= to_date]
            except ValueError:
                logger.warning(f"Invalid date_to format: {filters['date_to']}")
        
        return filtered
    
    def _sort_applications(self, applications, sort_by="applied_at", sort_order="desc"):
        """Sort applications by specified field"""
        reverse = sort_order.lower() == "desc"
        
        if sort_by == "applied_at":
            applications.sort(key=lambda x: x.applied_at or datetime.min, reverse=reverse)
        elif sort_by == "name":
            applications.sort(
                key=lambda x: f"{x.applicant_data.get('first_name', '')} {x.applicant_data.get('last_name', '')}",
                reverse=reverse
            )
        elif sort_by == "status":
            applications.sort(key=lambda x: x.status, reverse=reverse)
        elif sort_by == "department":
            applications.sort(key=lambda x: x.department or '', reverse=reverse)
        elif sort_by == "position":
            applications.sort(key=lambda x: x.position or '', reverse=reverse)
        
        return applications
    
    def _format_applications(self, applications):
        """Format applications for response"""
        result = []
        for app in applications:
            # Comprehensive application data format
            app_data = {
                "id": app.id,
                "property_id": app.property_id,
                "department": app.department,
                "position": app.position,
                "status": app.status,
                "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                "reviewed_by": getattr(app, 'reviewed_by', None),
                "reviewed_at": getattr(app, 'reviewed_at', None).isoformat() if getattr(app, 'reviewed_at', None) else None,
                # Applicant details
                "first_name": app.applicant_data.get("first_name", ""),
                "last_name": app.applicant_data.get("last_name", ""),
                "email": app.applicant_data.get("email", ""),
                "phone": app.applicant_data.get("phone", ""),
                # Full applicant data for detailed views
                "applicant_data": app.applicant_data
            }
            result.append(app_data)
        
        return result
    
    async def _get_manager_stats(self, manager_id: str) -> Dict[str, Any]:
        """Get statistics for a manager"""
        try:
            # Get manager's properties
            properties = self.supabase_service.get_manager_properties_sync(manager_id)
            property_ids = [p.id for p in properties]
            
            # Get counts
            applications = await self.supabase_service.get_applications_by_properties(property_ids)
            employees = []
            for prop_id in property_ids:
                prop_employees = await self.supabase_service.get_employees_by_property(prop_id)
                employees.extend(prop_employees)
            
            return {
                "properties_count": len(properties),
                "applications_count": len(applications),
                "employees_count": len(employees),
                "pending_applications": len([a for a in applications if a.status == "pending"])
            }
        except Exception as e:
            logger.error(f"Failed to get manager stats: {e}")
            return {
                "properties_count": 0,
                "applications_count": 0,
                "employees_count": 0,
                "pending_applications": 0
            }