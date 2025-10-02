"""
Routing Number Validation Service

This module provides routing number validation and bank lookup functionality,
including ABA checksum validation, local database lookup, and caching.
"""

import json
import os
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
import hashlib
from pathlib import Path

logger = logging.getLogger(__name__)

class RoutingValidator:
    """
    Validates US bank routing numbers and provides bank information lookup.
    """
    
    def __init__(self, cache_service=None):
        """
        Initialize the routing validator.
        
        Args:
            cache_service: Optional cache service for storing validated routing numbers
        """
        self.cache_service = cache_service
        self.bank_database = self._load_bank_database()
        self.validation_cache = {}
        
    def _load_bank_database(self) -> Dict[str, Dict]:
        """
        Load the bank routing database from JSON file.
        """
        try:
            # Try to load from frontend's data directory first
            frontend_path = Path(__file__).parent.parent.parent / 'hotel-onboarding-frontend' / 'src' / 'data' / 'us-banks-routing.json'
            
            if frontend_path.exists():
                with open(frontend_path, 'r') as f:
                    data = json.load(f)
                    # Convert to dict for faster lookup
                    bank_dict = {}
                    for bank in data.get('banks', []):
                        bank_dict[bank['routing']] = bank
                    logger.info(f"Loaded {len(bank_dict)} banks from database")
                    return bank_dict
            else:
                # Fallback to a minimal set of major banks
                logger.warning("Bank database file not found, using minimal fallback")
                return self._get_fallback_banks()
                
        except Exception as e:
            logger.error(f"Error loading bank database: {e}")
            return self._get_fallback_banks()
    
    def _get_fallback_banks(self) -> Dict[str, Dict]:
        """
        Return a minimal set of major US banks as fallback.
        """
        return {
            "021000021": {
                "routing": "021000021",
                "bank_name": "JPMorgan Chase Bank, N.A.",
                "short_name": "Chase",
                "ach_supported": True,
                "wire_supported": True,
                "state": "NY",
                "verified": True
            },
            "026009593": {
                "routing": "026009593",
                "bank_name": "Bank of America, N.A.",
                "short_name": "Bank of America",
                "ach_supported": True,
                "wire_supported": True,
                "state": "NC",
                "verified": True
            },
            "121000248": {
                "routing": "121000248",
                "bank_name": "Wells Fargo Bank, N.A.",
                "short_name": "Wells Fargo",
                "ach_supported": True,
                "wire_supported": True,
                "state": "CA",
                "verified": True
            },
            "021000089": {
                "routing": "021000089",
                "bank_name": "Citibank N.A.",
                "short_name": "Citibank",
                "ach_supported": True,
                "wire_supported": True,
                "state": "NY",
                "verified": True
            },
            "071000013": {
                "routing": "071000013",
                "bank_name": "U.S. Bank N.A.",
                "short_name": "US Bank",
                "ach_supported": True,
                "wire_supported": True,
                "state": "MN",
                "verified": True
            }
        }
    
    def validate_aba_checksum(self, routing_number: str) -> bool:
        """
        Validate routing number using ABA checksum algorithm.
        
        Args:
            routing_number: 9-digit routing number string
            
        Returns:
            True if valid, False otherwise
        """
        # Remove any non-digit characters
        cleaned = ''.join(filter(str.isdigit, routing_number))
        
        # Must be exactly 9 digits
        if len(cleaned) != 9:
            return False
        
        # ABA checksum algorithm
        weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
        total = sum(int(cleaned[i]) * weights[i] for i in range(9))
        
        return total % 10 == 0
    
    async def validate_routing_number(self, routing_number: str) -> Dict[str, Any]:
        """
        Validate a routing number and return bank information.
        
        Args:
            routing_number: The routing number to validate
            
        Returns:
            Dictionary containing validation result and bank information
        """
        # Clean the routing number
        cleaned = ''.join(filter(str.isdigit, routing_number))
        
        # Check basic format
        if len(cleaned) != 9:
            return {
                "valid": False,
                "error": "Routing number must be 9 digits",
                "routing_number": routing_number
            }
        
        # Validate checksum
        if not self.validate_aba_checksum(cleaned):
            return {
                "valid": False,
                "error": "Invalid routing number (checksum failed)",
                "routing_number": cleaned
            }
        
        # Check cache if available
        if self.cache_service:
            try:
                cache_key = f"routing:{cleaned}"
                cached = await self.cache_service.get(cache_key)
                if cached:
                    result = json.loads(cached)
                    result["source"] = "cache"
                    return result
            except Exception as e:
                logger.warning(f"Cache error: {e}")
        
        # Check local database
        bank_info = self.bank_database.get(cleaned)
        
        if bank_info:
            result = {
                "valid": True,
                "routing_number": cleaned,
                "bank": bank_info,
                "source": "database"
            }
        else:
            # Routing number passes checksum but not in our database
            # Still valid, but we don't have bank details
            result = {
                "valid": True,
                "routing_number": cleaned,
                "bank": {
                    "routing": cleaned,
                    "bank_name": "Valid routing number (Bank details unavailable)",
                    "short_name": "Unknown Bank",
                    "ach_supported": True,  # Assume ACH support
                    "wire_supported": False,  # Don't assume wire support
                    "state": "",
                    "verified": False
                },
                "source": "checksum_only",
                "warning": "Routing number is valid but bank details could not be verified"
            }
        
        # Cache the result if cache service is available
        if self.cache_service and result["valid"]:
            try:
                cache_key = f"routing:{cleaned}"
                # Cache for 24 hours
                await self.cache_service.setex(
                    cache_key,
                    86400,
                    json.dumps(result)
                )
            except Exception as e:
                logger.warning(f"Failed to cache result: {e}")
        
        return result
    
    def search_banks_by_name(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search for banks by name.
        
        Args:
            query: Search query string
            limit: Maximum number of results to return
            
        Returns:
            List of matching banks
        """
        if not query or len(query) < 2:
            return []
        
        query_lower = query.lower()
        results = []
        
        for bank_info in self.bank_database.values():
            if (query_lower in bank_info.get('bank_name', '').lower() or
                query_lower in bank_info.get('short_name', '').lower()):
                results.append(bank_info)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_popular_banks(self) -> List[Dict]:
        """
        Get a list of popular banks for quick selection.
        
        Returns:
            List of popular banks
        """
        popular_routing_numbers = [
            "021000021",  # Chase
            "026009593",  # Bank of America
            "121000248",  # Wells Fargo
            "021000089",  # Citibank
            "071000013",  # US Bank
            "031100649",  # Capital One
            "256074974",  # Navy Federal
            "124303120",  # Ally Bank
            "084003997",  # USAA
            "271070801",  # Chime
        ]
        
        popular_banks = []
        for routing in popular_routing_numbers:
            bank = self.bank_database.get(routing)
            if bank:
                popular_banks.append(bank)
        
        return popular_banks
    
    def get_bank_warnings(self, routing_number: str) -> List[str]:
        """
        Get any warnings or special notes about a bank.
        
        Args:
            routing_number: The routing number to check
            
        Returns:
            List of warning messages
        """
        warnings = []
        bank = self.bank_database.get(routing_number)
        
        if bank:
            bank_name_lower = bank.get('bank_name', '').lower()
            short_name = bank.get('short_name', '')
            
            # Check for credit unions
            if 'credit union' in bank_name_lower:
                warnings.append("Credit union detected. Some features may be limited.")
            
            # Check for online-only banks
            online_banks = ['Chime', 'Ally Bank', 'SoFi', 'Discover', 'Cash App', 'Venmo', 'PayPal']
            if any(name in short_name for name in online_banks):
                warnings.append("Online bank detected. Ensure account supports direct deposit.")
            
            # Check for payment apps
            payment_apps = ['Cash App', 'Venmo', 'PayPal', 'Green Dot']
            if any(name in short_name for name in payment_apps):
                warnings.append("Payment app detected. Please verify this is a checking account.")
            
            # Check for wire support
            if not bank.get('wire_supported', False):
                warnings.append("This bank may not support wire transfers.")
            
            # Check for ACH support
            if not bank.get('ach_supported', True):
                warnings.append("This bank may not support ACH transfers.")
        
        return warnings
    
    async def log_validation(self, routing_number: str, result: Dict, 
                            employee_id: Optional[str] = None,
                            ip_address: Optional[str] = None,
                            user_agent: Optional[str] = None) -> None:
        """
        Log a routing number validation for audit purposes.
        
        Args:
            routing_number: The routing number that was validated
            result: The validation result
            employee_id: Optional employee ID
            ip_address: Optional IP address
            user_agent: Optional user agent string
        """
        try:
            # Mask the routing number for privacy (show only last 4 digits)
            masked_routing = f"***{routing_number[-4:]}" if len(routing_number) >= 4 else "****"
            
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "masked_routing": masked_routing,
                "valid": result.get("valid", False),
                "source": result.get("source", "unknown"),
                "employee_id": employee_id,
                "ip_address": ip_address,
                "user_agent": user_agent
            }
            
            logger.info(f"Routing validation: {json.dumps(log_entry)}")
            
            # If you have a database connection, you could also log to database here
            # await db.routing_validation_log.insert(log_entry)
            
        except Exception as e:
            logger.error(f"Failed to log routing validation: {e}")
    
    def reload_database(self) -> None:
        """
        Reload the bank database from file.
        Useful for updating the database without restarting the server.
        """
        self.bank_database = self._load_bank_database()
        self.validation_cache.clear()
        logger.info("Bank database reloaded")

# Create a singleton instance
_validator_instance = None

def get_routing_validator(cache_service=None) -> RoutingValidator:
    """
    Get or create the singleton routing validator instance.
    
    Args:
        cache_service: Optional cache service
        
    Returns:
        RoutingValidator instance
    """
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = RoutingValidator(cache_service)
    return _validator_instance