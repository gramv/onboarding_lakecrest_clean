"""
Optimistic Update System
Provides optimistic UI updates with rollback capabilities, conflict resolution,
data synchronization, and collaborative editing features.
"""
import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque

try:
    import redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False

from .websocket_manager import websocket_manager, BroadcastEvent, MessagePriority
from .notification_service import notification_service, NotificationCategory, NotificationSeverity


logger = logging.getLogger(__name__)


class UpdateType(Enum):
    """Types of optimistic updates"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MOVE = "move"
    BATCH = "batch"


class UpdateStatus(Enum):
    """Status of optimistic updates"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    CONFLICTED = "conflicted"
    ROLLED_BACK = "rolled_back"


class ConflictResolutionStrategy(Enum):
    """Conflict resolution strategies"""
    LAST_WRITE_WINS = "last_write_wins"
    FIRST_WRITE_WINS = "first_write_wins"
    MERGE = "merge"
    MANUAL = "manual"
    REJECT_CONFLICTED = "reject_conflicted"


class ChangeType(Enum):
    """Types of changes for tracking"""
    FIELD_UPDATE = "field_update"
    ARRAY_INSERT = "array_insert"
    ARRAY_DELETE = "array_delete"
    ARRAY_MOVE = "array_move"
    OBJECT_CREATE = "object_create"
    OBJECT_DELETE = "object_delete"


@dataclass
class FieldChange:
    """Represents a change to a specific field"""
    field_path: str
    old_value: Any
    new_value: Any
    change_type: ChangeType
    timestamp: datetime
    user_id: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "field_path": self.field_path,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "change_type": self.change_type.value,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id
        }


@dataclass
class OptimisticUpdate:
    """Represents an optimistic update operation"""
    update_id: str
    user_id: str
    resource_type: str
    resource_id: str
    update_type: UpdateType
    changes: List[FieldChange]
    created_at: datetime
    status: UpdateStatus = UpdateStatus.PENDING
    client_timestamp: Optional[datetime] = None
    server_timestamp: Optional[datetime] = None
    conflict_resolution: ConflictResolutionStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS
    metadata: Dict[str, Any] = field(default_factory=dict)
    rollback_data: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    max_retries: int = 3
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "update_id": self.update_id,
            "user_id": self.user_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "update_type": self.update_type.value,
            "changes": [change.to_dict() for change in self.changes],
            "created_at": self.created_at.isoformat(),
            "status": self.status.value,
            "client_timestamp": self.client_timestamp.isoformat() if self.client_timestamp else None,
            "server_timestamp": self.server_timestamp.isoformat() if self.server_timestamp else None,
            "conflict_resolution": self.conflict_resolution.value,
            "metadata": self.metadata,
            "retry_count": self.retry_count
        }


@dataclass
class ConflictInfo:
    """Information about a conflict between updates"""
    conflict_id: str
    conflicting_updates: List[str]  # Update IDs
    resource_type: str
    resource_id: str
    conflicting_fields: List[str]
    detected_at: datetime
    resolution_strategy: ConflictResolutionStrategy
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "conflict_id": self.conflict_id,
            "conflicting_updates": self.conflicting_updates,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "conflicting_fields": self.conflicting_fields,
            "detected_at": self.detected_at.isoformat(),
            "resolution_strategy": self.resolution_strategy.value,
            "resolved": self.resolved,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by
        }


@dataclass
class CollaborativeSession:
    """Represents a collaborative editing session"""
    session_id: str
    resource_type: str
    resource_id: str
    participants: Set[str] = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    active_cursors: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    pending_updates: List[str] = field(default_factory=list)
    
    def add_participant(self, user_id: str):
        """Add a participant to the session"""
        self.participants.add(user_id)
        self.last_activity = datetime.now()
    
    def remove_participant(self, user_id: str):
        """Remove a participant from the session"""
        self.participants.discard(user_id)
        self.active_cursors.pop(user_id, None)
        self.last_activity = datetime.now()
    
    def update_cursor(self, user_id: str, cursor_data: Dict[str, Any]):
        """Update cursor position for a user"""
        self.active_cursors[user_id] = {
            **cursor_data,
            "timestamp": datetime.now().isoformat()
        }
        self.last_activity = datetime.now()
    
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """Check if session has expired"""
        return datetime.now() - self.last_activity > timedelta(minutes=timeout_minutes)


