import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatsSkeleton } from '@/components/ui/skeleton-loader'
import { StatCard, StatCardGrid } from '@/components/ui/stat-card'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, RefreshCw, Building2, Users, UserCheck, FileText } from 'lucide-react'
import api from '@/services/api'

// Import tab components (to be created in subsequent tasks)
import PropertiesTab from '@/components/dashboard/PropertiesTab'
import ManagersTab from '@/components/dashboard/ManagersTab'
import { EmployeesTab } from '@/components/dashboard/EmployeesTab'
import { ApplicationsTab } from '@/components/dashboard/ApplicationsTab'
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab'

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
}

export default function HRDashboard() {
  const { user, logout, loading: authLoading } = useAuth()
  const { error: showErrorToast, success: showSuccessToast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingApplications: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Only fetch stats after auth is loaded and user is available
    if (!authLoading && user) {
      fetchDashboardStats()
    }
  }, [retryCount, authLoading, user])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.hr.getDashboardStats()
      // API service handles response unwrapping
      console.log('Dashboard Stats Response:', response.data)
      setStats(response.data)
      if (retryCount > 0) {
        showSuccessToast('Dashboard refreshed', 'Stats have been updated successfully')
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load dashboard statistics'
      setError(errorMessage)
      showErrorToast('Failed to load dashboard', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  if (user?.role !== 'hr') {
    return (
      <div className="responsive-container padding-lg flex items-center justify-center min-h-screen">
        <Card className="card-elevated card-rounded-lg max-w-md w-full">
          <CardContent className="card-padding-lg text-center spacing-sm">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-heading-lg text-primary mb-2">Access Denied</h2>
            <p className="text-body-md text-secondary mb-6">HR role required to access this dashboard.</p>
            <Button onClick={logout}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="responsive-container padding-md">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div className="spacing-xs">
            <h1 className="text-heading-primary">HR Dashboard</h1>
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
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
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
            <StatCardGrid columns={4} className="card-transition">
              <StatCard
                title="Properties"
                value={stats.totalProperties}
                icon={<Building2 className="h-5 w-5" />}
                variant="default"
                className="card-transition"
              />
              <StatCard
                title="Managers"
                value={stats.totalManagers}
                icon={<Users className="h-5 w-5" />}
                variant="default"
                className="card-transition"
              />
              <StatCard
                title="Employees"
                value={stats.totalEmployees}
                icon={<UserCheck className="h-5 w-5" />}
                variant="success"
                className="card-transition"
              />
              <StatCard
                title="Pending Applications"
                value={stats.pendingApplications}
                icon={<FileText className="h-5 w-5" />}
                variant="warning"
                className="card-transition"
              />
            </StatCardGrid>
          )}
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="properties" className="spacing-md">
          <TabsList className="nav-tabs w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 bg-gray-50 p-1 rounded-xl">
            <TabsTrigger value="properties" className="nav-tab rounded-lg">Properties</TabsTrigger>
            <TabsTrigger value="managers" className="nav-tab rounded-lg">Managers</TabsTrigger>
            <TabsTrigger value="employees" className="nav-tab rounded-lg">Employees</TabsTrigger>
            <TabsTrigger value="applications" className="nav-tab rounded-lg">Applications</TabsTrigger>
            <TabsTrigger value="analytics" className="nav-tab rounded-lg">Analytics</TabsTrigger>
          </TabsList>

        <TabsContent value="properties">
          <PropertiesTab onStatsUpdate={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="managers">
          <ManagersTab onStatsUpdate={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeesTab userRole="hr" onStatsUpdate={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="applications">
          <ApplicationsTab userRole="hr" onStatsUpdate={fetchDashboardStats} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab userRole="hr" />
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  )
}