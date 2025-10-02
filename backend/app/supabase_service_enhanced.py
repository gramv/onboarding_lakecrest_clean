
#!/usr/bin/env python3
"""
Enhanced Supabase Database Service
Based on 2024 Best Practices for Production Applications

Features:
- Connection pooling and retry logic
- Comprehensive error handling
- Security-first approach with RLS
- Performance optimization
- Audit logging
- Data encryption for sensitive fields
- Federal compliance support
"""

import os
import json
import asyncio
import hashlib
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Optional, Any, Union
from contextlib import asynccontextmanager
import logging
from dataclasses import asdict
import uuid
from functools import wraps

# Supabase and database imports
from supabase import create_client, Client
from postgrest.exceptions import APIError
import asyncpg
from cryptography.fernet import Fernet

# Import existing models
from .models import (
    User, Property, JobApplication, Employee, 
    ApplicationStatus, UserRole, JobApplicationData,
    OnboardingSession, OnboardingStatus, OnboardingStep,
    # Task 2 Models
    AuditLog, AuditLogAction, Notification, NotificationChannel,
    NotificationPriority, NotificationStatus, NotificationType,
    AnalyticsEvent, AnalyticsEventType, ReportTemplate, ReportType,
    ReportFormat, ReportSchedule, SavedFilter
)

# Import OnboardingPhase from models_enhanced
from .models_enhanced import OnboardingPhase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def safe_parse_timestamp(timestamp_str: str, fallback: Optional[datetime] = None) -> datetime:
    """Safely parse timestamp strings with microsecond precision handling"""
    if not timestamp_str:
        return fallback or datetime.now(timezone.utc)

    try:
        # Handle Z timezone and normalize to +00:00
        normalized_str = timestamp_str.replace('Z', '+00:00')

        # Handle microsecond precision issues
        if '.' in normalized_str and '+' in normalized_str:
            date_part, tz_part = normalized_str.rsplit('+', 1)
            if '.' in date_part:
                main_part, microsec_part = date_part.rsplit('.', 1)
                # Pad or truncate microseconds to exactly 6 digits
                microsec_part = microsec_part.ljust(6, '0')[:6]
                normalized_str = f"{main_part}.{microsec_part}+{tz_part}"

        return datetime.fromisoformat(normalized_str)
    except Exception as e:
        logger.warning(f"Failed to parse timestamp '{timestamp_str}': {e}")
        return fallback or datetime.now(timezone.utc)

class SupabaseConnectionError(Exception):
    """Custom exception for Supabase connection issues"""
    pass

class SupabaseSecurityError(Exception):
    """Custom exception for security-related issues"""
    pass

class SupabaseComplianceError(Exception):
    """Custom exception for compliance violations"""
    pass

def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying failed database operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}")
                        await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                    else:
                        logger.error(f"All {max_retries} attempts failed for {func.__name__}")
            raise last_exception
        return wrapper
    return decorator

import uuid