class OptimisticUpdateService:
    """
    Service for managing optimistic updates with rollback capabilities,
    conflict resolution, and collaborative editing features.
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        # Update storage
        self.pending_updates: Dict[str, OptimisticUpdate] = {}
        self.confirmed_updates: Dict[str, OptimisticUpdate] = {}
        self.resource_updates: Dict[str, List[str]] = defaultdict(list)  # resource_key -> update_ids
        
        # Conflict management
        self.conflicts: Dict[str, ConflictInfo] = {}
        self.conflict_handlers: Dict[ConflictResolutionStrategy, Callable] = {}
        
        # Collaborative editing
        self.collaborative_sessions: Dict[str, CollaborativeSession] = {}
        self.user_sessions: Dict[str, Set[str]] = defaultdict(set)  # user_id -> session_ids
        
        # Change tracking
        self.change_history: Dict[str, List[FieldChange]] = defaultdict(list)
        self.resource_versions: Dict[str, int] = defaultdict(int)
        
        # Background tasks
        self._conflict_resolver_task = None
        self._session_cleanup_task = None
        self._update_processor_task = None
        
        # Performance metrics
        self.metrics = {
            "total_updates": 0,
            "confirmed_updates": 0,
            "rejected_updates": 0,
            "conflicts_detected": 0,
            "conflicts_resolved": 0,
            "rollbacks_performed": 0,
            "average_confirmation_time": 0.0
        }
        
        # Redis for persistence
        self.redis_client = None
        if redis_url and HAS_REDIS:
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                logger.info("Redis client initialized for optimistic updates")
            except Exception as e:
                logger.warning(f"Failed to initialize Redis client: {e}")
        
        # Initialize conflict resolution handlers
        self._initialize_conflict_handlers()
        
        # Start background tasks
        self._start_background_tasks()
    
    def _initialize_conflict_handlers(self):
        """Initialize conflict resolution handlers"""
        self.conflict_handlers[ConflictResolutionStrategy.LAST_WRITE_WINS] = self._resolve_last_write_wins
        self.conflict_handlers[ConflictResolutionStrategy.FIRST_WRITE_WINS] = self._resolve_first_write_wins
        self.conflict_handlers[ConflictResolutionStrategy.MERGE] = self._resolve_merge
        self.conflict_handlers[ConflictResolutionStrategy.MANUAL] = self._resolve_manual
        self.conflict_handlers[ConflictResolutionStrategy.REJECT_CONFLICTED] = self._resolve_reject_conflicted
    
    def _start_background_tasks(self):
        """Start background tasks for update processing"""
        try:
            loop = asyncio.get_running_loop()
            
            if self._conflict_resolver_task is None or self._conflict_resolver_task.done():
                self._conflict_resolver_task = asyncio.create_task(self._process_conflicts())
            
            if self._session_cleanup_task is None or self._session_cleanup_task.done():
                self._session_cleanup_task = asyncio.create_task(self._cleanup_expired_sessions())
            
            if self._update_processor_task is None or self._update_processor_task.done():
                self._update_processor_task = asyncio.create_task(self._process_pending_updates())
                
        except RuntimeError:
            # No event loop running, tasks will be started when needed
            pass
    
    async def _process_conflicts(self):
        """Process and resolve conflicts"""
        while True:
            try:
                await asyncio.sleep(5)  # Process every 5 seconds
                
                unresolved_conflicts = [
                    conflict for conflict in self.conflicts.values()
                    if not conflict.resolved
                ]
                
                for conflict in unresolved_conflicts:
                    await self._resolve_conflict(conflict)
                
            except Exception as e:
                logger.error(f"Error in conflict processing: {e}")
    
    async def _cleanup_expired_sessions(self):
        """Clean up expired collaborative sessions"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                expired_sessions = []
                for session_id, session in self.collaborative_sessions.items():
                    if session.is_expired():
                        expired_sessions.append(session_id)
                
                for session_id in expired_sessions:
                    await self._end_collaborative_session(session_id)
                
                if expired_sessions:
                    logger.info(f"Cleaned up {len(expired_sessions)} expired collaborative sessions")
                
            except Exception as e:
                logger.error(f"Error in session cleanup: {e}")
    
    async def _process_pending_updates(self):
        """Process pending updates for confirmation"""
        while True:
            try:
                await asyncio.sleep(2)  # Process every 2 seconds
                
                # Find updates that need processing
                pending_updates = list(self.pending_updates.values())
                
                for update in pending_updates:
                    if update.status == UpdateStatus.PENDING:
                        # Simulate server-side validation and processing
                        await self._validate_and_process_update(update)
                
            except Exception as e:
                logger.error(f"Error in update processing: {e}")
    
    async def create_optimistic_update(self, user_id: str, resource_type: str, 
                                     resource_id: str, update_type: UpdateType,
                                     changes: List[Dict[str, Any]],
                                     client_timestamp: Optional[datetime] = None,
                                     conflict_resolution: ConflictResolutionStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS,
                                     metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Create an optimistic update
        
        Args:
            user_id: ID of the user making the update
            resource_type: Type of resource being updated
            resource_id: ID of the resource being updated
            update_type: Type of update operation
            changes: List of field changes
            client_timestamp: Timestamp from client
            conflict_resolution: Strategy for resolving conflicts
            metadata: Additional metadata
            
        Returns:
            Update ID
        """
        update_id = str(uuid.uuid4())
        
        # Convert changes to FieldChange objects
        field_changes = []
        for change_data in changes:
            field_change = FieldChange(
                field_path=change_data["field_path"],
                old_value=change_data.get("old_value"),
                new_value=change_data["new_value"],
                change_type=ChangeType(change_data.get("change_type", "field_update")),
                timestamp=datetime.now(),
                user_id=user_id
            )
            field_changes.append(field_change)
        
        # Create optimistic update
        update = OptimisticUpdate(
            update_id=update_id,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            update_type=update_type,
            changes=field_changes,
            created_at=datetime.now(),
            client_timestamp=client_timestamp or datetime.now(),
            conflict_resolution=conflict_resolution,
            metadata=metadata or {}
        )
        
        # Store update
        self.pending_updates[update_id] = update
        resource_key = f"{resource_type}:{resource_id}"
        self.resource_updates[resource_key].append(update_id)
        
        # Update metrics
        self.metrics["total_updates"] += 1
        
        # Check for conflicts
        await self._check_for_conflicts(update)
        
        # Broadcast optimistic update to collaborators
        await self._broadcast_optimistic_update(update)
        
        # Persist to Redis if available
        if self.redis_client:
            await self._persist_update(update)
        
        logger.info(f"Created optimistic update {update_id} for {resource_type}:{resource_id}")
        return update_id
    
    async def _check_for_conflicts(self, update: OptimisticUpdate):
        """Check for conflicts with other pending updates"""
        resource_key = f"{update.resource_type}:{update.resource_id}"
        other_update_ids = [
            uid for uid in self.resource_updates[resource_key]
            if uid != update.update_id and uid in self.pending_updates
        ]
        
        conflicting_updates = []
        conflicting_fields = set()
        
        for other_update_id in other_update_ids:
            other_update = self.pending_updates[other_update_id]
            
            # Check if updates conflict on the same fields
            update_fields = {change.field_path for change in update.changes}
            other_fields = {change.field_path for change in other_update.changes}
            
            field_conflicts = update_fields.intersection(other_fields)
            if field_conflicts:
                conflicting_updates.append(other_update_id)
                conflicting_fields.update(field_conflicts)
        
        if conflicting_updates:
            # Create conflict record
            conflict_id = str(uuid.uuid4())
            conflict = ConflictInfo(
                conflict_id=conflict_id,
                conflicting_updates=[update.update_id] + conflicting_updates,
                resource_type=update.resource_type,
                resource_id=update.resource_id,
                conflicting_fields=list(conflicting_fields),
                detected_at=datetime.now(),
                resolution_strategy=update.conflict_resolution
            )
            
            self.conflicts[conflict_id] = conflict
            self.metrics["conflicts_detected"] += 1
            
            # Mark updates as conflicted
            update.status = UpdateStatus.CONFLICTED
            for conflicting_id in conflicting_updates:
                if conflicting_id in self.pending_updates:
                    self.pending_updates[conflicting_id].status = UpdateStatus.CONFLICTED
            
            logger.warning(f"Conflict detected: {conflict_id} for resource {resource_key}")
            
            # Notify users about conflict
            await self._notify_conflict(conflict)
    
    async def _resolve_conflict(self, conflict: ConflictInfo):
        """Resolve a conflict using the specified strategy"""
        try:
            handler = self.conflict_handlers.get(conflict.resolution_strategy)
            if handler:
                await handler(conflict)
                conflict.resolved = True
                conflict.resolved_at = datetime.now()
                self.metrics["conflicts_resolved"] += 1
                
                logger.info(f"Resolved conflict {conflict.conflict_id} using {conflict.resolution_strategy.value}")
            else:
                logger.error(f"No handler for conflict resolution strategy: {conflict.resolution_strategy}")
                
        except Exception as e:
            logger.error(f"Error resolving conflict {conflict.conflict_id}: {e}")
    
    async def _resolve_last_write_wins(self, conflict: ConflictInfo):
        """Resolve conflict using last write wins strategy"""
        # Find the most recent update
        latest_update = None
        latest_timestamp = None
        
        for update_id in conflict.conflicting_updates:
            update = self.pending_updates.get(update_id)
            if update:
                timestamp = update.client_timestamp or update.created_at
                if latest_timestamp is None or timestamp > latest_timestamp:
                    latest_update = update
                    latest_timestamp = timestamp
        
        if latest_update:
            # Confirm the latest update
            await self._confirm_update(latest_update.update_id)
            
            # Reject other conflicting updates
            for update_id in conflict.conflicting_updates:
                if update_id != latest_update.update_id:
                    await self._reject_update(update_id, "Conflict resolved: last write wins")
    
    async def _resolve_first_write_wins(self, conflict: ConflictInfo):
        """Resolve conflict using first write wins strategy"""
        # Find the earliest update
        earliest_update = None
        earliest_timestamp = None
        
        for update_id in conflict.conflicting_updates:
            update = self.pending_updates.get(update_id)
            if update:
                timestamp = update.client_timestamp or update.created_at
                if earliest_timestamp is None or timestamp < earliest_timestamp:
                    earliest_update = update
                    earliest_timestamp = timestamp
        
        if earliest_update:
            # Confirm the earliest update
            await self._confirm_update(earliest_update.update_id)
            
            # Reject other conflicting updates
            for update_id in conflict.conflicting_updates:
                if update_id != earliest_update.update_id:
                    await self._reject_update(update_id, "Conflict resolved: first write wins")
    
    async def _resolve_merge(self, conflict: ConflictInfo):
        """Resolve conflict by merging non-conflicting changes"""
        # This is a simplified merge strategy
        # In practice, this would need more sophisticated logic
        
        merged_changes = {}
        all_updates = []
        
        for update_id in conflict.conflicting_updates:
            update = self.pending_updates.get(update_id)
            if update:
                all_updates.append(update)
                for change in update.changes:
                    if change.field_path not in merged_changes:
                        merged_changes[change.field_path] = change
                    else:
                        # Use the most recent change for conflicting fields
                        existing_change = merged_changes[change.field_path]
                        if change.timestamp > existing_change.timestamp:
                            merged_changes[change.field_path] = change
        
        if all_updates:
            # Create a merged update
            merged_update_id = await self.create_optimistic_update(
                user_id="system",
                resource_type=conflict.resource_type,
                resource_id=conflict.resource_id,
                update_type=UpdateType.UPDATE,
                changes=[change.to_dict() for change in merged_changes.values()],
                metadata={"merged_from": conflict.conflicting_updates}
            )
            
            # Confirm the merged update
            await self._confirm_update(merged_update_id)
            
            # Reject original conflicting updates
            for update_id in conflict.conflicting_updates:
                await self._reject_update(update_id, "Conflict resolved: merged")
    
    async def _resolve_manual(self, conflict: ConflictInfo):
        """Mark conflict for manual resolution"""
        # Notify relevant users that manual resolution is needed
        for update_id in conflict.conflicting_updates:
            update = self.pending_updates.get(update_id)
            if update:
                await notification_service.create_notification(
                    user_id=update.user_id,
                    title="Manual Conflict Resolution Required",
                    message=f"Your update to {conflict.resource_type} conflicts with other changes and requires manual resolution.",
                    category=NotificationCategory.ALERT,
                    severity=NotificationSeverity.WARNING,
                    metadata={"conflict_id": conflict.conflict_id}
                )
    
    async def _resolve_reject_conflicted(self, conflict: ConflictInfo):
        """Reject all conflicting updates"""
        for update_id in conflict.conflicting_updates:
            await self._reject_update(update_id, "Conflict resolved: all conflicted updates rejected")
    
    async def _confirm_update(self, update_id: str):
        """Confirm an optimistic update"""
        update = self.pending_updates.get(update_id)
        if not update:
            return
        
        update.status = UpdateStatus.CONFIRMED
        update.server_timestamp = datetime.now()
        
        # Move to confirmed updates
        self.confirmed_updates[update_id] = update
        del self.pending_updates[update_id]
        
        # Update metrics
        self.metrics["confirmed_updates"] += 1
        
        # Calculate confirmation time
        confirmation_time = (update.server_timestamp - update.created_at).total_seconds()
        self.metrics["average_confirmation_time"] = (
            (self.metrics["average_confirmation_time"] * (self.metrics["confirmed_updates"] - 1) + confirmation_time) /
            self.metrics["confirmed_updates"]
        )
        
        # Update resource version
        resource_key = f"{update.resource_type}:{update.resource_id}"
        self.resource_versions[resource_key] += 1
        
        # Add changes to history
        self.change_history[resource_key].extend(update.changes)
        
        # Broadcast confirmation to collaborators
        await self._broadcast_update_confirmation(update)
        
        logger.info(f"Confirmed optimistic update {update_id}")
    
    async def _reject_update(self, update_id: str, reason: str = ""):
        """Reject an optimistic update and trigger rollback"""
        update = self.pending_updates.get(update_id)
        if not update:
            return
        
        update.status = UpdateStatus.REJECTED
        update.metadata["rejection_reason"] = reason
        
        # Remove from pending updates
        del self.pending_updates[update_id]
        
        # Update metrics
        self.metrics["rejected_updates"] += 1
        self.metrics["rollbacks_performed"] += 1
        
        # Broadcast rollback to user
        await self._broadcast_update_rollback(update, reason)
        
        # Notify user about rejection
        await notification_service.create_notification(
            user_id=update.user_id,
            title="Update Rejected",
            message=f"Your update to {update.resource_type} was rejected. {reason}",
            category=NotificationCategory.SYSTEM,
            severity=NotificationSeverity.WARNING,
            metadata={"update_id": update_id, "reason": reason}
        )
        
        logger.info(f"Rejected optimistic update {update_id}: {reason}")
    
    async def _validate_and_process_update(self, update: OptimisticUpdate):
        """Validate and process an update (simulate server-side logic)"""
        try:
            # Simulate validation delay
            await asyncio.sleep(0.5)
            
            # Simple validation logic (can be extended)
            if update.retry_count > update.max_retries:
                await self._reject_update(update.update_id, "Maximum retries exceeded")
                return
            
            # Check if update is still valid
            if update.status == UpdateStatus.CONFLICTED:
                # Let conflict resolution handle this
                return
            
            # Simulate random validation failure for testing
            import random
            if random.random() < 0.1:  # 10% failure rate
                update.retry_count += 1
                if update.retry_count <= update.max_retries:
                    logger.info(f"Retrying update {update.update_id} (attempt {update.retry_count})")
                    return
                else:
                    await self._reject_update(update.update_id, "Validation failed after retries")
                    return
            
            # Confirm the update
            await self._confirm_update(update.update_id)
            
        except Exception as e:
            logger.error(f"Error validating update {update.update_id}: {e}")
            await self._reject_update(update.update_id, f"Validation error: {str(e)}")
    
    async def _broadcast_optimistic_update(self, update: OptimisticUpdate):
        """Broadcast optimistic update to collaborators"""
        try:
            # Find collaborative sessions for this resource
            resource_key = f"{update.resource_type}:{update.resource_id}"
            relevant_sessions = [
                session for session in self.collaborative_sessions.values()
                if f"{session.resource_type}:{session.resource_id}" == resource_key
            ]
            
            # Broadcast to all participants except the originator
            for session in relevant_sessions:
                for participant_id in session.participants:
                    if participant_id != update.user_id:
                        message = {
                            "type": "optimistic_update",
                            "data": update.to_dict()
                        }
                        
                        await websocket_manager.send_to_user(
                            participant_id,
                            message,
                            priority=MessagePriority.HIGH
                        )
            
        except Exception as e:
            logger.error(f"Error broadcasting optimistic update: {e}")
    
    async def _broadcast_update_confirmation(self, update: OptimisticUpdate):
        """Broadcast update confirmation to collaborators"""
        try:
            resource_key = f"{update.resource_type}:{update.resource_id}"
            relevant_sessions = [
                session for session in self.collaborative_sessions.values()
                if f"{session.resource_type}:{session.resource_id}" == resource_key
            ]
            
            for session in relevant_sessions:
                for participant_id in session.participants:
                    message = {
                        "type": "update_confirmed",
                        "data": {
                            "update_id": update.update_id,
                            "resource_type": update.resource_type,
                            "resource_id": update.resource_id,
                            "changes": [change.to_dict() for change in update.changes],
                            "confirmed_at": update.server_timestamp.isoformat()
                        }
                    }
                    
                    await websocket_manager.send_to_user(
                        participant_id,
                        message,
                        priority=MessagePriority.NORMAL
                    )
            
        except Exception as e:
            logger.error(f"Error broadcasting update confirmation: {e}")
    
    async def _broadcast_update_rollback(self, update: OptimisticUpdate, reason: str):
        """Broadcast update rollback to user"""
        try:
            message = {
                "type": "update_rollback",
                "data": {
                    "update_id": update.update_id,
                    "resource_type": update.resource_type,
                    "resource_id": update.resource_id,
                    "reason": reason,
                    "rollback_data": update.rollback_data,
                    "changes": [change.to_dict() for change in update.changes]
                }
            }
            
            await websocket_manager.send_to_user(
                update.user_id,
                message,
                priority=MessagePriority.HIGH
            )
            
        except Exception as e:
            logger.error(f"Error broadcasting update rollback: {e}")
    
    async def _notify_conflict(self, conflict: ConflictInfo):
        """Notify users about conflicts"""
        try:
            for update_id in conflict.conflicting_updates:
                update = self.pending_updates.get(update_id)
                if update:
                    message = {
                        "type": "conflict_detected",
                        "data": conflict.to_dict()
                    }
                    
                    await websocket_manager.send_to_user(
                        update.user_id,
                        message,
                        priority=MessagePriority.HIGH
                    )
            
        except Exception as e:
            logger.error(f"Error notifying about conflict: {e}")
    
    # Collaborative editing methods
    
    async def start_collaborative_session(self, user_id: str, resource_type: str, 
                                        resource_id: str) -> str:
        """Start or join a collaborative editing session"""
        session_key = f"{resource_type}:{resource_id}"
        
        # Find existing session or create new one
        existing_session = None
        for session in self.collaborative_sessions.values():
            if f"{session.resource_type}:{session.resource_id}" == session_key:
                existing_session = session
                break
        
        if existing_session:
            # Join existing session
            existing_session.add_participant(user_id)
            self.user_sessions[user_id].add(existing_session.session_id)
            session_id = existing_session.session_id
        else:
            # Create new session
            session_id = str(uuid.uuid4())
            session = CollaborativeSession(
                session_id=session_id,
                resource_type=resource_type,
                resource_id=resource_id
            )
            session.add_participant(user_id)
            
            self.collaborative_sessions[session_id] = session
            self.user_sessions[user_id].add(session_id)
        
        # Notify other participants
        await self._broadcast_participant_joined(session_id, user_id)
        
        logger.info(f"User {user_id} joined collaborative session {session_id}")
        return session_id
    
    async def end_collaborative_session(self, session_id: str, user_id: str):
        """End or leave a collaborative editing session"""
        session = self.collaborative_sessions.get(session_id)
        if not session:
            return
        
        session.remove_participant(user_id)
        self.user_sessions[user_id].discard(session_id)
        
        # Notify other participants
        await self._broadcast_participant_left(session_id, user_id)
        
        # Remove session if no participants left
        if not session.participants:
            await self._end_collaborative_session(session_id)
        
        logger.info(f"User {user_id} left collaborative session {session_id}")
    
    async def _end_collaborative_session(self, session_id: str):
        """End a collaborative session completely"""
        session = self.collaborative_sessions.get(session_id)
        if not session:
            return
        
        # Remove from user sessions
        for user_id in session.participants:
            self.user_sessions[user_id].discard(session_id)
        
        # Remove session
        del self.collaborative_sessions[session_id]
        
        logger.info(f"Ended collaborative session {session_id}")
    
    async def update_cursor_position(self, session_id: str, user_id: str, 
                                   cursor_data: Dict[str, Any]):
        """Update cursor position in collaborative session"""
        session = self.collaborative_sessions.get(session_id)
        if not session or user_id not in session.participants:
            return
        
        session.update_cursor(user_id, cursor_data)
        
        # Broadcast cursor update to other participants
        for participant_id in session.participants:
            if participant_id != user_id:
                message = {
                    "type": "cursor_update",
                    "data": {
                        "session_id": session_id,
                        "user_id": user_id,
                        "cursor": cursor_data,
                        "timestamp": datetime.now().isoformat()
                    }
                }
                
                await websocket_manager.send_to_user(
                    participant_id,
                    message,
                    priority=MessagePriority.LOW
                )
    
    async def _broadcast_participant_joined(self, session_id: str, user_id: str):
        """Broadcast that a participant joined the session"""
        session = self.collaborative_sessions.get(session_id)
        if not session:
            return
        
        for participant_id in session.participants:
            if participant_id != user_id:
                message = {
                    "type": "participant_joined",
                    "data": {
                        "session_id": session_id,
                        "user_id": user_id,
                        "participants": list(session.participants)
                    }
                }
                
                await websocket_manager.send_to_user(
                    participant_id,
                    message,
                    priority=MessagePriority.NORMAL
                )
    
    async def _broadcast_participant_left(self, session_id: str, user_id: str):
        """Broadcast that a participant left the session"""
        session = self.collaborative_sessions.get(session_id)
        if not session:
            return
        
        for participant_id in session.participants:
            message = {
                "type": "participant_left",
                "data": {
                    "session_id": session_id,
                    "user_id": user_id,
                    "participants": list(session.participants)
                }
            }
            
            await websocket_manager.send_to_user(
                participant_id,
                message,
                priority=MessagePriority.NORMAL
            )
    
    # Query and management methods
    
    def get_resource_updates(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """Get all updates for a specific resource"""
        resource_key = f"{resource_type}:{resource_id}"
        update_ids = self.resource_updates.get(resource_key, [])
        
        updates = []
        for update_id in update_ids:
            update = self.pending_updates.get(update_id) or self.confirmed_updates.get(update_id)
            if update:
                updates.append(update.to_dict())
        
        return sorted(updates, key=lambda x: x["created_at"])
    
    def get_change_history(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """Get change history for a resource"""
        resource_key = f"{resource_type}:{resource_id}"
        changes = self.change_history.get(resource_key, [])
        return [change.to_dict() for change in changes]
    
    def get_active_conflicts(self) -> List[Dict[str, Any]]:
        """Get all active conflicts"""
        return [
            conflict.to_dict() for conflict in self.conflicts.values()
            if not conflict.resolved
        ]
    
    def get_collaborative_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get collaborative sessions, optionally filtered by user"""
        sessions = []
        
        for session in self.collaborative_sessions.values():
            if user_id is None or user_id in session.participants:
                sessions.append({
                    "session_id": session.session_id,
                    "resource_type": session.resource_type,
                    "resource_id": session.resource_id,
                    "participants": list(session.participants),
                    "created_at": session.created_at.isoformat(),
                    "last_activity": session.last_activity.isoformat(),
                    "active_cursors": session.active_cursors
                })
        
        return sessions
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get service metrics"""
        return {
            **self.metrics,
            "pending_updates": len(self.pending_updates),
            "confirmed_updates": len(self.confirmed_updates),
            "active_conflicts": len([c for c in self.conflicts.values() if not c.resolved]),
            "active_sessions": len(self.collaborative_sessions)
        }
    
    async def _persist_update(self, update: OptimisticUpdate):
        """Persist update to Redis"""
        try:
            key = f"optimistic_update:{update.update_id}"
            data = json.dumps(update.to_dict())
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.redis_client.setex(key, 86400, data)  # 24 hours
            )
            
        except Exception as e:
            logger.warning(f"Failed to persist update to Redis: {e}")
    
    async def shutdown(self):
        """Gracefully shutdown the optimistic update service"""
        logger.info("Shutting down optimistic update service...")
        
        # Cancel background tasks
        tasks_to_cancel = [
            self._conflict_resolver_task,
            self._session_cleanup_task,
            self._update_processor_task
        ]
        
        for task in tasks_to_cancel:
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        # End all collaborative sessions
        for session_id in list(self.collaborative_sessions.keys()):
            await self._end_collaborative_session(session_id)
        
        # Close Redis connection
        if self.redis_client:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.close
                )
            except Exception as e:
                logger.warning(f"Error closing Redis connection: {e}")
        
        logger.info("Optimistic update service shutdown complete")


# Global optimistic update service instance
optimistic_update_service = OptimisticUpdateService()