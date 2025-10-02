"""
Session Lock Manager for Concurrent Access Control
Implements optimistic locking and session management to prevent data conflicts
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from enum import Enum
import uuid
from dataclasses import dataclass, asdict
import json

from supabase import Client
from postgrest.exceptions import APIError

logger = logging.getLogger(__name__)

class LockType(str, Enum):
    """Types of locks that can be acquired"""
    READ = "read"
    WRITE = "write"

class LockAction(str, Enum):
    """Lock history actions"""
    ACQUIRED = "acquired"
    RELEASED = "released"
    EXPIRED = "expired"
    FORCED_RELEASE = "forced_release"
    CONFLICT = "conflict"

@dataclass
class SessionLock:
    """Represents a session lock"""
    session_id: str
    locked_by: str
    locked_at: datetime
    lock_type: LockType
    expires_at: datetime
    lock_token: str
    last_activity: datetime
    browser_fingerprint: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    def is_expired(self) -> bool:
        """Check if lock has expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_owned_by(self, user_id: str, token: Optional[str] = None) -> bool:
        """Check if lock is owned by specific user"""
        if self.locked_by != user_id:
            return False
        if token and self.lock_token != token:
            return False
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        data['locked_at'] = self.locked_at.isoformat()
        data['expires_at'] = self.expires_at.isoformat()
        data['last_activity'] = self.last_activity.isoformat()
        data['lock_type'] = self.lock_type.value
        return data

@dataclass
class LockConflict:
    """Information about a lock conflict"""
    has_conflict: bool
    current_holder: Optional[str] = None
    lock_type: Optional[LockType] = None
    locked_at: Optional[datetime] = None
    message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = asdict(self)
        if self.locked_at:
            data['locked_at'] = self.locked_at.isoformat()
        if self.lock_type:
            data['lock_type'] = self.lock_type.value
        return data

