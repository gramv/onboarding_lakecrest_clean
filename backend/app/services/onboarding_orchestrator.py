"""
Onboarding Orchestrator Service - Supabase Version
Manages the complete onboarding workflow and state transitions
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
import uuid
import logging
from ..models_enhanced import (
    OnboardingSession, OnboardingStatus, OnboardingStep, OnboardingPhase,
    Employee, FormType, SignatureType, AuditEntry, ComplianceCheck,
    generate_secure_token, calculate_expiry_time
)

logger = logging.getLogger(__name__)

class OnboardingOrchestrator:
    """
    Core service for managing onboarding workflow and state transitions
    Handles the three-phase workflow: Employee → Manager → HR
    """
    
    def __init__(self, supabase_service):
        self.supabase_service = supabase_service
        self.default_expiry_hours = 72
        self.total_onboarding_steps = 18
        
        # Define step sequences for each phase
        self.employee_steps = [
            OnboardingStep.WELCOME,
            OnboardingStep.PERSONAL_INFO,
            OnboardingStep.I9_SECTION1,
            OnboardingStep.W4_FORM,
            OnboardingStep.EMERGENCY_CONTACTS,
            OnboardingStep.DIRECT_DEPOSIT,
            OnboardingStep.HEALTH_INSURANCE,
            OnboardingStep.COMPANY_POLICIES,
            OnboardingStep.TRAFFICKING_AWARENESS,
            OnboardingStep.WEAPONS_POLICY,
            OnboardingStep.BACKGROUND_CHECK,
            OnboardingStep.EMPLOYEE_SIGNATURE
        ]
        
        self.manager_steps = [
            OnboardingStep.MANAGER_REVIEW,
            OnboardingStep.I9_SECTION2,
            OnboardingStep.MANAGER_SIGNATURE
        ]
        
        self.hr_steps = [
            OnboardingStep.HR_REVIEW,
            OnboardingStep.COMPLIANCE_CHECK,
            OnboardingStep.HR_APPROVAL
        ]
    
    async def initiate_onboarding(
        self,
        application_id: str,
        employee_id: str,
        property_id: str,
        manager_id: str,
        expires_hours: int = None
    ) -> OnboardingSession:
        """
        Initiate a new onboarding session
        """
        try:
            expires_hours = expires_hours or self.default_expiry_hours
            
            # Create onboarding session
            session = OnboardingSession(
                id=str(uuid.uuid4()),
                application_id=application_id,
                employee_id=employee_id,
                property_id=property_id,
                manager_id=manager_id,
                token=generate_secure_token(),
                status=OnboardingStatus.IN_PROGRESS,
                phase=OnboardingPhase.EMPLOYEE,
                current_step=OnboardingStep.WELCOME,
                expires_at=calculate_expiry_time(expires_hours),
                created_at=datetime.now(timezone.utc)
            )
            
            # Store session in Supabase - pass individual parameters
            await self.supabase_service.create_onboarding_session(
                employee_id=session.employee_id,
                property_id=session.property_id,
                manager_id=session.manager_id,
                expires_hours=expires_hours
            )
            
            # Update employee record
            employee = await self.supabase_service.get_employee_by_id(employee_id)
            if employee:
                await self.supabase_service.update_employee_onboarding_status(
                    employee_id, OnboardingStatus.IN_PROGRESS, session.id
                )
            
            logger.info(f"Onboarding session initiated: {session.id}")
            return session
            
        except Exception as e:
            logger.error(f"Failed to initiate onboarding: {e}")
            raise
    
    async def get_session_by_token(self, token: str) -> Optional[OnboardingSession]:
        """
        Get onboarding session by token
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_token(token)
            
            # Check if session is expired
            if session and hasattr(session, 'expires_at') and session.expires_at:
                from datetime import datetime, timezone
                if datetime.now(timezone.utc) > session.expires_at:
                    await self._expire_session(session.id)
                    return None
                
            return session
            
        except Exception as e:
            logger.error(f"Failed to get session by token: {e}")
            return None
    
    async def get_session_by_id(self, session_id: str) -> Optional[OnboardingSession]:
        """
        Get onboarding session by ID
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                return None
                
            # Check if session is expired
            if hasattr(session, 'expires_at') and session.expires_at:
                from datetime import datetime, timezone
                if datetime.now(timezone.utc) > session.expires_at:
                    await self._expire_session(session_id)
                    return None
                
            return session
            
        except Exception as e:
            logger.error(f"Failed to get session by ID: {e}")
            return None
    
    async def update_step_progress(
        self,
        session_id: str,
        step: OnboardingStep,
        form_data: Dict[str, Any] = None,
        signature_data: Dict[str, Any] = None
    ) -> bool:
        """
        Update progress for a specific onboarding step
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                logger.error(f"Session {session_id} not found")
                return False
                
            if session.is_expired():
                await self._expire_session(session_id)
                return False
            
            # Update session progress
            session.current_step = step
            session.updated_at = datetime.now(timezone.utc)
            
            # Store form data if provided
            if form_data:
                await self.supabase_service.store_onboarding_form_data(
                    session_id, step, form_data
                )
            
            # Store signature data if provided
            if signature_data:
                await self.supabase_service.store_onboarding_signature(
                    session_id, step, signature_data
                )
            
            # Update session in Supabase
            await self.supabase_service.update_onboarding_session(session)
            
            # Check if phase is complete
            await self._check_phase_completion(session)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update step progress: {e}")
            return False
    
    async def complete_employee_phase(self, session_id: str) -> bool:
        """
        Complete employee phase and transition to manager review
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                return False
                
            # Update session to manager review phase
            session.phase = OnboardingPhase.MANAGER
            session.status = OnboardingStatus.MANAGER_REVIEW
            session.current_step = OnboardingStep.MANAGER_REVIEW
            session.updated_at = datetime.now(timezone.utc)
            
            await self.supabase_service.update_onboarding_session(session)
            
            # Update employee status
            await self.supabase_service.update_employee_onboarding_status(
                session.employee_id, OnboardingStatus.MANAGER_REVIEW
            )
            
            logger.info(f"Employee phase completed for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete employee phase: {e}")
            return False
    
    async def complete_manager_phase(self, session_id: str) -> bool:
        """
        Complete manager phase and transition to HR approval
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                return False
                
            # Update session to HR approval phase
            session.phase = OnboardingPhase.HR
            session.status = OnboardingStatus.HR_APPROVAL
            session.current_step = OnboardingStep.HR_REVIEW
            session.updated_at = datetime.now(timezone.utc)
            
            await self.supabase_service.update_onboarding_session(session)
            
            # Update employee status
            await self.supabase_service.update_employee_onboarding_status(
                session.employee_id, OnboardingStatus.HR_APPROVAL
            )
            
            logger.info(f"Manager phase completed for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete manager phase: {e}")
            return False
    
    async def approve_onboarding(self, session_id: str, approved_by: str) -> bool:
        """
        Approve onboarding and complete the process
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                return False
                
            # Update session to approved
            session.status = OnboardingStatus.APPROVED
            session.approved_by = approved_by
            session.approved_at = datetime.now(timezone.utc)
            session.updated_at = datetime.now(timezone.utc)
            
            await self.supabase_service.update_onboarding_session(session)
            
            # Update employee status
            await self.supabase_service.update_employee_onboarding_status(
                session.employee_id, OnboardingStatus.APPROVED
            )
            
            logger.info(f"Onboarding approved for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to approve onboarding: {e}")
            return False
    
    async def reject_onboarding(
        self,
        session_id: str,
        rejected_by: str,
        rejection_reason: str
    ) -> bool:
        """
        Reject onboarding with reason
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if not session:
                return False
                
            # Update session to rejected
            session.status = OnboardingStatus.REJECTED
            session.rejected_by = rejected_by
            session.rejection_reason = rejection_reason
            session.rejected_at = datetime.now(timezone.utc)
            session.updated_at = datetime.now(timezone.utc)
            
            await self.supabase_service.update_onboarding_session(session)
            
            # Update employee status
            await self.supabase_service.update_employee_onboarding_status(
                session.employee_id, OnboardingStatus.REJECTED
            )
            
            logger.info(f"Onboarding rejected for session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reject onboarding: {e}")
            return False
    
    async def get_pending_manager_reviews(self, manager_id: str) -> List[OnboardingSession]:
        """
        Get onboarding sessions pending manager review
        """
        try:
            return await self.supabase_service.get_onboarding_sessions_by_manager_and_status(
                manager_id, OnboardingStatus.MANAGER_REVIEW
            )
        except Exception as e:
            logger.error(f"Failed to get pending manager reviews: {e}")
            return []
    
    async def get_pending_hr_approvals(self) -> List[OnboardingSession]:
        """
        Get onboarding sessions pending HR approval
        """
        try:
            return await self.supabase_service.get_onboarding_sessions_by_status(
                OnboardingStatus.HR_APPROVAL
            )
        except Exception as e:
            logger.error(f"Failed to get pending HR approvals: {e}")
            return []
    
    async def _check_phase_completion(self, session: OnboardingSession) -> None:
        """
        Check if current phase is complete and auto-transition if needed
        """
        try:
            if session.phase == OnboardingPhase.EMPLOYEE:
                if session.current_step == OnboardingStep.EMPLOYEE_SIGNATURE:
                    await self.complete_employee_phase(session.id)
            elif session.phase == OnboardingPhase.MANAGER:
                if session.current_step == OnboardingStep.MANAGER_SIGNATURE:
                    await self.complete_manager_phase(session.id)
        except Exception as e:
            logger.error(f"Failed to check phase completion: {e}")
    
    async def _expire_session(self, session_id: str) -> None:
        """
        Mark session as expired
        """
        try:
            session = await self.supabase_service.get_onboarding_session_by_id(session_id)
            
            if session:
                session.status = OnboardingStatus.EXPIRED
                session.updated_at = datetime.now(timezone.utc)
                
                await self.supabase_service.update_onboarding_session(session)
                
                # Update employee status
                await self.supabase_service.update_employee_onboarding_status(
                    session.employee_id, OnboardingStatus.EXPIRED
                )
                
        except Exception as e:
            logger.error(f"Failed to expire session: {e}")
    
    async def create_audit_entry(
        self,
        session_id: str,
        action: str,
        user_id: str,
        details: Dict[str, Any] = None
    ) -> None:
        """
        Create audit trail entry
        """
        try:
            await self.supabase_service.create_audit_entry(
                action=action,
                entity_type="onboarding_session",
                entity_id=session_id,
                user_id=user_id,
                details=details
            )
            
        except Exception as e:
            logger.error(f"Failed to create audit entry: {e}")
