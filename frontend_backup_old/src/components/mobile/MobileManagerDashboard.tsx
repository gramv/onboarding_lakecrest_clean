/**
 * Mobile Manager Dashboard
 * Mobile-first manager dashboard with touch-optimized controls and offline capability
 */

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Home,
  Briefcase,
  PieChart,
  Wifi,
  WifiOff,
  Smartphone,
  Vibrate,
  Volume2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import design system components
import { Container, Stack, Grid, Flex } from '@/design-system/components/Layout'

// =====================================
// TYPES AND INTERFACES
// =====================================

interface MobileGesture {
  type: 'swipe' | 'tap' | 'long-press' | 'pinch' | 'pull-to-refresh'
  direction?: 'left' | 'right' | 'up' | 'down'
  target: string
  action: () => void
}

interface OfflineData {
  applications: any[]
  property_info: any
  cached_at: string
  sync_pending: boolean
}

interface PushNotification {
  id: string
  title: string
  body: string
  action_url?: string
  action_label?: string
  priority: 'high' | 'normal' | 'low'
  created_at: string
}

interface TouchOptimizedAction {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  action: () => void
  haptic?: boolean
  sound?: boolean
}

// =====================================
// MOBILE GESTURE HANDLER
// =====================================

interface MobileGestureHandlerProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: () => void
  onPullToRefresh?: () => void
  className?: string
}

const MobileGestureHandler: React.FC<MobileGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onPullToRefresh,
  className
}) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout>()

  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })

    // Start long press timer
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setIsLongPress(true)
        triggerHapticFeedback('medium')
        onLongPress()
      }, 500)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return

    const currentTouch = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    }

    setTouchEnd(currentTouch)

    // Clear long press if moved too much
    if (longPressTimer.current) {
      const distance = Math.sqrt(
        Math.pow(currentTouch.x - touchStart.x, 2) + 
        Math.pow(currentTouch.y - touchStart.y, 2)
      )
      if (distance > 10) {
        clearTimeout(longPressTimer.current)
      }
    }

    // Handle pull to refresh
    if (onPullToRefresh && currentTouch.y - touchStart.y > 100 && window.scrollY === 0) {
      setIsPulling(true)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }

    if (isLongPress) {
      setIsLongPress(false)
      return
    }

    if (isPulling && onPullToRefresh) {
      setIsPulling(false)
      triggerHapticFeedback('light')
      onPullToRefresh()
      return
    }

    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isUpSwipe = distanceY > minSwipeDistance
    const isDownSwipe = distanceY < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) {
      triggerHapticFeedback('light')
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      triggerHapticFeedback('light')
      onSwipeRight()
    }
    if (isUpSwipe && onSwipeUp) {
      triggerHapticFeedback('light')
      onSwipeUp()
    }
    if (isDownSwipe && onSwipeDown) {
      triggerHapticFeedback('light')
      onSwipeDown()
    }
  }

  const triggerHapticFeedback = (intensity: 'light' | 'medium' | 'heavy') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      }
      navigator.vibrate(patterns[intensity])
    }
  }

  return (
    <div
      className={cn('touch-manipulation', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isPulling && (
        <div className="absolute top-0 left-0 right-0 h-16 bg-blue-50 flex items-center justify-center z-10">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-blue-600">Pull to refresh...</span>
        </div>
      )}
      {children}
    </div>
  )
}

// =====================================
// MOBILE NAVIGATION BAR
// =====================================

interface MobileNavigationBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  notificationCount: number
}

