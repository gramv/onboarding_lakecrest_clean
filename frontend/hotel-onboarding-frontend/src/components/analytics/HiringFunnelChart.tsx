import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingDown,
  Info,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrendIndicator, TrendData } from './TrendIndicator';

// =====================================
// TYPES AND INTERFACES
// =====================================

export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  icon?: React.ReactNode;
  description?: string;
  averageTimeInStage?: number; // in hours
  dropoffRate?: number;
  conversionRate?: number;
  trend?: TrendData;
}

export interface FunnelData {
  stages: FunnelStage[];
  totalApplications: number;
  overallConversionRate: number;
  averageTimeToHire: number;
  period: {
    start: string;
    end: string;
  };
  metadata?: {
    propertyId?: string;
    propertyName?: string;
    managerId?: string;
    managerName?: string;
  };
}

export interface HiringFunnelChartProps {
  data: FunnelData;
  title?: string;
  showTrends?: boolean;
  showTimeMetrics?: boolean;
  showConversionRates?: boolean;
  interactive?: boolean;
  onStageClick?: (stage: FunnelStage) => void;
  onExport?: () => void;
  className?: string;
}

// =====================================
// FUNNEL STAGE COMPONENT
// =====================================

interface FunnelStageProps {
  stage: FunnelStage;
  isFirst: boolean;
  isLast: boolean;
  maxCount: number;
  showTrends: boolean;
  showTimeMetrics: boolean;
  showConversionRates: boolean;
  interactive: boolean;
  onClick?: (stage: FunnelStage) => void;
}

