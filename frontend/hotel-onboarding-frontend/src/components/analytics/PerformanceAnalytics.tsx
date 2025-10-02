import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ScatterChart, Scatter
} from 'recharts'
import { 
  Award, TrendingUp, Clock, Target, Users, 
  Building, Calendar, AlertCircle, ChevronDown
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'

interface ManagerPerformance {
  manager_id: string
  manager_name: string
  metrics: {
    applications_reviewed: number
    applications_approved: number
    approval_rate: number
    avg_review_time_hours: number
    onboarding_completion_rate: number
    employee_retention_rate: number
    compliance_score: number
  }
  trends: Array<{
    date: string
    reviewed: number
    approved: number
    avg_time: number
  }>
  ranking: number
  improvement_areas: string[]
}

interface PropertyPerformance {
  property_id: string
  property_name: string
  metrics: {
    total_employees: number
    open_positions: number
    time_to_fill_avg: number
    turnover_rate: number
    satisfaction_score: number
    compliance_rate: number
  }
  comparison: {
    vs_company_avg: number
    vs_last_period: number
    ranking: number
  }
  departments: Array<{
    name: string
    performance_score: number
    headcount: number
    efficiency: number
  }>
}

interface PerformanceComparison {
  entity: string
  current_period: number
  previous_period: number
  change: number
  target: number
  status: 'above' | 'meets' | 'below'
}

// Performance score card component
const PerformanceCard: React.FC<{
  title: string
  score: number
  maxScore?: number
  trend?: number
  status?: 'excellent' | 'good' | 'average' | 'poor'
}> = ({ title, score, maxScore = 100, trend, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'average': return 'bg-yellow-500'
      case 'poor': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const percentage = (score / maxScore) * 100

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="text-3xl font-bold text-gray-900 mb-2">
        {score.toFixed(1)}
        <span className="text-lg text-gray-500 ml-1">/ {maxScore}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {status && (
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
          status === 'excellent' ? 'bg-green-100 text-green-800' :
          status === 'good' ? 'bg-blue-100 text-blue-800' :
          status === 'average' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )}
    </div>
  )
}

export default function PerformanceAnalytics() {
  const { user } = useAuth()
  const [selectedView, setSelectedView] = useState<'manager' | 'property' | 'comparison'>('manager')
  const [selectedManager, setSelectedManager] = useState<string>('all')
  const [selectedProperty, setSelectedProperty] = useState<string>('all')
  const [timeRange, setTimeRange] = useState<'30days' | '90days' | '1year'>('30days')
  const [loading, setLoading] = useState(true)
  const [managerData, setManagerData] = useState<ManagerPerformance[]>([])
  const [propertyData, setPropertyData] = useState<PropertyPerformance[]>([])
  const [comparisonData, setComparisonData] = useState<PerformanceComparison[]>([])

  // Fetch performance data
  const fetchPerformanceData = async () => {
    setLoading(true)
    try {
      const [managersRes, propertiesRes] = await Promise.all([
        axios.get('/api/analytics/manager-performance', {
          params: { time_range: timeRange },
          headers: { Authorization: `Bearer ${user?.token}` }
        }),
        axios.get('/api/analytics/property-performance', {
          params: { time_range: timeRange },
          headers: { Authorization: `Bearer ${user?.token}` }
        })
      ])

      setManagerData(managersRes.data)
      setPropertyData(propertiesRes.data)
      
      // Generate comparison data
      const comparisons: PerformanceComparison[] = managersRes.data.map((mgr: ManagerPerformance) => ({
        entity: mgr.manager_name,
        current_period: mgr.metrics.approval_rate,
        previous_period: mgr.metrics.approval_rate - (mgr.trends[0]?.approved || 0),
        change: ((mgr.metrics.approval_rate - (mgr.metrics.approval_rate - (mgr.trends[0]?.approved || 0))) / (mgr.metrics.approval_rate - (mgr.trends[0]?.approved || 0))) * 100,
        target: 85,
        status: mgr.metrics.approval_rate >= 85 ? 'above' : mgr.metrics.approval_rate >= 75 ? 'meets' : 'below'
      }))
      setComparisonData(comparisons)
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [timeRange])

  // Mock data for demonstration (replace with actual data from API)
  const mockManagerData: ManagerPerformance = {
    manager_id: 'mgr_001',
    manager_name: 'John Smith',
    metrics: {
      applications_reviewed: 45,
      applications_approved: 38,
      approval_rate: 84.4,
      avg_review_time_hours: 4.2,
      onboarding_completion_rate: 92,
      employee_retention_rate: 88,
      compliance_score: 95
    },
    trends: [
      { date: '2025-01', reviewed: 12, approved: 10, avg_time: 4.5 },
      { date: '2025-02', reviewed: 15, approved: 13, avg_time: 4.0 },
      { date: '2025-03', reviewed: 18, approved: 15, avg_time: 4.2 }
    ],
    ranking: 2,
    improvement_areas: ['Review time optimization', 'Approval rate improvement']
  }

  const mockPropertyData: PropertyPerformance = {
    property_id: 'prop_001',
    property_name: 'Downtown Hotel',
    metrics: {
      total_employees: 125,
      open_positions: 8,
      time_to_fill_avg: 18,
      turnover_rate: 12,
      satisfaction_score: 4.2,
      compliance_rate: 96
    },
    comparison: {
      vs_company_avg: 5,
      vs_last_period: -3,
      ranking: 3
    },
    departments: [
      { name: 'Front Desk', performance_score: 88, headcount: 25, efficiency: 92 },
      { name: 'Housekeeping', performance_score: 85, headcount: 40, efficiency: 88 },
      { name: 'Food Service', performance_score: 90, headcount: 35, efficiency: 94 },
      { name: 'Maintenance', performance_score: 82, headcount: 15, efficiency: 86 }
    ]
  }

  const radarData = [
    { metric: 'Review Speed', value: 85, fullMark: 100 },
    { metric: 'Approval Rate', value: mockManagerData.metrics.approval_rate, fullMark: 100 },
    { metric: 'Compliance', value: mockManagerData.metrics.compliance_score, fullMark: 100 },
    { metric: 'Retention', value: mockManagerData.metrics.employee_retention_rate, fullMark: 100 },
    { metric: 'Completion', value: mockManagerData.metrics.onboarding_completion_rate, fullMark: 100 }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-gray-600 mt-1">Track and analyze manager and property performance</p>
        </div>
        
        <div className="flex gap-2">
          {/* View selector */}
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="manager">Manager Performance</option>
            <option value="property">Property Performance</option>
            <option value="comparison">Comparison View</option>
          </select>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Manager Performance View */}
      {selectedView === 'manager' && (
        <div className="space-y-6">
          {/* Performance Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PerformanceCard
              title="Approval Rate"
              score={mockManagerData.metrics.approval_rate}
              trend={5}
              status="good"
            />
            <PerformanceCard
              title="Review Speed"
              score={85}
              trend={-2}
              status="good"
            />
            <PerformanceCard
              title="Compliance Score"
              score={mockManagerData.metrics.compliance_score}
              trend={3}
              status="excellent"
            />
            <PerformanceCard
              title="Retention Rate"
              score={mockManagerData.metrics.employee_retention_rate}
              trend={1}
              status="good"
            />
          </div>

          {/* Performance Radar Chart */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Performance Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                <h3 className="font-medium text-gray-700">Key Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Applications Reviewed</span>
                    <span className="font-medium">{mockManagerData.metrics.applications_reviewed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Review Time</span>
                    <span className="font-medium">{mockManagerData.metrics.avg_review_time_hours} hrs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Onboarding Completion</span>
                    <span className="font-medium">{mockManagerData.metrics.onboarding_completion_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overall Ranking</span>
                    <span className="font-medium">#{mockManagerData.ranking}</span>
                  </div>
                </div>
                
                {mockManagerData.improvement_areas.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Improvement Areas</h4>
                    <ul className="space-y-1">
                      {mockManagerData.improvement_areas.map((area, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start">
                          <AlertCircle className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Performance Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockManagerData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reviewed" stroke="#3B82F6" name="Reviewed" />
                <Line type="monotone" dataKey="approved" stroke="#10B981" name="Approved" />
                <Line type="monotone" dataKey="avg_time" stroke="#F59E0B" name="Avg Time (hrs)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Property Performance View */}
      {selectedView === 'property' && (
        <div className="space-y-6">
          {/* Property Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <Building className="w-8 h-8 text-blue-600" />
                <span className={`text-sm font-medium ${
                  mockPropertyData.comparison.vs_company_avg > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {mockPropertyData.comparison.vs_company_avg > 0 ? '+' : ''}
                  {mockPropertyData.comparison.vs_company_avg}% vs avg
                </span>
              </div>
              <h3 className="text-2xl font-bold">{mockPropertyData.property_name}</h3>
              <p className="text-sm text-gray-600 mt-1">Ranking #{mockPropertyData.comparison.ranking}</p>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Staffing Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Employees</span>
                  <span className="font-medium">{mockPropertyData.metrics.total_employees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Open Positions</span>
                  <span className="font-medium text-amber-600">{mockPropertyData.metrics.open_positions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Time to Fill</span>
                  <span className="font-medium">{mockPropertyData.metrics.time_to_fill_avg} days</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Performance Metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Turnover Rate</span>
                  <span className="font-medium">{mockPropertyData.metrics.turnover_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Satisfaction</span>
                  <span className="font-medium">{mockPropertyData.metrics.satisfaction_score}/5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Compliance</span>
                  <span className="font-medium text-green-600">{mockPropertyData.metrics.compliance_rate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Department Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockPropertyData.departments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="performance_score" fill="#3B82F6" name="Performance Score" />
                <Bar dataKey="efficiency" fill="#10B981" name="Efficiency" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {selectedView === 'comparison' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Performance Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Previous
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comparisonData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.entity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.current_period.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.previous_period.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`flex items-center ${
                        item.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className={`w-4 h-4 mr-1 ${item.change < 0 ? 'rotate-180' : ''}`} />
                        {Math.abs(item.change).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.target}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'above' ? 'bg-green-100 text-green-800' :
                        item.status === 'meets' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status === 'above' ? 'Above Target' :
                         item.status === 'meets' ? 'Meets Target' :
                         'Below Target'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}