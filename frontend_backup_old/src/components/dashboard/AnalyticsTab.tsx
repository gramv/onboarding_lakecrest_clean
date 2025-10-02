import React, { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building, 
  FileText, 
  Download,
  Calendar,
  PieChart,
  Activity
} from 'lucide-react'
import axios from 'axios'

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
}

interface AnalyticsOverview {
  overview: {
    totalProperties: number
    totalManagers: number
    totalEmployees: number
    totalApplications: number
    pendingApplications: number
    approvedApplications: number
    rejectedApplications: number
  }
  recentActivity: {
    newApplications: number
    newEmployees: number
  }
  departmentStats: Record<string, {
    total: number
    pending: number
    approved: number
    rejected: number
  }>
  applicationTrends: {
    pending: number
    approved: number
    rejected: number
  }
}

interface PropertyPerformance {
  propertyPerformance: Array<{
    propertyId: string
    propertyName: string
    city: string
    state: string
    managersCount: number
    employeesCount: number
    totalApplications: number
    pendingApplications: number
    approvedApplications: number
    rejectedApplications: number
    recentApplications: number
    approvalRate: number
  }>
}

interface EmployeeTrends {
  monthlyTrends: Array<{
    month: string
    newEmployees: number
    applications: number
  }>
  departmentDistribution: Record<string, number>
  propertyDistribution: Record<string, number>
  totalEmployees: number
}

interface AnalyticsTabProps {
  userRole: 'hr' | 'manager'
  propertyId?: string
}

interface OutletContext {
  stats: any
  property?: any
  onStatsUpdate: () => void
  userRole: 'hr' | 'manager'
  propertyId?: string
}

