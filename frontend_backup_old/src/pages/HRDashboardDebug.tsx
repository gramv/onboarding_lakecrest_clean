import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import axios from 'axios'

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
}

export default function HRDashboardDebug() {
  const { user, logout } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingApplications: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    console.log('🔍 [DEBUG] Starting fetchDashboardStats...')
    
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      console.log('🔍 [DEBUG] Token exists:', !!token)
      console.log('🔍 [DEBUG] Token preview:', token ? token.substring(0, 20) + '...' : 'None')
      
      const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
      }
      
      console.log('🔍 [DEBUG] Making API request to /hr/dashboard-stats...')
      const response = await axios.get('/api/hr/dashboard-stats', axiosConfig)
      
      console.log('🔍 [DEBUG] API Response status:', response.status)
      console.log('🔍 [DEBUG] API Response headers:', response.headers)
      console.log('🔍 [DEBUG] API Response data:', response.data)
      
      // Handle the standardized API response format
      const statsData = response.data.data || response.data
      console.log('🔍 [DEBUG] Extracted stats data:', statsData)
      
      // Set debug info
      setDebugInfo({
        rawResponse: response.data,
        extractedData: statsData,
        timestamp: new Date().toISOString()
      })
      
      console.log('🔍 [DEBUG] Setting stats state:', statsData)
      setStats(statsData)
      
      console.log('🔍 [DEBUG] Stats state should be updated now')
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error in fetchDashboardStats:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      setDebugInfo({
        error: error,
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
      console.log('🔍 [DEBUG] fetchDashboardStats completed')
    }
  }

  if (user?.role !== 'hr') {
    return <div>Access Denied - HR role required</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">HR Dashboard (DEBUG VERSION)</h1>
        <p>Welcome, {user?.email}</p>
        <Button onClick={logout} className="mt-2">Logout</Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Loading...' : stats.totalProperties}
            </div>
            <div className="text-sm text-gray-500">
              Raw value: {JSON.stringify(stats.totalProperties)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Loading...' : stats.totalManagers}
            </div>
            <div className="text-sm text-gray-500">
              Raw value: {JSON.stringify(stats.totalManagers)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Loading...' : stats.totalEmployees}
            </div>
            <div className="text-sm text-gray-500">
              Raw value: {JSON.stringify(stats.totalEmployees)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? 'Loading...' : stats.pendingApplications}
            </div>
            <div className="text-sm text-gray-500">
              Raw value: {JSON.stringify(stats.pendingApplications)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Loading State:</strong> {loading ? 'true' : 'false'}
            </div>
            <div>
              <strong>Error State:</strong> {error || 'None'}
            </div>
            <div>
              <strong>Stats State:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                {JSON.stringify(stats, null, 2)}
              </pre>
            </div>
            {debugInfo && (
              <div>
                <strong>Debug Info:</strong>
                <pre className="bg-gray-100 p-2 rounded mt-1 text-sm max-h-64 overflow-y-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <Button onClick={fetchDashboardStats} className="mt-4">
            Refresh Stats
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}