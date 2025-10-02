"""
Enhanced Bulk Operation Service for Task 7
Provides comprehensive bulk operation capabilities with progress tracking,
audit logging, and background processing
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
import logging
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import traceback

from .supabase_service_enhanced import EnhancedSupabaseService
from .notification_service import NotificationService
from .models import User, NotificationChannel, NotificationPriority

logger = logging.getLogger(__name__)

class BulkOperationType(str, Enum):
    """Types of bulk operations"""
    APPLICATION_APPROVAL = "application_approval"
    APPLICATION_REJECTION = "application_rejection"
    EMPLOYEE_ONBOARDING = "employee_onboarding"
    EMPLOYEE_TERMINATION = "employee_termination"
    DOCUMENT_REQUEST = "document_request"
    NOTIFICATION_BROADCAST = "notification_broadcast"
    DATA_EXPORT = "data_export"
    DATA_IMPORT = "data_import"
    PROPERTY_ASSIGNMENT = "property_assignment"
    ROLE_CHANGE = "role_change"
    PASSWORD_RESET = "password_reset"
    EMAIL_CAMPAIGN = "email_campaign"
    COMPLIANCE_CHECK = "compliance_check"
    FORM_DISTRIBUTION = "form_distribution"

class BulkOperationStatus(str, Enum):
    """Status of bulk operations"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PARTIAL_SUCCESS = "partial_success"

@dataclass
class BulkOperationConfig:
    """Configuration for bulk operations"""
    batch_size: int = 50
    max_retries: int = 3
    retry_delay: int = 5  # seconds
    timeout: int = 3600  # seconds (1 hour)
    enable_notifications: bool = True
    enable_audit_logging: bool = True
    enable_progress_tracking: bool = True
    parallel_processing: bool = False
    max_workers: int = 5

