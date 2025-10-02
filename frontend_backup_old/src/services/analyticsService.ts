import { apiClient } from './apiClient';

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface TimeRangeRequest {
  start_date: string;
  end_date: string;
  timezone?: string;
}

export interface MetricRequest {
  id: string;
  name: string;
  type: 'count' | 'sum' | 'average' | 'percentage' | 'ratio' | 'trend' | 'forecast';
  field: string;
  calculation?: string;
  format?: string;
}

export interface DimensionRequest {
  id: string;
  name: string;
  type: 'property' | 'manager' | 'department' | 'position' | 'temporal' | 'status';
  field: string;
  hierarchy?: string[];
}

export interface FilterRequest {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'like';
  value: any;
  condition?: 'AND' | 'OR';
}

export interface AnalyticsQueryRequest {
  time_range: TimeRangeRequest;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics?: MetricRequest[];
  dimensions?: DimensionRequest[];
  filters?: FilterRequest[];
  include_trends?: boolean;
  include_forecasts?: boolean;
  include_insights?: boolean;
  cache_ttl?: number;
}

export interface QuickMetricsRequest {
  property_id?: string;
  manager_id?: string;
  time_range: TimeRangeRequest;
  metric_types?: string[];
}

export interface TrendAnalysisRequest {
  metric_id: string;
  time_range: TimeRangeRequest;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  forecast_periods?: number;
  confidence_level?: number;
}

export interface PropertyComparisonRequest {
  property_ids?: string[];
  time_range: TimeRangeRequest;
  metrics?: string[];
  include_benchmarks?: boolean;
}

export interface ManagerPerformanceRequest {
  manager_ids?: string[];
  property_id?: string;
  time_range: TimeRangeRequest;
  include_efficiency_metrics?: boolean;
  include_quality_metrics?: boolean;
}

// Response types
export interface AnalyticsResponse {
  success: boolean;
  data: any;
  message: string;
  timestamp: string;
}

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesMetric {
  id: string;
  name: string;
  data_points: DataPoint[];
  granularity: string;
  aggregation_type: string;
  metadata?: Record<string, any>;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  significance: 'high' | 'medium' | 'low';
  r_squared: number;
  slope: number;
  description: string;
}

export interface BusinessInsight {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  data_points: any[];
  confidence: number;
}

export interface AnalyticsQueryResponse {
  metrics: Record<string, number>;
  dimensions: Record<string, Record<string, any>>;
  time_series: TimeSeriesMetric[];
  trends: Record<string, TrendAnalysis>;
  insights: BusinessInsight[];
  forecasts: Record<string, DataPoint[]>;
  metadata: {
    generated_at: string;
    time_range: {
      start: string;
      end: string;
    };
    granularity: string;
    cache_key: string;
  };
}

// =====================================
// ANALYTICS SERVICE CLASS
// =====================================

class AnalyticsService {
  private baseUrl = '/api/analytics';

