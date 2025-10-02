import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatsSkeleton, SkeletonCard } from '@/components/ui/skeleton-loader'
import { DashboardBreadcrumb } from '@/components/ui/breadcrumb'
import { DashboardNavigation, MANAGER_NAVIGATION_ITEMS } from '@/components/ui/dashboard-navigation'
import { useSimpleNavigation, useNavigationAnalytics } from '@/hooks/use-simple-navigation'
import { useToast } from '@/hooks/use-toast'
import { useWebSocket } from '@/hooks/use-websocket'
import { Building2, MapPin, Phone, AlertTriangle, RefreshCw, Bell } from 'lucide-react'
// QR generator card removed from the property panel per design feedback
import { api } from '@/services/api'

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  qr_code_url: string
  is_active: boolean
  created_at: string
}

interface DashboardStats {
  total_applications: number
  pending_applications: number
  approved_applications: number
  total_employees: number
  active_employees: number
}

export function ManagerDashboardLayout() {
  const { user, logout } = useAuth()
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Navigation state management
  const navigation = useSimpleNavigation({
    role: 'manager'
    // Removed onNavigate callback - React Router handles navigation
  })
  
  const { trackNavigation } = useNavigationAnalytics()
  
  const [property, setProperty] = useState<Property | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)
  const refreshDebounceDelay = 5000 // 5 seconds minimum between refreshes

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, connectionError } = useWebSocket(
    `${import.meta.env.VITE_API_URL?.replace('https', 'wss').replace('http', 'ws')}/ws/dashboard`,
    {
      enabled: !!user && user.role === 'manager',
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[Manager Dashboard] WebSocket message:', data)
          
          // Handle different event types
          switch (data.type) {
            case 'application_created':
            case 'new_application':
              console.log('[Manager Dashboard] New application received:', data.data)
              // Refresh all data with visual feedback
              handleDataRefresh('New application received')
              showInfoToast('New Application', `New application from ${data.data?.first_name || 'applicant'}`)
              // Trigger child component refresh via outlet context
              setLastUpdateTime(new Date())
              break
              
            case 'application_approved':
            case 'application_rejected':
            case 'application_status_change':
              console.log('[Manager Dashboard] Application status changed:', data.data)
              // Refresh stats and applications list
              handleDataRefresh('Application status updated')
              // Update notification if status change affects manager
              if (data.data?.requires_review) {
                setNotificationCount(prev => prev + 1)
              }
              setLastUpdateTime(new Date())
              break
              
            case 'manager_review_needed':
              console.log('[Manager Dashboard] Manager review needed:', data.data)
              // Increment notification count and refresh applications
              setNotificationCount(prev => prev + 1)
              handleDataRefresh('New review required')
              showInfoToast('Review Required', 'New application requires your review')
              setLastUpdateTime(new Date())
              break
              
            case 'onboarding_completed':
              console.log('[Manager Dashboard] Onboarding completed:', data.data)
              // Refresh stats to show completed onboarding
              handleDataRefresh('Employee onboarding completed')
              showSuccessToast('Onboarding Complete', `${data.data?.employee_name || 'Employee'} has completed onboarding`)
              setLastUpdateTime(new Date())
              break
              
            case 'notification':
            case 'notification_created':
              console.log('[Manager Dashboard] New notification:', data.data)
              // Only update notification count, no full refresh needed
              setNotificationCount(prev => prev + 1)
              // Add subtle pulse animation to notification bell
              const bellElement = document.querySelector('.notification-bell')
              if (bellElement) {
                bellElement.classList.add('animate-pulse')
                setTimeout(() => bellElement.classList.remove('animate-pulse'), 3000)
              }
              // No full refresh needed for notifications
              break
              
            default:
              console.log('[Manager Dashboard] Unknown event type:', data.type)
          }
        } catch (error) {
          console.error('[Manager Dashboard] Failed to parse WebSocket message:', error)
        }
      },
      onOpen: () => {
        console.log('[Manager Dashboard] WebSocket connected')
      },
      onClose: (event) => {
        console.log('[Manager Dashboard] WebSocket disconnected:', event.code, event.reason)
      },
      onError: (error) => {
        console.error('[Manager Dashboard] WebSocket error:', error)
      }
    }
  )

  // Show connection status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isConnected) {
        console.log('[Manager Dashboard] WebSocket is connected')
      } else if (connectionError) {
        console.log('[Manager Dashboard] WebSocket connection error:', connectionError)
      }
    }
  }, [isConnected, connectionError])

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Refresh notification count periodically - increased to 60 seconds
  // WebSocket will handle real-time notification updates
  useEffect(() => {
    // Fetch initial count
    fetchNotificationCount()
    
    // Set up interval to refresh every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      fetchNotificationCount()
    }, 60000) // Changed from 30s to 60s
    
    return () => clearInterval(interval)
  }, [])

  const currentSection = navigation.currentSection

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user, retryCount])

  // Redirect to default section if on base /manager route
  useEffect(() => {
    if (location.pathname === '/manager') {
      navigate('/manager/applications', { replace: true })
    }
  }, [location.pathname, navigate])

  const fetchNotificationCount = async () => {
    try {
      const response = await api.notifications.getCount()
      if (response.data?.success) {
        setNotificationCount(response.data.data.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }

  const fetchData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      await Promise.all([fetchPropertyData(), fetchDashboardStats(), fetchNotificationCount()])
      if (retryCount > 0) {
        showSuccessToast('Dashboard refreshed', 'Data has been updated successfully')
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load dashboard data'
      setError(errorMessage)
      showErrorToast('Failed to load dashboard', errorMessage)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDataRefresh = async (message?: string, force: boolean = false) => {
    // Implement debouncing - don't refresh if we just did within 5 seconds
    const now = Date.now()
    if (!force && now - lastRefreshTime < refreshDebounceDelay) {
      console.log('[Manager Dashboard] Skipping refresh - too soon since last refresh')
      // Still show the message to indicate we received the update
      if (message) {
        setUpdateMessage(message)
        setTimeout(() => setUpdateMessage(null), 3000)
      }
      return
    }
    
    // Update last refresh time
    setLastRefreshTime(now)
    
    // Show update message briefly
    if (message) {
      setUpdateMessage(message)
      setTimeout(() => setUpdateMessage(null), 3000)
    }
    // Refresh data with visual indicator
    await fetchData(true)
  }

  const fetchPropertyData = async () => {
    const response = await api.manager.getMyProperty()
    // API service handles response unwrapping
    setProperty(response.data || null)
  }

  const fetchDashboardStats = async () => {
    const response = await api.manager.getDashboardStats()
    // API service handles response unwrapping
    setStats(response.data || {
      total_applications: 0,
      pending_applications: 0,
      approved_applications: 0,
      total_employees: 0,
      active_employees: 0
    })
  }

  // Targeted refresh functions for specific updates
  const refreshStatsOnly = async () => {
    try {
      await fetchDashboardStats()
      console.log('[Manager Dashboard] Stats refreshed')
    } catch (error) {
      console.error('[Manager Dashboard] Failed to refresh stats:', error)
    }
  }

  const refreshNotificationsOnly = async () => {
    try {
      await fetchNotificationCount()
      console.log('[Manager Dashboard] Notifications refreshed')
    } catch (error) {
      console.error('[Manager Dashboard] Failed to refresh notifications:', error)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  // Access control check
  if (user?.role !== 'manager') {
    return (
      <div className="responsive-container padding-lg flex items-center justify-center min-h-screen">
        <Card className="card-elevated card-rounded-lg max-w-md w-full">
          <CardContent className="card-padding-lg text-center spacing-sm">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-heading-lg text-primary mb-2">Access Denied</h2>
            <p className="text-body-md text-secondary mb-6">Manager role required to access this dashboard.</p>
            <Button onClick={logout} className="">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Property will be fetched from the backend, no need to check property_id in JWT

  // Add pending applications badge to navigation items
  const navigationItems = MANAGER_NAVIGATION_ITEMS.map(item => ({
    ...item,
    badge: item.key === 'applications' && stats && stats.pending_applications > 0 
      ? stats.pending_applications 
      : undefined
  }))

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="responsive-container padding-md">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div className="spacing-xs">
              <h1 className="text-display-md">Manager Dashboard</h1>
              <p className="text-body-md text-secondary">Welcome back, {user.first_name} {user.last_name}</p>
              {/* WebSocket Connection Status and Update Indicator */}
              <div className="flex items-center gap-4 mt-2">
                {process.env.NODE_ENV === 'development' && (
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className="text-xs text-gray-500">
                      {isConnected ? 'Real-time updates active' : connectionError || 'Connecting...'}
                    </span>
                  </div>
                )}
                {updateMessage && (
                  <div className="flex items-center gap-2 animate-slide-in">
                    <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600 font-medium">{updateMessage}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Badge */}
              <button
                className="notification-bell relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => navigate('/manager/notifications')}
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {notificationCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                  >
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </button>
              {error && (
                <Button 
                  onClick={handleRetry} 
                  variant="outline" 
                  size="sm"
                  className=""
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button onClick={logout} variant="outline" className="">
                Logout
              </Button>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <DashboardBreadcrumb 
              dashboard="Manager"
              currentPage={currentSection}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6 animate-slide-down">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Property Information Card */}
          <div className="mb-6">
            {loading ? (
              <SkeletonCard className="h-32" />
            ) : property ? (
              <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {property.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">Address</p>
                        {property.address || property.city || property.state || property.zip_code ? (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {property.address || ''}{property.address ? <br /> : null}
                            {[property.city, property.state].filter(Boolean).join(', ')}{(property.city || property.state) && property.zip_code ? ` ${property.zip_code}` : property.zip_code || ''}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">Not set</p>
                        )}
                      </div>
                    </div>
                    {property.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Phone</p>
                          <p className="text-sm text-gray-600">{property.phone}</p>
                        </div>
                      </div>
                    )}
                    {/* QR card removed. Managers can use the Applications view QR button. */}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Stats Cards with Refresh Animation */}
          <div className={`mb-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
            {loading ? (
              <StatsSkeleton count={4} />
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.total_applications}</p>
                      <p className="text-sm text-gray-500">Total Applications</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.pending_applications}</p>
                      <p className="text-sm text-gray-500">Pending Applications</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.approved_applications}</p>
                      <p className="text-sm text-gray-500">Approved Applications</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.total_employees}</p>
                      <p className="text-sm text-gray-500">Total Employees</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          {/* Navigation */}
          <div className="mb-6">
            <DashboardNavigation 
              items={navigationItems}
              userRole="manager"
              className="w-full"
              variant={isMobile ? 'mobile' : 'tabs'}
              showLabels={true}
              compact={false}
              orientation="horizontal"
              onNavigate={(item) => {
                trackNavigation(navigation.currentSection, item.key)
                // React Router Link handles navigation automatically
                // No need to call navigation.handleNavigationClick(item)
              }}
            />
          </div>

          {/* Main Content */}
          <div className="spacing-md">
            <Outlet context={{ 
              stats, 
              property,
              onStatsUpdate: fetchData,
              userRole: 'manager',
              propertyId: property?.id,
              lastUpdateTime,
              isRefreshing 
            }} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}