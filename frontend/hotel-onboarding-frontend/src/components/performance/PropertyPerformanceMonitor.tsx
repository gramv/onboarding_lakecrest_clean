/**
 * Property Performance Monitor
 * Real-time property metrics dashboard with occupancy impact and staffing levels
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Activity,
  BarChart3,
  Zap,
  Bell,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  MapPin,
  Star,
  Award,
  Gauge,
  LineChart,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Lightbulb,
  Flag,
  Eye,
  Edit
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { MetricCard, KPIWidget } from '@/design-system/components/MetricCard'
import { DataTable } from '@/design-system/components/DataTable'
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// Import analytics components
import { InteractiveChart } from '@/components/analytics/InteractiveChart'
import { TrendIndicator } from '@/components/analytics/TrendIndicator'

// Import services
import { analyticsService } from '@/services/analyticsService'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface PropertyMetrics {
  property_id: string
  property_name: string
  location: string
  
  // Occupancy Metrics
  current_occupancy: number
  target_occupancy: number
  occupancy_trend: 'up' | 'down' | 'stable'
  occupancy_forecast: number[]
  
  // Staffing Metrics
  current_staff: number
  target_staff: number
  staffing_efficiency: number
  staff_utilization: number
  overtime_hours: number
  
  // Performance Metrics
  guest_satisfaction: number
  service_quality_score: number
  operational_efficiency: number
  cost_per_occupied_room: number
  revenue_per_available_room: number
  
  // Hiring Metrics
  open_positions: number
  time_to_fill: number
  hiring_success_rate: number
  employee_retention_rate: number
  training_completion_rate: number
  
  // Alerts and Issues
  active_alerts: PerformanceAlert[]
  critical_issues: number
  improvement_opportunities: string[]
  
  // Benchmarking
  industry_percentile: number
  competitor_comparison: CompetitorData[]
  best_practices: BestPractice[]
  
  last_updated: string
}

interface PerformanceAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'occupancy' | 'staffing' | 'quality' | 'cost' | 'hiring'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  recommended_action: string
  created_at: string
  acknowledged: boolean
  resolved: boolean
}

interface CompetitorData {
  competitor_name: string
  occupancy_rate: number
  staff_efficiency: number
  guest_satisfaction: number
  market_position: number
}

interface BestPractice {
  id: string
  title: string
  description: string
  category: string
  impact_score: number
  implementation_difficulty: 'easy' | 'medium' | 'hard'
  estimated_roi: string
}

interface PerformanceThreshold {
  metric: string
  warning_threshold: number
  critical_threshold: number
  target_value: number
  current_value: number
}

interface RecommendationEngine {
  staffing_recommendations: StaffingRecommendation[]
  operational_improvements: OperationalImprovement[]
  cost_optimization: CostOptimization[]
  guest_experience_enhancements: GuestExperienceEnhancement[]
}

interface StaffingRecommendation {
  type: 'hire' | 'redistribute' | 'training' | 'schedule_optimization'
  department: string
  priority: 'high' | 'medium' | 'low'
  description: string
  expected_impact: string
  implementation_timeline: string
  cost_estimate: number
}

interface OperationalImprovement {
  area: string
  current_performance: number
  target_performance: number
  improvement_actions: string[]
  success_metrics: string[]
  timeline: string
}

interface CostOptimization {
  category: string
  current_cost: number
  potential_savings: number
  optimization_strategy: string
  risk_level: 'low' | 'medium' | 'high'
  implementation_effort: string
}

interface GuestExperienceEnhancement {
  touchpoint: string
  current_score: number
  target_score: number
  enhancement_actions: string[]
  guest_impact: string
  business_impact: string
}

// =====================================
// REAL-TIME METRICS DASHBOARD
// =====================================

interface RealTimeMetricsDashboardProps {
  propertyId: string
  metrics: PropertyMetrics
  onRefresh: () => void
  loading?: boolean
}

const RealTimeMetricsDashboard: React.FC<RealTimeMetricsDashboardProps> = ({
  propertyId,
  metrics,
  onRefresh,
  loading = false
}) => {
  const getOccupancyStatus = () => {
    const ratio = metrics.current_occupancy / metrics.target_occupancy
    if (ratio >= 0.95) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (ratio >= 0.85) return { status: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (ratio >= 0.70) return { status: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { status: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const getStaffingStatus = () => {
    const ratio = metrics.current_staff / metrics.target_staff
    if (ratio >= 0.95) return { status: 'Fully Staffed', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (ratio >= 0.85) return { status: 'Well Staffed', color: 'text-blue-600', bgColor: 'bg-blue-100' }
    if (ratio >= 0.70) return { status: 'Understaffed', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    return { status: 'Critical Shortage', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const occupancyStatus = getOccupancyStatus()
  const staffingStatus = getStaffingStatus()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            {metrics.property_name}
          </h2>
          <p className="text-gray-600 flex items-center mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            {metrics.location}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Updated {new Date(metrics.last_updated).toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {metrics.active_alerts.filter(alert => alert.type === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{metrics.critical_issues} critical issues</strong> require immediate attention.
            {metrics.active_alerts.filter(alert => alert.type === 'critical')[0]?.title}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Performance Indicators */}
      <Grid columns={4} gap="lg">
        {/* Occupancy Rate */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Occupancy Rate</CardTitle>
              {getTrendIcon(metrics.occupancy_trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.current_occupancy}%
                </div>
                <Badge className={occupancyStatus.bgColor + ' ' + occupancyStatus.color}>
                  {occupancyStatus.status}
                </Badge>
              </div>
              <Progress 
                value={(metrics.current_occupancy / metrics.target_occupancy) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Current: {metrics.current_occupancy}%</span>
                <span>Target: {metrics.target_occupancy}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staffing Level */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Staffing Level</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.current_staff}
                </div>
                <Badge className={staffingStatus.bgColor + ' ' + staffingStatus.color}>
                  {staffingStatus.status}
                </Badge>
              </div>
              <Progress 
                value={(metrics.current_staff / metrics.target_staff) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Current: {metrics.current_staff}</span>
                <span>Target: {metrics.target_staff}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest Satisfaction */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Guest Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.guest_satisfaction}%
                </div>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3 w-3',
                        i < Math.floor(metrics.guest_satisfaction / 20)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-600">
                Industry Average: 85%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Efficiency */}
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Operational Efficiency</CardTitle>
              <Gauge className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-baseline space-x-2">
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.operational_efficiency}%
                </div>
                <Badge variant={metrics.operational_efficiency >= 85 ? 'default' : 'secondary'}>
                  {metrics.operational_efficiency >= 85 ? 'Excellent' : 'Good'}
                </Badge>
              </div>
              <div className="text-xs text-gray-600">
                Cost per room: ${metrics.cost_per_occupied_room}
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Performance Charts */}
      <Grid columns={2} gap="lg">
        {/* Occupancy Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-blue-600" />
              Occupancy Trend
            </CardTitle>
            <CardDescription>
              7-day occupancy rate with forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              type="line"
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                  {
                    label: 'Actual Occupancy',
                    data: [78, 82, 85, 88, 92, 95, 89],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                  },
                  {
                    label: 'Forecast',
                    data: [null, null, null, null, null, 95, 91],
                    borderColor: 'rgb(156, 163, 175)',
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value) => `${value}%`
                    }
                  }
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Staffing vs Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Staffing vs Occupancy
            </CardTitle>
            <CardDescription>
              Staff utilization efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveChart
              type="bar"
              data={{
                labels: ['Front Desk', 'Housekeeping', 'Maintenance', 'Food Service', 'Security'],
                datasets: [
                  {
                    label: 'Current Staff',
                    data: [8, 15, 4, 12, 3],
                    backgroundColor: 'rgba(34, 197, 94, 0.8)'
                  },
                  {
                    label: 'Optimal Staff',
                    data: [10, 18, 5, 14, 4],
                    backgroundColor: 'rgba(156, 163, 175, 0.8)'
                  }
                ]
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Metrics */}
      <Grid columns={3} gap="lg">
        {/* Financial Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">RevPAR</span>
              <span className="font-bold">${metrics.revenue_per_available_room}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cost per Occupied Room</span>
              <span className="font-bold">${metrics.cost_per_occupied_room}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Staffing Efficiency</span>
              <span className="font-bold">{metrics.staffing_efficiency}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overtime Hours</span>
              <span className="font-bold text-red-600">{metrics.overtime_hours}h</span>
            </div>
          </CardContent>
        </Card>

        {/* Hiring Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hiring Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Open Positions</span>
              <Badge variant={metrics.open_positions > 5 ? 'destructive' : 'secondary'}>
                {metrics.open_positions}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Time to Fill</span>
              <span className="font-bold">{metrics.time_to_fill} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Hiring Success Rate</span>
              <span className="font-bold text-green-600">{metrics.hiring_success_rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Retention Rate</span>
              <span className="font-bold">{metrics.employee_retention_rate}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Quality Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Service Quality Score</span>
              <span className="font-bold">{metrics.service_quality_score}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Training Completion</span>
              <span className="font-bold text-blue-600">{metrics.training_completion_rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Industry Percentile</span>
              <Badge variant={metrics.industry_percentile >= 75 ? 'default' : 'secondary'}>
                {metrics.industry_percentile}th
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Staff Utilization</span>
              <span className="font-bold">{metrics.staff_utilization}%</span>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </div>
  )
}

// =====================================
// PERFORMANCE ALERTS PANEL
// =====================================

interface PerformanceAlertsPanelProps {
  alerts: PerformanceAlert[]
  onAcknowledge: (alertId: string) => void
  onResolve: (alertId: string) => void
  onViewDetails: (alertId: string) => void
}

const PerformanceAlertsPanel: React.FC<PerformanceAlertsPanelProps> = ({
  alerts,
  onAcknowledge,
  onResolve,
  onViewDetails
}) => {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default: return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'occupancy': return <Building2 className="h-4 w-4" />
      case 'staffing': return <Users className="h-4 w-4" />
      case 'quality': return <Star className="h-4 w-4" />
      case 'cost': return <Target className="h-4 w-4" />
      case 'hiring': return <Activity className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const sortedAlerts = alerts.sort((a, b) => {
    const typeOrder = { critical: 0, warning: 1, info: 2 }
    return typeOrder[a.type] - typeOrder[b.type]
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-orange-600" />
            Performance Alerts ({alerts.length})
          </CardTitle>
          <Badge variant="outline">
            {alerts.filter(a => a.type === 'critical').length} Critical
          </Badge>
        </div>
        <CardDescription>
          Active performance issues and recommendations
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p>No active alerts. All systems performing well!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.map((alert) => (
              <Card key={alert.id} className={cn('border', getAlertColor(alert.type))}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getCategoryIcon(alert.category)}
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {alert.category}
                          </Badge>
                          <Badge variant={
                            alert.impact === 'high' ? 'destructive' :
                            alert.impact === 'medium' ? 'default' : 'secondary'
                          } className="text-xs">
                            {alert.impact} impact
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                        <div className="flex items-center text-xs text-gray-600">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          <span>{alert.recommended_action}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(alert.id)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAcknowledge(alert.id)}
                        >
                          <Flag className="h-3 w-3" />
                        </Button>
                      )}
                      {!alert.resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onResolve(alert.id)}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Created {new Date(alert.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {alert.acknowledged && (
                        <Badge variant="outline" className="text-xs">
                          Acknowledged
                        </Badge>
                      )}
                      {alert.resolved && (
                        <Badge variant="default" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================
// COMPETITIVE BENCHMARKING
// =====================================

interface CompetitiveBenchmarkingProps {
  propertyMetrics: PropertyMetrics
  competitors: CompetitorData[]
}

const CompetitiveBenchmarking: React.FC<CompetitiveBenchmarkingProps> = ({
  propertyMetrics,
  competitors
}) => {
  const benchmarkData = [
    {
      metric: 'Occupancy Rate',
      property_value: propertyMetrics.current_occupancy,
      industry_average: 82,
      top_performer: Math.max(...competitors.map(c => c.occupancy_rate)),
      unit: '%'
    },
    {
      metric: 'Staff Efficiency',
      property_value: propertyMetrics.staffing_efficiency,
      industry_average: 78,
      top_performer: Math.max(...competitors.map(c => c.staff_efficiency)),
      unit: '%'
    },
    {
      metric: 'Guest Satisfaction',
      property_value: propertyMetrics.guest_satisfaction,
      industry_average: 85,
      top_performer: Math.max(...competitors.map(c => c.guest_satisfaction)),
      unit: '%'
    }
  ]

  const getPerformanceColor = (value: number, average: number, top: number) => {
    if (value >= top * 0.95) return 'text-green-600'
    if (value >= average) return 'text-blue-600'
    if (value >= average * 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="h-5 w-5 mr-2 text-gold-600" />
          Competitive Benchmarking
        </CardTitle>
        <CardDescription>
          Compare your performance against industry standards
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Benchmark Table */}
          <div className="space-y-4">
            {benchmarkData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.metric}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-right">
                      <div className={cn('font-bold', getPerformanceColor(item.property_value, item.industry_average, item.top_performer))}>
                        {item.property_value}{item.unit}
                      </div>
                      <div className="text-xs text-gray-600">Your Property</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-700">
                        {item.industry_average}{item.unit}
                      </div>
                      <div className="text-xs text-gray-600">Industry Avg</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {item.top_performer}{item.unit}
                      </div>
                      <div className="text-xs text-gray-600">Top Performer</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress 
                    value={(item.property_value / item.top_performer) * 100} 
                    className="h-2"
                  />
                  <div 
                    className="absolute top-0 w-0.5 h-2 bg-gray-400"
                    style={{ left: `${(item.industry_average / item.top_performer) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Competitor Comparison */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Direct Competitors</h4>
            <div className="space-y-2">
              {competitors.map((competitor, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium text-sm">{competitor.competitor_name}</span>
                  <div className="flex items-center space-x-4 text-xs">
                    <span>{competitor.occupancy_rate}% occ</span>
                    <span>{competitor.staff_efficiency}% eff</span>
                    <span>{competitor.guest_satisfaction}% sat</span>
                    <Badge variant="outline">
                      #{competitor.market_position}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// MAIN PROPERTY PERFORMANCE MONITOR
// =====================================

interface PropertyPerformanceMonitorProps {
  propertyId: string
  onClose: () => void
}

export const PropertyPerformanceMonitor: React.FC<PropertyPerformanceMonitorProps> = ({
  propertyId,
  onClose
}) => {
  const { toast } = useToast()
  
  const [metrics, setMetrics] = useState<PropertyMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7d')

  // Load property performance data
  useEffect(() => {
    loadPerformanceData()
  }, [propertyId, timeRange])

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      // Mock data - in real implementation, this would fetch from the API
      const mockMetrics: PropertyMetrics = {
        property_id: propertyId,
        property_name: 'Grand Hotel Miami',
        location: 'Miami, FL',
        
        current_occupancy: 87,
        target_occupancy: 90,
        occupancy_trend: 'up',
        occupancy_forecast: [88, 89, 91, 92, 90, 89, 87],
        
        current_staff: 42,
        target_staff: 48,
        staffing_efficiency: 85,
        staff_utilization: 78,
        overtime_hours: 24,
        
        guest_satisfaction: 92,
        service_quality_score: 88,
        operational_efficiency: 82,
        cost_per_occupied_room: 45,
        revenue_per_available_room: 125,
        
        open_positions: 6,
        time_to_fill: 18,
        hiring_success_rate: 85,
        employee_retention_rate: 88,
        training_completion_rate: 94,
        
        active_alerts: [
          {
            id: 'alert-1',
            type: 'warning',
            category: 'staffing',
            title: 'Housekeeping Understaffed',
            description: 'Housekeeping department is 20% below optimal staffing levels',
            impact: 'medium',
            recommended_action: 'Hire 3 additional housekeeping staff or redistribute from other departments',
            created_at: new Date().toISOString(),
            acknowledged: false,
            resolved: false
          },
          {
            id: 'alert-2',
            type: 'critical',
            category: 'occupancy',
            title: 'Weekend Occupancy Drop',
            description: 'Weekend occupancy rates have dropped 15% compared to last month',
            impact: 'high',
            recommended_action: 'Review pricing strategy and marketing campaigns for weekend bookings',
            created_at: new Date().toISOString(),
            acknowledged: false,
            resolved: false
          }
        ],
        critical_issues: 1,
        improvement_opportunities: [
          'Optimize staff scheduling during peak hours',
          'Implement guest feedback system improvements',
          'Reduce overtime costs through better planning'
        ],
        
        industry_percentile: 78,
        competitor_comparison: [
          { competitor_name: 'Ocean View Resort', occupancy_rate: 85, staff_efficiency: 82, guest_satisfaction: 89, market_position: 2 },
          { competitor_name: 'Downtown Luxury', occupancy_rate: 91, staff_efficiency: 88, guest_satisfaction: 94, market_position: 1 },
          { competitor_name: 'Beach Paradise', occupancy_rate: 79, staff_efficiency: 75, guest_satisfaction: 86, market_position: 4 }
        ],
        best_practices: [
          {
            id: 'bp-1',
            title: 'Dynamic Pricing Strategy',
            description: 'Implement AI-driven pricing based on demand patterns',
            category: 'Revenue Management',
            impact_score: 8.5,
            implementation_difficulty: 'medium',
            estimated_roi: '15-25% revenue increase'
          }
        ],
        
        last_updated: new Date().toISOString()
      }

      setMetrics(mockMetrics)

    } catch (error) {
      console.error('Failed to load performance data:', error)
      toast({
        title: "Error Loading Performance Data",
        description: "Failed to load property performance data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadPerformanceData()
  }

  const handleAcknowledgeAlert = (alertId: string) => {
    if (!metrics) return
    
    setMetrics(prev => ({
      ...prev!,
      active_alerts: prev!.active_alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }))
    
    toast({
      title: "Alert Acknowledged",
      description: "Alert has been acknowledged and marked for review.",
    })
  }

  const handleResolveAlert = (alertId: string) => {
    if (!metrics) return
    
    setMetrics(prev => ({
      ...prev!,
      active_alerts: prev!.active_alerts.map(alert =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    }))
    
    toast({
      title: "Alert Resolved",
      description: "Alert has been marked as resolved.",
    })
  }

  const handleViewAlertDetails = (alertId: string) => {
    // Implementation for viewing alert details
    console.log('View alert details:', alertId)
  }

  if (loading) {
    return (
      <Container className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <div className="text-lg font-medium mb-2">Loading Performance Data</div>
            <div className="text-sm text-gray-600">Analyzing property metrics...</div>
          </div>
        </div>
      </Container>
    )
  }

  if (!metrics) {
    return (
      <Container className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <div className="text-lg font-medium mb-2">Failed to Load Performance Data</div>
            <div className="text-sm text-gray-600">Unable to load property performance metrics.</div>
            <Button onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Performance Monitor</h1>
          <p className="text-gray-600">Real-time metrics and performance insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {}}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({metrics.active_alerts.length})
          </TabsTrigger>
          <TabsTrigger value="benchmarking">Benchmarking</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <RealTimeMetricsDashboard
            propertyId={propertyId}
            metrics={metrics}
            onRefresh={handleRefresh}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="alerts" className="mt-6">
          <PerformanceAlertsPanel
            alerts={metrics.active_alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onResolve={handleResolveAlert}
            onViewDetails={handleViewAlertDetails}
          />
        </TabsContent>
        
        <TabsContent value="benchmarking" className="mt-6">
          <CompetitiveBenchmarking
            propertyMetrics={metrics}
            competitors={metrics.competitor_comparison}
          />
        </TabsContent>
        
        <TabsContent value="recommendations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
                Performance Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered suggestions to improve property performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.improvement_opportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-start p-3 bg-yellow-50 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-700">{opportunity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  )
}

export default PropertyPerformanceMonitor