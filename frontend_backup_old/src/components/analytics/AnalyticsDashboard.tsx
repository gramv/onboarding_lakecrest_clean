import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, FileText, CheckCircle, 
  AlertCircle, Clock, DollarSign, Building, Calendar,
  Download, Filter, RefreshCw, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'

// Types for analytics data
interface DashboardMetrics {
  overview: {
    total_applications: number
    active_applications: number
    pending_onboarding: number
    completed_this_month: number
    completion_rate: number
    average_time_to_hire: number
    total_properties: number
    total_employees: number
  }
  applications: {
    by_status: Array<{ status: string; count: number }>
    by_property: Array<{ property: string; count: number }>
    funnel: {
      submitted: number
      screening: number
      interview: number
      offer: number
      onboarding: number
      completed: number
    }
  }
  trends: {
    daily: Array<{ date: string; applications: number; completions: number }>
    weekly: Array<{ week: string; applications: number; completions: number }>
    monthly: Array<{ month: string; applications: number; completions: number }>
  }
  performance: {
    by_manager: Array<{ 
      manager: string
      reviewed: number
      approved: number
      approval_rate: number
      avg_review_time: number
    }>
    by_department: Array<{
      department: string
      positions_filled: number
      time_to_fill: number
      retention_rate: number
    }>
  }
  compliance: {
    i9_compliance: number
    w4_compliance: number
    document_completion: number
    expiring_documents: number
    overdue_tasks: number
  }
}

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

// Metric card component
const MetricCard: React.FC<{
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: string
}> = ({ title, value, change, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  }

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2 text-sm">
              {change > 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              <span>{Math.abs(change)}% from last period</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-white bg-opacity-50">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      const response = await axios.get('/api/analytics/dashboard', {
        params: {
          time_range: timeRange,
          property_id: selectedProperty === 'all' ? null : selectedProperty
        },
        headers: {
          Authorization: `Bearer ${user?.token}`
        }
      })
      setMetrics(response.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, selectedProperty])

  // Export data handler
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const response = await axios.post(
        '/api/analytics/export',
        {
          report_type: 'dashboard_summary',
          format,
          parameters: {
            time_range: timeRange,
            property_id: selectedProperty === 'all' ? null : selectedProperty
          }
        },
        {
          headers: {
            Authorization: `Bearer ${user?.token}`
          },
          responseType: format === 'csv' ? 'text' : 'blob'
        }
      )

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : format === 'excel' ? 'application/vnd.ms-excel' : 'application/pdf'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive HR metrics and insights</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Time range selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {/* Export dropdown */}
          <div className="relative group">
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="block w-full text-left px-4 py-2 hover:bg-gray-50"
              >
                Export as PDF
              </button>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Applications"
          value={metrics.overview.total_applications}
          change={12}
          icon={<FileText className="w-6 h-6" />}
          color="blue"
        />
        <MetricCard
          title="Active Applications"
          value={metrics.overview.active_applications}
          change={-5}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
        />
        <MetricCard
          title="Completion Rate"
          value={`${metrics.overview.completion_rate}%`}
          change={8}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <MetricCard
          title="Avg. Time to Hire"
          value={`${metrics.overview.average_time_to_hire} days`}
          change={-3}
          icon={<Calendar className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Application funnel chart */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Application Funnel</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={Object.entries(metrics.applications.funnel).map(([stage, count]) => ({
              stage: stage.charAt(0).toUpperCase() + stage.slice(1),
              count
            }))}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6">
              {Object.entries(metrics.applications.funnel).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trends chart */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Application Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={metrics.trends.daily}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="applications" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Applications"
            />
            <Line 
              type="monotone" 
              dataKey="completions" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Completions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications by status pie chart */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Applications by Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.applications.by_status}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {metrics.applications.by_status.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance metrics */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Compliance Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">I-9 Compliance</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.compliance.i9_compliance}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.compliance.i9_compliance}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">W-4 Compliance</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${metrics.compliance.w4_compliance}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.compliance.w4_compliance}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Document Completion</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${metrics.compliance.document_completion}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{metrics.compliance.document_completion}%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">⚠️ Expiring Documents</span>
                <span className="font-medium">{metrics.compliance.expiring_documents}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-red-600">⏰ Overdue Tasks</span>
                <span className="font-medium">{metrics.compliance.overdue_tasks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager performance table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Manager Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applications Reviewed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Review Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.performance.by_manager.map((manager, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {manager.manager}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {manager.reviewed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {manager.approved}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      manager.approval_rate >= 80 ? 'bg-green-100 text-green-800' :
                      manager.approval_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {manager.approval_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {manager.avg_review_time} hours
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}