const MobileNavigationBar: React.FC<MobileNavigationBarProps> = ({
  activeTab,
  onTabChange,
  notificationCount
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: notificationCount }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 transition-colors relative',
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 active:bg-gray-100'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge && tab.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =====================================
// MOBILE APPLICATION CARD
// =====================================

interface MobileApplicationCardProps {
  application: any
  onApprove: () => void
  onReject: () => void
  onViewDetails: () => void
}

const MobileApplicationCard: React.FC<MobileApplicationCardProps> = ({
  application,
  onApprove,
  onReject,
  onViewDetails
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [swipeAction, setSwipeAction] = useState<'approve' | 'reject' | null>(null)

  const handleSwipeLeft = () => {
    setSwipeAction('reject')
    setTimeout(() => {
      onReject()
      setSwipeAction(null)
    }, 300)
  }

  const handleSwipeRight = () => {
    setSwipeAction('approve')
    setTimeout(() => {
      onApprove()
      setSwipeAction(null)
    }, 300)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <MobileGestureHandler
      onSwipeLeft={handleSwipeLeft}
      onSwipeRight={handleSwipeRight}
      onLongPress={() => setIsExpanded(!isExpanded)}
    >
      <Card 
        className={cn(
          'mb-3 transition-all duration-300 touch-manipulation',
          swipeAction === 'approve' && 'bg-green-50 border-green-200',
          swipeAction === 'reject' && 'bg-red-50 border-red-200'
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{application.candidate_name}</h3>
                <p className="text-xs text-gray-600">{application.position}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(application.status)}>
                {application.status}
              </Badge>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {isExpanded ? 
                  <ChevronUp className="h-4 w-4 text-gray-600" /> : 
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                }
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-3 w-3 mr-1" />
              Applied {new Date(application.applied_at).toLocaleDateString()}
            </div>
            <div className="flex items-center text-gray-600">
              <Star className="h-3 w-3 mr-1" />
              Score: {application.score || 'N/A'}
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-600">Experience:</span>
                  <span className="ml-1 font-medium">{application.experience_years || 0} years</span>
                </div>
                <div>
                  <span className="text-gray-600">Education:</span>
                  <span className="ml-1 font-medium">{application.education_level || 'N/A'}</span>
                </div>
              </div>
              
              {application.skills && (
                <div>
                  <span className="text-xs text-gray-600">Skills:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {application.skills.slice(0, 3).map((skill: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {application.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{application.skills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={onViewDetails}
              className="flex-1 h-10"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="h-10 px-3 text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              className="h-10 px-3 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          </div>

          {/* Swipe Indicators */}
          {swipeAction && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
              <div className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-full',
                swipeAction === 'approve' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              )}>
                {swipeAction === 'approve' ? 
                  <CheckCircle className="h-5 w-5" /> : 
                  <XCircle className="h-5 w-5" />
                }
                <span className="font-medium">
                  {swipeAction === 'approve' ? 'Approving...' : 'Rejecting...'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MobileGestureHandler>
  )
}

// =====================================
// OFFLINE INDICATOR
// =====================================

interface OfflineIndicatorProps {
  isOnline: boolean
  syncPending: boolean
  onSync: () => void
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  syncPending,
  onSync
}) => {
  if (isOnline && !syncPending) return null

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center',
      isOnline ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
    )}>
      <div className="flex items-center justify-center space-x-2">
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>
          {isOnline 
            ? `${syncPending ? 'Syncing changes...' : 'Connected'}`
            : 'Offline - Changes will sync when connected'
          }
        </span>
        {syncPending && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onSync}
            className="h-6 px-2 text-xs text-white hover:bg-white hover:bg-opacity-20"
          >
            Sync Now
          </Button>
        )}
      </div>
    </div>
  )
}

// =====================================
// MAIN MOBILE MANAGER DASHBOARD
// =====================================

export const MobileManagerDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('home')
  const [applications, setApplications] = useState<any[]>([])
  const [propertyData, setPropertyData] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncPending, setSyncPending] = useState(false)
  const [offlineData, setOfflineData] = useState<OfflineData | null>(null)
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [loading, setLoading] = useState(true)

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (syncPending) {
        syncOfflineData()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      cacheCurrentData()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncPending])

  // Load data
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      if (isOnline) {
        // Load from API
        const [applicationsData, propertyInfo] = await Promise.all([
          fetch('/api/manager/applications').then(r => r.json()),
          fetch(`/api/properties/${user?.property_id}`).then(r => r.json())
        ])
        
        setApplications(applicationsData)
        setPropertyData(propertyInfo)
        
        // Cache for offline use
        cacheCurrentData()
      } else {
        // Load from cache
        const cached = localStorage.getItem('mobile_dashboard_cache')
        if (cached) {
          const data = JSON.parse(cached)
          setApplications(data.applications)
          setPropertyData(data.property_info)
          setOfflineData(data)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast({
        title: "Error Loading Data",
        description: "Failed to load dashboard data. Using cached data if available.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const cacheCurrentData = () => {
    const cacheData: OfflineData = {
      applications,
      property_info: propertyData,
      cached_at: new Date().toISOString(),
      sync_pending: syncPending
    }
    
    localStorage.setItem('mobile_dashboard_cache', JSON.stringify(cacheData))
    setOfflineData(cacheData)
  }

  const syncOfflineData = async () => {
    if (!isOnline) return

    try {
      // Sync any pending changes
      const pendingActions = JSON.parse(localStorage.getItem('pending_actions') || '[]')
      
      for (const action of pendingActions) {
        await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        })
      }

      // Clear pending actions
      localStorage.removeItem('pending_actions')
      setSyncPending(false)
      
      // Reload fresh data
      await loadDashboardData()
      
      toast({
        title: "Sync Complete",
        description: "All changes have been synchronized.",
      })
    } catch (error) {
      console.error('Sync failed:', error)
      toast({
        title: "Sync Failed",
        description: "Failed to sync changes. Will retry when connection improves.",
        variant: "destructive",
      })
    }
  }

  const handleApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    const actionData = {
      endpoint: `/api/applications/${applicationId}/${action}`,
      method: 'POST',
      data: { action, timestamp: new Date().toISOString() }
    }

    if (isOnline) {
      try {
        await fetch(actionData.endpoint, {
          method: actionData.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(actionData.data)
        })
        
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' }
            : app
        ))
        
        // Trigger haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50])
        }
        
        toast({
          title: `Application ${action === 'approve' ? 'Approved' : 'Rejected'}`,
          description: `The application has been ${action}d successfully.`,
        })
      } catch (error) {
        console.error('Action failed:', error)
        toast({
          title: "Action Failed",
          description: "Failed to process application. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      // Queue for offline sync
      const pendingActions = JSON.parse(localStorage.getItem('pending_actions') || '[]')
      pendingActions.push(actionData)
      localStorage.setItem('pending_actions', JSON.stringify(pendingActions))
      
      // Update local state optimistically
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status: action === 'approve' ? 'approved' : 'rejected' }
          : app
      ))
      
      setSyncPending(true)
      
      toast({
        title: `Application ${action === 'approve' ? 'Approved' : 'Rejected'} (Offline)`,
        description: "Action saved. Will sync when connection is restored.",
      })
    }
  }

  const handlePullToRefresh = () => {
    if (isOnline) {
      loadDashboardData()
    }
  }

  const renderHomeTab = () => (
    <div className="space-y-4 pb-20">
      {/* Property Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">{propertyData?.name || 'Property'}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePullToRefresh}
              disabled={!isOnline}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {propertyData?.occupancy_rate || 87}%
              </div>
              <div className="text-xs text-gray-600">Occupancy</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {applications.filter(app => app.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-16 flex-col space-y-1"
              onClick={() => setActiveTab('applications')}
            >
              <Briefcase className="h-5 w-5" />
              <span className="text-xs">Applications</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col space-y-1"
              onClick={() => setActiveTab('analytics')}
            >
              <PieChart className="h-5 w-5" />
              <span className="text-xs">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {applications.slice(0, 3).map((app, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{app.candidate_name}</div>
                  <div className="text-xs text-gray-600">{app.position}</div>
                </div>
                <Badge className="text-xs">
                  {app.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderApplicationsTab = () => (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Applications</h2>
        <Badge variant="outline">
          {applications.filter(app => app.status === 'pending').length} pending
        </Badge>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {applications.filter(app => app.status === 'pending').map((application) => (
          <MobileApplicationCard
            key={application.id}
            application={application}
            onApprove={() => handleApplicationAction(application.id, 'approve')}
            onReject={() => handleApplicationAction(application.id, 'reject')}
            onViewDetails={() => {
              // Handle view details
              console.log('View details:', application.id)
            }}
          />
        ))}
      </div>

      {applications.filter(app => app.status === 'pending').length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pending applications</p>
        </div>
      )}
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold">Analytics</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {applications.length}
            </div>
            <div className="text-xs text-gray-600">Total Applications</div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(app => app.status === 'approved').length}
            </div>
            <div className="text-xs text-gray-600">Approved</div>
          </div>
        </Card>
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div className="space-y-4 pb-20">
      <h2 className="text-xl font-bold">Notifications</h2>
      
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card key={notification.id}>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm">{notification.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-lg font-medium mb-2">Loading Dashboard</div>
          <div className="text-sm text-gray-600">Please wait...</div>
        </div>
      </div>
    )
  }

  return (
    <MobileGestureHandler onPullToRefresh={handlePullToRefresh}>
      <div className="min-h-screen bg-gray-50">
        {/* Offline Indicator */}
        <OfflineIndicator
          isOnline={isOnline}
          syncPending={syncPending}
          onSync={syncOfflineData}
        />

        {/* Main Content */}
        <div className={cn('px-4 py-4', (!isOnline || syncPending) && 'pt-12')}>
          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'applications' && renderApplicationsTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
        </div>

        {/* Mobile Navigation */}
        <MobileNavigationBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notificationCount={notifications.length}
        />
      </div>
    </MobileGestureHandler>
  )
}

export default MobileManagerDashboard