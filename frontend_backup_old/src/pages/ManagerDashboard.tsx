import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { StatsSkeleton, SkeletonCard } from '@/components/ui/skeleton-loader'
import { useToast } from '@/hooks/use-toast'
import { Building2, Users, FileText, BarChart3, MapPin, Phone, AlertTriangle, RefreshCw } from 'lucide-react'
import { ApplicationsTab } from '@/components/dashboard/ApplicationsTab'
import { EmployeesTab } from '@/components/dashboard/EmployeesTab'
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab'
import { QRCodeCard } from '@/components/ui/qr-code-display'
import axios from 'axios'

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

export default function ManagerDashboard() {
  const { user, logout } = useAuth()
  const { error: showErrorToast, success: showSuccessToast } = useToast()
  const [property, setProperty] = useState<Property | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (user?.property_id) {
      fetchData()
    }
  }, [user, retryCount])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([fetchPropertyData(), fetchDashboardStats()])
      if (retryCount > 0) {
        showSuccessToast('Dashboard refreshed', 'Data has been updated successfully')
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.detail || error.message 
        : 'Failed to load dashboard data'
      setError(errorMessage)
      showErrorToast('Failed to load dashboard', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchPropertyData = async () => {
    const response = await axios.get('/api/hr/properties')
    const properties = response.data
    const userProperty = properties.find((p: Property) => p.id === user?.property_id)
    setProperty(userProperty || null)
  }

  const fetchDashboardStats = async () => {
    // Fetch applications for stats
    const appsResponse = await axios.get('/api/hr/applications')
    const applications = appsResponse.data
    
    // Fetch employees for stats
    const empResponse = await axios.get('/api/api/employees')
    const employees = empResponse.data

    // Calculate stats
    const totalApplications = applications.length
    const pendingApplications = applications.filter((app: any) => app.status === 'pending').length
    const approvedApplications = applications.filter((app: any) => app.status === 'approved').length
    const totalEmployees = employees.length
    const activeEmployees = employees.filter((emp: any) => emp.employment_status === 'active').length

    setStats({
      total_applications: totalApplications,
      pending_applications: pendingApplications,
      approved_applications: approvedApplications,
      total_employees: totalEmployees,
      active_employees: activeEmployees
    })
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

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

  if (!user?.property_id) {
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
              <Button onClick={handleRetry} className="">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={logout} variant="outline" className="">
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
      <div className="responsive-container padding-md">
        {/* Header Section */}
        <div className="spacing-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="spacing-xs">
              <h1 className="text-display-md">Manager Dashboard</h1>
              <p className="text-body-md text-secondary">Welcome back, {user.first_name} {user.last_name}</p>
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

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="animate-slide-down">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Property Information and QR Code */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonCard className="h-32 lg:col-span-2" />
              <SkeletonCard className="h-32" />
            </div>
          ) : property ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="card-elevated card-rounded-md hover-lift lg:col-span-2">
                <CardHeader className="card-padding-md border-b border-muted">
                  <CardTitle className="text-heading-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-brand-primary" />
                    {property.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="card-padding-md">
                  <div className="responsive-grid-3 gap-md">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted mt-1 flex-shrink-0" />
                      <div className="spacing-xs">
                        <p className="text-body-sm font-medium text-primary">Address</p>
                        <p className="text-body-sm text-secondary">
                          {property.address}, {property.city}, {property.state} {property.zip_code}
                        </p>
                      </div>
                    </div>
                    {property.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-4 w-4 text-muted mt-1 flex-shrink-0" />
                        <div className="spacing-xs">
                          <p className="text-body-sm font-medium text-primary">Phone</p>
                          <p className="text-body-sm text-secondary">{property.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={property.is_active ? "badge-success" : "badge-default"}>
                        {property.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <QRCodeCard
                property={property}
                onRegenerate={fetchPropertyData}
                showRegenerateButton={true}
                className="card-elevated card-rounded-md"
              />
            </div>
          ) : null}

          {/* Quick Stats */}
          {loading ? (
            <StatsSkeleton count={5} />
          ) : stats ? (
            <div className="responsive-grid-5 gap-sm">
              <Card className="card-elevated card-rounded-md hover-lift">
                <CardContent className="card-padding-sm">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="spacing-xs min-w-0">
                      <p className="text-body-sm font-medium text-primary">Total Applications</p>
                      <p className="text-heading-md text-brand-primary">{stats.total_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated card-rounded-md hover-lift">
                <CardContent className="card-padding-sm">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="spacing-xs min-w-0">
                      <p className="text-body-sm font-medium text-primary">Pending</p>
                      <p className="text-heading-md text-amber-600">{stats.pending_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated card-rounded-md hover-lift">
                <CardContent className="card-padding-sm">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="spacing-xs min-w-0">
                      <p className="text-body-sm font-medium text-primary">Approved</p>
                      <p className="text-heading-md text-green-600">{stats.approved_applications}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated card-rounded-md hover-lift">
                <CardContent className="card-padding-sm">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="spacing-xs min-w-0">
                      <p className="text-body-sm font-medium text-primary">Total Employees</p>
                      <p className="text-heading-md text-brand-primary">{stats.total_employees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="card-elevated card-rounded-md hover-lift">
                <CardContent className="card-padding-sm">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div className="spacing-xs min-w-0">
                      <p className="text-body-sm font-medium text-primary">Active</p>
                      <p className="text-heading-md text-green-600">{stats.active_employees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="applications" className="spacing-md">
          <TabsList className="nav-tabs w-full grid grid-cols-1 sm:grid-cols-3 gap-1 bg-gray-50 p-1 rounded-xl">
            <TabsTrigger value="applications" className="nav-tab rounded-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
              <span className="sm:hidden">Apps</span>
              {stats && stats.pending_applications > 0 && (
                <Badge className="badge-warning badge-sm ml-1">{stats.pending_applications}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="employees" className="nav-tab rounded-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Employees</span>
              <span className="sm:hidden">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="nav-tab rounded-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="applications">
          <ApplicationsTab userRole="manager" propertyId={user.property_id} />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeesTab userRole="manager" propertyId={user.property_id} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab userRole="manager" propertyId={user.property_id} />
        </TabsContent>
      </Tabs>
    </div>
    </ErrorBoundary>
  )
}
