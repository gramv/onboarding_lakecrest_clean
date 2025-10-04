"""
Audit Trail Service for Document Access Logging

This service provides comprehensive audit logging for all document operations
including uploads, views, downloads, and deletions. It tracks:
- Who accessed what document
- When they accessed it
- From what IP address
- What type of access (upload, view, download, delete)
- When signed URLs expire

All logging is non-blocking - if logging fails, the main operation continues.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import Request
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """Service for logging document access and operations"""
    
    def __init__(self, supabase_service):
        """
        Initialize audit service with Supabase connection.
        
        Args:
            supabase_service: SupabaseService instance for database access
        """
        self.supabase = supabase_service
        logger.info("Audit service initialized")
    
    async def log_document_access(
        self,
        document_path: str,
        document_type: str,
        access_type: str,
        accessed_by: Optional[str] = None,
        document_id: Optional[str] = None,
        request: Optional[Request] = None,
        property_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        user_role: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log document access event.
        
        This is non-blocking - if logging fails, it logs a warning but doesn't
        raise an exception, allowing the main operation to continue.
        
        Args:
            document_path: Storage path of document (required)
            document_type: Type of document - i9, w4, direct-deposit, etc. (required)
            access_type: Type of access - upload, view, download, delete, generate_url (required)
            accessed_by: User ID who accessed (optional)
            document_id: UUID of document if exists in database (optional)
            request: FastAPI request object for IP/user agent (optional)
            property_id: Property ID (optional)
            employee_id: Employee ID (optional)
            user_role: Role of user - employee, manager, hr (optional)
            expires_at: Expiration time for signed URLs (optional)
            metadata: Additional context as dict (optional)
        
        Returns:
            True if logged successfully, False otherwise
        """
        try:
            # Extract request info if available
            ip_address = None
            user_agent = None
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get('user-agent')
            
            # Build log entry
            log_entry = {
                'document_id': document_id,
                'document_path': document_path,
                'document_type': document_type,
                'access_type': access_type,
                'accessed_by': accessed_by,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'user_role': user_role,
                'property_id': property_id,
                'employee_id': employee_id,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'accessed_at': datetime.now(timezone.utc).isoformat(),
                'metadata': metadata or {}
            }
            
            # Insert into audit log (using admin client for service role access)
            self.supabase.admin_client.table('document_access_log').insert(log_entry).execute()
            
            # Log success
            logger.info(
                f"📝 Audit: {access_type} | {document_type} | {document_path} | "
                f"user={accessed_by} | ip={ip_address}"
            )
            return True
            
        except Exception as e:
            # Log error but don't fail the main operation
            logger.warning(f"⚠️ Failed to log document access: {e}")
            logger.warning(f"   Document: {document_path}, Type: {document_type}, Access: {access_type}")
            return False
    
    async def get_document_access_history(
        self,
        document_id: Optional[str] = None,
        document_path: Optional[str] = None,
        employee_id: Optional[str] = None,
        property_id: Optional[str] = None,
        user_id: Optional[str] = None,
        access_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get access history with various filters.
        
        Args:
            document_id: Filter by document ID
            document_path: Filter by document path
            employee_id: Filter by employee ID
            property_id: Filter by property ID
            user_id: Filter by user who accessed
            access_type: Filter by access type (upload, view, etc.)
            limit: Maximum number of records to return
        
        Returns:
            List of audit log entries
        """
        try:
            query = self.supabase.admin_client.table('document_access_log').select('*')
            
            # Apply filters
            if document_id:
                query = query.eq('document_id', document_id)
            if document_path:
                query = query.eq('document_path', document_path)
            if employee_id:
                query = query.eq('employee_id', employee_id)
            if property_id:
                query = query.eq('property_id', property_id)
            if user_id:
                query = query.eq('accessed_by', user_id)
            if access_type:
                query = query.eq('access_type', access_type)
            
            # Order by most recent first
            result = query.order('accessed_at', desc=True).limit(limit).execute()
            
            logger.info(f"📊 Retrieved {len(result.data)} audit log entries")
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Failed to get access history: {e}")
            return []
    
    async def get_user_activity(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get all document access activity for a specific user.
        
        Args:
            user_id: User ID to get activity for
            start_date: Filter by start date (optional)
            end_date: Filter by end date (optional)
            limit: Maximum number of records
        
        Returns:
            List of audit log entries for the user
        """
        try:
            query = self.supabase.admin_client.table('document_access_log')\
                .select('*')\
                .eq('accessed_by', user_id)
            
            if start_date:
                query = query.gte('accessed_at', start_date.isoformat())
            if end_date:
                query = query.lte('accessed_at', end_date.isoformat())
            
            result = query.order('accessed_at', desc=True).limit(limit).execute()
            
            logger.info(f"📊 Retrieved {len(result.data)} activity records for user {user_id}")
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Failed to get user activity: {e}")
            return []
    
    async def get_recent_activity(
        self,
        property_id: Optional[str] = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get recent document access activity.
        
        Args:
            property_id: Filter by property (optional)
            hours: Number of hours to look back (default 24)
            limit: Maximum number of records
        
        Returns:
            List of recent audit log entries
        """
        try:
            # Calculate cutoff time
            cutoff = datetime.now(timezone.utc).replace(microsecond=0)
            from datetime import timedelta
            cutoff = cutoff - timedelta(hours=hours)
            
            query = self.supabase.admin_client.table('document_access_log')\
                .select('*')\
                .gte('accessed_at', cutoff.isoformat())
            
            if property_id:
                query = query.eq('property_id', property_id)
            
            result = query.order('accessed_at', desc=True).limit(limit).execute()
            
            logger.info(f"📊 Retrieved {len(result.data)} recent activity records (last {hours}h)")
            return result.data
            
        except Exception as e:
            logger.error(f"❌ Failed to get recent activity: {e}")
            return []
    
    async def get_statistics(
        self,
        property_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get audit statistics for reporting.
        
        Args:
            property_id: Filter by property (optional)
            employee_id: Filter by employee (optional)
            days: Number of days to analyze (default 30)
        
        Returns:
            Dictionary with statistics
        """
        try:
            from datetime import timedelta
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            
            query = self.supabase.admin_client.table('document_access_log')\
                .select('*')\
                .gte('accessed_at', cutoff.isoformat())
            
            if property_id:
                query = query.eq('property_id', property_id)
            if employee_id:
                query = query.eq('employee_id', employee_id)
            
            result = query.execute()
            data = result.data
            
            # Calculate statistics
            stats = {
                'total_accesses': len(data),
                'by_type': {},
                'by_document_type': {},
                'unique_users': len(set(d['accessed_by'] for d in data if d.get('accessed_by'))),
                'unique_documents': len(set(d['document_path'] for d in data)),
                'period_days': days
            }
            
            # Count by access type
            for entry in data:
                access_type = entry.get('access_type', 'unknown')
                stats['by_type'][access_type] = stats['by_type'].get(access_type, 0) + 1
                
                doc_type = entry.get('document_type', 'unknown')
                stats['by_document_type'][doc_type] = stats['by_document_type'].get(doc_type, 0) + 1
            
            logger.info(f"📊 Generated statistics: {stats['total_accesses']} accesses over {days} days")
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get statistics: {e}")
            return {
                'total_accesses': 0,
                'by_type': {},
                'by_document_type': {},
                'unique_users': 0,
                'unique_documents': 0,
                'period_days': days,
                'error': str(e)
            }


# Global instance
_audit_service = None


def get_audit_service(supabase_service):
    """
    Get or create audit service instance (singleton pattern).
    
    Args:
        supabase_service: SupabaseService instance
    
    Returns:
        AuditService instance
    """
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService(supabase_service)
        logger.info("✅ Audit service created")
    return _audit_service

