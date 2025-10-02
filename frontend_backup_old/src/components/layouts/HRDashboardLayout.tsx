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
import { AlertTriangle, RefreshCw } from 'lucide-react'
import axios from 'axios'

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
}

export function HRDashboardLayout() {
  const { user, logout, loading: authLoading } = useAuth()
  const { error: showErrorToast, success: showSuccessToast } = useToast()
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
      navigate('/hr/properties', { replace: true })
    }
  }, [location.pathname, navigate])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
      }
      
      const response = await axios.get('/api/hr/dashboard-stats', axiosConfig)
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
    }
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
              <p className="text-body-md text-secondary">Welcome, {user?.email}</p>
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

          {/* Stats Cards */}
          <div className="mb-8">
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
            <Outlet context={{ stats, onStatsUpdate: fetchDashboardStats }} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}