const FunnelStageComponent: React.FC<FunnelStageProps> = ({
  stage,
  isFirst,
  isLast,
  maxCount,
  showTrends,
  showTimeMetrics,
  showConversionRates,
  interactive,
  onClick,
}) => {
  // Calculate width as percentage of max count
  const widthPercentage = (stage.count / maxCount) * 100;
  const minWidth = 20; // Minimum width for visibility
  const actualWidth = Math.max(widthPercentage, minWidth);

  // Format time duration
  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours.toFixed(0)}h` : `${days}d`;
    }
  };

  return (
    <div className="relative">
      {/* Stage Bar */}
      <div
        className={cn(
          'relative mx-auto rounded-lg transition-all duration-300',
          interactive && 'cursor-pointer hover:shadow-md hover:scale-105',
          'border-2 border-opacity-20'
        )}
        style={{
          width: `${actualWidth}%`,
          backgroundColor: stage.color + '20',
          borderColor: stage.color,
          minHeight: '80px',
        }}
        onClick={() => interactive && onClick?.(stage)}
      >
        {/* Stage Content */}
        <div className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            {stage.icon && (
              <div className="mr-2" style={{ color: stage.color }}>
                {stage.icon}
              </div>
            )}
            <h4 className="font-semibold text-gray-900 text-sm">
              {stage.name}
            </h4>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold" style={{ color: stage.color }}>
              {stage.count.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              {stage.percentage.toFixed(1)}% of total
            </div>
          </div>

          {/* Conversion Rate */}
          {showConversionRates && stage.conversionRate !== undefined && !isFirst && (
            <div className="mt-2">
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: stage.color + '10',
                  color: stage.color 
                }}
              >
                {stage.conversionRate.toFixed(1)}% conversion
              </Badge>
            </div>
          )}

          {/* Time Metrics */}
          {showTimeMetrics && stage.averageTimeInStage && (
            <div className="mt-2 text-xs text-gray-600">
              <Clock className="inline h-3 w-3 mr-1" />
              Avg: {formatTime(stage.averageTimeInStage)}
            </div>
          )}

          {/* Trend Indicator */}
          {showTrends && stage.trend && (
            <div className="mt-2 flex justify-center">
              <TrendIndicator
                trend={stage.trend}
                variant="compact"
                size="sm"
                showConfidence={false}
              />
            </div>
          )}
        </div>

        {/* Dropoff Indicator */}
        {stage.dropoffRate !== undefined && stage.dropoffRate > 0 && !isLast && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center text-xs text-red-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              {stage.dropoffRate.toFixed(1)}% drop
            </div>
          </div>
        )}
      </div>

      {/* Connector Arrow */}
      {!isLast && (
        <div className="flex justify-center mt-8 mb-4">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-400" />
        </div>
      )}
    </div>
  );
};

// =====================================
// MAIN HIRING FUNNEL CHART COMPONENT
// =====================================

export const HiringFunnelChart: React.FC<HiringFunnelChartProps> = ({
  data,
  title = "Hiring Funnel",
  showTrends = true,
  showTimeMetrics = true,
  showConversionRates = true,
  interactive = true,
  onStageClick,
  onExport,
  className,
}) => {
  // Calculate additional metrics
  const metrics = useMemo(() => {
    const { stages, totalApplications, overallConversionRate, averageTimeToHire } = data;
    
    // Find the stage with highest dropoff
    let maxDropoffStage = null;
    let maxDropoffRate = 0;
    
    stages.forEach(stage => {
      if (stage.dropoffRate && stage.dropoffRate > maxDropoffRate) {
        maxDropoffRate = stage.dropoffRate;
        maxDropoffStage = stage;
      }
    });

    // Calculate total time in funnel
    const totalTimeInFunnel = stages.reduce((sum, stage) => 
      sum + (stage.averageTimeInStage || 0), 0
    );

    return {
      maxDropoffStage,
      maxDropoffRate,
      totalTimeInFunnel,
      finalStageCount: stages[stages.length - 1]?.count || 0,
    };
  }, [data]);

  const maxCount = Math.max(...data.stages.map(stage => stage.count));

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600">
            {new Date(data.period.start).toLocaleDateString()} - {' '}
            {new Date(data.period.end).toLocaleDateString()}
            {data.metadata?.propertyName && (
              <span className="ml-2">• {data.metadata.propertyName}</span>
            )}
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

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {data.totalApplications.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Applications</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {metrics.finalStageCount.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Hired</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {data.overallConversionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {data.averageTimeToHire.toFixed(1)}d
          </div>
          <div className="text-sm text-gray-600">Avg Time to Hire</div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-8">
        {data.stages.map((stage, index) => (
          <FunnelStageComponent
            key={stage.id}
            stage={stage}
            isFirst={index === 0}
            isLast={index === data.stages.length - 1}
            maxCount={maxCount}
            showTrends={showTrends}
            showTimeMetrics={showTimeMetrics}
            showConversionRates={showConversionRates}
            interactive={interactive}
            onClick={onStageClick}
          />
        ))}
      </div>

      {/* Insights */}
      {metrics.maxDropoffStage && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                Optimization Opportunity
              </h4>
              <p className="text-sm text-yellow-700">
                The highest dropoff occurs at the "{metrics.maxDropoffStage.name}" stage 
                with a {metrics.maxDropoffRate.toFixed(1)}% drop rate. 
                Consider reviewing this stage for potential improvements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage Details Table */}
      <div className="mt-8">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Stage Details</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                {showConversionRates && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion
                  </th>
                )}
                {showTimeMetrics && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Time
                  </th>
                )}
                {showTrends && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.stages.map((stage, index) => (
                <tr key={stage.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {stage.icon && (
                        <div className="mr-3" style={{ color: stage.color }}>
                          {stage.icon}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stage.name}
                        </div>
                        {stage.description && (
                          <div className="text-sm text-gray-500">
                            {stage.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stage.count.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stage.percentage.toFixed(1)}%
                  </td>
                  {showConversionRates && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index === 0 ? '-' : `${stage.conversionRate?.toFixed(1) || 0}%`}
                    </td>
                  )}
                  {showTimeMetrics && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stage.averageTimeInStage ? 
                        (stage.averageTimeInStage < 24 ? 
                          `${stage.averageTimeInStage.toFixed(1)}h` : 
                          `${(stage.averageTimeInStage / 24).toFixed(1)}d`
                        ) : '-'
                      }
                    </td>
                  )}
                  {showTrends && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      {stage.trend ? (
                        <TrendIndicator
                          trend={stage.trend}
                          variant="compact"
                          size="sm"
                          showConfidence={false}
                        />
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

// =====================================
// FUNNEL COMPARISON COMPONENT
// =====================================

export interface FunnelComparisonProps {
  funnels: Array<{
    id: string;
    name: string;
    data: FunnelData;
  }>;
  title?: string;
  className?: string;
}

export const FunnelComparison: React.FC<FunnelComparisonProps> = ({
  funnels,
  title = "Funnel Comparison",
  className,
}) => {
  // Get common stages across all funnels
  const commonStages = useMemo(() => {
    if (funnels.length === 0) return [];
    
    const firstFunnel = funnels[0].data.stages;
    return firstFunnel.filter(stage => 
      funnels.every(funnel => 
        funnel.data.stages.some(s => s.id === stage.id)
      )
    );
  }, [funnels]);

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {title}
      </h3>

      <div className="space-y-6">
        {commonStages.map(stage => (
          <div key={stage.id} className="border-b border-gray-200 pb-4 last:border-b-0">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {stage.name}
            </h4>
            
            <div className="space-y-2">
              {funnels.map(funnel => {
                const funnelStage = funnel.data.stages.find(s => s.id === stage.id);
                if (!funnelStage) return null;

                const maxCount = Math.max(...funnels.map(f => 
                  f.data.stages.find(s => s.id === stage.id)?.count || 0
                ));
                const widthPercentage = (funnelStage.count / maxCount) * 100;

                return (
                  <div key={funnel.id} className="flex items-center space-x-4">
                    <div className="w-24 text-sm text-gray-600 truncate">
                      {funnel.name}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                      <div
                        className="h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                        style={{
                          width: `${Math.max(widthPercentage, 10)}%`,
                          backgroundColor: funnelStage.color,
                        }}
                      >
                        {funnelStage.count}
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-600 text-right">
                      {funnelStage.percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default HiringFunnelChart;