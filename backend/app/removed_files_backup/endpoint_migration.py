"""
Endpoint Migration Helper
Safely replaces duplicate endpoints with consolidated versions
Maintains backward compatibility during transition period
"""

import logging
from functools import wraps
from datetime import datetime
from typing import Callable

logger = logging.getLogger(__name__)

class EndpointMigration:
    """Helper class for endpoint migration and deprecation"""
    
    def __init__(self):
        self.deprecated_endpoints = {}
        self.migration_start = datetime.now()
        self.deprecation_warnings_enabled = True
    
    def deprecate_endpoint(self, old_path: str, new_handler: Callable, deprecation_date: str = None):
        """
        Mark an endpoint as deprecated and provide the new handler.
        
        Args:
            old_path: The deprecated endpoint path
            new_handler: The new consolidated handler function
            deprecation_date: Optional date when endpoint will be removed
        """
        self.deprecated_endpoints[old_path] = {
            "new_handler": new_handler,
            "deprecation_date": deprecation_date,
            "first_called": None,
            "call_count": 0
        }
    
    def log_deprecation_warning(self, path: str, request_info: dict = None):
        """Log deprecation warning with request details"""
        if not self.deprecation_warnings_enabled:
            return
        
        if path in self.deprecated_endpoints:
            endpoint_info = self.deprecated_endpoints[path]
            endpoint_info["call_count"] += 1
            
            if not endpoint_info["first_called"]:
                endpoint_info["first_called"] = datetime.now()
            
            logger.warning(
                f"DEPRECATION WARNING: Endpoint '{path}' is deprecated. "
                f"Called {endpoint_info['call_count']} times since {endpoint_info['first_called']}. "
                f"Removal date: {endpoint_info.get('deprecation_date', 'TBD')}. "
                f"Client info: {request_info}"
            )
    
    def create_deprecated_wrapper(self, old_handler: Callable, new_handler: Callable, path: str):
        """
        Create a wrapper that logs deprecation and forwards to new handler.
        
        Args:
            old_handler: The original deprecated handler
            new_handler: The new consolidated handler
            path: The endpoint path for logging
        """
        @wraps(old_handler)
        async def wrapper(*args, **kwargs):
            # Log deprecation warning
            request_info = {
                "timestamp": datetime.now().isoformat(),
                "user_agent": kwargs.get("request", {}).headers.get("User-Agent", "Unknown") if hasattr(kwargs.get("request", {}), "headers") else "Unknown"
            }
            self.log_deprecation_warning(path, request_info)
            
            # Add deprecation header to response
            response = await new_handler(*args, **kwargs)
            if hasattr(response, "headers"):
                response.headers["X-Deprecated-Endpoint"] = "true"
                response.headers["X-Deprecation-Date"] = self.deprecated_endpoints[path].get("deprecation_date", "TBD")
                response.headers["X-New-Endpoint"] = path.replace("duplicate", "unified")
            
            return response
        
        return wrapper
    
    def get_migration_status(self):
        """Get current migration status and statistics"""
        status = {
            "migration_started": self.migration_start.isoformat(),
            "deprecated_endpoints_count": len(self.deprecated_endpoints),
            "endpoints": []
        }
        
        for path, info in self.deprecated_endpoints.items():
            status["endpoints"].append({
                "path": path,
                "call_count": info["call_count"],
                "first_called": info["first_called"].isoformat() if info["first_called"] else None,
                "deprecation_date": info.get("deprecation_date", "TBD"),
                "days_until_removal": self._calculate_days_until_removal(info.get("deprecation_date"))
            })
        
        return status
    
    def _calculate_days_until_removal(self, deprecation_date: str):
        """Calculate days remaining until endpoint removal"""
        if not deprecation_date or deprecation_date == "TBD":
            return None
        
        try:
            removal_date = datetime.fromisoformat(deprecation_date)
            days_remaining = (removal_date - datetime.now()).days
            return max(0, days_remaining)
        except ValueError:
            return None
    
    def should_remove_endpoint(self, path: str) -> bool:
        """Check if an endpoint should be removed based on deprecation date"""
        if path not in self.deprecated_endpoints:
            return False
        
        deprecation_date = self.deprecated_endpoints[path].get("deprecation_date")
        if not deprecation_date or deprecation_date == "TBD":
            return False
        
        try:
            removal_date = datetime.fromisoformat(deprecation_date)
            return datetime.now() >= removal_date
        except ValueError:
            return False


