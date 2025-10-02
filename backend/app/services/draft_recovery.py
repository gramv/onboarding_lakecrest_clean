"""
Draft Recovery Service
Handles draft saving, recovery, and conflict resolution for onboarding forms
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4
import hashlib
from app.supabase_service_enhanced import SupabaseService
from app.email_service import EmailService

logger = logging.getLogger(__name__)

class DraftRecoveryService:
    """
    Service for managing draft saves and recovery
    """
    
    def __init__(self):
        self.supabase = SupabaseService()
        self.email_service = EmailService()
        self.draft_expiry_days = 7
        self.max_versions = 10
    
    async def save_draft(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        data: Dict,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Save a draft with versioning
        """
        try:
            # Generate draft ID and version
            draft_id = f"draft_{employee_id}_{step_id}"
            version_id = str(uuid4())
            
            # Calculate data hash for conflict detection
            data_hash = self._calculate_hash(data)
            
            # Get existing drafts
            existing_drafts = await self._get_drafts(employee_id, step_id)
            
            # Check for conflicts
            conflict = None
            if existing_drafts:
                latest_draft = existing_drafts[0]
                if latest_draft.get("data_hash") != data_hash:
                    # Check if someone else modified it
                    if latest_draft.get("session_id") != session_id:
                        conflict = {
                            "type": "concurrent_edit",
                            "last_modified_by": latest_draft.get("user_id"),
                            "last_modified_at": latest_draft.get("created_at")
                        }
            
            # Save new draft version
            draft_record = {
                "id": draft_id,
                "version_id": version_id,
                "employee_id": employee_id,
                "property_id": property_id,
                "step_id": step_id,
                "data": data,
                "data_hash": data_hash,
                "user_id": user_id,
                "session_id": session_id,
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(days=self.draft_expiry_days)).isoformat(),
                "conflict": conflict,
                "is_latest": True
            }
            
            # Mark previous versions as not latest
            if existing_drafts:
                await self._mark_drafts_not_latest(employee_id, step_id)
            
            # Store draft
            result = await self.supabase.client.table("onboarding_drafts").insert(draft_record).execute()
            
            # Clean up old versions
            await self._cleanup_old_versions(employee_id, step_id)
            
            return {
                "success": True,
                "draft_id": draft_id,
                "version_id": version_id,
                "conflict": conflict,
                "saved_at": draft_record["created_at"]
            }
            
        except Exception as e:
            logger.error(f"Draft save error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def recover_draft(
        self,
        employee_id: str,
        step_id: str,
        version_id: Optional[str] = None
    ) -> Optional[Dict]:
        """
        Recover a saved draft
        """
        try:
            if version_id:
                # Get specific version
                result = await self.supabase.client.table("onboarding_drafts")\
                    .select("*")\
                    .eq("employee_id", employee_id)\
                    .eq("step_id", step_id)\
                    .eq("version_id", version_id)\
                    .single()\
                    .execute()
            else:
                # Get latest version
                result = await self.supabase.client.table("onboarding_drafts")\
                    .select("*")\
                    .eq("employee_id", employee_id)\
                    .eq("step_id", step_id)\
                    .eq("is_latest", True)\
                    .single()\
                    .execute()
            
            if result.data:
                draft = result.data
                
                # Check if expired
                expires_at = datetime.fromisoformat(draft["expires_at"])
                if datetime.utcnow() > expires_at:
                    logger.info(f"Draft expired for employee {employee_id}, step {step_id}")
                    return None
                
                return {
                    "draft_id": draft["id"],
                    "version_id": draft["version_id"],
                    "data": draft["data"],
                    "saved_at": draft["created_at"],
                    "expires_at": draft["expires_at"],
                    "conflict": draft.get("conflict")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Draft recovery error: {str(e)}")
            return None
    
    async def auto_recover_session(
        self,
        employee_id: str,
        session_id: str
    ) -> Dict:
        """
        Auto-recover all drafts for a session after timeout
        """
        try:
            # Get all drafts for the session
            result = await self.supabase.client.table("onboarding_drafts")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("session_id", session_id)\
                .eq("is_latest", True)\
                .execute()
            
            drafts = result.data if result.data else []
            
            # Group by step
            recovered_steps = {}
            for draft in drafts:
                step_id = draft["step_id"]
                expires_at = datetime.fromisoformat(draft["expires_at"])
                
                if datetime.utcnow() <= expires_at:
                    recovered_steps[step_id] = {
                        "data": draft["data"],
                        "saved_at": draft["created_at"]
                    }
            
            return {
                "success": True,
                "recovered_steps": recovered_steps,
                "recovery_time": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Session recovery error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def resolve_conflict(
        self,
        employee_id: str,
        step_id: str,
        resolution_strategy: str = "merge",
        chosen_version: Optional[str] = None
    ) -> Dict:
        """
        Resolve conflicts between draft versions
        """
        try:
            # Get all recent versions
            drafts = await self._get_drafts(employee_id, step_id, limit=2)
            
            if len(drafts) < 2:
                return {
                    "success": False,
                    "error": "No conflict to resolve"
                }
            
            current_draft = drafts[0]
            previous_draft = drafts[1]
            
            resolved_data = {}
            
            if resolution_strategy == "use_latest":
                resolved_data = current_draft["data"]
            elif resolution_strategy == "use_previous":
                resolved_data = previous_draft["data"]
            elif resolution_strategy == "merge":
                # Merge non-conflicting fields
                resolved_data = self._merge_drafts(
                    current_draft["data"],
                    previous_draft["data"]
                )
            elif resolution_strategy == "use_version" and chosen_version:
                # Use specific version
                specific_draft = await self.recover_draft(
                    employee_id,
                    step_id,
                    chosen_version
                )
                if specific_draft:
                    resolved_data = specific_draft["data"]
            
            # Save resolved version
            result = await self.save_draft(
                employee_id=employee_id,
                property_id=current_draft["property_id"],
                step_id=step_id,
                data=resolved_data,
                user_id=current_draft.get("user_id"),
                session_id=current_draft.get("session_id")
            )
            
            return {
                "success": True,
                "resolved_data": resolved_data,
                "resolution_strategy": resolution_strategy
            }
            
        except Exception as e:
            logger.error(f"Conflict resolution error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_recovery_email(
        self,
        employee_id: str,
        email: str,
        property_id: str
    ) -> bool:
        """
        Send draft recovery email to employee
        """
        try:
            # Generate recovery token
            recovery_token = str(uuid4())
            expires_at = datetime.utcnow() + timedelta(hours=48)
            
            # Store recovery token
            await self.supabase.client.table("recovery_tokens").insert({
                "token": recovery_token,
                "employee_id": employee_id,
                "property_id": property_id,
                "expires_at": expires_at.isoformat(),
                "used": False
            }).execute()
            
            # Generate recovery URL
            recovery_url = f"https://onboarding.example.com/recover?token={recovery_token}"
            
            # Send email
            email_data = {
                "to": email,
                "subject": "Continue Your Onboarding Process",
                "template": "draft_recovery",
                "data": {
                    "recovery_url": recovery_url,
                    "expires_in": "48 hours",
                    "employee_id": employee_id
                }
            }
            
            await self.email_service.send_email(email_data)
            
            logger.info(f"Recovery email sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Recovery email error: {str(e)}")
            return False
    
    async def cleanup_expired_drafts(self) -> int:
        """
        Clean up expired drafts (scheduled task)
        """
        try:
            cutoff_date = datetime.utcnow().isoformat()
            
            # Delete expired drafts
            result = await self.supabase.client.table("onboarding_drafts")\
                .delete()\
                .lt("expires_at", cutoff_date)\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_count} expired drafts")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Draft cleanup error: {str(e)}")
            return 0
    
    async def get_draft_history(
        self,
        employee_id: str,
        step_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Get draft history for an employee
        """
        try:
            query = self.supabase.client.table("onboarding_drafts")\
                .select("*")\
                .eq("employee_id", employee_id)
            
            if step_id:
                query = query.eq("step_id", step_id)
            
            result = await query.order("created_at", desc=True).execute()
            
            history = []
            for draft in (result.data or []):
                history.append({
                    "version_id": draft["version_id"],
                    "step_id": draft["step_id"],
                    "saved_at": draft["created_at"],
                    "expires_at": draft["expires_at"],
                    "is_latest": draft.get("is_latest", False),
                    "has_conflict": draft.get("conflict") is not None
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Draft history error: {str(e)}")
            return []
    
    # Helper methods
    def _calculate_hash(self, data: Dict) -> str:
        """
        Calculate hash of data for comparison
        """
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    async def _get_drafts(
        self,
        employee_id: str,
        step_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get drafts for an employee and step
        """
        try:
            result = await self.supabase.client.table("onboarding_drafts")\
                .select("*")\
                .eq("employee_id", employee_id)\
                .eq("step_id", step_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
        except:
            return []
    
    async def _mark_drafts_not_latest(
        self,
        employee_id: str,
        step_id: str
    ) -> None:
        """
        Mark all drafts as not latest
        """
        try:
            await self.supabase.client.table("onboarding_drafts")\
                .update({"is_latest": False})\
                .eq("employee_id", employee_id)\
                .eq("step_id", step_id)\
                .execute()
        except Exception as e:
            logger.error(f"Error marking drafts: {str(e)}")
    
    async def _cleanup_old_versions(
        self,
        employee_id: str,
        step_id: str
    ) -> None:
        """
        Keep only the most recent versions
        """
        try:
            # Get all versions
            drafts = await self._get_drafts(employee_id, step_id, limit=100)
            
            if len(drafts) > self.max_versions:
                # Delete old versions
                to_delete = drafts[self.max_versions:]
                for draft in to_delete:
                    await self.supabase.client.table("onboarding_drafts")\
                        .delete()\
                        .eq("version_id", draft["version_id"])\
                        .execute()
        except Exception as e:
            logger.error(f"Version cleanup error: {str(e)}")
    
    def _merge_drafts(self, current: Dict, previous: Dict) -> Dict:
        """
        Merge two draft versions intelligently
        """
        merged = {}
        
        # Take all fields from current
        merged.update(current)
        
        # Add fields from previous that don't exist in current
        for key, value in previous.items():
            if key not in merged or merged[key] is None or merged[key] == "":
                merged[key] = value
        
        return merged