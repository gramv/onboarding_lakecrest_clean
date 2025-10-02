import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import analytics components
import { InteractiveChart, TimeSeriesData } from './InteractiveChart';
import { TrendIndicator, TrendData } from './TrendIndicator';
import { HiringFunnelChart, FunnelData } from './HiringFunnelChart';
import { PropertyComparisonChart, PropertyComparisonData } from './PropertyComparisonChart';

// Import analytics service
import { analyticsService, AnalyticsQueryResponse } from '@/services/analyticsService';

// =====================================
// TYPES AND INTERFACES
// =====================================

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit: string;
  trend?: TrendData;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

interface DashboardFilters {
  timeRange: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth';
  propertyIds?: string[];
  departments?: string[];
  positions?: string[];
}

interface HRAnalyticsDashboardProps {
  className?: string;
}

// =====================================
// KPI CARD COMPONENT
// =====================================

interface KPICardProps {
  metric: KPIMetric;
  onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({ metric, onClick }) => {
  const formatValue = (value: number) => {
    if (metric.unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (metric.unit === 'hours') {
      return `${value.toFixed(1)}h`;
    } else if (metric.unit === 'days') {
      return `${value.toFixed(1)}d`;
    } else {
      return value.toLocaleString();
    }
  };

  const getChangeFromPrevious = () => {
    if (!metric.previousValue) return null;
    
    const change = ((metric.value - metric.previousValue) / metric.previousValue) * 100;
    return {
      value: Math.abs(change),
      direction: change >= 0 ? 'up' : 'down',
      isPositive: metric.id === 'rejection_rate' ? change < 0 : change >= 0,
    };
  };

  const getTargetProgress = () => {
    if (!metric.target) return null;
    
    const progress = (metric.value / metric.target) * 100;
    return {
      percentage: Math.min(progress, 100),
      isOnTrack: progress >= 80,
    };
  };

  const change = getChangeFromPrevious();
  const targetProgress = getTargetProgress();

  return (
    <Card 
      className={cn(
        'p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105',
        'border-l-4'
      )}
      style={{ borderLeftColor: metric.color }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: metric.color + '20' }}
          >
            <metric.icon 
              className="h-5 w-5" 
              style={{ color: metric.color }} 
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {metric.name}
            </h3>
            <p className="text-xs text-gray-600">
              {metric.description}
            </p>
          </div>
        </div>
        
        {metric.trend && (
          <TrendIndicator
            trend={metric.trend}
            variant="compact"
            size="sm"
            showConfidence={false}
          />
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {formatValue(metric.value)}
        </div>
        
        {/* Change from previous */}
        {change && (
          <div className="flex items-center space-x-2">
            <div className={cn(
              'flex items-center text-sm',
              change.isPositive ? 'text-green-600' : 'text-red-600'
            )}>
              {change.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span>{change.value.toFixed(1)}%</span>
            </div>
            <span className="text-xs text-gray-500">vs previous period</span>
          </div>
        )}
      </div>

      {/* Target Progress */}
      {targetProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Target Progress</span>
            <span className={cn(
              'font-medium',
              targetProgress.isOnTrack ? 'text-green-600' : 'text-yellow-600'
            )}>
              {targetProgress.percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                targetProgress.isOnTrack ? 'bg-green-500' : 'bg-yellow-500'
              )}
              style={{ width: `${targetProgress.percentage}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

// =====================================
// INSIGHTS PANEL COMPONENT
// =====================================

interface InsightsPanelProps {
  insights: Array<{
    type: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
    confidence: number;
  }>;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Activity className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
        AI-Powered Insights
      </h3>
      
      <div className="space-y-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={cn(
              'p-4 rounded-lg border',
              getImpactColor(insight.impact)
            )}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getImpactIcon(insight.impact)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">
                    {insight.title}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(insight.confidence * 100)}% confidence
                  </Badge>
                </div>
                
                <p className="text-sm mb-3 opacity-90">
                  {insight.description}
                </p>
                
                <div className="bg-white bg-opacity-50 p-3 rounded border">
                  <h5 className="font-medium text-xs mb-1">Recommendation:</h5>
                  <p className="text-xs">
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {insights.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No insights available for the current period.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

// =====================================
// MAIN HR ANALYTICS DASHBOARD COMPONENT
// =====================================

export const HRAnalyticsDashboard: React.FC<HRAnalyticsDashboardProps> = ({
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsQueryResponse | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: 'last30days',
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load analytics data
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const timeRange = analyticsService.createTimeRange(filters.timeRange);
      const metrics = analyticsService.createStandardMetrics();
      const dimensions = analyticsService.createStandardDimensions();

      const response = await analyticsService.executeQuery({
        time_range: timeRange,
        granularity: 'day',
        metrics,
        dimensions,
        filters: [],
        include_trends: true,
        include_forecasts: false,
        include_insights: true,
      });

      setAnalyticsData(response);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  // Create KPI metrics from analytics data
  const kpiMetrics = useMemo((): KPIMetric[] => {
    if (!analyticsData) return [];

    return [
      {
        id: 'total_applications',
        name: 'Total Applications',
        value: analyticsData.metrics.total_applications || 0,
        unit: '',
        icon: Users,
        color: '#3B82F6',
        description: 'Applications received in period',
        trend: analyticsData.trends.total_applications,
        target: 1000,
      },
      {
        id: 'approved_applications',
        name: 'Approved Applications',
        value: analyticsData.metrics.approved_applications || 0,
        unit: '',
        icon: CheckCircle,
        color: '#10B981',
        description: 'Applications approved',
        trend: analyticsData.trends.approved_applications,
      },
      {
        id: 'rejection_rate',
        name: 'Rejection Rate',
        value: analyticsData.metrics.rejection_rate || 0,
        unit: '%',
        icon: XCircle,
        color: '#EF4444',
        description: 'Percentage of applications rejected',
        trend: analyticsData.trends.rejection_rate,
        target: 30, // Target to keep rejection rate below 30%
      },
      {
        id: 'time_to_hire',
        name: 'Time to Hire',
        value: (analyticsData.metrics.time_to_hire || 0) / 24, // Convert hours to days
        unit: 'days',
        icon: Clock,
        color: '#F59E0B',
        description: 'Average time from application to hire',
        trend: analyticsData.trends.time_to_hire,
        target: 7, // Target 7 days
      },
      {
        id: 'onboarding_completion_rate',
        name: 'Onboarding Completion',
        value: analyticsData.metrics.onboarding_completion_rate || 0,
        unit: '%',
        icon: Target,
        color: '#8B5CF6',
        description: 'Onboarding sessions completed',
        trend: analyticsData.trends.onboarding_completion_rate,
        target: 95,
      },
      {
        id: 'manager_efficiency',
        name: 'Manager Efficiency',
        value: analyticsData.metrics.manager_efficiency || 0,
        unit: 'hours',
        icon: Activity,
        color: '#06B6D4',
        description: 'Average manager review time',
        trend: analyticsData.trends.manager_efficiency,
        target: 24,
      },
    ];
  }, [analyticsData]);

  // Create funnel data
  const funnelData = useMemo((): FunnelData | null => {
    if (!analyticsData) return null;

    const totalApplications = analyticsData.metrics.total_applications || 0;
    const approvedApplications = analyticsData.metrics.approved_applications || 0;
    const rejectedApplications = totalApplications - approvedApplications;

    return {
      stages: [
        {
          id: 'applied',
          name: 'Applications Received',
          count: totalApplications,
          percentage: 100,
          color: '#3B82F6',
          icon: <Users className="h-4 w-4" />,
          description: 'Initial applications submitted',
        },
        {
          id: 'under_review',
          name: 'Under Review',
          count: Math.round(totalApplications * 0.8),
          percentage: 80,
          color: '#F59E0B',
          icon: <Clock className="h-4 w-4" />,
          description: 'Applications being reviewed by managers',
          conversionRate: 80,
          dropoffRate: 20,
        },
        {
          id: 'approved',
          name: 'Approved',
          count: approvedApplications,
          percentage: (approvedApplications / totalApplications) * 100,
          color: '#10B981',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Applications approved for hiring',
          conversionRate: (approvedApplications / (totalApplications * 0.8)) * 100,
        },
        {
          id: 'hired',
          name: 'Successfully Hired',
          count: Math.round(approvedApplications * 0.9),
          percentage: (Math.round(approvedApplications * 0.9) / totalApplications) * 100,
          color: '#8B5CF6',
          icon: <Target className="h-4 w-4" />,
          description: 'Completed onboarding and hired',
          conversionRate: 90,
        },
      ],
      totalApplications,
      overallConversionRate: (Math.round(approvedApplications * 0.9) / totalApplications) * 100,
      averageTimeToHire: (analyticsData.metrics.time_to_hire || 0) / 24,
      period: {
        start: analyticsData.metadata.time_range.start,
        end: analyticsData.metadata.time_range.end,
      },
    };
  }, [analyticsData]);

  // Handle refresh
  const handleRefresh = () => {
    loadAnalyticsData();
  };

  // Handle export
  const handleExport = () => {
    // Implementation for exporting dashboard data
    console.log('Exporting dashboard data...');
  };

  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: DashboardFilters['timeRange']) => {
    setFilters(prev => ({ ...prev, timeRange: newTimeRange }));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            HR Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into hiring and onboarding performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={filters.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics data...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && analyticsData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiMetrics.map((metric) => (
              <KPICard key={metric.id} metric={metric} />
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="funnel">Hiring Funnel</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Volume Chart */}
                <InteractiveChart
                  data={analyticsData.time_series.filter(ts => ts.id === 'application_volume')}
                  type="line"
                  title="Application Volume Trend"
                  subtitle="Daily application submissions"
                  height={300}
                  showTrend={true}
                  trendData={analyticsData.trends}
                  realTimeUpdates={false}
                />

                {/* Approval Rate Chart */}
                <InteractiveChart
                  data={analyticsData.time_series.filter(ts => ts.id === 'approval_rate')}
                  type="area"
                  title="Approval Rate Trend"
                  subtitle="Percentage of applications approved"
                  height={300}
                  showTrend={true}
                  trendData={analyticsData.trends}
                  colors={['#10B981']}
                />
              </div>

              {/* Department Breakdown */}
              {analyticsData.dimensions.department && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Applications by Department
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(analyticsData.dimensions.department).map(([dept, data]: [string, any]) => (
                      <div key={dept} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {data.total_applications || 0}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {dept}
                        </div>
                        <div className="text-xs text-green-600">
                          {((data.approved_applications || 0) / (data.total_applications || 1) * 100).toFixed(1)}% approved
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Hiring Funnel Tab */}
            <TabsContent value="funnel">
              {funnelData && (
                <HiringFunnelChart
                  data={funnelData}
                  title="Hiring Process Funnel"
                  showTrends={true}
                  showTimeMetrics={true}
                  showConversionRates={true}
                  interactive={true}
                />
              )}
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties">
              {analyticsData.dimensions.property && (
                <PropertyComparisonChart
                  data={{
                    properties: Object.entries(analyticsData.dimensions.property).map(([propId, data]: [string, any]) => ({
                      propertyId: propId,
                      propertyName: data.property_name || 'Unknown Property',
                      city: data.city || 'Unknown',
                      state: data.state || 'Unknown',
                      totalApplications: data.total_applications || 0,
                      approvedApplications: data.approved_applications || 0,
                      rejectedApplications: data.rejected_applications || 0,
                      pendingApplications: data.pending_applications || 0,
                      approvalRate: data.approval_rate || 0,
                      rejectionRate: data.rejection_rate || 0,
                      averageTimeToHire: (data.average_time_to_hire || 0) / 24,
                      managerCount: data.manager_count || 0,
                      employeeCount: data.employee_count || 0,
                      performanceScore: data.approval_rate || 0,
                    })),
                    benchmarks: {
                      approvalRate: {
                        average: 65,
                        median: 70,
                        topQuartile: 80,
                        bottomQuartile: 50,
                        best: 95,
                        worst: 30,
                      },
                    },
                    period: {
                      start: analyticsData.metadata.time_range.start,
                      end: analyticsData.metadata.time_range.end,
                    },
                    metadata: {
                      totalProperties: Object.keys(analyticsData.dimensions.property).length,
                      totalApplications: analyticsData.metrics.total_applications || 0,
                      overallApprovalRate: ((analyticsData.metrics.approved_applications || 0) / (analyticsData.metrics.total_applications || 1)) * 100,
                    },
                  }}
                  title="Property Performance Analysis"
                  showBenchmarks={true}
                  showTrends={true}
                  showRankings={true}
                />
              )}
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights">
              <InsightsPanel insights={analyticsData.insights} />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleString()} • 
            Data from {new Date(analyticsData.metadata.time_range.start).toLocaleDateString()} to {new Date(analyticsData.metadata.time_range.end).toLocaleDateString()}
          </div>
        </>
      )}
    </div>
  );
};

export default HRAnalyticsDashboard;