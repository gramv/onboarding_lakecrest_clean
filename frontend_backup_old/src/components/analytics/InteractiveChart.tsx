import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  TooltipItem,
  InteractionItem
} from 'chart.js';
import { Chart, Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Maximize2, 
  RefreshCw, 
  Settings,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
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

export type ChartType = 'line' | 'bar' | 'area' | 'doughnut' | 'pie';

export interface InteractiveChartProps {
  data: TimeSeriesData[];
  type?: ChartType;
  title?: string;
  subtitle?: string;
  height?: number;
  showTrend?: boolean;
  trendData?: Record<string, TrendAnalysis>;
  realTimeUpdates?: boolean;
  onDataPointClick?: (dataPoint: DataPoint, seriesId: string) => void;
  onExport?: (format: 'png' | 'pdf' | 'csv') => void;
  className?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  responsive?: boolean;
}

// =====================================
// CHART CONFIGURATION HELPERS
// =====================================

const defaultColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
];

const createChartOptions = (
  type: ChartType,
  props: InteractiveChartProps
): ChartOptions => {
  const baseOptions: ChartOptions = {
    responsive: props.responsive !== false,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: props.showLegend !== false,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context: TooltipItem<any>[]) => {
            const dataPoint = context[0];
            const timestamp = new Date(dataPoint.label);
            return timestamp.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          },
          label: (context: TooltipItem<any>) => {
            const value = context.parsed.y;
            const dataset = context.dataset;
            return `${dataset.label}: ${value.toLocaleString()}`;
          },
          afterBody: (context: TooltipItem<any>[]) => {
            const dataPoint = context[0];
            const metadata = dataPoint.raw as any;
            if (metadata?.metadata) {
              return Object.entries(metadata.metadata)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            }
            return '';
          },
        },
      },
    },
    scales: type !== 'doughnut' && type !== 'pie' ? {
      x: {
        display: true,
        grid: {
          display: props.showGrid !== false,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif',
          },
          maxTicksLimit: 10,
        },
      },
      y: {
        display: true,
        grid: {
          display: props.showGrid !== false,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif',
          },
          callback: function(value: any) {
            return typeof value === 'number' ? value.toLocaleString() : value;
          },
        },
      },
    } : undefined,
    animation: props.animate !== false ? {
      duration: 750,
      easing: 'easeInOutQuart',
    } : false,
    onClick: (event, elements: InteractionItem[]) => {
      if (elements.length > 0 && props.onDataPointClick) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const series = props.data[datasetIndex];
        const dataPoint = series.data_points[dataIndex];
        props.onDataPointClick(dataPoint, series.id);
      }
    },
  };

  return baseOptions;
};

const createChartData = (
  data: TimeSeriesData[],
  type: ChartType,
  colors: string[]
): ChartData<any> => {
  if (type === 'doughnut' || type === 'pie') {
    // For pie/doughnut charts, use the latest values from each series
    const labels = data.map(series => series.name);
    const values = data.map(series => {
      const latestPoint = series.data_points[series.data_points.length - 1];
      return latestPoint?.value || 0;
    });

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color + '80'),
        borderWidth: 2,
        hoverBorderWidth: 3,
      }],
    };
  }

  // For line/bar/area charts
  const allTimestamps = Array.from(
    new Set(
      data.flatMap(series => 
        series.data_points.map(point => point.timestamp)
      )
    )
  ).sort();

  const datasets = data.map((series, index) => {
    const color = colors[index % colors.length];
    
    // Create data array aligned with all timestamps
    const seriesData = allTimestamps.map(timestamp => {
      const point = series.data_points.find(p => p.timestamp === timestamp);
      return point ? { x: timestamp, y: point.value, ...point } : null;
    });

    const baseDataset = {
      label: series.name,
      data: seriesData,
      borderColor: color,
      backgroundColor: type === 'area' ? color + '20' : color,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: type === 'line' || type === 'area' ? 0.4 : 0,
      fill: type === 'area',
    };

    return baseDataset;
  });

  return {
    labels: allTimestamps,
    datasets,
  };
};

// =====================================
// TREND INDICATOR COMPONENT
// =====================================

interface TrendIndicatorProps {
  trend: TrendAnalysis;
  className?: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, className }) => {
  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSignificanceColor = () => {
    switch (trend.significance) {
      case 'high':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn('flex items-center space-x-1', getTrendColor())}>
        {getTrendIcon()}
        <span className="text-sm font-medium">
          {Math.abs(trend.magnitude).toFixed(1)}%
        </span>
      </div>
      <span 
        className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          getSignificanceColor()
        )}
      >
        {trend.significance} confidence
      </span>
    </div>
  );
};

// =====================================
// MAIN INTERACTIVE CHART COMPONENT
// =====================================

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  type = 'line',
  title,
  subtitle,
  height = 400,
  showTrend = false,
  trendData,
  realTimeUpdates = false,
  onDataPointClick,
  onExport,
  className,
  colors = defaultColors,
  showLegend = true,
  showGrid = true,
  animate = true,
  responsive = true,
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Memoize chart configuration
  const chartOptions = useMemo(() => 
    createChartOptions(type, {
      data,
      type,
      showLegend,
      showGrid,
      animate,
      responsive,
      onDataPointClick,
    }),
    [type, showLegend, showGrid, animate, responsive, onDataPointClick]
  );

  const chartData = useMemo(() => 
    createChartData(data, type, colors),
    [data, type, colors]
  );

  // Handle real-time updates
  useEffect(() => {
    if (realTimeUpdates) {
      const interval = setInterval(() => {
        setLastUpdate(new Date());
        // In a real implementation, this would trigger a data refresh
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeUpdates]);

  // Export functionality
  const handleExport = async (format: 'png' | 'pdf' | 'csv') => {
    if (!chartRef.current) return;

    setIsLoading(true);
    try {
      if (format === 'png') {
        const canvas = chartRef.current.canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = url;
        link.click();
      } else if (format === 'csv') {
        // Convert data to CSV
        const csvData = data.flatMap(series =>
          series.data_points.map(point => ({
            series: series.name,
            timestamp: point.timestamp,
            value: point.value,
            ...point.metadata,
          }))
        );
        
        const csvContent = [
          Object.keys(csvData[0]).join(','),
          ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `chart-data-${Date.now()}.csv`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      onExport?.(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    // Trigger data refresh
    setTimeout(() => {
      setIsLoading(false);
      setLastUpdate(new Date());
    }, 1000);
  };

  // Render chart component based on type
  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data: chartData,
      options: chartOptions,
      height,
    };

    switch (type) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'area':
      case 'line':
      default:
        return <Line {...commonProps} />;
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          {realTimeUpdates && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          
          {onExport && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleExport('png')}
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button variant="ghost" size="sm">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trend Indicators */}
      {showTrend && trendData && (
        <div className="mb-4 space-y-2">
          {Object.entries(trendData).map(([seriesId, trend]) => {
            const series = data.find(s => s.id === seriesId);
            return series ? (
              <div key={seriesId} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {series.name}
                </span>
                <TrendIndicator trend={trend} />
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
        {renderChart()}
      </div>

      {/* Footer */}
      {realTimeUpdates && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </Card>
  );
};

export default InteractiveChart;