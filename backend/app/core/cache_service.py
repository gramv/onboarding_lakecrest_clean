"""
Redis Cache Service with WebSocket Bypass
Phase 4: Cache Optimization
Improves performance while preserving real-time notifications
"""

import json
import logging
import os
from typing import Optional, Any, Dict, List, Callable, Union
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import asyncio
import pickle

try:
    import redis
    from redis.asyncio import Redis as AsyncRedis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    logging.warning("Redis not installed. Cache will be disabled.")

from ..response_utils import success_response

logger = logging.getLogger(__name__)


class CacheConfig:
    """Cache configuration and TTL settings"""
    
    # TTL settings (in seconds)
    TTL_DASHBOARD_STATS = 300  # 5 minutes
    TTL_PROPERTY_LIST = 600    # 10 minutes
    TTL_USER_PERMISSIONS = 300  # 5 minutes
    TTL_AGGREGATE_COUNTS = 300  # 5 minutes
    TTL_DEPARTMENTS = 1800     # 30 minutes
    TTL_POSITIONS = 1800       # 30 minutes
    
    # Cache prefixes
    PREFIX_STATS = "stats:"
    PREFIX_PROPERTY = "property:"
    PREFIX_PERMISSIONS = "perms:"
    PREFIX_APPLICATIONS = "apps:"
    PREFIX_EMPLOYEES = "emp:"
    PREFIX_COUNTS = "count:"
    
    # What NOT to cache (real-time data)
    NO_CACHE_PATTERNS = [
        "websocket",
        "notification",
        "new_application",
        "status_change",
        "real_time",
        "compliance",
        "i9",
        "w4",
        "signature",
        "audit"
    ]
    
    @classmethod
    def should_bypass_cache(cls, key: str) -> bool:
        """Check if a key should bypass cache (for real-time data)"""
        key_lower = key.lower()
        return any(pattern in key_lower for pattern in cls.NO_CACHE_PATTERNS)


