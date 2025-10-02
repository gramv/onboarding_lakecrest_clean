import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  Brain,
  Calendar,
  Users,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
  Activity,
  Clock,
  RefreshCw,
  Download,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import analytics components
import { InteractiveChart, TimeSeriesData, DataPoint } from './InteractiveChart';
import { TrendIndicator, TrendData } from './TrendIndicator';

// Import analytics service
import { analyticsService } from '@/services/analyticsService';

// =====================================
// TYPES AND INTERFACES
// =====================================

interface ForecastData {
  metricId: string;
  metricName: string;
  historical: DataPoint[];
  forecast: DataPoint[];
  confidence: number;
  trend: TrendData;
  seasonality?: {
    pattern: 'weekly' | 'monthly' | 'quarterly';
    strength: number;
    peaks: string[];
    valleys: string[];
  };
  accuracy?: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    r2: number;   // R-squared
  };
}

interface CapacityPlan {
  period: string;
  expectedApplications: number;
  currentCapacity: number;
  recommendedCapacity: number;
  utilizationRate: number;
  bottlenecks: Array<{
    area: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  staffingRecommendations: Array<{
    role: string;
    currentCount: number;
    recommendedCount: number;
    reasoning: string;
  }>;
}

interface PredictiveInsight {
  id: string;
  type: 'forecast' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timeframe: string;
  recommendation: string;
  data: any;
}

interface PredictiveAnalyticsProps {
  propertyId?: string;
  timeHorizon?: 'short' | 'medium' | 'long'; // 1 month, 3 months, 12 months
  className?: string;
}

// =====================================
// FORECAST CHART COMPONENT
// =====================================

interface ForecastChartProps {
  forecast: ForecastData;
  showConfidenceInterval?: boolean;
}

const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  showConfidenceInterval = true,
}) => {
  // Combine historical and forecast data
  const chartData: TimeSeriesData[] = [
    {
      id: 'historical',
      name: 'Historical',
      data_points: forecast.historical,
      granularity: 'day',
      aggregation_type: 'value',
    },
    {
      id: 'forecast',
      name: 'Forecast',
      data_points: forecast.forecast,
      granularity: 'day',
      aggregation_type: 'forecast',
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {forecast.metricName} Forecast
          </h3>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-xs">
              {Math.round(forecast.confidence * 100)}% confidence
            </Badge>
            {forecast.accuracy && (
              <Badge variant="outline" className="text-xs">
                {forecast.accuracy.mape.toFixed(1)}% MAPE
              </Badge>
            )}
          </div>
        </div>
        
        <TrendIndicator
          trend={forecast.trend}
          variant="compact"
          showConfidence={false}
        />
      </div>

      <InteractiveChart
        data={chartData}
        type="line"
        height={300}
        showTrend={false}
        colors={['#3B82F6', '#F59E0B']}
        animate={true}
      />

      {/* Seasonality Info */}
      {forecast.seasonality && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Activity className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Seasonal Pattern Detected
            </span>
          </div>
          <p className="text-xs text-blue-700">
            {forecast.seasonality.pattern} pattern with {forecast.seasonality.strength.toFixed(0)}% strength. 
            Peak periods: {forecast.seasonality.peaks.join(', ')}
          </p>
        </div>
      )}
    </Card>
  );
};

// =====================================
// CAPACITY PLANNING COMPONENT
// =====================================

interface CapacityPlanningProps {
  capacityPlan: CapacityPlan;
}