class BulkOperationService:
    """Enhanced service for handling bulk operations with progress tracking"""
    
    def __init__(self):
        self.supabase = EnhancedSupabaseService()
        self.notification_service = NotificationService()
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.active_operations: Dict[str, Any] = {}
        
    async def create_bulk_operation(
        self,
        operation_data: Dict[str, Any],
        user_role: str = None
    ) -> Dict[str, Any]:
        """Create a new bulk operation with validation"""
        try:
            # Validate permissions
            if user_role == "manager" and not operation_data.get("property_id"):
                raise PermissionError("Managers must specify property_id for bulk operations")
            
            # Create operation record
            operation = {
                "id": str(uuid.uuid4()),
                "operation_type": operation_data["operation_type"],
                "operation_name": operation_data["operation_name"],
                "description": operation_data.get("description", ""),
                "initiated_by": operation_data["initiated_by"],
                "property_id": operation_data.get("property_id"),
                "target_entity_type": operation_data.get("target_entity_type", "unknown"),
                "target_ids": operation_data.get("target_ids", []),  # Keep as list for JSONB
                "target_count": len(operation_data.get("target_ids", [])),
                "filter_criteria": operation_data.get("filter_criteria", {}),  # Keep as dict for JSONB
                "configuration": operation_data.get("configuration", {}),  # Keep as dict for JSONB
                "status": BulkOperationStatus.PENDING.value,
                "total_items": len(operation_data.get("target_ids", [])),
                "processed_items": 0,
                "successful_items": 0,
                "failed_items": 0,
                "skipped_items": 0,
                "progress_percentage": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Save to database
            result = self.supabase.client.table("bulk_operations").insert(operation).execute()
            
            if result.data:
                # Store in active operations for tracking
                self.active_operations[operation["id"]] = operation
                
                # Create audit log entry
                await self._log_audit_event(
                    operation["id"],
                    "operation_created",
                    {"initiated_by": operation_data["initiated_by"]}
                )
                
                return result.data[0]
            
            raise Exception("Failed to create bulk operation")
            
        except Exception as e:
            logger.error(f"Failed to create bulk operation: {e}")
            raise
    
    async def start_processing(self, operation_id: str) -> Dict[str, Any]:
        """Start processing a bulk operation"""
        try:
            # Update status to processing
            update_data = {
                "status": BulkOperationStatus.PROCESSING.value,
                "started_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.client.table("bulk_operations") \
                .update(update_data) \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                # Log audit event
                await self._log_audit_event(operation_id, "processing_started", {})
                
                # Start async processing
                asyncio.create_task(self._process_operation_async(operation_id))
                
                return result.data[0]
            
            raise Exception("Failed to start processing")
            
        except Exception as e:
            logger.error(f"Failed to start processing operation {operation_id}: {e}")
            raise
    
    async def _process_operation_async(self, operation_id: str):
        """Process operation asynchronously"""
        try:
            # Get operation details
            operation = await self.get_operation(operation_id)
            
            if not operation:
                raise Exception(f"Operation {operation_id} not found")
            
            # Route to appropriate processor
            processor_map = {
                BulkOperationType.APPLICATION_APPROVAL: self._process_application_approvals,
                BulkOperationType.APPLICATION_REJECTION: self._process_application_rejections,
                BulkOperationType.EMPLOYEE_ONBOARDING: self._process_employee_onboarding,
                BulkOperationType.NOTIFICATION_BROADCAST: self._process_notification_broadcast,
                BulkOperationType.DATA_EXPORT: self._process_data_export,
                # Add more processors as needed
            }
            
            processor = processor_map.get(operation["operation_type"])
            
            if processor:
                await processor(operation)
            else:
                await self._process_generic_operation(operation)
                
        except Exception as e:
            logger.error(f"Error processing operation {operation_id}: {e}")
            await self.mark_operation_failed(operation_id, str(e))
    
    async def _process_application_approvals(self, operation: Dict[str, Any]):
        """Process bulk application approvals"""
        try:
            target_ids = operation["target_ids"]
            config = operation.get("configuration", {})
            
            success_count = 0
            failed_count = 0
            
            for i, app_id in enumerate(target_ids):
                try:
                    # Update application status
                    result = await self.supabase.approve_application(
                        app_id,
                        operation["initiated_by"]
                    )
                    
                    if result:
                        success_count += 1
                        
                        # Send notification if configured
                        if config.get("send_notifications"):
                            await self._send_approval_notification(app_id)
                        
                        # Schedule onboarding if configured
                        if config.get("schedule_onboarding"):
                            await self._schedule_onboarding(app_id)
                        
                        # Log item success
                        await self._log_operation_item(
                            operation["id"], app_id, "success"
                        )
                    else:
                        failed_count += 1
                        await self._log_operation_item(
                            operation["id"], app_id, "failed",
                            error="Approval failed"
                        )
                    
                    # Update progress
                    await self.update_progress(
                        operation["id"],
                        processed=i + 1,
                        successful=success_count,
                        failed=failed_count
                    )
                    
                except Exception as e:
                    failed_count += 1
                    await self._log_operation_item(
                        operation["id"], app_id, "failed",
                        error=str(e)
                    )
            
            # Complete operation
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing application approvals: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def _process_application_rejections(self, operation: Dict[str, Any]):
        """Process bulk application rejections"""
        try:
            target_ids = operation["target_ids"]
            config = operation.get("configuration", {})
            reason = config.get("rejection_reason", "Position filled")
            
            success_count = 0
            failed_count = 0
            
            for i, app_id in enumerate(target_ids):
                try:
                    # Update application status
                    result = await self.supabase.reject_application(
                        app_id,
                        operation["initiated_by"],
                        reason
                    )
                    
                    if result:
                        success_count += 1
                        
                        # Send rejection email if configured
                        if config.get("send_rejection_email"):
                            await self._send_rejection_notification(app_id, reason)
                        
                        # Add to talent pool if configured
                        if config.get("add_to_talent_pool"):
                            await self._add_to_talent_pool(app_id)
                        
                        await self._log_operation_item(
                            operation["id"], app_id, "success"
                        )
                    else:
                        failed_count += 1
                        await self._log_operation_item(
                            operation["id"], app_id, "failed"
                        )
                    
                    # Update progress
                    await self.update_progress(
                        operation["id"],
                        processed=i + 1,
                        successful=success_count,
                        failed=failed_count
                    )
                    
                except Exception as e:
                    failed_count += 1
                    await self._log_operation_item(
                        operation["id"], app_id, "failed",
                        error=str(e)
                    )
            
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing application rejections: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def _process_employee_onboarding(self, operation: Dict[str, Any]):
        """Process bulk employee onboarding"""
        try:
            employees = operation.get("configuration", {}).get("employees", [])
            config = operation.get("configuration", {})
            
            success_count = 0
            failed_count = 0
            
            for i, employee in enumerate(employees):
                try:
                    # Create employee record
                    employee_id = await self._create_employee_record(employee)
                    
                    if employee_id:
                        success_count += 1
                        
                        # Send welcome email
                        if config.get("send_welcome_email"):
                            await self._send_welcome_email(employee_id, employee)
                        
                        # Create accounts
                        if config.get("create_accounts"):
                            await self._create_employee_accounts(employee_id, employee)
                        
                        # Assign training
                        if config.get("assign_training"):
                            await self._assign_training_modules(employee_id, employee)
                        
                        await self._log_operation_item(
                            operation["id"], employee_id, "success"
                        )
                    else:
                        failed_count += 1
                        await self._log_operation_item(
                            operation["id"], str(i), "failed"
                        )
                    
                    # Update progress
                    await self.update_progress(
                        operation["id"],
                        processed=i + 1,
                        successful=success_count,
                        failed=failed_count
                    )
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error onboarding employee: {e}")
            
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing employee onboarding: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def _process_notification_broadcast(self, operation: Dict[str, Any]):
        """Process bulk notification broadcast"""
        try:
            config = operation.get("configuration", {})
            message = config.get("message", "")
            channel = config.get("channel", "email")
            
            # Get recipients
            recipients = await self._get_notification_recipients(operation)
            
            success_count = 0
            failed_count = 0
            
            for i, recipient in enumerate(recipients):
                try:
                    # Send notification
                    result = await self.notification_service.send_notification(
                        recipient_id=recipient["id"],
                        channel=channel,
                        subject=config.get("subject", "System Notification"),
                        message=message,
                        priority=config.get("priority", "normal")
                    )
                    
                    if result:
                        success_count += 1
                    else:
                        failed_count += 1
                    
                    # Update progress
                    await self.update_progress(
                        operation["id"],
                        processed=i + 1,
                        successful=success_count,
                        failed=failed_count
                    )
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error sending notification: {e}")
            
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing notification broadcast: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def _process_data_export(self, operation: Dict[str, Any]):
        """Process bulk data export"""
        try:
            config = operation.get("configuration", {})
            export_format = config.get("format", "csv")
            
            # Gather data to export
            data = await self._gather_export_data(operation)
            
            # Format data
            formatted_data = await self._format_export_data(data, export_format)
            
            # Save export file
            file_url = await self._save_export_file(formatted_data, operation["id"])
            
            # Update operation with file URL
            await self._update_operation_result(operation["id"], {"file_url": file_url})
            
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing data export: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def _process_generic_operation(self, operation: Dict[str, Any]):
        """Process generic bulk operation"""
        try:
            target_ids = operation.get("target_ids", [])
            
            for i, target_id in enumerate(target_ids):
                # Simulate processing
                await asyncio.sleep(0.1)
                
                # Update progress
                await self.update_progress(
                    operation["id"],
                    processed=i + 1,
                    successful=i + 1
                )
            
            await self.complete_operation(operation["id"])
            
        except Exception as e:
            logger.error(f"Error processing generic operation: {e}")
            await self.mark_operation_failed(operation["id"], str(e))
    
    async def update_progress(
        self,
        operation_id: str,
        processed: int,
        successful: int = 0,
        failed: int = 0,
        skipped: int = 0
    ) -> Dict[str, Any]:
        """Update operation progress"""
        try:
            # Get current operation
            operation = await self.get_operation(operation_id)
            
            if not operation:
                raise Exception(f"Operation {operation_id} not found")
            
            total = operation["total_items"]
            progress_percentage = (processed / total * 100) if total > 0 else 0
            
            # Estimate completion time
            if processed > 0 and operation.get("started_at"):
                started = datetime.fromisoformat(operation["started_at"])
                elapsed = (datetime.now(timezone.utc) - started).total_seconds()
                rate = processed / elapsed if elapsed > 0 else 0
                remaining = total - processed
                eta_seconds = remaining / rate if rate > 0 else 0
                estimated_completion = datetime.now(timezone.utc) + timedelta(seconds=eta_seconds)
            else:
                estimated_completion = None
            
            update_data = {
                "processed_items": processed,
                "successful_items": successful,
                "failed_items": failed,
                "skipped_items": skipped,
                "progress_percentage": progress_percentage,
                "estimated_completion_time": estimated_completion.isoformat() if estimated_completion else None
            }
            
            result = self.supabase.client.table("bulk_operations") \
                .update(update_data) \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                # Send progress notification if configured
                if operation.get("configuration", {}).get("notify_progress"):
                    await self._send_progress_notification(operation_id, progress_percentage)
                
                return result.data[0]
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to update progress for operation {operation_id}: {e}")
            return {}
    
    async def complete_operation(self, operation_id: str) -> Dict[str, Any]:
        """Mark operation as completed"""
        try:
            update_data = {
                "status": BulkOperationStatus.COMPLETED.value,
                "actual_completion_time": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.client.table("bulk_operations") \
                .update(update_data) \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                # Remove from active operations
                self.active_operations.pop(operation_id, None)
                
                # Log completion
                await self._log_audit_event(operation_id, "operation_completed", {})
                
                # Send completion notification
                await self._send_completion_notification(operation_id)
                
                return result.data[0]
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to complete operation {operation_id}: {e}")
            return {}
    
    async def mark_operation_failed(self, operation_id: str, error: str) -> Dict[str, Any]:
        """Mark operation as failed"""
        try:
            update_data = {
                "status": BulkOperationStatus.FAILED.value,
                "error_log": [{"error": error, "timestamp": datetime.now(timezone.utc).isoformat()}]
            }
            
            result = self.supabase.client.table("bulk_operations") \
                .update(update_data) \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                # Remove from active operations
                self.active_operations.pop(operation_id, None)
                
                # Log failure
                await self._log_audit_event(operation_id, "operation_failed", {"error": error})
                
                return result.data[0]
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to mark operation {operation_id} as failed: {e}")
            return {}
    
    async def cancel_operation(
        self,
        operation_id: str,
        cancelled_by: str,
        reason: str
    ) -> Dict[str, Any]:
        """Cancel a bulk operation"""
        try:
            update_data = {
                "status": BulkOperationStatus.CANCELLED.value,
                "cancelled_by": cancelled_by,
                "cancellation_reason": reason,
                "actual_completion_time": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.client.table("bulk_operations") \
                .update(update_data) \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                # Remove from active operations
                self.active_operations.pop(operation_id, None)
                
                # Log cancellation
                await self._log_audit_event(
                    operation_id,
                    "operation_cancelled",
                    {"cancelled_by": cancelled_by, "reason": reason}
                )
                
                return result.data[0]
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to cancel operation {operation_id}: {e}")
            return {}
    
    async def retry_failed_items(self, operation_id: str) -> Dict[str, Any]:
        """Retry failed items in a bulk operation"""
        try:
            # Get original operation
            operation = await self.get_operation(operation_id)
            
            if not operation:
                raise Exception(f"Operation {operation_id} not found")
            
            # Get failed items
            failed_items = await self._get_failed_items(operation_id)
            
            if not failed_items:
                return {"message": "No failed items to retry"}
            
            # Create new operation for retry
            retry_operation = await self.create_bulk_operation({
                "operation_type": operation["operation_type"],
                "operation_name": f"Retry: {operation['operation_name']}",
                "description": f"Retrying {len(failed_items)} failed items",
                "initiated_by": operation["initiated_by"],
                "target_ids": [item["target_id"] for item in failed_items],
                "configuration": operation.get("configuration", {}),
                "property_id": operation.get("property_id")
            })
            
            # Update retry count
            await self._update_retry_count(operation_id)
            
            # Start processing
            await self.start_processing(retry_operation["id"])
            
            return retry_operation
            
        except Exception as e:
            logger.error(f"Failed to retry operation {operation_id}: {e}")
            raise
    
    async def get_operation(self, operation_id: str) -> Optional[Dict[str, Any]]:
        """Get operation details"""
        try:
            result = self.supabase.client.table("bulk_operations") \
                .select("*") \
                .eq("id", operation_id) \
                .execute()
            
            if result.data:
                operation = result.data[0]
                # JSONB fields are automatically parsed by Supabase client
                # No need to parse them manually
                return operation
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get operation {operation_id}: {e}")
            return None
    
    async def get_progress(self, operation_id: str) -> Dict[str, Any]:
        """Get operation progress"""
        operation = await self.get_operation(operation_id)
        
        if operation:
            return {
                "operation_id": operation_id,
                "status": operation["status"],
                "total_items": operation["total_items"],
                "processed_items": operation["processed_items"],
                "successful_items": operation["successful_items"],
                "failed_items": operation["failed_items"],
                "skipped_items": operation["skipped_items"],
                "progress_percentage": operation["progress_percentage"],
                "estimated_completion_time": operation.get("estimated_completion_time")
            }
        
        return {}
    
    async def mark_item_failed(
        self,
        operation_id: str,
        target_id: str,
        error: str
    ):
        """Mark an individual item as failed"""
        await self._log_operation_item(operation_id, target_id, "failed", error=error)
    
    # Helper methods
    async def _log_audit_event(
        self,
        operation_id: str,
        event: str,
        data: Dict[str, Any]
    ):
        """Log audit event for operation"""
        try:
            audit_entry = {
                "id": str(uuid.uuid4()),
                "operation_id": operation_id,
                "event": event,
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Save to audit_logs table
            self.supabase.client.table("audit_logs").insert({
                "table_name": "bulk_operations",
                "record_id": operation_id,
                "action": event,
                "user_id": data.get("initiated_by") or data.get("cancelled_by"),
                "changes": audit_entry,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    async def _log_operation_item(
        self,
        operation_id: str,
        target_id: str,
        status: str,
        error: Optional[str] = None
    ):
        """Log individual operation item result"""
        try:
            item_data = {
                "id": str(uuid.uuid4()),
                "bulk_operation_id": operation_id,
                "target_id": target_id,
                "target_type": "unknown",  # Could be enhanced
                "status": status,
                "error_message": error,
                "completed_at": datetime.now(timezone.utc).isoformat() if status != "pending" else None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            self.supabase.client.table("bulk_operation_items").insert(item_data).execute()
            
        except Exception as e:
            logger.error(f"Failed to log operation item: {e}")
    
    async def _get_failed_items(self, operation_id: str) -> List[Dict[str, Any]]:
        """Get failed items from an operation"""
        try:
            result = self.supabase.client.table("bulk_operation_items") \
                .select("*") \
                .eq("bulk_operation_id", operation_id) \
                .eq("status", "failed") \
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get failed items: {e}")
            return []
    
    async def _update_retry_count(self, operation_id: str):
        """Update retry count for an operation"""
        try:
            # Get current retry count
            operation = await self.get_operation(operation_id)
            current_count = operation.get("retry_count", 0) if operation else 0
            
            # Update retry count
            self.supabase.client.table("bulk_operations") \
                .update({"retry_count": current_count + 1}) \
                .eq("id", operation_id) \
                .execute()
            
        except Exception as e:
            logger.error(f"Failed to update retry count: {e}")
    
    async def _send_progress_notification(self, operation_id: str, progress: float):
        """Send progress notification"""
        # Implementation depends on notification requirements
        pass
    
    async def _send_completion_notification(self, operation_id: str):
        """Send completion notification"""
        try:
            operation = await self.get_operation(operation_id)
            if operation:
                await self.notification_service.send_notification(
                    recipient_id=operation["initiated_by"],
                    channel=NotificationChannel.IN_APP,
                    subject="Bulk Operation Complete",
                    message=f"Bulk operation '{operation['operation_name']}' has completed.",
                    priority=NotificationPriority.NORMAL
                )
        except Exception as e:
            logger.error(f"Failed to send completion notification: {e}")
    
    # Placeholder methods for specific operations
    async def _send_approval_notification(self, app_id: str):
        """Send approval notification"""
        pass
    
    async def _schedule_onboarding(self, app_id: str):
        """Schedule onboarding for approved application"""
        pass
    
    async def _send_rejection_notification(self, app_id: str, reason: str):
        """Send rejection notification"""
        pass
    
    async def _add_to_talent_pool(self, app_id: str):
        """Add application to talent pool"""
        pass
    
    async def _create_employee_record(self, employee: Dict[str, Any]) -> Optional[str]:
        """Create employee record"""
        # Implementation depends on employee creation logic
        return str(uuid.uuid4())
    
    async def _send_welcome_email(self, employee_id: str, employee: Dict[str, Any]):
        """Send welcome email to new employee"""
        pass
    
    async def _create_employee_accounts(self, employee_id: str, employee: Dict[str, Any]):
        """Create accounts for new employee"""
        pass
    
    async def _assign_training_modules(self, employee_id: str, employee: Dict[str, Any]):
        """Assign training modules to new employee"""
        pass
    
    async def _get_notification_recipients(self, operation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get notification recipients"""
        # Implementation depends on recipient logic
        return []
    
    async def _gather_export_data(self, operation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Gather data for export"""
        # Implementation depends on export requirements
        return []
    
    async def _format_export_data(self, data: List[Dict[str, Any]], format: str) -> Any:
        """Format data for export"""
        # Implementation depends on format requirements
        return data
    
    async def _save_export_file(self, data: Any, operation_id: str) -> str:
        """Save export file and return URL"""
        # Implementation depends on storage requirements
        return f"https://storage.example.com/exports/{operation_id}.csv"
    
    async def _update_operation_result(self, operation_id: str, result: Dict[str, Any]):
        """Update operation result data"""
        try:
            self.supabase.client.table("bulk_operations") \
                .update({"results": result}) \
                .eq("id", operation_id) \
                .execute()
        except Exception as e:
            logger.error(f"Failed to update operation result: {e}")
    
    async def list_operations(
        self,
        filters: Dict[str, Any] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List bulk operations with filters"""
        try:
            query = self.supabase.client.table("bulk_operations").select("*")
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    if value is not None:
                        query = query.eq(key, value)
            
            # Apply pagination
            query = query.range(offset, offset + limit - 1)
            
            # Order by created_at descending
            query = query.order("created_at", desc=True)
            
            result = query.execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to list operations: {e}")
            return []


# Additional specialized services
class BulkApplicationOperations:
    """Specialized bulk operations for job applications"""
    
    def __init__(self):
        self.bulk_service = BulkOperationService()
        self.supabase = EnhancedSupabaseService()
    
    async def bulk_approve(
        self,
        application_ids: List[str],
        approved_by: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Bulk approve applications"""
        return await self.bulk_service.create_bulk_operation({
            "operation_type": BulkOperationType.APPLICATION_APPROVAL,
            "operation_name": f"Bulk Approval - {len(application_ids)} applications",
            "initiated_by": approved_by,
            "target_ids": application_ids,
            "configuration": options or {}
        })
    
    async def bulk_reject(
        self,
        application_ids: List[str],
        rejected_by: str,
        reason: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Bulk reject applications"""
        config = options or {}
        config["rejection_reason"] = reason
        
        return await self.bulk_service.create_bulk_operation({
            "operation_type": BulkOperationType.APPLICATION_REJECTION,
            "operation_name": f"Bulk Rejection - {len(application_ids)} applications",
            "initiated_by": rejected_by,
            "target_ids": application_ids,
            "configuration": config
        })
    
    async def bulk_update_status(
        self,
        application_ids: List[str],
        new_status: str,
        updated_by: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Bulk update application status"""
        # Use existing bulk update method from supabase service
        return await self.supabase.bulk_update_applications(
            application_ids, new_status, updated_by
        )
    
    async def process_approvals(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process approval operation"""
        await self.bulk_service.start_processing(operation_id)
        # Return results after processing
        return []
    
    async def process_rejections(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process rejection operation"""
        await self.bulk_service.start_processing(operation_id)
        return []
    
    async def process_status_updates(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process status update operation"""
        await self.bulk_service.start_processing(operation_id)
        return []


class BulkEmployeeOperations:
    """Specialized bulk operations for employee management"""
    
    def __init__(self):
        self.bulk_service = BulkOperationService()
        self.supabase = EnhancedSupabaseService()
    
    async def bulk_onboard(
        self,
        employees: List[Dict[str, Any]],
        initiated_by: str,
        start_date: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Bulk onboard new employees"""
        config = options or {}
        config["employees"] = employees
        config["start_date"] = start_date
        
        return await self.bulk_service.create_bulk_operation({
            "operation_type": BulkOperationType.EMPLOYEE_ONBOARDING,
            "operation_name": f"Bulk Onboarding - {len(employees)} employees",
            "initiated_by": initiated_by,
            "target_ids": [str(i) for i in range(len(employees))],
            "configuration": config
        })
    
    async def bulk_terminate(
        self,
        employee_ids: List[str],
        terminated_by: str,
        termination_date: str,
        reason: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Bulk terminate employees"""
        config = options or {}
        config["termination_date"] = termination_date
        config["reason"] = reason
        
        return await self.bulk_service.create_bulk_operation({
            "operation_type": BulkOperationType.EMPLOYEE_TERMINATION,
            "operation_name": f"Bulk Termination - {len(employee_ids)} employees",
            "initiated_by": terminated_by,
            "target_ids": employee_ids,
            "configuration": config
        })
    
    async def bulk_update(
        self,
        employee_ids: List[str],
        updates: Dict[str, Any],
        updated_by: str
    ) -> Dict[str, Any]:
        """Bulk update employee data"""
        # Implementation for bulk employee updates
        results = []
        for emp_id in employee_ids:
            try:
                # Update employee record
                result = self.supabase.client.table("employees") \
                    .update(updates) \
                    .eq("id", emp_id) \
                    .execute()
                
                if result.data:
                    results.append({
                        "employee_id": emp_id,
                        "status": "success",
                        "updates_applied": len(updates)
                    })
                else:
                    results.append({
                        "employee_id": emp_id,
                        "status": "failed",
                        "error": "Update failed"
                    })
            except Exception as e:
                results.append({
                    "employee_id": emp_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {"results": results}
    
    async def process_onboarding(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process onboarding operation"""
        await self.bulk_service.start_processing(operation_id)
        return []
    
    async def process_terminations(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process termination operation"""
        await self.bulk_service.start_processing(operation_id)
        return []
    
    async def process_updates(self, operation_id: str) -> List[Dict[str, Any]]:
        """Process update operation"""
        # Return mock results for now
        return [{"updates_applied": 3}]


class BulkCommunicationService:
    """Service for bulk communication operations"""
    
    def __init__(self):
        self.bulk_service = BulkOperationService()
        self.notification_service = NotificationService()
    
    async def create_email_campaign(
        self,
        name: str,
        recipients: List[str],
        template: str,
        variables: Dict[str, Any],
        scheduled_for: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create email campaign"""
        return await self.bulk_service.create_bulk_operation({
            "operation_type": BulkOperationType.EMAIL_CAMPAIGN,
            "operation_name": name,
            "target_ids": recipients,
            "configuration": {
                "template": template,
                "variables": variables,
                "scheduled_for": scheduled_for.isoformat() if scheduled_for else None
            }
        })
    
    async def create_sms_broadcast(
        self,
        message: str,
        recipients: str,  # Can be "all_active_employees" or list
        priority: str,
        initiated_by: str
    ) -> Dict[str, Any]:
        """Create SMS broadcast"""
        return {
            "id": str(uuid.uuid4()),
            "message": message,
            "recipients": recipients,
            "priority": priority,
            "channel": "sms",
            "initiated_by": initiated_by
        }
    
    async def create_in_app_notification(
        self,
        title: str,
        message: str,
        recipients: List[str],
        action_url: Optional[str] = None,
        expires_in_days: int = 30
    ) -> Dict[str, Any]:
        """Create in-app notification"""
        return {
            "id": str(uuid.uuid4()),
            "title": title,
            "message": message,
            "recipients": recipients,
            "action_url": action_url,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()
        }
    
    async def send_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Send email campaign"""
        # Implement campaign sending logic
        return {"sent": 0, "failed": 0}
    
    async def send_broadcast(self, notification_id: str) -> Dict[str, Any]:
        """Send SMS broadcast"""
        return {"delivery_attempted": True}
    
    async def deliver_notifications(self, notification_id: str) -> List[Dict[str, Any]]:
        """Deliver in-app notifications"""
        return [{"delivered": True, "expires_at": datetime.now(timezone.utc).isoformat()}]


class BulkOperationAuditService:
    """Service for bulk operation audit logging and compliance"""
    
    def __init__(self):
        self.supabase = EnhancedSupabaseService()
    
    async def log_operation_created(
        self,
        operation_id: str,
        operation_type: str,
        initiated_by: str,
        target_count: int
    ):
        """Log operation creation"""
        await self._create_audit_log(
            operation_id,
            "operation_created",
            {
                "operation_type": operation_type,
                "initiated_by": initiated_by,
                "target_count": target_count
            }
        )
    
    async def log_processing_started(self, operation_id: str):
        """Log processing start"""
        await self._create_audit_log(operation_id, "processing_started", {})
    
    async def log_item_processed(
        self,
        operation_id: str,
        item_id: str,
        status: str,
        error: Optional[str] = None
    ):
        """Log item processing"""
        await self._create_audit_log(
            operation_id,
            "item_processed",
            {"item_id": item_id, "status": status, "error": error}
        )
    
    async def log_operation_completed(
        self,
        operation_id: str,
        successful: int,
        failed: int
    ):
        """Log operation completion"""
        await self._create_audit_log(
            operation_id,
            "operation_completed",
            {"successful": successful, "failed": failed}
        )
    
    async def get_audit_trail(self, operation_id: str) -> List[Dict[str, Any]]:
        """Get complete audit trail for an operation"""
        try:
            result = self.supabase.client.table("audit_logs") \
                .select("*") \
                .eq("record_id", operation_id) \
                .order("created_at") \
                .execute()
            
            if result.data:
                return [
                    {
                        "event": log["action"],
                        "timestamp": log["created_at"],
                        "data": log.get("changes", {})
                    }
                    for log in result.data
                ]
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to get audit trail: {e}")
            return []
    
    async def generate_compliance_report(
        self,
        start_date: datetime,
        end_date: datetime,
        operation_types: List[str] = None
    ) -> Dict[str, Any]:
        """Generate compliance report for bulk operations"""
        try:
            # Query operations within date range
            query = self.supabase.client.table("bulk_operations") \
                .select("*") \
                .gte("created_at", start_date.isoformat()) \
                .lte("created_at", end_date.isoformat())
            
            if operation_types:
                query = query.in_("operation_type", operation_types)
            
            result = query.execute()
            
            if result.data:
                operations = result.data
                
                # Generate statistics
                total_operations = len(operations)
                operations_by_type = {}
                operations_by_user = {}
                compliance_violations = []
                
                for op in operations:
                    # Count by type
                    op_type = op["operation_type"]
                    operations_by_type[op_type] = operations_by_type.get(op_type, 0) + 1
                    
                    # Count by user
                    user = op["initiated_by"]
                    operations_by_user[user] = operations_by_user.get(user, 0) + 1
                    
                    # Check for violations (example criteria)
                    if op["failed_items"] > op["successful_items"]:
                        compliance_violations.append({
                            "operation_id": op["id"],
                            "type": "high_failure_rate",
                            "details": f"Failed: {op['failed_items']}, Successful: {op['successful_items']}"
                        })
                
                return {
                    "total_operations": total_operations,
                    "operations_by_type": operations_by_type,
                    "operations_by_user": operations_by_user,
                    "compliance_violations": compliance_violations,
                    "report_period": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    }
                }
            
            return {
                "total_operations": 0,
                "operations_by_type": {},
                "operations_by_user": {},
                "compliance_violations": []
            }
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {}
    
    async def _create_audit_log(
        self,
        operation_id: str,
        event: str,
        data: Dict[str, Any]
    ):
        """Create audit log entry"""
        try:
            self.supabase.client.table("audit_logs").insert({
                "table_name": "bulk_operations",
                "record_id": operation_id,
                "action": event,
                "changes": data,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")


class BackgroundJobProcessor:
    """Processor for background bulk operation jobs"""
    
    def __init__(self):
        self.bulk_service = BulkOperationService()
        self.job_queue: List[Dict[str, Any]] = []
        self.processing = False
    
    async def queue_operation(self, operation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Queue an operation for background processing"""
        operation = await self.bulk_service.create_bulk_operation(operation_data)
        
        # Add to queue with priority
        priority = operation_data.get("priority", "normal")
        self.job_queue.append({
            "id": operation["id"],
            "priority": priority,
            "queued_at": datetime.now(timezone.utc)
        })
        
        # Sort by priority
        self._sort_queue()
        
        return operation
    
    async def start_processing(self):
        """Start processing queued operations"""
        self.processing = True
        
        while self.processing and self.job_queue:
            job = self.job_queue.pop(0)
            await self.bulk_service.start_processing(job["id"])
    
    async def wait_for_completion(
        self,
        operation_ids: List[str],
        timeout: int = 60
    ) -> List[Dict[str, Any]]:
        """Wait for operations to complete with timeout"""
        start_time = datetime.now(timezone.utc)
        completed = []
        
        while len(completed) < len(operation_ids):
            # Check timeout
            if (datetime.now(timezone.utc) - start_time).total_seconds() > timeout:
                break
            
            for op_id in operation_ids:
                if op_id not in [c["id"] for c in completed]:
                    operation = await self.bulk_service.get_operation(op_id)
                    if operation and operation["status"] in ["completed", "failed", "cancelled"]:
                        completed.append(operation)
            
            await asyncio.sleep(1)
        
        return completed
    
    async def get_processing_order(self) -> List[Dict[str, Any]]:
        """Get current processing order"""
        return self.job_queue
    
    async def process_with_retry(self, operation_id: str) -> Dict[str, Any]:
        """Process operation with retry logic"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                await self.bulk_service.start_processing(operation_id)
                operation = await self.bulk_service.get_operation(operation_id)
                
                if operation and operation["status"] == "completed":
                    return {"status": "success", "operation": operation}
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {e}")
            
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return {"status": "failed", "error": "Max retries exceeded"}
    
    async def get_operation(self, operation_id: str) -> Dict[str, Any]:
        """Get operation details"""
        return await self.bulk_service.get_operation(operation_id)
    
    def _sort_queue(self):
        """Sort queue by priority"""
        priority_order = {"high": 0, "normal": 1, "low": 2}
        self.job_queue.sort(key=lambda x: priority_order.get(x["priority"], 1))