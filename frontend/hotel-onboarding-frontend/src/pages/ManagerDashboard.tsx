import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatsSkeleton, SkeletonCard } from '@/components/ui/skeleton-loader'
import { useToast } from '@/hooks/use-toast'
import { Building2, Users, FileText, BarChart3, MapPin, Phone, AlertTriangle, RefreshCw, Download, Lock, Settings } from 'lucide-react'
import { ApplicationsTab } from '@/components/dashboard/ApplicationsTab'
import { EmployeesTab } from '@/components/dashboard/EmployeesTab'
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab'
import { QRCodeCard } from '@/components/ui/qr-code-display'
import { PasswordResetModal } from '@/components/profile/PasswordResetModal'
import { ManagerNotificationSettings } from '@/components/dashboard/ManagerNotificationSettings'
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

interface PropertyQrResponse {
  property_id: string
  qr_code_url?: string
  printable_qr_url?: string
  application_url?: string
}

interface DashboardStats {
  total_applications: number
  pending_applications: number
  approved_applications: number
  total_employees: number
  active_employees: number
}

export default function ManagerDashboard() {
  const { user, logout, refreshUserData } = useAuth()
  const { error: showErrorToast, success: showSuccessToast } = useToast()
  const toastRef = useRef({ showErrorToast, showSuccessToast })
  const [property, setProperty] = useState<Property | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('applications')
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    toastRef.current = { showErrorToast, showSuccessToast }
  }, [showErrorToast, showSuccessToast])

  useEffect(() => {
    // First, try to refresh user data if property_id is missing
    const initializeDashboard = async () => {
      if (!user?.property_id && user?.role === 'manager' && !isRefreshing) {
        setIsRefreshing(true)
        console.log('Property ID missing, refreshing user data...')

        try {
          await refreshUserData()
          // After refresh, the user object will be updated through context
        } catch (error) {
          console.error('Failed to refresh user data:', error)
        } finally {
          setIsRefreshing(false)
        }
      }
    }

    initializeDashboard()
  }, [user, refreshUserData, isRefreshing])

  const fetchPropertyData = useCallback(async () => {
    try {
      const response = await api.manager.getProperty()
      if (response?.data) {
        setProperty(response.data)
        return
      }
    } catch (err) {
      console.error('Failed to fetch primary property:', err)
    }

    try {
      const listResponse = await api.manager.getProperties()
      if (Array.isArray(listResponse?.data) && listResponse.data.length > 0) {
        setProperty(listResponse.data[0])
        return
      }
    } catch (err) {
      console.error('Failed to load manager property list:', err)
    }

    setProperty(null)
  }, [])

  const fetchDashboardStats = useCallback(async () => {
    const response = await api.manager.getDashboardStats()
    const statsData = response.data || {}

    setStats({
      total_applications: statsData.totalApplications ?? statsData.property_applications ?? 0,
      pending_applications: statsData.pendingApplications ?? 0,
      approved_applications: statsData.approvedApplications ?? 0,
      total_employees: statsData.totalEmployees ?? statsData.property_employees ?? 0,
      active_employees: statsData.activeEmployees ?? 0
    })
  }, [])

  const fetchData = useCallback(async () => {
    const { showErrorToast: errorToast, showSuccessToast: successToast } = toastRef.current

    try {
      setLoading(true)
      setError(null)
      await Promise.all([fetchPropertyData(), fetchDashboardStats()])
      if (retryCount > 0) {
        successToast('Dashboard refreshed', 'Data has been updated successfully')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to load dashboard data'
      setError(errorMessage)
      errorToast('Failed to load dashboard', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchDashboardStats, fetchPropertyData, retryCount])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRetry = async () => {
    setIsRefreshing(true)
    try {
      await refreshUserData()
      setRetryCount(prev => prev + 1)
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleQrUpdated = useCallback((propertyId: string, qrData?: PropertyQrResponse | null) => {
    if (!propertyId) return
    if (qrData?.qr_code_url) {
      setProperty(prev => (prev && prev.id === propertyId) ? { ...prev, qr_code_url: qrData.qr_code_url } : prev)
    } else {
      fetchPropertyData()
    }
  }, [fetchPropertyData])

  const regenerateQrManually = useCallback(async () => {
    if (!property) return
    try {
      const response = await api.manager.regenerateQR(property.id)
      const qrData = response?.data as PropertyQrResponse | undefined
      if (qrData?.qr_code_url) {
        handleQrUpdated(property.id, qrData)
        showSuccessToast('QR code updated', 'Share the refreshed code with applicants')
      } else {
        fetchPropertyData()
      }
    } catch (err) {
      console.error('Failed to regenerate QR code:', err)
      showErrorToast('QR code error', 'Could not regenerate the QR code')
    }
  }, [fetchPropertyData, handleQrUpdated, property, showErrorToast, showSuccessToast])

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

  if (!loading && !property) {
    return (
      <div className="responsive-container padding-lg flex items-center justify-center min-h-screen">
        <Card className="card-elevated card-rounded-lg max-w-md w-full">
          <CardContent className="card-padding-lg text-center spacing-sm">
            <Building2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-heading-lg text-primary mb-2">No Property Assigned</h2>
            <p className="text-body-md text-secondary mb-6">
              You are not currently assigned to a property. Please contact HR for assistance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleRetry} className="" disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button onClick={logout} variant="outline" className="" disabled={isRefreshing}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600">Welcome back, {user.first_name} {user.last_name}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {error && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                >
                  <RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
                  Retry
                </Button>
              )}
              <Button onClick={logout} variant="outline" className="min-h-[44px]">
                Logout
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="animate-slide-down p-3 sm:p-4">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <AlertDescription className="text-sm sm:text-base">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Property Information and QR Code */}
          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,4fr)_minmax(0,2fr)] gap-4 sm:gap-6">
              <SkeletonCard className="h-44" />
              <SkeletonCard className="h-44" />
            </div>
          ) : property ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,4fr)_minmax(0,2fr)] gap-4 sm:gap-6">
              <Card className="bg-white shadow-sm border border-slate-200/70 rounded-2xl lg:col-span-1">
                <CardHeader className="flex flex-col gap-2 border-b border-slate-100/80 pb-3 sm:pb-4 p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 flex-shrink-0">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <CardTitle className="text-lg sm:text-xl font-semibold text-slate-800 truncate">{property.name}</CardTitle>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Property overview and quick contact details
                  </p>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-5 pb-5 sm:pb-6 space-y-4 sm:space-y-5 p-4 sm:p-6">
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="mt-0.5 sm:mt-1 inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      </span>
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-700">Address</p>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {property.address}
                          <br />
                          {property.city}, {property.state} {property.zip_code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <span className="mt-0.5 sm:mt-1 inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                      </span>
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-700">Phone</p>
                        <p className="text-xs sm:text-sm text-slate-600">{property.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 sm:px-4 py-2 sm:py-3">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Status</p>
                      <p className="text-[10px] sm:text-xs text-slate-500">Control property visibility for applicants</p>
                    </div>
                    <Badge className={`${property.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} flex-shrink-0 text-xs`}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <QRCodeCard
                property={property}
                onRegenerate={handleQrUpdated}
                showRegenerateButton={true}
                className="bg-white shadow-sm border border-slate-200/70 rounded-2xl"
                scope="manager"
              />
            </div>
          ) : null}

          {/* Quick Stats */}
          {loading ? (
            <StatsSkeleton count={5} />
          ) : stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">Total Applications</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">Pending</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">{stats.pending_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">Approved</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">Total Employees</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.total_employees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                    <div className="space-y-0.5 sm:space-y-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">Active</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active_employees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 sm:mt-6">
          <TabsList className="w-full grid grid-cols-4 gap-1 bg-gray-50 p-1 rounded-xl">
            <TabsTrigger value="applications" className="rounded-lg flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] px-1 sm:px-3">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden text-xs">Apps</span>
              {stats && stats.pending_applications > 0 && (
                <Badge className="bg-amber-500 text-white text-[10px] sm:text-xs ml-0.5 sm:ml-1 px-1 sm:px-2">{stats.pending_applications}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-lg flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] px-1 sm:px-3">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Employees</span>
              <span className="sm:hidden text-xs">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] px-1 sm:px-3">
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden text-xs">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg flex items-center justify-center gap-1 sm:gap-2 min-h-[44px] px-1 sm:px-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden text-xs">Prefs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <ApplicationsTab
              userRole="manager"
              propertyId={property?.id}
              propertyName={property?.name}
            />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeesTab userRole="manager" propertyId={property?.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab userRole="manager" propertyId={property?.id} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4 sm:space-y-6">
              <Card className="card-elevated card-rounded-md">
                <CardHeader className="card-padding-md border-b border-muted p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Lock className="h-4 w-4 flex-shrink-0" />
                    Account security
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Keep your login credentials up to date.</CardDescription>
                </CardHeader>
                <CardContent className="card-padding-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm sm:text-base">Password</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">Update your password regularly to protect access.</p>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordModal(true)} className="min-h-[44px] w-full sm:w-auto">
                    Change Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-elevated card-rounded-md">
                <CardHeader className="card-padding-md border-b border-muted p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Application notifications</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Control who receives emails for new submissions and status changes.</CardDescription>
                </CardHeader>
                <CardContent className="card-padding-md p-4 sm:p-6">
                  <ManagerNotificationSettings />
                </CardContent>
              </Card>

              {property && (
                <Card className="card-elevated card-rounded-md">
                  <CardHeader className="card-padding-md border-b border-muted p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Property tools</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Quick actions for {property.name}.</CardDescription>
                  </CardHeader>
                  <CardContent className="card-padding-md space-y-3 sm:space-y-4 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm sm:text-base">QR code</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">Regenerate the application QR code after printing new materials.</p>
                      </div>
                      <Button variant="outline" onClick={regenerateQrManually} className="min-h-[44px] w-full sm:w-auto flex-shrink-0">
                        <RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">Regenerate QR code</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm sm:text-base">Data exports</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">Download spreadsheets of current applications and staff.</p>
                      </div>
                      <Button variant="outline" disabled className="min-h-[44px] w-full sm:w-auto flex-shrink-0">
                        <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">Coming soon</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <PasswordResetModal
          open={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
    </div>
    </ErrorBoundary>
  )
}
