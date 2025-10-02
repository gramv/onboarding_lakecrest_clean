#!/usr/bin/env python3
"""
Analytics Cache Service
Redis-based caching layer for analytics data with intelligent invalidation

Features:
- Multi-level caching (L1: memory, L2: Redis)
- Cache warming and precomputation
- Intelligent cache invalidation
- Cache analytics and monitoring
- Distributed cache coordination
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import pickle
import redis
from redis.exceptions import RedisError
import threading
from functools import wraps
import time

logger = logging.getLogger(__name__)

# =====================================
# CACHE CONFIGURATION AND TYPES
# =====================================

class CacheLevel(str, Enum):
    MEMORY = "memory"
    REDIS = "redis"
    BOTH = "both"

class CacheStrategy(str, Enum):
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"
    WRITE_AROUND = "write_around"

class InvalidationStrategy(str, Enum):
    TTL = "ttl"
    EVENT_BASED = "event_based"
    MANUAL = "manual"
    HYBRID = "hybrid"

@dataclass
class CacheConfig:
    """Cache configuration for different data types"""
    key_prefix: str
    ttl_seconds: int
    max_memory_items: int = 1000
    compression: bool = False
    serialization: str = "json"  # json, pickle
    invalidation_strategy: InvalidationStrategy = InvalidationStrategy.TTL
    cache_level: CacheLevel = CacheLevel.BOTH
    precompute: bool = False

@dataclass
class CacheStats:
    """Cache performance statistics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    memory_usage_bytes: int = 0
    redis_usage_bytes: int = 0
    hit_rate: float = 0.0
    avg_response_time_ms: float = 0.0

@dataclass
class CacheEntry:
    """Individual cache entry with metadata"""
    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    last_accessed: datetime = None
    size_bytes: int = 0
    metadata: Dict[str, Any] = None

# =====================================
# ANALYTICS CACHE SERVICE
# =====================================

