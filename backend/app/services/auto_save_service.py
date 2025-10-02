"""
Auto-Save Service
Handles automatic saving of form data with debouncing and conflict detection
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from collections import defaultdict
import hashlib
from app.supabase_service_enhanced import SupabaseService
from app.services.draft_recovery import DraftRecoveryService

logger = logging.getLogger(__name__)

class AutoSaveService:
    """
    Service for automatic form data saving
    """
    
    def __init__(self):
        self.supabase = SupabaseService()
        self.draft_service = DraftRecoveryService()
        self.save_interval = 30  # seconds
        self.save_queue = defaultdict(dict)
        self.offline_queue = []
        self.last_save_time = defaultdict(datetime.utcnow)
        self.field_changes = defaultdict(dict)
        self.save_tasks = {}
        self.is_online = True
        self.max_retry_attempts = 3
        self.retry_delay = 5  # seconds
    
    async def queue_save(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        field_name: str,
        field_value: Any,
        session_id: Optional[str] = None,
        immediate: bool = False
    ) -> Dict:
        """
        Queue field change for auto-save
        """
        try:
            key = f"{employee_id}_{step_id}"
            
            # Track field change
            if key not in self.field_changes:
                self.field_changes[key] = {}
            
            self.field_changes[key][field_name] = {
                "value": field_value,
                "timestamp": datetime.utcnow().isoformat(),
                "session_id": session_id
            }
            
            # Update save queue
            if key not in self.save_queue:
                self.save_queue[key] = {
                    "employee_id": employee_id,
                    "property_id": property_id,
                    "step_id": step_id,
                    "fields": {},
                    "session_id": session_id
                }
            
            self.save_queue[key]["fields"][field_name] = field_value
            
            # Schedule save
            if immediate:
                await self._execute_save(key)
            else:
                await self._schedule_save(key)
            
            return {
                "queued": True,
                "field": field_name,
                "will_save_in": self.save_interval if not immediate else 0
            }
            
        except Exception as e:
            logger.error(f"Queue save error: {str(e)}")
            return {
                "queued": False,
                "error": str(e)
            }
    
    async def save_incremental(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        changed_fields: Dict,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Save only changed fields incrementally
        """
        try:
            # Get current data
            current_data = await self._get_current_data(employee_id, step_id)
            
            # Calculate what changed
            actual_changes = {}
            for field, value in changed_fields.items():
                if current_data.get(field) != value:
                    actual_changes[field] = value
            
            if not actual_changes:
                return {
                    "success": True,
                    "message": "No changes to save"
                }
            
            # Detect conflicts
            conflict = await self._detect_conflict(
                employee_id,
                step_id,
                actual_changes,
                session_id
            )
            
            if conflict:
                return await self._handle_conflict(
                    employee_id,
                    property_id,
                    step_id,
                    actual_changes,
                    conflict,
                    session_id
                )
            
            # Apply incremental changes
            updated_data = {**current_data, **actual_changes}
            
            # Save to database
            result = await self._save_to_database(
                employee_id,
                property_id,
                step_id,
                updated_data,
                session_id
            )
            
            return {
                "success": result["success"],
                "saved_fields": list(actual_changes.keys()),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Incremental save error: {str(e)}")
            
            # Add to offline queue if network error
            if self._is_network_error(e):
                await self._add_to_offline_queue(
                    employee_id,
                    property_id,
                    step_id,
                    changed_fields,
                    session_id
                )
            
            return {
                "success": False,
                "error": str(e),
                "queued_offline": self._is_network_error(e)
            }
    
    async def process_offline_queue(self) -> Dict:
        """
        Process queued saves when connection restored
        """
        if not self.offline_queue:
            return {"processed": 0, "failed": 0}
        
        processed = 0
        failed = 0
        failed_items = []
        
        while self.offline_queue:
            item = self.offline_queue.pop(0)
            
            try:
                result = await self.save_incremental(
                    employee_id=item["employee_id"],
                    property_id=item["property_id"],
                    step_id=item["step_id"],
                    changed_fields=item["fields"],
                    session_id=item.get("session_id")
                )
                
                if result["success"]:
                    processed += 1
                else:
                    failed += 1
                    failed_items.append(item)
                    
            except Exception as e:
                logger.error(f"Offline queue processing error: {str(e)}")
                failed += 1
                failed_items.append(item)
        
        # Re-queue failed items
        self.offline_queue.extend(failed_items)
        
        return {
            "processed": processed,
            "failed": failed,
            "remaining": len(self.offline_queue)
        }
    
    async def detect_online_status(self) -> bool:
        """
        Detect if connection is available
        """
        try:
            # Try a simple database ping
            await self.supabase.client.table("employees").select("id").limit(1).execute()
            self.is_online = True
            
            # Process offline queue if back online
            if self.offline_queue:
                asyncio.create_task(self.process_offline_queue())
            
            return True
            
        except Exception:
            self.is_online = False
            return False
    
    async def manage_save_queue(self) -> None:
        """
        Background task to manage save queue
        """
        while True:
            try:
                current_time = datetime.utcnow()
                
                for key, data in list(self.save_queue.items()):
                    last_save = self.last_save_time.get(key, datetime.min)
                    time_since_save = (current_time - last_save).seconds
                    
                    if time_since_save >= self.save_interval:
                        await self._execute_save(key)
                
                # Check online status periodically
                await self.detect_online_status()
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Save queue management error: {str(e)}")
                await asyncio.sleep(5)
    
    async def force_save_all(self) -> Dict:
        """
        Force save all queued changes immediately
        """
        results = {
            "saved": [],
            "failed": []
        }
        
        for key in list(self.save_queue.keys()):
            try:
                result = await self._execute_save(key)
                if result["success"]:
                    results["saved"].append(key)
                else:
                    results["failed"].append(key)
            except Exception as e:
                logger.error(f"Force save error for {key}: {str(e)}")
                results["failed"].append(key)
        
        return results
    
    # Helper methods
    async def _schedule_save(self, key: str) -> None:
        """
        Schedule a debounced save
        """
        # Cancel existing task if any
        if key in self.save_tasks:
            self.save_tasks[key].cancel()
        
        # Create new save task
        self.save_tasks[key] = asyncio.create_task(
            self._delayed_save(key)
        )
    
    async def _delayed_save(self, key: str) -> None:
        """
        Execute save after delay
        """
        await asyncio.sleep(self.save_interval)
        await self._execute_save(key)
    
    async def _execute_save(self, key: str) -> Dict:
        """
        Execute the actual save
        """
        if key not in self.save_queue:
            return {"success": False, "error": "No data to save"}
        
        data = self.save_queue[key]
        
        try:
            result = await self.save_incremental(
                employee_id=data["employee_id"],
                property_id=data["property_id"],
                step_id=data["step_id"],
                changed_fields=data["fields"],
                session_id=data.get("session_id")
            )
            
            if result["success"]:
                # Clear from queue
                del self.save_queue[key]
                if key in self.field_changes:
                    del self.field_changes[key]
                self.last_save_time[key] = datetime.utcnow()
            
            return result
            
        except Exception as e:
            logger.error(f"Execute save error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_current_data(
        self,
        employee_id: str,
        step_id: str
    ) -> Dict:
        """
        Get current saved data for a step
        """
        try:
            # Try to get from draft first
            draft = await self.draft_service.recover_draft(employee_id, step_id)
            if draft:
                return draft["data"]
            
            # Otherwise get from main storage
            employee = await self.supabase.get_employee_by_id(employee_id)
            if employee:
                onboarding_data = employee.get("onboarding_data", {})
                return onboarding_data.get(step_id, {})
            
            return {}
            
        except Exception:
            return {}
    
    async def _detect_conflict(
        self,
        employee_id: str,
        step_id: str,
        changes: Dict,
        session_id: Optional[str]
    ) -> Optional[Dict]:
        """
        Detect if there's a conflict with another session
        """
        try:
            # Get recent changes from other sessions
            key = f"{employee_id}_{step_id}"
            if key not in self.field_changes:
                return None
            
            for field, change_info in self.field_changes[key].items():
                if field in changes:
                    if change_info.get("session_id") != session_id:
                        # Someone else changed this field
                        change_time = datetime.fromisoformat(change_info["timestamp"])
                        if (datetime.utcnow() - change_time).seconds < 60:
                            return {
                                "field": field,
                                "other_session": change_info.get("session_id"),
                                "other_value": change_info["value"],
                                "conflict_time": change_info["timestamp"]
                            }
            
            return None
            
        except Exception:
            return None
    
    async def _handle_conflict(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        changes: Dict,
        conflict: Dict,
        session_id: Optional[str]
    ) -> Dict:
        """
        Handle save conflict
        """
        # For auto-save, we'll use last-write-wins strategy
        # but notify about the conflict
        
        result = await self._save_to_database(
            employee_id,
            property_id,
            step_id,
            changes,
            session_id
        )
        
        return {
            "success": result["success"],
            "conflict_resolved": True,
            "conflict_field": conflict["field"],
            "resolution": "last_write_wins",
            "overwritten_value": conflict["other_value"]
        }
    
    async def _save_to_database(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        data: Dict,
        session_id: Optional[str]
    ) -> Dict:
        """
        Save data to database with retry logic
        """
        attempts = 0
        last_error = None
        
        while attempts < self.max_retry_attempts:
            try:
                # Save as draft
                result = await self.draft_service.save_draft(
                    employee_id=employee_id,
                    property_id=property_id,
                    step_id=step_id,
                    data=data,
                    session_id=session_id
                )
                
                if result["success"]:
                    return result
                
                last_error = result.get("error")
                attempts += 1
                
                if attempts < self.max_retry_attempts:
                    await asyncio.sleep(self.retry_delay * attempts)
                    
            except Exception as e:
                last_error = str(e)
                attempts += 1
                
                if attempts < self.max_retry_attempts:
                    await asyncio.sleep(self.retry_delay * attempts)
        
        return {
            "success": False,
            "error": last_error,
            "attempts": attempts
        }
    
    async def _add_to_offline_queue(
        self,
        employee_id: str,
        property_id: str,
        step_id: str,
        fields: Dict,
        session_id: Optional[str]
    ) -> None:
        """
        Add save to offline queue
        """
        self.offline_queue.append({
            "employee_id": employee_id,
            "property_id": property_id,
            "step_id": step_id,
            "fields": fields,
            "session_id": session_id,
            "queued_at": datetime.utcnow().isoformat()
        })
        
        logger.info(f"Added to offline queue: {employee_id}/{step_id}")
    
    def _is_network_error(self, error: Exception) -> bool:
        """
        Check if error is network-related
        """
        network_errors = [
            "connection",
            "timeout",
            "network",
            "unreachable",
            "refused"
        ]
        
        error_str = str(error).lower()
        return any(err in error_str for err in network_errors)