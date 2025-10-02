/**
 * Dashboard Context for centralized state management
 * Single source of truth for all dashboard data with WebSocket real-time updates
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useWebSocketContext } from './WebSocketContext'
import { apiService } from '@/services/apiService'
import { useToast } from '@/hooks/use-toast'

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  manager_ids: string[]
  qr_code_url: string
  is_active: boolean
  created_at: string
}

interface Manager {
  id: string
  email: string
  first_name?: string
  last_name?: string
  property_id?: string
  property_name?: string
  is_active: boolean
  created_at: string
  properties?: Property[]
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  position: string
  property_id: string
  property_name?: string
  employment_status: string
  onboarding_status: string
  hire_date: string
  created_at: string
}

interface Application {
  id: string
  applicant_name: string
  email: string
  phone: string
  position: string
  property_id: string
  property_name?: string
  status: string
  applied_at: string
  experience_years?: number
  availability?: string
  resume_url?: string
}

interface DashboardStats {
  totalProperties: number
  totalManagers: number
  totalEmployees: number
  pendingApplications: number
  approvedApplications: number
  activeEmployees: number
  onboardingInProgress: number
}

interface DashboardContextValue {
  // Data
  properties: Property[]
  managers: Manager[]
  employees: Employee[]
  applications: Application[]
  stats: DashboardStats

  // Loading states
  loading: {
    properties: boolean
    managers: boolean
    employees: boolean
    applications: boolean
    stats: boolean
  }

  // Error states
  errors: {
    properties: string | null
    managers: string | null
    employees: string | null
    applications: string | null
    stats: string | null
  }

  // Actions
  refreshProperties: () => Promise<void>
  refreshManagers: () => Promise<void>
  refreshEmployees: () => Promise<void>
  refreshApplications: () => Promise<void>
  refreshStats: () => Promise<void>
  refreshAll: () => Promise<void>

  // Real-time connection status
  isConnected: boolean
  connectionError: string | null
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export interface DashboardProviderProps {
  children: ReactNode
  userRole: 'hr' | 'manager'
  propertyId?: string // For managers
}

export function DashboardProvider({ children, userRole, propertyId }: DashboardProviderProps) {
  const ws = useWebSocketContext()
  const { toast } = useToast()

  // Data states
  const [properties, setProperties] = useState<Property[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    activeEmployees: 0,
    onboardingInProgress: 0
  })

  // Loading states
  const [loading, setLoading] = useState({
    properties: false,
    managers: false,
    employees: false,
    applications: false,
    stats: false
  })

  // Error states
  const [errors, setErrors] = useState({
    properties: null as string | null,
    managers: null as string | null,
    employees: null as string | null,
    applications: null as string | null,
    stats: null as string | null
  })

  // Fetch properties
  const refreshProperties = useCallback(async () => {
    setLoading(prev => ({ ...prev, properties: true }))
    setErrors(prev => ({ ...prev, properties: null }))
    try {
      const data = await apiService.refreshProperties()
      setProperties(data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to fetch properties'
      setErrors(prev => ({ ...prev, properties: errorMsg }))
      console.error('Failed to fetch properties:', error)
    } finally {
      setLoading(prev => ({ ...prev, properties: false }))
    }
  }, [])

  // Fetch managers
  const refreshManagers = useCallback(async () => {
    setLoading(prev => ({ ...prev, managers: true }))
    setErrors(prev => ({ ...prev, managers: null }))
    try {
      const data = await apiService.refreshManagers()
      setManagers(data)
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to fetch managers'
      setErrors(prev => ({ ...prev, managers: errorMsg }))
      console.error('Failed to fetch managers:', error)
    } finally {
      setLoading(prev => ({ ...prev, managers: false }))
    }
  }, [])

  // Fetch employees
  const refreshEmployees = useCallback(async () => {
    setLoading(prev => ({ ...prev, employees: true }))
    setErrors(prev => ({ ...prev, employees: null }))
    try {
      const data = await apiService.refreshEmployees()
      // Filter by property for managers
      if (userRole === 'manager' && propertyId) {
        setEmployees(data.filter((emp: Employee) => emp.property_id === propertyId))
      } else {
        setEmployees(data)
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to fetch employees'
      setErrors(prev => ({ ...prev, employees: errorMsg }))
      console.error('Failed to fetch employees:', error)
    } finally {
      setLoading(prev => ({ ...prev, employees: false }))
    }
  }, [userRole, propertyId])

  // Fetch applications
  const refreshApplications = useCallback(async () => {
    setLoading(prev => ({ ...prev, applications: true }))
    setErrors(prev => ({ ...prev, applications: null }))
    try {
      const data = await apiService.refreshApplications()
      // Filter by property for managers
      if (userRole === 'manager' && propertyId) {
        setApplications(data.filter((app: Application) => app.property_id === propertyId))
      } else {
        setApplications(data)
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to fetch applications'
      setErrors(prev => ({ ...prev, applications: errorMsg }))
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(prev => ({ ...prev, applications: false }))
    }
  }, [userRole, propertyId])

  // Fetch stats
  const refreshStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    setErrors(prev => ({ ...prev, stats: null }))
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://127.0.0.1:8000/hr/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      const statsData = data.data || data
      setStats({
        totalProperties: statsData.totalProperties || 0,
        totalManagers: statsData.totalManagers || 0,
        totalEmployees: statsData.totalEmployees || 0,
        pendingApplications: statsData.pendingApplications || 0,
        approvedApplications: statsData.approvedApplications || 0,
        activeEmployees: statsData.activeEmployees || 0,
        onboardingInProgress: statsData.onboardingInProgress || 0
      })
    } catch (error: any) {
      const errorMsg = 'Failed to fetch dashboard stats'
      setErrors(prev => ({ ...prev, stats: errorMsg }))
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(prev => ({ ...prev, stats: false }))
    }
  }, [])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProperties(),
      refreshManagers(),
      refreshEmployees(),
      refreshApplications(),
      refreshStats()
    ])
  }, [refreshProperties, refreshManagers, refreshEmployees, refreshApplications, refreshStats])

  // Initial data load
  useEffect(() => {
    refreshAll()
  }, [])

  // WebSocket event handlers
  useEffect(() => {
    if (!ws.isConnected) return

    // Subscribe to appropriate room
    if (userRole === 'hr') {
      ws.subscribeToRoom('global')
    } else if (userRole === 'manager' && propertyId) {
      ws.subscribeToRoom(`property-${propertyId}`)
    }

    // Property events
    const unsubProperty = ws.onMessage('property_update', (data: any) => {
      console.log('Property update received:', data)
      refreshProperties()
    })

    // Manager events
    const unsubManager = ws.onMessage('manager_update', (data: any) => {
      console.log('Manager update received:', data)
      refreshManagers()
    })

    // Employee events
    const unsubEmployee = ws.onMessage('employee_update', (data: any) => {
      console.log('Employee update received:', data)
      refreshEmployees()
    })

    // Application events
    const unsubApplicationSubmitted = ws.onMessage('application_submitted', (data: any) => {
      console.log('New application submitted:', data)
      refreshApplications()
      refreshStats()
      toast({
        title: 'New Application',
        description: `${data.applicant_name || 'Someone'} submitted an application`
      })
    })

    const unsubApplicationApproved = ws.onMessage('application_approved', (data: any) => {
      console.log('Application approved:', data)
      refreshApplications()
      refreshStats()
      toast({
        title: 'Application Approved',
        description: `Application for ${data.applicant_name || 'an applicant'} was approved`,
        variant: 'default'
      })
    })

    const unsubApplicationRejected = ws.onMessage('application_rejected', (data: any) => {
      console.log('Application rejected:', data)
      refreshApplications()
      refreshStats()
    })

    // Onboarding events
    const unsubOnboardingStarted = ws.onMessage('onboarding_started', (data: any) => {
      console.log('Onboarding started:', data)
      refreshEmployees()
      refreshStats()
      toast({
        title: 'Onboarding Started',
        description: 'A new employee started the onboarding process'
      })
    })

    const unsubOnboardingCompleted = ws.onMessage('onboarding_completed', (data: any) => {
      console.log('Onboarding completed:', data)
      refreshEmployees()
      refreshStats()
      toast({
        title: 'Onboarding Completed',
        description: 'An employee completed the onboarding process',
        variant: 'default'
      })
    })

    // Dashboard refresh event
    const unsubDashboardRefresh = ws.onMessage('dashboard_refresh', (data: any) => {
      console.log('Dashboard refresh requested:', data)
      refreshAll()
    })

    // Stats update event
    const unsubStatsUpdate = ws.onMessage('stats_update', (data: any) => {
      console.log('Stats update received:', data)
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }))
      } else {
        refreshStats()
      }
    })

    return () => {
      // Cleanup subscriptions
      unsubProperty()
      unsubManager()
      unsubEmployee()
      unsubApplicationSubmitted()
      unsubApplicationApproved()
      unsubApplicationRejected()
      unsubOnboardingStarted()
      unsubOnboardingCompleted()
      unsubDashboardRefresh()
      unsubStatsUpdate()
    }
  }, [ws, userRole, propertyId, refreshProperties, refreshManagers, refreshEmployees, refreshApplications, refreshStats, refreshAll, toast])

  const contextValue: DashboardContextValue = {
    // Data
    properties,
    managers,
    employees,
    applications,
    stats,

    // Loading states
    loading,

    // Error states
    errors,

    // Actions
    refreshProperties,
    refreshManagers,
    refreshEmployees,
    refreshApplications,
    refreshStats,
    refreshAll,

    // Real-time connection status
    isConnected: ws.isConnected,
    connectionError: ws.error
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}

// Convenience hooks for specific data
export function useDashboardProperties() {
  const { properties, loading, errors, refreshProperties } = useDashboard()
  return {
    properties,
    loading: loading.properties,
    error: errors.properties,
    refresh: refreshProperties
  }
}

export function useDashboardManagers() {
  const { managers, loading, errors, refreshManagers } = useDashboard()
  return {
    managers,
    loading: loading.managers,
    error: errors.managers,
    refresh: refreshManagers
  }
}

export function useDashboardEmployees() {
  const { employees, loading, errors, refreshEmployees } = useDashboard()
  return {
    employees,
    loading: loading.employees,
    error: errors.employees,
    refresh: refreshEmployees
  }
}

export function useDashboardApplications() {
  const { applications, loading, errors, refreshApplications } = useDashboard()
  return {
    applications,
    loading: loading.applications,
    error: errors.applications,
    refresh: refreshApplications
  }
}

export function useDashboardStats() {
  const { stats, loading, errors, refreshStats } = useDashboard()
  return {
    stats,
    loading: loading.stats,
    error: errors.stats,
    refresh: refreshStats
  }
}