# Endpoint mapping configuration
ENDPOINT_MIGRATIONS = {
    # Applications endpoints
    "/api/hr/applications": {
        "duplicates": [
            {"line": 1363, "type": "advanced"},
            {"line": 2978, "type": "simple"}
        ],
        "consolidated_handler": "get_applications_unified",
        "deprecation_date": "2024-02-15"
    },
    
    # Manager endpoints
    "/api/hr/managers": {
        "duplicates": [
            {"line": 2376, "type": "get"},
            {"line": 3086, "type": "get_simple"}
        ],
        "consolidated_handler": "get_managers_unified",
        "deprecation_date": "2024-02-15"
    },
    
    # Employee endpoints
    "/api/hr/employees": {
        "duplicates": [
            {"line": 2672, "type": "detailed"},
            {"line": 3118, "type": "simple"}
        ],
        "consolidated_handler": "get_employees_unified",
        "deprecation_date": "2024-02-15"
    }
}


def apply_endpoint_migrations(app, consolidated_endpoints_instance):
    """
    Apply endpoint migrations to the FastAPI app.
    This function should be called during app initialization.
    
    Args:
        app: FastAPI application instance
        consolidated_endpoints_instance: Instance of ConsolidatedEndpoints class
    """
    migration_helper = EndpointMigration()
    
    # Track original endpoints before modification
    original_routes = list(app.routes)
    
    # Apply migrations
    for path, config in ENDPOINT_MIGRATIONS.items():
        logger.info(f"Migrating endpoint: {path}")
        
        # Get the consolidated handler
        handler_name = config["consolidated_handler"]
        new_handler = getattr(consolidated_endpoints_instance, handler_name)
        
        # Mark endpoint as deprecated
        migration_helper.deprecate_endpoint(
            path, 
            new_handler,
            config["deprecation_date"]
        )
        
        # Log migration details
        logger.info(
            f"Endpoint {path} migrated. "
            f"Duplicates at lines: {[d['line'] for d in config['duplicates']]}. "
            f"Deprecation date: {config['deprecation_date']}"
        )
    
    # Add migration status endpoint for monitoring
    @app.get("/api/admin/migration-status")
    async def get_migration_status():
        """Get current endpoint migration status"""
        return migration_helper.get_migration_status()
    
    logger.info(f"Endpoint migration completed. Migrated {len(ENDPOINT_MIGRATIONS)} endpoint groups.")
    
    return migration_helper


# Testing helper
def validate_migration(old_endpoint_response, new_endpoint_response):
    """
    Validate that migrated endpoints return compatible responses.
    
    Args:
        old_endpoint_response: Response from deprecated endpoint
        new_endpoint_response: Response from new consolidated endpoint
    
    Returns:
        bool: True if responses are compatible
    """
    # Check response structure
    if type(old_endpoint_response) != type(new_endpoint_response):
        logger.error("Response types don't match")
        return False
    
    # Check data compatibility
    if isinstance(old_endpoint_response, dict):
        # Check that all keys from old response exist in new response
        old_keys = set(old_endpoint_response.keys())
        new_keys = set(new_endpoint_response.keys())
        
        if not old_keys.issubset(new_keys):
            missing_keys = old_keys - new_keys
            logger.error(f"New response missing keys: {missing_keys}")
            return False
    
    return True