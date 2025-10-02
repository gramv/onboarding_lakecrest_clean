import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendIndicator, TrendData } from './TrendIndicator';
import { InteractiveChart, TimeSeriesData } from './InteractiveChart';

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  city: string;
  state: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  approvalRate: number;
  rejectionRate: number;
  averageTimeToHire: number;
  managerCount: number;
  employeeCount: number;
  performanceScore: number;
  trend?: TrendData;
  ranking?: number;
  benchmarkComparison?: {
    vsAverage: number;
    vsTopQuartile: number;
    vsIndustry?: number;
  };
}

export interface BenchmarkData {
  average: number;
  median: number;
  topQuartile: number;
  bottomQuartile: number;
  best: number;
  worst: number;
  industryAverage?: number;
}

export interface PropertyComparisonData {
  properties: PropertyMetrics[];
  benchmarks: Record<string, BenchmarkData>;
  period: {
    start: string;
    end: string;
  };
  metadata?: {
    totalProperties: number;
    totalApplications: number;
    overallApprovalRate: number;
  };
}

export interface PropertyComparisonChartProps {
  data: PropertyComparisonData;
  title?: string;
  selectedMetric?: string;
  showBenchmarks?: boolean;
  showTrends?: boolean;
  showRankings?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPropertyClick?: (property: PropertyMetrics) => void;
  onMetricChange?: (metric: string) => void;
  onExport?: () => void;
  className?: string;
}

// =====================================
// METRIC DEFINITIONS
// =====================================

const AVAILABLE_METRICS = [
  {
    id: 'approvalRate',
    name: 'Approval Rate',
    unit: '%',
    icon: CheckCircle,
    color: '#10B981',
    description: 'Percentage of applications approved',
    higherIsBetter: true,
  },
  {
    id: 'totalApplications',
    name: 'Total Applications',
    unit: '',
    icon: Users,
    color: '#3B82F6',
    description: 'Total number of applications received',
    higherIsBetter: true,
  },
  {
    id: 'averageTimeToHire',
    name: 'Time to Hire',
    unit: 'days',
    icon: Clock,
    color: '#F59E0B',
    description: 'Average time from application to hire',
    higherIsBetter: false,
  },
  {
    id: 'performanceScore',
    name: 'Performance Score',
    unit: '',
    icon: Award,
    color: '#8B5CF6',
    description: 'Overall property performance score',
    higherIsBetter: true,
  },
  {
    id: 'rejectionRate',
    name: 'Rejection Rate',
    unit: '%',
    icon: XCircle,
    color: '#EF4444',
    description: 'Percentage of applications rejected',
    higherIsBetter: false,
  },
];

// =====================================
// PROPERTY CARD COMPONENT
// =====================================

