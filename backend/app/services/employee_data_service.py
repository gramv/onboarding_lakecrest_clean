"""
Centralized Employee Data Service
Single source of truth for employee data retrieval and management
Handles encryption/decryption and provides consistent data access
"""
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from functools import lru_cache
import json

from app.supabase_service_enhanced import EnhancedSupabaseService
# from app.services.encryption_service import get_encryption_service, DecryptionError
# Encryption disabled - not needed for this application
from app.models import Employee, User
from app.models_enhanced import OnboardingStatus

logger = logging.getLogger(__name__)

class EmployeeDataService:
    """
    Centralized service for managing employee data across all modules.
    Provides consistent data retrieval, handles encryption/decryption,
    and ensures data integrity across the system.
    """
    
    def __init__(self, supabase_service: EnhancedSupabaseService):
        """
        Initialize the employee data service
        
        Args:
            supabase_service: Instance of the enhanced Supabase service
        """
        self.supabase = supabase_service
        # self.encryption_service = get_encryption_service()  # Encryption disabled
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes cache TTL
        
    async def get_complete_employee_data(
        self, 
        employee_id: str,
        property_id: Optional[str] = None,
        include_encrypted: bool = False
    ) -> Dict[str, Any]:
        """
        Get complete employee data including all form submissions and personal info
        
        Args:
            employee_id: The employee's ID
            property_id: Optional property ID for access control
            include_encrypted: Whether to decrypt sensitive fields
            
        Returns:
            Complete employee data dictionary
        """
        try:
            # Check cache first
            cache_key = f"employee_{employee_id}_{include_encrypted}"
            if cache_key in self._cache:
                cached_data, timestamp = self._cache[cache_key]
                if (datetime.now(timezone.utc) - timestamp).seconds < self._cache_ttl:
                    logger.debug(f"Returning cached data for employee {employee_id}")
                    return cached_data
            
            # Get employee record
            employee = await self.supabase.get_employee_by_id(employee_id)
            if not employee:
                logger.error(f"Employee not found: {employee_id}")
                return {}
            
            # Convert employee object to dict if needed
            if hasattr(employee, '__dict__'):
                employee_dict = employee.__dict__
            else:
                employee_dict = employee

            # Verify property access if provided
            if property_id and employee_dict.get('property_id') != property_id:
                logger.error(f"Property access denied for employee {employee_id}")
                return {}

            # Get user data if available
            user_data = {}
            if employee_dict.get('user_id'):
                user = await self.supabase.get_user_by_id(employee_dict['user_id'])
                if user:
                    user_data = {
                        'email': user.get('email'),
                        'first_name': user.get('first_name'),
                        'last_name': user.get('last_name')
                    }
            
            # Get personal info from onboarding steps
            personal_info = await self._get_personal_info(employee_id, include_encrypted)
            
            # Get form data from various steps
            form_data = await self._get_all_form_data(employee_id, include_encrypted)
            
            # Compile complete data
            complete_data = {
                'employee_id': employee_id,
                'employee_number': employee_dict.get('employee_number'),
                'property_id': employee_dict.get('property_id'),
                'status': employee_dict.get('status'),
                'personal_info': personal_info,
                'user_data': user_data,
                'form_data': form_data,
                'metadata': {
                    'created_at': employee_dict.get('created_at'),
                    'updated_at': employee_dict.get('updated_at'),
                    'onboarding_status': employee_dict.get('onboarding_status')
                }
            }
            
            # Cache the result
            self._cache[cache_key] = (complete_data, datetime.now(timezone.utc))
            
            return complete_data
            
        except Exception as e:
            logger.error(f"Error getting complete employee data: {e}")
            return {}
    
    async def _get_personal_info(self, employee_id: str, decrypt: bool = False) -> Dict[str, Any]:
        """
        Get personal information from the personal-info onboarding step
        
        Args:
            employee_id: The employee's ID
            decrypt: Whether to decrypt sensitive fields
            
        Returns:
            Personal information dictionary
        """
        try:
            # Get personal info step data
            step_data = await self.supabase.get_onboarding_step_data(employee_id, "personal-info")
            
            if not step_data or not step_data.get('form_data'):
                logger.warning(f"No personal info found for employee {employee_id}")
                return {}
            
            form_data = step_data['form_data']
            
            # Handle nested formData structure (legacy compatibility)
            if 'formData' in form_data:
                # Nested structure from frontend
                actual_data = form_data['formData']
            else:
                # Direct structure
                actual_data = form_data
            
            # Extract personal information
            personal_info = {
                'firstName': actual_data.get('firstName', ''),
                'lastName': actual_data.get('lastName', ''),
                'middleInitial': actual_data.get('middleInitial', ''),
                'fullName': self._format_full_name(
                    actual_data.get('firstName', ''),
                    actual_data.get('lastName', ''),
                    actual_data.get('middleInitial', '')
                ),
                'dateOfBirth': actual_data.get('dateOfBirth', ''),
                'gender': actual_data.get('gender', ''),
                'maritalStatus': actual_data.get('maritalStatus', ''),
                'phone': actual_data.get('phone', ''),
                'email': actual_data.get('email', ''),
                'address': self._parse_address(actual_data),
                'ssn': actual_data.get('ssn', '') if decrypt else '***-**-****'
            }
            
            # Encryption disabled - return data as-is
            # if decrypt and self.encryption_service:
            #     personal_info = await self._decrypt_sensitive_fields(personal_info)
            
            return personal_info
            
        except Exception as e:
            logger.error(f"Error getting personal info for employee {employee_id}: {e}")
            return {}
    
    def _parse_address(self, data: Dict[str, Any]) -> Dict[str, str]:
        """
        Parse address from various possible formats
        
        Args:
            data: Form data containing address information
            
        Returns:
            Standardized address dictionary
        """
        # Check if address is nested object
        if isinstance(data.get('address'), dict):
            addr = data['address']
            return {
                'street': addr.get('street', ''),
                'apt': addr.get('apt', '') or addr.get('aptNumber', ''),
                'city': addr.get('city', ''),
                'state': addr.get('state', ''),
                'zip': addr.get('zip', '') or addr.get('zipCode', '')
            }
        else:
            # Flat structure
            return {
                'street': data.get('address', ''),
                'apt': data.get('aptNumber', ''),
                'city': data.get('city', ''),
                'state': data.get('state', ''),
                'zip': data.get('zip', '') or data.get('zipCode', '')
            }
    
    def _format_full_name(self, first: str, last: str, middle: str = '') -> str:
        """
        Format a full name from components
        
        Args:
            first: First name
            last: Last name
            middle: Middle initial or name (optional)
            
        Returns:
            Formatted full name
        """
        parts = []
        if first:
            parts.append(first.strip())
        if middle:
            # Handle middle initial (single letter) or full middle name
            middle = middle.strip()
            if len(middle) == 1:
                parts.append(f"{middle}.")
            else:
                parts.append(middle)
        if last:
            parts.append(last.strip())
        
        return " ".join(parts)
    
    async def _get_all_form_data(self, employee_id: str, decrypt: bool = False) -> Dict[str, Any]:
        """
        Get all form data from various onboarding steps
        
        Args:
            employee_id: The employee's ID
            decrypt: Whether to decrypt sensitive fields
            
        Returns:
            Dictionary of all form data by step
        """
        form_data = {}
        
        # List of onboarding steps that contain form data
        form_steps = [
            'w4-form',
            'i9-form',
            'direct-deposit',
            'health-insurance',
            'emergency-contact',
            'company-policies',
            'weapons-policy'
        ]
        
        for step in form_steps:
            try:
                step_data = await self.supabase.get_onboarding_step_data(employee_id, step)
                if step_data and step_data.get('form_data'):
                    data = step_data['form_data']
                    
                    # Encryption disabled - return data as-is
                    # if decrypt and self.encryption_service:
                    #     data = await self._decrypt_form_data(step, data)
                    
                    form_data[step] = data
                    
            except Exception as e:
                logger.warning(f"Error getting {step} data for employee {employee_id}: {e}")
                continue
        
        return form_data
    
    async def _decrypt_sensitive_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in personal information
        
        Args:
            data: Data containing potentially encrypted fields
            
        Returns:
            Data with decrypted sensitive fields
        """
        try:
            # Encryption disabled - just return data as-is
            # if 'ssn' in data and data['ssn'] and data['ssn'] != '***-**-****':
            #     if isinstance(data['ssn'], dict):
            #         data['ssn'] = self.encryption_service.decrypt_field(data['ssn'], 'ssn')
            
            return data
            
        except Exception as e:
            logger.error(f"Error processing sensitive fields: {e}")
            return data
    
    async def _decrypt_form_data(self, form_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt sensitive fields in form data based on form type
        
        Args:
            form_type: Type of form (w4-form, direct-deposit, etc.)
            data: Form data containing potentially encrypted fields
            
        Returns:
            Data with decrypted sensitive fields
        """
        try:
            # Encryption disabled - account data is stored as plain text
            # if form_type == 'direct-deposit' and 'accountNumber' in data:
            #     if isinstance(data['accountNumber'], dict):
            #         data['accountNumber'] = self.encryption_service.decrypt_field(
            #             data['accountNumber'], 'accountNumber'
            #         )
            #     if 'routingNumber' in data and isinstance(data['routingNumber'], dict):
            #         data['routingNumber'] = self.encryption_service.decrypt_field(
            #             data['routingNumber'], 'routingNumber'
            #         )
            
            return data
            
        except Exception as e:
            logger.warning(f"Error processing {form_type} data: {e}")
            return data
    
    async def get_employee_name(self, employee_id: str) -> Tuple[str, str, str]:
        """
        Get employee name components from the most reliable source
        
        Args:
            employee_id: The employee's ID
            
        Returns:
            Tuple of (first_name, last_name, middle_initial)
        """
        try:
            # Try to get from personal info first (most reliable)
            personal_info = await self._get_personal_info(employee_id)
            
            if personal_info and personal_info.get('firstName'):
                return (
                    personal_info.get('firstName', ''),
                    personal_info.get('lastName', ''),
                    personal_info.get('middleInitial', '')
                )
            
            # Fallback to user data
            employee_data = await self.get_complete_employee_data(employee_id)
            user_data = employee_data.get('user_data', {})
            
            if user_data:
                return (
                    user_data.get('first_name', ''),
                    user_data.get('last_name', ''),
                    ''  # No middle initial in user data
                )
            
            # Last resort - return empty strings
            logger.warning(f"No name data found for employee {employee_id}")
            return ('', '', '')
            
        except Exception as e:
            logger.error(f"Error getting employee name: {e}")
            return ('', '', '')
    
    async def get_employee_full_name(self, employee_id: str) -> str:
        """
        Get formatted full name for an employee
        
        Args:
            employee_id: The employee's ID
            
        Returns:
            Formatted full name string
        """
        first, last, middle = await self.get_employee_name(employee_id)
        return self._format_full_name(first, last, middle)
    
    async def get_employee_for_pdf(self, employee_id: str, property_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get employee data specifically formatted for PDF generation
        
        Args:
            employee_id: The employee's ID
            property_id: Optional property ID for access control
            
        Returns:
            Employee data formatted for PDF generation
        """
        try:
            # Get complete data with decryption for PDF generation
            complete_data = await self.get_complete_employee_data(
                employee_id, 
                property_id, 
                include_encrypted=True
            )
            
            if not complete_data:
                return {}
            
            personal_info = complete_data.get('personal_info', {})
            address = personal_info.get('address', {})
            
            # Format data for PDF consumption
            pdf_data = {
                'employee_id': employee_id,
                'employee_number': complete_data.get('employee_number', ''),
                
                # Name fields
                'first_name': personal_info.get('firstName', ''),
                'last_name': personal_info.get('lastName', ''),
                'middle_initial': personal_info.get('middleInitial', ''),
                'full_name': personal_info.get('fullName', ''),
                
                # Personal details
                'date_of_birth': personal_info.get('dateOfBirth', ''),
                'ssn': personal_info.get('ssn', ''),
                'gender': personal_info.get('gender', ''),
                'marital_status': personal_info.get('maritalStatus', ''),
                
                # Contact information
                'email': personal_info.get('email', ''),
                'phone': personal_info.get('phone', ''),
                
                # Address
                'address_street': address.get('street', ''),
                'address_apt': address.get('apt', ''),
                'address_city': address.get('city', ''),
                'address_state': address.get('state', ''),
                'address_zip': address.get('zip', ''),
                
                # Form data
                'form_data': complete_data.get('form_data', {}),
                
                # Metadata
                'property_id': complete_data.get('property_id', ''),
                'created_at': complete_data.get('metadata', {}).get('created_at', '')
            }
            
            return pdf_data
            
        except Exception as e:
            logger.error(f"Error getting employee data for PDF: {e}")
            return {}
    
    def clear_cache(self, employee_id: Optional[str] = None):
        """
        Clear cached data for an employee or all employees
        
        Args:
            employee_id: Optional specific employee ID to clear
        """
        if employee_id:
            # Clear specific employee cache
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"employee_{employee_id}_")]
            for key in keys_to_remove:
                del self._cache[key]
            logger.info(f"Cleared cache for employee {employee_id}")
        else:
            # Clear all cache
            self._cache.clear()
            logger.info("Cleared all employee data cache")
    
    async def validate_employee_data_completeness(self, employee_id: str) -> Dict[str, Any]:
        """
        Validate that all required employee data is present
        
        Args:
            employee_id: The employee's ID
            
        Returns:
            Validation result with missing fields
        """
        try:
            data = await self.get_complete_employee_data(employee_id, include_encrypted=True)
            
            missing_fields = []
            warnings = []
            
            # Check personal info
            personal_info = data.get('personal_info', {})
            required_personal = ['firstName', 'lastName', 'dateOfBirth', 'ssn', 'email', 'phone']
            for field in required_personal:
                if not personal_info.get(field):
                    missing_fields.append(f"personal_info.{field}")
            
            # Check address
            address = personal_info.get('address', {})
            required_address = ['street', 'city', 'state', 'zip']
            for field in required_address:
                if not address.get(field):
                    missing_fields.append(f"address.{field}")
            
            # Check form data
            form_data = data.get('form_data', {})
            if not form_data.get('w4-form'):
                warnings.append("W-4 form not completed")
            if not form_data.get('i9-form'):
                warnings.append("I-9 form not completed")
            
            return {
                'is_complete': len(missing_fields) == 0,
                'missing_fields': missing_fields,
                'warnings': warnings,
                'employee_id': employee_id
            }
            
        except Exception as e:
            logger.error(f"Error validating employee data: {e}")
            return {
                'is_complete': False,
                'error': str(e),
                'employee_id': employee_id
            }

# Singleton instance
_employee_data_service = None

def get_employee_data_service(supabase_service: EnhancedSupabaseService) -> EmployeeDataService:
    """Get or create the singleton employee data service instance"""
    global _employee_data_service
    if _employee_data_service is None:
        _employee_data_service = EmployeeDataService(supabase_service)
    return _employee_data_service