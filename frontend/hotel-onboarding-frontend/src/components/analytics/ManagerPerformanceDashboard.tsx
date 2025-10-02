import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  User,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Activity,
  Users,
  Building,
  Calendar,
  Download,
  RefreshCw,
  Star,
  AlertTriangle,
  Zap,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import analytics components
import { InteractiveChart, TimeSeriesData } from './InteractiveChart';
import { TrendIndicator, TrendData } from './TrendIndicator';

// Import analytics service
import { analyticsService } from '@/services/analyticsService';

// =====================================
// TYPES AND INTERFACES
// =====================================

interface ManagerMetrics {
  managerId: string;
  managerName: string;
  propertyId?: string;
  propertyName?: string;
  totalReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  pendingReviews: number;
  averageReviewTime: number; // in hours
  approvalRate: number;
  rejectionRate: number;
  efficiencyScore: number;
  qualityScore: number;
  workloadScore: number;
  overallRating: number;
  trend?: TrendData;
  ranking?: number;
  goals?: {
    reviewTime: number;
    approvalRate: number;
    qualityScore: number;
  };
  recentActivity?: {
    date: string;
    action: string;
    count: number;
  }[];
}

interface ManagerPerformanceDashboardProps {
  managerId?: string;
  propertyId?: string;
  timeRange?: 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth';
  className?: string;
}

// =====================================
// MANAGER CARD COMPONENT
// =====================================

interface ManagerCardProps {
  manager: ManagerMetrics;
  isSelected?: boolean;
  onClick?: (manager: ManagerMetrics) => void;
}