export function AnalyticsTab({ userRole: propUserRole, propertyId: propPropertyId }: AnalyticsTabProps) {
  const outletContext = useOutletContext<OutletContext>()
  const userRole = propUserRole || outletContext?.userRole || 'hr'
  const propertyId = propPropertyId || outletContext?.propertyId
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null)
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance | null>(null)
  const [employeeTrends, setEmployeeTrends] = useState<EmployeeTrends | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const baseUrl = '/api'
      
      if (userRole === 'hr') {
        const [overviewRes, propertyRes, employeeRes] = await Promise.all([
          axios.get(`${baseUrl}/hr/analytics/overview`),
          axios.get(`${baseUrl}/hr/analytics/property-performance`),
          axios.get(`${baseUrl}/hr/analytics/employee-trends`)
        ])
        
        // Handle wrapped response format
        const overviewData = overviewRes.data.data || overviewRes.data
        const propertyData = propertyRes.data.data || propertyRes.data
        const employeeData = employeeRes.data.data || employeeRes.data
        
        setAnalyticsOverview(overviewData)
        setPropertyPerformance(propertyData)
        setEmployeeTrends(employeeData)
      } else {
        // Manager-specific analytics
        const [overviewRes, employeeRes] = await Promise.all([
          axios.get(`${baseUrl}/manager/analytics/overview`),
          axios.get(`${baseUrl}/manager/analytics/employee-trends`)
        ])
        
        // Handle wrapped response format
        const overviewData = overviewRes.data.data || overviewRes.data
        const employeeData = employeeRes.data.data || employeeRes.data
        
        setAnalyticsOverview(overviewData)
        setEmployeeTrends(employeeData)
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setExporting(true)
      const endpoint = userRole === 'hr' 
        ? '/api/hr/analytics/export?format=json'
        : '/api/manager/analytics/export?format=json'
      const response = await axios.get(endpoint)
      
      // Create and download JSON file
      const dataStr = JSON.stringify(response.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export data:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">
            {userRole === 'hr' 
              ? 'System metrics and performance insights'
              : 'Property metrics and performance insights'}
          </p>
        </div>
        <Button onClick={handleExportData} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export Data'}
        </Button>
      </div>

      {/* System Overview Cards */}
      {analyticsOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Applications</p>
                  <p className="text-2xl font-bold">{analyticsOverview.overview.totalApplications}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  +{analyticsOverview.recentActivity.newApplications} this month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {userRole === 'hr' ? 'Active Properties' : 'Pending Applications'}
                  </p>
                  <p className="text-2xl font-bold">
                    {userRole === 'hr' 
                      ? analyticsOverview.overview.totalProperties 
                      : analyticsOverview.overview.pendingApplications}
                  </p>
                </div>
                {userRole === 'hr' ? (
                  <Building className="h-8 w-8 text-green-500" />
                ) : (
                  <FileText className="h-8 w-8 text-yellow-500" />
                )}
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {userRole === 'hr' 
                    ? `${analyticsOverview.overview.totalManagers} managers`
                    : 'Awaiting review'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{analyticsOverview.overview.totalEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  +{analyticsOverview.recentActivity.newEmployees} this month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                  <p className="text-2xl font-bold">
                    {analyticsOverview.overview.totalApplications > 0 
                      ? Math.round((analyticsOverview.overview.approvedApplications / analyticsOverview.overview.totalApplications) * 100)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {analyticsOverview.overview.approvedApplications} approved
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className={`grid w-full ${userRole === 'hr' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="applications">Application Trends</TabsTrigger>
          {userRole === 'hr' && <TabsTrigger value="properties">Property Performance</TabsTrigger>}
          <TabsTrigger value="employees">Employee Analytics</TabsTrigger>
        </TabsList>

        {/* Application Trends Tab */}
        <TabsContent value="applications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Application Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Application Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsOverview && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(analyticsOverview.applicationTrends.pending / analyticsOverview.overview.totalApplications) * 100} 
                          className="w-24" 
                        />
                        <span className="text-sm font-medium">{analyticsOverview.applicationTrends.pending}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Approved</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(analyticsOverview.applicationTrends.approved / analyticsOverview.overview.totalApplications) * 100} 
                          className="w-24" 
                        />
                        <span className="text-sm font-medium">{analyticsOverview.applicationTrends.approved}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Rejected</span>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(analyticsOverview.applicationTrends.rejected / analyticsOverview.overview.totalApplications) * 100} 
                          className="w-24" 
                        />
                        <span className="text-sm font-medium">{analyticsOverview.applicationTrends.rejected}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Department Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsOverview && (
                  <div className="space-y-3">
                    {Object.entries(analyticsOverview.departmentStats).map(([dept, stats]) => (
                      <div key={dept} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{dept}</span>
                          <Badge variant="outline">{stats.total} total</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className="text-yellow-600 font-medium">{stats.pending}</div>
                            <div className="text-gray-500">Pending</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-600 font-medium">{stats.approved}</div>
                            <div className="text-gray-500">Approved</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-600 font-medium">{stats.rejected}</div>
                            <div className="text-gray-500">Rejected</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Property Performance Tab - HR Only */}
        {userRole === 'hr' && (
          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Property Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {propertyPerformance && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Property</th>
                          <th className="text-left p-2">Location</th>
                          <th className="text-center p-2">Managers</th>
                          <th className="text-center p-2">Employees</th>
                          <th className="text-center p-2">Applications</th>
                          <th className="text-center p-2">Approval Rate</th>
                          <th className="text-center p-2">Recent Activity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propertyPerformance.propertyPerformance.map((property) => (
                          <tr key={property.propertyId} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{property.propertyName}</td>
                            <td className="p-2 text-gray-600">{property.city}, {property.state}</td>
                            <td className="p-2 text-center">{property.managersCount}</td>
                            <td className="p-2 text-center">{property.employeesCount}</td>
                            <td className="p-2 text-center">
                              <div className="space-y-1">
                                <div>{property.totalApplications}</div>
                                <div className="text-xs text-gray-500">
                                  {property.pendingApplications}P / {property.approvedApplications}A / {property.rejectedApplications}R
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <Badge 
                                variant={property.approvalRate >= 70 ? "default" : property.approvalRate >= 50 ? "secondary" : "destructive"}
                              >
                                {property.approvalRate}%
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline">
                                {property.recentApplications} this week
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Employee Analytics Tab */}
        <TabsContent value="employees">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Monthly Hiring Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {employeeTrends && (
                  <div className="space-y-3">
                    {employeeTrends.monthlyTrends.map((trend) => (
                      <div key={trend.month} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-medium">{trend.month}</span>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-green-600">{trend.newEmployees} hired</span>
                          <span className="text-blue-600">{trend.applications} applied</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department & Property Distribution */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeTrends && (
                    <div className="space-y-2">
                      {Object.entries(employeeTrends.departmentDistribution).map(([dept, count]) => (
                        <div key={dept} className="flex justify-between items-center">
                          <span className="text-sm">{dept}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Property Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeTrends && (
                    <div className="space-y-2">
                      {Object.entries(employeeTrends.propertyDistribution).map(([property, count]) => (
                        <div key={property} className="flex justify-between items-center">
                          <span className="text-sm">{property}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}