interface PropertyCardProps {
  property: PropertyMetrics;
  selectedMetric: string;
  benchmark?: BenchmarkData;
  showTrends: boolean;
  showRankings: boolean;
  onClick?: (property: PropertyMetrics) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  selectedMetric,
  benchmark,
  showTrends,
  showRankings,
  onClick,
}) => {
  const metric = AVAILABLE_METRICS.find(m => m.id === selectedMetric);
  const metricValue = property[selectedMetric as keyof PropertyMetrics] as number;
  
  // Calculate performance vs benchmark
  const getBenchmarkComparison = () => {
    if (!benchmark) return null;
    
    const vsAverage = ((metricValue - benchmark.average) / benchmark.average) * 100;
    const isAboveAverage = metric?.higherIsBetter ? vsAverage > 0 : vsAverage < 0;
    
    return {
      vsAverage,
      isAboveAverage,
      percentile: getPercentile(metricValue, benchmark),
    };
  };

  const getPercentile = (value: number, benchmark: BenchmarkData) => {
    if (value >= benchmark.topQuartile) return 'top';
    if (value >= benchmark.median) return 'above-median';
    if (value >= benchmark.bottomQuartile) return 'below-median';
    return 'bottom';
  };

  const comparison = getBenchmarkComparison();

  const getPerformanceColor = () => {
    if (!comparison) return 'text-gray-600';
    
    switch (comparison.percentile) {
      case 'top':
        return 'text-green-600';
      case 'above-median':
        return 'text-blue-600';
      case 'below-median':
        return 'text-yellow-600';
      default:
        return 'text-red-600';
    }
  };

  const getPerformanceBadge = () => {
    if (!comparison) return null;
    
    const badgeClass = cn(
      'text-xs font-medium px-2 py-1 rounded-full',
      {
        'bg-green-100 text-green-800': comparison.percentile === 'top',
        'bg-blue-100 text-blue-800': comparison.percentile === 'above-median',
        'bg-yellow-100 text-yellow-800': comparison.percentile === 'below-median',
        'bg-red-100 text-red-800': comparison.percentile === 'bottom',
      }
    );

    const badgeText = {
      'top': 'Top Quartile',
      'above-median': 'Above Average',
      'below-median': 'Below Average',
      'bottom': 'Bottom Quartile',
    }[comparison.percentile];

    return <Badge className={badgeClass}>{badgeText}</Badge>;
  };

  const formatMetricValue = (value: number) => {
    if (metric?.unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (metric?.unit === 'days') {
      return `${value.toFixed(1)}d`;
    } else {
      return value.toLocaleString();
    }
  };

  return (
    <Card 
      className={cn(
        'p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105',
        comparison?.isAboveAverage ? 'border-green-200' : 'border-gray-200'
      )}
      onClick={() => onClick?.(property)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">
            {property.propertyName}
          </h4>
          <div className="flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            {property.city}, {property.state}
          </div>
        </div>
        
        {showRankings && property.ranking && (
          <div className="flex items-center">
            <Award className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-sm font-medium">#{property.ranking}</span>
          </div>
        )}
      </div>

      {/* Main Metric */}
      <div className="mb-3">
        <div className="flex items-center mb-2">
          {metric?.icon && (
            <metric.icon 
              className="h-4 w-4 mr-2" 
              style={{ color: metric.color }} 
            />
          )}
          <span className="text-xs text-gray-600">{metric?.name}</span>
        </div>
        
        <div className={cn('text-2xl font-bold', getPerformanceColor())}>
          {formatMetricValue(metricValue)}
        </div>
        
        {comparison && (
          <div className="text-xs text-gray-600 mt-1">
            {comparison.vsAverage > 0 ? '+' : ''}{comparison.vsAverage.toFixed(1)}% vs avg
          </div>
        )}
      </div>

      {/* Performance Badge */}
      <div className="flex items-center justify-between mb-3">
        {getPerformanceBadge()}
        
        {showTrends && property.trend && (
          <TrendIndicator
            trend={property.trend}
            variant="compact"
            size="sm"
            showConfidence={false}
          />
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <span className="block">Applications</span>
          <span className="font-medium text-gray-900">
            {property.totalApplications}
          </span>
        </div>
        <div>
          <span className="block">Employees</span>
          <span className="font-medium text-gray-900">
            {property.employeeCount}
          </span>
        </div>
      </div>
    </Card>
  );
};

// =====================================
// BENCHMARK VISUALIZATION COMPONENT
// =====================================

interface BenchmarkVisualizationProps {
  properties: PropertyMetrics[];
  selectedMetric: string;
  benchmark: BenchmarkData;
}

const BenchmarkVisualization: React.FC<BenchmarkVisualizationProps> = ({
  properties,
  selectedMetric,
  benchmark,
}) => {
  const metric = AVAILABLE_METRICS.find(m => m.id === selectedMetric);
  
  // Create chart data for benchmark visualization
  const chartData: TimeSeriesData[] = [
    {
      id: 'properties',
      name: 'Properties',
      data_points: properties.map((property, index) => ({
        timestamp: property.propertyName,
        value: property[selectedMetric as keyof PropertyMetrics] as number,
        metadata: {
          propertyId: property.propertyId,
          city: property.city,
          state: property.state,
        },
      })),
      granularity: 'property',
      aggregation_type: 'value',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Benchmark Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {metric?.unit === '%' ? `${benchmark.average.toFixed(1)}%` : benchmark.average.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Average</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {metric?.unit === '%' ? `${benchmark.best.toFixed(1)}%` : benchmark.best.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Best</div>
        </div>
        
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {metric?.unit === '%' ? `${benchmark.worst.toFixed(1)}%` : benchmark.worst.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Worst</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">
            {metric?.unit === '%' ? `${benchmark.median.toFixed(1)}%` : benchmark.median.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Median</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-600">
            {metric?.unit === '%' ? `${benchmark.topQuartile.toFixed(1)}%` : benchmark.topQuartile.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Top 25%</div>
        </div>
      </div>

      {/* Chart */}
      <InteractiveChart
        data={chartData}
        type="bar"
        title={`${metric?.name} by Property`}
        height={300}
        showTrend={false}
        colors={[metric?.color || '#3B82F6']}
      />
    </div>
  );
};

// =====================================
// MAIN PROPERTY COMPARISON CHART COMPONENT
// =====================================

export const PropertyComparisonChart: React.FC<PropertyComparisonChartProps> = ({
  data,
  title = "Property Performance Comparison",
  selectedMetric = 'approvalRate',
  showBenchmarks = true,
  showTrends = true,
  showRankings = true,
  sortBy = 'performanceScore',
  sortOrder = 'desc',
  onPropertyClick,
  onMetricChange,
  onExport,
  className,
}) => {
  const [currentMetric, setCurrentMetric] = useState(selectedMetric);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState<'asc' | 'desc'>(sortOrder);

  // Sort properties based on current settings
  const sortedProperties = useMemo(() => {
    const sorted = [...data.properties].sort((a, b) => {
      const aValue = a[currentSortBy as keyof PropertyMetrics] as number;
      const bValue = b[currentSortBy as keyof PropertyMetrics] as number;
      
      if (currentSortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // Add rankings
    return sorted.map((property, index) => ({
      ...property,
      ranking: index + 1,
    }));
  }, [data.properties, currentSortBy, currentSortOrder]);

  // Get benchmark data for current metric
  const currentBenchmark = data.benchmarks[currentMetric];

  // Handle metric change
  const handleMetricChange = (metricId: string) => {
    setCurrentMetric(metricId);
    onMetricChange?.(metricId);
  };

  // Handle sort change
  const handleSortChange = (sortField: string) => {
    if (sortField === currentSortBy) {
      setCurrentSortOrder(currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCurrentSortBy(sortField);
      setCurrentSortOrder('desc');
    }
  };

  // Get top and bottom performers
  const topPerformer = sortedProperties[0];
  const bottomPerformer = sortedProperties[sortedProperties.length - 1];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {new Date(data.period.start).toLocaleDateString()} - {' '}
              {new Date(data.period.end).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {onExport && (
              <Button variant="ghost" size="sm" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {AVAILABLE_METRICS.map(metric => (
            <Button
              key={metric.id}
              variant={currentMetric === metric.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleMetricChange(metric.id)}
              className="flex items-center space-x-2"
            >
              <metric.icon className="h-4 w-4" />
              <span>{metric.name}</span>
            </Button>
          ))}
        </div>

        {/* Summary Stats */}
        {data.metadata && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {data.metadata.totalProperties}
              </div>
              <div className="text-sm text-gray-600">Properties</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {data.metadata.totalApplications.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Applications</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {data.metadata.overallApprovalRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Overall Approval Rate</div>
            </div>
          </div>
        )}
      </Card>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center mb-3">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-green-800">Top Performer</h4>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-gray-900">{topPerformer.propertyName}</div>
            <div className="text-sm text-gray-600">{topPerformer.city}, {topPerformer.state}</div>
            <div className="text-lg font-bold text-green-600">
              {AVAILABLE_METRICS.find(m => m.id === currentMetric)?.unit === '%' 
                ? `${(topPerformer[currentMetric as keyof PropertyMetrics] as number).toFixed(1)}%`
                : (topPerformer[currentMetric as keyof PropertyMetrics] as number).toLocaleString()
              }
            </div>
          </div>
        </Card>

        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h4 className="font-semibold text-red-800">Needs Attention</h4>
          </div>
          <div className="space-y-2">
            <div className="font-medium text-gray-900">{bottomPerformer.propertyName}</div>
            <div className="text-sm text-gray-600">{bottomPerformer.city}, {bottomPerformer.state}</div>
            <div className="text-lg font-bold text-red-600">
              {AVAILABLE_METRICS.find(m => m.id === currentMetric)?.unit === '%' 
                ? `${(bottomPerformer[currentMetric as keyof PropertyMetrics] as number).toFixed(1)}%`
                : (bottomPerformer[currentMetric as keyof PropertyMetrics] as number).toLocaleString()
              }
            </div>
          </div>
        </Card>
      </div>

      {/* Benchmark Visualization */}
      {showBenchmarks && currentBenchmark && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Benchmark Analysis
          </h4>
          <BenchmarkVisualization
            properties={sortedProperties}
            selectedMetric={currentMetric}
            benchmark={currentBenchmark}
          />
        </Card>
      )}

      {/* Property Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Property Performance
          </h4>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange(currentMetric)}
              className="flex items-center space-x-2"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span>Sort by {AVAILABLE_METRICS.find(m => m.id === currentMetric)?.name}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedProperties.map(property => (
            <PropertyCard
              key={property.propertyId}
              property={property}
              selectedMetric={currentMetric}
              benchmark={currentBenchmark}
              showTrends={showTrends}
              showRankings={showRankings}
              onClick={onPropertyClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyComparisonChart;