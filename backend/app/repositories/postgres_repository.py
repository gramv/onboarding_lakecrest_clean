#!/usr/bin/env python3
"""
PostgreSQL Repository Implementation

Direct PostgreSQL implementation using asyncpg for AWS RDS.
This is the clean, production-ready implementation following best practices.

Benefits:
- Direct SQL queries (no REST API overhead)
- Type-safe with asyncpg
- Connection pooling built-in
- Transaction support
- Better performance than REST API
"""

import logging
import json
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone, date
import asyncpg
import uuid

# Import base repository
from .base_repository import DatabaseRepository

# Import models
from ..models import (
    User, Property, JobApplication, ApplicationStatus, UserRole,
    OnboardingSession, OnboardingStatus, OnboardingStep,
    AuditLog, Notification, AnalyticsEvent
)
from ..models_enhanced import Employee, OnboardingPhase

logger = logging.getLogger(__name__)


class PostgresRepository(DatabaseRepository):
    """
    PostgreSQL implementation of DatabaseRepository using asyncpg.
    
    This implementation uses direct SQL queries for maximum performance and control.
    All methods are async and use connection pooling.
    """
    
    def __init__(self, db_pool: asyncpg.Pool):
        """
        Initialize PostgreSQL repository with connection pool.
        
        Args:
            db_pool: asyncpg connection pool
        """
        self.db_pool = db_pool
        logger.info("✅ PostgreSQL Repository initialized")
    
    # ============================================================================
    # HELPER METHODS
    # ============================================================================
    
    def _row_to_dict(self, row: asyncpg.Record) -> Dict[str, Any]:
        """Convert asyncpg Record to dictionary with UUID->string conversion"""
        if not row:
            return {}
        
        result = dict(row)
        # Convert UUIDs to strings for JSON serialization
        for key, value in result.items():
            if isinstance(value, uuid.UUID):
                result[key] = str(value)
        return result
    
    def _row_to_user(self, row: asyncpg.Record) -> User:
        """Convert database row to User model"""
        return User(
            id=str(row['id']),
            email=row['email'],
            first_name=row.get('first_name'),
            last_name=row.get('last_name'),
            role=UserRole(row['role']),
            is_active=row.get('is_active', True),
            created_at=row.get('created_at')
        )
    
    def _row_to_property(self, row: asyncpg.Record) -> Property:
        """Convert database row to Property model"""
        return Property(
            id=str(row['id']),
            name=row['name'],
            address=row.get('address', ''),
            city=row.get('city', ''),
            state=row.get('state', ''),
            zip_code=row.get('zip_code', ''),
            phone=row.get('phone', ''),
            is_active=row.get('is_active', True),
            created_at=row.get('created_at')
        )
    
    def _row_to_employee(self, row: asyncpg.Record) -> Employee:
        """Convert database row to Employee model"""
        return Employee(
            id=str(row['id']),
            user_id=str(row.get('user_id', row['id'])),
            property_id=str(row['property_id']),
            manager_id=str(row['manager_id']) if row.get('manager_id') else None,
            department=row.get('department', 'General'),
            position=row.get('position', 'Staff'),
            hire_date=row['hire_date'] if isinstance(row.get('hire_date'), date) else datetime.fromisoformat(str(row['hire_date'])).date() if row.get('hire_date') else datetime.now(timezone.utc).date(),
            pay_rate=row.get('pay_rate', 0.0),
            employment_type=row.get('employment_type', 'full_time'),
            employment_status=row.get('employment_status', 'active'),
            personal_info=row.get('personal_info', {}),
            onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
            onboarding_phase=OnboardingPhase(row.get('onboarding_phase', 'employee')) if row.get('onboarding_phase') else OnboardingPhase.EMPLOYEE,
            created_at=row.get('created_at'),
            updated_at=row.get('updated_at')
        )
    
    def _row_to_application(self, row: asyncpg.Record) -> JobApplication:
        """Convert database row to JobApplication model"""
        return JobApplication(
            id=str(row['id']),
            property_id=str(row['property_id']),
            position=row['position'],
            status=ApplicationStatus(row.get('status', 'pending')),
            applicant_data=row.get('applicant_data', {}),
            created_at=row.get('created_at'),
            updated_at=row.get('updated_at')
        )
    
    def _row_to_session(self, row: asyncpg.Record) -> OnboardingSession:
        """Convert database row to OnboardingSession model"""
        return OnboardingSession(
            id=str(row['id']),
            employee_id=str(row['employee_id']),
            token=row['token'],
            status=row.get('status', 'active'),
            phase=row.get('phase', 'employee'),
            current_step=row.get('current_step'),
            completed_steps=row.get('completed_steps', []),
            created_at=row.get('created_at'),
            expires_at=row.get('expires_at')
        )
    
    # ============================================================================
    # USER OPERATIONS
    # ============================================================================
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM users WHERE id = $1",
                    user_id
                )
                return self._row_to_user(row) if row else None
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM users WHERE email = $1",
                    email
                )
                return self._row_to_user(row) if row else None
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def get_all_users(self) -> List[User]:
        """Get all users"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM users ORDER BY created_at DESC")
                return [self._row_to_user(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []
    
    async def get_users_by_role(self, role: UserRole) -> List[User]:
        """Get all users with specific role"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC",
                    role.value
                )
                return [self._row_to_user(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting users by role {role}: {e}")
            return []
    
    async def create_user(self, user_data: Dict[str, Any]) -> User:
        """Create new user"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO users (email, first_name, last_name, role, is_active, password_hash)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    user_data['email'],
                    user_data.get('first_name'),
                    user_data.get('last_name'),
                    user_data.get('role', 'employee'),
                    user_data.get('is_active', True),
                    user_data.get('password_hash')
                )
                return self._row_to_user(row)
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> User:
        """Update existing user"""
        try:
            # Build dynamic UPDATE query based on provided fields
            fields = []
            values = []
            param_count = 1
            
            for key, value in user_data.items():
                if key not in ['id', 'created_at']:  # Skip immutable fields
                    fields.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1
            
            if not fields:
                # No fields to update, just return existing user
                return await self.get_user_by_id(user_id)
            
            values.append(user_id)  # Add user_id as last parameter
            
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE users
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${param_count}
                    RETURNING *
                    """,
                    *values
                )
                return self._row_to_user(row) if row else None
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            raise
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user (soft delete)"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    user_id
                )
                return True
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {e}")
            return False
    
    # ============================================================================
    # PROPERTY OPERATIONS
    # ============================================================================
    
    async def get_property_by_id(self, property_id: str) -> Optional[Property]:
        """Get property by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM properties WHERE id = $1",
                    property_id
                )
                return self._row_to_property(row) if row else None
        except Exception as e:
            logger.error(f"Error getting property by ID {property_id}: {e}")
            return None
    
    async def get_all_properties(self) -> List[Property]:
        """Get all properties"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM properties ORDER BY name")
                return [self._row_to_property(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting all properties: {e}")
            return []

    async def get_properties_by_manager(self, manager_id: str) -> List[Property]:
        """Get all properties managed by a specific manager"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.* FROM properties p
                    INNER JOIN property_managers pm ON p.id = pm.property_id
                    WHERE pm.manager_id = $1
                    ORDER BY p.name
                    """,
                    manager_id
                )
                return [self._row_to_property(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting properties by manager {manager_id}: {e}")
            return []

    async def create_property(self, property_data: Dict[str, Any]) -> Property:
        """Create new property"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO properties (name, address, city, state, zip_code, phone, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                    """,
                    property_data['name'],
                    property_data.get('address', ''),
                    property_data.get('city', ''),
                    property_data.get('state', ''),
                    property_data.get('zip_code', ''),
                    property_data.get('phone', ''),
                    property_data.get('is_active', True)
                )
                return self._row_to_property(row)
        except Exception as e:
            logger.error(f"Error creating property: {e}")
            raise

    async def update_property(self, property_id: str, property_data: Dict[str, Any]) -> Property:
        """Update existing property"""
        try:
            fields = []
            values = []
            param_count = 1

            for key, value in property_data.items():
                if key not in ['id', 'created_at']:
                    fields.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1

            if not fields:
                return await self.get_property_by_id(property_id)

            values.append(property_id)

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE properties
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${param_count}
                    RETURNING *
                    """,
                    *values
                )
                return self._row_to_property(row) if row else None
        except Exception as e:
            logger.error(f"Error updating property {property_id}: {e}")
            raise

    async def delete_property(self, property_id: str) -> bool:
        """Delete property"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM properties WHERE id = $1",
                    property_id
                )
                return True
        except Exception as e:
            logger.error(f"Error deleting property {property_id}: {e}")
            return False

    async def get_property_managers(self, property_id: str) -> List[User]:
        """Get all managers assigned to a property"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT u.* FROM users u
                    INNER JOIN property_managers pm ON u.id = pm.manager_id
                    WHERE pm.property_id = $1
                    ORDER BY u.last_name, u.first_name
                    """,
                    property_id
                )
                return [self._row_to_user(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting property managers for {property_id}: {e}")
            return []

    async def assign_manager_to_property(self, property_id: str, manager_id: str) -> bool:
        """Assign a manager to a property"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO property_managers (property_id, manager_id)
                    VALUES ($1, $2)
                    ON CONFLICT (property_id, manager_id) DO NOTHING
                    """,
                    property_id,
                    manager_id
                )
                return True
        except Exception as e:
            logger.error(f"Error assigning manager {manager_id} to property {property_id}: {e}")
            return False

    async def remove_manager_from_property(self, property_id: str, manager_id: str) -> bool:
        """Remove a manager from a property"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM property_managers WHERE property_id = $1 AND manager_id = $2",
                    property_id,
                    manager_id
                )
                return True
        except Exception as e:
            logger.error(f"Error removing manager {manager_id} from property {property_id}: {e}")
            return False

    async def get_property_stats(self, property_id: str) -> Dict[str, Any]:
        """Get statistics for a specific property - optimized single query"""
        try:
            async with self.db_pool.acquire() as conn:
                stats = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(DISTINCT pm.manager_id) as managers_count,
                        COUNT(DISTINCT CASE WHEN os.status = 'completed' THEN os.id END) as completed_count,
                        COUNT(DISTINCT CASE WHEN os.status = 'in_progress' THEN os.id END) as in_progress_count,
                        COUNT(DISTINCT CASE WHEN os.status = 'pending' THEN os.id END) as pending_count,
                        COUNT(DISTINCT os.id) as total_sessions
                    FROM properties p
                    LEFT JOIN property_managers pm ON p.id = pm.property_id
                    LEFT JOIN onboarding_sessions os ON p.id = os.property_id
                    WHERE p.id = $1
                    GROUP BY p.id
                    """,
                    property_id
                )

                if not stats:
                    return {
                        "managers_count": 0,
                        "completed_count": 0,
                        "in_progress_count": 0,
                        "pending_count": 0,
                        "total_sessions": 0
                    }

                return {
                    "managers_count": stats['managers_count'] or 0,
                    "completed_count": stats['completed_count'] or 0,
                    "in_progress_count": stats['in_progress_count'] or 0,
                    "pending_count": stats['pending_count'] or 0,
                    "total_sessions": stats['total_sessions'] or 0
                }
        except Exception as e:
            logger.error(f"Error getting property stats for {property_id}: {e}")
            return {
                "managers_count": 0,
                "completed_count": 0,
                "in_progress_count": 0,
                "pending_count": 0,
                "total_sessions": 0
            }

    async def get_qr_code(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get existing QR code for property"""
        try:
            async with self.db_pool.acquire() as conn:
                # Check if QR code exists
                existing = await conn.fetchrow(
                    "SELECT * FROM qr_codes WHERE property_id = $1",
                    property_id
                )

                if existing:
                    return {
                        "id": existing['id'],
                        "property_id": existing['property_id'],
                        "qr_code_url": existing['qr_code_url'],
                        "application_url": existing['application_url'],
                        "access_count": existing['access_count'],
                        "last_accessed_at": existing['last_accessed_at'],
                        "created_at": existing['created_at']
                    }

                return None
        except Exception as e:
            logger.error(f"Error getting QR code for property {property_id}: {e}")
            return None

    async def create_qr_code(self, property_id: str, qr_code_data: str, qr_code_url: str, application_url: str, width: int, height: int) -> Dict[str, Any]:
        """Create new QR code for property"""
        try:
            async with self.db_pool.acquire() as conn:
                # Insert into qr_codes table
                qr_id = await conn.fetchval(
                    """
                    INSERT INTO qr_codes (
                        property_id, qr_code_data, qr_code_url, application_url,
                        format, size_width, size_height, version, error_correction, access_count
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                    """,
                    property_id, qr_code_data, qr_code_url, application_url,
                    'PNG', width, height, 1, 'L', 0
                )

                # Also update properties table for backward compatibility
                await conn.execute(
                    "UPDATE properties SET qr_code_url = $1, updated_at = NOW() WHERE id = $2",
                    qr_code_url, property_id
                )

                return {
                    "id": qr_id,
                    "property_id": property_id,
                    "qr_code_url": qr_code_url,
                    "application_url": application_url,
                    "access_count": 0
                }
        except Exception as e:
            logger.error(f"Error creating QR code for property {property_id}: {e}")
            raise

    async def update_qr_code_access(self, qr_code_id: str) -> bool:
        """Update QR code access count and last accessed timestamp"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE qr_codes
                    SET access_count = access_count + 1,
                        last_accessed_at = NOW()
                    WHERE id = $1
                    """,
                    qr_code_id
                )
                return True
        except Exception as e:
            logger.error(f"Error updating QR code access for {qr_code_id}: {e}")
            return False

    # --- Manager CRUD Operations ---

    async def get_manager_by_id(self, manager_id: str) -> Optional[User]:
        """Get manager by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
                    FROM users
                    WHERE id = $1 AND role = 'manager'
                    """,
                    manager_id
                )

                if row:
                    return User(
                        id=str(row['id']),  # Convert UUID to string
                        email=row['email'],
                        first_name=row['first_name'],
                        last_name=row['last_name'],
                        role=UserRole(row['role']),
                        is_active=row['is_active'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                return None
        except Exception as e:
            logger.error(f"Error getting manager {manager_id}: {e}")
            raise

    async def update_manager(self, manager_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        """Update manager details"""
        try:
            # Build dynamic UPDATE query
            set_clauses = []
            values = []
            param_count = 1

            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1

            # Add updated_at
            set_clauses.append(f"updated_at = ${param_count}")
            values.append(datetime.now(timezone.utc))
            param_count += 1

            # Add manager_id for WHERE clause
            values.append(manager_id)

            query = f"""
                UPDATE users
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count} AND role = 'manager'
                RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at
            """

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(query, *values)

                if row:
                    return User(
                        id=str(row['id']),  # Convert UUID to string
                        email=row['email'],
                        first_name=row['first_name'],
                        last_name=row['last_name'],
                        role=UserRole(row['role']),
                        is_active=row['is_active'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                return None
        except Exception as e:
            logger.error(f"Error updating manager {manager_id}: {e}")
            raise

    async def delete_manager(self, manager_id: str) -> bool:
        """Soft delete manager (set is_active=False)"""
        try:
            async with self.db_pool.acquire() as conn:
                result = await conn.execute(
                    """
                    UPDATE users
                    SET is_active = FALSE,
                        updated_at = NOW()
                    WHERE id = $1 AND role = 'manager'
                    """,
                    manager_id
                )
                # Check if any row was updated
                return result.split()[-1] == '1'
        except Exception as e:
            logger.error(f"Error deleting manager {manager_id}: {e}")
            raise

    async def get_manager_properties(self, manager_id: str) -> List[Property]:
        """Get all properties assigned to a manager"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT p.id, p.name, p.address, p.city, p.state, p.zip_code,
                           p.phone, p.qr_code_url, p.created_at, p.updated_at
                    FROM properties p
                    INNER JOIN property_managers pm ON p.id = pm.property_id
                    WHERE pm.manager_id = $1
                    ORDER BY p.name
                    """,
                    manager_id
                )

                return [
                    Property(
                        id=str(row['id']),  # Convert UUID to string
                        name=row['name'],
                        address=row['address'],
                        city=row['city'],
                        state=row['state'],
                        zip_code=row['zip_code'],
                        phone=row['phone'],
                        qr_code_url=row['qr_code_url'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                    for row in rows
                ]
        except Exception as e:
            logger.error(f"Error getting properties for manager {manager_id}: {e}")
            raise

    # ============================================================================
    # EMPLOYEE OPERATIONS
    # ============================================================================

    async def get_employee_by_id(self, employee_id: str) -> Optional[Employee]:
        """Get employee by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM employees WHERE id = $1",
                    employee_id
                )
                return self._row_to_employee(row) if row else None
        except Exception as e:
            logger.error(f"Error getting employee by ID {employee_id}: {e}")
            return None

    async def get_all_employees(self) -> List[Employee]:
        """Get all employees"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM employees ORDER BY created_at DESC")
                return [self._row_to_employee(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting all employees: {e}")
            return []

    async def get_employees_by_property(self, property_id: str) -> List[Employee]:
        """Get all employees for a specific property"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM employees WHERE property_id = $1 ORDER BY created_at DESC",
                    property_id
                )
                return [self._row_to_employee(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting employees by property {property_id}: {e}")
            return []

    async def get_employees_by_properties(self, property_ids: List[str]) -> List[Employee]:
        """Get all employees for multiple properties"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM employees WHERE property_id = ANY($1) ORDER BY created_at DESC",
                    property_ids
                )
                return [self._row_to_employee(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting employees by properties: {e}")
            return []

    async def get_employees_by_manager(self, manager_id: str) -> List[Employee]:
        """Get all employees managed by a specific manager"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT e.* FROM employees e
                    INNER JOIN properties p ON e.property_id = p.id
                    INNER JOIN property_managers pm ON p.id = pm.property_id
                    WHERE pm.manager_id = $1
                    ORDER BY e.created_at DESC
                    """,
                    manager_id
                )
                return [self._row_to_employee(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting employees by manager {manager_id}: {e}")
            return []

    async def create_employee(self, employee_data: Dict[str, Any]) -> Employee:
        """Create new employee"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO employees (
                        property_id, manager_id, department, position, hire_date,
                        pay_rate, employment_type, employment_status, personal_info,
                        onboarding_status, onboarding_phase
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
                    """,
                    employee_data['property_id'],
                    employee_data.get('manager_id'),
                    employee_data.get('department', 'General'),
                    employee_data.get('position', 'Staff'),
                    employee_data.get('hire_date', datetime.now(timezone.utc).date()),
                    employee_data.get('pay_rate', 0.0),
                    employee_data.get('employment_type', 'full_time'),
                    employee_data.get('employment_status', 'active'),
                    employee_data.get('personal_info', {}),
                    employee_data.get('onboarding_status', 'not_started'),
                    employee_data.get('onboarding_phase', 'employee')
                )
                return self._row_to_employee(row)
        except Exception as e:
            logger.error(f"Error creating employee: {e}")
            raise

    async def update_employee(self, employee_id: str, employee_data: Dict[str, Any]) -> Employee:
        """Update existing employee"""
        try:
            fields = []
            values = []
            param_count = 1

            for key, value in employee_data.items():
                if key not in ['id', 'created_at']:
                    fields.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1

            if not fields:
                return await self.get_employee_by_id(employee_id)

            values.append(employee_id)

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE employees
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${param_count}
                    RETURNING *
                    """,
                    *values
                )
                return self._row_to_employee(row) if row else None
        except Exception as e:
            logger.error(f"Error updating employee {employee_id}: {e}")
            raise

    async def delete_employee(self, employee_id: str) -> bool:
        """Delete employee (soft delete)"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE employees SET employment_status = 'terminated', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    employee_id
                )
                return True
        except Exception as e:
            logger.error(f"Error deleting employee {employee_id}: {e}")
            return False

    async def get_employee_by_session(self, session_id: str) -> Optional[Employee]:
        """Get employee associated with an onboarding session"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT e.* FROM employees e
                    INNER JOIN onboarding_sessions s ON e.id = s.employee_id
                    WHERE s.id = $1
                    """,
                    session_id
                )
                return self._row_to_employee(row) if row else None
        except Exception as e:
            logger.error(f"Error getting employee by session {session_id}: {e}")
            return None

    # ============================================================================
    # JOB APPLICATION OPERATIONS
    # ============================================================================

    async def get_application_by_id(self, application_id: str) -> Optional[JobApplication]:
        """Get job application by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM job_applications WHERE id = $1",
                    application_id
                )
                return self._row_to_application(row) if row else None
        except Exception as e:
            logger.error(f"Error getting application by ID {application_id}: {e}")
            return None

    async def get_all_applications(self) -> List[JobApplication]:
        """Get all job applications"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM job_applications ORDER BY created_at DESC")
                return [self._row_to_application(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting all applications: {e}")
            return []

    async def get_applications_by_property(self, property_id: str) -> List[JobApplication]:
        """Get all applications for a specific property"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM job_applications WHERE property_id = $1 ORDER BY created_at DESC",
                    property_id
                )
                return [self._row_to_application(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting applications by property {property_id}: {e}")
            return []

    async def get_applications_by_status(self, status: ApplicationStatus) -> List[JobApplication]:
        """Get all applications with specific status"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM job_applications WHERE status = $1 ORDER BY created_at DESC",
                    status.value
                )
                return [self._row_to_application(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting applications by status {status}: {e}")
            return []

    async def create_application(self, application_data: Dict[str, Any]) -> JobApplication:
        """Create new job application"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO job_applications (property_id, position, status, applicant_data)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                    """,
                    application_data['property_id'],
                    application_data['position'],
                    application_data.get('status', 'pending'),
                    application_data.get('applicant_data', {})
                )
                return self._row_to_application(row)
        except Exception as e:
            logger.error(f"Error creating application: {e}")
            raise

    async def update_application(self, application_id: str, application_data: Dict[str, Any]) -> JobApplication:
        """Update existing job application"""
        try:
            fields = []
            values = []
            param_count = 1

            for key, value in application_data.items():
                if key not in ['id', 'created_at']:
                    fields.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1

            if not fields:
                return await self.get_application_by_id(application_id)

            values.append(application_id)

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE job_applications
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${param_count}
                    RETURNING *
                    """,
                    *values
                )
                return self._row_to_application(row) if row else None
        except Exception as e:
            logger.error(f"Error updating application {application_id}: {e}")
            raise

    async def approve_application(self, application_id: str, approved_by: str) -> Employee:
        """Approve application and create employee record"""
        try:
            async with self.db_pool.acquire() as conn:
                # Start transaction
                async with conn.transaction():
                    # Get application data
                    app_row = await conn.fetchrow(
                        "SELECT * FROM job_applications WHERE id = $1",
                        application_id
                    )

                    if not app_row:
                        raise ValueError(f"Application {application_id} not found")

                    # Create employee from application data
                    applicant_data = app_row['applicant_data']
                    emp_row = await conn.fetchrow(
                        """
                        INSERT INTO employees (
                            application_id, property_id, department, position,
                            hire_date, personal_info, onboarding_status, employment_status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING *
                        """,
                        application_id,
                        app_row['property_id'],
                        applicant_data.get('department', 'General'),
                        app_row['position'],
                        datetime.now(timezone.utc).date(),
                        applicant_data,
                        'not_started',
                        'pending'
                    )

                    # Update application status
                    await conn.execute(
                        "UPDATE job_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                        'approved',
                        application_id
                    )

                    return self._row_to_employee(emp_row)
        except Exception as e:
            logger.error(f"Error approving application {application_id}: {e}")
            raise

    async def reject_application(self, application_id: str, rejected_by: str, reason: str) -> JobApplication:
        """Reject job application"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    UPDATE job_applications
                    SET status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                    RETURNING *
                    """,
                    'rejected',
                    reason,
                    application_id
                )
                return self._row_to_application(row) if row else None
        except Exception as e:
            logger.error(f"Error rejecting application {application_id}: {e}")
            raise

    async def update_application_status_with_audit(
        self,
        application_id: str,
        new_status: str,
        reviewed_by: Optional[str] = None,
        reason: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update application status with comprehensive audit trail"""
        try:
            async with self.db_pool.acquire() as conn:
                async with conn.transaction():
                    # Get current application
                    current_row = await conn.fetchrow(
                        "SELECT * FROM job_applications WHERE id = $1",
                        uuid.UUID(application_id)
                    )

                    if not current_row:
                        raise ValueError(f"Application {application_id} not found")

                    old_status = current_row['status']

                    # Prepare update data
                    update_query = """
                        UPDATE job_applications
                        SET status = $1, updated_at = CURRENT_TIMESTAMP
                    """
                    params = [new_status]
                    param_count = 1

                    if reviewed_by:
                        param_count += 1
                        update_query += f", reviewed_by = ${param_count}"
                        params.append(uuid.UUID(reviewed_by))
                        param_count += 1
                        update_query += f", reviewed_at = ${param_count}"
                        params.append(datetime.now(timezone.utc))

                    if reason:
                        param_count += 1
                        update_query += f", rejection_reason = ${param_count}"
                        params.append(reason)

                    if new_status == 'talent_pool':
                        param_count += 1
                        update_query += f", talent_pool_date = ${param_count}"
                        params.append(datetime.now(timezone.utc))

                    param_count += 1
                    update_query += f" WHERE id = ${param_count} RETURNING *"
                    params.append(uuid.UUID(application_id))

                    # Update application
                    updated_row = await conn.fetchrow(update_query, *params)

                    if updated_row:
                        # Add to status history (if table exists)
                        try:
                            await conn.execute(
                                """
                                INSERT INTO application_status_history
                                (application_id, old_status, new_status, changed_by, reason, notes, changed_at)
                                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                                """,
                                uuid.UUID(application_id),
                                old_status,
                                new_status,
                                uuid.UUID(reviewed_by) if reviewed_by else None,
                                reason,
                                notes
                            )
                        except Exception as history_error:
                            logger.warning(f"Failed to add status history: {history_error}")

                        # Log audit event (if table exists)
                        try:
                            await conn.execute(
                                """
                                INSERT INTO audit_logs
                                (table_name, record_id, action, old_values, new_values, user_id, compliance_event, created_at)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                                """,
                                'job_applications',
                                uuid.UUID(application_id),
                                'UPDATE',
                                json.dumps(dict(current_row)),
                                json.dumps(dict(updated_row)),
                                uuid.UUID(reviewed_by) if reviewed_by else None,
                                True
                            )
                        except Exception as audit_error:
                            logger.warning(f"Failed to log audit event: {audit_error}")

                        logger.info(f"Application {application_id} status updated: {old_status} -> {new_status}")

                    # Convert row to dict for return
                    return dict(updated_row) if updated_row else None

        except Exception as e:
            logger.error(f"Error updating application status: {e}")
            raise

    # ============================================================================
    # ONBOARDING SESSION OPERATIONS
    # ============================================================================

    async def get_session_by_id(self, session_id: str) -> Optional[OnboardingSession]:
        """Get onboarding session by ID"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM onboarding_sessions WHERE id = $1",
                    session_id
                )
                return self._row_to_session(row) if row else None
        except Exception as e:
            logger.error(f"Error getting session by ID {session_id}: {e}")
            return None

    async def get_session_by_token(self, token: str) -> Optional[OnboardingSession]:
        """Get onboarding session by token"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM onboarding_sessions WHERE token = $1",
                    token
                )
                return self._row_to_session(row) if row else None
        except Exception as e:
            logger.error(f"Error getting session by token: {e}")
            return None

    async def get_sessions_by_employee(self, employee_id: str) -> List[OnboardingSession]:
        """Get all sessions for an employee"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM onboarding_sessions WHERE employee_id = $1 ORDER BY created_at DESC",
                    employee_id
                )
                return [self._row_to_session(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting sessions by employee {employee_id}: {e}")
            return []

    async def create_session(self, session_data: Dict[str, Any]) -> OnboardingSession:
        """Create new onboarding session"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO onboarding_sessions (
                        employee_id, token, status, phase, current_step, completed_steps, expires_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                    """,
                    session_data['employee_id'],
                    session_data['token'],
                    session_data.get('status', 'active'),
                    session_data.get('phase', 'employee'),
                    session_data.get('current_step'),
                    session_data.get('completed_steps', []),
                    session_data.get('expires_at')
                )
                return self._row_to_session(row)
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise

    async def update_session(self, session_id: str, session_data: Dict[str, Any]) -> OnboardingSession:
        """Update existing onboarding session"""
        try:
            fields = []
            values = []
            param_count = 1

            for key, value in session_data.items():
                if key not in ['id', 'created_at']:
                    fields.append(f"{key} = ${param_count}")
                    values.append(value)
                    param_count += 1

            if not fields:
                return await self.get_session_by_id(session_id)

            values.append(session_id)

            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"""
                    UPDATE onboarding_sessions
                    SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${param_count}
                    RETURNING *
                    """,
                    *values
                )
                return self._row_to_session(row) if row else None
        except Exception as e:
            logger.error(f"Error updating session {session_id}: {e}")
            raise

    async def expire_session(self, session_id: str) -> bool:
        """Expire an onboarding session"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE onboarding_sessions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    session_id
                )
                return True
        except Exception as e:
            logger.error(f"Error expiring session {session_id}: {e}")
            return False

    # ============================================================================
    # DOCUMENT OPERATIONS
    # ============================================================================

    async def save_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save document metadata and file"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO employee_documents (
                        employee_id, document_type, file_path, file_name, file_size, uploaded_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    document_data['employee_id'],
                    document_data['document_type'],
                    document_data['file_path'],
                    document_data.get('file_name'),
                    document_data.get('file_size', 0),
                    document_data.get('uploaded_by')
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error saving document: {e}")
            raise

    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document metadata and URL"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM employee_documents WHERE id = $1",
                    document_id
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            return None

    async def get_employee_documents(self, employee_id: str) -> List[Dict[str, Any]]:
        """Get all documents for an employee"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM employee_documents WHERE employee_id = $1 ORDER BY created_at DESC",
                    employee_id
                )
                return [self._row_to_dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting employee documents for {employee_id}: {e}")
            return []

    async def delete_document(self, document_id: str) -> bool:
        """Delete document"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM employee_documents WHERE id = $1",
                    document_id
                )
                return True
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            return False

    # ============================================================================
    # FORM DATA OPERATIONS
    # ============================================================================

    async def save_i9_form(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save I-9 form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO i9_forms (employee_id, form_data)
                    VALUES ($1, $2)
                    ON CONFLICT (employee_id) DO UPDATE SET form_data = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    employee_id,
                    form_data
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error saving I-9 form for employee {employee_id}: {e}")
            raise

    async def get_i9_form(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get I-9 form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM i9_forms WHERE employee_id = $1",
                    employee_id
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting I-9 form for employee {employee_id}: {e}")
            return None

    async def save_w4_form(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save W-4 form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO w4_forms (employee_id, form_data)
                    VALUES ($1, $2)
                    ON CONFLICT (employee_id) DO UPDATE SET form_data = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    employee_id,
                    form_data
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error saving W-4 form for employee {employee_id}: {e}")
            raise

    async def get_w4_form(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get W-4 form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM w4_forms WHERE employee_id = $1",
                    employee_id
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting W-4 form for employee {employee_id}: {e}")
            return None

    async def save_direct_deposit(self, employee_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save direct deposit form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO direct_deposit_forms (employee_id, form_data)
                    VALUES ($1, $2)
                    ON CONFLICT (employee_id) DO UPDATE SET form_data = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    employee_id,
                    form_data
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error saving direct deposit form for employee {employee_id}: {e}")
            raise

    async def get_direct_deposit(self, employee_id: str) -> Optional[Dict[str, Any]]:
        """Get direct deposit form data"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM direct_deposit_forms WHERE employee_id = $1",
                    employee_id
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting direct deposit form for employee {employee_id}: {e}")
            return None

    # ============================================================================
    # STATISTICS & ANALYTICS
    # ============================================================================

    async def get_properties_count(self) -> int:
        """Get total count of properties"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM properties")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting properties count: {e}")
            return 0

    async def get_employees_count(self) -> int:
        """Get total count of employees"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM employees")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting employees count: {e}")
            return 0

    async def get_managers_count(self) -> int:
        """Get total count of managers"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'manager'")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting managers count: {e}")
            return 0

    async def get_applications_count(self) -> int:
        """Get total count of applications"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM job_applications")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting applications count: {e}")
            return 0

    async def get_pending_applications_count(self) -> int:
        """Get count of pending applications"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM job_applications WHERE status = 'pending'")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting pending applications count: {e}")
            return 0

    async def get_approved_applications_count(self) -> int:
        """Get count of approved applications"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM job_applications WHERE status = 'approved'")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting approved applications count: {e}")
            return 0

    async def get_active_employees_count(self) -> int:
        """Get count of active employees"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval("SELECT COUNT(*) FROM employees WHERE employment_status = 'active'")
                return count or 0
        except Exception as e:
            logger.error(f"Error getting active employees count: {e}")
            return 0

    async def get_onboarding_in_progress_count(self) -> int:
        """Get count of employees currently in onboarding"""
        try:
            async with self.db_pool.acquire() as conn:
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM employees WHERE onboarding_status IN ('in_progress', 'pending_review')"
                )
                return count or 0
        except Exception as e:
            logger.error(f"Error getting onboarding in progress count: {e}")
            return 0

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics"""
        try:
            return {
                'properties_count': await self.get_properties_count(),
                'employees_count': await self.get_employees_count(),
                'managers_count': await self.get_managers_count(),
                'applications_count': await self.get_applications_count(),
                'pending_applications_count': await self.get_pending_applications_count(),
                'approved_applications_count': await self.get_approved_applications_count(),
                'active_employees_count': await self.get_active_employees_count(),
                'onboarding_in_progress_count': await self.get_onboarding_in_progress_count()
            }
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            return {}

    # ============================================================================
    # SETTINGS & CONFIGURATION
    # ============================================================================

    async def get_hr_setting(self, setting_key: str) -> Optional[Dict[str, Any]]:
        """Get HR setting by key"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM hr_settings WHERE setting_key = $1",
                    setting_key
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting HR setting {setting_key}: {e}")
            return None

    async def update_hr_setting(self, setting_key: str, setting_value: Any) -> Dict[str, Any]:
        """Update HR setting"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO hr_settings (setting_key, setting_value)
                    VALUES ($1, $2)
                    ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    setting_key,
                    setting_value
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error updating HR setting {setting_key}: {e}")
            raise

    async def get_all_hr_settings(self) -> Dict[str, Any]:
        """Get all HR settings"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM hr_settings")
                return {row['setting_key']: row['setting_value'] for row in rows}
        except Exception as e:
            logger.error(f"Error getting all HR settings: {e}")
            return {}

    # ============================================================================
    # NOTIFICATIONS & COMMUNICATIONS
    # ============================================================================

    async def create_notification(self, notification_data: Dict[str, Any]) -> Notification:
        """Create new notification"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO notifications (user_id, title, message, type, priority, status)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                    """,
                    notification_data['user_id'],
                    notification_data['title'],
                    notification_data['message'],
                    notification_data.get('type', 'info'),
                    notification_data.get('priority', 'normal'),
                    notification_data.get('status', 'unread')
                )
                return Notification(**self._row_to_dict(row))
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise

    async def get_user_notifications(self, user_id: str) -> List[Notification]:
        """Get all notifications for a user"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
                    user_id
                )
                return [Notification(**self._row_to_dict(row)) for row in rows]
        except Exception as e:
            logger.error(f"Error getting user notifications for {user_id}: {e}")
            return []

    async def mark_notification_read(self, notification_id: str) -> bool:
        """Mark notification as read"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE notifications SET status = 'read', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
                    notification_id
                )
                return True
        except Exception as e:
            logger.error(f"Error marking notification {notification_id} as read: {e}")
            return False

    async def send_email(self, email_data: Dict[str, Any]) -> bool:
        """Send email and log it"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO email_logs (recipient, subject, body, sent_by, status)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    email_data['recipient'],
                    email_data['subject'],
                    email_data.get('body', ''),
                    email_data.get('sent_by'),
                    'sent'
                )
                return True
        except Exception as e:
            logger.error(f"Error logging email: {e}")
            return False

    # ============================================================================
    # AUDIT & LOGGING
    # ============================================================================

    async def create_audit_log(self, audit_data: Dict[str, Any]) -> AuditLog:
        """Create audit log entry"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    """,
                    audit_data.get('user_id'),
                    audit_data['action'],
                    audit_data.get('resource_type'),
                    audit_data.get('resource_id'),
                    audit_data.get('details', {})
                )
                return AuditLog(**self._row_to_dict(row))
        except Exception as e:
            logger.error(f"Error creating audit log: {e}")
            raise

    async def get_audit_logs(self, filters: Optional[Dict[str, Any]] = None) -> List[AuditLog]:
        """Get audit logs with optional filters"""
        try:
            async with self.db_pool.acquire() as conn:
                if filters:
                    # Build dynamic query based on filters
                    conditions = []
                    values = []
                    param_count = 1

                    for key, value in filters.items():
                        conditions.append(f"{key} = ${param_count}")
                        values.append(value)
                        param_count += 1

                    where_clause = " AND ".join(conditions) if conditions else "1=1"
                    rows = await conn.fetch(
                        f"SELECT * FROM audit_logs WHERE {where_clause} ORDER BY created_at DESC LIMIT 100",
                        *values
                    )
                else:
                    rows = await conn.fetch(
                        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100"
                    )

                return [AuditLog(**self._row_to_dict(row)) for row in rows]
        except Exception as e:
            logger.error(f"Error getting audit logs: {e}")
            return []

    # ============================================================================
    # MANAGER REVIEW OPERATIONS
    # ============================================================================

    async def get_pending_reviews(self, manager_id: str) -> List[Employee]:
        """Get employees pending manager review"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT e.* FROM employees e
                    INNER JOIN properties p ON e.property_id = p.id
                    INNER JOIN property_managers pm ON p.id = pm.property_id
                    WHERE pm.manager_id = $1 AND e.onboarding_status = 'pending_review'
                    ORDER BY e.created_at DESC
                    """,
                    manager_id
                )
                return [self._row_to_employee(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting pending reviews for manager {manager_id}: {e}")
            return []

    async def approve_employee_documents(self, employee_id: str, approved_by: str) -> Employee:
        """Approve employee documents after manager review"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    UPDATE employees
                    SET onboarding_status = 'completed', manager_review_status = 'approved',
                        manager_review_by = $2, manager_review_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING *
                    """,
                    employee_id,
                    approved_by
                )
                return self._row_to_employee(row) if row else None
        except Exception as e:
            logger.error(f"Error approving employee documents for {employee_id}: {e}")
            raise

    async def request_document_revision(self, employee_id: str, manager_id: str, notes: str) -> Employee:
        """Request revision of employee documents"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    UPDATE employees
                    SET onboarding_status = 'revision_requested', manager_review_status = 'revision_requested',
                        manager_review_by = $2, manager_review_notes = $3,
                        manager_review_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING *
                    """,
                    employee_id,
                    manager_id,
                    notes
                )
                return self._row_to_employee(row) if row else None
        except Exception as e:
            logger.error(f"Error requesting document revision for {employee_id}: {e}")
            raise

    # ============================================================================
    # STEP INVITATIONS
    # ============================================================================

    async def create_step_invitation(self, invitation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create step invitation"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO step_invitations (
                        step_id, recipient_email, recipient_name, employee_id,
                        sent_by, token, property_id, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                    """,
                    invitation_data['step_id'],
                    invitation_data['recipient_email'],
                    invitation_data.get('recipient_name'),
                    invitation_data.get('employee_id'),
                    invitation_data['sent_by'],
                    invitation_data['token'],
                    invitation_data['property_id'],
                    invitation_data.get('status', 'pending')
                )
                return self._row_to_dict(row)
        except Exception as e:
            logger.error(f"Error creating step invitation: {e}")
            raise

    async def get_step_invitations(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get step invitations with optional filters"""
        try:
            async with self.db_pool.acquire() as conn:
                if filters:
                    conditions = []
                    values = []
                    param_count = 1

                    for key, value in filters.items():
                        conditions.append(f"{key} = ${param_count}")
                        values.append(value)
                        param_count += 1

                    where_clause = " AND ".join(conditions) if conditions else "1=1"
                    rows = await conn.fetch(
                        f"SELECT * FROM step_invitations WHERE {where_clause} ORDER BY sent_at DESC",
                        *values
                    )
                else:
                    rows = await conn.fetch(
                        "SELECT * FROM step_invitations ORDER BY sent_at DESC"
                    )

                return [self._row_to_dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting step invitations: {e}")
            return []

    async def get_step_invitation_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get step invitation by token"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM step_invitations WHERE token = $1",
                    token
                )
                return self._row_to_dict(row) if row else None
        except Exception as e:
            logger.error(f"Error getting step invitation by token: {e}")
            return None

    # ============================================================================
    # EMAIL RECIPIENTS
    # ============================================================================

    async def get_global_email_recipients(self) -> List[str]:
        """Get list of global email recipients"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT email FROM global_email_recipients WHERE is_active = true"
                )
                return [row['email'] for row in rows]
        except Exception as e:
            logger.error(f"Error getting global email recipients: {e}")
            return []

    async def add_global_email_recipient(self, email: str, name: str, added_by: str) -> bool:
        """Add global email recipient"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO global_email_recipients (email, name, added_by, is_active)
                    VALUES ($1, $2, $3, true)
                    ON CONFLICT (email) DO UPDATE SET is_active = true, updated_at = CURRENT_TIMESTAMP
                    """,
                    email,
                    name,
                    added_by
                )
                return True
        except Exception as e:
            logger.error(f"Error adding global email recipient {email}: {e}")
            return False

    async def remove_global_email_recipient(self, email: str) -> bool:
        """Remove global email recipient"""
        try:
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    "UPDATE global_email_recipients SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE email = $1",
                    email
                )
                return True
        except Exception as e:
            logger.error(f"Error removing global email recipient {email}: {e}")
            return False

    # ============================================================================
    # Property Deletion Support Methods
    # ============================================================================

    async def get_applications_by_property(self, property_id: str) -> List[JobApplication]:
        """Get all applications for a specific property"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, property_id, department, position, applicant_data, status, applied_at
                    FROM job_applications
                    WHERE property_id = $1
                    ORDER BY applied_at DESC
                    """,
                    uuid.UUID(property_id)
                )

                applications = []
                for row in rows:
                    applications.append(JobApplication(
                        id=str(row['id']),  # Convert UUID to string for Pydantic
                        property_id=str(row['property_id']),  # Convert UUID to string
                        department=row['department'],
                        position=row['position'],
                        applicant_data=row['applicant_data'],  # asyncpg returns JSONB as dict
                        status=ApplicationStatus(row['status']),
                        applied_at=row['applied_at']  # asyncpg returns datetime objects directly
                    ))

                logger.info(f"Found {len(applications)} applications for property {property_id}")
                return applications

        except Exception as e:
            logger.error(f"Error getting applications for property {property_id}: {e}")
            return []

    async def get_employees_by_property(self, property_id: str) -> List[Employee]:
        """Get all employees for a specific property"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, user_id, property_id, manager_id, department, position,
                           hire_date, pay_rate, pay_frequency, employment_type, employment_status,
                           personal_info, onboarding_status, onboarding_phase, created_at, updated_at,
                           manager_review_status, manager_review_completed_at, manager_review_notes
                    FROM employees
                    WHERE property_id = $1
                    ORDER BY created_at DESC
                    """,
                    uuid.UUID(property_id)
                )

                employees = []
                for row in rows:
                    employees.append(Employee(
                        id=str(row['id']),
                        user_id=str(row['user_id']) if row.get('user_id') else str(row['id']),
                        property_id=str(row['property_id']),
                        manager_id=str(row['manager_id']) if row.get('manager_id') else '',
                        department=row.get('department', 'General'),
                        position=row.get('position', 'Staff'),
                        hire_date=row.get('hire_date'),  # asyncpg returns date objects directly
                        pay_rate=row.get('pay_rate', 0.0),
                        pay_frequency=row.get('pay_frequency', 'hourly'),
                        employment_type=row.get('employment_type', 'full_time'),
                        employment_status=row.get('employment_status', 'active'),
                        personal_info=row.get('personal_info', {}),
                        onboarding_status=OnboardingStatus(row.get('onboarding_status', 'not_started')),
                        onboarding_phase=OnboardingPhase(row.get('onboarding_phase', 'pre_hire')) if row.get('onboarding_phase') else OnboardingPhase.PRE_HIRE,
                        created_at=row.get('created_at', datetime.now(timezone.utc)),
                        updated_at=row.get('updated_at'),
                        manager_review_status=row.get('manager_review_status'),
                        manager_review_completed_at=row.get('manager_review_completed_at'),
                        manager_review_notes=row.get('manager_review_notes')
                    ))

                logger.info(f"Found {len(employees)} employees for property {property_id}")
                return employees

        except Exception as e:
            logger.error(f"Error getting employees for property {property_id}: {e}")
            return []

    async def delete_property_managers(self, property_id: str) -> int:
        """Delete all property_manager assignments for a property. Returns count of deleted rows."""
        try:
            async with self.db_pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM property_managers WHERE property_id = $1",
                    uuid.UUID(property_id)
                )
                # Extract count from result string like "DELETE 3"
                count = int(result.split()[-1]) if result and result.split()[-1].isdigit() else 0
                logger.info(f"Deleted {count} property_manager assignments for property {property_id}")
                return count

        except Exception as e:
            logger.error(f"Error deleting property_managers for property {property_id}: {e}")
            return 0

    async def clear_property_references(self, property_id: str) -> None:
        """Clear property_id references from users and bulk_operations tables"""
        try:
            async with self.db_pool.acquire() as conn:
                # Clear property_id from users table
                await conn.execute(
                    "UPDATE users SET property_id = NULL WHERE property_id = $1",
                    uuid.UUID(property_id)
                )
                logger.info(f"Cleared property_id reference from users for property {property_id}")

                # Clear property_id from bulk_operations table
                await conn.execute(
                    "UPDATE bulk_operations SET property_id = NULL WHERE property_id = $1",
                    uuid.UUID(property_id)
                )
                logger.info(f"Cleared property_id reference from bulk_operations for property {property_id}")

        except Exception as e:
            logger.error(f"Error clearing property references for property {property_id}: {e}")
            raise

    async def delete_property(self, property_id: str) -> bool:
        """Delete a property. Returns True if successful."""
        try:
            async with self.db_pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM properties WHERE id = $1",
                    uuid.UUID(property_id)
                )
                # Check if any rows were deleted
                success = result and "DELETE" in result and result.split()[-1] != "0"

                if success:
                    logger.info(f"Successfully deleted property {property_id}")
                else:
                    logger.warning(f"No property found with id {property_id} to delete")

                return success

        except Exception as e:
            logger.error(f"Error deleting property {property_id}: {e}")
            return False

    # ============================================================================
    # User Management Methods
    # ============================================================================

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
        try:
            async with self.db_pool.acquire() as conn:
                # Build WHERE clause dynamically
                where_clauses = []
                params = []
                param_count = 1

                if role:
                    where_clauses.append(f"u.role = ${param_count}")
                    params.append(role)
                    param_count += 1

                if is_active is not None:
                    where_clauses.append(f"u.is_active = ${param_count}")
                    params.append(is_active)
                    param_count += 1

                where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

                # Get users with property info in a single query (optimized JOIN)
                query = f"""
                    SELECT
                        u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'id', p.id::text,
                                    'name', p.name,
                                    'city', p.city,
                                    'state', p.state
                                )
                            ) FILTER (WHERE p.id IS NOT NULL),
                            '[]'::json
                        ) as properties
                    FROM users u
                    LEFT JOIN property_managers pm ON u.id = pm.manager_id AND u.role = 'manager'
                    LEFT JOIN properties p ON pm.property_id = p.id
                    WHERE {where_sql}
                    GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
                    ORDER BY u.created_at DESC
                """

                rows = await conn.fetch(query, *params)

                users = []
                for row in rows:
                    # Apply search filter (post-query filtering for simplicity)
                    if search:
                        search_lower = search.lower()
                        if not (search_lower in (row['email'] or '').lower() or
                               search_lower in (row.get('first_name') or '').lower() or
                               search_lower in (row.get('last_name') or '').lower()):
                            continue

                    users.append({
                        "id": str(row['id']),  # Convert UUID to string
                        "email": row['email'],
                        "first_name": row.get('first_name'),
                        "last_name": row.get('last_name'),
                        "role": row['role'],
                        "is_active": row.get('is_active', True),
                        "created_at": row.get('created_at').isoformat() if row.get('created_at') else None,
                        "properties": row['properties'] if row['role'] == 'manager' else []
                    })

                logger.info(f"Retrieved {len(users)} users with filters (role={role}, is_active={is_active}, search={search})")
                return users

        except Exception as e:
            logger.error(f"Error getting users with filters: {e}")
            return []

