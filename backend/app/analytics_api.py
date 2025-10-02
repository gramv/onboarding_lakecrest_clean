#!/usr/bin/env python3
"""
Analytics API Endpoints
RESTful API for analytics engine with comprehensive business intelligence

Features:
- Metrics aggregation endpoints
- Time-series data retrieval
- Dimensional analysis
- Trend analysis and forecasting
- Real-time analytics updates
- Caching and performance optimization
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from enum import Enum

# Import analytics services
from .services.analytics_engine import (
    AnalyticsEngine, TimeGranularity, MetricType, DimensionType,
    AggregationConfig, MetricDefinition, DimensionDefinition, FilterDefinition,
    TimeRange, AggregatedMetrics
)
from .services.analytics_cache import AnalyticsCache
from .supabase_service_enhanced import EnhancedSupabaseService
from .auth import get_current_user, require_role
from .models import User, UserRole
from .response_utils import create_success_response, create_error_response

logger = logging.getLogger(__name__)

# =====================================
# REQUEST/RESPONSE MODELS
# =====================================

class TimeRangeRequest(BaseModel):
    """Time range specification for analytics queries"""
    start_date: datetime
    end_date: datetime
    timezone: str = "UTC"
    
    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

class MetricRequest(BaseModel):
    """Metric definition for analytics queries"""
    id: str
    name: str
    type: MetricType
    field: str
    calculation: Optional[str] = None
    format: str = "number"

class DimensionRequest(BaseModel):
    """Dimension definition for analytics queries"""
    id: str
    name: str
    type: DimensionType
    field: str
    hierarchy: Optional[List[str]] = None

class FilterRequest(BaseModel):
    """Filter definition for analytics queries"""
    field: str
    operator: str = Field(..., regex="^(eq|ne|gt|lt|gte|lte|in|not_in|like)$")
    value: Any
    condition: str = Field("AND", regex="^(AND|OR)$")

class AnalyticsQueryRequest(BaseModel):
    """Comprehensive analytics query request"""
    time_range: TimeRangeRequest
    granularity: TimeGranularity = TimeGranularity.DAY
    metrics: List[MetricRequest] = Field(default_factory=list)
    dimensions: List[DimensionRequest] = Field(default_factory=list)
    filters: List[FilterRequest] = Field(default_factory=list)
    include_trends: bool = True
    include_forecasts: bool = False
    include_insights: bool = True
    cache_ttl: Optional[int] = None

class QuickMetricsRequest(BaseModel):
    """Quick metrics request for dashboard KPIs"""
    property_id: Optional[str] = None
    manager_id: Optional[str] = None
    time_range: TimeRangeRequest
    metric_types: List[str] = Field(default_factory=lambda: [
        "total_applications", "approved_applications", "rejection_rate",
        "time_to_hire", "onboarding_completion_rate"
    ])

class TrendAnalysisRequest(BaseModel):
    """Trend analysis request"""
    metric_id: str
    time_range: TimeRangeRequest
    granularity: TimeGranularity = TimeGranularity.DAY
    forecast_periods: int = Field(12, ge=1, le=52)
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)

class PropertyComparisonRequest(BaseModel):
    """Property comparison analysis request"""
    property_ids: Optional[List[str]] = None
    time_range: TimeRangeRequest
    metrics: List[str] = Field(default_factory=lambda: [
        "total_applications", "approval_rate", "time_to_hire"
    ])
    include_benchmarks: bool = True

class ManagerPerformanceRequest(BaseModel):
    """Manager performance analysis request"""
    manager_ids: Optional[List[str]] = None
    property_id: Optional[str] = None
    time_range: TimeRangeRequest
    include_efficiency_metrics: bool = True
    include_quality_metrics: bool = True

# =====================================
# ANALYTICS ROUTER
# =====================================

# Initialize services
supabase_service = EnhancedSupabaseService()
analytics_cache = AnalyticsCache()
analytics_engine = AnalyticsEngine(supabase_service, analytics_cache.redis_client)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# =====================================
# CORE ANALYTICS ENDPOINTS
# =====================================

@router.post("/query", response_model=Dict[str, Any])
async def execute_analytics_query(
    request: AnalyticsQueryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Execute comprehensive analytics query with caching
    """
    try:
        # Validate user permissions
        if current_user.role not in [UserRole.HR, UserRole.MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for analytics")
        
        # Convert request to engine format
        config = AggregationConfig(
            metrics=[
                MetricDefinition(
                    id=m.id, name=m.name, type=m.type,
                    field=m.field, calculation=m.calculation, format=m.format
                ) for m in request.metrics
            ],
            dimensions=[
                DimensionDefinition(
                    id=d.id, name=d.name, type=d.type,
                    field=d.field, hierarchy=d.hierarchy
                ) for d in request.dimensions
            ],
            filters=[
                FilterDefinition(
                    field=f.field, operator=f.operator,
                    value=f.value, condition=f.condition
                ) for f in request.filters
            ],
            time_range=TimeRange(
                start_date=request.time_range.start_date,
                end_date=request.time_range.end_date,
                timezone=request.time_range.timezone
            ),
            granularity=request.granularity
        )
        
        # Apply role-based filtering
        if current_user.role == UserRole.MANAGER and current_user.property_id:
            # Managers can only see their property data
            property_filter = FilterDefinition(
                field="property_id",
                operator="eq",
                value=str(current_user.property_id)
            )
            config.filters.append(property_filter)
        
        # Execute analytics query
        result = await analytics_engine.aggregate_metrics(config)
        
        # Generate forecasts if requested
        forecasts = {}
        if request.include_forecasts:
            forecasts = await analytics_engine.generate_forecasts(
                result.time_series, forecast_periods=12
            )
        
        # Prepare response
        response_data = {
            "metrics": result.metrics,
            "dimensions": result.dimensions,
            "time_series": [
                {
                    "id": ts.id,
                    "name": ts.name,
                    "data_points": [
                        {
                            "timestamp": dp.timestamp.isoformat(),
                            "value": dp.value,
                            "metadata": dp.metadata
                        } for dp in ts.data_points
                    ],
                    "granularity": ts.granularity.value,
                    "aggregation_type": ts.aggregation_type.value,
                    "metadata": ts.metadata
                } for ts in result.time_series
            ],
            "trends": {
                trend_id: {
                    "direction": trend.direction,
                    "magnitude": trend.magnitude,
                    "significance": trend.significance,
                    "r_squared": trend.r_squared,
                    "slope": trend.slope,
                    "description": trend.description
                } for trend_id, trend in result.trends.items()
            } if request.include_trends else {},
            "insights": [
                {
                    "type": insight.type,
                    "title": insight.title,
                    "description": insight.description,
                    "impact": insight.impact,
                    "recommendation": insight.recommendation,
                    "data_points": insight.data_points,
                    "confidence": insight.confidence
                } for insight in result.insights
            ] if request.include_insights else [],
            "forecasts": {
                forecast_id: [
                    {
                        "timestamp": dp.timestamp.isoformat(),
                        "value": dp.value,
                        "metadata": dp.metadata
                    } for dp in forecast_points
                ] for forecast_id, forecast_points in forecasts.items()
            },
            "metadata": result.metadata
        }
        
        # Schedule cache warming in background
        if request.cache_ttl:
            background_tasks.add_task(
                _warm_related_cache, config, request.cache_ttl
            )
        
        return create_success_response(
            data=response_data,
            message="Analytics query executed successfully"
        )
        
    except Exception as e:
        logger.error(f"Analytics query error: {e}")
        return create_error_response(
            message="Failed to execute analytics query",
            details=str(e)
        )

@router.post("/quick-metrics", response_model=Dict[str, Any])
async def get_quick_metrics(
    request: QuickMetricsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Get quick dashboard metrics for KPI display
    """
    try:
        # Check cache first
        cache_key = f"quick_metrics:{current_user.id}:{hash(str(request.dict()))}"
        cached_result = await analytics_cache.get("metrics", cache_key)
        
        if cached_result:
            return create_success_response(
                data=cached_result,
                message="Quick metrics retrieved from cache"
            )
        
        # Build standard metrics configuration
        standard_metrics = []
        for metric_type in request.metric_types:
            if metric_type in analytics_engine.standard_metrics:
                standard_metrics.append(analytics_engine.standard_metrics[metric_type])
        
        config = AggregationConfig(
            metrics=standard_metrics,
            dimensions=[analytics_engine.standard_dimensions["property"]],
            filters=[],
            time_range=TimeRange(
                start_date=request.time_range.start_date,
                end_date=request.time_range.end_date,
                timezone=request.time_range.timezone
            ),
            granularity=TimeGranularity.DAY
        )
        
        # Apply role-based filtering
        if current_user.role == UserRole.MANAGER and current_user.property_id:
            property_filter = FilterDefinition(
                field="property_id",
                operator="eq",
                value=str(current_user.property_id)
            )
            config.filters.append(property_filter)
        elif request.property_id:
            property_filter = FilterDefinition(
                field="property_id",
                operator="eq",
                value=request.property_id
            )
            config.filters.append(property_filter)
        elif request.manager_id:
            manager_filter = FilterDefinition(
                field="reviewed_by",
                operator="eq",
                value=request.manager_id
            )
            config.filters.append(manager_filter)
        
        # Execute query
        result = await analytics_engine.aggregate_metrics(config)
        
        # Format for quick display
        quick_metrics = {
            "kpis": result.metrics,
            "property_breakdown": result.dimensions.get("property", {}),
            "generated_at": datetime.utcnow().isoformat(),
            "time_range": {
                "start": request.time_range.start_date.isoformat(),
                "end": request.time_range.end_date.isoformat()
            }
        }
        
        # Cache result
        await analytics_cache.set("metrics", cache_key, quick_metrics, ttl=300)
        
        return create_success_response(
            data=quick_metrics,
            message="Quick metrics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Quick metrics error: {e}")
        return create_error_response(
            message="Failed to retrieve quick metrics",
            details=str(e)
        )

@router.post("/trends", response_model=Dict[str, Any])
async def analyze_trends(
    request: TrendAnalysisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze trends for specific metrics with forecasting
    """
    try:
        # Get metric definition
        metric_def = analytics_engine.standard_metrics.get(request.metric_id)
        if not metric_def:
            raise HTTPException(status_code=400, detail=f"Unknown metric: {request.metric_id}")
        
        # Build configuration
        config = AggregationConfig(
            metrics=[metric_def],
            dimensions=[],
            filters=[],
            time_range=TimeRange(
                start_date=request.time_range.start_date,
                end_date=request.time_range.end_date,
                timezone=request.time_range.timezone
            ),
            granularity=request.granularity
        )
        
        # Apply role-based filtering
        if current_user.role == UserRole.MANAGER and current_user.property_id:
            property_filter = FilterDefinition(
                field="property_id",
                operator="eq",
                value=str(current_user.property_id)
            )
            config.filters.append(property_filter)
        
        # Execute analytics
        result = await analytics_engine.aggregate_metrics(config)
        
        # Generate forecasts
        forecasts = await analytics_engine.generate_forecasts(
            result.time_series, forecast_periods=request.forecast_periods
        )
        
        # Prepare response
        trend_data = {
            "metric": {
                "id": request.metric_id,
                "name": metric_def.name,
                "current_value": result.metrics.get(request.metric_id, 0)
            },
            "time_series": [
                {
                    "timestamp": dp.timestamp.isoformat(),
                    "value": dp.value,
                    "metadata": dp.metadata
                } for ts in result.time_series for dp in ts.data_points
                if ts.id == request.metric_id
            ],
            "trend_analysis": result.trends.get(request.metric_id, {}),
            "forecasts": forecasts.get(request.metric_id, []),
            "confidence_level": request.confidence_level,
            "analysis_period": {
                "start": request.time_range.start_date.isoformat(),
                "end": request.time_range.end_date.isoformat(),
                "granularity": request.granularity.value
            }
        }
        
        return create_success_response(
            data=trend_data,
            message="Trend analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Trend analysis error: {e}")
        return create_error_response(
            message="Failed to analyze trends",
            details=str(e)
        )

@router.post("/property-comparison", response_model=Dict[str, Any])
async def compare_properties(
    request: PropertyComparisonRequest,
    current_user: User = Depends(require_role([UserRole.HR]))
):
    """
    Compare performance across properties with benchmarking
    """
    try:
        # Build metrics for comparison
        comparison_metrics = []
        for metric_name in request.metrics:
            if metric_name in analytics_engine.standard_metrics:
                comparison_metrics.append(analytics_engine.standard_metrics[metric_name])
        
        config = AggregationConfig(
            metrics=comparison_metrics,
            dimensions=[analytics_engine.standard_dimensions["property"]],
            filters=[],
            time_range=TimeRange(
                start_date=request.time_range.start_date,
                end_date=request.time_range.end_date,
                timezone=request.time_range.timezone
            ),
            granularity=TimeGranularity.DAY
        )
        
        # Filter by specific properties if requested
        if request.property_ids:
            property_filter = FilterDefinition(
                field="property_id",
                operator="in",
                value=request.property_ids
            )
            config.filters.append(property_filter)
        
        # Execute analytics
        result = await analytics_engine.aggregate_metrics(config)
        
        # Calculate benchmarks if requested
        benchmarks = {}
        if request.include_benchmarks:
            property_data = result.dimensions.get("property", {})
            for metric_name in request.metrics:
                values = [
                    prop_data.get(metric_name, 0)
                    for prop_data in property_data.values()
                ]
                if values:
                    import numpy as np
                    benchmarks[metric_name] = {
                        "average": np.mean(values),
                        "median": np.median(values),
                        "top_quartile": np.percentile(values, 75),
                        "bottom_quartile": np.percentile(values, 25),
                        "best": max(values),
                        "worst": min(values)
                    }
        
        # Prepare comparison data
        comparison_data = {
            "properties": result.dimensions.get("property", {}),
            "benchmarks": benchmarks,
            "overall_metrics": result.metrics,
            "comparison_period": {
                "start": request.time_range.start_date.isoformat(),
                "end": request.time_range.end_date.isoformat()
            },
            "insights": [
                insight for insight in result.insights
                if "property" in insight.type.lower()
            ]
        }
        
        return create_success_response(
            data=comparison_data,
            message="Property comparison completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Property comparison error: {e}")
        return create_error_response(
            message="Failed to compare properties",
            details=str(e)
        )

@router.post("/manager-performance", response_model=Dict[str, Any])
async def analyze_manager_performance(
    request: ManagerPerformanceRequest,
    current_user: User = Depends(require_role([UserRole.HR]))
):
    """
    Analyze manager performance with efficiency and quality metrics
    """
    try:
        # Build manager-specific metrics
        manager_metrics = [
            analytics_engine.standard_metrics["manager_efficiency"]
        ]
        
        config = AggregationConfig(
            metrics=manager_metrics,
            dimensions=[
                analytics_engine.standard_dimensions["manager"],
                analytics_engine.standard_dimensions["property"]
            ],
            filters=[],
            time_range=TimeRange(
                start_date=request.time_range.start_date,
                end_date=request.time_range.end_date,
                timezone=request.time_range.timezone
            ),
            granularity=TimeGranularity.DAY
        )
        
        # Apply filters
        if request.manager_ids:
            manager_filter = FilterDefinition(
                field="reviewed_by",
                operator="in",
                value=request.manager_ids
            )
            config.filters.append(manager_filter)
        
        if request.property_id:
            property_filter = FilterDefinition(
                field="property_id",
                operator="eq",
                value=request.property_id
            )
            config.filters.append(property_filter)
        
        # Execute analytics
        result = await analytics_engine.aggregate_metrics(config)
        
        # Calculate additional performance metrics
        manager_data = result.dimensions.get("manager", {})
        
        # Enhance with efficiency and quality scores
        for manager_id, data in manager_data.items():
            if request.include_efficiency_metrics:
                # Calculate efficiency score (lower review time = higher efficiency)
                avg_review_time = data.get("avg_review_time", 0)
                if avg_review_time > 0:
                    # Normalize to 0-100 scale (24 hours = 50 points, 12 hours = 75 points, etc.)
                    efficiency_score = max(0, 100 - (avg_review_time / 24 * 50))
                    data["efficiency_score"] = round(efficiency_score, 1)
            
            if request.include_quality_metrics:
                # Calculate quality score based on approval rate
                total_reviews = data.get("total_reviews", 0)
                approved_reviews = data.get("approved_reviews", 0)
                if total_reviews > 0:
                    approval_rate = approved_reviews / total_reviews * 100
                    data["quality_score"] = round(approval_rate, 1)
        
        performance_data = {
            "managers": manager_data,
            "overall_metrics": result.metrics,
            "property_breakdown": result.dimensions.get("property", {}),
            "performance_insights": [
                insight for insight in result.insights
                if "manager" in insight.type.lower()
            ],
            "analysis_period": {
                "start": request.time_range.start_date.isoformat(),
                "end": request.time_range.end_date.isoformat()
            }
        }
        
        return create_success_response(
            data=performance_data,
            message="Manager performance analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Manager performance analysis error: {e}")
        return create_error_response(
            message="Failed to analyze manager performance",
            details=str(e)
        )

# =====================================
# CACHE MANAGEMENT ENDPOINTS
# =====================================

@router.get("/cache/stats", response_model=Dict[str, Any])
async def get_cache_statistics(
    current_user: User = Depends(require_role([UserRole.HR]))
):
    """Get analytics cache performance statistics"""
    try:
        cache_stats = await analytics_cache.get_cache_statistics()
        
        return create_success_response(
            data=cache_stats,
            message="Cache statistics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        return create_error_response(
            message="Failed to retrieve cache statistics",
            details=str(e)
        )

@router.post("/cache/invalidate", response_model=Dict[str, Any])
async def invalidate_cache(
    cache_type: str = Query(..., description="Cache type to invalidate"),
    pattern: str = Query("*", description="Pattern to match for invalidation"),
    current_user: User = Depends(require_role([UserRole.HR]))
):
    """Invalidate analytics cache entries"""
    try:
        deleted_count = await analytics_cache.invalidate_pattern(cache_type, pattern)
        
        return create_success_response(
            data={"deleted_count": deleted_count},
            message=f"Invalidated {deleted_count} cache entries"
        )
        
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")
        return create_error_response(
            message="Failed to invalidate cache",
            details=str(e)
        )

@router.get("/cache/health", response_model=Dict[str, Any])
async def check_cache_health(
    current_user: User = Depends(require_role([UserRole.HR]))
):
    """Check analytics cache health status"""
    try:
        health_status = await analytics_cache.health_check()
        
        return create_success_response(
            data=health_status,
            message="Cache health check completed"
        )
        
    except Exception as e:
        logger.error(f"Cache health check error: {e}")
        return create_error_response(
            message="Failed to check cache health",
            details=str(e)
        )

# =====================================
# UTILITY FUNCTIONS
# =====================================

async def _warm_related_cache(config: AggregationConfig, ttl: int):
    """Background task to warm related cache entries"""
    try:
        # This would implement intelligent cache warming
        # based on the current query to precompute related queries
        logger.info("Warming related cache entries...")
        
        # Example: warm similar time ranges, different granularities, etc.
        # Implementation would depend on usage patterns
        
    except Exception as e:
        logger.error(f"Cache warming error: {e}")

# =====================================
# REAL-TIME ANALYTICS ENDPOINTS
# =====================================

@router.get("/realtime/metrics", response_model=Dict[str, Any])
async def get_realtime_metrics(
    property_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get real-time metrics for live dashboard updates"""
    try:
        # Apply role-based filtering
        effective_property_id = property_id
        if current_user.role == UserRole.MANAGER:
            effective_property_id = str(current_user.property_id)
        
        # Get current day metrics
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        request = QuickMetricsRequest(
            property_id=effective_property_id,
            time_range=TimeRangeRequest(
                start_date=today,
                end_date=datetime.now(timezone.utc)
            ),
            metric_types=["total_applications", "approved_applications", "pending_applications"]
        )
        
        # Use quick metrics endpoint logic
        return await get_quick_metrics(request, current_user)
        
    except Exception as e:
        logger.error(f"Real-time metrics error: {e}")
        return create_error_response(
            message="Failed to retrieve real-time metrics",
            details=str(e)
        )