class AnalyticsCache:
    """
    Comprehensive caching service for analytics data
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        """Initialize Analytics Cache"""
        
        # Redis client setup
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = None
        self.redis_available = False
        
        # Memory cache (L1)
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.memory_lock = threading.RLock()
        
        # Cache configurations for different data types
        self.cache_configs = self._initialize_cache_configs()
        
        # Performance statistics
        self.stats = CacheStats()
        self.stats_lock = threading.Lock()
        
        # Background tasks
        self.cleanup_task = None
        self.precompute_task = None
        
        # Event listeners for cache invalidation
        self.invalidation_listeners: Dict[str, List[Callable]] = {}
        
        # Initialize Redis connection
        asyncio.create_task(self._initialize_redis())
        
        logger.info("✅ Analytics Cache initialized")
    
    def _initialize_cache_configs(self) -> Dict[str, CacheConfig]:
        """Initialize cache configurations for different data types"""
        return {
            "metrics": CacheConfig(
                key_prefix="analytics:metrics",
                ttl_seconds=300,  # 5 minutes
                max_memory_items=500,
                compression=True,
                precompute=True
            ),
            "dimensions": CacheConfig(
                key_prefix="analytics:dimensions",
                ttl_seconds=600,  # 10 minutes
                max_memory_items=200,
                compression=True
            ),
            "time_series": CacheConfig(
                key_prefix="analytics:timeseries",
                ttl_seconds=900,  # 15 minutes
                max_memory_items=100,
                compression=True,
                serialization="pickle"
            ),
            "trends": CacheConfig(
                key_prefix="analytics:trends",
                ttl_seconds=1800,  # 30 minutes
                max_memory_items=100,
                compression=True
            ),
            "insights": CacheConfig(
                key_prefix="analytics:insights",
                ttl_seconds=3600,  # 1 hour
                max_memory_items=50,
                compression=True
            ),
            "forecasts": CacheConfig(
                key_prefix="analytics:forecasts",
                ttl_seconds=7200,  # 2 hours
                max_memory_items=50,
                compression=True,
                serialization="pickle"
            ),
            "reports": CacheConfig(
                key_prefix="analytics:reports",
                ttl_seconds=1800,  # 30 minutes
                max_memory_items=100,
                compression=True
            )
        }
    
    async def _initialize_redis(self):
        """Initialize Redis connection with retry logic"""
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                self.redis_client = redis.from_url(
                    self.redis_url,
                    decode_responses=False,  # We handle encoding ourselves
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                
                # Test connection
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.ping
                )
                
                self.redis_available = True
                logger.info("✅ Redis connection established for analytics cache")
                
                # Start background tasks
                await self._start_background_tasks()
                break
                
            except Exception as e:
                logger.warning(f"Redis connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (2 ** attempt))
                else:
                    logger.error("Redis unavailable, using memory-only cache")
                    self.redis_available = False
    
    async def _start_background_tasks(self):
        """Start background maintenance tasks"""
        if self.cleanup_task is None:
            self.cleanup_task = asyncio.create_task(self._cleanup_expired_entries())
        
        if self.precompute_task is None:
            self.precompute_task = asyncio.create_task(self._precompute_popular_queries())
    
    # =====================================
    # CORE CACHE OPERATIONS
    # =====================================
    
    async def get(self, cache_type: str, key: str, default: Any = None) -> Any:
        """Get value from cache with multi-level lookup"""
        start_time = time.time()
        
        try:
            config = self.cache_configs.get(cache_type)
            if not config:
                logger.warning(f"Unknown cache type: {cache_type}")
                return default
            
            full_key = f"{config.key_prefix}:{key}"
            
            # Try memory cache first (L1)
            if config.cache_level in [CacheLevel.MEMORY, CacheLevel.BOTH]:
                memory_result = await self._get_from_memory(full_key)
                if memory_result is not None:
                    await self._update_stats("hit", time.time() - start_time)
                    return memory_result
            
            # Try Redis cache (L2)
            if config.cache_level in [CacheLevel.REDIS, CacheLevel.BOTH] and self.redis_available:
                redis_result = await self._get_from_redis(full_key, config)
                if redis_result is not None:
                    # Populate memory cache for faster future access
                    if config.cache_level == CacheLevel.BOTH:
                        await self._set_in_memory(full_key, redis_result, config)
                    
                    await self._update_stats("hit", time.time() - start_time)
                    return redis_result
            
            # Cache miss
            await self._update_stats("miss", time.time() - start_time)
            return default
            
        except Exception as e:
            logger.error(f"Error getting from cache {cache_type}:{key}: {e}")
            await self._update_stats("miss", time.time() - start_time)
            return default
    
    async def set(self, cache_type: str, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with multi-level storage"""
        try:
            config = self.cache_configs.get(cache_type)
            if not config:
                logger.warning(f"Unknown cache type: {cache_type}")
                return False
            
            full_key = f"{config.key_prefix}:{key}"
            effective_ttl = ttl or config.ttl_seconds
            
            success = True
            
            # Set in memory cache (L1)
            if config.cache_level in [CacheLevel.MEMORY, CacheLevel.BOTH]:
                memory_success = await self._set_in_memory(full_key, value, config, effective_ttl)
                success = success and memory_success
            
            # Set in Redis cache (L2)
            if config.cache_level in [CacheLevel.REDIS, CacheLevel.BOTH] and self.redis_available:
                redis_success = await self._set_in_redis(full_key, value, config, effective_ttl)
                success = success and redis_success
            
            if success:
                await self._update_stats("set")
            
            return success
            
        except Exception as e:
            logger.error(f"Error setting cache {cache_type}:{key}: {e}")
            return False
    
    async def delete(self, cache_type: str, key: str) -> bool:
        """Delete value from cache"""
        try:
            config = self.cache_configs.get(cache_type)
            if not config:
                return False
            
            full_key = f"{config.key_prefix}:{key}"
            success = True
            
            # Delete from memory cache
            if config.cache_level in [CacheLevel.MEMORY, CacheLevel.BOTH]:
                with self.memory_lock:
                    if full_key in self.memory_cache:
                        del self.memory_cache[full_key]
            
            # Delete from Redis cache
            if config.cache_level in [CacheLevel.REDIS, CacheLevel.BOTH] and self.redis_available:
                try:
                    await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_client.delete, full_key
                    )
                except RedisError as e:
                    logger.error(f"Redis delete error: {e}")
                    success = False
            
            if success:
                await self._update_stats("delete")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting from cache {cache_type}:{key}: {e}")
            return False
    
    async def invalidate_pattern(self, cache_type: str, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        try:
            config = self.cache_configs.get(cache_type)
            if not config:
                return 0
            
            full_pattern = f"{config.key_prefix}:{pattern}"
            deleted_count = 0
            
            # Invalidate memory cache
            if config.cache_level in [CacheLevel.MEMORY, CacheLevel.BOTH]:
                with self.memory_lock:
                    keys_to_delete = [
                        key for key in self.memory_cache.keys()
                        if key.startswith(config.key_prefix) and self._matches_pattern(key, full_pattern)
                    ]
                    for key in keys_to_delete:
                        del self.memory_cache[key]
                        deleted_count += 1
            
            # Invalidate Redis cache
            if config.cache_level in [CacheLevel.REDIS, CacheLevel.BOTH] and self.redis_available:
                try:
                    keys = await asyncio.get_event_loop().run_in_executor(
                        None, self.redis_client.keys, full_pattern
                    )
                    if keys:
                        await asyncio.get_event_loop().run_in_executor(
                            None, self.redis_client.delete, *keys
                        )
                        deleted_count += len(keys)
                except RedisError as e:
                    logger.error(f"Redis pattern delete error: {e}")
            
            logger.info(f"Invalidated {deleted_count} cache entries for pattern {full_pattern}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating pattern {cache_type}:{pattern}: {e}")
            return 0
    
    # =====================================
    # MEMORY CACHE OPERATIONS
    # =====================================
    
    async def _get_from_memory(self, key: str) -> Any:
        """Get value from memory cache"""
        with self.memory_lock:
            entry = self.memory_cache.get(key)
            if entry is None:
                return None
            
            # Check expiration
            if entry.expires_at and datetime.utcnow() > entry.expires_at:
                del self.memory_cache[key]
                return None
            
            # Update access statistics
            entry.access_count += 1
            entry.last_accessed = datetime.utcnow()
            
            return entry.value
    
    async def _set_in_memory(self, key: str, value: Any, config: CacheConfig, ttl: int = None) -> bool:
        """Set value in memory cache"""
        try:
            with self.memory_lock:
                # Check memory limits
                if len(self.memory_cache) >= config.max_memory_items:
                    await self._evict_memory_entries(config.max_memory_items // 4)  # Evict 25%
                
                # Calculate expiration
                expires_at = None
                if ttl:
                    expires_at = datetime.utcnow() + timedelta(seconds=ttl)
                
                # Create cache entry
                serialized_value = await self._serialize_value(value, config)
                entry = CacheEntry(
                    key=key,
                    value=value,
                    created_at=datetime.utcnow(),
                    expires_at=expires_at,
                    size_bytes=len(str(serialized_value)),
                    metadata={"config": config.key_prefix}
                )
                
                self.memory_cache[key] = entry
                return True
                
        except Exception as e:
            logger.error(f"Error setting memory cache: {e}")
            return False
    
    async def _evict_memory_entries(self, count: int):
        """Evict least recently used entries from memory cache"""
        with self.memory_lock:
            if len(self.memory_cache) <= count:
                return
            
            # Sort by last accessed time (LRU)
            sorted_entries = sorted(
                self.memory_cache.items(),
                key=lambda x: x[1].last_accessed or x[1].created_at
            )
            
            # Remove oldest entries
            for i in range(count):
                if i < len(sorted_entries):
                    key = sorted_entries[i][0]
                    del self.memory_cache[key]
    
    # =====================================
    # REDIS CACHE OPERATIONS
    # =====================================
    
    async def _get_from_redis(self, key: str, config: CacheConfig) -> Any:
        """Get value from Redis cache"""
        try:
            raw_value = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.get, key
            )
            
            if raw_value is None:
                return None
            
            # Deserialize value
            return await self._deserialize_value(raw_value, config)
            
        except RedisError as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    async def _set_in_redis(self, key: str, value: Any, config: CacheConfig, ttl: int) -> bool:
        """Set value in Redis cache"""
        try:
            # Serialize value
            serialized_value = await self._serialize_value(value, config)
            
            # Set with TTL
            success = await asyncio.get_event_loop().run_in_executor(
                None, self.redis_client.setex, key, ttl, serialized_value
            )
            
            return bool(success)
            
        except RedisError as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    # =====================================
    # SERIALIZATION AND COMPRESSION
    # =====================================
    
    async def _serialize_value(self, value: Any, config: CacheConfig) -> bytes:
        """Serialize value based on configuration"""
        try:
            if config.serialization == "pickle":
                serialized = pickle.dumps(value)
            else:  # JSON
                serialized = json.dumps(value, default=str).encode('utf-8')
            
            # Apply compression if enabled
            if config.compression:
                import gzip
                serialized = gzip.compress(serialized)
            
            return serialized
            
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            raise
    
    async def _deserialize_value(self, raw_value: bytes, config: CacheConfig) -> Any:
        """Deserialize value based on configuration"""
        try:
            # Decompress if needed
            if config.compression:
                import gzip
                raw_value = gzip.decompress(raw_value)
            
            # Deserialize
            if config.serialization == "pickle":
                return pickle.loads(raw_value)
            else:  # JSON
                return json.loads(raw_value.decode('utf-8'))
                
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            raise
    
    # =====================================
    # CACHE WARMING AND PRECOMPUTATION
    # =====================================
    
    async def warm_cache(self, cache_type: str, keys: List[str], 
                        compute_func: Callable[[str], Any]) -> int:
        """Warm cache with precomputed values"""
        warmed_count = 0
        
        try:
            config = self.cache_configs.get(cache_type)
            if not config or not config.precompute:
                return 0
            
            for key in keys:
                try:
                    # Check if already cached
                    existing = await self.get(cache_type, key)
                    if existing is not None:
                        continue
                    
                    # Compute and cache value
                    value = await compute_func(key)
                    if value is not None:
                        success = await self.set(cache_type, key, value)
                        if success:
                            warmed_count += 1
                            
                except Exception as e:
                    logger.error(f"Error warming cache for key {key}: {e}")
                    continue
            
            logger.info(f"Warmed {warmed_count} cache entries for {cache_type}")
            return warmed_count
            
        except Exception as e:
            logger.error(f"Cache warming error: {e}")
            return 0
    
    async def _precompute_popular_queries(self):
        """Background task to precompute popular analytics queries"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                # This would be implemented based on query popularity tracking
                # For now, it's a placeholder
                logger.debug("Precomputing popular analytics queries...")
                
            except Exception as e:
                logger.error(f"Precomputation error: {e}")
                await asyncio.sleep(300)  # Retry in 5 minutes
    
    # =====================================
    # CACHE INVALIDATION
    # =====================================
    
    def register_invalidation_listener(self, event_type: str, callback: Callable[[str], None]):
        """Register callback for cache invalidation events"""
        if event_type not in self.invalidation_listeners:
            self.invalidation_listeners[event_type] = []
        
        self.invalidation_listeners[event_type].append(callback)
    
    async def trigger_invalidation(self, event_type: str, context: str):
        """Trigger cache invalidation based on event"""
        try:
            listeners = self.invalidation_listeners.get(event_type, [])
            
            for listener in listeners:
                try:
                    await listener(context)
                except Exception as e:
                    logger.error(f"Invalidation listener error: {e}")
            
            # Built-in invalidation rules
            await self._handle_built_in_invalidation(event_type, context)
            
        except Exception as e:
            logger.error(f"Invalidation trigger error: {e}")
    
    async def _handle_built_in_invalidation(self, event_type: str, context: str):
        """Handle built-in cache invalidation rules"""
        if event_type == "application_status_changed":
            # Invalidate metrics and dimensions
            await self.invalidate_pattern("metrics", "*")
            await self.invalidate_pattern("dimensions", "*")
            await self.invalidate_pattern("time_series", "*")
        
        elif event_type == "new_application":
            # Invalidate application-related caches
            await self.invalidate_pattern("metrics", "application*")
            await self.invalidate_pattern("time_series", "application*")
        
        elif event_type == "property_updated":
            # Invalidate property-specific caches
            property_id = context
            await self.invalidate_pattern("dimensions", f"property:{property_id}*")
            await self.invalidate_pattern("metrics", f"property:{property_id}*")
    
    # =====================================
    # BACKGROUND MAINTENANCE
    # =====================================
    
    async def _cleanup_expired_entries(self):
        """Background task to clean up expired cache entries"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                # Clean memory cache
                with self.memory_lock:
                    current_time = datetime.utcnow()
                    expired_keys = [
                        key for key, entry in self.memory_cache.items()
                        if entry.expires_at and current_time > entry.expires_at
                    ]
                    
                    for key in expired_keys:
                        del self.memory_cache[key]
                    
                    if expired_keys:
                        logger.debug(f"Cleaned up {len(expired_keys)} expired memory cache entries")
                
                # Redis handles TTL automatically, but we can clean up manually if needed
                
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
                await asyncio.sleep(60)  # Retry in 1 minute
    
    # =====================================
    # STATISTICS AND MONITORING
    # =====================================
    
    async def _update_stats(self, operation: str, response_time: float = 0):
        """Update cache performance statistics"""
        with self.stats_lock:
            if operation == "hit":
                self.stats.hits += 1
            elif operation == "miss":
                self.stats.misses += 1
            elif operation == "set":
                self.stats.sets += 1
            elif operation == "delete":
                self.stats.deletes += 1
            
            # Update hit rate
            total_requests = self.stats.hits + self.stats.misses
            if total_requests > 0:
                self.stats.hit_rate = self.stats.hits / total_requests
            
            # Update average response time
            if response_time > 0:
                current_avg = self.stats.avg_response_time_ms
                total_ops = self.stats.hits + self.stats.misses + self.stats.sets
                self.stats.avg_response_time_ms = (
                    (current_avg * (total_ops - 1) + response_time * 1000) / total_ops
                )
    
    async def get_cache_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        with self.stats_lock:
            stats_dict = asdict(self.stats)
        
        # Add memory usage
        with self.memory_lock:
            memory_entries = len(self.memory_cache)
            memory_size = sum(entry.size_bytes for entry in self.memory_cache.values())
        
        # Add Redis info if available
        redis_info = {}
        if self.redis_available:
            try:
                redis_info = await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.info, "memory"
                )
            except Exception as e:
                logger.error(f"Error getting Redis info: {e}")
        
        return {
            "performance": stats_dict,
            "memory_cache": {
                "entries": memory_entries,
                "size_bytes": memory_size,
                "size_mb": memory_size / (1024 * 1024)
            },
            "redis_cache": {
                "available": self.redis_available,
                "memory_usage": redis_info.get("used_memory_human", "Unknown"),
                "peak_memory": redis_info.get("used_memory_peak_human", "Unknown")
            },
            "configurations": {
                cache_type: {
                    "ttl_seconds": config.ttl_seconds,
                    "max_memory_items": config.max_memory_items,
                    "compression": config.compression,
                    "cache_level": config.cache_level.value
                }
                for cache_type, config in self.cache_configs.items()
            }
        }
    
    # =====================================
    # UTILITY METHODS
    # =====================================
    
    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Check if key matches pattern (simple wildcard support)"""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform cache health check"""
        health = {
            "memory_cache": "healthy",
            "redis_cache": "unavailable",
            "overall": "degraded"
        }
        
        # Test memory cache
        try:
            test_key = "health_check_test"
            await self._set_in_memory(test_key, "test_value", self.cache_configs["metrics"])
            result = await self._get_from_memory(test_key)
            if result != "test_value":
                health["memory_cache"] = "unhealthy"
        except Exception:
            health["memory_cache"] = "unhealthy"
        
        # Test Redis cache
        if self.redis_available:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.ping
                )
                health["redis_cache"] = "healthy"
            except Exception:
                health["redis_cache"] = "unhealthy"
                self.redis_available = False
        
        # Overall health
        if health["memory_cache"] == "healthy":
            if health["redis_cache"] == "healthy":
                health["overall"] = "healthy"
            else:
                health["overall"] = "degraded"  # Memory cache still works
        else:
            health["overall"] = "unhealthy"
        
        return health
    
    async def shutdown(self):
        """Gracefully shutdown cache service"""
        logger.info("Shutting down analytics cache...")
        
        # Cancel background tasks
        if self.cleanup_task:
            self.cleanup_task.cancel()
        if self.precompute_task:
            self.precompute_task.cancel()
        
        # Close Redis connection
        if self.redis_client:
            try:
                await asyncio.get_event_loop().run_in_executor(
                    None, self.redis_client.close
                )
            except Exception as e:
                logger.error(f"Error closing Redis connection: {e}")
        
        # Clear memory cache
        with self.memory_lock:
            self.memory_cache.clear()
        
        logger.info("Analytics cache shutdown complete")