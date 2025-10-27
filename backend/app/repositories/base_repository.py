#!/usr/bin/env python3
"""
Abstract Base Repository - Database Operations Interface

This defines the contract that all database implementations must follow.
Following the Repository Pattern for clean architecture and separation of concerns.

Benefits:
- Single Responsibility: Each repository handles one data source
- Open/Closed: Easy to add new implementations without changing existing code
- Dependency Inversion: Business logic depends on abstractions, not concrete implementations
- Testability: Easy to mock repositories for unit testing
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date

# Import models
from ..models import (
    User, Property, JobApplication, ApplicationStatus, UserRole,
    OnboardingSession, OnboardingStatus, OnboardingStep,
    AuditLog, Notification, AnalyticsEvent
)
from ..models_enhanced import Employee, OnboardingPhase


class DatabaseRepository(ABC):
    """
    Abstract base class defining all database operations.
    
    All concrete implementations (PostgreSQL, Supabase, MySQL, etc.) must implement these methods.
    This ensures consistency and makes it easy to swap database backends.
    """
    
    # ============================================================================
    # CORE ENTITY OPERATIONS
    # ============================================================================
    
    # --- User Operations ---
    
    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        pass
    
    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        pass
    
    @abstractmethod
    async def get_all_users(self) -> List[User]:
        """Get all users"""
        pass
    
    @abstractmethod
    async def get_users_by_role(self, role: UserRole) -> List[User]:
        """Get all users with specific role"""
        pass
    
    @abstractmethod
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create new user"""
        pass
    
    @abstractmethod
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> User:
        """Update existing user"""
        pass
    
    @abstractmethod
    async def delete_user(self, user_id: str) -> bool:
        """Delete user (soft delete)"""
        pass
    
    # --- Property Operations ---
    
    @abstractmethod
    async def get_property_by_id(self, property_id: str) -> Optional[Property]:
        """Get property by ID"""
        pass
    
    @abstractmethod
    async def get_all_properties(self) -> List[Property]:
        """Get all properties"""
        pass
    
    @abstractmethod
    async def get_properties_by_manager(self, manager_id: str) -> List[Property]:
        """Get all properties managed by a specific manager"""
        pass
    
    @abstractmethod
    async def create_property(self, property_data: Dict[str, Any]) -> Property:
        """Create new property"""
        pass
    
    @abstractmethod
    async def update_property(self, property_id: str, property_data: Dict[str, Any]) -> Property:
        """Update existing property"""
        pass
    
    @abstractmethod
    async def delete_property(self, property_id: str) -> bool:
        """Delete property"""
        pass
    
    @abstractmethod
    async def get_property_managers(self, property_id: str) -> List[User]:
        """Get all managers assigned to a property"""
        pass
    
    @abstractmethod
    async def assign_manager_to_property(self, property_id: str, manager_id: str) -> bool:
        """Assign a manager to a property"""
        pass
    
    @abstractmethod
    async def remove_manager_from_property(self, property_id: str, manager_id: str) -> bool:
        """Remove a manager from a property"""
        pass

    @abstractmethod
    async def get_property_stats(self, property_id: str) -> Dict[str, Any]:
        """Get statistics for a specific property"""
        pass

    @abstractmethod
    async def get_qr_code(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get existing QR code for property"""
        pass

    @abstractmethod
    async def create_qr_code(self, property_id: str, qr_code_data: str, qr_code_url: str, application_url: str, width: int, height: int) -> Dict[str, Any]:
        """Create new QR code for property"""
        pass

    @abstractmethod
    async def update_qr_code_access(self, qr_code_id: str) -> bool:
        """Update QR code access count and last accessed timestamp"""
        pass

    # --- Manager CRUD Operations ---

    @abstractmethod
    async def get_manager_by_id(self, manager_id: str) -> Optional[User]:
        """Get manager by ID"""
        pass

    @abstractmethod
    async def update_manager(self, manager_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update manager details"""
        pass

    @abstractmethod
    async def delete_manager(self, manager_id: str) -> bool:
        """Soft delete manager (set is_active=False)"""
        pass

    @abstractmethod
    async def get_manager_properties(self, manager_id: str) -> List[Property]:
        """Get all properties assigned to a manager"""
        pass

    # Property deletion support methods
    @abstractmethod
    async def get_applications_by_property(self, property_id: str) -> List[JobApplication]:
        """Get all applications for a specific property"""
        pass

    @abstractmethod
    async def get_employees_by_property(self, property_id: str) -> List['Employee']:
        """Get all employees for a specific property"""
        pass

    @abstractmethod
    async def delete_property_managers(self, property_id: str) -> int:
        """Delete all property_manager assignments for a property. Returns count of deleted rows."""
        pass

    @abstractmethod
    async def clear_property_references(self, property_id: str) -> None:
        """Clear property_id references from users and bulk_operations tables"""
        pass

    @abstractmethod
    async def delete_property(self, property_id: str) -> bool:
        """Delete a property. Returns True if successful."""
        pass

    # User Management Methods
    @abstractmethod
    async def get_users_with_filters(
        self,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get users with optional filtering and search.
        Returns list of user dicts with properties included for managers.
        """
        pass

    # --- Employee Operations ---
    
    @abstractmethod
    async def get_employee_by_id(self, employee_id: str) -> Optional[Employee]:
        """Get employee by ID"""
        pass
    
    @abstractmethod
    async def get_all_employees(self) -> List[Employee]:
        """Get all employees"""
        pass
    
    @abstractmethod
    async def get_employees_by_property(self, property_id: str) -> List[Employee]:
        """Get all employees for a specific property"""
        pass
    
    @abstractmethod
    async def get_employees_by_properties(self, property_ids: List[str]) -> List[Employee]:
        """Get all employees for multiple properties"""
        pass
    
    @abstractmethod
    async def get_employees_by_manager(self, manager_id: str) -> List[Employee]:
        """Get all employees managed by a specific manager"""
        pass
    
    @abstractmethod
    async def create_employee(self, employee_data: Dict[str, Any]) -> Employee:
        """Create new employee"""
        pass
    
    @abstractmethod
    async def update_employee(self, employee_id: str, employee_data: Dict[str, Any]) -> Employee:
        """Update existing employee"""
        pass
    
    @abstractmethod
    async def delete_employee(self, employee_id: str) -> bool:
        """Delete employee (soft delete)"""
        pass
    
    @abstractmethod
    async def get_employee_by_session(self, session_id: str) -> Optional[Employee]:
        """Get employee associated with an onboarding session"""
        pass
    
    # --- Job Application Operations ---
    
    @abstractmethod
    async def get_application_by_id(self, application_id: str) -> Optional[JobApplication]:
        """Get job application by ID"""
        pass
    
    @abstractmethod
    async def get_all_applications(self) -> List[JobApplication]:
        """Get all job applications"""
        pass
    
    @abstractmethod
    async def get_applications_by_property(self, property_id: str) -> List[JobApplication]:
        """Get all applications for a specific property"""
        pass
    
    @abstractmethod
    async def get_applications_by_status(self, status: ApplicationStatus) -> List[JobApplication]:
        """Get all applications with specific status"""
        pass
    
    @abstractmethod
    async def create_application(self, application_data: Dict[str, Any]) -> JobApplication:
        """Create new job application"""
        pass
    
    @abstractmethod
    async def update_application(self, application_id: str, application_data: Dict[str, Any]) -> JobApplication:
        """Update existing job application"""
        pass
    
    @abstractmethod
    async def approve_application(self, application_id: str, approved_by: str) -> Employee:
        """Approve application and create employee record"""
        pass
    
    @abstractmethod
    async def reject_application(self, application_id: str, rejected_by: str, reason: str) -> JobApplication:
        """Reject job application"""
        pass
    
    # --- Onboarding Session Operations ---
    
    @abstractmethod
    async def get_session_by_id(self, session_id: str) -> Optional[OnboardingSession]:
        """Get onboarding session by ID"""
        pass
    
    @abstractmethod
    async def get_session_by_token(self, token: str) -> Optional[OnboardingSession]:
        """Get onboarding session by token"""
        pass
    
    @abstractmethod
    async def get_sessions_by_employee(self, employee_id: str) -> List[OnboardingSession]:
        """Get all sessions for an employee"""
        pass
    
    @abstractmethod
    async def create_session(self, session_data: Dict[str, Any]) -> OnboardingSession:
        """Create new onboarding session"""
        pass
    
    @abstractmethod
    async def update_session(self, session_id: str, session_data: Dict[str, Any]) -> OnboardingSession:
        """Update existing onboarding session"""
        pass
    
    @abstractmethod
    async def expire_session(self, session_id: str) -> bool:
        """Expire an onboarding session"""
        pass
    
    # ============================================================================
    # DOCUMENT OPERATIONS
    # ============================================================================
    
    @abstractmethod
    async def save_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save document metadata and file"""
        pass
    
    @abstractmethod
    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document metadata and URL"""
        pass
    
    @abstractmethod
    async def get_employee_documents(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get all documents for an employee"""
        pass
    
    @abstractmethod
    async def delete_document(self, document_id: str) -> bool:
        """Delete document"""
        pass
    
    # ============================================================================
    # FORM DATA OPERATIONS
    # ============================================================================
    
    @abstractmethod
    async def save_i9_form(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save I-9 form data"""
        pass
    
    @abstractmethod
    async def get_i9_form(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get I-9 form data"""
        pass
    
    @abstractmethod
    async def save_w4_form(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save W-4 form data"""
        pass
    
    @abstractmethod
    async def get_w4_form(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get W-4 form data"""
        pass
    
    @abstractmethod
    async def save_direct_deposit(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save direct deposit form data"""
        pass
    
    @abstractmethod
    async def get_direct_deposit(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get direct deposit form data"""
        pass
    
    # ============================================================================
    # STATISTICS & ANALYTICS
    # ============================================================================
    
    @abstractmethod
    async def get_properties_count(self) -> int:
        """Get total count of properties"""
        pass
    
    @abstractmethod
    async def get_employees_count(self) -> int:
        """Get total count of employees"""
        pass
    
    @abstractmethod
    async def get_managers_count(self) -> int:
        """Get total count of managers"""
        pass
    
    @abstractmethod
    async def get_applications_count(self) -> int:
        """Get total count of applications"""
        pass
    
    @abstractmethod
    async def get_pending_applications_count(self) -> int:
        """Get count of pending applications"""
        pass
    
    @abstractmethod
    async def get_approved_applications_count(self) -> int:
        """Get count of approved applications"""
        pass
    
    @abstractmethod
    async def get_active_employees_count(self) -> int:
        """Get count of active employees"""
        pass
    
    @abstractmethod
    async def get_onboarding_in_progress_count(self) -> int:
        """Get count of employees currently in onboarding"""
        pass

    @abstractmethod
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics"""
        pass

    # ============================================================================
    # SETTINGS & CONFIGURATION
    # ============================================================================

    @abstractmethod
    async def get_hr_setting(self, setting_key: str) -> Optional[Dict[str, Any]]:
        """Get HR setting by key"""
        pass

    @abstractmethod
    async def update_hr_setting(self, setting_key: str, setting_value: Any) -> Dict[str, Any]:
        """Update HR setting"""
        pass

    @abstractmethod
    async def get_all_hr_settings(self) -> Dict[str, Any]:
        """Get all HR settings"""
        pass

    # ============================================================================
    # NOTIFICATIONS & COMMUNICATIONS
    # ============================================================================

    @abstractmethod
    async def create_notification(self, notification_data: Dict[str, Any]) -> Notification:
        """Create new notification"""
        pass

    @abstractmethod
    async def get_user_notifications(self, user_id: str) -> List[Notification]:
        """Get all notifications for a user"""
        pass

    @abstractmethod
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark notification as read"""
        pass

    @abstractmethod
    async def send_email(self, email_data: Dict[str, Any]) -> bool:
        """Send email and log it"""
        pass

    # ============================================================================
    # AUDIT & LOGGING
    # ============================================================================

    @abstractmethod
    async def create_audit_log(self, audit_data: Dict[str, Any]) -> AuditLog:
        """Create audit log entry"""
        pass

    @abstractmethod
    async def get_audit_logs(self, filters: Optional[Dict[str, Any]] = None) -> List[AuditLog]:
        """Get audit logs with optional filters"""
        pass

    # ============================================================================
    # MANAGER REVIEW OPERATIONS
    # ============================================================================

    @abstractmethod
    async def get_pending_reviews(self, manager_id: str) -> List[Employee]:
        """Get employees pending manager review"""
        pass

    @abstractmethod
    async def approve_employee_documents(self, employee_id: str, approved_by: str) -> Employee:
        """Approve employee documents after manager review"""
        pass

    @abstractmethod
    async def request_document_revision(self, employee_id: str, manager_id: str, notes: str) -> Employee:
        """Request revision of employee documents"""
        pass

    # ============================================================================
    # STEP INVITATIONS
    # ============================================================================

    @abstractmethod
    async def create_step_invitation(self, invitation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create step invitation"""
        pass

    @abstractmethod
    async def get_step_invitations(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get step invitations with optional filters"""
        pass

    @abstractmethod
    async def get_step_invitation_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get step invitation by token"""
        pass

    # ============================================================================
    # EMAIL RECIPIENTS
    # ============================================================================

    @abstractmethod
    async def get_global_email_recipients(self) -> List[str]:
        """Get list of global email recipients"""
        pass

    @abstractmethod
    async def add_global_email_recipient(self, email: str, name: str, added_by: str) -> bool:
        """Add global email recipient"""
        pass

    @abstractmethod
    async def remove_global_email_recipient(self, email: str) -> bool:
        """Remove global email recipient"""
        pass

