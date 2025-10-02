#!/usr/bin/env python3
"""
Analytics Engine Service
Comprehensive data aggregation and processing for business intelligence

Features:
- Time-series data processing with granularity control
- Dimensional analysis (property, manager, temporal)
- Metric calculation and trend analysis
- Data caching with Redis integration
- Real-time analytics updates
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from functools import wraps
import redis
import pandas as pd
import numpy as np
from scipy import stats

# Import existing models
from ..models_enhanced import (
    OnboardingSession, OnboardingStatus, Employee, JobApplication,
    ApplicationStatus, UserRole
)

logger = logging.getLogger(__name__)

# =====================================
# ANALYTICS ENUMS AND TYPES
# =====================================

class TimeGranularity(str, Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

class MetricType(str, Enum):
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    PERCENTAGE = "percentage"
    RATIO = "ratio"
    TREND = "trend"
    FORECAST = "forecast"

class DimensionType(str, Enum):
    PROPERTY = "property"
    MANAGER = "manager"
    DEPARTMENT = "department"
    POSITION = "position"
    TEMPORAL = "temporal"
    STATUS = "status"

class AggregationType(str, Enum):
    SUM = "sum"
    COUNT = "count"
    AVERAGE = "avg"
    MIN = "min"
    MAX = "max"
    MEDIAN = "median"
    PERCENTILE = "percentile"

# =====================================
# ANALYTICS DATA MODELS
# =====================================

@dataclass
class TimeRange:
    start_date: datetime
    end_date: datetime
    timezone: str = "UTC"

@dataclass
class MetricDefinition:
    id: str
    name: str
    type: MetricType
    field: str
    calculation: Optional[str] = None
    format: str = "number"
    description: Optional[str] = None

@dataclass
class DimensionDefinition:
    id: str
    name: str
    type: DimensionType
    field: str
    hierarchy: Optional[List[str]] = None

@dataclass
class FilterDefinition:
    field: str
    operator: str  # eq, ne, gt, lt, gte, lte, in, not_in, like
    value: Any
    condition: str = "AND"  # AND, OR

@dataclass
class AggregationConfig:
    metrics: List[MetricDefinition]
    dimensions: List[DimensionDefinition]
    filters: List[FilterDefinition]
    time_range: TimeRange
    granularity: TimeGranularity

@dataclass
class DataPoint:
    timestamp: datetime
    value: float
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class TimeSeriesMetric:
    id: str
    name: str
    data_points: List[DataPoint]
    granularity: TimeGranularity
    aggregation_type: AggregationType
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class TrendAnalysis:
    direction: str  # up, down, stable
    magnitude: float
    significance: str  # high, medium, low
    r_squared: float
    slope: float
    description: str

@dataclass
class BusinessInsight:
    type: str
    title: str
    description: str
    impact: str  # high, medium, low
    recommendation: str
    data_points: List[Dict[str, Any]]
    confidence: float

@dataclass
class AggregatedMetrics:
    metrics: Dict[str, Any]
    dimensions: Dict[str, Dict[str, Any]]
    time_series: List[TimeSeriesMetric]
    trends: Dict[str, TrendAnalysis]
    insights: List[BusinessInsight]
    metadata: Dict[str, Any]

# =====================================
# ANALYTICS ENGINE CLASS
# =====================================

class AnalyticsEngine:
    """
    Comprehensive analytics engine for business intelligence
    """
    
    def __init__(self, supabase_service, redis_client=None):
        """Initialize Analytics Engine"""
        self.supabase = supabase_service
        
        # Initialize Redis for caching
        self.redis_client = redis_client
        if not self.redis_client:
            try:
                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                logger.info("✅ Redis client initialized for analytics caching")
            except Exception as e:
                logger.warning(f"Redis not available, caching disabled: {e}")
                self.redis_client = None
        
        # Cache settings
        self.cache_ttl = {
            "metrics": 300,      # 5 minutes
            "trends": 900,       # 15 minutes
            "insights": 1800,    # 30 minutes
            "forecasts": 3600    # 1 hour
        }
        
        # Predefined metric definitions
        self.standard_metrics = self._initialize_standard_metrics()
        self.standard_dimensions = self._initialize_standard_dimensions()
        
        logger.info("✅ Analytics Engine initialized")
    
    def _initialize_standard_metrics(self) -> Dict[str, MetricDefinition]:
        """Initialize standard business metrics"""
        return {
            "total_applications": MetricDefinition(
                id="total_applications",
                name="Total Applications",
                type=MetricType.COUNT,
                field="id",
                description="Total number of job applications"
            ),
            "approved_applications": MetricDefinition(
                id="approved_applications",
                name="Approved Applications",
                type=MetricType.COUNT,
                field="id",
                description="Number of approved applications"
            ),
            "rejection_rate": MetricDefinition(
                id="rejection_rate",
                name="Rejection Rate",
                type=MetricType.PERCENTAGE,
                field="status",
                calculation="rejected / total * 100",
                format="percentage",
                description="Percentage of applications rejected"
            ),
            "time_to_hire": MetricDefinition(
                id="time_to_hire",
                name="Average Time to Hire",
                type=MetricType.AVERAGE,
                field="time_to_hire_hours",
                format="hours",
                description="Average time from application to hire"
            ),
            "onboarding_completion_rate": MetricDefinition(
                id="onboarding_completion_rate",
                name="Onboarding Completion Rate",
                type=MetricType.PERCENTAGE,
                field="onboarding_status",
                calculation="completed / total * 100",
                format="percentage",
                description="Percentage of onboarding sessions completed"
            ),
            "manager_efficiency": MetricDefinition(
                id="manager_efficiency",
                name="Manager Efficiency Score",
                type=MetricType.AVERAGE,
                field="review_time_hours",
                description="Average manager review time efficiency"
            ),
            "property_performance": MetricDefinition(
                id="property_performance",
                name="Property Performance Score",
                type=MetricType.RATIO,
                field="performance_score",
                description="Overall property hiring performance"
            )
        }
    
    def _initialize_standard_dimensions(self) -> Dict[str, DimensionDefinition]:
        """Initialize standard analysis dimensions"""
        return {
            "property": DimensionDefinition(
                id="property",
                name="Property",
                type=DimensionType.PROPERTY,
                field="property_id",
                hierarchy=["property_id", "city", "state"]
            ),
            "manager": DimensionDefinition(
                id="manager",
                name="Manager",
                type=DimensionType.MANAGER,
                field="manager_id"
            ),
            "department": DimensionDefinition(
                id="department",
                name="Department",
                type=DimensionType.DEPARTMENT,
                field="department"
            ),
            "position": DimensionDefinition(
                id="position",
                name="Position",
                type=DimensionType.POSITION,
                field="position"
            ),
            "time": DimensionDefinition(
                id="time",
                name="Time",
                type=DimensionType.TEMPORAL,
                field="created_at",
                hierarchy=["year", "quarter", "month", "week", "day"]
            ),
            "status": DimensionDefinition(
                id="status",
                name="Status",
                type=DimensionType.STATUS,
                field="status"
            )
        }
    
    # =====================================
    # CACHING UTILITIES
    # =====================================
    
    def _get_cache_key(self, prefix: str, config: AggregationConfig) -> str:
        """Generate cache key for aggregation config"""
        config_hash = hash(str(asdict(config)))
        return f"analytics:{prefix}:{config_hash}"
    
    async def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached analytics result"""
        if not self.redis_client:
            return None
        
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache read error: {e}")
        
        return None
    
    async def _cache_result(self, cache_key: str, data: Dict[str, Any], ttl: int):
        """Cache analytics result"""
        if not self.redis_client:
            return
        
        try:
            self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache write error: {e}")
    
    # =====================================
    # DATA AGGREGATION METHODS
    # =====================================
    
    async def aggregate_metrics(self, config: AggregationConfig) -> AggregatedMetrics:
        """
        Main method for aggregating metrics based on configuration
        """
        # Check cache first
        cache_key = self._get_cache_key("metrics", config)
        cached_result = await self._get_cached_result(cache_key)
        
        if cached_result:
            logger.info("Returning cached analytics result")
            return AggregatedMetrics(**cached_result)
        
        logger.info(f"Calculating analytics for {len(config.metrics)} metrics")
        
        # Get raw data
        raw_data = await self._fetch_raw_data(config)
        
        # Calculate metrics
        metrics = await self._calculate_metrics(raw_data, config.metrics)
        
        # Calculate dimensional breakdowns
        dimensions = await self._calculate_dimensions(raw_data, config.dimensions)
        
        # Generate time series
        time_series = await self._generate_time_series(raw_data, config)
        
        # Calculate trends
        trends = await self._calculate_trends(time_series)
        
        # Generate insights
        insights = await self._generate_insights(metrics, trends, dimensions)
        
        # Create result
        result = AggregatedMetrics(
            metrics=metrics,
            dimensions=dimensions,
            time_series=time_series,
            trends=trends,
            insights=insights,
            metadata={
                "generated_at": datetime.utcnow().isoformat(),
                "time_range": asdict(config.time_range),
                "granularity": config.granularity.value,
                "cache_key": cache_key
            }
        )
        
        # Cache result
        await self._cache_result(cache_key, asdict(result), self.cache_ttl["metrics"])
        
        logger.info("Analytics calculation completed")
        return result
    
    async def _fetch_raw_data(self, config: AggregationConfig) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch raw data from database based on configuration"""
        raw_data = {}
        
        # Fetch applications data
        applications_query = self.supabase.client.table('job_applications').select(
            '*, properties(name, city, state), users(first_name, last_name)'
        )
        
        # Apply time range filter
        applications_query = applications_query.gte(
            'applied_at', config.time_range.start_date.isoformat()
        ).lte(
            'applied_at', config.time_range.end_date.isoformat()
        )
        
        # Apply additional filters
        for filter_def in config.filters:
            applications_query = self._apply_filter(applications_query, filter_def)
        
        applications_result = applications_query.execute()
        raw_data['applications'] = applications_result.data or []
        
        # Fetch onboarding sessions data
        sessions_query = self.supabase.client.table('onboarding_sessions').select(
            '*, employees(*, properties(name)), users(first_name, last_name)'
        )
        
        sessions_query = sessions_query.gte(
            'created_at', config.time_range.start_date.isoformat()
        ).lte(
            'created_at', config.time_range.end_date.isoformat()
        )
        
        sessions_result = sessions_query.execute()
        raw_data['onboarding_sessions'] = sessions_result.data or []
        
        # Fetch employees data
        employees_query = self.supabase.client.table('employees').select(
            '*, properties(name, city, state), users(first_name, last_name)'
        )
        
        employees_query = employees_query.gte(
            'created_at', config.time_range.start_date.isoformat()
        ).lte(
            'created_at', config.time_range.end_date.isoformat()
        )
        
        employees_result = employees_query.execute()
        raw_data['employees'] = employees_result.data or []
        
        # Fetch properties data for context
        properties_result = self.supabase.client.table('properties').select('*').execute()
        raw_data['properties'] = properties_result.data or []
        
        logger.info(f"Fetched raw data: {len(raw_data['applications'])} applications, "
                   f"{len(raw_data['onboarding_sessions'])} sessions, "
                   f"{len(raw_data['employees'])} employees")
        
        return raw_data
    
    def _apply_filter(self, query, filter_def: FilterDefinition):
        """Apply filter to Supabase query"""
        if filter_def.operator == "eq":
            return query.eq(filter_def.field, filter_def.value)
        elif filter_def.operator == "ne":
            return query.neq(filter_def.field, filter_def.value)
        elif filter_def.operator == "gt":
            return query.gt(filter_def.field, filter_def.value)
        elif filter_def.operator == "lt":
            return query.lt(filter_def.field, filter_def.value)
        elif filter_def.operator == "gte":
            return query.gte(filter_def.field, filter_def.value)
        elif filter_def.operator == "lte":
            return query.lte(filter_def.field, filter_def.value)
        elif filter_def.operator == "in":
            return query.in_(filter_def.field, filter_def.value)
        elif filter_def.operator == "like":
            return query.like(filter_def.field, f"%{filter_def.value}%")
        else:
            logger.warning(f"Unsupported filter operator: {filter_def.operator}")
            return query
    
    async def _calculate_metrics(self, raw_data: Dict[str, List[Dict]], 
                               metric_definitions: List[MetricDefinition]) -> Dict[str, Any]:
        """Calculate individual metrics from raw data"""
        metrics = {}
        
        for metric_def in metric_definitions:
            try:
                if metric_def.id == "total_applications":
                    metrics[metric_def.id] = len(raw_data['applications'])
                
                elif metric_def.id == "approved_applications":
                    approved = [app for app in raw_data['applications'] 
                              if app.get('status') == 'approved']
                    metrics[metric_def.id] = len(approved)
                
                elif metric_def.id == "rejection_rate":
                    total = len(raw_data['applications'])
                    rejected = len([app for app in raw_data['applications'] 
                                  if app.get('status') == 'rejected'])
                    metrics[metric_def.id] = (rejected / total * 100) if total > 0 else 0
                
                elif metric_def.id == "time_to_hire":
                    hire_times = []
                    for app in raw_data['applications']:
                        if app.get('status') == 'approved' and app.get('approved_at'):
                            applied_at = datetime.fromisoformat(app['applied_at'].replace('Z', '+00:00'))
                            approved_at = datetime.fromisoformat(app['approved_at'].replace('Z', '+00:00'))
                            hours = (approved_at - applied_at).total_seconds() / 3600
                            hire_times.append(hours)
                    
                    metrics[metric_def.id] = np.mean(hire_times) if hire_times else 0
                
                elif metric_def.id == "onboarding_completion_rate":
                    total = len(raw_data['onboarding_sessions'])
                    completed = len([session for session in raw_data['onboarding_sessions']
                                   if session.get('status') == 'approved'])
                    metrics[metric_def.id] = (completed / total * 100) if total > 0 else 0
                
                elif metric_def.id == "manager_efficiency":
                    review_times = []
                    for app in raw_data['applications']:
                        if (app.get('reviewed_at') and app.get('applied_at')):
                            applied_at = datetime.fromisoformat(app['applied_at'].replace('Z', '+00:00'))
                            reviewed_at = datetime.fromisoformat(app['reviewed_at'].replace('Z', '+00:00'))
                            hours = (reviewed_at - applied_at).total_seconds() / 3600
                            review_times.append(hours)
                    
                    metrics[metric_def.id] = np.mean(review_times) if review_times else 0
                
                elif metric_def.id == "property_performance":
                    # Calculate composite performance score
                    property_scores = {}
                    for app in raw_data['applications']:
                        prop_id = app.get('property_id')
                        if prop_id not in property_scores:
                            property_scores[prop_id] = {'total': 0, 'approved': 0}
                        
                        property_scores[prop_id]['total'] += 1
                        if app.get('status') == 'approved':
                            property_scores[prop_id]['approved'] += 1
                    
                    scores = []
                    for prop_id, data in property_scores.items():
                        if data['total'] > 0:
                            score = data['approved'] / data['total']
                            scores.append(score)
                    
                    metrics[metric_def.id] = np.mean(scores) if scores else 0
                
                else:
                    # Generic metric calculation
                    metrics[metric_def.id] = await self._calculate_generic_metric(
                        raw_data, metric_def
                    )
                
            except Exception as e:
                logger.error(f"Error calculating metric {metric_def.id}: {e}")
                metrics[metric_def.id] = 0
        
        return metrics
    
    async def _calculate_generic_metric(self, raw_data: Dict[str, List[Dict]], 
                                      metric_def: MetricDefinition) -> float:
        """Calculate generic metric based on definition"""
        # This is a simplified implementation
        # In production, you'd want more sophisticated metric calculation
        
        if metric_def.type == MetricType.COUNT:
            return len(raw_data.get('applications', []))
        elif metric_def.type == MetricType.AVERAGE:
            values = [item.get(metric_def.field, 0) for item in raw_data.get('applications', [])]
            return np.mean(values) if values else 0
        else:
            return 0
    
    async def _calculate_dimensions(self, raw_data: Dict[str, List[Dict]], 
                                  dimension_definitions: List[DimensionDefinition]) -> Dict[str, Dict[str, Any]]:
        """Calculate dimensional breakdowns"""
        dimensions = {}
        
        for dim_def in dimension_definitions:
            try:
                if dim_def.type == DimensionType.PROPERTY:
                    dimensions[dim_def.id] = await self._calculate_property_dimension(raw_data)
                elif dim_def.type == DimensionType.MANAGER:
                    dimensions[dim_def.id] = await self._calculate_manager_dimension(raw_data)
                elif dim_def.type == DimensionType.DEPARTMENT:
                    dimensions[dim_def.id] = await self._calculate_department_dimension(raw_data)
                elif dim_def.type == DimensionType.TEMPORAL:
                    dimensions[dim_def.id] = await self._calculate_temporal_dimension(raw_data)
                else:
                    dimensions[dim_def.id] = {}
                    
            except Exception as e:
                logger.error(f"Error calculating dimension {dim_def.id}: {e}")
                dimensions[dim_def.id] = {}
        
        return dimensions
    
    async def _calculate_property_dimension(self, raw_data: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """Calculate property-based dimensional analysis"""
        property_metrics = {}
        
        for app in raw_data['applications']:
            prop_id = app.get('property_id')
            if not prop_id:
                continue
                
            if prop_id not in property_metrics:
                property_metrics[prop_id] = {
                    'total_applications': 0,
                    'approved_applications': 0,
                    'rejected_applications': 0,
                    'pending_applications': 0,
                    'property_name': app.get('properties', {}).get('name', 'Unknown'),
                    'city': app.get('properties', {}).get('city', 'Unknown'),
                    'state': app.get('properties', {}).get('state', 'Unknown')
                }
            
            property_metrics[prop_id]['total_applications'] += 1
            
            status = app.get('status', 'pending')
            if status == 'approved':
                property_metrics[prop_id]['approved_applications'] += 1
            elif status == 'rejected':
                property_metrics[prop_id]['rejected_applications'] += 1
            else:
                property_metrics[prop_id]['pending_applications'] += 1
        
        # Calculate derived metrics
        for prop_id, metrics in property_metrics.items():
            total = metrics['total_applications']
            if total > 0:
                metrics['approval_rate'] = metrics['approved_applications'] / total * 100
                metrics['rejection_rate'] = metrics['rejected_applications'] / total * 100
            else:
                metrics['approval_rate'] = 0
                metrics['rejection_rate'] = 0
        
        return property_metrics
    
    async def _calculate_manager_dimension(self, raw_data: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """Calculate manager-based dimensional analysis"""
        manager_metrics = {}
        
        for app in raw_data['applications']:
            manager_id = app.get('reviewed_by')
            if not manager_id:
                continue
                
            if manager_id not in manager_metrics:
                manager_metrics[manager_id] = {
                    'total_reviews': 0,
                    'approved_reviews': 0,
                    'rejected_reviews': 0,
                    'avg_review_time': 0,
                    'manager_name': app.get('users', {}).get('first_name', 'Unknown')
                }
            
            manager_metrics[manager_id]['total_reviews'] += 1
            
            if app.get('status') == 'approved':
                manager_metrics[manager_id]['approved_reviews'] += 1
            elif app.get('status') == 'rejected':
                manager_metrics[manager_id]['rejected_reviews'] += 1
        
        return manager_metrics
    
    async def _calculate_department_dimension(self, raw_data: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """Calculate department-based dimensional analysis"""
        dept_metrics = {}
        
        for app in raw_data['applications']:
            dept = app.get('department', 'Unknown')
            
            if dept not in dept_metrics:
                dept_metrics[dept] = {
                    'total_applications': 0,
                    'approved_applications': 0,
                    'rejected_applications': 0
                }
            
            dept_metrics[dept]['total_applications'] += 1
            
            if app.get('status') == 'approved':
                dept_metrics[dept]['approved_applications'] += 1
            elif app.get('status') == 'rejected':
                dept_metrics[dept]['rejected_applications'] += 1
        
        return dept_metrics
    
    async def _calculate_temporal_dimension(self, raw_data: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """Calculate time-based dimensional analysis"""
        temporal_metrics = {}
        
        for app in raw_data['applications']:
            applied_at = app.get('applied_at')
            if not applied_at:
                continue
                
            try:
                dt = datetime.fromisoformat(applied_at.replace('Z', '+00:00'))
                month_key = dt.strftime('%Y-%m')
                
                if month_key not in temporal_metrics:
                    temporal_metrics[month_key] = {
                        'total_applications': 0,
                        'approved_applications': 0,
                        'rejected_applications': 0
                    }
                
                temporal_metrics[month_key]['total_applications'] += 1
                
                if app.get('status') == 'approved':
                    temporal_metrics[month_key]['approved_applications'] += 1
                elif app.get('status') == 'rejected':
                    temporal_metrics[month_key]['rejected_applications'] += 1
                    
            except Exception as e:
                logger.warning(f"Error parsing date {applied_at}: {e}")
                continue
        
        return temporal_metrics
    
    # =====================================
    # TIME SERIES AND TREND ANALYSIS
    # =====================================
    
    async def _generate_time_series(self, raw_data: Dict[str, List[Dict]], 
                                   config: AggregationConfig) -> List[TimeSeriesMetric]:
        """Generate time series data for metrics"""
        time_series = []
        
        # Generate application volume time series
        app_series = await self._generate_application_time_series(
            raw_data['applications'], config.granularity, config.time_range
        )
        time_series.append(app_series)
        
        # Generate approval rate time series
        approval_series = await self._generate_approval_rate_time_series(
            raw_data['applications'], config.granularity, config.time_range
        )
        time_series.append(approval_series)
        
        return time_series
    
    async def _generate_application_time_series(self, applications: List[Dict], 
                                              granularity: TimeGranularity,
                                              time_range: TimeRange) -> TimeSeriesMetric:
        """Generate application volume time series"""
        data_points = []
        
        # Create time buckets based on granularity
        current_time = time_range.start_date
        while current_time <= time_range.end_date:
            next_time = self._get_next_time_bucket(current_time, granularity)
            
            # Count applications in this time bucket
            count = 0
            for app in applications:
                try:
                    app_time = datetime.fromisoformat(app['applied_at'].replace('Z', '+00:00'))
                    if current_time <= app_time < next_time:
                        count += 1
                except Exception:
                    continue
            
            data_points.append(DataPoint(
                timestamp=current_time,
                value=float(count),
                metadata={"bucket_end": next_time.isoformat()}
            ))
            
            current_time = next_time
        
        return TimeSeriesMetric(
            id="application_volume",
            name="Application Volume",
            data_points=data_points,
            granularity=granularity,
            aggregation_type=AggregationType.COUNT,
            metadata={"description": "Number of applications over time"}
        )
    
    async def _generate_approval_rate_time_series(self, applications: List[Dict],
                                                granularity: TimeGranularity,
                                                time_range: TimeRange) -> TimeSeriesMetric:
        """Generate approval rate time series"""
        data_points = []
        
        current_time = time_range.start_date
        while current_time <= time_range.end_date:
            next_time = self._get_next_time_bucket(current_time, granularity)
            
            total_count = 0
            approved_count = 0
            
            for app in applications:
                try:
                    app_time = datetime.fromisoformat(app['applied_at'].replace('Z', '+00:00'))
                    if current_time <= app_time < next_time:
                        total_count += 1
                        if app.get('status') == 'approved':
                            approved_count += 1
                except Exception:
                    continue
            
            approval_rate = (approved_count / total_count * 100) if total_count > 0 else 0
            
            data_points.append(DataPoint(
                timestamp=current_time,
                value=approval_rate,
                metadata={
                    "total_applications": total_count,
                    "approved_applications": approved_count
                }
            ))
            
            current_time = next_time
        
        return TimeSeriesMetric(
            id="approval_rate",
            name="Approval Rate",
            data_points=data_points,
            granularity=granularity,
            aggregation_type=AggregationType.AVERAGE,
            metadata={"description": "Approval rate percentage over time"}
        )
    
    def _get_next_time_bucket(self, current_time: datetime, granularity: TimeGranularity) -> datetime:
        """Get next time bucket based on granularity"""
        if granularity == TimeGranularity.HOUR:
            return current_time + timedelta(hours=1)
        elif granularity == TimeGranularity.DAY:
            return current_time + timedelta(days=1)
        elif granularity == TimeGranularity.WEEK:
            return current_time + timedelta(weeks=1)
        elif granularity == TimeGranularity.MONTH:
            # Approximate month as 30 days
            return current_time + timedelta(days=30)
        elif granularity == TimeGranularity.QUARTER:
            return current_time + timedelta(days=90)
        elif granularity == TimeGranularity.YEAR:
            return current_time + timedelta(days=365)
        else:
            return current_time + timedelta(days=1)
    
    async def _calculate_trends(self, time_series: List[TimeSeriesMetric]) -> Dict[str, TrendAnalysis]:
        """Calculate trend analysis for time series data"""
        trends = {}
        
        for series in time_series:
            try:
                if len(series.data_points) < 2:
                    continue
                
                # Extract values and timestamps
                values = [point.value for point in series.data_points]
                timestamps = [point.timestamp.timestamp() for point in series.data_points]
                
                # Calculate linear regression
                slope, intercept, r_value, p_value, std_err = stats.linregress(timestamps, values)
                
                # Determine trend direction
                if abs(slope) < 0.01:  # Threshold for "stable"
                    direction = "stable"
                elif slope > 0:
                    direction = "up"
                else:
                    direction = "down"
                
                # Determine significance
                r_squared = r_value ** 2
                if r_squared > 0.7:
                    significance = "high"
                elif r_squared > 0.3:
                    significance = "medium"
                else:
                    significance = "low"
                
                # Calculate magnitude (percentage change)
                if len(values) >= 2:
                    start_value = values[0] if values[0] != 0 else 0.01
                    end_value = values[-1]
                    magnitude = ((end_value - start_value) / start_value) * 100
                else:
                    magnitude = 0
                
                # Generate description
                description = self._generate_trend_description(direction, magnitude, significance)
                
                trends[series.id] = TrendAnalysis(
                    direction=direction,
                    magnitude=magnitude,
                    significance=significance,
                    r_squared=r_squared,
                    slope=slope,
                    description=description
                )
                
            except Exception as e:
                logger.error(f"Error calculating trend for {series.id}: {e}")
                continue
        
        return trends
    
    def _generate_trend_description(self, direction: str, magnitude: float, significance: str) -> str:
        """Generate human-readable trend description"""
        if direction == "stable":
            return f"Metric remains stable with {significance} confidence"
        elif direction == "up":
            return f"Metric trending upward by {magnitude:.1f}% with {significance} confidence"
        else:
            return f"Metric trending downward by {abs(magnitude):.1f}% with {significance} confidence"
    
    # =====================================
    # BUSINESS INSIGHTS GENERATION
    # =====================================
    
    async def _generate_insights(self, metrics: Dict[str, Any], 
                               trends: Dict[str, TrendAnalysis],
                               dimensions: Dict[str, Dict[str, Any]]) -> List[BusinessInsight]:
        """Generate actionable business insights"""
        insights = []
        
        # Insight 1: Low approval rate alert
        if metrics.get('rejection_rate', 0) > 70:
            insights.append(BusinessInsight(
                type="alert",
                title="High Rejection Rate Detected",
                description=f"Current rejection rate is {metrics['rejection_rate']:.1f}%, which is above the recommended threshold of 70%.",
                impact="high",
                recommendation="Review job requirements and application screening criteria to reduce unnecessary rejections.",
                data_points=[{"metric": "rejection_rate", "value": metrics['rejection_rate']}],
                confidence=0.9
            ))
        
        # Insight 2: Slow hiring process
        if metrics.get('time_to_hire', 0) > 168:  # More than 7 days
            insights.append(BusinessInsight(
                type="performance",
                title="Slow Hiring Process",
                description=f"Average time to hire is {metrics['time_to_hire']:.1f} hours ({metrics['time_to_hire']/24:.1f} days).",
                impact="medium",
                recommendation="Streamline the approval process and set up automated reminders for managers.",
                data_points=[{"metric": "time_to_hire", "value": metrics['time_to_hire']}],
                confidence=0.8
            ))
        
        # Insight 3: Property performance variation
        if 'property' in dimensions:
            property_data = dimensions['property']
            approval_rates = [data.get('approval_rate', 0) for data in property_data.values()]
            if len(approval_rates) > 1:
                std_dev = np.std(approval_rates)
                if std_dev > 20:  # High variation
                    insights.append(BusinessInsight(
                        type="opportunity",
                        title="Inconsistent Property Performance",
                        description=f"Property approval rates vary significantly (std dev: {std_dev:.1f}%).",
                        impact="medium",
                        recommendation="Identify best-performing properties and share their practices with underperforming ones.",
                        data_points=[{"metric": "property_approval_rate_variance", "value": std_dev}],
                        confidence=0.7
                    ))
        
        # Insight 4: Trending analysis
        for metric_id, trend in trends.items():
            if trend.significance == "high" and abs(trend.magnitude) > 20:
                if trend.direction == "down" and metric_id in ["approval_rate", "onboarding_completion_rate"]:
                    insights.append(BusinessInsight(
                        type="alert",
                        title=f"Declining {metric_id.replace('_', ' ').title()}",
                        description=f"{metric_id.replace('_', ' ').title()} has declined by {abs(trend.magnitude):.1f}% with high confidence.",
                        impact="high",
                        recommendation="Investigate root causes and implement corrective measures immediately.",
                        data_points=[{"metric": metric_id, "trend": asdict(trend)}],
                        confidence=trend.r_squared
                    ))
        
        return insights
    
    # =====================================
    # FORECASTING AND PREDICTIVE ANALYTICS
    # =====================================
    
    async def generate_forecasts(self, time_series: List[TimeSeriesMetric], 
                               forecast_periods: int = 12) -> Dict[str, List[DataPoint]]:
        """Generate forecasts for time series metrics"""
        forecasts = {}
        
        for series in time_series:
            try:
                if len(series.data_points) < 3:
                    continue
                
                # Simple linear extrapolation for now
                # In production, you'd use more sophisticated forecasting models
                values = [point.value for point in series.data_points]
                timestamps = [point.timestamp.timestamp() for point in series.data_points]
                
                # Calculate trend
                slope, intercept, _, _, _ = stats.linregress(timestamps, values)
                
                # Generate forecast points
                last_timestamp = timestamps[-1]
                time_interval = (timestamps[-1] - timestamps[0]) / (len(timestamps) - 1)
                
                forecast_points = []
                for i in range(1, forecast_periods + 1):
                    future_timestamp = last_timestamp + (time_interval * i)
                    future_value = slope * future_timestamp + intercept
                    
                    # Ensure non-negative values for counts
                    if series.aggregation_type == AggregationType.COUNT:
                        future_value = max(0, future_value)
                    
                    forecast_points.append(DataPoint(
                        timestamp=datetime.fromtimestamp(future_timestamp, tz=timezone.utc),
                        value=future_value,
                        metadata={"forecast": True, "confidence": 0.7}
                    ))
                
                forecasts[series.id] = forecast_points
                
            except Exception as e:
                logger.error(f"Error generating forecast for {series.id}: {e}")
                continue
        
        return forecasts
    
    # =====================================
    # UTILITY METHODS
    # =====================================
    
    async def invalidate_cache(self, pattern: str = "analytics:*"):
        """Invalidate analytics cache"""
        if not self.redis_client:
            return
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache keys")
        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get analytics cache statistics"""
        if not self.redis_client:
            return {"cache_enabled": False}
        
        try:
            info = self.redis_client.info()
            keys = self.redis_client.keys("analytics:*")
            
            return {
                "cache_enabled": True,
                "total_keys": len(keys),
                "memory_usage": info.get("used_memory_human", "Unknown"),
                "hit_rate": info.get("keyspace_hits", 0) / max(1, info.get("keyspace_misses", 0) + info.get("keyspace_hits", 0))
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"cache_enabled": True, "error": str(e)}