class SessionLockManager:
    """
    Manages session locks for concurrent access control
    """
    
    DEFAULT_LOCK_DURATION = 300  # 5 minutes in seconds
    MAX_LOCK_DURATION = 1800  # 30 minutes
    HEARTBEAT_INTERVAL = 60  # 1 minute
    
    def __init__(self, supabase_client: Client, websocket_manager=None):
        """
        Initialize SessionLockManager
        
        Args:
            supabase_client: Supabase client instance
            websocket_manager: Optional WebSocket manager for real-time notifications
        """
        self.client = supabase_client
        self.websocket_manager = websocket_manager
        self._heartbeat_tasks: Dict[str, asyncio.Task] = {}
        
    async def acquire_lock(
        self,
        session_id: str,
        user_id: str,
        lock_type: LockType = LockType.WRITE,
        duration_seconds: Optional[int] = None,
        force: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[SessionLock], Optional[LockConflict]]:
        """
        Acquire a lock on a session
        
        Args:
            session_id: ID of the session to lock
            user_id: ID of the user acquiring the lock
            lock_type: Type of lock (READ or WRITE)
            duration_seconds: Lock duration in seconds (default: 5 minutes)
            force: Force acquire even if another lock exists
            metadata: Additional metadata (browser fingerprint, IP, etc.)
            
        Returns:
            Tuple of (SessionLock if successful, LockConflict if conflict)
        """
        duration = min(duration_seconds or self.DEFAULT_LOCK_DURATION, self.MAX_LOCK_DURATION)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=duration)
        
        try:
            # First check for existing lock
            existing = await self._get_active_lock(session_id)
            
            if existing and not existing.is_expired():
                if existing.is_owned_by(user_id):
                    # User already owns the lock, refresh it
                    return await self._refresh_lock(existing, expires_at)
                elif not force:
                    # Conflict detected
                    conflict = LockConflict(
                        has_conflict=True,
                        current_holder=existing.locked_by,
                        lock_type=existing.lock_type,
                        locked_at=existing.locked_at,
                        message=f"Session is locked by another user until {existing.expires_at.isoformat()}"
                    )
                    await self._record_lock_history(
                        session_id, user_id, LockAction.CONFLICT, lock_type, metadata
                    )
                    return None, conflict
                else:
                    # Force release existing lock
                    await self._force_release_lock(existing, user_id)
            
            # Create new lock
            lock_token = str(uuid.uuid4())
            lock_data = {
                'session_id': session_id,
                'locked_by': user_id,
                'lock_type': lock_type.value,
                'expires_at': expires_at.isoformat(),
                'lock_token': lock_token,
                'browser_fingerprint': metadata.get('browser_fingerprint') if metadata else None,
                'ip_address': metadata.get('ip_address') if metadata else None,
                'user_agent': metadata.get('user_agent') if metadata else None,
            }
            
            response = self.client.table('session_locks').insert(lock_data).execute()
            
            if response.data:
                lock = self._create_lock_from_data(response.data[0])
                
                # Record in history
                await self._record_lock_history(
                    session_id, user_id, LockAction.ACQUIRED, lock_type, metadata
                )
                
                # Notify via WebSocket
                await self._notify_lock_acquired(session_id, user_id, lock_type)
                
                # Start heartbeat
                self._start_heartbeat(session_id, user_id, lock_token)
                
                return lock, None
                
        except APIError as e:
            logger.error(f"Failed to acquire lock: {e}")
            return None, LockConflict(
                has_conflict=True,
                message=f"Failed to acquire lock: {str(e)}"
            )
    
    async def release_lock(
        self,
        session_id: str,
        user_id: str,
        lock_token: Optional[str] = None
    ) -> bool:
        """
        Release a lock on a session
        
        Args:
            session_id: ID of the session
            user_id: ID of the user releasing the lock
            lock_token: Optional lock token for verification
            
        Returns:
            True if lock was released, False otherwise
        """
        try:
            # Stop heartbeat if running
            self._stop_heartbeat(session_id)
            
            # Get current lock
            existing = await self._get_active_lock(session_id)
            
            if not existing:
                return True  # No lock to release
            
            if not existing.is_owned_by(user_id, lock_token):
                logger.warning(f"User {user_id} attempted to release lock owned by {existing.locked_by}")
                return False
            
            # Delete the lock
            self.client.table('session_locks').delete().eq('session_id', session_id).execute()
            
            # Record in history
            await self._record_lock_history(
                session_id, user_id, LockAction.RELEASED, existing.lock_type
            )
            
            # Notify via WebSocket
            await self._notify_lock_released(session_id, user_id)
            
            return True
            
        except APIError as e:
            logger.error(f"Failed to release lock: {e}")
            return False
    
    async def check_lock(
        self,
        session_id: str,
        user_id: Optional[str] = None
    ) -> Tuple[Optional[SessionLock], bool]:
        """
        Check lock status for a session
        
        Args:
            session_id: ID of the session
            user_id: Optional user ID to check ownership
            
        Returns:
            Tuple of (SessionLock if exists, bool indicating if user owns it)
        """
        lock = await self._get_active_lock(session_id)
        
        if not lock:
            return None, True  # No lock, user can proceed
        
        if lock.is_expired():
            # Clean up expired lock
            await self._expire_lock(lock)
            return None, True
        
        owns_lock = lock.is_owned_by(user_id) if user_id else False
        return lock, owns_lock
    
    async def extend_lock(
        self,
        session_id: str,
        user_id: str,
        lock_token: str,
        additional_seconds: Optional[int] = None
    ) -> Optional[SessionLock]:
        """
        Extend the duration of an existing lock
        
        Args:
            session_id: ID of the session
            user_id: ID of the user extending the lock
            lock_token: Lock token for verification
            additional_seconds: Additional seconds to extend (default: 5 minutes)
            
        Returns:
            Updated SessionLock if successful, None otherwise
        """
        additional = min(
            additional_seconds or self.DEFAULT_LOCK_DURATION,
            self.MAX_LOCK_DURATION
        )
        
        existing = await self._get_active_lock(session_id)
        
        if not existing or not existing.is_owned_by(user_id, lock_token):
            return None
        
        new_expires = datetime.now(timezone.utc) + timedelta(seconds=additional)
        
        response = self.client.table('session_locks').update({
            'expires_at': new_expires.isoformat(),
            'last_activity': datetime.now(timezone.utc).isoformat()
        }).eq('session_id', session_id).eq('lock_token', lock_token).execute()
        
        if response.data:
            return self._create_lock_from_data(response.data[0])
        
        return None
    
    async def get_user_locks(self, user_id: str) -> list[SessionLock]:
        """
        Get all active locks held by a user
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of active SessionLocks
        """
        response = self.client.table('session_locks').select('*').eq(
            'locked_by', user_id
        ).gt('expires_at', datetime.now(timezone.utc).isoformat()).execute()
        
        return [self._create_lock_from_data(lock) for lock in response.data]
    
    async def expire_stale_locks(self) -> int:
        """
        Expire all stale locks
        
        Returns:
            Number of locks expired
        """
        try:
            # Get expired locks
            response = self.client.table('session_locks').select('*').lt(
                'expires_at', datetime.now(timezone.utc).isoformat()
            ).execute()
            
            expired_count = 0
            for lock_data in response.data:
                lock = self._create_lock_from_data(lock_data)
                await self._expire_lock(lock)
                expired_count += 1
            
            return expired_count
            
        except APIError as e:
            logger.error(f"Failed to expire stale locks: {e}")
            return 0
    
    # Private helper methods
    
    async def _get_active_lock(self, session_id: str) -> Optional[SessionLock]:
        """Get active lock for a session"""
        response = self.client.table('session_locks').select('*').eq(
            'session_id', session_id
        ).gt('expires_at', datetime.now(timezone.utc).isoformat()).execute()
        
        if response.data:
            return self._create_lock_from_data(response.data[0])
        return None
    
    async def _refresh_lock(
        self,
        lock: SessionLock,
        new_expires: datetime
    ) -> Tuple[Optional[SessionLock], None]:
        """Refresh an existing lock"""
        response = self.client.table('session_locks').update({
            'expires_at': new_expires.isoformat(),
            'last_activity': datetime.now(timezone.utc).isoformat()
        }).eq('session_id', lock.session_id).execute()
        
        if response.data:
            return self._create_lock_from_data(response.data[0]), None
        return lock, None
    
    async def _force_release_lock(self, lock: SessionLock, forced_by: str):
        """Force release a lock"""
        # Delete the lock
        self.client.table('session_locks').delete().eq('session_id', lock.session_id).execute()
        
        # Record forced release
        await self._record_lock_history(
            lock.session_id,
            forced_by,
            LockAction.FORCED_RELEASE,
            lock.lock_type,
            {'original_holder': lock.locked_by}
        )
        
        # Notify original holder
        await self._notify_lock_forced(lock.session_id, lock.locked_by, forced_by)
    
    async def _expire_lock(self, lock: SessionLock):
        """Expire a lock"""
        # Delete the lock
        self.client.table('session_locks').delete().eq('session_id', lock.session_id).execute()
        
        # Record expiration
        await self._record_lock_history(
            lock.session_id,
            lock.locked_by,
            LockAction.EXPIRED,
            lock.lock_type
        )
        
        # Notify
        await self._notify_lock_expired(lock.session_id, lock.locked_by)
    
    async def _record_lock_history(
        self,
        session_id: str,
        user_id: str,
        action: LockAction,
        lock_type: Optional[LockType] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record lock action in history"""
        try:
            history_data = {
                'session_id': session_id,
                'user_id': user_id,
                'action': action.value,
                'lock_type': lock_type.value if lock_type else None,
                'metadata': json.dumps(metadata) if metadata else None
            }
            
            self.client.table('session_lock_history').insert(history_data).execute()
            
        except APIError as e:
            logger.error(f"Failed to record lock history: {e}")
    
    def _create_lock_from_data(self, data: Dict[str, Any]) -> SessionLock:
        """Create SessionLock from database data"""
        return SessionLock(
            session_id=data['session_id'],
            locked_by=data['locked_by'],
            locked_at=datetime.fromisoformat(data['locked_at'].replace('Z', '+00:00')),
            lock_type=LockType(data['lock_type']),
            expires_at=datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00')),
            lock_token=data['lock_token'],
            last_activity=datetime.fromisoformat(data['last_activity'].replace('Z', '+00:00')),
            browser_fingerprint=data.get('browser_fingerprint'),
            ip_address=data.get('ip_address'),
            user_agent=data.get('user_agent')
        )
    
    # WebSocket notification methods
    
    async def _notify_lock_acquired(self, session_id: str, user_id: str, lock_type: LockType):
        """Notify via WebSocket when lock is acquired"""
        if self.websocket_manager:
            await self.websocket_manager.broadcast_to_session(
                session_id,
                {
                    'type': 'lock_acquired',
                    'session_id': session_id,
                    'locked_by': user_id,
                    'lock_type': lock_type.value,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
    
    async def _notify_lock_released(self, session_id: str, user_id: str):
        """Notify via WebSocket when lock is released"""
        if self.websocket_manager:
            await self.websocket_manager.broadcast_to_session(
                session_id,
                {
                    'type': 'lock_released',
                    'session_id': session_id,
                    'released_by': user_id,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            )
    
    async def _notify_lock_forced(self, session_id: str, original_holder: str, forced_by: str):
        """Notify when lock is forcefully released"""
        if self.websocket_manager:
            await self.websocket_manager.send_to_user(
                original_holder,
                {
                    'type': 'lock_forced',
                    'session_id': session_id,
                    'forced_by': forced_by,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'message': 'Your session lock has been forcefully released by another user'
                }
            )
    
    async def _notify_lock_expired(self, session_id: str, user_id: str):
        """Notify when lock expires"""
        if self.websocket_manager:
            await self.websocket_manager.send_to_user(
                user_id,
                {
                    'type': 'lock_expired',
                    'session_id': session_id,
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'message': 'Your session lock has expired'
                }
            )
    
    # Heartbeat management
    
    def _start_heartbeat(self, session_id: str, user_id: str, lock_token: str):
        """Start heartbeat task for a lock"""
        # Cancel existing heartbeat if any
        self._stop_heartbeat(session_id)
        
        # Create new heartbeat task
        task = asyncio.create_task(
            self._heartbeat_loop(session_id, user_id, lock_token)
        )
        self._heartbeat_tasks[session_id] = task
    
    def _stop_heartbeat(self, session_id: str):
        """Stop heartbeat task for a lock"""
        if session_id in self._heartbeat_tasks:
            self._heartbeat_tasks[session_id].cancel()
            del self._heartbeat_tasks[session_id]
    
    async def _heartbeat_loop(self, session_id: str, user_id: str, lock_token: str):
        """Heartbeat loop to keep lock alive"""
        while True:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
                
                # Update last activity
                self.client.table('session_locks').update({
                    'last_activity': datetime.now(timezone.utc).isoformat()
                }).eq('session_id', session_id).eq('lock_token', lock_token).execute()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat error for session {session_id}: {e}")
                break