const ManagerCard: React.FC<ManagerCardProps> = ({
  manager,
  isSelected = false,
  onClick,
}) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (score >= 60) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  const performanceBadge = getPerformanceBadge(manager.overallRating);

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      return `${(hours / 24).toFixed(1)}d`;
    }
  };

  return (
    <Card 
      className={cn(
        'p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105',
        isSelected && 'ring-2 ring-blue-500 border-blue-200'
      )}
      onClick={() => onClick?.(manager)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`/avatars/${manager.managerId}.jpg`} />
            <AvatarFallback>
              {manager.managerName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {manager.managerName}
            </h3>
            {manager.propertyName && (
              <p className="text-sm text-gray-600 flex items-center">
                <Building className="h-3 w-3 mr-1" />
                {manager.propertyName}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {manager.ranking && (
            <div className="flex items-center text-yellow-600">
              <Award className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">#{manager.ranking}</span>
            </div>
          )}
          
          <Badge className={performanceBadge.color}>
            {performanceBadge.label}
          </Badge>
        </div>
      </div>

      {/* Overall Rating */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Rating</span>
          <span className={cn('text-lg font-bold', getPerformanceColor(manager.overallRating))}>
            {manager.overallRating.toFixed(1)}/100
          </span>
        </div>
        <Progress value={manager.overallRating} className="h-2" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">
            {manager.totalReviews}
          </div>
          <div className="text-xs text-gray-600">Total Reviews</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {manager.approvalRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Approval Rate</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-600">
            {formatTime(manager.averageReviewTime)}
          </div>
          <div className="text-xs text-gray-600">Avg Review Time</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">
            {manager.efficiencyScore.toFixed(0)}
          </div>
          <div className="text-xs text-gray-600">Efficiency Score</div>
        </div>
      </div>

      {/* Performance Scores */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Quality Score</span>
          <div className="flex items-center space-x-2">
            <Progress value={manager.qualityScore} className="w-16 h-1" />
            <span className="font-medium w-8 text-right">
              {manager.qualityScore.toFixed(0)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Workload Score</span>
          <div className="flex items-center space-x-2">
            <Progress value={manager.workloadScore} className="w-16 h-1" />
            <span className="font-medium w-8 text-right">
              {manager.workloadScore.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Trend */}
      {manager.trend && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Performance Trend</span>
            <TrendIndicator
              trend={manager.trend}
              variant="compact"
              size="sm"
              showConfidence={false}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

// =====================================
// MANAGER DETAILS PANEL
// =====================================

interface ManagerDetailsPanelProps {
  manager: ManagerMetrics;
  timeSeriesData?: TimeSeriesData[];
}

const ManagerDetailsPanel: React.FC<ManagerDetailsPanelProps> = ({
  manager,
  timeSeriesData = [],
}) => {
  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      return `${(hours / 24).toFixed(1)} days`;
    }
  };

  const getGoalProgress = (current: number, target: number, higherIsBetter: boolean = true) => {
    const progress = higherIsBetter 
      ? (current / target) * 100 
      : (target / current) * 100;
    
    return {
      percentage: Math.min(Math.max(progress, 0), 100),
      isOnTrack: progress >= 80,
      difference: higherIsBetter ? current - target : target - current,
    };
  };

  return (
    <div className="space-y-6">
      {/* Manager Header */}
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`/avatars/${manager.managerId}.jpg`} />
            <AvatarFallback className="text-lg">
              {manager.managerName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {manager.managerName}
            </h2>
            {manager.propertyName && (
              <p className="text-gray-600 flex items-center mb-2">
                <Building className="h-4 w-4 mr-2" />
                {manager.propertyName}
              </p>
            )}
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-yellow-600">
                <Star className="h-4 w-4 mr-1" />
                <span className="font-medium">{manager.overallRating.toFixed(1)}/100</span>
              </div>
              {manager.ranking && (
                <div className="flex items-center text-blue-600">
                  <Award className="h-4 w-4 mr-1" />
                  <span className="font-medium">Rank #{manager.ranking}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-blue-600">
              {manager.totalReviews}
            </div>
            <div className="text-sm text-gray-600">Total Reviews</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">
              {manager.approvalRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Approval Rate</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <Clock className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold text-orange-600">
              {formatTime(manager.averageReviewTime)}
            </div>
            <div className="text-sm text-gray-600">Avg Review Time</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Activity className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">
              {manager.efficiencyScore.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600">Efficiency Score</div>
          </div>
        </div>
      </Card>

      {/* Goals and Progress */}
      {manager.goals && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-600" />
            Performance Goals
          </h3>
          
          <div className="space-y-4">
            {/* Review Time Goal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Average Review Time
                </span>
                <span className="text-sm text-gray-600">
                  Target: {formatTime(manager.goals.reviewTime)}
                </span>
              </div>
              
              {(() => {
                const progress = getGoalProgress(manager.averageReviewTime, manager.goals.reviewTime, false);
                return (
                  <div className="space-y-1">
                    <Progress 
                      value={progress.percentage} 
                      className={cn(
                        'h-2',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )} 
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Current: {formatTime(manager.averageReviewTime)}
                      </span>
                      <span className={cn(
                        'font-medium',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )}>
                        {progress.isOnTrack ? 'On Track' : 'Behind Target'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Approval Rate Goal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Approval Rate
                </span>
                <span className="text-sm text-gray-600">
                  Target: {manager.goals.approvalRate}%
                </span>
              </div>
              
              {(() => {
                const progress = getGoalProgress(manager.approvalRate, manager.goals.approvalRate, true);
                return (
                  <div className="space-y-1">
                    <Progress 
                      value={progress.percentage} 
                      className={cn(
                        'h-2',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )} 
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Current: {manager.approvalRate.toFixed(1)}%
                      </span>
                      <span className={cn(
                        'font-medium',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )}>
                        {progress.difference > 0 ? '+' : ''}{progress.difference.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quality Score Goal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Quality Score
                </span>
                <span className="text-sm text-gray-600">
                  Target: {manager.goals.qualityScore}
                </span>
              </div>
              
              {(() => {
                const progress = getGoalProgress(manager.qualityScore, manager.goals.qualityScore, true);
                return (
                  <div className="space-y-1">
                    <Progress 
                      value={progress.percentage} 
                      className={cn(
                        'h-2',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )} 
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Current: {manager.qualityScore.toFixed(0)}
                      </span>
                      <span className={cn(
                        'font-medium',
                        progress.isOnTrack ? 'text-green-600' : 'text-red-600'
                      )}>
                        {progress.difference > 0 ? '+' : ''}{progress.difference.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </Card>
      )}

      {/* Performance Charts */}
      {timeSeriesData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InteractiveChart
            data={timeSeriesData.filter(ts => ts.id.includes('review_time'))}
            type="line"
            title="Review Time Trend"
            subtitle="Average time to review applications"
            height={300}
            showTrend={true}
            colors={['#F59E0B']}
          />
          
          <InteractiveChart
            data={timeSeriesData.filter(ts => ts.id.includes('approval_rate'))}
            type="area"
            title="Approval Rate Trend"
            subtitle="Percentage of applications approved"
            height={300}
            showTrend={true}
            colors={['#10B981']}
          />
        </div>
      )}

      {/* Recent Activity */}
      {manager.recentActivity && manager.recentActivity.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            {manager.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-700">
                    {activity.action}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {activity.count}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// =====================================
// MAIN MANAGER PERFORMANCE DASHBOARD
// =====================================

export const ManagerPerformanceDashboard: React.FC<ManagerPerformanceDashboardProps> = ({
  managerId,
  propertyId,
  timeRange = 'last30days',
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerMetrics[]>([]);
  const [selectedManager, setSelectedManager] = useState<ManagerMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  // Load manager performance data
  const loadManagerData = async () => {
    setIsLoading(true);
    try {
      const timeRangeData = analyticsService.createTimeRange(timeRange);
      
      const response = await analyticsService.analyzeManagerPerformance({
        manager_ids: managerId ? [managerId] : undefined,
        property_id: propertyId,
        time_range: timeRangeData,
        include_efficiency_metrics: true,
        include_quality_metrics: true,
      });

      // Transform response data to ManagerMetrics format
      const managerData: ManagerMetrics[] = Object.entries(response.managers).map(([id, data]: [string, any], index) => ({
        managerId: id,
        managerName: data.manager_name || `Manager ${index + 1}`,
        propertyId: data.property_id,
        propertyName: data.property_name,
        totalReviews: data.total_reviews || 0,
        approvedReviews: data.approved_reviews || 0,
        rejectedReviews: data.rejected_reviews || 0,
        pendingReviews: data.pending_reviews || 0,
        averageReviewTime: data.avg_review_time || 0,
        approvalRate: data.approval_rate || 0,
        rejectionRate: data.rejection_rate || 0,
        efficiencyScore: data.efficiency_score || 0,
        qualityScore: data.quality_score || 0,
        workloadScore: Math.min((data.total_reviews || 0) / 10 * 100, 100),
        overallRating: (data.efficiency_score || 0 + data.quality_score || 0) / 2,
        ranking: index + 1,
        goals: {
          reviewTime: 24, // 24 hours target
          approvalRate: 70, // 70% target
          qualityScore: 85, // 85 target
        },
        recentActivity: [
          { date: new Date().toISOString(), action: 'Reviewed applications', count: data.total_reviews || 0 },
          { date: new Date(Date.now() - 86400000).toISOString(), action: 'Approved applications', count: data.approved_reviews || 0 },
        ],
      }));

      // Sort by overall rating
      managerData.sort((a, b) => b.overallRating - a.overallRating);
      
      // Update rankings
      managerData.forEach((manager, index) => {
        manager.ranking = index + 1;
      });

      setManagers(managerData);
      
      // Select first manager if none selected
      if (!selectedManager && managerData.length > 0) {
        setSelectedManager(managerData[0]);
      }

    } catch (error) {
      console.error('Failed to load manager data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadManagerData();
  }, [managerId, propertyId, timeRange]);

  // Handle manager selection
  const handleManagerSelect = (manager: ManagerMetrics) => {
    setSelectedManager(manager);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadManagerData();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manager Performance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track and analyze manager efficiency and quality metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
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
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading manager performance data...</span>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manager List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Managers ({managers.length})
            </h2>
            
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {managers.map((manager) => (
                <ManagerCard
                  key={manager.managerId}
                  manager={manager}
                  isSelected={selectedManager?.managerId === manager.managerId}
                  onClick={handleManagerSelect}
                />
              ))}
            </div>
          </div>

          {/* Manager Details */}
          <div className="lg:col-span-2">
            {selectedManager ? (
              <ManagerDetailsPanel
                manager={selectedManager}
                timeSeriesData={timeSeriesData}
              />
            ) : (
              <Card className="p-12 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Manager
                </h3>
                <p className="text-gray-600">
                  Choose a manager from the list to view detailed performance metrics
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerPerformanceDashboard;