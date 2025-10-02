/**
 * Enhanced Manager Dashboard Layout
 * Property-specific dashboard with contextual information and workflow optimization
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, 
  Users, 
  FileText, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Bell,
  Calendar,
  MapPin,
  Phone,
  Star,
  Target,
  Activity,
  Zap,
  BarChart3,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  Edit,
  MessageSquare,
  Send,
  Archive,
  Brain,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { MetricCard, KPIWidget } from '@/design-system/components/MetricCard'
import { DataTable } from '@/design-system/components/DataTable'

// Import notification components
import { useManagerNotifications } from '@/hooks/useWebSocket'
import NotificationBadge from '@/components/notifications/NotificationBadge'
import NotificationPanel from '@/components/notifications/NotificationPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// Import analytics components
import { InteractiveChart } from '@/components/analytics/InteractiveChart'
import { TrendIndicator } from '@/components/analytics/TrendIndicator'

// Import services
import { analyticsService } from '@/services/analyticsService'
import { apiService } from '@/services/apiService'
import axios from 'axios'

// Import intelligent application review components
import { IntelligentApplicationReview } from '@/components/applications/IntelligentApplicationReview'
import { BulkApplicationProcessor } from '@/components/applications/BulkApplicationProcessor'
import { ApplicationComparison } from '@/components/applications/ApplicationComparison'
import { WorkflowAutomation } from '@/components/applications/WorkflowAutomation'

// Import performance monitoring components
import { PropertyPerformanceMonitor } from '@/components/performance/PropertyPerformanceMonitor'

// Import AI recommendation service
import { aiRecommendationService } from '@/services/aiRecommendationService'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface PropertyInsights {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  occupancy_rate: number
  staffing_level: number
  performance_score: number
  qr_code_url: string
  is_active: boolean
  created_at: string
  
  // Enhanced insights
  current_applications: number
  pending_reviews: number
  urgent_tasks: number
  staff_count: number
  target_staff: number
  recent_hires: number
  retention_rate: number
  guest_satisfaction: number
  revenue_impact: number
}

interface WorkloadSummary {
  total_tasks: number
  urgent_tasks: number
  pending_reviews: number
  overdue_items: number
  completed_today: number
  estimated_time_remaining: number
  priority_breakdown: {
    high: number
    medium: number
    low: number
  }
  upcoming_deadlines: {
    today: number
    this_week: number
    next_week: number
  }
}

interface PerformanceMetrics {
  efficiency_score: number
  quality_score: number
  speed_score: number
  overall_rating: number
  reviews_completed: number
  average_review_time: number
  approval_rate: number
  rejection_rate: number
  goal_progress: {
    review_time: { current: number; target: number; progress: number }
    approval_rate: { current: number; target: number; progress: number }
    quality_score: { current: number; target: number; progress: number }
  }
  trends: {
    efficiency: 'up' | 'down' | 'stable'
    quality: 'up' | 'down' | 'stable'
    speed: 'up' | 'down' | 'stable'
  }
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  count?: number
  urgent?: boolean
  onClick: () => void
}

interface DashboardState {
  property: PropertyInsights | null
  workload: WorkloadSummary | null
  performance: PerformanceMetrics | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// =====================================
// PROPERTY OVERVIEW CARD
// =====================================

interface PropertyOverviewCardProps {
  property: PropertyInsights
  onRefresh: () => void
  loading?: boolean
}

const PropertyOverviewCard: React.FC<PropertyOverviewCardProps> = ({
  property,
  onRefresh,
  loading = false
}) => {
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStaffingStatus = () => {
    const ratio = property.staff_count / property.target_staff
    if (ratio >= 0.95) return { status: 'Fully Staffed', color: 'bg-green-100 text-green-800' }
    if (ratio >= 0.8) return { status: 'Well Staffed', color: 'bg-blue-100 text-blue-800' }
    if (ratio >= 0.6) return { status: 'Understaffed', color: 'bg-yellow-100 text-yellow-800' }
    return { status: 'Critically Understaffed', color: 'bg-red-100 text-red-800' }
  }

  const staffingStatus = getStaffingStatus()

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Building2 className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{property.name}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {property.city}, {property.state}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={property.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {property.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <Grid columns={4} gap="sm">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {property.occupancy_rate}%
            </div>
            <div className="text-xs text-gray-600">Occupancy</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">
              {property.staff_count}/{property.target_staff}
            </div>
            <div className="text-xs text-gray-600">Staffing</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className={cn('text-lg font-bold', getPerformanceColor(property.performance_score))}>
              {property.performance_score}
            </div>
            <div className="text-xs text-gray-600">Performance</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {property.guest_satisfaction}%
            </div>
            <div className="text-xs text-gray-600">Satisfaction</div>
          </div>
        </Grid>

        {/* Staffing Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Staffing Level</span>
            <Badge className={staffingStatus.color}>
              {staffingStatus.status}
            </Badge>
          </div>
          <Progress 
            value={(property.staff_count / property.target_staff) * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Current: {property.staff_count}</span>
            <span>Target: {property.target_staff}</span>
          </div>
        </div>

        {/* Contact Info */}
        {property.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2" />
            {property.phone}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// =====================================
// WORKLOAD SUMMARY CARD
// =====================================

interface WorkloadSummaryCardProps {
  workload: WorkloadSummary
  onTaskClick: (type: string) => void
}

const WorkloadSummaryCard: React.FC<WorkloadSummaryCardProps> = ({
  workload,
  onTaskClick
}) => {
  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${(hours / 24).toFixed(1)}d`
  }

  const getUrgencyColor = (count: number, total: number) => {
    const ratio = count / total
    if (ratio > 0.3) return 'text-red-600'
    if (ratio > 0.15) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Activity className="h-5 w-5 mr-2 text-green-600" />
          Workload Summary
        </CardTitle>
        <CardDescription>
          Current tasks and priorities
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overview Stats */}
        <Grid columns={2} gap="sm">
          <div 
            className="p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => onTaskClick('all')}
          >
            <div className="text-xl font-bold text-blue-600">
              {workload.total_tasks}
            </div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          
          <div 
            className="p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => onTaskClick('urgent')}
          >
            <div className={cn('text-xl font-bold', getUrgencyColor(workload.urgent_tasks, workload.total_tasks))}>
              {workload.urgent_tasks}
            </div>
            <div className="text-sm text-gray-600">Urgent</div>
          </div>
        </Grid>

        {/* Priority Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Priority Breakdown</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                High Priority
              </span>
              <span className="font-medium">{workload.priority_breakdown.high}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                Medium Priority
              </span>
              <span className="font-medium">{workload.priority_breakdown.medium}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                Low Priority
              </span>
              <span className="font-medium">{workload.priority_breakdown.low}</span>
            </div>
          </div>
        </div>

        {/* Time Estimate */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Estimated Time Remaining</span>
            <span className="text-lg font-bold text-gray-900">
              {formatTime(workload.estimated_time_remaining)}
            </span>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Upcoming Deadlines</h4>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Today</span>
              <Badge variant={workload.upcoming_deadlines.today > 0 ? 'destructive' : 'secondary'}>
                {workload.upcoming_deadlines.today}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">This Week</span>
              <Badge variant={workload.upcoming_deadlines.this_week > 5 ? 'destructive' : 'secondary'}>
                {workload.upcoming_deadlines.this_week}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Next Week</span>
              <Badge variant="outline">
                {workload.upcoming_deadlines.next_week}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// PERFORMANCE OVERVIEW CARD
// =====================================

interface PerformanceOverviewCardProps {
  performance: PerformanceMetrics
  onViewDetails: () => void
}

const PerformanceOverviewCard: React.FC<PerformanceOverviewCardProps> = ({
  performance,
  onViewDetails
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <div className="w-4 h-4" />
    }
  }

  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${(hours / 24).toFixed(1)}d`
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
              Performance Overview
            </CardTitle>
            <CardDescription>
              Your efficiency and quality metrics
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4 mr-1" />
            Details
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Rating */}
        <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <div className={cn('text-3xl font-bold', getScoreColor(performance.overall_rating))}>
            {performance.overall_rating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">Overall Rating</div>
          <div className="flex items-center justify-center mt-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < Math.floor(performance.overall_rating / 20)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                )}
              />
            ))}
          </div>
        </div>

        {/* Performance Scores */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm font-medium">Efficiency</span>
              {getTrendIcon(performance.trends.efficiency)}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={performance.efficiency_score} className="w-16 h-2" />
              <span className={cn('text-sm font-bold w-8', getScoreColor(performance.efficiency_score))}>
                {performance.efficiency_score.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2 text-green-600" />
              <span className="text-sm font-medium">Quality</span>
              {getTrendIcon(performance.trends.quality)}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={performance.quality_score} className="w-16 h-2" />
              <span className={cn('text-sm font-bold w-8', getScoreColor(performance.quality_score))}>
                {performance.quality_score.toFixed(0)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-orange-600" />
              <span className="text-sm font-medium">Speed</span>
              {getTrendIcon(performance.trends.speed)}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={performance.speed_score} className="w-16 h-2" />
              <span className={cn('text-sm font-bold w-8', getScoreColor(performance.speed_score))}>
                {performance.speed_score.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {performance.reviews_completed}
            </div>
            <div className="text-xs text-gray-600">Reviews Completed</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {performance.approval_rate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Approval Rate</div>
          </div>
        </div>

        {/* Average Review Time */}
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Avg Review Time</div>
          <div className="text-lg font-bold text-gray-900">
            {formatTime(performance.average_review_time)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// QUICK ACTIONS PANEL
// =====================================

interface QuickActionsPanelProps {
  actions: QuickAction[]
  className?: string
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  className
}) => {
  return (
    <Card className={cn('hover:shadow-lg transition-all duration-200', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Zap className="h-5 w-5 mr-2 text-yellow-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className={cn(
                'justify-start h-auto p-3 hover:bg-gray-50',
                action.urgent && 'border-l-4 border-red-500'
              )}
              onClick={action.onClick}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  {action.icon}
                  <span className="ml-2 font-medium">{action.label}</span>
                  {action.shortcut && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {action.shortcut}
                    </Badge>
                  )}
                </div>
                {action.count !== undefined && action.count > 0 && (
                  <Badge 
                    variant={action.urgent ? 'destructive' : 'secondary'}
                    className="ml-2"
                  >
                    {action.count}
                  </Badge>
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================
// MAIN ENHANCED MANAGER DASHBOARD
// =====================================

export const EnhancedManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  
  // WebSocket notifications
  const {
    notifications,
    urgentNotifications,
    unreadCount,
    urgentCount,
    connectionStatus,
    markAsRead,
    dismiss,
    clearNotifications,
    requestNotificationPermission
  } = useManagerNotifications()
  
  const [state, setState] = useState<DashboardState>({
    property: null,
    workload: null,
    performance: null,
    loading: true,
    error: null,
    lastUpdated: null
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [showApplicationReview, setShowApplicationReview] = useState(false)
  const [showBulkProcessor, setShowBulkProcessor] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showWorkflowAutomation, setShowWorkflowAutomation] = useState(false)
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [aiInsights, setAiInsights] = useState<any>(null)

  // Quick actions configuration
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'review-applications',
      label: 'Review Applications',
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      shortcut: 'Ctrl+R',
      count: state.workload?.pending_reviews || 0,
      urgent: (state.workload?.pending_reviews || 0) > 5,
      onClick: () => setActiveTab('applications')
    },
    {
      id: 'intelligent-review',
      label: 'AI-Powered Review',
      icon: <Brain className="h-4 w-4 text-purple-600" />,
      shortcut: 'Ctrl+Shift+R',
      count: applications.filter(app => app.status === 'pending').length,
      onClick: () => handleIntelligentReview()
    },
    {
      id: 'bulk-processing',
      label: 'Bulk Processing',
      icon: <Users className="h-4 w-4 text-orange-600" />,
      shortcut: 'Ctrl+B',
      onClick: () => setShowBulkProcessor(true)
    },
    {
      id: 'workflow-automation',
      label: 'Workflow Automation',
      icon: <Zap className="h-4 w-4 text-purple-600" />,
      shortcut: 'Ctrl+W',
      onClick: () => setShowWorkflowAutomation(true)
    },
    {
      id: 'compare-candidates',
      label: 'Compare Candidates',
      icon: <BarChart3 className="h-4 w-4 text-green-600" />,
      shortcut: 'Ctrl+C',
      onClick: () => handleCompareApplications()
    },
    {
      id: 'urgent-tasks',
      label: 'Urgent Tasks',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      shortcut: 'Ctrl+U',
      count: state.workload?.urgent_tasks || 0,
      urgent: (state.workload?.urgent_tasks || 0) > 0,
      onClick: () => handleTaskClick('urgent')
    },
    {
      id: 'schedule-interviews',
      label: 'Schedule Interviews',
      icon: <Calendar className="h-4 w-4 text-green-600" />,
      shortcut: 'Ctrl+I',
      onClick: () => handleScheduleInterviews()
    },
    {
      id: 'send-messages',
      label: 'Send Messages',
      icon: <MessageSquare className="h-4 w-4 text-purple-600" />,
      shortcut: 'Ctrl+M',
      onClick: () => handleSendMessages()
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      icon: <BarChart3 className="h-4 w-4 text-indigo-600" />,
      shortcut: 'Ctrl+A',
      onClick: () => setActiveTab('analytics')
    },
    {
      id: 'performance-monitor',
      label: 'Performance Monitor',
      icon: <Activity className="h-4 w-4 text-green-600" />,
      shortcut: 'Ctrl+P',
      onClick: () => setShowPerformanceMonitor(true)
    },
    {
      id: 'export-reports',
      label: 'Export Reports',
      icon: <Download className="h-4 w-4 text-gray-600" />,
      shortcut: 'Ctrl+E',
      onClick: () => handleExportReports()
    }
  ], [state.workload, applications])

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user?.property_id) return

    // Prevent multiple simultaneous calls
    if (state.loading) return

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log('Loading dashboard data...')
      
      // Load data concurrently using the shared API service
      const [properties, applicationsData] = await Promise.all([
        apiService.getProperties(),
        apiService.getApplications()
      ])
      
      console.log('Data loaded - Properties:', properties.length, 'Applications:', applicationsData.length)
      
      const userProperty = properties.find((p: any) => p.id === user.property_id)

      if (!userProperty) {
        throw new Error('Property not found')
      }

      setApplications(applicationsData)

      // Load AI insights for pending applications
      if (applicationsData.length > 0) {
        try {
          const pendingApplications = applicationsData.filter((app: any) => app.status === 'pending')
          if (pendingApplications.length > 0) {
            // In a real implementation, this would call the AI service
            // For now, we'll generate mock insights
            const mockInsights = {
              total_pending: pendingApplications.length,
              high_priority: pendingApplications.filter((app: any) => Math.random() > 0.7).length,
              ai_recommendations: {
                auto_approve: Math.floor(pendingApplications.length * 0.3),
                interview: Math.floor(pendingApplications.length * 0.5),
                reject: Math.floor(pendingApplications.length * 0.2)
              },
              average_score: Math.floor(Math.random() * 30) + 70,
              processing_time_saved: Math.floor(Math.random() * 120) + 60
            }
            setAiInsights(mockInsights)
          }
        } catch (error) {
          console.error('Failed to load AI insights:', error)
        }
      }

      // Enhance property with additional insights
      const enhancedProperty: PropertyInsights = {
        ...userProperty,
        occupancy_rate: Math.floor(Math.random() * 30) + 70, // Mock data
        staffing_level: Math.floor(Math.random() * 40) + 60,
        performance_score: Math.floor(Math.random() * 30) + 70,
        current_applications: Math.floor(Math.random() * 20) + 5,
        pending_reviews: Math.floor(Math.random() * 10) + 2,
        urgent_tasks: Math.floor(Math.random() * 5) + 1,
        staff_count: Math.floor(Math.random() * 10) + 15,
        target_staff: 25,
        recent_hires: Math.floor(Math.random() * 5) + 2,
        retention_rate: Math.floor(Math.random() * 20) + 80,
        guest_satisfaction: Math.floor(Math.random() * 15) + 85,
        revenue_impact: Math.floor(Math.random() * 20) + 80
      }

      // Generate workload summary
      const workloadSummary: WorkloadSummary = {
        total_tasks: enhancedProperty.pending_reviews + enhancedProperty.urgent_tasks + Math.floor(Math.random() * 15) + 5,
        urgent_tasks: enhancedProperty.urgent_tasks,
        pending_reviews: enhancedProperty.pending_reviews,
        overdue_items: Math.floor(Math.random() * 3),
        completed_today: Math.floor(Math.random() * 8) + 2,
        estimated_time_remaining: Math.random() * 6 + 2,
        priority_breakdown: {
          high: enhancedProperty.urgent_tasks,
          medium: Math.floor(Math.random() * 8) + 3,
          low: Math.floor(Math.random() * 10) + 5
        },
        upcoming_deadlines: {
          today: Math.floor(Math.random() * 3),
          this_week: Math.floor(Math.random() * 8) + 2,
          next_week: Math.floor(Math.random() * 12) + 5
        }
      }

      // Generate performance metrics
      const performanceMetrics: PerformanceMetrics = {
        efficiency_score: Math.floor(Math.random() * 30) + 70,
        quality_score: Math.floor(Math.random() * 25) + 75,
        speed_score: Math.floor(Math.random() * 35) + 65,
        overall_rating: 0, // Will be calculated
        reviews_completed: Math.floor(Math.random() * 50) + 20,
        average_review_time: Math.random() * 12 + 6,
        approval_rate: Math.random() * 20 + 70,
        rejection_rate: Math.random() * 15 + 10,
        goal_progress: {
          review_time: { current: 0, target: 24, progress: 0 },
          approval_rate: { current: 0, target: 75, progress: 0 },
          quality_score: { current: 0, target: 85, progress: 0 }
        },
        trends: {
          efficiency: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
          quality: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
          speed: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
        }
      }

      // Calculate overall rating
      performanceMetrics.overall_rating = (
        performanceMetrics.efficiency_score + 
        performanceMetrics.quality_score + 
        performanceMetrics.speed_score
      ) / 3

      // Calculate goal progress
      performanceMetrics.goal_progress.review_time.current = performanceMetrics.average_review_time
      performanceMetrics.goal_progress.review_time.progress = Math.min(
        (performanceMetrics.goal_progress.review_time.target / performanceMetrics.average_review_time) * 100,
        100
      )

      performanceMetrics.goal_progress.approval_rate.current = performanceMetrics.approval_rate
      performanceMetrics.goal_progress.approval_rate.progress = 
        (performanceMetrics.approval_rate / performanceMetrics.goal_progress.approval_rate.target) * 100

      performanceMetrics.goal_progress.quality_score.current = performanceMetrics.quality_score
      performanceMetrics.goal_progress.quality_score.progress = 
        (performanceMetrics.quality_score / performanceMetrics.goal_progress.quality_score.target) * 100

      setState({
        property: enhancedProperty,
        workload: workloadSummary,
        performance: performanceMetrics,
        loading: false,
        error: null,
        lastUpdated: new Date()
      })

      console.log('Dashboard data loaded successfully')
      
      toast({
        title: "Dashboard Updated",
        description: "Latest data has been loaded successfully.",
      })

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || error.message 
        : 'Failed to load dashboard data'
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))

      toast({
        title: "Error Loading Dashboard",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Event handlers
  const handleRefresh = async () => {
    // Clear cache and reload data
    apiService.clearCache()
    await loadDashboardData()
  }

  const handleIntelligentReview = () => {
    const pendingApplications = applications.filter(app => app.status === 'pending')
    if (pendingApplications.length > 0) {
      setSelectedApplicationId(pendingApplications[0].id)
      setShowApplicationReview(true)
    } else {
      toast({
        title: "No Pending Applications",
        description: "There are no pending applications to review.",
      })
    }
  }

  const handleCompareApplications = () => {
    const pendingApplications = applications.filter(app => app.status === 'pending')
    if (pendingApplications.length >= 2) {
      setSelectedApplicationIds(pendingApplications.slice(0, 3).map(app => app.id))
      setShowComparison(true)
    } else {
      toast({
        title: "Insufficient Applications",
        description: "You need at least 2 applications to compare.",
      })
    }
  }

  const handleTaskClick = (type: string) => {
    // Navigate to tasks filtered by type
    console.log('Navigate to tasks:', type)
    setActiveTab('applications')
  }

  const handleScheduleInterviews = () => {
    // Open interview scheduling modal
    console.log('Schedule interviews')
  }

  const handleSendMessages = () => {
    // Open messaging interface
    console.log('Send messages')
  }

  const handleExportReports = () => {
    // Export dashboard reports
    console.log('Export reports')
  }

  const handleViewPerformanceDetails = () => {
    setActiveTab('analytics')
  }

  // Load data on mount - with deduplication
  useEffect(() => {
    let isMounted = true
    
    if (user?.property_id && !state.loading) {
      loadDashboardData().catch(error => {
        if (isMounted) {
          console.error('Dashboard data loading failed:', error)
        }
      })
    }
    
    return () => {
      isMounted = false
    }
  }, [user?.property_id])

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const permission = await requestNotificationPermission()
        if (permission === 'granted') {
          console.log('Notification permission granted')
        } else {
          console.log('Notification permission denied')
        }
      } catch (error) {
        console.error('Failed to request notification permission:', error)
      }
    }

    requestPermissions()
  }, [requestNotificationPermission])

  // Show toast for new urgent notifications
  useEffect(() => {
    if (urgentNotifications.length > 0) {
      const latestUrgent = urgentNotifications[0]
      if (!latestUrgent.read_at) {
        toast({
          title: latestUrgent.title,
          description: latestUrgent.message,
          variant: latestUrgent.severity === 'critical' ? 'destructive' : 'default',
        })
      }
    }
  }, [urgentNotifications, toast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.shiftKey) {
          switch (event.key) {
            case 'R':
              event.preventDefault()
              handleIntelligentReview()
              break
          }
        } else {
          switch (event.key) {
            case 'r':
              event.preventDefault()
              setActiveTab('applications')
              break
            case 'b':
              event.preventDefault()
              setShowBulkProcessor(true)
              break
            case 'w':
              event.preventDefault()
              setShowWorkflowAutomation(true)
              break
            case 'p':
              event.preventDefault()
              setShowPerformanceMonitor(true)
              break
            case 'c':
              event.preventDefault()
              handleCompareApplications()
              break
            case 'u':
              event.preventDefault()
              handleTaskClick('urgent')
              break
            case 'i':
              event.preventDefault()
              handleScheduleInterviews()
              break
            case 'm':
              event.preventDefault()
              handleSendMessages()
              break
            case 'a':
              event.preventDefault()
              setActiveTab('analytics')
              break
            case 'e':
              event.preventDefault()
              handleExportReports()
              break
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [applications])

  // Access control
  if (user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <div className="text-lg font-medium">Access Denied</div>
          <div className="text-sm text-gray-600">You don't have permission to access this dashboard.</div>
        </div>
      </div>
    )
  }

  // Show intelligent application review modal
  if (showApplicationReview && selectedApplicationId) {
    return (
      <IntelligentApplicationReview
        applicationId={selectedApplicationId}
        onClose={() => {
          setShowApplicationReview(false)
          setSelectedApplicationId(null)
        }}
        onNext={() => {
          const currentIndex = applications.findIndex(app => app.id === selectedApplicationId)
          const nextApplication = applications[currentIndex + 1]
          if (nextApplication) {
            setSelectedApplicationId(nextApplication.id)
          }
        }}
        onPrevious={() => {
          const currentIndex = applications.findIndex(app => app.id === selectedApplicationId)
          const previousApplication = applications[currentIndex - 1]
          if (previousApplication) {
            setSelectedApplicationId(previousApplication.id)
          }
        }}
      />
    )
  }

  // Show bulk processor modal
  if (showBulkProcessor) {
    return (
      <BulkApplicationProcessor
        applications={applications.map(app => ({
          id: app.id,
          candidate_name: `${app.first_name} ${app.last_name}`,
          email: app.email,
          position: app.position,
          department: app.department || 'Not specified',
          applied_at: app.created_at,
          status: app.status,
          score: Math.floor(Math.random() * 30) + 70, // Mock AI score
          ai_recommendation: (['hire', 'interview', 'reject', 'consider'] as const)[Math.floor(Math.random() * 4)],
          selected: false
        }))}
        onClose={() => setShowBulkProcessor(false)}
        onRefresh={handleRefresh}
      />
    )
  }

  // Show comparison modal
  if (showComparison && selectedApplicationIds.length > 0) {
    return (
      <ApplicationComparison
        candidateIds={selectedApplicationIds}
        onClose={() => {
          setShowComparison(false)
          setSelectedApplicationIds([])
        }}
        onAddCandidate={() => {
          // Logic to add more candidates to comparison
          console.log('Add candidate to comparison')
        }}
      />
    )
  }

  return (
    <Container className="max-w-7xl mx-auto p-6">
      <>
      {/* Loading State */}
      {state.loading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <div className="text-lg font-medium">Loading Dashboard</div>
            <div className="text-sm text-gray-600">Fetching your property data...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Dashboard Content */}
      {!state.loading && !state.error && state.property && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600">
                Property management and workflow optimization for {state.property.name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Notification Badge */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div>
                    <NotificationBadge
                      count={unreadCount}
                      urgentCount={urgentCount}
                      hasUnread={unreadCount > 0}
                      animate={true}
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0">
                  <NotificationPanel
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                    onDismiss={dismiss}
                    onClearAll={clearNotifications}
                    onNotificationClick={(notification) => {
                      // Handle notification click - could navigate to specific application
                      if (notification.metadata?.application_id) {
                        // Navigate to application review
                        console.log('Navigate to application:', notification.metadata.application_id)
                      }
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" onClick={handleRefresh} disabled={state.loading}>
                <RefreshCw className={cn('h-4 w-4 mr-1', state.loading && 'animate-spin')} />
                Refresh
              </Button>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>

          {/* Connection Status & Notification Permission */}
          {!connectionStatus.connected && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {connectionStatus.reconnecting 
                  ? `Reconnecting to live updates... (attempt ${connectionStatus.reconnectionAttempts})`
                  : 'Live updates disconnected. Some features may not work properly.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Urgent Notifications Alert */}
          {urgentCount > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You have {urgentCount} urgent notification{urgentCount > 1 ? 's' : ''} requiring immediate attention.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Property Overview */}
            <PropertyOverviewCard
              property={state.property}
              onRefresh={handleRefresh}
              loading={state.loading}
            />

            {/* Workload Summary */}
            {state.workload && (
              <WorkloadSummaryCard
                workload={state.workload}
                onTaskClick={handleTaskClick}
              />
            )}

            {/* Performance Overview */}
            {state.performance && (
              <PerformanceOverviewCard
                performance={state.performance}
                onViewDetails={handleViewPerformanceDetails}
              />
            )}
          </div>

          {/* Quick Actions Panel */}
          <div className="mb-6">
            <QuickActionsPanel actions={quickActions} />
          </div>

          {/* AI Insights Panel */}
          {aiInsights && (
            <Card className="mb-6 border-purple-200 bg-purple-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  Intelligent recommendations for your pending applications
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Grid columns={4} gap="sm">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {aiInsights.total_pending}
                    </div>
                    <div className="text-xs text-gray-600">Pending Review</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {aiInsights.ai_recommendations.auto_approve}
                    </div>
                    <div className="text-xs text-gray-600">Auto-Approve Ready</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {aiInsights.average_score}
                    </div>
                    <div className="text-xs text-gray-600">Avg AI Score</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-lg font-bold text-orange-600">
                      {aiInsights.processing_time_saved}m
                    </div>
                    <div className="text-xs text-gray-600">Time Saved</div>
                  </div>
                </Grid>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-purple-700">
                    AI has analyzed {aiInsights.total_pending} applications and identified {aiInsights.high_priority} high-priority candidates
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleIntelligentReview}
                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    <Brain className="h-4 w-4 mr-1" />
                    Start AI Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Features Banner */}
          <Alert className="mb-6 border-purple-200 bg-purple-50">
            <Brain className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <strong>New AI-Powered Features:</strong> Use intelligent application review, bulk processing, 
              and candidate comparison tools to streamline your hiring workflow.
            </AlertDescription>
          </Alert>

          {/* Dashboard Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-green-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>Approved 3 applications this morning</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <MessageSquare className="h-4 w-4 text-blue-600 mr-2" />
                          <span>Scheduled 2 interviews for next week</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <FileText className="h-4 w-4 text-purple-600 mr-2" />
                          <span>Reviewed 5 applications with AI assistance</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Upcoming Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                        Upcoming Tasks
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Interview with Sarah Johnson</span>
                          <Badge variant="outline">Today 2:00 PM</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Review 8 pending applications</span>
                          <Badge variant="outline">Tomorrow</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Weekly performance review</span>
                          <Badge variant="outline">Friday</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="applications" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Application Management</CardTitle>
                        <CardDescription>
                          Manage job applications with AI-powered tools
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleIntelligentReview}
                          disabled={applications.filter(app => app.status === 'pending').length === 0}
                        >
                          <Brain className="h-4 w-4 mr-1" />
                          AI Review
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowBulkProcessor(true)}
                          disabled={applications.length === 0}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Bulk Process
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCompareApplications}
                          disabled={applications.filter(app => app.status === 'pending').length < 2}
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Compare
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <div className="text-lg font-medium text-gray-900">Enhanced Application Management</div>
                      <div className="text-sm text-gray-600 mb-4">
                        Use the buttons above to access AI-powered application review tools
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="p-4 border rounded-lg">
                          <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <div className="font-medium">AI Review</div>
                          <div className="text-xs text-gray-600">Intelligent candidate scoring</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                          <div className="font-medium">Bulk Processing</div>
                          <div className="text-xs text-gray-600">Process multiple applications</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <div className="font-medium">Comparison</div>
                          <div className="text-xs text-gray-600">Side-by-side analysis</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>
                      Performance metrics and insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <div className="text-lg font-medium text-gray-900">Analytics Coming Soon</div>
                      <div className="text-sm text-gray-600">
                        Advanced analytics and reporting features will be available here
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard Settings</CardTitle>
                    <CardDescription>
                      Customize your dashboard experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <div className="text-lg font-medium text-gray-900">Settings Panel</div>
                      <div className="text-sm text-gray-600">
                        Dashboard customization options will be available here
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Last Updated */}
          {state.lastUpdated && (
            <div className="text-center text-sm text-gray-600 mt-6">
              Last updated: {state.lastUpdated.toLocaleString()}
            </div>
          )}
        </>
      )}
    </Container>
  )
}

export default EnhancedManagerDashboard
