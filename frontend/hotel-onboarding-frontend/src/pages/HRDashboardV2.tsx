/**
 * HR Dashboard V2 - Rebuilt with centralized state and real-time updates
 * Single source of truth with WebSocket integration for live updates
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardProvider, useDashboard, useDashboardStats } from '@/contexts/DashboardContext'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Building, Users, UserCheck, ClipboardList, 
  TrendingUp, RefreshCw, Wifi, WifiOff,
  AlertTriangle, CheckCircle2, Clock
} from 'lucide-react'

// Import simplified tab components
import PropertiesTabV2 from '@/components/dashboard/PropertiesTabV2'
import ManagersTabV2 from '@/components/dashboard/ManagersTabV2'
import EmployeesTabV2 from '@/components/dashboard/EmployeesTabV2'
import ApplicationsTabV2 from '@/components/dashboard/ApplicationsTabV2'
import AnalyticsTabV2 from '@/components/dashboard/AnalyticsTabV2'

// Stats Card Component
function StatsCard({ title, value, icon, description, trend, loading }: {
  title: string
  value: number
  icon: React.ReactNode
  description?: string
  trend?: 'up' | 'down' | 'stable'
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-7 bg-gray-200 rounded w-20 mb-1"></div>
            {description && <div className="h-4 bg-gray-200 rounded w-32 mt-2"></div>}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 mr-1" />}
                {trend === 'down' && <TrendingUp className="h-3 w-3 text-red-500 mr-1 rotate-180" />}
                {trend === 'stable' && <div className="h-3 w-3 bg-gray-400 rounded-full mr-1" />}
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Connection Status Component
function ConnectionStatus() {
  const { isConnected, connectionError } = useWebSocketContext()

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">Live Updates</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">
            {connectionError || 'Connecting...'}
          </span>
        </>
      )}
    </div>
  )
}

// Main Dashboard Content
function DashboardContent() {
  const { user, logout } = useAuth()
  const { stats, loading, errors, refreshAll, isConnected } = useDashboard()
  const [activeTab, setActiveTab] = useState('properties')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await refreshAll()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Show global errors
  const globalError = errors.stats || errors.properties || errors.managers

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionStatus />
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Error Alert */}
      {globalError && (
        <div className="container mx-auto px-4 mt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{globalError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Stats Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Properties"
            value={stats.totalProperties}
            icon={<Building className="h-4 w-4" />}
            description="Active hotel locations"
            loading={loading.stats}
          />
          <StatsCard
            title="Active Managers"
            value={stats.totalManagers}
            icon={<Users className="h-4 w-4" />}
            description="Property managers"
            loading={loading.stats}
          />
          <StatsCard
            title="Active Employees"
            value={stats.activeEmployees}
            icon={<UserCheck className="h-4 w-4" />}
            description={`${stats.onboardingInProgress} onboarding`}
            loading={loading.stats}
          />
          <StatsCard
            title="Pending Applications"
            value={stats.pendingApplications}
            icon={<ClipboardList className="h-4 w-4" />}
            description={`${stats.approvedApplications} approved`}
            loading={loading.stats}
          />
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-6 pt-6">
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                  <TabsTrigger value="properties">Properties</TabsTrigger>
                  <TabsTrigger value="managers">Managers</TabsTrigger>
                  <TabsTrigger value="employees">Employees</TabsTrigger>
                  <TabsTrigger value="applications">Applications</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="properties" className="mt-0">
                  <PropertiesTabV2 />
                </TabsContent>

                <TabsContent value="managers" className="mt-0">
                  <ManagersTabV2 />
                </TabsContent>

                <TabsContent value="employees" className="mt-0">
                  <EmployeesTabV2 />
                </TabsContent>

                <TabsContent value="applications" className="mt-0">
                  <ApplicationsTabV2 />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0">
                  <AnalyticsTabV2 />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status Footer */}
      {isConnected && (
        <div className="fixed bottom-4 right-4">
          <Badge variant="outline" className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
            Real-time updates active
          </Badge>
        </div>
      )}
    </div>
  )
}

// Main Component with Provider
export default function HRDashboardV2() {
  const { user, loading: authLoading } = useAuth()

  // Wait for auth to load
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check authorization
  if (!user || user.role !== 'hr') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">HR role required to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardProvider userRole="hr">
      <DashboardContent />
    </DashboardProvider>
  )
}