const CapacityPlanning: React.FC<CapacityPlanningProps> = ({
  capacityPlan,
}) => {
  const getUtilizationColor = (rate: number) => {
    if (rate > 90) return 'text-red-600';
    if (rate > 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Capacity Overview - {capacityPlan.period}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {capacityPlan.expectedApplications.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Expected Applications</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {capacityPlan.currentCapacity.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Current Capacity</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {capacityPlan.recommendedCapacity.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Recommended Capacity</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className={cn('text-2xl font-bold', getUtilizationColor(capacityPlan.utilizationRate))}>
              {capacityPlan.utilizationRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Utilization Rate</div>
          </div>
        </div>

        {/* Capacity Gap Analysis */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Capacity Gap Analysis</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current vs Recommended</span>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min((capacityPlan.currentCapacity / capacityPlan.recommendedCapacity) * 100, 100)}%` 
                  }}
                />
              </div>
              <span className="text-sm font-medium">
                {((capacityPlan.recommendedCapacity - capacityPlan.currentCapacity) / capacityPlan.currentCapacity * 100).toFixed(0)}% gap
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Bottlenecks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
          Identified Bottlenecks
        </h3>
        
        <div className="space-y-3">
          {capacityPlan.bottlenecks.map((bottleneck, index) => (
            <div
              key={index}
              className={cn('p-4 rounded-lg border', getSeverityColor(bottleneck.severity))}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{bottleneck.area}</h4>
                <Badge className={getSeverityColor(bottleneck.severity)}>
                  {bottleneck.severity} priority
                </Badge>
              </div>
              <p className="text-sm mb-3 opacity-90">
                {bottleneck.description}
              </p>
              <div className="bg-white bg-opacity-50 p-3 rounded border">
                <h5 className="font-medium text-xs mb-1">Recommendation:</h5>
                <p className="text-xs">{bottleneck.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Staffing Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Target className="h-5 w-5 mr-2 text-green-600" />
          Staffing Recommendations
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Current
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recommended
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reasoning
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {capacityPlan.staffingRecommendations.map((rec, index) => {
                const change = rec.recommendedCount - rec.currentCount;
                return (
                  <tr key={index}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.role}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.currentCount}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.recommendedCount}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={cn(
                        'font-medium',
                        change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                      )}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {rec.reasoning}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// =====================================
// PREDICTIVE INSIGHTS COMPONENT
// =====================================

interface PredictiveInsightsProps {
  insights: PredictiveInsight[];
}

const PredictiveInsights: React.FC<PredictiveInsightsProps> = ({
  insights,
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'forecast':
        return <TrendingUp className="h-4 w-4" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity':
        return <Target className="h-4 w-4" />;
      case 'risk':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'forecast':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'anomaly':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'opportunity':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'risk':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Brain className="h-5 w-5 mr-2 text-purple-600" />
        AI-Powered Predictive Insights
      </h3>
      
      <div className="space-y-4">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn('p-4 rounded-lg border', getInsightColor(insight.type))}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getInsightIcon(insight.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">
                    {insight.title}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.timeframe}
                    </Badge>
                  </div>
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
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No predictive insights available for the current period.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

// =====================================
// MAIN PREDICTIVE ANALYTICS COMPONENT
// =====================================

export const PredictiveAnalytics: React.FC<PredictiveAnalyticsProps> = ({
  propertyId,
  timeHorizon = 'medium',
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [capacityPlan, setCapacityPlan] = useState<CapacityPlan | null>(null);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [activeTab, setActiveTab] = useState('forecasts');

  // Get forecast periods based on time horizon
  const getForecastPeriods = () => {
    switch (timeHorizon) {
      case 'short':
        return 30; // 30 days
      case 'long':
        return 365; // 1 year
      default:
        return 90; // 3 months
    }
  };

  // Load predictive analytics data
  const loadPredictiveData = async () => {
    setIsLoading(true);
    try {
      const timeRange = analyticsService.createTimeRange('last90days');
      const forecastPeriods = getForecastPeriods();

      // Get trend analysis with forecasts
      const trendResponse = await analyticsService.analyzeTrends({
        metric_id: 'total_applications',
        time_range: timeRange,
        granularity: 'day',
        forecast_periods: forecastPeriods,
        confidence_level: 0.95,
      });

      // Create forecast data
      const forecastData: ForecastData = {
        metricId: 'total_applications',
        metricName: 'Application Volume',
        historical: trendResponse.time_series,
        forecast: trendResponse.forecasts,
        confidence: trendResponse.confidence_level,
        trend: trendResponse.trend_analysis,
        seasonality: {
          pattern: 'weekly',
          strength: 65,
          peaks: ['Monday', 'Tuesday'],
          valleys: ['Saturday', 'Sunday'],
        },
        accuracy: {
          mape: 12.5,
          rmse: 8.3,
          r2: 0.85,
        },
      };

      setForecasts([forecastData]);

      // Create mock capacity plan
      const mockCapacityPlan: CapacityPlan = {
        period: `Next ${forecastPeriods} days`,
        expectedApplications: trendResponse.forecasts.reduce((sum, point) => sum + point.value, 0),
        currentCapacity: 500,
        recommendedCapacity: 650,
        utilizationRate: 85.2,
        bottlenecks: [
          {
            area: 'Manager Review Process',
            severity: 'high',
            description: 'Current manager capacity cannot handle projected application volume during peak periods.',
            recommendation: 'Add 2 additional managers or implement automated pre-screening to reduce manager workload by 30%.',
          },
          {
            area: 'Onboarding Capacity',
            severity: 'medium',
            description: 'Onboarding process may become bottleneck if hiring rate increases as projected.',
            recommendation: 'Streamline onboarding process and consider batch onboarding sessions for efficiency.',
          },
        ],
        staffingRecommendations: [
          {
            role: 'Property Managers',
            currentCount: 5,
            recommendedCount: 7,
            reasoning: 'Increased application volume requires additional review capacity',
          },
          {
            role: 'HR Coordinators',
            currentCount: 2,
            recommendedCount: 3,
            reasoning: 'Support increased onboarding and compliance activities',
          },
        ],
      };

      setCapacityPlan(mockCapacityPlan);

      // Create mock insights
      const mockInsights: PredictiveInsight[] = [
        {
          id: '1',
          type: 'forecast',
          title: 'Application Volume Surge Expected',
          description: 'Based on historical patterns and seasonal trends, we predict a 35% increase in applications over the next 30 days.',
          impact: 'high',
          confidence: 0.87,
          timeframe: 'Next 30 days',
          recommendation: 'Prepare additional manager capacity and streamline review processes to handle increased volume.',
          data: {},
        },
        {
          id: '2',
          type: 'opportunity',
          title: 'Optimal Hiring Window Identified',
          description: 'Analysis shows the best hiring outcomes occur when applications are processed within 48 hours during weekdays.',
          impact: 'medium',
          confidence: 0.92,
          timeframe: 'Ongoing',
          recommendation: 'Implement priority processing for applications received Monday-Wednesday to maximize conversion rates.',
          data: {},
        },
        {
          id: '3',
          type: 'risk',
          title: 'Potential Quality Decline Risk',
          description: 'If current approval rates continue with increased volume, quality metrics may decline due to rushed reviews.',
          impact: 'medium',
          confidence: 0.78,
          timeframe: 'Next 60 days',
          recommendation: 'Implement quality checkpoints and consider automated screening tools to maintain standards.',
          data: {},
        },
      ];

      setInsights(mockInsights);

    } catch (error) {
      console.error('Failed to load predictive analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadPredictiveData();
  }, [propertyId, timeHorizon]);

  // Handle refresh
  const handleRefresh = () => {
    loadPredictiveData();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-3 text-purple-600" />
            Predictive Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered forecasting and capacity planning insights
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={timeHorizon}
              onChange={(e) => {
                // Handle time horizon change
                console.log('Time horizon changed:', e.target.value);
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short Term (1 Month)</option>
              <option value="medium">Medium Term (3 Months)</option>
              <option value="long">Long Term (1 Year)</option>
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
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading predictive analytics...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          {/* Forecasts Tab */}
          <TabsContent value="forecasts" className="space-y-6">
            {forecasts.map((forecast, index) => (
              <ForecastChart
                key={index}
                forecast={forecast}
                showConfidenceInterval={true}
              />
            ))}
          </TabsContent>

          {/* Capacity Planning Tab */}
          <TabsContent value="capacity">
            {capacityPlan && (
              <CapacityPlanning capacityPlan={capacityPlan} />
            )}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights">
            <PredictiveInsights insights={insights} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default PredictiveAnalytics;