  /**
   * Execute comprehensive analytics query
   */
  async executeQuery(request: AnalyticsQueryRequest): Promise<AnalyticsQueryResponse> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/query`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Analytics query failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Analytics query error:', error);
      throw error;
    }
  }

  /**
   * Get quick dashboard metrics
   */
  async getQuickMetrics(request: QuickMetricsRequest): Promise<{
    kpis: Record<string, number>;
    property_breakdown: Record<string, any>;
    generated_at: string;
    time_range: {
      start: string;
      end: string;
    };
  }> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/quick-metrics`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Quick metrics request failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Quick metrics error:', error);
      throw error;
    }
  }

  /**
   * Analyze trends for specific metrics
   */
  async analyzeTrends(request: TrendAnalysisRequest): Promise<{
    metric: {
      id: string;
      name: string;
      current_value: number;
    };
    time_series: DataPoint[];
    trend_analysis: TrendAnalysis;
    forecasts: DataPoint[];
    confidence_level: number;
    analysis_period: {
      start: string;
      end: string;
      granularity: string;
    };
  }> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/trends`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Trend analysis failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Trend analysis error:', error);
      throw error;
    }
  }

  /**
   * Compare property performance
   */
  async compareProperties(request: PropertyComparisonRequest): Promise<{
    properties: Record<string, any>;
    benchmarks: Record<string, any>;
    overall_metrics: Record<string, number>;
    comparison_period: {
      start: string;
      end: string;
    };
    insights: BusinessInsight[];
  }> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/property-comparison`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Property comparison failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Property comparison error:', error);
      throw error;
    }
  }

  /**
   * Analyze manager performance
   */
  async analyzeManagerPerformance(request: ManagerPerformanceRequest): Promise<{
    managers: Record<string, any>;
    overall_metrics: Record<string, number>;
    property_breakdown: Record<string, any>;
    performance_insights: BusinessInsight[];
    analysis_period: {
      start: string;
      end: string;
    };
  }> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/manager-performance`,
        request
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Manager performance analysis failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Manager performance analysis error:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics for live dashboard
   */
  async getRealTimeMetrics(propertyId?: string): Promise<{
    kpis: Record<string, number>;
    property_breakdown: Record<string, any>;
    generated_at: string;
    time_range: {
      start: string;
      end: string;
    };
  }> {
    try {
      const params = propertyId ? { property_id: propertyId } : {};
      const response = await apiClient.get<AnalyticsResponse>(
        `${this.baseUrl}/realtime/metrics`,
        { params }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Real-time metrics request failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Real-time metrics error:', error);
      throw error;
    }
  }

  // =====================================
  // CACHE MANAGEMENT METHODS
  // =====================================

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    performance: any;
    memory_cache: any;
    redis_cache: any;
    configurations: any;
  }> {
    try {
      const response = await apiClient.get<AnalyticsResponse>(
        `${this.baseUrl}/cache/stats`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Cache stats request failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Cache stats error:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidateCache(cacheType: string, pattern: string = '*'): Promise<{
    deleted_count: number;
  }> {
    try {
      const response = await apiClient.post<AnalyticsResponse>(
        `${this.baseUrl}/cache/invalidate`,
        null,
        {
          params: {
            cache_type: cacheType,
            pattern: pattern,
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Cache invalidation failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw error;
    }
  }

  /**
   * Check cache health
   */
  async checkCacheHealth(): Promise<{
    memory_cache: string;
    redis_cache: string;
    overall: string;
  }> {
    try {
      const response = await apiClient.get<AnalyticsResponse>(
        `${this.baseUrl}/cache/health`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Cache health check failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('Cache health check error:', error);
      throw error;
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Create time range for common periods
   */
  createTimeRange(period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth'): TimeRangeRequest {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          start_date: today.toISOString(),
          end_date: now.toISOString(),
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        return {
          start_date: yesterday.toISOString(),
          end_date: endOfYesterday.toISOString(),
        };
      
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          start_date: sevenDaysAgo.toISOString(),
          end_date: now.toISOString(),
        };
      
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          start_date: thirtyDaysAgo.toISOString(),
          end_date: now.toISOString(),
        };
      
      case 'last90days':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return {
          start_date: ninetyDaysAgo.toISOString(),
          end_date: now.toISOString(),
        };
      
      case 'thisMonth':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start_date: startOfMonth.toISOString(),
          end_date: now.toISOString(),
        };
      
      case 'lastMonth':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return {
          start_date: startOfLastMonth.toISOString(),
          end_date: endOfLastMonth.toISOString(),
        };
      
      default:
        return this.createTimeRange('last30days');
    }
  }

  /**
   * Create standard metric definitions
   */
  createStandardMetrics(): MetricRequest[] {
    return [
      {
        id: 'total_applications',
        name: 'Total Applications',
        type: 'count',
        field: 'id',
      },
      {
        id: 'approved_applications',
        name: 'Approved Applications',
        type: 'count',
        field: 'id',
      },
      {
        id: 'rejection_rate',
        name: 'Rejection Rate',
        type: 'percentage',
        field: 'status',
        calculation: 'rejected / total * 100',
        format: 'percentage',
      },
      {
        id: 'time_to_hire',
        name: 'Average Time to Hire',
        type: 'average',
        field: 'time_to_hire_hours',
        format: 'hours',
      },
      {
        id: 'onboarding_completion_rate',
        name: 'Onboarding Completion Rate',
        type: 'percentage',
        field: 'onboarding_status',
        calculation: 'completed / total * 100',
        format: 'percentage',
      },
    ];
  }

  /**
   * Create standard dimension definitions
   */
  createStandardDimensions(): DimensionRequest[] {
    return [
      {
        id: 'property',
        name: 'Property',
        type: 'property',
        field: 'property_id',
        hierarchy: ['property_id', 'city', 'state'],
      },
      {
        id: 'manager',
        name: 'Manager',
        type: 'manager',
        field: 'manager_id',
      },
      {
        id: 'department',
        name: 'Department',
        type: 'department',
        field: 'department',
      },
      {
        id: 'time',
        name: 'Time',
        type: 'temporal',
        field: 'created_at',
        hierarchy: ['year', 'quarter', 'month', 'week', 'day'],
      },
    ];
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;