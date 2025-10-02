import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatsSkeleton } from '@/components/ui/skeleton-loader'
import { DashboardBreadcrumb } from '@/components/ui/breadcrumb'
import { DashboardNavigation, HR_NAVIGATION_ITEMS } from '@/components/ui/dashboard-navigation'
import { useSimpleNavigation, useNavigationAnalytics } from '@/hooks/use-simple-navigation'
import { useToast } from '@/hooks/use-toast'
import { useWebSocket } from '@/hooks/use-websocket'
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import axios from 'axios'
import { getApiUrl } from '@/config/api'

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
}

export function HRDashboardLayout() {
  const { user, logout, loading: authLoading } = useAuth()
  const { error: showErrorToast, success: showSuccessToast, info: showInfoToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Navigation state management
  const navigation = useSimpleNavigation({
    role: 'hr'
    // Removed onNavigate callback - React Router handles navigation
  })
  
  const { trackNavigation } = useNavigationAnalytics()
  
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingApplications: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<Array<{type: string, message: string, timestamp: Date}>>([])

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, connectionError } = useWebSocket(
    `${import.meta.env.VITE_API_URL?.replace('https', 'wss').replace('http', 'ws')}/ws/dashboard`,
    {
      enabled: !!user && user.role === 'hr',
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[HR Dashboard] WebSocket message:', data)
          
          // Add to recent activity
          const addActivity = (type: string, message: string) => {
            setRecentActivity(prev => [
              { type, message, timestamp: new Date() },
              ...prev.slice(0, 4) // Keep last 5 activities
            ])
          }
          
          // Handle different event types
          switch (data.type) {
            case 'application_created':
            case 'new_application':
              console.log('[HR Dashboard] New application received:', data.data)
              // Refresh all data with visual feedback
              handleDataRefresh('New application received')
              showInfoToast('New Application', `New application at ${data.data?.property_name || 'a property'}`)
              addActivity('application', `New application at ${data.data?.property_name || 'property'}`)
              setLastUpdateTime(new Date())
              break
              
            case 'application_approved':
            case 'application_rejected':
            case 'application_status_change':
              console.log('[HR Dashboard] Application status changed:', data.data)
              // Refresh stats and applications
              handleDataRefresh('Application status updated')
              const statusMsg = `Application ${data.data?.status || 'updated'} at ${data.data?.property_name || 'property'}`
              addActivity('status', statusMsg)
              setLastUpdateTime(new Date())
              break
              
            case 'manager_assigned':
              console.log('[HR Dashboard] Manager assigned:', data.data)
              // Refresh managers and properties data
              handleDataRefresh('Manager assignment updated')
              showInfoToast('Manager Assigned', `New manager assigned to ${data.data?.property_name || 'property'}`)
              addActivity('manager', `Manager assigned to ${data.data?.property_name || 'property'}`)
              setLastUpdateTime(new Date())
              break
              
            case 'property_created':
            case 'property_updated':
            case 'property_deleted':
              console.log('[HR Dashboard] Property changed:', data.data)
              // Refresh all property-related data
              handleDataRefresh('Property data updated')
              const propMsg = data.type === 'property_created' ? 'New property created' : 'Property updated'
              showSuccessToast('Property Update', `${propMsg}: ${data.data?.name || 'Property'}`)
              addActivity('property', propMsg)
              setLastUpdateTime(new Date())
              break
              
            case 'onboarding_completed':
              console.log('[HR Dashboard] Onboarding completed:', data.data)
              // Refresh employee stats
              handleDataRefresh('Employee onboarding completed')
              showSuccessToast('Onboarding Complete', `Employee completed onboarding at ${data.data?.property_name || 'property'}`)
              addActivity('onboarding', `Onboarding completed at ${data.data?.property_name || 'property'}`)
              setLastUpdateTime(new Date())
              break
              
            case 'compliance_alert':
              console.log('[HR Dashboard] Compliance alert:', data.data)
              showErrorToast('Compliance Alert', data.data?.message || 'Compliance issue detected')
              addActivity('alert', data.data?.message || 'Compliance issue')
              // Refresh to show compliance issues
              handleDataRefresh('Compliance check required')
              break
              
            default:
              console.log('[HR Dashboard] Unknown event type:', data.type)
          }
        } catch (error) {
          console.error('[HR Dashboard] Failed to parse WebSocket message:', error)
        }
      },
      onOpen: () => {
        console.log('[HR Dashboard] WebSocket connected')
      },
      onClose: (event) => {
        console.log('[HR Dashboard] WebSocket disconnected:', event.code, event.reason)
      },
      onError: (error) => {
        console.error('[HR Dashboard] WebSocket error:', error)
      }
    }
  )

  // Show connection status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isConnected) {
        console.log('[HR Dashboard] WebSocket is connected')
      } else if (connectionError) {
        console.log('[HR Dashboard] WebSocket connection error:', connectionError)
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

  const currentSection = navigation.currentSection

  useEffect(() => {
    // Only fetch stats after auth is loaded and user is available
    if (!authLoading && user) {
      fetchDashboardStats()
    }
  }, [retryCount, authLoading, user])

  // Redirect to default section if on base /hr route
  useEffect(() => {
    if (location.pathname === '/hr') {
      navigate('/hr/overview', { replace: true })
    }
  }, [location.pathname, navigate])

  const fetchDashboardStats = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const token = localStorage.getItem('token')
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
      }
      
      const response = await axios.get(`${getApiUrl()}/hr/dashboard-stats`, axiosConfig)
      // Handle wrapped response from backend (success_response format)
      const statsData = response.data.data || response.data
      setStats(statsData)
      if (retryCount > 0) {
        showSuccessToast('Dashboard refreshed', 'Stats have been updated successfully')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || error.message 
        : 'Failed to load dashboard statistics'
      setError(errorMessage)
      showErrorToast('Failed to load dashboard', errorMessage)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleDataRefresh = async (message?: string) => {
    // Show update message briefly
    if (message) {
      setUpdateMessage(message)
      setTimeout(() => setUpdateMessage(null), 3000)
    }
    // Refresh data with visual indicator
    await fetchDashboardStats(true)
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  // Access control check
  if (user?.role !== 'hr') {
    return (
      <div className="responsive-container padding-lg flex items-center justify-center min-h-screen">
        <Card className="card-elevated card-rounded-lg max-w-md w-full">
          <CardContent className="card-padding-lg text-center spacing-sm">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-heading-lg text-primary mb-2">Access Denied</h2>
            <p className="text-body-md text-secondary mb-6">HR role required to access this dashboard.</p>
            <Button onClick={logout} className="">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Add pending applications badge to navigation items
  const navigationItems = HR_NAVIGATION_ITEMS.map(item => ({
    ...item,
    badge: item.key === 'applications' && stats.pendingApplications > 0 
      ? stats.pendingApplications 
      : undefined
  }))

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="responsive-container padding-md">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="spacing-xs">
              <h1 className="text-display-md">HR Dashboard</h1>
              <p className="text-body-md text-secondary">
                Welcome, {user?.first_name && user?.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user?.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">Role: HR Administrator</p>
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
                    <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
                    <span className="text-xs text-blue-600 font-medium">{updateMessage}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
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
            <DashboardBreadcrumb role="hr" currentSection={currentSection} />
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

          {/* Recent Activity Feed (only when connected) */}
          {isConnected && recentActivity.length > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 animate-slide-down">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Recent Activity</span>
              </div>
              <div className="space-y-1">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="text-xs text-blue-700 flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span>{activity.message}</span>
                    <span className="text-blue-400 ml-auto">
                      {new Date(activity.timestamp).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Cards with Refresh Animation */}
          <div className={`mb-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
            {loading ? (
              <StatsSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.totalProperties}</p>
                      <p className="text-sm text-gray-500">Properties</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.totalManagers}</p>
                      <p className="text-sm text-gray-500">Managers</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</p>
                      <p className="text-sm text-gray-500">Employees</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-3xl font-bold text-blue-600">{stats.pendingApplications}</p>
                      <p className="text-sm text-gray-500">Pending Applications</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mb-6">
            <DashboardNavigation 
              items={navigationItems}
              userRole="hr"
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
              onStatsUpdate: fetchDashboardStats,
              lastUpdateTime,
              isRefreshing,
              userRole: 'hr' 
            }} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}