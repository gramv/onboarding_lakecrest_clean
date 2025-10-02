"""
Form Update Service - Supabase Version
Handles individual form updates without full re-onboarding
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import uuid
import logging
from ..models_enhanced import (
    FormUpdateSession, FormType, Employee, generate_secure_token,
    calculate_expiry_time, AuditEntry
)

logger = logging.getLogger(__name__)

class FormUpdateService:
    """
    Service for handling individual form updates
    Allows HR to send specific forms to employees for updates
    """
    
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service
        self.default_expiry_hours = 48
    
    async def create_form_update_session(
        self,
        employee_id: str,
        form_type: FormType,
        requested_by: str,
        expires_hours: int = None
    ) -> FormUpdateSession:
        """
        Create a new form update session
        """
        try:
            expires_hours = expires_hours or self.default_expiry_hours
            
            # Get current employee data
            employee = await self.supabase_service.get_employee_by_id(employee_id)
            if not employee:
                raise ValueError(f"Employee {employee_id} not found")
            
            # Create form update session
            session = FormUpdateSession(
                id=str(uuid.uuid4()),
                employee_id=employee_id,
                form_type=form_type,
                update_token=generate_secure_token(),
                requested_by=requested_by,
                current_data=self._extract_current_form_data(employee, form_type),
                expires_at=calculate_expiry_time(expires_hours),
                created_at=datetime.utcnow()
            )
            
            # Store session in Supabase
            await self.supabase_service.create_form_update_session(session)
            
            logger.info(f"Form update session created: {session.id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to create form update session: {e}")
            raise
    
    async def get_session_by_token(self, token: str) -> Optional[FormUpdateSession]:
        """
        Get form update session by token
        """
        try:
            session = await self.supabase_service.get_form_update_session_by_token(token)
            
            if session and session.is_expired():
                await self._expire_session(session.id)
                return None
                
            return session
            
        except Exception as e:
            logger.error(f"Failed to get session by token: {e}")
            return None
    
    async def submit_form_update(
        self,
        session_id: str,
        updated_data: Dict[str, Any],
        signature_data: Dict[str, Any] = None
    ) -> bool:
        """
        Submit form update with new data
        """
        try:
            session = await self.supabase_service.get_form_update_session_by_id(session_id)
            
            if not session:
                logger.error(f"Session {session_id} not found")
                return False
                
            if session.is_expired():
                await self._expire_session(session_id)
                return False
            
            # Update session with new data
            session.updated_data = updated_data
            session.signature_data = signature_data
            session.completed_at = datetime.utcnow()
            session.updated_at = datetime.utcnow()
            
            await self.supabase_service.update_form_update_session(session)
            
            # Apply updates to employee record
            await self._apply_form_updates(session)
            
            logger.info(f"Form update submitted for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to submit form update: {e}")
            return False
    
    async def get_pending_updates_for_employee(self, employee_id: str) -> List[FormUpdateSession]:
        """
        Get pending form update sessions for employee
        """
        try:
            return await self.supabase_service.get_form_update_sessions_by_employee(
                employee_id, completed=False
            )
        except Exception as e:
            logger.error(f"Failed to get pending updates: {e}")
            return []
    
    async def get_completed_updates_for_employee(self, employee_id: str) -> List[FormUpdateSession]:
        """
        Get completed form update sessions for employee
        """
        try:
            return await self.supabase_service.get_form_update_sessions_by_employee(
                employee_id, completed=True
            )
        except Exception as e:
            logger.error(f"Failed to get completed updates: {e}")
            return []
    
    def _extract_current_form_data(self, employee: Employee, form_type: FormType) -> Dict[str, Any]:
        """
        Extract current form data from employee record
        """
        try:
            if form_type == FormType.PERSONAL_INFO:
                return employee.personal_info or {}
            elif form_type == FormType.W4:
                return employee.w4_data or {}
            elif form_type == FormType.EMERGENCY_CONTACTS:
                return employee.emergency_contacts or {}
            elif form_type == FormType.DIRECT_DEPOSIT:
                return employee.direct_deposit or {}
            elif form_type == FormType.HEALTH_INSURANCE:
                return employee.health_insurance or {}
            else:
                return {}
        except Exception as e:
            logger.error(f"Failed to extract form data: {e}")
            return {}
    
    async def _apply_form_updates(self, session: FormUpdateSession) -> None:
        """
        Apply form updates to employee record
        """
        try:
            employee = await self.supabase_service.get_employee_by_id(session.employee_id)
            if not employee:
                return
            
            # Apply updates based on form type
            if session.form_type == FormType.PERSONAL_INFO:
                employee.personal_info.update(session.updated_data)
            elif session.form_type == FormType.W4:
                employee.w4_data.update(session.updated_data)
            elif session.form_type == FormType.EMERGENCY_CONTACTS:
                employee.emergency_contacts.update(session.updated_data)
            elif session.form_type == FormType.DIRECT_DEPOSIT:
                employee.direct_deposit.update(session.updated_data)
            elif session.form_type == FormType.HEALTH_INSURANCE:
                employee.health_insurance.update(session.updated_data)
            
            # Update employee record
            employee.updated_at = datetime.utcnow()
            await self.supabase_service.update_employee(employee)
            
            # Create audit entry
            await self._create_audit_entry(session)
            
        except Exception as e:
            logger.error(f"Failed to apply form updates: {e}")
    
    async def _expire_session(self, session_id: str) -> None:
        """
        Mark session as expired
        """
        try:
            session = await self.supabase_service.get_form_update_session_by_id(session_id)
            
            if session:
                session.expired = True
                session.updated_at = datetime.utcnow()
                
                await self.supabase_service.update_form_update_session(session)
                
        except Exception as e:
            logger.error(f"Failed to expire session: {e}")
    
    async def _create_audit_entry(self, session: FormUpdateSession) -> None:
        """
        Create audit trail entry for form update
        """
        try:
            audit_entry = AuditEntry(
                id=str(uuid.uuid4()),
                session_id=session.id,
                action=f"form_update_{session.form_type.value}",
                user_id=session.employee_id,
                details={
                    "form_type": session.form_type.value,
                    "requested_by": session.requested_by,
                    "changes": session.updated_data
                },
                timestamp=datetime.utcnow()
            )
            
            await self.supabase_service.create_audit_entry(audit_entry)
            
        except Exception as e:
            logger.error(f"Failed to create audit entry: {e}")
