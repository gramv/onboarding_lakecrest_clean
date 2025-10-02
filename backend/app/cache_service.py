"""
Simple in-memory cache service for frequently accessed data
"""
import time
from typing import Any, Dict, Optional
from functools import wraps
import hashlib
import json

class CacheService:
    """Simple in-memory cache with TTL support"""
    
    def __init__(self, default_ttl: int = 60):
        """
        Initialize cache service
        
        Args:
            default_ttl: Default time-to-live in seconds (default: 60)
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self.cache:
            entry = self.cache[key]
            if time.time() < entry['expires_at']:
                return entry['value']
            else:
                # Expired, remove from cache
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        ttl = ttl or self.default_ttl
        self.cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl
        }
    
    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()
    
    def delete(self, key: str) -> None:
        """Delete specific cache entry"""
        if key in self.cache:
            del self.cache[key]
    
    def make_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = {
            'args': args,
            'kwargs': kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()

# Global cache instance
cache = CacheService(default_ttl=5)  # 5 second cache for API responses - reduced for better real-time updates

def cached(ttl: Optional[int] = None):
    """
    Decorator to cache function results
    
    Args:
        ttl: Time-to-live in seconds (uses default if not specified)
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{func.__module__}.{func.__name__}:{cache.make_key(*args, **kwargs)}"
            
            # Check cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{func.__module__}.{func.__name__}:{cache.make_key(*args, **kwargs)}"
            
            # Check cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

import asyncio