class SmartCacheService:
    """
    Redis-based cache service that preserves real-time functionality
    """
    
    def __init__(self):
        self.redis_client = None
        self.async_redis_client = None
        self.enabled = False
        self.stats = {
            "hits": 0,
            "misses": 0,
            "bypasses": 0,
            "invalidations": 0
        }
        
        if HAS_REDIS:
            try:
                # Initialize Redis connections
                redis_host = os.getenv("REDIS_HOST", "localhost")
                redis_port = int(os.getenv("REDIS_PORT", 6379))
                redis_db = int(os.getenv("REDIS_DB", 0))
                redis_password = os.getenv("REDIS_PASSWORD")
                
                # Sync client for simple operations
                self.redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    password=redis_password,
                    decode_responses=True,
                    max_connections=50
                )
                
                # Async client for async operations
                self.async_redis_client = AsyncRedis(
                    host=redis_host,
                    port=redis_port,
                    db=redis_db,
                    password=redis_password,
                    decode_responses=True,
                    max_connections=50
                )
                
                # Test connection
                self.redis_client.ping()
                self.enabled = True
                logger.info(f"✅ Redis cache connected to {redis_host}:{redis_port}")
                
            except Exception as e:
                logger.warning(f"⚠️ Redis connection failed: {e}. Cache disabled.")
                self.enabled = False
        else:
            logger.info("ℹ️ Redis not available. Cache disabled.")
    
    # ==========================================
    # Core Cache Operations
    # ==========================================
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        
        # Check if this should bypass cache (real-time data)
        if CacheConfig.should_bypass_cache(key):
            self.stats["bypasses"] += 1
            logger.debug(f"Cache bypass for real-time key: {key}")
            return None
        
        try:
            value = await self.async_redis_client.get(key)
            if value:
                self.stats["hits"] += 1
                logger.debug(f"Cache hit: {key}")
                # Try to deserialize JSON
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            else:
                self.stats["misses"] += 1
                logger.debug(f"Cache miss: {key}")
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        skip_if_realtime: bool = True
    ) -> bool:
        """Set value in cache with TTL"""
        if not self.enabled:
            return False
        
        # Don't cache real-time data
        if skip_if_realtime and CacheConfig.should_bypass_cache(key):
            logger.debug(f"Skipping cache for real-time key: {key}")
            return False
        
        try:
            # Serialize to JSON if possible
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            
            # Set with TTL
            if ttl:
                await self.async_redis_client.setex(key, ttl, value)
            else:
                await self.async_redis_client.set(key, value)
            
            logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.enabled:
            return False
        
        try:
            result = await self.async_redis_client.delete(key)
            if result:
                self.stats["invalidations"] += 1
                logger.debug(f"Cache invalidated: {key}")
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        if not self.enabled:
            return 0
        
        try:
            # Find all matching keys
            keys = []
            async for key in self.async_redis_client.scan_iter(match=pattern):
                keys.append(key)
            
            # Delete all found keys
            if keys:
                deleted = await self.async_redis_client.delete(*keys)
                self.stats["invalidations"] += deleted
                logger.info(f"Cache invalidated {deleted} keys matching: {pattern}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache pattern invalidation error for {pattern}: {e}")
            return 0
    
    # ==========================================
    # Smart Invalidation for New Data
    # ==========================================
    
    async def invalidate_on_new_application(self, property_id: str):
        """Invalidate caches when new application arrives"""
        
        # Invalidate property-specific caches
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_STATS}property:{property_id}*")
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_COUNTS}applications:{property_id}*")
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_APPLICATIONS}{property_id}*")
        
        # Invalidate aggregate stats
        await self.delete(f"{CacheConfig.PREFIX_STATS}dashboard:hr")
        await self.delete(f"{CacheConfig.PREFIX_COUNTS}total_applications")
        
        logger.info(f"Cache invalidated for new application in property: {property_id}")
    
    async def invalidate_on_status_change(
        self, 
        property_id: str, 
        application_id: str,
        old_status: str,
        new_status: str
    ):
        """Invalidate caches when application status changes"""
        
        # Invalidate status-specific counts
        await self.delete(f"{CacheConfig.PREFIX_COUNTS}status:{old_status}")
        await self.delete(f"{CacheConfig.PREFIX_COUNTS}status:{new_status}")
        
        # Invalidate property stats
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_STATS}property:{property_id}*")
        
        # Invalidate application lists
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_APPLICATIONS}*status:{old_status}*")
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_APPLICATIONS}*status:{new_status}*")
        
        logger.info(f"Cache invalidated for status change: {old_status} -> {new_status}")
    
    async def invalidate_on_employee_update(self, property_id: str, employee_id: str):
        """Invalidate caches when employee data updates"""
        
        await self.delete(f"{CacheConfig.PREFIX_EMPLOYEES}{employee_id}")
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_EMPLOYEES}property:{property_id}*")
        await self.invalidate_pattern(f"{CacheConfig.PREFIX_STATS}property:{property_id}*")
        
        logger.info(f"Cache invalidated for employee update: {employee_id}")
    
    # ==========================================
    # Decorator for Automatic Caching
    # ==========================================
    
    def cache_result(
        self,
        ttl: int = 300,
        key_prefix: str = "",
        skip_if_realtime: bool = True
    ):
        """
        Decorator to cache function results
        
        Usage:
            @cache_service.cache_result(ttl=300, key_prefix="dashboard")
            async def get_dashboard_stats(...):
                # expensive operation
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key from function name and arguments
                cache_key = self._generate_cache_key(
                    func.__name__, 
                    args, 
                    kwargs,
                    prefix=key_prefix
                )
                
                # Skip cache for real-time data
                if skip_if_realtime and CacheConfig.should_bypass_cache(cache_key):
                    return await func(*args, **kwargs)
                
                # Try to get from cache
                cached_result = await self.get(cache_key)
                if cached_result is not None:
                    # Add cache header to response if it's a response object
                    if isinstance(cached_result, dict) and "headers" not in cached_result:
                        cached_result["X-Cache"] = "HIT"
                    return cached_result
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Cache the result
                await self.set(cache_key, result, ttl)
                
                # Add cache header
                if isinstance(result, dict):
                    result["X-Cache"] = "MISS"
                
                return result
            
            return wrapper
        return decorator
    
    # ==========================================
    # Specific Cache Methods
    # ==========================================
    
    async def cache_dashboard_stats(
        self,
        user_id: str,
        role: str,
        stats: Dict[str, Any]
    ) -> bool:
        """Cache dashboard statistics"""
        
        key = f"{CacheConfig.PREFIX_STATS}dashboard:{role}:{user_id}"
        return await self.set(key, stats, CacheConfig.TTL_DASHBOARD_STATS)
    
    async def get_cached_dashboard_stats(
        self,
        user_id: str,
        role: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached dashboard statistics"""
        
        key = f"{CacheConfig.PREFIX_STATS}dashboard:{role}:{user_id}"
        return await self.get(key)
    
    async def cache_property_data(
        self,
        property_id: str,
        data: Dict[str, Any]
    ) -> bool:
        """Cache property-specific data"""
        
        key = f"{CacheConfig.PREFIX_PROPERTY}{property_id}:data"
        return await self.set(key, data, CacheConfig.TTL_PROPERTY_LIST)
    
    async def cache_user_permissions(
        self,
        user_id: str,
        permissions: List[str]
    ) -> bool:
        """Cache user permissions"""
        
        key = f"{CacheConfig.PREFIX_PERMISSIONS}{user_id}"
        return await self.set(key, permissions, CacheConfig.TTL_USER_PERMISSIONS)
    
    # ==========================================
    # Utility Methods
    # ==========================================
    
    def _generate_cache_key(
        self,
        func_name: str,
        args: tuple,
        kwargs: dict,
        prefix: str = ""
    ) -> str:
        """Generate consistent cache key from function arguments"""
        
        # Create a string representation of arguments
        key_parts = [func_name]
        
        # Add prefix if provided
        if prefix:
            key_parts.insert(0, prefix)
        
        # Add positional arguments (skip self, request objects)
        for arg in args:
            if not hasattr(arg, '__class__') or arg.__class__.__name__ not in ['Request', 'User']:
                key_parts.append(str(arg))
        
        # Add keyword arguments
        for k, v in sorted(kwargs.items()):
            if k not in ['request', 'current_user', 'db']:
                key_parts.append(f"{k}:{v}")
        
        # Generate hash for long keys
        key_str = ":".join(key_parts)
        if len(key_str) > 200:
            key_hash = hashlib.md5(key_str.encode()).hexdigest()[:8]
            return f"{key_parts[0]}:{key_hash}"
        
        return key_str
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0
        
        return {
            "enabled": self.enabled,
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "bypasses": self.stats["bypasses"],
            "invalidations": self.stats["invalidations"],
            "hit_rate": f"{hit_rate:.2f}%",
            "total_requests": total
        }
    
    def reset_stats(self):
        """Reset cache statistics"""
        self.stats = {
            "hits": 0,
            "misses": 0,
            "bypasses": 0,
            "invalidations": 0
        }
    
    async def flush_all(self):
        """Clear all cached data (use with caution)"""
        if not self.enabled:
            return False
        
        try:
            await self.async_redis_client.flushdb()
            logger.warning("⚠️ All cache data flushed")
            return True
        except Exception as e:
            logger.error(f"Cache flush error: {e}")
            return False
    
    async def close(self):
        """Close Redis connections"""
        if self.async_redis_client:
            await self.async_redis_client.close()
        if self.redis_client:
            self.redis_client.close()


# Global cache service instance
cache_service = SmartCacheService()


# ==========================================
# Cache Middleware for FastAPI
# ==========================================

class CacheMiddleware:
    """Middleware to add cache headers and stats to responses"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request, call_next):
        # Skip WebSocket connections
        if request.url.path.startswith("/ws"):
            return await call_next(request)
        
        # Check if this is a real-time endpoint
        is_realtime = any(
            pattern in request.url.path.lower() 
            for pattern in CacheConfig.NO_CACHE_PATTERNS
        )
        
        if is_realtime:
            # Add no-cache headers for real-time endpoints
            response = await call_next(request)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["X-Cache-Status"] = "BYPASS-REALTIME"
            return response
        
        # Process normally for cacheable endpoints
        response = await call_next(request)
        
        # Add cache stats header if in debug mode
        if os.getenv("DEBUG") == "true":
            stats = cache_service.get_stats()
            response.headers["X-Cache-Stats"] = f"H:{stats['hits']} M:{stats['misses']} B:{stats['bypasses']}"
        
        return response