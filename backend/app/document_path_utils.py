"""
Document Path Utilities for Property-Based Storage

This module provides utilities for creating consistent, property-based file paths
for document storage with proper sanitization and duplicate handling.
"""

import re
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DocumentPathManager:
    """Manages document storage paths with property-based organization"""
    
    def __init__(self, supabase_service=None):
        self.supabase_service = supabase_service
        self._property_cache = {}  # Cache property names to avoid repeated DB calls
        self._employee_name_cache = {}  # Cache employee folder names
    
    def sanitize_name(self, name: str) -> str:
        """
        Sanitize property or employee names for use in file paths
        
        Args:
            name: Raw name to sanitize
            
        Returns:
            Sanitized name safe for file paths
        """
        if not name:
            return "unknown"
        
        # Convert to lowercase
        sanitized = name.lower()
        
        # Replace spaces and special characters with underscores
        sanitized = re.sub(r'[^a-z0-9_]', '_', sanitized)
        
        # Remove consecutive underscores
        sanitized = re.sub(r'_+', '_', sanitized)
        
        # Remove leading/trailing underscores
        sanitized = sanitized.strip('_')
        
        # Ensure it's not empty
        if not sanitized:
            sanitized = "unknown"
        
        # Limit length to avoid filesystem issues
        if len(sanitized) > 50:
            sanitized = sanitized[:50].rstrip('_')
        
        return sanitized
    
    async def get_property_name(self, property_id: str) -> str:
        """
        Get sanitized property name from property ID
        
        Args:
            property_id: Property UUID
            
        Returns:
            Sanitized property name
        """
        if not property_id:
            return "unknown_property"
        
        # Check cache first
        if property_id in self._property_cache:
            return self._property_cache[property_id]
        
        try:
            if self.supabase_service:
                property_obj = await self.supabase_service.get_property_by_id(property_id)
                if property_obj:
                    sanitized_name = self.sanitize_name(property_obj.name)
                    self._property_cache[property_id] = sanitized_name
                    return sanitized_name
        except Exception as e:
            logger.warning(f"Could not get property name for {property_id}: {e}")
        
        # Fallback to property ID
        fallback_name = f"property_{property_id[:8]}"
        self._property_cache[property_id] = fallback_name
        return fallback_name
    
    async def get_employee_folder_name(self, employee_id: str, property_id: str) -> str:
        """
        Get unique employee folder name with duplicate handling
        
        Args:
            employee_id: Employee UUID
            property_id: Property UUID
            
        Returns:
            Unique employee folder name (e.g., "john_smith" or "john_smith_2")
        """
        cache_key = f"{property_id}:{employee_id}"

        # Check cache first, but only if we have a valid property_id
        if cache_key in self._employee_name_cache and property_id:
            return self._employee_name_cache[cache_key]
        
        try:
            if self.supabase_service:
                logger.debug(f"Looking up employee {employee_id}")
                employee = await self.supabase_service.get_employee_by_id(employee_id)
                logger.debug(f"Employee lookup result: {employee}")
                if employee:
                    # Get employee name from personal_info or direct attributes
                    if isinstance(employee, dict):
                        personal_info = employee.get('personal_info', {})
                        if personal_info:
                            # Try both naming conventions
                            first_name = personal_info.get('firstName', '') or personal_info.get('first_name', '')
                            last_name = personal_info.get('lastName', '') or personal_info.get('last_name', '')
                        else:
                            first_name = employee.get('first_name', '')
                            last_name = employee.get('last_name', '')
                    else:
                        # Handle Employee object
                        personal_info = getattr(employee, 'personal_info', {}) or {}
                        if personal_info:
                            first_name = personal_info.get('firstName', '') or personal_info.get('first_name', '')
                            last_name = personal_info.get('lastName', '') or personal_info.get('last_name', '')
                        else:
                            first_name = getattr(employee, 'first_name', '')
                            last_name = getattr(employee, 'last_name', '')

                    base_name = self.sanitize_name(f"{first_name} {last_name}")
                    
                    # Check for duplicates in the same property
                    unique_name = await self._get_unique_employee_name(base_name, property_id, employee_id)
                    
                    self._employee_name_cache[cache_key] = unique_name
                    return unique_name
        except Exception as e:
            logger.warning(f"Could not get employee name for {employee_id}: {e}")
        
        # Fallback to employee ID
        fallback_name = f"employee_{employee_id[:8]}"
        self._employee_name_cache[cache_key] = fallback_name
        return fallback_name
    
    async def _get_unique_employee_name(self, base_name: str, property_id: str, current_employee_id: str) -> str:
        """
        Ensure employee name is unique within property by adding numbers if needed.
        Uses deterministic ordering based on creation time to ensure consistent naming.

        Args:
            base_name: Base sanitized employee name
            property_id: Property UUID
            current_employee_id: Current employee's ID

        Returns:
            Unique employee name with number suffix if needed
        """
        if not self.supabase_service:
            return base_name

        try:
            # Get all employees in the same property
            employees = await self.supabase_service.get_employees_by_property(property_id)

            # Find all employees with the same base name (including current employee)
            same_name_employees = []
            logger.debug(f"Checking duplicates for employee {current_employee_id}, found {len(employees)} total employees")

            for emp in employees:
                # Handle both dict and Employee object
                emp_id = emp.get('id') if isinstance(emp, dict) else getattr(emp, 'id', None)

                # Get employee name from personal_info or direct attributes
                if isinstance(emp, dict):
                    personal_info = emp.get('personal_info', {})
                    if personal_info:
                        # Try both naming conventions
                        emp_first = personal_info.get('firstName', '') or personal_info.get('first_name', '')
                        emp_last = personal_info.get('lastName', '') or personal_info.get('last_name', '')
                    else:
                        emp_first = emp.get('first_name', '')
                        emp_last = emp.get('last_name', '')
                else:
                    # Handle Employee object
                    personal_info = getattr(emp, 'personal_info', {}) or {}
                    if personal_info:
                        emp_first = personal_info.get('firstName', '') or personal_info.get('first_name', '')
                        emp_last = personal_info.get('lastName', '') or personal_info.get('last_name', '')
                    else:
                        emp_first = getattr(emp, 'first_name', '')
                        emp_last = getattr(emp, 'last_name', '')

                emp_name = self.sanitize_name(f"{emp_first} {emp_last}")

                # If this employee has the same base name, add to list
                if emp_name == base_name:
                    # Get creation timestamp for deterministic ordering
                    created_at = emp.get('created_at') if isinstance(emp, dict) else getattr(emp, 'created_at', None)
                    same_name_employees.append({
                        'id': emp_id,
                        'name': emp_name,
                        'created_at': created_at or '1970-01-01T00:00:00+00:00'  # Fallback for missing timestamp
                    })

            logger.debug(f"Found {len(same_name_employees)} employees with base name '{base_name}'")

            # If only one employee with this name, use base name
            if len(same_name_employees) <= 1:
                logger.debug(f"No duplicates found, using base name: '{base_name}'")
                return base_name

            # Sort employees by creation time for deterministic ordering
            # The earliest created employee gets the base name, others get numbered
            same_name_employees.sort(key=lambda x: x['created_at'])

            # Find the position of the current employee in the sorted list
            current_position = None
            for i, emp in enumerate(same_name_employees):
                if emp['id'] == current_employee_id:
                    current_position = i
                    break

            if current_position is None:
                logger.warning(f"Current employee {current_employee_id} not found in same-name list")
                return base_name

            # First employee (position 0) gets base name, others get numbered
            if current_position == 0:
                result_name = base_name
                logger.debug(f"Employee is first with this name, using base name: '{result_name}'")
            else:
                # Position 1 gets _2, position 2 gets _3, etc.
                number = current_position + 1
                result_name = f"{base_name}_{number}"
                logger.debug(f"Employee is position {current_position}, using numbered name: '{result_name}'")

            return result_name

        except Exception as e:
            logger.warning(f"Error checking for duplicate employee names: {e}")
            return base_name
    
    async def build_document_path(
        self,
        employee_id: str,
        property_id: str,
        document_category: str,
        filename: str,
        document_type: str = "uploaded"
    ) -> str:
        """
        Build complete document storage path
        
        Args:
            employee_id: Employee UUID
            property_id: Property UUID
            document_category: Category like 'uploads', 'forms'
            filename: Original or generated filename
            document_type: Specific document type (e.g., 'i9_verification/drivers_license', 'direct_deposit', 'i9_form')
            
        Returns:
            Complete storage path
        """
        property_name = await self.get_property_name(property_id)
        employee_folder = await self.get_employee_folder_name(employee_id, property_id)
        
        # Build path components
        path_parts = [
            property_name,
            employee_folder,
            document_category
        ]
        
        # Add document type subdirectory if specified
        if document_type and document_type != "uploaded":
            path_parts.append(document_type)
        
        path_parts.append(filename)
        
        return "/".join(path_parts)

    async def build_upload_path(
        self,
        employee_id: str,
        property_id: str,
        upload_type: str,  # 'i9_verification', 'direct_deposit', 'other_documents'
        document_subtype: str,  # 'drivers_license', 'social_security_card', etc.
        filename: str
    ) -> str:
        """
        Build path for user uploaded documents

        Example: property_name/employee_name/uploads/i9_verification/drivers_license/filename.jpg
        """
        return await self.build_document_path(
            employee_id=employee_id,
            property_id=property_id,
            document_category="uploads",
            filename=filename,
            document_type=f"{upload_type}/{document_subtype}"
        )

    async def build_form_path(
        self,
        employee_id: str,
        property_id: str,
        form_type: str,  # 'i9_form', 'w4_form', 'company_policies', 'direct_deposit'
        filename: str
    ) -> str:
        """
        Build path for generated/signed forms

        Example: property_name/employee_name/forms/i9_form/filename.pdf
        """
        return await self.build_document_path(
            employee_id=employee_id,
            property_id=property_id,
            document_category="forms",
            filename=filename,
            document_type=form_type
        )

    def clear_cache(self):
        """Clear internal caches"""
        self._property_cache.clear()
        self._employee_name_cache.clear()
    
    def get_document_categories(self) -> Dict[str, str]:
        """
        Get mapping of document categories to folder names
        
        Returns:
            Dictionary mapping category keys to folder names
        """
        return {
            # User uploaded files
            'i9_uploads': 'uploads/i9_verification',
            'direct_deposit_uploads': 'uploads/direct_deposit',
            'other_uploads': 'uploads/other_documents',

            # Generated and signed forms
            'i9_forms': 'forms/i9_form',
            'w4_forms': 'forms/w4_form',
            'company_policies': 'forms/company_policies',
            'direct_deposit_forms': 'forms/direct_deposit'
        }


# Global instance
document_path_manager = DocumentPathManager()


def initialize_path_manager(supabase_service):
    """Initialize the global path manager with supabase service"""
    global document_path_manager
    document_path_manager = DocumentPathManager(supabase_service)
    return document_path_manager