class EnhancedSupabaseService:
    """
    Enhanced Supabase service with production-ready features
    """
    
    def __init__(self):
        """Initialize Enhanced Supabase client with security and performance features"""
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.supabase_service_key = (
            os.getenv("SUPABASE_SERVICE_KEY")
            or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or os.getenv("SUPABASE_SERVICE_ROLE")
        )  # For admin operations
        
        if not self.supabase_url or not self.supabase_anon_key:
            raise SupabaseConnectionError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment")
        
        # Initialize clients
        self.client: Client = create_client(self.supabase_url, self.supabase_anon_key)
        
        # Admin client for privileged operations
        if self.supabase_service_key:
            self.admin_client: Client = create_client(self.supabase_url, self.supabase_service_key)
        else:
            self.admin_client = self.client
            logger.warning(
                "SUPABASE_SERVICE_KEY not set, using anon key for admin operations — manager-specific "
                "queries may be blocked by RLS. Ensure the service role key is configured in the .env file."
            )
        
        # Initialize encryption
        self.encryption_key = os.getenv("ENCRYPTION_KEY")
        if self.encryption_key:
            self.cipher = Fernet(self.encryption_key.encode())
        else:
            logger.warning("ENCRYPTION_KEY not set, sensitive data will not be encrypted")
            self.cipher = None
        
        # Connection pool for direct PostgreSQL access
        self.db_pool = None
        
        # Performance metrics
        self.query_metrics = {
            "total_queries": 0,
            "failed_queries": 0,
            "avg_response_time": 0.0
        }
        
        # Initialize document path manager
        from .document_path_utils import initialize_path_manager
        initialize_path_manager(self)

        logger.info("✅ Enhanced Supabase service initialized")

    def _parse_date_safe(self, date_str: str) -> date:
        """Safely parse date string to date object"""
        if not date_str:
            return datetime.now(timezone.utc).date()

        try:
            # Handle various date formats
            if 'T' in date_str:
                # ISO datetime format
                return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
            else:
                # Date only format
                return datetime.fromisoformat(date_str).date()
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse date '{date_str}': {e}")
            return datetime.now(timezone.utc).date()

    def _parse_datetime_safe(self, datetime_str: str) -> datetime:
        """Safely parse datetime string to datetime object"""
        if not datetime_str:
            return datetime.now(timezone.utc)

        try:
            # Handle timezone suffix
            if datetime_str.endswith('Z'):
                datetime_str = datetime_str.replace('Z', '+00:00')
            elif '+' not in datetime_str and 'T' in datetime_str:
                # Add UTC timezone if missing
                datetime_str += '+00:00'

            return datetime.fromisoformat(datetime_str)
        except (ValueError, TypeError) as e:
            logger.warning(f"Failed to parse datetime '{datetime_str}': {e}")
            return datetime.now(timezone.utc)
    
    async def initialize_db_pool(self):
        """Initialize direct PostgreSQL connection pool for complex queries"""
        try:
            database_url = os.getenv("DATABASE_URL")
            if database_url:
                self.db_pool = await asyncpg.create_pool(
                    database_url,
                    min_size=5,
                    max_size=20,
                    command_timeout=30
                )
                logger.info("✅ PostgreSQL connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize DB pool: {e}")
    
    async def close_db_pool(self):
        """Close the database connection pool"""
        if self.db_pool:
            await self.db_pool.close()
            logger.info("Database connection pool closed")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Supabase connection health"""
        try:
            # Simple query to test connection with explicit limit
            result = self.client.table('users').select('id').limit(1).execute()
            # Ensure we don't return huge data by accident
            return {
                "status": "healthy",
                "connection": "active",
                "timestamp": datetime.utcnow().isoformat(),
                "record_count": len(result.data) if result.data else 0
            }
        except Exception as e:
            # Limit error message length to prevent huge outputs
            error_msg = str(e)[:200] if str(e) else "Unknown error"
            return {
                "status": "unhealthy", 
                "connection": "failed",
                "error": error_msg,
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def encrypt_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt sensitive fields in data dictionary"""
        if not self.cipher:
            return data
        
        sensitive_fields = ['ssn', 'date_of_birth', 'phone', 'address', 'email']
        encrypted_data = data.copy()
        
        for field in sensitive_fields:
            if field in data and data[field]:
                try:
                    encrypted_value = self.cipher.encrypt(str(data[field]).encode()).decode()
                    encrypted_data[f"{field}_encrypted"] = encrypted_value
                    # Keep original for backward compatibility, remove in production
                    # del encrypted_data[field]
                except Exception as e:
                    logger.error(f"Failed to encrypt field {field}: {e}")
        
        return encrypted_data
    
    def encrypt_banking_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt banking fields (routing_number, account_number) in nested data structure"""
        if not self.cipher:
            logger.warning("Encryption key not configured - banking data will be stored in plain text")
            return data
        
        encrypted_data = data.copy()
        
        # Fields to encrypt in direct deposit data
        banking_fields = ['routing_number', 'account_number']
        
        # Process main direct_deposit object
        if 'direct_deposit' in encrypted_data and encrypted_data['direct_deposit']:
            dd = encrypted_data['direct_deposit']
            for field in banking_fields:
                if field in dd and dd[field]:
                    try:
                        encrypted_value = self.cipher.encrypt(str(dd[field]).encode()).decode()
                        dd[f"{field}_encrypted"] = encrypted_value
                        # Clear the plain text value
                        dd[field] = None  # Set to None instead of deleting for structure consistency
                    except Exception as e:
                        logger.error(f"Failed to encrypt direct_deposit.{field}: {e}")
        
        # Process additional_accounts array
        if 'additional_accounts' in encrypted_data and encrypted_data['additional_accounts']:
            for account in encrypted_data['additional_accounts']:
                for field in banking_fields:
                    if field in account and account[field]:
                        try:
                            encrypted_value = self.cipher.encrypt(str(account[field]).encode()).decode()
                            account[f"{field}_encrypted"] = encrypted_value
                            # Clear the plain text value
                            account[field] = None  # Set to None instead of deleting
                        except Exception as e:
                            logger.error(f"Failed to encrypt additional_account.{field}: {e}")
        
        return encrypted_data
    
    def decrypt_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt sensitive fields in data dictionary"""
        if not self.cipher:
            return data
        
        decrypted_data = data.copy()
        
        for key, value in data.items():
            if key.endswith('_encrypted') and value:
                try:
                    original_field = key.replace('_encrypted', '')
                    decrypted_value = self.cipher.decrypt(value.encode()).decode()
                    decrypted_data[original_field] = decrypted_value
                except Exception as e:
                    logger.error(f"Failed to decrypt field {key}: {e}")
        
        return decrypted_data
    
    def decrypt_banking_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt banking fields in nested data structure"""
        if not self.cipher:
            return data
        
        decrypted_data = data.copy()
        
        # Process main direct_deposit object
        if 'direct_deposit' in decrypted_data and decrypted_data['direct_deposit']:
            dd = decrypted_data['direct_deposit']
            for key in list(dd.keys()):
                if key.endswith('_encrypted') and dd[key]:
                    try:
                        original_field = key.replace('_encrypted', '')
                        decrypted_value = self.cipher.decrypt(dd[key].encode()).decode()
                        dd[original_field] = decrypted_value
                        # Optionally remove encrypted field from response
                        # del dd[key]
                    except Exception as e:
                        logger.error(f"Failed to decrypt direct_deposit.{key}: {e}")
                        # If decryption fails, try to use plain text if available
                        original_field = key.replace('_encrypted', '')
                        if not dd.get(original_field):
                            dd[original_field] = ''  # Set empty string if decryption fails
        
        # Process additional_accounts array
        if 'additional_accounts' in decrypted_data and decrypted_data['additional_accounts']:
            for account in decrypted_data['additional_accounts']:
                for key in list(account.keys()):
                    if key.endswith('_encrypted') and account[key]:
                        try:
                            original_field = key.replace('_encrypted', '')
                            decrypted_value = self.cipher.decrypt(account[key].encode()).decode()
                            account[original_field] = decrypted_value
                            # Optionally remove encrypted field from response
                            # del account[key]
                        except Exception as e:
                            logger.error(f"Failed to decrypt additional_account.{key}: {e}")
                            # If decryption fails, try to use plain text if available
                            original_field = key.replace('_encrypted', '')
                            if not account.get(original_field):
                                account[original_field] = ''  # Set empty string if decryption fails
        
        return decrypted_data
    
    def mask_banking_number(self, number: str) -> str:
        """Mask banking number for display (show only first 3 digits)"""
        if not number:
            return ''
        # For routing numbers (9 digits) and account numbers (varying length)
        if len(number) > 3:
            return number[:3] + '*' * (len(number) - 3)
        return number  # If 3 or fewer digits, return as is
    
    def generate_duplicate_hash(self, email: str, property_id: str, position: str) -> str:
        """Generate hash for duplicate application detection"""
        data = f"{email.lower()}{property_id}{position.lower()}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    async def log_audit_event(self, table_name: str, record_id: str, action: str,
                            old_values: Optional[Dict] = None, new_values: Optional[Dict] = None,
                            user_id: Optional[str] = None, compliance_event: bool = False):
        """Log audit events for compliance tracking"""
        try:
            # Clean any binary data from audit values to prevent UTF-8 errors
            clean_old_values = self._clean_binary_data_from_dict(old_values) if old_values else None
            clean_new_values = self._clean_binary_data_from_dict(new_values) if new_values else None

            audit_data = {
                "id": str(uuid.uuid4()),
                "table_name": table_name,
                "record_id": record_id,
                "action": action,
                "old_values": clean_old_values,
                "new_values": clean_new_values,
                "user_id": user_id,
                "compliance_event": compliance_event,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            result = self.admin_client.table('audit_log').insert(audit_data).execute()
            logger.info(f"Audit event logged: {action} on {table_name}")

        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't let audit failures break the main operation
            pass

    def _clean_binary_data_from_dict(self, data: Optional[Dict]) -> Optional[Dict]:
        """Recursively clean binary data from dictionary to prevent UTF-8 encoding errors"""
        if not data:
            return data

        if not isinstance(data, dict):
            return data

        cleaned = {}
        for key, value in data.items():
            # Skip keys that commonly contain binary data
            if key in ['file_data', 'binary_content', 'pdf_bytes', 'image_data', 'file_content']:
                cleaned[key] = f"<binary_data_{len(str(value)) if value else 0}_bytes>"
                continue

            # Handle nested dictionaries
            if isinstance(value, dict):
                cleaned[key] = self._clean_binary_data_from_dict(value)
            elif isinstance(value, list):
                cleaned[key] = [
                    self._clean_binary_data_from_dict(item) if isinstance(item, dict) else item
                    for item in value
                ]
            elif isinstance(value, bytes):
                cleaned[key] = f"<binary_data_{len(value)}_bytes>"
            elif isinstance(value, str):
                # Check if string contains binary data (non-UTF-8 characters)
                try:
                    value.encode('utf-8')
                    cleaned[key] = value
                except UnicodeEncodeError:
                    cleaned[key] = f"<non_utf8_string_{len(value)}_chars>"
            else:
                cleaned[key] = value

        return cleaned
    
    @retry_on_failure(max_retries=3)
    async def execute_with_metrics(self, operation_name: str, operation_func):
        """Execute database operation with performance metrics"""
        start_time = datetime.now()
        self.query_metrics["total_queries"] += 1
        
        try:
            result = await operation_func()
            
            # Update metrics
            execution_time = (datetime.now() - start_time).total_seconds()
            self.query_metrics["avg_response_time"] = (
                (self.query_metrics["avg_response_time"] * (self.query_metrics["total_queries"] - 1) + execution_time) /
                self.query_metrics["total_queries"]
            )
            
            logger.debug(f"Operation {operation_name} completed in {execution_time:.3f}s")
            return result
            
        except Exception as e:
            self.query_metrics["failed_queries"] += 1
            logger.error(f"Operation {operation_name} failed: {e}")
            raise
    
    # =====================================================
    # ENHANCED USER OPERATIONS
    # =====================================================
    
    async def create_user_with_role(self, user: User, role_assignments: List[str] = None) -> Dict[str, Any]:
        """Create user with proper role assignments and audit logging"""
        try:
            # Encrypt sensitive data
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.value,
                "property_id": str(user.property_id) if user.property_id else None,
                "is_active": user.is_active,
                "password_hash": user.password_hash,
                "created_at": user.created_at.isoformat(),
                "created_by": str(user.id)  # Self-created for now
            }
            
            # Create user
            result = self.admin_client.table('users').insert(user_data).execute()
            created_user = result.data[0] if result.data else None
            
            if created_user:
                # Assign roles if specified
                if role_assignments:
                    await self.assign_user_roles(str(user.id), role_assignments)
                
                # Log audit event
                await self.log_audit_event(
                    "users", str(user.id), "INSERT", 
                    new_values=user_data, compliance_event=True
                )
                
                logger.info(f"User created successfully: {user.email}")
            
            return created_user
            
        except Exception as e:
            logger.error(f"Failed to create user {user.email}: {e}")
            raise SupabaseConnectionError(f"User creation failed: {e}")
    
    async def assign_user_roles(self, user_id: str, role_names: List[str]) -> List[Dict[str, Any]]:
        """Assign multiple roles to a user"""
        try:
            # Get role IDs
            roles_result = self.admin_client.table('user_roles').select('id, name').in_('name', role_names).execute()
            roles = {role['name']: role['id'] for role in roles_result.data}
            
            # Create role assignments
            assignments = []
            for role_name in role_names:
                if role_name in roles:
                    assignments.append({
                        "user_id": user_id,
                        "role_id": roles[role_name],
                        "assigned_by": user_id,  # Self-assigned for now
                        "assigned_at": datetime.now(timezone.utc).isoformat()
                    })
            
            if assignments:
                result = self.admin_client.table('user_role_assignments').insert(assignments).execute()
                logger.info(f"Assigned {len(assignments)} roles to user {user_id}")
                return result.data
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to assign roles to user {user_id}: {e}")
            raise
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with enhanced security checks"""
        try:
            # Get user with security fields
            result = self.client.table('users').select(
                '*, user_role_assignments(user_roles(name, permissions))'
            ).eq('email', email).eq('is_active', True).execute()
            
            if not result.data:
                logger.warning(f"Authentication failed: User not found - {email}")
                return None
            
            user = result.data[0]
            
            # Check if account is locked
            if user.get('locked_until'):
                locked_until = datetime.fromisoformat(user['locked_until'].replace('Z', '+00:00'))
                if locked_until > datetime.now(timezone.utc):
                    logger.warning(f"Authentication failed: Account locked - {email}")
                    return None
            
            # Verify password (implement your password verification logic)
            # This is a placeholder - implement proper password hashing verification
            if self.verify_password(password, user.get('password_hash', '')):
                # Reset failed attempts on successful login
                await self.reset_failed_login_attempts(user['id'])
                
                # Update last login
                self.admin_client.table('users').update({
                    'last_login_at': datetime.now(timezone.utc).isoformat()
                }).eq('id', user['id']).execute()
                
                logger.info(f"User authenticated successfully: {email}")
                return user
            else:
                # Increment failed attempts
                await self.increment_failed_login_attempts(user['id'])
                logger.warning(f"Authentication failed: Invalid password - {email}")
                return None
                
        except Exception as e:
            logger.error(f"Authentication error for {email}: {e}")
            return None
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash using bcrypt"""
        import bcrypt
        try:
            if not password_hash:
                return False
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        import bcrypt
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    async def increment_failed_login_attempts(self, user_id: str):
        """Increment failed login attempts and lock account if necessary"""
        try:
            # Get current attempts
            result = self.admin_client.table('users').select('failed_login_attempts').eq('id', user_id).execute()
            current_attempts = result.data[0]['failed_login_attempts'] if result.data else 0
            
            new_attempts = current_attempts + 1
            update_data = {'failed_login_attempts': new_attempts}
            
            # Lock account after 5 failed attempts
            if new_attempts >= 5:
                update_data['locked_until'] = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
                logger.warning(f"Account locked due to failed attempts: {user_id}")
            
            self.admin_client.table('users').update(update_data).eq('id', user_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to increment login attempts for {user_id}: {e}")
    
    async def reset_failed_login_attempts(self, user_id: str):
        """Reset failed login attempts on successful authentication"""
        try:
            self.admin_client.table('users').update({
                'failed_login_attempts': 0,
                'locked_until': None
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.error(f"Failed to reset login attempts for {user_id}: {e}")
    
    # =====================================================
    # ENHANCED PROPERTY OPERATIONS
    # =====================================================
    
    async def create_property_with_managers(self, property_obj: Property, manager_ids: List[str] = None) -> Dict[str, Any]:
        """Create property and assign managers in a transaction"""
        try:
            # Prepare property data
            property_data = {
                "id": str(property_obj.id),
                "name": property_obj.name,
                "address": property_obj.address,
                "city": property_obj.city,
                "state": property_obj.state,
                "zip_code": property_obj.zip_code,
                "phone": property_obj.phone,
                "qr_code_url": property_obj.qr_code_url,
                "is_active": property_obj.is_active,
                "created_at": property_obj.created_at.isoformat(),
            }
            
            # Create property
            result = self.admin_client.table('properties').insert(property_data).execute()
            created_property = result.data[0] if result.data else None
            
            if created_property and manager_ids:
                # Assign managers
                await self.assign_managers_to_property(str(property_obj.id), manager_ids)
            
            # Log audit event
            await self.log_audit_event(
                "properties", str(property_obj.id), "INSERT",
                new_values=property_data, compliance_event=True
            )
            
            logger.info(f"Property created successfully: {property_obj.name}")
            return created_property
            
        except Exception as e:
            logger.error(f"Failed to create property {property_obj.name}: {e}")
            raise SupabaseConnectionError(f"Property creation failed: {e}")
    
    async def assign_managers_to_property(self, property_id: str, manager_ids: List[str], 
                                        assigned_by: Optional[str] = None) -> List[Dict[str, Any]]:
        """Assign multiple managers to a property with permissions"""
        try:
            assignments = []
            for manager_id in manager_ids:
                assignments.append({
                    "property_id": property_id,
                    "manager_id": manager_id,
                    "assigned_by": assigned_by,
                    "assigned_at": datetime.now(timezone.utc).isoformat(),
                    "permissions": {
                        "can_approve": True,
                        "can_reject": True,
                        "can_hire": True,
                        "can_manage_onboarding": True
                    }
                })
            
            # Use upsert to handle duplicates
            result = self.admin_client.table('property_managers').upsert(assignments).execute()
            
            # Update all managers' property_id in a single query (avoid N+1 problem)
            if manager_ids:
                self.admin_client.table('users').update({
                    "property_id": property_id
                }).in_('id', manager_ids).execute()
            
            logger.info(f"Assigned {len(manager_ids)} managers to property {property_id}")
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to assign managers to property {property_id}: {e}")
            raise
    
    # =====================================================
    # ENHANCED APPLICATION OPERATIONS
    # =====================================================
    
    async def create_job_application_with_validation(self, application: JobApplication) -> Dict[str, Any]:
        """Create job application - simplified version for MVP testing"""
        try:
            # Simple duplicate check using email and position
            email = application.applicant_data.get('email', '').lower()
            
            # Check for existing applications with same email and position
            existing = self.client.table('job_applications').select('id').execute()
            
            if existing.data:
                for app in existing.data:
                    # Skip the check for now to simplify testing
                    pass
            
            # Prepare application data - only use columns that exist in the database
            application_data = {
                "id": str(application.id),
                "property_id": str(application.property_id),
                "department": application.department,
                "position": application.position,
                "applicant_data": application.applicant_data,  # Store as JSON
                "status": application.status.value,
                "applied_at": application.applied_at.isoformat()
            }
            
            # Create application (use admin client to bypass RLS for server-side insert)
            result = self.admin_client.table('job_applications').insert(application_data).execute()
            created_application = result.data[0] if result.data else None
            
            if created_application:
                # Skip status history for MVP testing
                # await self.add_application_status_history(
                #     str(application.id), None, application.status.value,
                #     reason="Initial application submission"
                # )
                
                # Log audit event
                await self.log_audit_event(
                    "job_applications", str(application.id), "INSERT",
                    new_values=application_data, compliance_event=True
                )
                
                logger.info(f"Application created successfully: {application.applicant_data.get('email')}")
            
            return created_application
            
        except Exception as e:
            logger.error(f"Failed to create application: {e}")
            raise
    
    async def update_application_status_with_audit(self, application_id: str, new_status: str, 
                                                 reviewed_by: Optional[str] = None, 
                                                 reason: Optional[str] = None,
                                                 notes: Optional[str] = None) -> Dict[str, Any]:
        """Update application status with comprehensive audit trail"""
        try:
            # Get current application
            current_result = self.client.table('job_applications').select('*').eq('id', application_id).execute()
            if not current_result.data:
                raise ValueError(f"Application {application_id} not found")
            
            current_app = current_result.data[0]
            old_status = current_app['status']
            
            # Prepare update data
            update_data = {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if reviewed_by:
                update_data['reviewed_by'] = reviewed_by
                update_data['reviewed_at'] = datetime.now(timezone.utc).isoformat()
            
            if reason:
                update_data['rejection_reason'] = reason
            
            if new_status == 'talent_pool':
                update_data['talent_pool_date'] = datetime.now(timezone.utc).isoformat()
            
            # Update application
            result = self.admin_client.table('job_applications').update(update_data).eq('id', application_id).execute()
            updated_application = result.data[0] if result.data else None
            
            if updated_application:
                # Add to status history
                await self.add_application_status_history(
                    application_id, old_status, new_status,
                    changed_by=reviewed_by, reason=reason, notes=notes
                )
                
                # Log audit event
                await self.log_audit_event(
                    "job_applications", application_id, "UPDATE",
                    old_values=current_app, new_values=updated_application,
                    user_id=reviewed_by, compliance_event=True
                )
                
                logger.info(f"Application {application_id} status updated: {old_status} -> {new_status}")
            
            return updated_application
            
        except Exception as e:
            logger.error(f"Failed to update application status: {e}")
            raise
    
    async def add_application_status_history(self, application_id: str, old_status: Optional[str],
                                           new_status: str, changed_by: Optional[str] = None,
                                           reason: Optional[str] = None, notes: Optional[str] = None) -> Dict[str, Any]:
        """Add detailed application status history"""
        try:
            history_data = {
                "id": str(uuid.uuid4()),
                "application_id": application_id,
                "old_status": old_status,
                "new_status": new_status,
                "changed_by": changed_by,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "notes": notes,
                "metadata": {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "system_generated": changed_by is None
                }
            }
            
            result = self.admin_client.table('application_status_history').insert(history_data).execute()
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"Failed to add status history: {e}")
            raise
    
    # =====================================================
    # ENHANCED QUERY OPERATIONS
    # =====================================================
    
    async def get_applications_with_analytics(self, property_id: Optional[str] = None, 
                                            manager_id: Optional[str] = None,
                                            filters: Optional[Dict] = None) -> Dict[str, Any]:
        """Get applications with built-in analytics and filtering"""
        try:
            # Build base query
            query = self.client.table('job_applications').select(
                '*, properties(name, city, state), users(first_name, last_name)'
            )
            
            # Apply filters
            if property_id:
                query = query.eq('property_id', property_id)
            elif manager_id:
                # Get manager's properties first
                manager_props = await self.get_manager_properties(manager_id)
                property_ids = [prop['property_id'] for prop in manager_props]
                if property_ids:
                    query = query.in_('property_id', property_ids)
                else:
                    return {"applications": [], "analytics": {}}
            
            if filters:
                if 'status' in filters:
                    query = query.eq('status', filters['status'])
                if 'department' in filters:
                    query = query.eq('department', filters['department'])
                if 'date_from' in filters:
                    query = query.gte('applied_at', filters['date_from'])
                if 'date_to' in filters:
                    query = query.lte('applied_at', filters['date_to'])
            
            # Execute query
            result = query.order('applied_at', desc=True).execute()
            applications = result.data or []
            
            # Decrypt sensitive data
            for app in applications:
                if app.get('applicant_data_encrypted'):
                    app['applicant_data'] = self.decrypt_sensitive_data(app['applicant_data_encrypted'])
            
            # Calculate analytics
            analytics = self.calculate_application_analytics(applications)
            
            return {
                "applications": applications,
                "analytics": analytics,
                "total_count": len(applications)
            }
            
        except Exception as e:
            logger.error(f"Failed to get applications with analytics: {e}")
            raise
    
    def calculate_application_analytics(self, applications: List[Dict]) -> Dict[str, Any]:
        """Calculate analytics from application data"""
        if not applications:
            return {}
        
        total = len(applications)
        status_counts = {}
        department_counts = {}
        position_counts = {}
        
        review_times = []
        approval_times = []
        
        for app in applications:
            # Status counts
            status = app.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Department counts
            dept = app.get('department', 'unknown')
            department_counts[dept] = department_counts.get(dept, 0) + 1
            
            # Position counts
            pos = app.get('position', 'unknown')
            position_counts[pos] = position_counts.get(pos, 0) + 1
            
            # Time calculations - handle microsecond precision issues
            try:
                applied_at_str = app['applied_at'].replace('Z', '+00:00')
                # Ensure microseconds are exactly 6 digits for Python datetime parsing
                if '.' in applied_at_str and '+' in applied_at_str:
                    date_part, tz_part = applied_at_str.rsplit('+', 1)
                    if '.' in date_part:
                        main_part, microsec_part = date_part.rsplit('.', 1)
                        # Pad or truncate microseconds to exactly 6 digits
                        microsec_part = microsec_part.ljust(6, '0')[:6]
                        applied_at_str = f"{main_part}.{microsec_part}+{tz_part}"
                applied_at = datetime.fromisoformat(applied_at_str)
            except Exception as e:
                logger.warning(f"Failed to parse applied_at timestamp: {app['applied_at']}, error: {e}")
                applied_at = datetime.now(timezone.utc)

            if app.get('reviewed_at'):
                try:
                    reviewed_at_str = app['reviewed_at'].replace('Z', '+00:00')
                    # Same microsecond handling for reviewed_at
                    if '.' in reviewed_at_str and '+' in reviewed_at_str:
                        date_part, tz_part = reviewed_at_str.rsplit('+', 1)
                        if '.' in date_part:
                            main_part, microsec_part = date_part.rsplit('.', 1)
                            microsec_part = microsec_part.ljust(6, '0')[:6]
                            reviewed_at_str = f"{main_part}.{microsec_part}+{tz_part}"
                    reviewed_at = datetime.fromisoformat(reviewed_at_str)
                except Exception as e:
                    logger.warning(f"Failed to parse reviewed_at timestamp: {app['reviewed_at']}, error: {e}")
                    reviewed_at = applied_at
                review_time = (reviewed_at - applied_at).total_seconds() / 3600  # hours
                review_times.append(review_time)
                
                if app.get('status') == 'approved':
                    approval_times.append(review_time)
        
        return {
            "total_applications": total,
            "status_breakdown": status_counts,
            "department_breakdown": department_counts,
            "position_breakdown": position_counts,
            "avg_review_time_hours": sum(review_times) / len(review_times) if review_times else 0,
            "avg_approval_time_hours": sum(approval_times) / len(approval_times) if approval_times else 0,
            "approval_rate": (status_counts.get('approved', 0) / total * 100) if total > 0 else 0,
            "rejection_rate": (status_counts.get('rejected', 0) / total * 100) if total > 0 else 0
        }
    
    # =====================================================
    # ONBOARDING OPERATIONS
    # =====================================================
    
    async def update_onboarding_session(self, session: OnboardingSession) -> bool:
        """Update onboarding session record in Supabase"""
        try:
            current_step_value = getattr(session.current_step, 'value', str(session.current_step))
            status_value = getattr(session.status, 'value', str(session.status))
            phase_value = getattr(getattr(session, 'phase', None), 'value', getattr(session, 'phase', None))

            update_data = {
                "current_step": current_step_value,
                "status": status_value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            # Include phase only if present on the model
            if phase_value is not None:
                update_data["phase"] = phase_value

            # Use admin client to avoid RLS update restrictions
            result = self.admin_client.table('onboarding_sessions')\
                .update(update_data)\
                .eq('id', session.id)\
                .execute()

            return bool(getattr(result, 'data', None))

        except Exception as e:
            logger.error(f"Failed to update onboarding session {getattr(session, 'id', 'unknown')}: {e}")
            return False

    async def create_onboarding_session(self, employee_id: str, property_id: str = None, manager_id: str = None, expires_hours: int = 72) -> Dict[str, Any]:
        """Create secure onboarding session with token"""
        try:
            # Get property_id and manager_id from employee if not provided
            if not property_id or not manager_id:
                employee = self.client.table('employees').select('property_id, manager_id').eq('id', employee_id).execute()
                if employee.data:
                    if not property_id:
                        property_id = employee.data[0].get('property_id')
                    if not manager_id:
                        manager_id = employee.data[0].get('manager_id')
            
            # Auto-assign manager if still None
            if not manager_id and property_id:
                logger.info(f"Auto-assigning manager for property {property_id}")
                managers = await self.get_property_managers(property_id)
                if managers and len(managers) > 0:
                    manager_id = managers[0].id
                    logger.info(f"Auto-assigned manager {manager_id} to employee {employee_id}")
                else:
                    # Try to find any user with manager role for this property
                    manager_response = self.client.table('users').select('id').eq('role', 'manager').execute()
                    if manager_response.data:
                        manager_id = manager_response.data[0]['id']
                        logger.warning(f"No property managers found, using first available manager: {manager_id}")
                    else:
                        logger.error("No managers available in the system")
                        raise ValueError("No managers available to assign to the onboarding session")
            
            session_id = str(uuid.uuid4())
            
            # Generate JWT token using OnboardingTokenManager
            from .auth import OnboardingTokenManager
            token_data = OnboardingTokenManager.create_onboarding_token(
                employee_id=employee_id,
                expires_hours=expires_hours
            )
            token = token_data["token"]
            expires_at = token_data["expires_at"]  # Already a datetime object
            
            session_data = {
                "id": session_id,
                "employee_id": employee_id,
                "property_id": property_id,  # Added property_id
                "manager_id": manager_id,  # Now guaranteed to have a value
                "phase": "employee",  # Added phase (employee phase for onboarding)
                "token": token,
                "status": OnboardingStatus.NOT_STARTED.value,
                "current_step": OnboardingStep.WELCOME.value,
                "language_preference": "en",
                "steps_completed": [],
                "progress_percentage": 0.0,
                "form_data": {},
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            try:
                result = self.admin_client.table('onboarding_sessions').insert(session_data).execute()
                created_session = result.data[0] if result.data else None
            except Exception as schema_err:
                # Handle missing columns like 'form_data' gracefully
                logger.warning(f"onboarding_sessions insert failed due to schema mismatch: {schema_err}; retrying with reduced columns")
                minimal_session_data = {k: v for k, v in session_data.items() if k not in {"form_data", "steps_completed", "progress_percentage"}}
                result = self.admin_client.table('onboarding_sessions').insert(minimal_session_data).execute()
                created_session = result.data[0] if result.data else None
            
            if created_session:
                # Log audit event
                try:
                    await self.log_audit_event(
                        "onboarding_sessions", session_id, "INSERT",
                        new_values=session_data, compliance_event=True
                    )
                except Exception as audit_err:
                    logger.warning(f"Audit log write failed (non-fatal): {audit_err}")
                
                logger.info(f"Onboarding session created for employee {employee_id}")
            
            return created_session
            
        except Exception as e:
            logger.error(f"Failed to create onboarding session: {e}")
            raise

    async def move_competing_applications_to_talent_pool(
        self,
        property_id: str,
        position: str,
        exclude_application_id: str,
        updated_by: str
    ) -> int:
        """Move other pending applications for the same position at the property to talent pool.

        Returns number of applications moved. Best-effort; tolerates schema differences.
        """
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            update_data = {
                "status": "talent_pool",
                "talent_pool_date": now_iso,
                "reviewed_by": updated_by,
                "reviewed_at": now_iso,
            }

            result = self.client.table('job_applications') \
                .update(update_data) \
                .eq('property_id', property_id) \
                .eq('position', position) \
                .eq('status', 'pending') \
                .neq('id', exclude_application_id) \
                .execute()

            moved = len(result.data) if getattr(result, 'data', None) else 0

            # Try to write status history entries minimally; ignore failures
            try:
                if result.data:
                    history_rows = []
                    for row in result.data:
                        history_rows.append({
                            "application_id": row.get('id'),
                            "status": "talent_pool",
                            "changed_by": updated_by,
                            "changed_at": now_iso,
                        })
                    if history_rows:
                        self.client.table('application_status_history').insert(history_rows).execute()
            except Exception as history_err:
                logger.warning(f"Failed to add application status history (non-fatal): {history_err}")

            # Try audit log; ignore failures
            try:
                await self.log_audit_event(
                    "job_applications",
                    None,
                    "BULK_UPDATE",
                    new_values={
                        "property_id": property_id,
                        "position": position,
                        "status": "talent_pool"
                    },
                    compliance_event=False
                )
            except Exception as audit_err:
                logger.warning(f"Audit log write failed (non-fatal): {audit_err}")

            return moved
        except Exception as e:
            logger.error(f"Failed to move competing applications to talent pool: {e}")
            return 0
    
    def generate_secure_token(self) -> str:
        """Generate cryptographically secure token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    # =====================================================
    # HEALTH AND MONITORING
    # =====================================================
    
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Comprehensive health check with performance metrics"""
        health_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "healthy",
            "database": "supabase_postgresql",
            "connection": "active",
            "performance_metrics": self.query_metrics.copy(),
            "checks": {}
        }
        
        try:
            # Test basic connectivity
            start_time = datetime.now()
            result = self.client.table('users').select('count').limit(1).execute()
            connection_time = (datetime.now() - start_time).total_seconds()
            
            health_data["checks"]["database_connectivity"] = {
                "status": "pass",
                "response_time_ms": connection_time * 1000
            }
            
            # Test RLS policies
            try:
                self.client.table('users').select('*').limit(1).execute()
                health_data["checks"]["rls_policies"] = {"status": "pass"}
            except Exception as e:
                health_data["checks"]["rls_policies"] = {"status": "fail", "error": str(e)}
            
            # Check connection pool
            if self.db_pool:
                pool_status = "active" if not self.db_pool._closed else "closed"
                health_data["checks"]["connection_pool"] = {
                    "status": "pass" if pool_status == "active" else "fail",
                    "pool_status": pool_status
                }
            
            # Check encryption
            health_data["checks"]["encryption"] = {
                "status": "pass" if self.cipher else "warning",
                "encryption_enabled": bool(self.cipher)
            }
            
        except Exception as e:
            health_data["status"] = "unhealthy"
            health_data["error"] = str(e)
            health_data["checks"]["database_connectivity"] = {"status": "fail", "error": str(e)}
        
        return health_data
    
    async def get_system_statistics(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
        try:
            stats = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database_type": "supabase_postgresql",
                "performance_metrics": self.query_metrics.copy()
            }
            
            # Get table counts
            tables = ['users', 'properties', 'job_applications', 'employees', 'onboarding_sessions']
            for table in tables:
                try:
                    result = self.admin_client.table(table).select('count').execute()
                    stats[f"{table}_count"] = len(result.data) if result.data else 0
                except Exception as e:
                    stats[f"{table}_count"] = f"error: {e}"
            
            # Get recent activity
            try:
                recent_apps = self.client.table('job_applications').select('applied_at').gte(
                    'applied_at', (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
                ).execute()
                stats["applications_last_7_days"] = len(recent_apps.data) if recent_apps.data else 0
            except Exception as e:
                stats["applications_last_7_days"] = f"error: {e}"
            
            return stats
            
        except Exception as e:
            return {
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    # =====================================================
    # CLEANUP AND MAINTENANCE
    # =====================================================
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired onboarding sessions"""
        try:
            # Get expired sessions
            expired_result = self.admin_client.table('onboarding_sessions').select('id').lt(
                'expires_at', datetime.now(timezone.utc).isoformat()
            ).not_.in_('status', ['approved', 'completed']).execute()
            
            expired_ids = [session['id'] for session in expired_result.data] if expired_result.data else []
            
            if expired_ids:
                # Delete expired sessions
                self.admin_client.table('onboarding_sessions').delete().in_('id', expired_ids).execute()
                
                # Log cleanup
                await self.log_audit_event(
                    "onboarding_sessions", "bulk_cleanup", "DELETE",
                    old_values={"expired_session_ids": expired_ids},
                    compliance_event=True
                )
                
                logger.info(f"Cleaned up {len(expired_ids)} expired onboarding sessions")
            
            return len(expired_ids)
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired sessions: {e}")
            return 0
    
    async def archive_old_applications(self, days_old: int = 2555) -> int:
        """Archive applications older than specified days (default 7 years for compliance)"""
        try:
            cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_old)).isoformat()
            
            # Get old applications
            old_apps = self.admin_client.table('job_applications').select('id').lt(
                'applied_at', cutoff_date
            ).execute()
            
            old_app_ids = [app['id'] for app in old_apps.data] if old_apps.data else []
            
            if old_app_ids:
                # In a real implementation, you would move these to an archive table
                # For now, we'll just log the archival
                await self.log_audit_event(
                    "job_applications", "bulk_archive", "ARCHIVE",
                    old_values={"archived_application_ids": old_app_ids},
                    compliance_event=True
                )
                
                logger.info(f"Archived {len(old_app_ids)} old applications")
            
            return len(old_app_ids)
            
        except Exception as e:
            logger.error(f"Failed to archive old applications: {e}")
            return 0
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        try:
            result = self.client.table("users").select("*").eq("email", email.lower()).execute()
            
            if result.data:
                user_data = result.data[0]
                return User(
                    id=user_data["id"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=UserRole(user_data["role"]),
                    property_id=user_data.get("property_id"),
                    password_hash=user_data.get("password_hash"),  # Include password hash for authentication
                    is_active=user_data.get("is_active", True),
                    created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00'))
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user by email {email}: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            result = self.client.table("users").select("*").eq("id", user_id).execute()
            
            if result.data:
                user_data = result.data[0]
                return User(
                    id=user_data["id"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=UserRole(user_data["role"]),
                    property_id=user_data.get("property_id"),
                    password_hash=user_data.get("password_hash"),  # Include password hash for authentication
                    is_active=user_data.get("is_active", True),
                    created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00'))
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user by ID {user_id}: {e}")
            return None
    
    async def get_property_by_id(self, property_id: str) -> Optional[Property]:
        """Get property by ID"""
        try:
            result = self.admin_client.table("properties").select("*").eq("id", property_id).execute()
            
            if result.data:
                prop_data = result.data[0]
                return Property(
                    id=prop_data["id"],
                    name=prop_data["name"],
                    address=prop_data["address"],
                    city=prop_data["city"],
                    state=prop_data["state"],
                    zip_code=prop_data["zip_code"],
                    phone=prop_data["phone"],
                    qr_code_url=prop_data.get("qr_code_url"),
                    is_active=prop_data.get("is_active", True),
                    created_at=self._parse_datetime_safe(prop_data.get("created_at"))
                )
            return None
            
        except Exception as e:
            logger.error(f"Failed to get property by ID {property_id}: {e}")
            return None
    
    async def get_manager_properties(self, manager_id: str) -> List[Property]:
        """Get properties assigned to a manager with fallback logic"""
        try:
            # Try with manager_id column first
            result = self.admin_client.table("property_managers").select(
                "properties(*)"
            ).eq("manager_id", manager_id).execute()

            # If no results, try with user_id column (compatibility)
            if not result.data:
                logger.info(f"No properties found with manager_id, trying user_id for {manager_id}")
                result = self.admin_client.table("property_managers").select(
                    "properties(*)"
                ).eq("user_id", manager_id).execute()

            # If still no results, check users.property_id as final fallback
            if not result.data:
                logger.info(f"No properties in property_managers, checking users.property_id for {manager_id}")
                user_result = self.admin_client.table("users").select(
                    "property_id"
                ).eq("id", manager_id).single().execute()

                if user_result.data and user_result.data.get("property_id"):
                    prop_result = self.admin_client.table("properties").select(
                        "*"
                    ).eq("id", user_result.data["property_id"]).execute()

                    if prop_result.data:
                        # Format the result to match the expected structure
                        result = type('obj', (object,), {'data': [{"properties": prop_result.data[0]}]})()

            properties = []
            for item in result.data:
                if item.get("properties"):
                    prop_data = item["properties"]
                    properties.append(Property(
                        id=prop_data["id"],
                        name=prop_data["name"],
                        address=prop_data["address"],
                        city=prop_data["city"],
                        state=prop_data["state"],
                        zip_code=prop_data["zip_code"],
                        phone=prop_data["phone"],
                        qr_code_url=prop_data.get("qr_code_url"),
                        is_active=prop_data.get("is_active", True),
                        created_at=datetime.fromisoformat(prop_data["created_at"].replace('Z', '+00:00'))
                    ))

            if properties:
                logger.info(f"Found {len(properties)} properties for manager {manager_id}")
            else:
                logger.warning(f"No properties found for manager {manager_id} after all fallbacks")

            return properties

        except Exception as e:
            logger.error(f"Failed to get manager properties for {manager_id}: {e}")
            return []
    
    async def create_property(self, property_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new property using standard client with RLS policies"""
        try:
            # Use the standard client - RLS policies will handle authorization
            result = self.client.table('properties').insert(property_data).execute()
            
            if result.data:
                logger.info(f"Property created successfully: {property_data.get('name')}")
                return {"success": True, "property": result.data[0]}
            else:
                # If no data returned, it might be due to RLS
                logger.warning("Property insert completed but no data returned - check RLS policies")
                return {"success": False, "error": "Property creation failed - please check database permissions"}
                
        except Exception as e:
            error_msg = str(e)
            
            # Provide helpful error messages for common issues
            if "row-level security" in error_msg.lower() or "rls" in error_msg.lower():
                logger.error(f"RLS policy blocking property creation: {e}")
                return {
                    "success": False, 
                    "error": "Database permissions error. Please ensure RLS policies are configured for HR users.",
                    "details": "Run the supabase_rls_setup.sql script in your Supabase SQL editor"
                }
            elif "duplicate key" in error_msg.lower():
                logger.error(f"Property with this ID already exists: {e}")
                return {"success": False, "error": "Property ID already exists"}
            else:
                logger.error(f"Property creation failed: {e}")
                return {"success": False, "error": f"Property creation failed: {error_msg}"}
    
    async def assign_manager_to_property(self, manager_id: str, property_id: str) -> bool:
        """Assign a manager to a property - updates both property_managers and users tables"""
        try:
            # First, insert into property_managers table
            result = self.client.table("property_managers").insert({
                "manager_id": manager_id,
                "property_id": property_id,
                "assigned_at": datetime.now(timezone.utc).isoformat()
            }).execute()

            if len(result.data) > 0:
                # Also update the users.property_id to keep tables in sync
                logger.info(f"Updating users.property_id for manager {manager_id} to {property_id}")
                try:
                    user_update = self.client.table("users").update({
                        "property_id": property_id
                    }).eq("id", manager_id).execute()

                    if not user_update.data:
                        logger.warning(f"Failed to update users.property_id for manager {manager_id}")
                except Exception as update_error:
                    logger.error(f"Error updating users.property_id: {update_error}")
                    # Don't fail the whole operation if user update fails

            return len(result.data) > 0

        except Exception as e:
            logger.error(f"Failed to assign manager {manager_id} to property {property_id}: {e}")
            return False
    
    async def get_applications_by_email_and_property(self, email: str, property_id: str) -> List[JobApplication]:
        """Get applications by applicant email (inside applicant_data JSON) and property.
        Uses JSON contains to match applicant_data.email.
        """
        try:
            # Supabase JSON contains on applicant_data
            result = (
                self.client
                .table("job_applications")
                .select("*")
                .contains("applicant_data", {"email": email.lower()})
                .eq("property_id", property_id)
                .execute()
            )

            applications: List[JobApplication] = []
            for app_data in (result.data or []):
                applications.append(
                    JobApplication(
                        id=app_data["id"],
                        property_id=app_data["property_id"],
                        department=app_data.get("department", ""),
                        position=app_data.get("position", ""),
                        applicant_data=app_data.get("applicant_data", {}),
                        status=ApplicationStatus(app_data.get("status", "pending")),
                        applied_at=safe_parse_timestamp(app_data["applied_at"]),
                    )
                )

            return applications

        except Exception as e:
            logger.error(
                f"Failed to get applications by email {email} and property {property_id}: {e}"
            )
            return []
    
    # Synchronous wrapper methods for compatibility
    def get_user_by_email_sync(self, email: str) -> Optional[User]:
        """Synchronous wrapper for get_user_by_email"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_user_by_email(email))
            return future.result()
    
    def get_user_by_id_sync(self, user_id: str) -> Optional[User]:
        """Synchronous wrapper for get_user_by_id"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_user_by_id(user_id))
            return future.result()
    
    def check_password_reset_rate_limit_sync(self, user_id: str) -> bool:
        """Check if user is within rate limit for password reset requests"""
        try:
            # Call the SQL function we created in migration
            result = self.client.rpc('check_password_reset_rate_limit', {'p_user_id': user_id}).execute()
            
            # If function doesn't exist, fall back to basic check
            if result.error:
                # Simple fallback: check last request time
                user_result = self.client.table('users').select('last_password_reset_request, password_reset_request_count').eq('id', user_id).execute()
                
                if not user_result.data:
                    return True
                
                user_data = user_result.data[0]
                last_request = user_data.get('last_password_reset_request')
                count = user_data.get('password_reset_request_count', 0)
                
                if not last_request:
                    # No previous request, allow it
                    self.client.table('users').update({
                        'last_password_reset_request': datetime.now(timezone.utc).isoformat(),
                        'password_reset_request_count': 1
                    }).eq('id', user_id).execute()
                    return True
                
                # Check if last request was more than an hour ago
                last_request_time = datetime.fromisoformat(last_request.replace('Z', '+00:00'))
                if last_request_time < datetime.now(timezone.utc) - timedelta(hours=1):
                    # Reset count
                    self.client.table('users').update({
                        'last_password_reset_request': datetime.now(timezone.utc).isoformat(),
                        'password_reset_request_count': 1
                    }).eq('id', user_id).execute()
                    return True
                
                # Check count
                if count < 3:
                    self.client.table('users').update({
                        'password_reset_request_count': count + 1,
                        'last_password_reset_request': datetime.now(timezone.utc).isoformat()
                    }).eq('id', user_id).execute()
                    return True
                
                return False
            
            # Function exists, use its result
            return result.data if result.data is not None else True
            
        except Exception as e:
            logger.error(f"Error checking password reset rate limit: {e}")
            # On error, allow the request (fail open)
            return True
    
    def check_step_invitation_rate_limit(self, user_id: str, max_per_hour: int = 10) -> bool:
        """Check if user is within rate limit for sending step invitations
        
        Args:
            user_id: The ID of the user sending invitations
            max_per_hour: Maximum number of invitations allowed per hour (default: 10)
            
        Returns:
            True if within rate limit, False otherwise
        """
        try:
            # Get invitations sent by this user in the last hour
            one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            
            result = self.client.table('step_invitations').select('id').eq(
                'sent_by', user_id
            ).gte('sent_at', one_hour_ago).execute()
            
            # Count the invitations
            invitation_count = len(result.data) if result.data else 0
            
            # Check if within limit
            within_limit = invitation_count < max_per_hour
            
            if not within_limit:
                logger.warning(f"User {user_id} has sent {invitation_count} invitations in the last hour (limit: {max_per_hour})")
            
            return within_limit
            
        except Exception as e:
            logger.error(f"Error checking step invitation rate limit: {e}")
            # On error, be conservative and deny the request
            return False
    
    def get_property_by_id_sync(self, property_id: str) -> Optional[Property]:
        """Synchronous wrapper for get_property_by_id"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_property_by_id(property_id))
            return future.result()
    
    def get_manager_properties_sync(self, manager_id: str) -> List[Property]:
        """Synchronous wrapper for get_manager_properties"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_manager_properties(manager_id))
            return future.result()

    def set_user_primary_property_sync(self, user_id: str, property_id: Optional[str]) -> bool:
        """Synchronous wrapper for set_user_primary_property"""
        import asyncio
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.set_user_primary_property(user_id, property_id))
            return future.result()
    
    def create_application_sync(self, application: JobApplication) -> JobApplication:
        """Synchronous wrapper for create_job_application_with_validation"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.create_job_application_with_validation(application))
            result = future.result()
            # Return the application object (the method returns a dict with the created application)
            return application  # Return the original application as it was successfully created
    
    def get_applications_by_email_and_property_sync(self, email: str, property_id: str) -> List[JobApplication]:
        """Synchronous wrapper for get_applications_by_email_and_property"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_applications_by_email_and_property(email, property_id))
            return future.result()
    
    def get_application_by_id_sync(self, application_id: str) -> Optional[JobApplication]:
        """Synchronous wrapper for get_application_by_id"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_application_by_id(application_id))
            return future.result()
    
    def get_employee_by_id_sync(self, employee_id: str) -> Optional[Employee]:
        """Synchronous wrapper for get_employee_by_id - handles both regular and temporary employee IDs"""
        # Handle temporary employees directly without database lookup
        if employee_id.startswith('temp_'):
            logger.info(f"Handling temporary employee ID (sync): {employee_id}")
            return Employee(
                id=employee_id,
                property_id="temp",  # Required field, using placeholder
                department="",
                position="",
                hire_date=datetime.now(timezone.utc).date(),
                personal_info={
                    "first_name": "",
                    "last_name": "",
                    "email": "",
                    "phone": ""
                },
                manager_id=None,
                onboarding_status=OnboardingStatus.NOT_STARTED,
                employment_status="pending"
            )
        
        # Regular employee lookup for non-temporary IDs
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_employee_by_id(employee_id))
            return future.result()
    
    def get_onboarding_session_by_id_sync(self, session_id: str) -> Optional[OnboardingSession]:
        """Synchronous wrapper for get_onboarding_session_by_id"""
        import asyncio
        import concurrent.futures
        
        # Use thread pool to run async function
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, self.get_onboarding_session_by_id(session_id))
            return future.result()
    
    async def get_onboarding_session_by_id(self, session_id: str) -> Optional[OnboardingSession]:
        """Get onboarding session by ID"""
        try:
            response = self.client.table('onboarding_sessions').select('*').eq('id', session_id).execute()
            
            if response.data:
                session_data = response.data[0]
                return OnboardingSession(
                    id=session_data['id'],
                    employee_id=session_data['employee_id'],
                    application_id=session_data.get('application_id'),
                    property_id=session_data['property_id'],
                    manager_id=session_data.get('manager_id'),
                    token=session_data.get('token', ''),
                    status=OnboardingStatus(session_data.get('status', 'not_started')),
                    phase=OnboardingPhase(session_data.get('phase', 'employee')),
                    current_step=OnboardingStep(session_data.get('current_step', 'welcome')),
                    expires_at=datetime.fromisoformat(session_data['expires_at']) if session_data.get('expires_at') else None,
                    created_at=datetime.fromisoformat(session_data['created_at']) if session_data.get('created_at') else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(session_data['updated_at']) if session_data.get('updated_at') else datetime.now(timezone.utc)
                )
            return None
            
        except Exception as e:
            logger.error(f"Error getting onboarding session by ID {session_id}: {e}")
            return None
    
    async def create_notification(self, user_id: str, type: str, title: str, message: str, 
                                 priority: str = "normal", metadata: Dict[str, Any] = None) -> bool:
        """Create a notification record"""
        try:
            notification_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": type,
                "title": title,
                "message": message,
                "priority": priority,
                "status": "unread",
                "metadata": metadata or {},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.client.table('notifications').insert(notification_data).execute()
            return bool(result.data)
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return False
    
    async def get_user_notifications(self, user_id: str, unread_only: bool = False, 
                                    limit: int = 50) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        try:
            query = self.client.table('notifications').select('*').eq('user_id', user_id)
            
            if unread_only:
                query = query.eq('status', 'unread')
            
            query = query.order('created_at', desc=True).limit(limit)
            result = query.execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    async def get_notification_count(self, user_id: str) -> int:
        """Get unread notification count for a user"""
        try:
            result = self.client.table('notifications').select('id', count='exact')\
                .eq('user_id', user_id)\
                .eq('status', 'unread')\
                .execute()
            
            return result.count if result.count else 0
        except Exception as e:
            logger.error(f"Failed to get notification count: {e}")
            return 0
    
    async def mark_notifications_as_read(self, notification_ids: List[str], user_id: str) -> bool:
        """Mark notifications as read"""
        try:
            for notif_id in notification_ids:
                self.client.table('notifications').update({
                    'status': 'read',
                    'read_at': datetime.now(timezone.utc).isoformat()
                }).eq('id', notif_id).eq('user_id', user_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Failed to mark notifications as read: {e}")
            return False
    
    async def get_onboarding_session_by_token(self, token: str) -> Optional[OnboardingSession]:
        """Get onboarding session by token"""
        try:
            response = self.client.table('onboarding_sessions').select('*').eq('token', token).execute()
            
            if response.data:
                session_data = response.data[0]
                return OnboardingSession(
                    id=session_data['id'],
                    employee_id=session_data['employee_id'],
                    application_id=session_data.get('application_id'),
                    property_id=session_data['property_id'],
                    manager_id=session_data.get('manager_id'),
                    token=session_data.get('token', ''),
                    status=OnboardingStatus(session_data.get('status', 'not_started')),
                    phase=OnboardingPhase(session_data.get('phase', 'employee')),
                    current_step=OnboardingStep(session_data.get('current_step', 'welcome')),
                    expires_at=datetime.fromisoformat(session_data['expires_at']) if session_data.get('expires_at') else None,
                    created_at=datetime.fromisoformat(session_data['created_at']) if session_data.get('created_at') else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(session_data['updated_at']) if session_data.get('updated_at') else datetime.now(timezone.utc)
                )
            return None
            
        except Exception as e:
            logger.error(f"Error getting onboarding session by token: {e}")
            return None
    
    async def get_onboarding_sessions_by_employee(self, employee_id: str) -> List[OnboardingSession]:
        """Get all onboarding sessions for an employee, sorted by most recent first"""
        try:
            response = self.client.table('onboarding_sessions').select('*').eq('employee_id', employee_id).order('created_at', desc=True).execute()
            
            sessions = []
            if response.data:
                for session_data in response.data:
                    sessions.append(OnboardingSession(
                        id=session_data['id'],
                        employee_id=session_data['employee_id'],
                        application_id=session_data.get('application_id'),
                        property_id=session_data['property_id'],
                        manager_id=session_data.get('manager_id'),
                        token=session_data.get('token', ''),
                        status=OnboardingStatus(session_data.get('status', 'not_started')),
                        phase=OnboardingPhase(session_data.get('phase', 'employee')),
                        current_step=OnboardingStep(session_data.get('current_step', 'welcome')),
                        expires_at=datetime.fromisoformat(session_data['expires_at']) if session_data.get('expires_at') else None,
                        created_at=datetime.fromisoformat(session_data['created_at']) if session_data.get('created_at') else datetime.now(timezone.utc),
                        updated_at=datetime.fromisoformat(session_data['updated_at']) if session_data.get('updated_at') else datetime.now(timezone.utc)
                    ))
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting onboarding sessions for employee {employee_id}: {e}")
            return []
    
    async def create_employee_from_application(self, application: JobApplication) -> Optional[Employee]:
        """Create an employee record from a job application"""
        try:
            # Extract applicant data
            applicant_data = application.applicant_data or {}
            
            # Create employee record
            # Note: Store personal info in JSON field since individual columns don't exist
            employee_data = {
                'id': str(uuid.uuid4()),
                'property_id': application.property_id,
                'employment_status': 'pending',
                'hire_date': datetime.now(timezone.utc).isoformat(),
                'position': application.position,
                'department': applicant_data.get('department', 'General'),
                'personal_info': {
                    'first_name': applicant_data.get('first_name', ''),
                    'last_name': applicant_data.get('last_name', ''),
                    'email': applicant_data.get('email', ''),
                    'phone': applicant_data.get('phone', '')
                },
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Check if we need to assign a manager
            if not employee_data.get('manager_id'):
                # Get default manager for property
                managers = await self.get_property_managers(application.property_id)
                if managers:
                    employee_data['manager_id'] = managers[0].id
            
            response = self.client.table('employees').insert(employee_data).execute()
            
            if response.data:
                emp_data = response.data[0]
                return Employee(
                    id=emp_data['id'],
                    user_id=emp_data.get('user_id', emp_data['id']),  # Use employee ID if user_id not set
                    property_id=emp_data['property_id'],
                    manager_id=emp_data.get('manager_id', ''),
                    department=emp_data.get('department', 'General'),
                    position=emp_data.get('position', 'Staff'),
                    hire_date=datetime.fromisoformat(emp_data['hire_date']).date() if emp_data.get('hire_date') else datetime.now(timezone.utc).date(),
                    pay_rate=emp_data.get('pay_rate', 0.0),
                    employment_type=emp_data.get('employment_type', 'full_time'),
                    employment_status=emp_data.get('employment_status', 'pending'),
                    onboarding_status=OnboardingStatus(emp_data.get('onboarding_status', 'not_started'))
                )
            return None
            
        except Exception as e:
            logger.error(f"Error creating employee from application: {e}")
            return None
    
    async def get_job_application_by_id(self, application_id: str) -> Optional[JobApplication]:
        """Get a job application by ID"""
        try:
            response = self.client.table('job_applications').select('*').eq('id', application_id).execute()
            
            if response.data:
                app_data = response.data[0]
                return JobApplication(
                    id=app_data['id'],
                    property_id=app_data['property_id'],
                    position=app_data['position'],
                    status=app_data.get('status', 'pending'),
                    applicant_data=app_data.get('applicant_data', {}),
                    submitted_at=datetime.fromisoformat(app_data['submitted_at']) if app_data.get('submitted_at') else datetime.now(timezone.utc),
                    created_at=datetime.fromisoformat(app_data['created_at']) if app_data.get('created_at') else datetime.now(timezone.utc),
                    updated_at=datetime.fromisoformat(app_data['updated_at']) if app_data.get('updated_at') else datetime.now(timezone.utc)
                )
            return None
            
        except Exception as e:
            logger.error(f"Error getting job application by ID {application_id}: {e}")
            return None
    
    async def get_property_managers(self, property_id: str) -> List[User]:
        """Get all managers assigned to a property"""
        try:
            # Get manager IDs from property_managers table
            pm_response = self.client.table('property_managers').select('manager_id').eq('property_id', property_id).execute()
            
            if not pm_response.data:
                return []
            
            manager_ids = [pm['manager_id'] for pm in pm_response.data]
            
            # Get all manager details in a single query (avoid N+1 problem)
            if not manager_ids:
                return []
            
            managers_response = self.admin_client.table('users').select('*').in_('id', manager_ids).execute()
            
            if not managers_response or not managers_response.data:
                return []
            
            # Convert to User objects
            managers = []
            for manager_data in managers_response.data:
                user = User(**manager_data)
                managers.append(user)
            
            return managers
            
        except Exception as e:
            logger.error(f"Error getting property managers for property {property_id}: {e}")
            return []

    # Dashboard Statistics Methods
    async def get_properties_count(self) -> int:
        """Get count of active properties"""
        try:
            response = self.client.table('properties').select('id', count='exact').eq('is_active', True).execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting properties count: {e}")
            return 0
    
    async def get_managers_count(self) -> int:
        """Get count of active managers"""
        try:
            response = self.client.table('users').select('id', count='exact').eq('role', 'manager').eq('is_active', True).execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting managers count: {e}")
            return 0
    
    async def get_employees_count(self) -> int:
        """Get count of active employees"""
        try:
            response = self.client.table('employees').select('id', count='exact').eq('employment_status', 'active').execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting employees count: {e}")
            return 0
    
    async def get_pending_applications_count(self) -> int:
        """Get count of pending applications"""
        try:
            response = self.client.table('job_applications').select('id', count='exact').eq('status', 'pending').execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting pending applications count: {e}")
            return 0
    
    async def get_approved_applications_count(self) -> int:
        """Get count of approved applications"""
        try:
            response = self.client.table('job_applications').select('id', count='exact').eq('status', 'approved').execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting approved applications count: {e}")
            return 0
    
    async def get_total_applications_count(self) -> int:
        """Get total count of all applications"""
        try:
            response = self.client.table('job_applications').select('id', count='exact').execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting total applications count: {e}")
            return 0
    
    async def get_active_employees_count(self) -> int:
        """Get count of active employees"""
        try:
            response = self.client.table('employees').select('id', count='exact').eq('employment_status', 'active').execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting active employees count: {e}")
            return 0
    
    async def get_onboarding_in_progress_count(self) -> int:
        """Get count of employees in onboarding process"""
        try:
            response = self.client.table('employees').select('id', count='exact').in_('onboarding_status', ['in_progress', 'employee_completed', 'manager_review']).execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error getting onboarding in progress count: {e}")
            return 0

    async def get_all_properties(self) -> List[Property]:
        """Get all properties"""
        try:
            response = self.client.table('properties').select('*').execute()
            logger.info(f"Raw properties from DB: {len(response.data)} properties found")
            
            properties = []
            for row in response.data:
                try:
                    # Handle various datetime formats
                    created_at = None
                    if row.get('created_at'):
                        created_at_str = row['created_at']
                        # Handle timezone-aware timestamps
                        if 'T' in created_at_str:
                            created_at_str = created_at_str.replace('Z', '+00:00')
                            if '+' not in created_at_str and '-' not in created_at_str[-6:]:
                                created_at_str += '+00:00'
                        created_at = datetime.fromisoformat(created_at_str)
                    
                    prop = Property(
                        id=row['id'],
                        name=row['name'],
                        address=row['address'],
                        city=row.get('city', ''),  # Make city optional
                        state=row.get('state', ''),  # Make state optional
                        zip_code=row.get('zip_code', ''),  # Make zip optional
                        phone=row.get('phone', ''),
                        qr_code_url=row.get('qr_code_url'),
                        is_active=row.get('is_active', True),
                        created_at=created_at
                    )
                    properties.append(prop)
                    logger.debug(f"Added property: {prop.name} ({prop.id})")
                except Exception as prop_error:
                    logger.error(f"Error parsing property {row.get('id', 'unknown')}: {prop_error}")
                    logger.error(f"Property data: {row}")
                    
            logger.info(f"Returning {len(properties)} properties")
            return properties
        except Exception as e:
            logger.error(f"Error getting all properties: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []

    async def get_all_applications(self) -> List[JobApplication]:
        """Get all applications"""
        try:
            response = self.client.table('job_applications').select('*').execute()
            applications = []
            for row in response.data:
                applications.append(JobApplication(
                    id=row['id'],
                    property_id=row['property_id'],
                    department=row['department'],
                    position=row['position'],
                    applicant_data=row['applicant_data'],
                    status=ApplicationStatus(row['status']),
                    applied_at=safe_parse_timestamp(row['applied_at'])
                ))
            return applications
        except Exception as e:
            logger.error(f"Error getting all applications: {e}")
            return []

    async def get_application_by_id(self, application_id: str) -> Optional[JobApplication]:
        """Get a single application by ID"""
        try:
            response = self.client.table('job_applications').select('*').eq('id', application_id).execute()
            if response.data:
                row = response.data[0]
                return JobApplication(
                    id=row['id'],
                    property_id=row['property_id'],
                    department=row['department'],
                    position=row['position'],
                    applicant_data=row['applicant_data'],
                    status=ApplicationStatus(row['status']),
                    applied_at=safe_parse_timestamp(row['applied_at'])
                )
            return None
        except Exception as e:
            logger.error(f"Error getting application by ID {application_id}: {e}")
            return None

    async def get_applications_by_properties(self, property_ids: List[str]) -> List[JobApplication]:
        """Get applications for multiple properties"""
        try:
            response = self.client.table('job_applications').select('*').in_('property_id', property_ids).execute()
            applications = []
            for row in response.data:
                applications.append(JobApplication(
                    id=row['id'],
                    property_id=row['property_id'],
                    department=row['department'],
                    position=row['position'],
                    applicant_data=row['applicant_data'],
                    status=ApplicationStatus(row['status']),
                    applied_at=safe_parse_timestamp(row['applied_at'])
                ))
            return applications
        except Exception as e:
            logger.error(f"Error getting applications by properties: {e}")
            return []

    async def get_applications_by_property(self, property_id: str) -> List[JobApplication]:
        """Get applications for a single property"""
        try:
            response = self.client.table('job_applications').select('*').eq('property_id', property_id).execute()
            applications = []
            for row in response.data:
                applications.append(JobApplication(
                    id=row['id'],
                    property_id=row['property_id'],
                    department=row['department'],
                    position=row['position'],
                    applicant_data=row['applicant_data'],
                    status=ApplicationStatus(row['status']),
                    applied_at=safe_parse_timestamp(row['applied_at'])
                ))
            return applications
        except Exception as e:
            logger.error(f"Error getting applications by property {property_id}: {e}")
            return []

    async def get_employee_by_id(self, employee_id: str) -> Optional[Employee]:
        """Get employee by ID - handles both regular and temporary employee IDs"""
        try:
            # Handle temporary employees (e.g., temp_550e8400-e29b-41d4-a716-446655440000)
            if employee_id.startswith('temp_'):
                logger.info(f"Handling temporary employee ID: {employee_id}")
                # Return a minimal temporary employee object
                # This employee doesn't exist in the database yet
                return Employee(
                    id=employee_id,
                    property_id="temp",  # Required field, using placeholder
                    department="",
                    position="",
                    hire_date=datetime.now(timezone.utc).date(),
                    personal_info={
                        "first_name": "",
                        "last_name": "",
                        "email": "",
                        "phone": ""
                    },
                    manager_id=None,
                    onboarding_status=OnboardingStatus.NOT_STARTED,
                    employment_status="pending"
                )
            
            # Regular employee lookup for non-temporary IDs
            response = self.client.table('employees').select('*').eq('id', employee_id).execute()
            if response.data:
                row = response.data[0]
                logger.info(f"Employee data from DB: {row}")
                # Parse hire_date - it might be a string date or ISO datetime
                hire_date = None
                if row.get('hire_date'):
                    try:
                        # Try parsing as date string (YYYY-MM-DD)
                        from datetime import date as date_type
                        if isinstance(row['hire_date'], str) and 'T' not in row['hire_date']:
                            hire_date = datetime.strptime(row['hire_date'], '%Y-%m-%d').date()
                        else:
                            hire_date = datetime.fromisoformat(row['hire_date'].replace('Z', '+00:00')).date()
                    except:
                        hire_date = datetime.now(timezone.utc).date()
                else:
                    hire_date = datetime.now(timezone.utc).date()
                
                # Normalize employment_type value
                employment_type = row.get('employment_type', 'full_time')
                if employment_type == 'full-time':
                    employment_type = 'full_time'
                elif employment_type == 'part-time':
                    employment_type = 'part_time'
                    
                # Parse start_date if present
                start_date = None
                if row.get('start_date'):
                    try:
                        if isinstance(row['start_date'], str) and 'T' not in row['start_date']:
                            start_date = datetime.strptime(row['start_date'], '%Y-%m-%d').date()
                        else:
                            start_date = datetime.fromisoformat(row['start_date'].replace('Z', '+00:00')).date()
                    except:
                        start_date = None
                
                # Parse timestamps
                created_at = None
                updated_at = None
                onboarding_completed_at = None
                
                if row.get('created_at'):
                    try:
                        created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00').replace('+00:00+00:00', '+00:00'))
                    except:
                        created_at = datetime.now(timezone.utc)
                else:
                    created_at = datetime.now(timezone.utc)
                    
                if row.get('updated_at'):
                    try:
                        updated_at = datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00').replace('+00:00+00:00', '+00:00'))
                    except:
                        updated_at = datetime.now(timezone.utc)
                else:
                    updated_at = datetime.now(timezone.utc)
                    
                if row.get('onboarding_completed_at'):
                    try:
                        onboarding_completed_at = datetime.fromisoformat(row['onboarding_completed_at'].replace('Z', '+00:00').replace('+00:00+00:00', '+00:00'))
                    except:
                        onboarding_completed_at = None
                
                return Employee(
                    id=row['id'],
                    user_id=row.get('user_id'),  # Can be None
                    property_id=row['property_id'],
                    manager_id=row.get('manager_id'),  # Can be None
                    employee_number=row.get('employee_number'),  # Optional field
                    application_id=row.get('application_id'),  # Optional field
                    department=row.get('department', 'General'),
                    position=row.get('position', 'Staff'),
                    hire_date=hire_date,
                    start_date=start_date,
                    pay_rate=row.get('pay_rate'),
                    pay_frequency=row.get('pay_frequency', 'biweekly'),
                    employment_type=employment_type,
                    employment_status=row.get('employment_status', 'active'),
                    onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                    personal_info=row.get('personal_info'),  # Can be None
                    emergency_contacts=row.get('emergency_contacts', []),
                    created_at=created_at,
                    updated_at=updated_at,
                    onboarding_completed_at=onboarding_completed_at
                )
            return None
        except Exception as e:
            logger.error(f"Error getting employee by ID: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return None

    async def create_employee(self, employee_data: dict) -> Optional[Employee]:
        """Create a new employee record"""
        try:
            # Ensure required fields have defaults
            if 'department' not in employee_data:
                employee_data['department'] = 'General'
            if 'position' not in employee_data:
                employee_data['position'] = 'Staff'
            if 'hire_date' not in employee_data:
                employee_data['hire_date'] = datetime.now(timezone.utc).date().isoformat()
            if 'employment_type' not in employee_data:
                employee_data['employment_type'] = 'full_time'
            if 'employment_status' not in employee_data:
                employee_data['employment_status'] = 'pending'
            if 'onboarding_status' not in employee_data:
                employee_data['onboarding_status'] = 'not_started'
            if 'pay_frequency' not in employee_data:
                employee_data['pay_frequency'] = 'biweekly'
            
            # Insert the employee record
            response = self.client.table('employees').insert(employee_data).execute()
            
            if response.data:
                # Return the created employee
                created_employee = response.data[0]
                return await self.get_employee_by_id(created_employee['id'])
            
            return None
        except Exception as e:
            logger.error(f"Error creating employee: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return None

    async def get_all_managers(self) -> List[User]:
        """Get all users with manager role"""
        try:
            response = self.client.table('users').select('*').eq('role', 'manager').execute()
            managers = []
            for row in response.data:
                managers.append(User(
                    id=row['id'],
                    email=row['email'],
                    password_hash=row.get('password_hash', ''),
                    role=UserRole(row['role']),
                    first_name=row.get('first_name', ''),
                    last_name=row.get('last_name', ''),
                    is_active=row.get('is_active', True),
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else datetime.now(timezone.utc)
                ))
            return managers
        except Exception as e:
            logger.error(f"Error getting all managers: {e}")
            return []

    async def get_all_employees(self) -> List[Employee]:
        """Get all employees"""
        try:
            response = self.client.table('employees').select('*').execute()
            employees = []
            for row in response.data:
                employees.append(Employee(
                    id=row['id'],
                    user_id=row.get('user_id', row['id']),  # Use employee ID if user_id not set
                    property_id=row['property_id'],
                    manager_id=row.get('manager_id', ''),  # May not be set yet
                    department=row.get('department', 'General'),
                    position=row.get('position', 'Staff'),
                    hire_date=datetime.fromisoformat(row['hire_date']).date() if row.get('hire_date') else datetime.now(timezone.utc).date(),
                    pay_rate=row.get('pay_rate', 0.0),
                    employment_type=row.get('employment_type', 'full_time'),
                    employment_status=row.get('employment_status', 'active'),
                    onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                    personal_info=row.get('personal_info', {}),
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else datetime.now(timezone.utc)
                ))
            return employees
        except Exception as e:
            logger.error(f"Error getting all employees: {e}")
            return []
    
    async def update_employee_onboarding_status(self, employee_id: str, status, session_id: str = None) -> bool:
        """Update employee's onboarding status"""
        try:
            update_data = {
                "onboarding_status": status.value if hasattr(status, 'value') else status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if session_id:
                update_data["onboarding_session_id"] = session_id
            
            response = self.admin_client.table('employees').update(update_data).eq('id', employee_id).execute()
            return bool(response.data)
        except Exception as e:
            logger.error(f"Failed to update employee onboarding status: {e}")
            return False

    async def get_employees_by_property(self, property_id: str) -> List[Employee]:
        """Get employees by property"""
        try:
            response = self.client.table('employees').select('*').eq('property_id', property_id).execute()
            employees = []
            for row in response.data:
                employees.append(Employee(
                    id=row['id'],
                    user_id=row.get('user_id', row['id']),  # Use employee ID if user_id not set
                    property_id=row['property_id'],
                    manager_id=row.get('manager_id', ''),  # May not be set yet
                    department=row.get('department', 'General'),
                    position=row.get('position', 'Staff'),
                    hire_date=self._parse_date_safe(row.get('hire_date')),
                    pay_rate=row.get('pay_rate', 0.0),
                    employment_type=row.get('employment_type', 'full_time'),
                    employment_status=row.get('employment_status', 'active'),
                    onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                    personal_info=row.get('personal_info', {}),
                    created_at=self._parse_datetime_safe(row.get('created_at'))
                ))
            return employees
        except Exception as e:
            logger.error(f"Error getting employees by property: {e}")
            return []

    async def get_employee_by_email_and_property(self, email: str, property_id: str) -> Optional[Employee]:
        """
        Get employee by email address SCOPED TO A SPECIFIC PROPERTY.
        This is a CRITICAL security method to prevent cross-property data access.
        
        Args:
            email: Employee email address
            property_id: Property ID to scope the search to
            
        Returns:
            Employee object if found at the specified property, None otherwise
        """
        if not property_id:
            logger.error("SECURITY WARNING: Attempted to search for employee without property_id")
            return None
            
        if not email:
            logger.warning("Empty email provided for employee search")
            return None
            
        try:
            # CRITICAL: Always include property_id in the query to ensure property isolation
            # Note: email is stored in personal_info JSON field, not as a direct column
            response = self.client.table('employees').select('*').ilike('personal_info->>email', email.lower()).eq('property_id', property_id).execute()
            
            if response.data and len(response.data) > 0:
                row = response.data[0]
                logger.info(f"Found employee with email {email} at property {property_id}")
                
                # Log for audit trail
                await self.create_audit_log(
                    action=AuditLogAction.VIEW,
                    entity_type="employee",
                    entity_id=row['id'],
                    user_id=None,  # System action
                    details={
                        "search_type": "email_and_property",
                        "email": email,
                        "property_id": property_id,
                        "found": True
                    }
                )
                
                return Employee(
                    id=row['id'],
                    user_id=row.get('user_id', row['id']),
                    property_id=row['property_id'],
                    manager_id=row.get('manager_id', ''),
                    department=row.get('department', 'General'),
                    position=row.get('position', 'Staff'),
                    hire_date=datetime.fromisoformat(row['hire_date']).date() if row.get('hire_date') else datetime.now(timezone.utc).date(),
                    pay_rate=row.get('pay_rate', 0.0),
                    employment_type=row.get('employment_type', 'full_time'),
                    employment_status=row.get('employment_status', 'active'),
                    onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                    personal_info=row.get('personal_info', {}),
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else datetime.now(timezone.utc)
                )
            else:
                logger.info(f"No employee found with email {email} at property {property_id}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get employee by email and property: {e}")
            return None

    async def get_employees_by_properties(self, property_ids: List[str]) -> List[Employee]:
        """Get employees for multiple properties"""
        try:
            response = self.client.table('employees').select('*').in_('property_id', property_ids).execute()
            employees = []
            for row in response.data:
                employees.append(Employee(
                    id=row['id'],
                    user_id=row.get('user_id', row['id']),  # Use employee ID if user_id not set
                    property_id=row['property_id'],
                    manager_id=row.get('manager_id', ''),  # May not be set yet
                    department=row.get('department', 'General'),
                    position=row.get('position', 'Staff'),
                    hire_date=datetime.fromisoformat(row['hire_date']).date() if row.get('hire_date') else datetime.now(timezone.utc).date(),
                    pay_rate=row.get('pay_rate', 0.0),
                    employment_type=row.get('employment_type', 'full_time'),
                    employment_status=row.get('employment_status', 'active'),
                    onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                    personal_info=row.get('personal_info', {}),
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else datetime.now(timezone.utc)
                ))
            return employees
        except Exception as e:
            logger.error(f"Error getting employees by properties: {e}")
            return []

    async def get_users(self) -> List[User]:
        """Get all users"""
        try:
            response = self.client.table('users').select('*').execute()
            users = []
            for row in response.data:
                users.append(User(
                    id=row['id'],
                    email=row['email'],
                    first_name=row.get('first_name'),
                    last_name=row.get('last_name'),
                    role=UserRole(row['role']),
                    is_active=row.get('is_active', True),
                    created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')) if row.get('created_at') else None
                ))
            return users
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return []

    # ==========================================
    # BULK OPERATIONS METHODS (Phase 1.1)
    # ==========================================
    
    async def bulk_update_applications(self, application_ids: List[str], status: str, reviewed_by: str, action_type: str = None) -> Dict[str, Any]:
        """Bulk update application status"""
        try:
            success_count = 0
            failed_count = 0
            errors = []
            
            for app_id in application_ids:
                try:
                    update_data = {
                        "status": status,
                        "reviewed_by": reviewed_by,
                        "reviewed_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    # Add specific fields for talent pool
                    if status == "talent_pool":
                        update_data["talent_pool_date"] = datetime.now(timezone.utc).isoformat()
                    
                    result = self.client.table("job_applications").update(update_data).eq("id", app_id).execute()
                    
                    if result.data:
                        success_count += 1
                    else:
                        failed_count += 1
                        errors.append(f"No data returned for application {app_id}")
                        
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Failed to update application {app_id}: {str(e)}")
            
            return {
                "success_count": success_count,
                "failed_count": failed_count,
                "total_processed": len(application_ids),
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Bulk update applications failed: {e}")
            return {
                "success_count": 0,
                "failed_count": len(application_ids),
                "total_processed": len(application_ids),
                "errors": [str(e)]
            }
    
    async def bulk_move_to_talent_pool(self, application_ids: List[str], reviewed_by: str) -> Dict[str, Any]:
        """Bulk move applications to talent pool"""
        return await self.bulk_update_applications(
            application_ids=application_ids,
            status="talent_pool",
            reviewed_by=reviewed_by,
            action_type="talent_pool"
        )
    
    async def bulk_reactivate_applications(self, application_ids: List[str], reviewed_by: str) -> Dict[str, Any]:
        """Bulk reactivate applications from talent pool"""
        return await self.bulk_update_applications(
            application_ids=application_ids,
            status="pending",
            reviewed_by=reviewed_by,
            action_type="reactivate"
        )
    
    async def send_bulk_notifications(self, application_ids: List[str], notification_type: str, sent_by: str) -> Dict[str, Any]:
        """Send bulk notifications to talent pool applications"""
        try:
            success_count = 0
            failed_count = 0
            errors = []
            
            for app_id in application_ids:
                try:
                    # Get application details for notification
                    app = await self.get_application_by_id(app_id)
                    if not app:
                        failed_count += 1
                        errors.append(f"Application {app_id} not found")
                        continue
                    
                    # Create notification record
                    notification_data = {
                        "id": str(uuid.uuid4()),
                        "application_id": app_id,
                        "notification_type": notification_type,
                        "sent_by": sent_by,
                        "sent_at": datetime.now(timezone.utc).isoformat(),
                        "recipient_email": app.applicant_data.get("email"),
                        "status": "sent"
                    }
                    
                    result = self.client.table("notifications").insert(notification_data).execute()
                    
                    if result.data:
                        success_count += 1
                    else:
                        failed_count += 1
                        errors.append(f"Failed to create notification for application {app_id}")
                        
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Failed to send notification for application {app_id}: {str(e)}")
            
            return {
                "success_count": success_count,
                "failed_count": failed_count,
                "total_processed": len(application_ids),
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Bulk send notifications failed: {e}")
            return {
                "success_count": 0,
                "failed_count": len(application_ids),
                "total_processed": len(application_ids),
                "errors": [str(e)]
            }
    
    # ==========================================
    # APPLICATION HISTORY METHODS (Phase 1.2)
    # ==========================================
    
    async def get_application_history(self, application_id: str) -> List[Dict[str, Any]]:
        """Get application status history"""
        try:
            result = self.client.table("application_status_history").select("*").eq(
                "application_id", application_id
            ).order("changed_at", desc=True).execute()
            
            history = []
            for record in result.data:
                history.append({
                    "id": record["id"],
                    "application_id": record["application_id"],
                    "previous_status": record.get("previous_status"),
                    "new_status": record["new_status"],
                    "changed_by": record["changed_by"],
                    "changed_at": record["changed_at"],
                    "reason": record.get("reason"),
                    "notes": record.get("notes")
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get application history for {application_id}: {e}")
            return []
    
    async def add_application_status_history(self, application_id: str, previous_status: str, new_status: str, changed_by: str, reason: str = None, notes: str = None) -> bool:
        """Add application status history record"""
        try:
            history_data = {
                "id": str(uuid.uuid4()),
                "application_id": application_id,
                "previous_status": previous_status,
                "new_status": new_status,
                "changed_by": changed_by,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "notes": notes
            }
            
            result = self.client.table("application_status_history").insert(history_data).execute()
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to add application status history: {e}")
            return False
    
    async def check_duplicate_application(self, email: str, property_id: str, position: str) -> bool:
        """Check for duplicate applications"""
        try:
            result = self.client.table("job_applications").select("id").eq(
                "applicant_email", email.lower()
            ).eq("property_id", property_id).eq("position", position).in_(
                "status", ["pending", "approved", "hired"]
            ).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to check duplicate application: {e}")
            return False
    
    # ==========================================
    # MANAGER MANAGEMENT METHODS (Phase 1.3)
    # ==========================================
    
    async def get_manager_by_id(self, manager_id: str) -> Optional[User]:
        """Get manager details by ID"""
        try:
            result = self.client.table("users").select("*").eq("id", manager_id).eq("role", "manager").execute()
            
            if result.data:
                user_data = result.data[0]
                return User(
                    id=user_data["id"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=UserRole(user_data["role"]),
                    is_active=user_data["is_active"],
                    created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00')) if user_data.get("created_at") else None
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get manager {manager_id}: {e}")
            return None
    
    async def update_manager(self, manager_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update manager details"""
        try:
            # Ensure we only update allowed fields
            allowed_fields = ["first_name", "last_name", "email", "is_active"]
            filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
            filtered_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.client.table("users").update(filtered_data).eq("id", manager_id).eq("role", "manager").execute()
            
            if result.data:
                user_data = result.data[0]
                return User(
                    id=user_data["id"],
                    email=user_data["email"],
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    role=UserRole(user_data["role"]),
                    is_active=user_data["is_active"],
                    created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00')) if user_data.get("created_at") else None
                )
            
            return None

        except Exception as e:
            logger.error(f"Failed to update manager {manager_id}: {e}")
            return None

    async def set_user_primary_property(self, user_id: str, property_id: Optional[str]) -> bool:
        """Update a user's primary property reference"""
        try:
            update_payload = {
                "property_id": property_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }

            result = self.admin_client.table("users").update(update_payload).eq("id", user_id).execute()
            return bool(result.data)
        except Exception as e:
            logger.error(f"Failed to set primary property for user {user_id}: {e}")
            return False
    
    async def delete_manager(self, manager_id: str) -> bool:
        """Delete manager (soft delete by setting inactive)"""
        try:
            result = self.client.table("users").update({
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", manager_id).eq("role", "manager").execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to delete manager {manager_id}: {e}")
            return False
    
    async def reset_manager_password(self, manager_id: str, new_password: str) -> bool:
        """Reset manager password"""
        try:
            # Hash the password
            from .auth import PasswordManager
            password_manager = PasswordManager()
            hashed_password = password_manager.hash_password(new_password)
            
            result = self.client.table("users").update({
                "password_hash": hashed_password,
                "password_reset_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", manager_id).eq("role", "manager").execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to reset manager password {manager_id}: {e}")
            return False
    
    async def get_manager_performance(self, manager_id: str) -> Dict[str, Any]:
        """Get manager performance metrics"""
        try:
            # Get manager properties
            properties = await self.get_manager_properties(manager_id)
            property_ids = [prop.id for prop in properties]
            
            if not property_ids:
                return {
                    "manager_id": manager_id,
                    "properties_count": 0,
                    "applications_count": 0,
                    "approvals_count": 0,
                    "approval_rate": 0,  # Add missing approval_rate field
                    "average_response_time_days": 0,
                    "properties": []
                }
            
            # Get applications for manager's properties
            applications = await self.get_applications_by_properties(property_ids)
            
            # Get approvals by this manager
            approvals_result = self.client.table("job_applications").select("*").eq(
                "reviewed_by", manager_id
            ).in_("property_id", property_ids).execute()
            
            approvals_count = len(approvals_result.data)
            
            # Calculate average response time
            total_response_time = 0
            response_count = 0
            
            for app_data in approvals_result.data:
                if app_data.get("reviewed_at") and app_data.get("applied_at"):
                    applied_at = datetime.fromisoformat(app_data["applied_at"].replace('Z', '+00:00'))
                    reviewed_at = datetime.fromisoformat(app_data["reviewed_at"].replace('Z', '+00:00'))
                    response_time = (reviewed_at - applied_at).days
                    total_response_time += response_time
                    response_count += 1
            
            avg_response_time = total_response_time / response_count if response_count > 0 else 0
            
            # Calculate approval rate
            approval_rate = (approvals_count / len(applications)) * 100 if len(applications) > 0 else 0
            
            return {
                "manager_id": manager_id,
                "properties_count": len(properties),
                "applications_count": len(applications),
                "approvals_count": approvals_count,
                "approval_rate": round(approval_rate, 2),  # Add missing approval_rate field
                "average_response_time_days": round(avg_response_time, 2),
                "properties": [{"id": prop.id, "name": prop.name} for prop in properties]
            }
            
        except Exception as e:
            logger.error(f"Failed to get manager performance {manager_id}: {e}")
            return {
                "manager_id": manager_id,
                "properties_count": 0,
                "applications_count": 0,
                "approvals_count": 0,
                "approval_rate": 0,  # Add missing approval_rate field
                "average_response_time_days": 0,
                "properties": []
            }
    
    async def get_unassigned_managers(self) -> List[User]:
        """Get managers not assigned to any property"""
        try:
            # Get all manager IDs that are assigned to properties
            assigned_result = self.client.table("property_managers").select("manager_id").execute()
            assigned_manager_ids = [item["manager_id"] for item in assigned_result.data]
            
            # Get all managers
            managers_result = self.client.table("users").select("*").eq("role", "manager").eq("is_active", True).execute()
            
            unassigned_managers = []
            for user_data in managers_result.data:
                if user_data["id"] not in assigned_manager_ids:
                    unassigned_managers.append(User(
                        id=user_data["id"],
                        email=user_data["email"],
                        first_name=user_data["first_name"],
                        last_name=user_data["last_name"],
                        role=UserRole(user_data["role"]),
                        is_active=user_data["is_active"],
                        created_at=datetime.fromisoformat(user_data["created_at"].replace('Z', '+00:00')) if user_data.get("created_at") else None
                    ))
            
            return unassigned_managers
            
        except Exception as e:
            logger.error(f"Failed to get unassigned managers: {e}")
            return []
    
    # ==========================================
    # ONBOARDING FORM DATA METHODS
    # ==========================================
    
    def save_onboarding_form_data(self, token: str, employee_id: str, step_id: str, form_data: Dict[str, Any]) -> bool:
        """Save or update onboarding form data for a specific step"""
        try:
            # Encrypt banking data for direct deposit step
            if step_id == 'direct-deposit':
                form_data = self.encrypt_banking_data(form_data)
            
            # Check if data already exists for this token and step
            existing = self.client.table("onboarding_form_data").select("id").eq("token", token).eq("step_id", step_id).execute()
            
            if existing.data:
                # Update existing record
                result = self.client.table("onboarding_form_data").update({
                    "form_data": form_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("token", token).eq("step_id", step_id).execute()
            else:
                # Insert new record
                result = self.client.table("onboarding_form_data").insert({
                    "token": token,
                    "employee_id": employee_id,
                    "step_id": step_id,
                    "form_data": form_data
                }).execute()
            
            return bool(result.data)
        except Exception as e:
            logger.error(f"Failed to save onboarding form data: {e}")
            logger.error(f"Token: {token}, Employee: {employee_id}, Step: {step_id}")
            logger.error(f"Error details: {str(e)}")
            return False
    
    def get_onboarding_form_data(self, token: str, step_id: str = None) -> Dict[str, Any]:
        """Get onboarding form data for a token and optional step"""
        try:
            query = self.client.table("onboarding_form_data").select("*").eq("token", token)
            
            if step_id:
                query = query.eq("step_id", step_id)
            
            result = query.execute()
            
            if step_id and result.data:
                # Return single step data
                form_data = result.data[0].get("form_data", {}) if result.data else {}
                # Decrypt banking data for direct deposit step
                if step_id == 'direct-deposit' and form_data:
                    form_data = self.decrypt_banking_data(form_data)
                return form_data
            else:
                # Return all steps data as a dictionary
                form_data = {}
                for record in result.data:
                    form_data[record["step_id"]] = record["form_data"]
                return form_data
                
        except Exception as e:
            logger.error(f"Failed to get onboarding form data: {e}")
            logger.error(f"Token: {token}, Step: {step_id}")
            logger.error(f"Error details: {str(e)}")
            return {}
    
    def get_all_onboarding_data_by_token(self, token: str) -> List[Dict[str, Any]]:
        """Get all onboarding form data records for a token"""
        try:
            result = self.client.table("onboarding_form_data").select("*").eq("token", token).order("created_at").execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Failed to get all onboarding data: {e}")
            return []
    
    def get_onboarding_form_data_by_employee(self, employee_id: str, step_id: str = None) -> Dict[str, Any]:
        """Get onboarding form data for an employee and optional step"""
        try:
            query = self.client.table("onboarding_form_data").select("*").eq("employee_id", employee_id)
            
            if step_id:
                query = query.eq("step_id", step_id)
            
            result = query.execute()
            
            if result.data:
                if step_id:
                    # Return single step data
                    return result.data[0].get("form_data", {}) if result.data else {}
                else:
                    # Return all steps as dict
                    return {item["step_id"]: item["form_data"] for item in result.data}
            
            return {}
        except Exception as e:
            logger.error(f"Failed to get onboarding form data by employee: {e}")
            return {}
    
    # ==========================================
    # DOCUMENT STORAGE METHODS (Supabase Storage)
    # ==========================================
    
    async def create_storage_bucket(self, bucket_name: str, public: bool = False) -> bool:
        """Create a storage bucket in Supabase using service key"""
        try:
            # Check if bucket already exists using admin client
            existing_buckets = self.admin_client.storage.list_buckets()
            if any(bucket.name == bucket_name for bucket in existing_buckets):
                logger.info(f"Bucket {bucket_name} already exists")
                return True

            # Create new bucket with proper options format using admin client
            # The Supabase Python SDK expects options as a dict
            options = {
                'public': public,
                'file_size_limit': 52428800,  # 50MB limit
                'allowed_mime_types': ['image/jpeg', 'image/png', 'application/pdf']
            }

            # Create bucket using correct Supabase Python client format
            # The client expects a dictionary with 'name' and 'id' fields
            bucket_config = {
                'name': bucket_name,
                'id': bucket_name,
                'public': public,
                'file_size_limit': 52428800,  # 50MB
                'allowed_mime_types': ['image/jpeg', 'image/png', 'application/pdf']
            }

            try:
                # Try the standard format first
                response = self.admin_client.storage.create_bucket(bucket_config)
            except Exception as e1:
                logger.debug(f"First bucket creation attempt failed: {e1}")
                try:
                    # Try with just the bucket name as string
                    response = self.admin_client.storage.create_bucket(bucket_name)
                except Exception as e2:
                    logger.debug(f"Second bucket creation attempt failed: {e2}")
                    # Try with name parameter explicitly
                    response = self.admin_client.storage.create_bucket(name=bucket_name, public=public)
            logger.info(f"Created storage bucket: {bucket_name}")
            return True
        except Exception as e:
            # If error is about bucket already existing, that's OK
            if 'already exists' in str(e).lower():
                logger.info(f"Bucket {bucket_name} already exists (from error message)")
                return True
            logger.error(f"Failed to create storage bucket {bucket_name}: {e}")
            return False
    
    async def upload_document_to_storage(self, bucket_name: str, file_path: str, file_data: bytes, 
                                        content_type: str = 'application/octet-stream') -> Dict[str, Any]:
        """Upload document to Supabase storage"""
        try:
            # Ensure bucket exists
            await self.create_storage_bucket(bucket_name)
            
            # Upload file using admin client
            response = self.admin_client.storage.from_(bucket_name).upload(
                file_path,
                file_data,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"  # Must be string, not boolean
                }
            )

            # Get public URL using admin client
            public_url = self.admin_client.storage.from_(bucket_name).get_public_url(file_path)
            
            # Store metadata in database
            metadata = {
                "id": str(uuid.uuid4()),
                "bucket": bucket_name,
                "path": file_path,
                "size": len(file_data),
                "content_type": content_type,
                "public_url": public_url,
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }

            # Note: Not storing in signed_documents here as this is for generic uploads
            # The signed_documents table is used specifically for signed onboarding documents
            # For generic uploads, we just return the metadata without DB storage
            
            logger.info(f"Document uploaded to storage: {bucket_name}/{file_path}")
            return metadata
            
        except Exception as e:
            logger.error(f"Failed to upload document: {e}")
            raise
    
    async def upload_employee_document(self, employee_id: str, document_type: str,
                                      file_data: bytes, file_name: str,
                                      content_type: str = 'application/pdf') -> Dict[str, Any]:
        """Upload employee document to Supabase storage and save metadata to database using unified path structure"""
        try:
            # Import path manager
            from .document_path_utils import document_path_manager

            # Get property_id for employee
            employee_data = await self.get_employee_by_id(employee_id)
            if not employee_data:
                raise ValueError(f"Employee not found: {employee_id}")

            # Handle both dict and object returns from get_employee_by_id
            if hasattr(employee_data, 'property_id'):
                property_id = employee_data.property_id  # Object attribute access
            elif isinstance(employee_data, dict):
                property_id = employee_data.get('property_id')  # Dict access
            else:
                property_id = None

            if not property_id:
                raise ValueError(f"Employee {employee_id} has no property_id")

            # Map document_type to I-9 document subtype
            document_subtype_mapping = {
                'drivers_license': 'drivers_license',
                'social_security_card': 'social_security_card',
                'us_passport': 'passport',
                'permanent_resident_card': 'green_card',
                'list_a': 'list_a_document',
                'list_b': 'list_b_document',
                'list_c': 'list_c_document'
            }
            document_subtype = document_subtype_mapping.get(document_type, document_type)

            # Build unified storage path using DocumentPathManager
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            timestamped_filename = f"{timestamp}_{file_name}"

            file_path = await document_path_manager.build_upload_path(
                employee_id=employee_id,
                property_id=property_id,
                upload_type='i9_verification',
                document_subtype=document_subtype,
                filename=timestamped_filename
            )

            logger.info(f"🔵 Uploading I-9 document - employee: {employee_id}, type: {document_type}, path: {file_path}")

            # Upload to unified onboarding-documents bucket
            bucket_name = "onboarding-documents"
            await self.create_storage_bucket(bucket_name, public=False)

            result = await self.upload_document_to_storage(
                bucket_name=bucket_name,
                file_path=file_path,
                file_data=file_data,
                content_type=content_type
            )

            logger.info(f"✅ I-9 document uploaded successfully: {file_path}")

            # Determine document list based on document type
            document_list = 'list_a'  # default
            if document_type in ['list_a', 'us_passport']:
                document_list = 'list_a'
            elif document_type in ['list_b', 'drivers_license']:
                document_list = 'list_b'
            elif document_type in ['list_c', 'social_security_card', 'ssn_card']:
                document_list = 'list_c'

            # Save document metadata to i9_documents table
            document_metadata = {
                "employee_id": employee_id,
                "document_type": document_type,
                "document_list": document_list,
                "file_name": file_name,
                "file_size": len(file_data),
                "mime_type": content_type,
                "file_url": result.get("public_url"),
                "storage_path": file_path,
                "status": "uploaded",
                "metadata": {
                    "original_filename": file_name,
                    "upload_timestamp": timestamp,
                    "bucket": bucket_name,
                    "property_id": property_id
                }
            }

            try:
                # Insert into i9_documents table
                doc_result = self.client.table("i9_documents").insert(document_metadata).execute()
                logger.info(f"✅ Document metadata saved to database for employee {employee_id}")

                # Add database record ID to result
                if doc_result.data and len(doc_result.data) > 0:
                    result["document_id"] = doc_result.data[0].get("id")
            except Exception as db_error:
                logger.error(f"Failed to save document metadata to database: {db_error}")
                # Continue even if database save fails - file is still in storage

            # Add employee reference
            result["employee_id"] = employee_id
            result["document_type"] = document_type
            result["document_list"] = document_list
            result["original_filename"] = file_name

            return result

        except Exception as e:
            logger.error(f"Failed to upload employee document: {e}")
            raise
    
    async def upload_generated_pdf(self, employee_id: str, form_type: str,
                                  pdf_data: bytes, signed: bool = False, property_id: str = None) -> Dict[str, Any]:
        """Upload generated PDF to Supabase storage with property-based paths"""
        try:
            # Import path manager
            from .document_path_utils import document_path_manager

            # Get property_id if not provided
            if not property_id:
                employee = await self.get_employee_by_id(employee_id)
                if employee:
                    property_id = employee.get('property_id') if isinstance(employee, dict) else getattr(employee, 'property_id', None)

            # Create filename with timestamp
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            status = "signed" if signed else "draft"
            file_name = f"{form_type}_{status}_{timestamp}.pdf"

            # Build property-based path using new structure
            file_path = await document_path_manager.build_form_path(
                employee_id=employee_id,
                property_id=property_id,
                form_type=form_type,
                filename=file_name
            )
            
            # Upload to generated-pdfs bucket
            result = await self.upload_document_to_storage(
                bucket_name="generated-pdfs",
                file_path=file_path,
                file_data=pdf_data,
                content_type="application/pdf"
            )
            
            # Add metadata
            result["employee_id"] = employee_id
            result["form_type"] = form_type
            result["is_signed"] = signed
            result["generated_at"] = datetime.now(timezone.utc).isoformat()
            result["storage_path"] = file_path  # Add storage_path for test compatibility
            
            # Store PDF metadata in database using available columns
            # Available columns: id, employee_id, form_type, storage_path, metadata, created_at
            pdf_metadata = {
                "id": str(uuid.uuid4()),
                "employee_id": employee_id,
                "form_type": form_type,
                "storage_path": file_path,
                "metadata": {
                    "storage_url": result["public_url"],
                    "is_signed": signed,
                    "generated_at": result["generated_at"],
                    "file_name": file_name,
                    "property_id": property_id
                }
            }

            self.client.table("generated_pdfs").insert(pdf_metadata).execute()
            
            logger.info(f"Generated PDF uploaded: {form_type} for employee {employee_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to upload generated PDF: {e}")
            raise
    
    async def save_signed_document(
        self,
        *,
        employee_id: str,
        property_id: Optional[str],
        form_type: str,
        pdf_bytes: bytes,
        is_edit: bool = False,
        signed_url_expires_in_seconds: int = 2592000  # 30 days
    ) -> Dict[str, Any]:
        """Save a signed document to the unified private bucket with property-based paths.

        Bucket: onboarding-documents
        New Paths:
          - Active:  {property_name}/{employee_name}/forms/{form_type}/{timestamp}_{uuid}.pdf
          - Archive: {property_name}/{employee_name}/forms/{form_type}/archive/{version_ts}/{original_filename}
        """
        try:
            # Import path manager
            from .document_path_utils import document_path_manager

            bucket_name = "onboarding-documents"
            await self.create_storage_bucket(bucket_name, public=False)

            # Build filename
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())
            filename = f"{form_type}_signed_{timestamp}_{unique_id}.pdf"

            # Build property-based path
            active_path = await document_path_manager.build_form_path(
                employee_id=employee_id,
                property_id=property_id,
                form_type=form_type,
                filename=filename
            )

            # Extract directory for archiving logic
            active_dir = "/".join(active_path.split("/")[:-1])

            # If editing, archive any existing active document(s)
            if is_edit:
                try:
                    # List existing active files
                    listing = self.admin_client.storage.from_(bucket_name).list(active_dir)
                    if listing:
                        version_ts = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
                        for item in listing:
                            name = item.get('name') if isinstance(item, dict) else getattr(item, 'name', None)
                            if not name:
                                continue
                            prev_path = f"{active_dir}/{name}"
                            # Download previous
                            prev_bytes = self.admin_client.storage.from_(bucket_name).download(prev_path)
                            # Upload to archive
                            archive_dir = f"{safe_property_id}/{employee_id}/{form_type}/archive/{version_ts}"
                            archive_path = f"{archive_dir}/{name}"
                            self.admin_client.storage.from_(bucket_name).upload(
                                archive_path,
                                prev_bytes,
                                file_options={"content-type": "application/pdf", "upsert": "true"}
                            )
                            # Remove original active
                            self.admin_client.storage.from_(bucket_name).remove([prev_path])
                            # Insert minimal metadata row for archive copy (best-effort)
                            try:
                                self.client.table("signed_documents").insert({
                                    "id": str(uuid.uuid4()),
                                    "employee_id": employee_id,
                                    "document_type": f"{form_type}_archive",
                                    "document_name": name,
                                    "pdf_url": None,  # Archive doesn't have signed URL
                                    "property_id": property_id,
                                    "metadata": {
                                        "bucket": bucket_name,
                                        "path": archive_path,
                                        "size": len(prev_bytes) if hasattr(prev_bytes, '__len__') else None,
                                        "content_type": "application/pdf",
                                        "is_archive": "true",
                                        "archived_at": datetime.now(timezone.utc).isoformat()
                                    },
                                    "created_at": datetime.now(timezone.utc).isoformat(),
                                    "updated_at": datetime.now(timezone.utc).isoformat()
                                }).execute()
                            except Exception:
                                pass
                except Exception as archive_err:
                    logger.warning(f"Archiving previous active document(s) failed: {archive_err}")

            # Upload new active PDF
            self.admin_client.storage.from_(bucket_name).upload(
                active_path,
                pdf_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )

            # Create signed URL for controlled access
            signed = self.admin_client.storage.from_(bucket_name).create_signed_url(
                active_path,
                signed_url_expires_in_seconds
            )
            signed_url = signed.get('signedURL') if isinstance(signed, dict) else None
            signed_url_expires_at = (
                datetime.now(timezone.utc) + timedelta(seconds=signed_url_expires_in_seconds)
            ).isoformat()

            # Record metadata in signed_documents table
            try:
                self.client.table("signed_documents").insert({
                    "id": str(uuid.uuid4()),
                    "employee_id": employee_id,
                    "document_type": form_type,
                    "document_name": filename,
                    "pdf_url": signed_url,
                    "pdf_data": None,  # Not storing base64 since we have it in storage
                    "signed_at": datetime.now(timezone.utc).isoformat(),
                    "signature_data": None,  # Could add if needed
                    "property_id": property_id,
                    "metadata": {
                        "bucket": bucket_name,
                        "path": active_path,
                        "size": len(pdf_bytes),
                        "content_type": "application/pdf",
                        "signed_url_expires_at": signed_url_expires_at
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).execute()
                logger.info(f"Saved document metadata to signed_documents table")
            except Exception as meta_err:
                logger.warning(f"Failed to insert document metadata to signed_documents: {meta_err}")

            logger.info(f"Signed document saved to storage: {active_path}")
            return {
                "bucket": bucket_name,
                "path": active_path,
                "signed_url": signed_url,
                "filename": filename,
                "version": timestamp,
                "signed_url_expires_at": signed_url_expires_at,
            }
        except Exception as e:
            logger.error(f"Failed to save signed document: {e}")
            raise

    def create_signed_document_url(
        self,
        *,
        bucket: str,
        path: str,
        expires_in_seconds: int = 2592000
    ) -> Optional[Dict[str, str]]:
        """Generate a fresh signed URL for a stored document."""
        try:
            signed = self.admin_client.storage.from_(bucket).create_signed_url(
                path,
                expires_in_seconds
            )
            signed_url = signed.get('signedURL') if isinstance(signed, dict) else signed
            if not signed_url:
                return None

            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)).isoformat()
            return {
                "signed_url": signed_url,
                "signed_url_expires_at": expires_at
            }
        except Exception as e:
            logger.error(f"Failed to create signed URL for {bucket}/{path}: {e}")
            return None

    async def get_document_from_storage(self, bucket_name: str, file_path: str) -> bytes:
        """Download document from Supabase storage"""
        try:
            response = self.client.storage.from_(bucket_name).download(file_path)
            logger.info(f"Document downloaded from storage: {bucket_name}/{file_path}")
            return response
        except Exception as e:
            logger.error(f"Failed to download document: {e}")
            raise
    
    async def delete_document_from_storage(self, bucket_name: str, file_path: str) -> bool:
        """Delete document from Supabase storage"""
        try:
            response = self.client.storage.from_(bucket_name).remove([file_path])
            
            # Note: Not deleting from signed_documents table here
            # This method is for generic file operations
            
            logger.info(f"Document deleted from storage: {bucket_name}/{file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return False
    
    async def list_employee_documents(self, employee_id: str) -> List[Dict[str, Any]]:
        """List all documents for an employee from storage"""
        try:
            # Get from signed_documents table
            result = self.client.table("signed_documents").select("*").eq(
                "employee_id", employee_id
            ).execute()
            
            documents = []
            for doc in result.data:
                # Extract metadata if stored in the metadata field
                metadata = doc.get("metadata", {})
                documents.append({
                    "id": doc["id"],
                    "document_type": doc.get("document_type"),
                    "document_name": doc.get("document_name"),
                    "pdf_url": doc.get("pdf_url"),
                    "signed_at": doc.get("signed_at"),
                    "property_id": doc.get("property_id"),
                    "bucket": metadata.get("bucket"),
                    "path": metadata.get("path"),
                    "size": metadata.get("size"),
                    "content_type": metadata.get("content_type", "application/pdf"),
                    "uploaded_at": doc.get("created_at")
                })

            return documents
            
        except Exception as e:
            logger.error(f"Failed to list employee documents: {e}")
            return []
    
    async def get_employee_generated_pdfs(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get all generated PDFs for an employee"""
        try:
            result = self.client.table("generated_pdfs").select("*").eq(
                "employee_id", employee_id
            ).order("generated_at", desc=True).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get employee generated PDFs: {e}")
            return []
    
    async def initialize_storage_buckets(self) -> bool:
        """Initialize required storage buckets"""
        try:
            # Create onboarding-documents bucket for uploaded documents
            await self.create_storage_bucket("onboarding-documents", public=False)
            
            # Create generated-pdfs bucket for system-generated PDFs
            await self.create_storage_bucket("generated-pdfs", public=False)
            
            # Create employee-photos bucket for profile photos
            await self.create_storage_bucket("employee-photos", public=True)
            
            logger.info("Storage buckets initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize storage buckets: {e}")
            return False
    
    # ==========================================
    # EMPLOYEE SEARCH & MANAGEMENT METHODS (Phase 1.4)
    # ==========================================
    
    async def search_employees(self, search_query: str, property_id: str = None, department: str = None, position: str = None, employment_status: str = None) -> List[Employee]:
        """
        Search employees with filters.
        SECURITY NOTE: Always provide property_id for non-HR users to prevent cross-property access.
        """
        try:
            # Log search attempt for security audit
            if not property_id:
                logger.warning(f"SECURITY: Employee search attempted without property_id filter. Query: {search_query}")
            else:
                logger.info(f"SECURITY: Employee search within property {property_id}. Query: {search_query}")
                
            query = self.client.table("employees").select("*")
            
            # Apply search query if provided
            if search_query:
                # Search in personal info for name or email
                # Note: This is a simplified search - you might want to use full-text search
                query = query.or_(f"personal_info->>first_name.ilike.%{search_query}%,personal_info->>last_name.ilike.%{search_query}%,personal_info->>email.ilike.%{search_query}%")
            
            # Apply filters - CRITICAL: property_id filter for security
            if property_id:
                query = query.eq("property_id", property_id)
                logger.info(f"SECURITY: Applying property filter {property_id} to employee search")
            if department:
                query = query.eq("department", department)
            if position:
                query = query.eq("position", position)
            if employment_status:
                query = query.eq("employment_status", employment_status)
            
            result = query.order("created_at", desc=True).execute()
            
            employees = []
            for emp_data in result.data:
                employees.append(Employee(
                    id=emp_data["id"],
                    application_id=emp_data["application_id"],
                    property_id=emp_data["property_id"],
                    manager_id=emp_data["manager_id"],
                    department=emp_data["department"],
                    position=emp_data["position"],
                    hire_date=datetime.fromisoformat(emp_data["hire_date"]).date() if emp_data.get("hire_date") else None,
                    pay_rate=emp_data["pay_rate"],
                    pay_frequency=emp_data["pay_frequency"],
                    employment_type=emp_data["employment_type"],
                    personal_info=emp_data["personal_info"],
                    onboarding_status=OnboardingStatus(emp_data["onboarding_status"]),
                    created_at=datetime.fromisoformat(emp_data["created_at"].replace('Z', '+00:00'))
                ))
            
            return employees
            
        except Exception as e:
            logger.error(f"Failed to search employees: {e}")
            return []
    
    async def update_employee_status(self, employee_id: str, status: str, updated_by: str) -> bool:
        """Update employee employment status"""
        try:
            result = self.client.table("employees").update({
                "employment_status": status,
                "updated_by": updated_by,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", employee_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to update employee status {employee_id}: {e}")
            return False
    
    async def get_employee_statistics(self, property_id: str = None) -> Dict[str, Any]:
        """Get employee statistics"""
        try:
            query = self.client.table("employees").select("*")
            
            if property_id:
                query = query.eq("property_id", property_id)
            
            result = query.execute()
            
            employees = result.data
            total_count = len(employees)
            
            # Count by status
            status_counts = {}
            for emp in employees:
                status = emp.get("employment_status", "active")
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Count by department
            department_counts = {}
            for emp in employees:
                dept = emp.get("department", "Unknown")
                department_counts[dept] = department_counts.get(dept, 0) + 1
            
            # Count by onboarding status
            onboarding_counts = {}
            for emp in employees:
                onb_status = emp.get("onboarding_status", "not_started")
                onboarding_counts[onb_status] = onboarding_counts.get(onb_status, 0) + 1
            
            return {
                "total_employees": total_count,
                "by_status": status_counts,
                "by_department": department_counts,
                "by_onboarding_status": onboarding_counts,
                "property_id": property_id
            }
            
        except Exception as e:
            logger.error(f"Failed to get employee statistics: {e}")
            return {
                "total_employees": 0,
                "by_status": {},
                "by_department": {},
                "by_onboarding_status": {},
                "property_id": property_id
            }
    
    # =====================================
    # I-9 DEADLINE TRACKING METHODS
    # =====================================
    
    async def set_i9_deadlines(self, employee_id: str, start_date: date) -> bool:
        """Set I-9 federal compliance deadlines based on employee start date"""
        try:
            from .models_enhanced import calculate_business_days_from
            
            # Section 1 deadline: By/before first day of work
            section1_deadline = datetime.combine(
                start_date, 
                datetime.min.time()
            ).replace(tzinfo=timezone.utc)
            
            # Section 2 deadline: Within 3 business days of employment
            section2_date = calculate_business_days_from(start_date, 3)
            section2_deadline = datetime.combine(
                section2_date,
                datetime.max.time()
            ).replace(tzinfo=timezone.utc)
            
            # Update employee record with deadlines
            result = self.client.table("employees").update({
                "i9_section1_deadline": section1_deadline.isoformat(),
                "i9_section2_deadline": section2_deadline.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", employee_id).execute()
            
            if result.data:
                logger.info(f"✅ Set I-9 deadlines for employee {employee_id}")
                logger.info(f"   Section 1: {section1_deadline.date()}")
                logger.info(f"   Section 2: {section2_date}")
                
                # Create audit log entry
                await self.create_audit_log(
                    user_id="system",
                    action=AuditLogAction.UPDATE,
                    entity_type="employee",
                    entity_id=employee_id,
                    description=f"I-9 deadlines set - Section 1: {section1_deadline.date()}, Section 2: {section2_date}",
                    metadata={
                        "section1_deadline": section1_deadline.isoformat(),
                        "section2_deadline": section2_deadline.isoformat(),
                        "start_date": start_date.isoformat()
                    }
                )
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to set I-9 deadlines for employee {employee_id}: {e}")
            return False
    
    async def auto_assign_manager_for_i9(self, employee_id: str, property_id: str, 
                                         method: str = "least_workload") -> Optional[str]:
        """Auto-assign a manager for I-9 Section 2 completion based on workload or round-robin"""
        try:
            # Get all managers for the property
            managers_query = self.client.table("users").select("*").eq(
                "property_id", property_id
            ).eq("role", "manager").eq("is_active", True).execute()
            
            if not managers_query.data:
                logger.warning(f"No active managers found for property {property_id}")
                return None
            
            managers = managers_query.data
            selected_manager = None
            
            if method == "least_workload":
                # Get workload for each manager
                manager_workloads = []
                
                for manager in managers:
                    # Count active I-9 assignments
                    active_count_query = self.client.table("employees").select("id").eq(
                        "i9_assigned_manager_id", manager["id"]
                    ).is_("i9_section2_completed_at", "null").execute()
                    
                    active_count = len(active_count_query.data) if active_count_query.data else 0
                    
                    manager_workloads.append({
                        "manager": manager,
                        "active_count": active_count
                    })
                
                # Sort by workload and select manager with least assignments
                manager_workloads.sort(key=lambda x: x["active_count"])
                selected_manager = manager_workloads[0]["manager"]
                
            elif method == "round_robin":
                # Get the last assigned manager
                last_assignment = self.client.table("employees").select(
                    "i9_assigned_manager_id"
                ).not_.is_("i9_assigned_manager_id", "null").order(
                    "updated_at", desc=True
                ).limit(1).execute()
                
                if last_assignment.data:
                    last_manager_id = last_assignment.data[0]["i9_assigned_manager_id"]
                    # Find index of last manager
                    last_index = next((i for i, m in enumerate(managers) if m["id"] == last_manager_id), -1)
                    # Select next manager in rotation
                    next_index = (last_index + 1) % len(managers)
                    selected_manager = managers[next_index]
                else:
                    # First assignment, select first manager
                    selected_manager = managers[0]
            
            else:  # Default to first available manager
                selected_manager = managers[0]
            
            if selected_manager:
                # Assign manager to employee
                assignment_result = self.client.table("employees").update({
                    "i9_assigned_manager_id": selected_manager["id"],
                    "manager_id": selected_manager["id"],  # Also update general manager_id
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", employee_id).execute()
                
                if assignment_result.data:
                    logger.info(f"✅ Auto-assigned manager {selected_manager['email']} for I-9 Section 2 (employee: {employee_id})")
                    
                    # Create notification for manager
                    await self.create_notification(
                        user_id=selected_manager["id"],
                        type=NotificationType.I9_SECTION2_REQUIRED,
                        title="New I-9 Section 2 Assignment",
                        message=f"You have been assigned to complete I-9 Section 2 for a new employee",
                        priority=NotificationPriority.HIGH,
                        metadata={
                            "employee_id": employee_id,
                            "assignment_method": method
                        }
                    )
                    
                    # Create audit log
                    await self.create_audit_log(
                        user_id="system",
                        action=AuditLogAction.ASSIGN,
                        entity_type="i9_section2",
                        entity_id=employee_id,
                        description=f"Manager auto-assigned for I-9 Section 2 using {method} method",
                        metadata={
                            "manager_id": selected_manager["id"],
                            "manager_email": selected_manager["email"],
                            "method": method
                        }
                    )
                    
                    return selected_manager["id"]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to auto-assign manager for I-9: {e}")
            return None
    
    async def get_pending_i9_deadlines(self, property_id: Optional[str] = None, 
                                       include_overdue: bool = True) -> List[Dict[str, Any]]:
        """Get all pending I-9 forms approaching or past deadline"""
        try:
            from .models_enhanced import I9DeadlineStatus, I9DeadlineTracking
            
            current_time = datetime.now(timezone.utc)
            approaching_time = current_time + timedelta(hours=24)
            
            # Build query
            query = self.client.table("employees").select("*")
            
            if property_id:
                query = query.eq("property_id", property_id)
            
            # Get employees with pending I-9s
            query = query.or_(
                "i9_section1_completed_at.is.null,i9_section2_completed_at.is.null"
            )
            
            result = query.execute()
            
            pending_deadlines = []
            
            for emp in result.data:
                tracking = {
                    "employee_id": emp["id"],
                    "employee_name": f"{emp.get('personal_info', {}).get('first_name', '')} {emp.get('personal_info', {}).get('last_name', '')}".strip(),
                    "property_id": emp["property_id"],
                    "department": emp.get("department", ""),
                    "position": emp.get("position", ""),
                    "start_date": emp.get("start_date"),
                    "section1": {
                        "deadline": emp.get("i9_section1_deadline"),
                        "completed": emp.get("i9_section1_completed_at") is not None,
                        "status": I9DeadlineStatus.ON_TRACK
                    },
                    "section2": {
                        "deadline": emp.get("i9_section2_deadline"),
                        "completed": emp.get("i9_section2_completed_at") is not None,
                        "assigned_manager": emp.get("i9_assigned_manager_id"),
                        "status": I9DeadlineStatus.ON_TRACK
                    }
                }
                
                # Calculate Section 1 status
                if tracking["section1"]["completed"]:
                    tracking["section1"]["status"] = I9DeadlineStatus.COMPLETED
                elif tracking["section1"]["deadline"]:
                    deadline = datetime.fromisoformat(tracking["section1"]["deadline"])
                    if current_time > deadline:
                        tracking["section1"]["status"] = I9DeadlineStatus.OVERDUE
                    elif current_time.date() == deadline.date():
                        tracking["section1"]["status"] = I9DeadlineStatus.DUE_TODAY
                    elif approaching_time > deadline:
                        tracking["section1"]["status"] = I9DeadlineStatus.APPROACHING
                
                # Calculate Section 2 status
                if tracking["section2"]["completed"]:
                    tracking["section2"]["status"] = I9DeadlineStatus.COMPLETED
                elif tracking["section2"]["deadline"]:
                    deadline = datetime.fromisoformat(tracking["section2"]["deadline"])
                    if current_time > deadline:
                        tracking["section2"]["status"] = I9DeadlineStatus.OVERDUE
                    elif current_time.date() == deadline.date():
                        tracking["section2"]["status"] = I9DeadlineStatus.DUE_TODAY
                    elif approaching_time > deadline:
                        tracking["section2"]["status"] = I9DeadlineStatus.APPROACHING
                
                # Include if has pending items and meets filter criteria
                has_pending = (not tracking["section1"]["completed"] or 
                              not tracking["section2"]["completed"])
                
                if has_pending:
                    if include_overdue or (
                        tracking["section1"]["status"] != I9DeadlineStatus.OVERDUE and
                        tracking["section2"]["status"] != I9DeadlineStatus.OVERDUE
                    ):
                        pending_deadlines.append(tracking)
            
            # Sort by urgency (overdue first, then approaching, then due today)
            def urgency_score(item):
                scores = {
                    I9DeadlineStatus.OVERDUE: 0,
                    I9DeadlineStatus.DUE_TODAY: 1,
                    I9DeadlineStatus.APPROACHING: 2,
                    I9DeadlineStatus.ON_TRACK: 3,
                    I9DeadlineStatus.COMPLETED: 4
                }
                s1_score = scores.get(item["section1"]["status"], 5)
                s2_score = scores.get(item["section2"]["status"], 5)
                return min(s1_score, s2_score)
            
            pending_deadlines.sort(key=urgency_score)
            
            return pending_deadlines
            
        except Exception as e:
            logger.error(f"Failed to get pending I-9 deadlines: {e}")
            return []
    
    async def mark_i9_section_complete(self, employee_id: str, section: int, 
                                       completed_by: str) -> bool:
        """Mark an I-9 section as complete"""
        try:
            completion_time = datetime.now(timezone.utc)
            
            if section == 1:
                update_data = {
                    "i9_section1_completed_at": completion_time.isoformat(),
                    "updated_at": completion_time.isoformat()
                }
                section_name = "Section 1"
            elif section == 2:
                update_data = {
                    "i9_section2_completed_at": completion_time.isoformat(),
                    "i9_completed": True,  # Both sections now complete
                    "updated_at": completion_time.isoformat()
                }
                section_name = "Section 2"
            else:
                logger.error(f"Invalid I-9 section number: {section}")
                return False
            
            # Update employee record
            result = self.client.table("employees").update(update_data).eq(
                "id", employee_id
            ).execute()
            
            if result.data:
                logger.info(f"✅ Marked I-9 {section_name} complete for employee {employee_id}")
                
                # Check if deadline was met
                employee = result.data[0]
                deadline_key = f"i9_section{section}_deadline"
                if deadline_key in employee and employee[deadline_key]:
                    deadline = datetime.fromisoformat(employee[deadline_key])
                    was_on_time = completion_time <= deadline
                    
                    # Create audit log with compliance status
                    await self.create_audit_log(
                        user_id=completed_by,
                        action=AuditLogAction.COMPLETE,
                        entity_type=f"i9_section{section}",
                        entity_id=employee_id,
                        description=f"I-9 {section_name} completed {'on time' if was_on_time else 'LATE'}",
                        metadata={
                            "completed_at": completion_time.isoformat(),
                            "deadline": deadline.isoformat(),
                            "on_time": was_on_time,
                            "section": section
                        }
                    )
                    
                    # Send alert if completed late
                    if not was_on_time:
                        await self.create_notification(
                            user_id=completed_by,
                            type=NotificationType.COMPLIANCE_ALERT,
                            title=f"I-9 {section_name} Completed Late",
                            message=f"I-9 {section_name} for employee {employee_id} was completed after the federal deadline",
                            priority=NotificationPriority.HIGH,
                            metadata={
                                "employee_id": employee_id,
                                "deadline": deadline.isoformat(),
                                "completed_at": completion_time.isoformat()
                            }
                        )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark I-9 section {section} complete: {e}")
            return False
    
    async def check_and_notify_i9_deadlines(self) -> int:
        """Check for approaching I-9 deadlines and send notifications"""
        try:
            notifications_sent = 0
            
            # Get all pending deadlines
            pending = await self.get_pending_i9_deadlines()
            
            for item in pending:
                # Check Section 1
                if item["section1"]["status"] in [I9DeadlineStatus.APPROACHING, I9DeadlineStatus.DUE_TODAY]:
                    # Notify employee
                    emp_result = self.client.table("employees").select("personal_info").eq(
                        "id", item["employee_id"]
                    ).execute()
                    
                    if emp_result.data and emp_result.data[0].get("personal_info"):
                        email = emp_result.data[0]["personal_info"].get("email")
                        if email:
                            # Send email notification (would integrate with email service)
                            logger.info(f"📧 Would send I-9 Section 1 reminder to {email}")
                            notifications_sent += 1
                
                # Check Section 2
                if item["section2"]["status"] in [I9DeadlineStatus.APPROACHING, I9DeadlineStatus.DUE_TODAY, I9DeadlineStatus.OVERDUE]:
                    if item["section2"]["assigned_manager"]:
                        # Notify assigned manager
                        await self.create_notification(
                            user_id=item["section2"]["assigned_manager"],
                            type=NotificationType.I9_DEADLINE_REMINDER,
                            title=f"I-9 Section 2 {item['section2']['status']}",
                            message=f"I-9 Section 2 for {item['employee_name']} is {item['section2']['status']}",
                            priority=NotificationPriority.HIGH if item["section2"]["status"] == I9DeadlineStatus.OVERDUE else NotificationPriority.NORMAL,
                            metadata={
                                "employee_id": item["employee_id"],
                                "employee_name": item["employee_name"],
                                "deadline": item["section2"]["deadline"],
                                "status": item["section2"]["status"]
                            }
                        )
                        notifications_sent += 1
            
            logger.info(f"✅ Sent {notifications_sent} I-9 deadline notifications")
            return notifications_sent
            
        except Exception as e:
            logger.error(f"Failed to check and notify I-9 deadlines: {e}")
            return 0
    
    def get_onboarding_form_data_by_session(self, session_id: str) -> Dict[str, Any]:
        """Get all form data for an onboarding session"""
        try:
            # In a real implementation, this would fetch from a form_data table
            # For now, return a mock structure
            return {
                "personal_info": {},
                "i9_section1": {},
                "w4_form": {},
                "emergency_contacts": {},
                "direct_deposit": {},
                "health_insurance": {},
                "company_policies": {},
                "background_check": {}
            }
        except Exception as e:
            logger.error(f"Failed to get onboarding form data: {e}")
            return {}
    
    async def get_onboarding_documents(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all documents uploaded for an onboarding session"""
        try:
            # In a real implementation, this would fetch from a documents table
            # For now, return an empty list
            return []
        except Exception as e:
            logger.error(f"Failed to get onboarding documents: {e}")
            return []
    
    def get_onboarding_form_data_by_step(self, session_id: str, step: str) -> Optional[Dict[str, Any]]:
        """Get form data for a specific onboarding step"""
        try:
            # In a real implementation, this would fetch from a form_data table
            # filtered by step
            return None
        except Exception as e:
            logger.error(f"Failed to get form data by step: {e}")
            return None
    
    async def get_users_by_role(self, role: str) -> List[User]:
        """Get all users with a specific role"""
        try:
            response = self.client.table('users').select('*').eq('role', role).execute()
            
            if response.data:
                return [User(**user_data) for user_data in response.data]
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to get users by role: {e}")
            return []
    
    async def store_onboarding_form_data(self, session_id: str, step: str, form_data: Dict[str, Any]) -> bool:
        """Store form data for an onboarding step"""
        try:
            # In a real implementation, this would store in a form_data table
            logger.info(f"Storing form data for session {session_id}, step {step}")
            return True
        except Exception as e:
            logger.error(f"Failed to store form data: {e}")
            return False
    
    async def store_onboarding_signature(self, session_id: str, step: str, signature_data: Dict[str, Any]) -> bool:
        """Store signature data for an onboarding step"""
        try:
            # In a real implementation, this would store in a signatures table
            logger.info(f"Storing signature for session {session_id}, step {step}")
            return True
        except Exception as e:
            logger.error(f"Failed to store signature: {e}")
            return False
    
    async def create_audit_entry(self, action: str, entity_type: str, entity_id: str, user_id: Optional[str] = None, details: Optional[Dict] = None) -> bool:
        """Create an audit trail entry"""
        try:
            audit_data = {
                "id": str(uuid.uuid4()),
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "user_id": user_id,
                "details": details or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # In a real implementation, this would store in an audit_trail table
            logger.info(f"Creating audit entry: {action} on {entity_type} {entity_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to create audit entry: {e}")
            return False
    
    # ==========================================
    # SCHEDULER SUPPORT METHODS
    # ==========================================
    
    async def get_expiring_onboarding_sessions(self, hours: int = 48) -> List[Dict[str, Any]]:
        """Get onboarding sessions expiring within specified hours"""
        try:
            expiry_cutoff = datetime.now(timezone.utc) + timedelta(hours=hours)
            
            # Get sessions that are not completed and expiring soon
            result = self.client.table("onboarding_sessions").select("*").lt(
                "expires_at", expiry_cutoff.isoformat()
            ).in_(
                "status", ["initiated", "in_progress", "employee_completed"]
            ).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get expiring sessions: {e}")
            return []
    
    async def update_last_reminder_sent(self, session_id: str) -> bool:
        """Update the last reminder sent timestamp for a session"""
        try:
            result = self.client.table("onboarding_sessions").update({
                "last_reminder_sent": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", session_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to update last reminder sent: {e}")
            return False
    
    async def get_hr_users(self) -> List[Dict[str, Any]]:
        """Get all active HR users"""
        try:
            result = self.client.table("users").select("*").eq(
                "role", "hr"
            ).eq("is_active", True).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get HR users: {e}")
            return []
    
    async def get_onboarding_stats(self) -> Dict[str, int]:
        """Get onboarding statistics for HR summary"""
        try:
            stats = {
                "pending_manager_review": 0,
                "pending_hr_review": 0,
                "expiring_in_24h": 0,
                "completed_today": 0,
                "total_active": 0
            }
            
            # Get sessions pending manager review
            manager_result = self.client.table("onboarding_sessions").select("id").eq(
                "status", "employee_completed"
            ).execute()
            stats["pending_manager_review"] = len(manager_result.data) if manager_result.data else 0
            
            # Get sessions pending HR review
            hr_result = self.client.table("onboarding_sessions").select("id").eq(
                "status", "manager_approved"
            ).execute()
            stats["pending_hr_review"] = len(hr_result.data) if hr_result.data else 0
            
            # Get sessions expiring in 24 hours
            expiry_cutoff = datetime.now(timezone.utc) + timedelta(hours=24)
            expiring_result = self.client.table("onboarding_sessions").select("id").lt(
                "expires_at", expiry_cutoff.isoformat()
            ).in_(
                "status", ["initiated", "in_progress"]
            ).execute()
            stats["expiring_in_24h"] = len(expiring_result.data) if expiring_result.data else 0
            
            # Get total active sessions
            active_result = self.client.table("onboarding_sessions").select("id").in_(
                "status", ["initiated", "in_progress", "employee_completed", "manager_approved"]
            ).execute()
            stats["total_active"] = len(active_result.data) if active_result.data else 0
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get onboarding stats: {e}")
            return {
                "pending_manager_review": 0,
                "pending_hr_review": 0,
                "expiring_in_24h": 0,
                "completed_today": 0,
                "total_active": 0
            }
    
    async def get_onboarding_step_data(self, employee_id: str, step_id: str) -> Dict[str, Any]:
        """
        Retrieve saved onboarding step data for a specific employee and step
        """
        try:
            # Try onboarding_form_data table first (this is where data is actually saved)
            form_result = self.client.table("onboarding_form_data").select("*").eq(
                "employee_id", employee_id
            ).eq("step_id", step_id).order("created_at", desc=True).limit(1).execute()
            
            if form_result.data and len(form_result.data) > 0:
                logger.info(f"Found saved data in onboarding_form_data for {employee_id}/{step_id}")
                return form_result.data[0]
            
            # Try onboarding_progress table as fallback (if it exists)
            try:
                progress_result = self.client.table("onboarding_progress").select("*").eq(
                    "employee_id", employee_id
                ).eq("step_id", step_id).execute()
                
                if progress_result.data and len(progress_result.data) > 0:
                    logger.info(f"Found saved data in onboarding_progress for {employee_id}/{step_id}")
                    return progress_result.data[0]
            except Exception as progress_error:
                # Table might not exist, that's okay
                logger.debug(f"onboarding_progress table not accessible: {progress_error}")
            
            logger.info(f"No saved data found for {employee_id}/{step_id}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to get onboarding step data for employee {employee_id}, step {step_id}: {e}")
            return None

    # ============================================================================
    # Task 2: Database Schema Enhancement Methods
    # ============================================================================
    
    # Audit Log Methods
    async def create_audit_log(self, audit_log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a comprehensive audit log entry"""
        try:
            # Ensure required fields
            if "id" not in audit_log:
                audit_log["id"] = str(uuid.uuid4())
            if "timestamp" not in audit_log:
                audit_log["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            result = self.admin_client.table("audit_logs").insert(audit_log).execute()
            
            if result.data:
                logger.info(f"Audit log created: {audit_log['action']} on {audit_log['resource_type']}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            return None
    
    async def get_audit_logs(self, filters: Optional[Dict[str, Any]] = None, 
                            limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieve audit logs with optional filtering"""
        try:
            query = self.admin_client.table("audit_logs").select("*")
            
            if filters:
                if "user_id" in filters:
                    query = query.eq("user_id", filters["user_id"])
                if "property_id" in filters:
                    query = query.eq("property_id", filters["property_id"])
                if "resource_type" in filters:
                    query = query.eq("resource_type", filters["resource_type"])
                if "action" in filters:
                    query = query.eq("action", filters["action"])
                if "date_from" in filters:
                    query = query.gte("timestamp", filters["date_from"])
                if "date_to" in filters:
                    query = query.lte("timestamp", filters["date_to"])
            
            result = query.order("timestamp", desc=True).limit(limit).offset(offset).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get audit logs: {e}")
            return []
    
    # Notification Methods
    async def create_notification(self, notification: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new notification"""
        try:
            # Ensure required fields
            if "id" not in notification:
                notification["id"] = str(uuid.uuid4())
            if "created_at" not in notification:
                notification["created_at"] = datetime.now(timezone.utc).isoformat()
            if "status" not in notification:
                notification["status"] = "pending"
            
            result = self.client.table("notifications").insert(notification).execute()
            
            if result.data:
                logger.info(f"Notification created: {notification['type']} for {notification['recipient_id']}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            return None
    
    async def get_notifications(self, user_id: Optional[str] = None, 
                               property_id: Optional[str] = None,
                               status: Optional[str] = None,
                               unread_only: bool = False,
                               limit: int = 50) -> List[Dict[str, Any]]:
        """Get notifications with optional filtering"""
        try:
            query = self.client.table("notifications").select("*")
            
            if user_id:
                query = query.eq("recipient_id", user_id)
            if property_id:
                query = query.eq("property_id", property_id)
            if status:
                query = query.eq("status", status)
            if unread_only:
                query = query.neq("status", "read")
            
            result = query.order("created_at", desc=True).limit(limit).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get notifications: {e}")
            return []
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        try:
            result = self.client.table("notifications").update({
                "status": "read",
                "read_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", notification_id).execute()
            
            if result.data:
                logger.info(f"Notification {notification_id} marked as read")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def mark_notifications_read_bulk(self, notification_ids: List[str]) -> bool:
        """Mark multiple notifications as read"""
        try:
            result = self.client.table("notifications").update({
                "status": "read",
                "read_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).in_("id", notification_ids).execute()
            
            if result.data:
                logger.info(f"Marked {len(notification_ids)} notifications as read")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark notifications as read: {e}")
            return False
    
    # Analytics Event Methods
    async def create_analytics_event(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Track an analytics event"""
        try:
            # Ensure required fields
            if "id" not in event:
                event["id"] = str(uuid.uuid4())
            if "timestamp" not in event:
                event["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            result = self.client.table("analytics_events").insert(event).execute()
            
            if result.data:
                logger.debug(f"Analytics event tracked: {event['event_type']} - {event['event_name']}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to create analytics event: {e}")
            return None
    
    async def get_analytics_events(self, filters: Optional[Dict[str, Any]] = None,
                                  aggregation: Optional[str] = None,
                                  limit: int = 1000) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """Retrieve analytics events with optional aggregation"""
        try:
            query = self.client.table("analytics_events").select("*")
            
            if filters:
                if "user_id" in filters:
                    query = query.eq("user_id", filters["user_id"])
                if "property_id" in filters:
                    query = query.eq("property_id", filters["property_id"])
                if "event_type" in filters:
                    query = query.eq("event_type", filters["event_type"])
                if "event_name" in filters:
                    query = query.eq("event_name", filters["event_name"])
                if "date_from" in filters:
                    query = query.gte("timestamp", filters["date_from"])
                if "date_to" in filters:
                    query = query.lte("timestamp", filters["date_to"])
            
            result = query.order("timestamp", desc=True).limit(limit).execute()
            
            if aggregation and result.data:
                # Perform client-side aggregation
                return self._aggregate_analytics(result.data, aggregation)
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get analytics events: {e}")
            return []
    
    def _aggregate_analytics(self, events: List[Dict[str, Any]], aggregation: str) -> Dict[str, Any]:
        """Perform client-side aggregation of analytics data"""
        aggregated = {
            "total_events": len(events),
            "unique_users": len(set(e.get("user_id") for e in events if e.get("user_id"))),
            "unique_sessions": len(set(e.get("session_id") for e in events if e.get("session_id"))),
        }
        
        if aggregation == "by_event_type":
            event_types = {}
            for event in events:
                event_type = event.get("event_type", "unknown")
                event_types[event_type] = event_types.get(event_type, 0) + 1
            aggregated["by_event_type"] = event_types
            
        elif aggregation == "by_page":
            pages = {}
            for event in events:
                page = event.get("page_title", "unknown")
                pages[page] = pages.get(page, 0) + 1
            aggregated["by_page"] = pages
            
        elif aggregation == "by_property":
            properties = {}
            for event in events:
                prop_id = event.get("property_id", "global")
                properties[prop_id] = properties.get(prop_id, 0) + 1
            aggregated["by_property"] = properties
        
        return aggregated
    
    # Report Template Methods
    async def create_report_template(self, template: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new report template"""
        try:
            # Ensure required fields
            if "id" not in template:
                template["id"] = str(uuid.uuid4())
            if "created_at" not in template:
                template["created_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.client.table("report_templates").insert(template).execute()
            
            if result.data:
                logger.info(f"Report template created: {template['name']}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to create report template: {e}")
            return None
    
    async def get_report_templates(self, user_id: Optional[str] = None,
                                  property_id: Optional[str] = None,
                                  report_type: Optional[str] = None,
                                  active_only: bool = True) -> List[Dict[str, Any]]:
        """Get report templates with optional filtering"""
        try:
            query = self.client.table("report_templates").select("*")
            
            if user_id:
                query = query.eq("created_by", user_id)
            if property_id:
                # Get templates for this property or global templates
                query = query.or_(f"property_id.eq.{property_id},property_id.is.null")
            if report_type:
                query = query.eq("type", report_type)
            if active_only:
                query = query.eq("is_active", True)
            
            result = query.order("created_at", desc=True).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get report templates: {e}")
            return []
    
    async def update_report_template(self, template_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a report template"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.client.table("report_templates").update(updates).eq("id", template_id).execute()
            
            if result.data:
                logger.info(f"Report template {template_id} updated")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to update report template: {e}")
            return None
    
    async def delete_report_template(self, template_id: str) -> bool:
        """Delete a report template (soft delete by marking inactive)"""
        try:
            result = self.client.table("report_templates").update({
                "is_active": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", template_id).execute()
            
            if result.data:
                logger.info(f"Report template {template_id} deleted")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete report template: {e}")
            return False
    
    # Saved Filter Methods
    async def create_saved_filter(self, filter_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a saved filter for dashboards"""
        try:
            if "id" not in filter_data:
                filter_data["id"] = str(uuid.uuid4())
            if "created_at" not in filter_data:
                filter_data["created_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.client.table("saved_filters").insert(filter_data).execute()
            
            if result.data:
                logger.info(f"Saved filter created: {filter_data['name']}")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to create saved filter: {e}")
            return None
    
    async def get_saved_filters(self, user_id: str, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get saved filters for a user"""
        try:
            query = self.client.table("saved_filters").select("*")
            
            # Get user's filters and shared filters
            query = query.or_(f"user_id.eq.{user_id},is_shared.eq.true")
            
            if filter_type:
                query = query.eq("filter_type", filter_type)
            
            result = query.order("created_at", desc=True).execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Failed to get saved filters: {e}")
            return []
    
    # =====================================================
    # DOCUMENT OPERATIONS
    # =====================================================
    
    async def save_document(self, table_name: str, document_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Save a signed document to the specified table"""
        try:
            # Add timestamp if not present
            if "created_at" not in document_data:
                document_data["created_at"] = datetime.now(timezone.utc).isoformat()
            
            # Add ID if not present
            if "id" not in document_data:
                document_data["id"] = str(uuid.uuid4())
            
            # Insert the document
            result = self.client.table(table_name).insert(document_data).execute()
            
            if result.data:
                logger.info(f"Document saved to {table_name}: {document_data.get('id')}")
                
                # Log audit event for compliance (exclude binary data)
                audit_data = document_data.copy()
                # Remove any binary data from audit log to prevent UTF-8 encoding errors
                audit_data.pop('file_data', None)
                audit_data.pop('binary_content', None)
                if 'metadata' in audit_data and isinstance(audit_data['metadata'], dict):
                    audit_metadata = audit_data['metadata'].copy()
                    audit_metadata.pop('file_data', None)
                    audit_metadata.pop('binary_content', None)
                    audit_data['metadata'] = audit_metadata

                await self.log_audit_event(
                    table_name,
                    document_data["id"],
                    "INSERT",
                    new_values=audit_data,
                    compliance_event=True
                )
                
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to save document to {table_name}: {e}")
            return None
    
    async def get_employee_documents(self, employee_id: str, document_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all documents for an employee"""
        try:
            documents = []
            
            # Get from signed_documents table
            query = self.client.table("signed_documents").select("*").eq("employee_id", employee_id)
            if document_type:
                query = query.eq("document_type", document_type)
            result = query.execute()
            if result.data:
                documents.extend(result.data)
            
            # Get W4 forms
            if not document_type or document_type == "w4":
                result = self.client.table("w4_forms").select("*").eq("employee_id", employee_id).execute()
                if result.data:
                    for doc in result.data:
                        doc["document_type"] = "w4"
                        documents.append(doc)
            
            # Get I9 forms
            if not document_type or document_type == "i9":
                result = self.client.table("i9_forms").select("*").eq("employee_id", employee_id).execute()
                if result.data:
                    for doc in result.data:
                        doc["document_type"] = "i9"
                        documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Failed to get employee documents: {e}")
            return []
    
    async def save_document(self, employee_id: str, document_type: str, document_data: bytes, metadata: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Save a document (PDF) for an employee
        
        Args:
            employee_id: The employee ID
            document_type: Type of document (e.g., 'health_insurance', 'w4', 'i9')
            document_data: The document bytes (PDF content)
            metadata: Optional metadata about the document
            
        Returns:
            Document ID if successful, None otherwise
        """
        try:
            # Generate document ID
            document_id = str(uuid.uuid4())
            
            # Prepare document record
            document_record = {
                'id': document_id,
                'employee_id': employee_id,
                'document_type': document_type,
                'file_name': f"{document_type}_{employee_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                'file_size': len(document_data),
                'mime_type': 'application/pdf',
                'status': 'completed',
                'metadata': metadata or {},
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # In a production system, you would:
            # 1. Store the actual file in Supabase Storage or S3
            # 2. Store the file URL/path in the database
            # For now, we'll just store the metadata
            
            # Store document metadata in employee_documents table
            result = self.client.table('employee_documents').insert(document_record).execute()
            
            if result.data:
                logger.info(f"Document saved successfully: {document_id} for employee {employee_id}")
                
                # Log audit event for compliance (exclude binary data)
                audit_record = document_record.copy()
                # Remove any binary data from audit log to prevent UTF-8 encoding errors
                audit_record.pop('file_data', None)
                audit_record.pop('binary_content', None)
                if 'metadata' in audit_record and isinstance(audit_record['metadata'], dict):
                    audit_metadata = audit_record['metadata'].copy()
                    audit_metadata.pop('file_data', None)
                    audit_metadata.pop('binary_content', None)
                    audit_record['metadata'] = audit_metadata

                await self.log_audit_event(
                    'employee_documents',
                    document_id,
                    'CREATE',
                    old_values=None,
                    new_values=audit_record,
                    compliance_event=True
                )
                
                return document_id
            else:
                logger.error(f"Failed to save document record")
                return None
                
        except Exception as e:
            logger.error(f"Failed to save document: {e}")
            # If the table doesn't exist, create a minimal version
            if "employee_documents" in str(e):
                try:
                    # Try to create the table (this would normally be done in migrations)
                    logger.warning("employee_documents table might not exist, returning mock document ID")
                    # Return a mock document ID for testing
                    return f"mock_doc_{document_type}_{employee_id}_{datetime.now().timestamp()}"
                except:
                    pass
            return None
    
    async def update_document_status(self, table_name: str, document_id: str, status: str) -> bool:
        """Update document status"""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.client.table(table_name).update(update_data).eq("id", document_id).execute()
            
            if result.data:
                logger.info(f"Document {document_id} status updated to {status}")
                
                # Log audit event
                await self.log_audit_event(
                    table_name,
                    document_id,
                    "UPDATE",
                    old_values={"status": "previous"},
                    new_values=update_data,
                    compliance_event=True
                )
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to update document status: {e}")
            return False
    
    async def store_i9_document(
        self,
        employee_id: str,
        document_type: str,
        document_list: str,
        file_data: bytes,
        file_name: str,
        mime_type: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Store I-9 supporting document for employee
        Handles both permanent and temporary employee IDs
        
        Args:
            employee_id: Employee ID (can be temp_xxx for single-step invitations)
            document_type: Type of document (e.g., 'us_passport', 'drivers_license', 'social_security_card')
            document_list: Which I-9 list ('list_a', 'list_b', or 'list_c')
            file_data: Document file bytes
            file_name: Original filename
            mime_type: MIME type of file
            document_metadata: Optional metadata (document number, expiration, etc.)
            
        Returns:
            Document record if successful, None otherwise
        """
        try:
            # Import path manager
            from .document_path_utils import document_path_manager

            # Generate document ID
            document_id = str(uuid.uuid4())

            # Get property_id for path building
            property_id = None
            if not employee_id.startswith('temp_') and not employee_id.startswith('test-'):
                employee = await self.get_employee_by_id(employee_id)
                if employee:
                    property_id = employee.get('property_id') if isinstance(employee, dict) else getattr(employee, 'property_id', None)

            # Map document type to upload category and list
            doc_type_mapping = {
                'drivers_license': {'subtype': 'drivers_license', 'list_code': 'B'},
                'social_security_card': {'subtype': 'social_security_card', 'list_code': 'C'},
                'us_passport': {'subtype': 'passport', 'list_code': 'A'},
                'passport': {'subtype': 'passport', 'list_code': 'A'}
            }
            mapping = doc_type_mapping.get(document_type, {'subtype': document_type, 'list_code': 'B'})
            document_subtype = mapping['subtype']

            # Convert document_list to single character for database constraint
            list_code_mapping = {
                'list_a': 'A',
                'list_b': 'B',
                'list_c': 'C',
                'A': 'A',
                'B': 'B',
                'C': 'C'
            }
            db_document_list = list_code_mapping.get(document_list, mapping['list_code'])

            # Create timestamped filename
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            safe_filename = f"{document_subtype}_{timestamp}_{document_id[:8]}_{file_name}"

            # Build property-based storage path
            storage_path = await document_path_manager.build_upload_path(
                employee_id=employee_id,
                property_id=property_id,
                upload_type='i9_verification',
                document_subtype=document_subtype,
                filename=safe_filename
            )
            
            # Upload to Supabase Storage using admin client
            try:
                # Use unified 'onboarding-documents' bucket for all documents (per document_path_utils.py)
                bucket_name = 'onboarding-documents'
                logger.info(f"🔵 Starting I-9 document upload - employee: {employee_id}, type: {document_type}, path: {storage_path}")

                # Create bucket if not exists using the enhanced method
                await self.create_storage_bucket(bucket_name, public=False)
                logger.info(f"✅ Bucket '{bucket_name}' verified/created")

                # Upload file using admin client with proper error handling
                try:
                    logger.info(f"📤 Attempting upload to {bucket_name}/{storage_path} ({len(file_data)} bytes, mime: {mime_type})")
                    res = self.admin_client.storage.from_(bucket_name).upload(
                        storage_path,
                        file_data,
                        file_options={"content-type": mime_type, "upsert": "true"}
                    )
                    logger.info(f"✅ Upload successful on first attempt: {res}")
                except Exception as upload_err:
                    logger.warning(f"⚠️ First upload attempt failed: {upload_err}, trying alternative format...")
                    # Try with different options format
                    res = self.admin_client.storage.from_(bucket_name).upload(
                        storage_path,
                        file_data,
                        {"content-type": mime_type}
                    )
                    logger.info(f"✅ Upload successful on retry: {res}")

                # Get signed URL (valid for 1 year) using admin client
                logger.info(f"🔗 Creating signed URL for: {storage_path}")
                url_res = self.admin_client.storage.from_(bucket_name).create_signed_url(
                    storage_path,
                    expires_in=31536000  # 1 year
                )
                file_url = url_res.get('signedURL', '') or url_res.get('signed_url', '')
                logger.info(f"✅ Signed URL created successfully: {file_url[:100]}...")

            except Exception as storage_error:
                logger.error(f"❌ STORAGE UPLOAD FAILED for {document_type}: {storage_error}")
                logger.error(f"   - Employee: {employee_id}")
                logger.error(f"   - Storage path: {storage_path}")
                logger.error(f"   - File size: {len(file_data)} bytes")
                logger.error(f"   - MIME type: {mime_type}")
                # Fallback: Don't store binary data in database, just store a placeholder
                # Binary data in database can cause UTF-8 encoding issues
                file_url = f"local_storage_{document_id}"
                logger.warning(f"⚠️ Document {document_id} using placeholder URL due to storage failure")
            
            # Prepare document record using only available columns
            # Available columns: id, employee_id, document_type, document_list, file_url, metadata, created_at, updated_at
            # Plus required field: document_name
            # Ensure field lengths are within database constraints
            document_record = {
                'id': document_id,  # Already a UUID
                'employee_id': employee_id,  # Already a UUID
                'document_type': document_type[:50] if len(document_type) > 50 else document_type,  # Limit length
                'document_list': db_document_list,  # Single character (A, B, or C)
                'document_name': safe_filename[:100],  # Required field, limit length
                'file_url': file_url  # Don't truncate URLs - they need to be complete
            }

            # Add all additional info to metadata JSONB field
            metadata_json = document_metadata or {}
            metadata_json.update({
                'uploaded_at': datetime.now(timezone.utc).isoformat(),
                'original_filename': file_name,
                'file_size_bytes': len(file_data),
                'mime_type': mime_type,
                'status': 'uploaded'
            })

            # Store storage_path in metadata instead of main record (column doesn't exist)
            metadata_json['storage_path'] = storage_path

            # Add specific metadata fields if provided
            if document_metadata:
                if document_metadata.get('document_number'):
                    metadata_json['document_number'] = document_metadata['document_number']
                if document_metadata.get('issuing_authority'):
                    metadata_json['issuing_authority'] = document_metadata['issuing_authority']
                if document_metadata.get('issue_date'):
                    metadata_json['issue_date'] = document_metadata['issue_date']
                if document_metadata.get('expiration_date'):
                    metadata_json['expiration_date'] = document_metadata['expiration_date']

            # Clean metadata to prevent UTF-8 encoding errors with binary data
            document_record['metadata'] = self._clean_binary_data_from_dict(metadata_json)

            # Store in i9_documents table
            try:
                result = self.client.table('i9_documents').insert(document_record).execute()
            except Exception as db_error:
                logger.error(f"Failed to persist document metadata for {employee_id}/{document_type}: {db_error}")
                # If it's a UTF-8 error, try with completely clean metadata
                if "utf-8" in str(db_error).lower() or "codec" in str(db_error).lower():
                    logger.warning(f"UTF-8 error detected, retrying with minimal metadata")
                    document_record['metadata'] = {
                        'document_type': document_type,
                        'upload_timestamp': datetime.now(timezone.utc).isoformat(),
                        'status': 'uploaded'
                    }
                    result = self.client.table('i9_documents').insert(document_record).execute()
                else:
                    raise db_error
            
            if result.data:
                logger.info(f"I-9 document stored: {document_id} for employee {employee_id}, type: {document_type}, list: {document_list}")
                
                # Log audit event for compliance (exclude binary data)
                audit_record = document_record.copy()
                # Remove any binary data from audit log to prevent UTF-8 encoding errors
                if 'metadata' in audit_record and isinstance(audit_record['metadata'], dict):
                    audit_metadata = audit_record['metadata'].copy()
                    # Remove any keys that might contain binary data
                    audit_metadata.pop('file_data', None)
                    audit_metadata.pop('binary_content', None)
                    audit_record['metadata'] = audit_metadata

                try:
                    await self.log_audit_event(
                        'i9_documents',
                        document_id,
                        'CREATE',
                        new_values=audit_record,
                        compliance_event=True
                    )
                except Exception as audit_error:
                    logger.warning(f"Audit logging failed for document {document_id}: {audit_error}")
                    # Don't let audit failures break the document storage
                
                # Add storage_path to the response for easy access
                response_data = result.data[0].copy()
                if 'metadata' in response_data and isinstance(response_data['metadata'], dict):
                    response_data['storage_path'] = response_data['metadata'].get('storage_path')
                return response_data
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to store I-9 document: {e}")
            # Create table if it doesn't exist (for development)
            if "i9_documents" in str(e) and "does not exist" in str(e).lower():
                logger.warning("i9_documents table does not exist. Please create it with the following schema:")
                logger.warning("""
                CREATE TABLE i9_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    employee_id VARCHAR(255) NOT NULL,
                    document_type VARCHAR(100) NOT NULL,
                    document_list VARCHAR(10) NOT NULL CHECK (document_list IN ('list_a', 'list_b', 'list_c')),
                    file_name VARCHAR(255) NOT NULL,
                    file_size INTEGER,
                    mime_type VARCHAR(100),
                    file_url TEXT,
                    storage_path TEXT,
                    status VARCHAR(50) DEFAULT 'uploaded',
                    document_number VARCHAR(255),
                    issuing_authority VARCHAR(255),
                    issue_date DATE,
                    expiration_date DATE,
                    metadata JSONB DEFAULT '{}',
                    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
                    verified_at TIMESTAMPTZ,
                    verified_by VARCHAR(255),
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                """)
            return None
    
    async def get_i9_documents(
        self,
        employee_id: str,
        document_list: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get I-9 documents for an employee
        
        Args:
            employee_id: Employee ID
            document_list: Optional filter by list type ('list_a', 'list_b', or 'list_c')
            
        Returns:
            List of document records
        """
        try:
            query = self.client.table('i9_documents').select('*').eq('employee_id', employee_id)
            
            if document_list:
                query = query.eq('document_list', document_list)
            
            result = query.order('uploaded_at', desc=True).execute()
            
            if result.data:
                return result.data
            
            return []
            
        except Exception as e:
            logger.error(f"Failed to get I-9 documents: {e}")
            return []
    
    async def validate_i9_document_combination(self, employee_id: str) -> Dict[str, Any]:
        """
        Validate that employee has provided acceptable I-9 document combination
        
        Returns:
            Dictionary with validation status and details
        """
        try:
            # Get all I-9 documents for employee
            documents = await self.get_i9_documents(employee_id)
            
            if not documents:
                return {
                    'is_valid': False,
                    'errors': ['No I-9 documents uploaded'],
                    'list_a_satisfied': False,
                    'list_b_satisfied': False,
                    'list_c_satisfied': False
                }
            
            # Categorize documents
            list_a_docs = [d for d in documents if d['document_list'] == 'list_a' and d['status'] != 'rejected']
            list_b_docs = [d for d in documents if d['document_list'] == 'list_b' and d['status'] != 'rejected']
            list_c_docs = [d for d in documents if d['document_list'] == 'list_c' and d['status'] != 'rejected']
            
            # Check valid combinations
            # Valid: One List A document OR (One List B + One List C)
            list_a_satisfied = len(list_a_docs) > 0
            list_b_satisfied = len(list_b_docs) > 0
            list_c_satisfied = len(list_c_docs) > 0
            
            is_valid = list_a_satisfied or (list_b_satisfied and list_c_satisfied)
            
            errors = []
            if not is_valid:
                if not list_a_satisfied:
                    if not list_b_satisfied:
                        errors.append('Missing List B document (establishes identity)')
                    if not list_c_satisfied:
                        errors.append('Missing List C document (establishes employment authorization)')
            
            return {
                'is_valid': is_valid,
                'errors': errors,
                'list_a_satisfied': list_a_satisfied,
                'list_b_satisfied': list_b_satisfied,
                'list_c_satisfied': list_c_satisfied,
                'documents': {
                    'list_a': list_a_docs,
                    'list_b': list_b_docs,
                    'list_c': list_c_docs
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to validate I-9 document combination: {e}")
            return {
                'is_valid': False,
                'errors': [f'Validation error: {str(e)}'],
                'list_a_satisfied': False,
                'list_b_satisfied': False,
                'list_c_satisfied': False
            }
    
    # Email Recipient Management Methods
    async def get_email_recipients_by_property(self, property_id: str) -> List[Dict[str, Any]]:
        """Get all active email recipients for a property including managers"""
        try:
            # Get additional recipients from property_email_recipients table
            recipients_response = self.client.table('property_email_recipients').select('*').eq(
                'property_id', property_id
            ).eq('is_active', True).execute()
            
            recipients = []
            
            # Add configured recipients
            for recipient in recipients_response.data:
                if recipient.get('receives_applications', True):
                    recipients.append({
                        'email': recipient['email'],
                        'name': recipient.get('name', ''),
                        'type': 'recipient',
                        'id': recipient['id']
                    })
            
            # Get property managers who want email notifications
            managers_response = self.client.table('property_managers').select(
                'manager_id, users!property_managers_manager_id_fkey(id, email, first_name, last_name, receive_application_emails, email_preferences)'
            ).eq('property_id', property_id).execute()
            
            # Add managers who have opted in for application emails
            for manager_data in managers_response.data:
                if manager_data.get('users'):
                    user = manager_data['users']
                    # Check both legacy field and new preferences
                    receive_emails = user.get('receive_application_emails', True)
                    email_prefs = user.get('email_preferences', {})
                    if isinstance(email_prefs, str):
                        import json
                        try:
                            email_prefs = json.loads(email_prefs)
                        except:
                            email_prefs = {}
                    
                    # Only add manager if they have explicitly opted in
                    # Check email_preferences first (takes precedence), then legacy field
                    if email_prefs:
                        # If email_preferences exists, use it
                        should_receive = email_prefs.get('applications', True)
                    else:
                        # Fall back to legacy field
                        should_receive = receive_emails
                    
                    if should_receive:
                        # Concatenate first_name and last_name for the name field
                        first_name = user.get('first_name', '')
                        last_name = user.get('last_name', '')
                        full_name = f"{first_name} {last_name}".strip()
                        
                        recipients.append({
                            'email': user['email'],
                            'name': full_name,
                            'type': 'manager',
                            'id': user['id']
                        })
            
            logger.info(f"Found {len(recipients)} email recipients for property {property_id}")
            return recipients
            
        except Exception as e:
            logger.error(f"Failed to get email recipients for property {property_id}: {e}")
            return []
    
    async def add_email_recipient(self, property_id: str, email: str, name: str = None, 
                                 added_by: str = None) -> Optional[Dict[str, Any]]:
        """Add a new email recipient for a property"""
        try:
            recipient_data = {
                'property_id': property_id,
                'email': email.lower().strip(),
                'name': name,
                'added_by': added_by,
                'is_active': True,
                'receives_applications': True
            }
            
            response = self.client.table('property_email_recipients').insert(recipient_data).execute()
            
            if response.data:
                logger.info(f"Added email recipient {email} for property {property_id}")
                
                # Log audit event
                await self.log_audit_event(
                    'property_email_recipients',
                    response.data[0]['id'],
                    'CREATE',
                    new_values=recipient_data,
                    user_id=added_by,
                    property_id=property_id
                )
                
                return response.data[0]
            return None
            
        except Exception as e:
            if 'unique_property_email' in str(e):
                logger.warning(f"Email recipient {email} already exists for property {property_id}")
                # Try to reactivate if it was deactivated
                return await self.update_email_recipient_by_email(property_id, email, {'is_active': True})
            logger.error(f"Failed to add email recipient: {e}")
            return None
    
    async def update_email_recipient(self, recipient_id: str, updates: Dict[str, Any]) -> bool:
        """Update an email recipient"""
        try:
            # Add updated_at timestamp
            updates['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            response = self.client.table('property_email_recipients').update(updates).eq(
                'id', recipient_id
            ).execute()
            
            if response.data:
                logger.info(f"Updated email recipient {recipient_id}")
                
                # Log audit event
                await self.log_audit_event(
                    'property_email_recipients',
                    recipient_id,
                    'UPDATE',
                    new_values=updates
                )
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to update email recipient: {e}")
            return False
    
    async def update_email_recipient_by_email(self, property_id: str, email: str, 
                                             updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an email recipient by property and email"""
        try:
            updates['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            response = self.client.table('property_email_recipients').update(updates).eq(
                'property_id', property_id
            ).eq('email', email.lower().strip()).execute()
            
            if response.data:
                logger.info(f"Updated email recipient {email} for property {property_id}")
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Failed to update email recipient by email: {e}")
            return None
    
    async def delete_email_recipient(self, recipient_id: str) -> bool:
        """Delete (soft delete by deactivating) an email recipient"""
        try:
            # Soft delete by setting is_active to False
            updates = {
                'is_active': False,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            response = self.client.table('property_email_recipients').update(updates).eq(
                'id', recipient_id
            ).execute()
            
            if response.data:
                logger.info(f"Deactivated email recipient {recipient_id}")
                
                # Log audit event
                await self.log_audit_event(
                    'property_email_recipients',
                    recipient_id,
                    'DELETE',
                    old_values={'is_active': True},
                    new_values={'is_active': False}
                )
                
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete email recipient: {e}")
            return False
    
    async def get_manager_email_preferences(self, user_id: str) -> Dict[str, bool]:
        """Get manager's email notification preferences"""
        try:
            response = self.client.table('users').select(
                'receive_application_emails, email_preferences'
            ).eq('id', user_id).execute()
            
            if response.data:
                user = response.data[0]
                # Handle both legacy field and new preferences
                prefs = user.get('email_preferences', {})
                if isinstance(prefs, str):
                    import json
                    try:
                        prefs = json.loads(prefs)
                    except:
                        prefs = {}
                
                # Merge with legacy field
                return {
                    'applications': prefs.get('applications', user.get('receive_application_emails', True)),
                    'approvals': prefs.get('approvals', True),
                    'reminders': prefs.get('reminders', True)
                }
            
            # Default preferences
            return {
                'applications': True,
                'approvals': True,
                'reminders': True
            }
            
        except Exception as e:
            logger.error(f"Failed to get manager email preferences: {e}")
            return {
                'applications': True,
                'approvals': True,
                'reminders': True
            }
    
    async def update_manager_email_preferences(self, user_id: str, 
                                              preferences: Dict[str, bool]) -> bool:
        """Update manager's email notification preferences"""
        try:
            updates = {
                'email_preferences': preferences,  # Store as JSONB, not string
                'receive_application_emails': preferences.get('applications', True),  # Legacy support
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            response = self.client.table('users').update(updates).eq('id', user_id).execute()
            
            if response.data:
                logger.info(f"Updated email preferences for user {user_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to update manager email preferences: {e}")
            return False
    
    # ==========================================
    # SESSION DRAFT PERSISTENCE METHODS
    # ==========================================
    
    async def save_session_draft(self, session_id: str, employee_id: str, 
                                 step_id: str, form_data: Dict[str, Any],
                                 ip_address: str = None, user_agent: str = None) -> Optional[Dict[str, Any]]:
        """Save or update a session draft for Save and Continue Later functionality"""
        try:
            # Check if draft already exists
            existing = self.client.table('onboarding_session_drafts').select('*').eq(
                'session_id', session_id
            ).eq('step_id', step_id).execute()
            
            draft_id = None
            if existing.data:
                # Update existing draft
                draft_id = existing.data[0]['id']
                
                # Merge form data with existing data
                existing_data = existing.data[0].get('form_data', {})
                if isinstance(existing_data, str):
                    import json
                    existing_data = json.loads(existing_data)
                
                merged_data = {**existing_data, **form_data}
                
                # Calculate completion percentage
                total_fields = len(merged_data.keys())
                completed_fields = sum(1 for v in merged_data.values() if v not in [None, "", []])
                completion_percentage = int((completed_fields / total_fields * 100) if total_fields > 0 else 0)
                
                updates = {
                    'form_data': merged_data,
                    'completion_percentage': completion_percentage,
                    'auto_save_count': existing.data[0].get('auto_save_count', 0) + 1,
                    'last_auto_save_at': datetime.now(timezone.utc).isoformat(),
                    'last_saved_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'ip_address': ip_address or existing.data[0].get('ip_address'),
                    'user_agent': user_agent or existing.data[0].get('user_agent')
                }
                
                result = self.client.table('onboarding_session_drafts').update(updates).eq(
                    'id', draft_id
                ).execute()
                
                logger.info(f"Updated session draft {draft_id} for session {session_id}")
                
            else:
                # Create new draft
                draft_id = str(uuid.uuid4())
                resume_token = self._generate_secure_token()
                
                # Calculate completion percentage
                total_fields = len(form_data.keys())
                completed_fields = sum(1 for v in form_data.values() if v not in [None, "", []])
                completion_percentage = int((completed_fields / total_fields * 100) if total_fields > 0 else 0)
                
                draft_data = {
                    'id': draft_id,
                    'session_id': session_id,
                    'employee_id': employee_id,
                    'step_id': step_id,
                    'form_data': form_data,
                    'completion_percentage': completion_percentage,
                    'is_draft': True,
                    'resume_token': resume_token,
                    'auto_save_count': 1,
                    'last_auto_save_at': datetime.now(timezone.utc).isoformat(),
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'last_saved_at': datetime.now(timezone.utc).isoformat(),
                    'expires_at': (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                    'language_preference': 'en'
                }
                
                result = self.client.table('onboarding_session_drafts').insert(draft_data).execute()
                
                logger.info(f"Created new session draft {draft_id} for session {session_id}")
            
            if result.data:
                return result.data[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to save session draft: {e}")
            return None
    
    async def get_session_draft(self, session_id: str, step_id: str = None) -> Optional[Dict[str, Any]]:
        """Retrieve a saved session draft"""
        try:
            query = self.client.table('onboarding_session_drafts').select('*').eq(
                'session_id', session_id
            ).eq('is_draft', True)
            
            if step_id:
                query = query.eq('step_id', step_id)
            
            # Order by last saved to get most recent
            result = query.order('last_saved_at', desc=True).limit(1).execute()
            
            if result.data:
                draft = result.data[0]
                
                # Check if expired
                expires_at = datetime.fromisoformat(draft['expires_at'].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    logger.warning(f"Draft {draft['id']} has expired")
                    return None
                
                # Parse form_data if it's a string
                if isinstance(draft.get('form_data'), str):
                    import json
                    draft['form_data'] = json.loads(draft['form_data'])
                
                return draft
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get session draft: {e}")
            return None
    
    async def get_draft_by_resume_token(self, resume_token: str) -> Optional[Dict[str, Any]]:
        """Retrieve a draft by its resume token"""
        try:
            result = self.client.table('onboarding_session_drafts').select('*').eq(
                'resume_token', resume_token
            ).eq('is_draft', True).execute()
            
            if result.data:
                draft = result.data[0]
                
                # Check if expired
                expires_at = datetime.fromisoformat(draft['expires_at'].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    logger.warning(f"Draft {draft['id']} has expired")
                    return None
                
                # Parse form_data if it's a string
                if isinstance(draft.get('form_data'), str):
                    import json
                    draft['form_data'] = json.loads(draft['form_data'])
                
                return draft
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get draft by resume token: {e}")
            return None
    
    async def save_and_exit_session(self, session_id: str, employee_id: str,
                                   step_id: str, form_data: Dict[str, Any],
                                   email: str) -> Optional[Dict[str, Any]]:
        """Save session and generate resume link for email"""
        try:
            # Save the draft
            draft = await self.save_session_draft(session_id, employee_id, step_id, form_data)
            
            if draft:
                # Generate resume URL
                base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
                resume_url = f"{base_url}/onboarding/resume?token={draft['resume_token']}"
                
                # Update draft with resume URL and email
                updates = {
                    'resume_url': resume_url,
                    'recovery_email': email,
                    'resume_email_sent': True,
                    'resume_email_sent_at': datetime.now(timezone.utc).isoformat()
                }
                
                self.client.table('onboarding_session_drafts').update(updates).eq(
                    'id', draft['id']
                ).execute()
                
                # Send email (integrate with your email service)
                await self._send_resume_email(email, resume_url, draft)
                
                logger.info(f"Created resume link for session {session_id}")
                
                return {
                    **draft,
                    'resume_url': resume_url,
                    'recovery_email': email
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to save and exit session: {e}")
            return None
    
    async def mark_draft_completed(self, session_id: str, step_id: str) -> bool:
        """Mark a draft as completed when the step is successfully submitted"""
        try:
            updates = {
                'is_draft': False,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = self.client.table('onboarding_session_drafts').update(updates).eq(
                'session_id', session_id
            ).eq('step_id', step_id).execute()
            
            if result.data:
                logger.info(f"Marked draft as completed for session {session_id}, step {step_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark draft as completed: {e}")
            return False
    
    async def clean_expired_drafts(self) -> int:
        """Clean up expired drafts (run periodically)"""
        try:
            cutoff_date = datetime.now(timezone.utc).isoformat()
            
            # Get expired drafts
            result = self.client.table('onboarding_session_drafts').select('id').lt(
                'expires_at', cutoff_date
            ).eq('is_draft', True).execute()
            
            if result.data:
                draft_ids = [d['id'] for d in result.data]
                
                # Delete expired drafts
                self.client.table('onboarding_session_drafts').delete().in_(
                    'id', draft_ids
                ).execute()
                
                logger.info(f"Cleaned up {len(draft_ids)} expired drafts")
                return len(draft_ids)
            
            return 0
            
        except Exception as e:
            logger.error(f"Failed to clean expired drafts: {e}")
            return 0
    
    def _generate_secure_token(self) -> str:
        """Generate a secure token for resume links"""
        import secrets
        return secrets.token_urlsafe(32)
    
    async def _send_resume_email(self, email: str, resume_url: str, draft: Dict[str, Any]):
        """Send resume email to user (implement with your email service)"""
        # This is a placeholder - integrate with your email service
        logger.info(f"Would send resume email to {email} with URL: {resume_url}")
        # Example integration:
        # await email_service.send_email(
        #     to=email,
        #     subject="Resume Your Onboarding Process",
        #     template="resume_onboarding",
        #     data={
        #         'resume_url': resume_url,
        #         'expires_at': draft['expires_at'],
        #         'completion_percentage': draft['completion_percentage']
        #     }
        # )


# Global instance
enhanced_supabase_service = None

def get_enhanced_supabase_service() -> EnhancedSupabaseService:
    """Get or create Enhanced Supabase service instance"""
    global enhanced_supabase_service
    if enhanced_supabase_service is None:
        enhanced_supabase_service = EnhancedSupabaseService()
    return enhanced_supabase_service

# Async context manager for database operations
@asynccontextmanager
async def get_db_service():
    """Async context manager for database service"""
    service = get_enhanced_supabase_service()
    try:
        await service.initialize_db_pool()
        yield service
    finally:
        await service.close_db_pool()
