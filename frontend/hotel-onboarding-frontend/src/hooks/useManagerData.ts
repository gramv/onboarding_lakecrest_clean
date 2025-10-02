/**
 * Shared hook for manager dashboard data
 * Prevents duplicate API calls and manages shared state
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/apiService'
import { useToast } from '@/hooks/use-toast'

interface UseManagerDataReturn {
  properties: any[]
  managers: any[]
  applications: any[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshProperties: () => Promise<void>
  refreshManagers: () => Promise<void>
  refreshApplications: () => Promise<void>
}

export function useManagerData(): UseManagerDataReturn {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [properties, setProperties] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track what data has been loaded to prevent duplicate calls
  const [loadedData, setLoadedData] = useState({
    properties: false,
    managers: false,
    applications: false
  })

  const loadProperties = useCallback(async () => {
    if (loadedData.properties) return properties
    
    try {
      console.log('useManagerData: Loading properties...')
      const data = await apiService.getProperties()
      setProperties(data)
      setLoadedData(prev => ({ ...prev, properties: true }))
      console.log('useManagerData: Properties loaded:', data.length)
      return data
    } catch (error) {
      console.error('useManagerData: Failed to load properties:', error)
      throw error
    }
  }, [loadedData.properties, properties])

  const loadManagers = useCallback(async () => {
    if (loadedData.managers) return managers
    
    try {
      console.log('useManagerData: Loading managers...')
      const data = await apiService.getManagers()
      setManagers(data)
      setLoadedData(prev => ({ ...prev, managers: true }))
      console.log('useManagerData: Managers loaded:', data.length)
      return data
    } catch (error) {
      console.error('useManagerData: Failed to load managers:', error)
      throw error
    }
  }, [loadedData.managers, managers])

  const loadApplications = useCallback(async () => {
    if (!user || loadedData.applications) return applications
    
    try {
      console.log('useManagerData: Loading applications...')
      const data = await apiService.getApplications()
      setApplications(data)
      setLoadedData(prev => ({ ...prev, applications: true }))
      console.log('useManagerData: Applications loaded:', data.length)
      return data
    } catch (error) {
      console.error('useManagerData: Failed to load applications:', error)
      throw error
    }
  }, [user, loadedData.applications, applications])

  const loadAllData = useCallback(async () => {
    if (loading) return
    
    setLoading(true)
    setError(null)

    try {
      console.log('useManagerData: Loading all data...')
      
      // Load properties and managers for all users
      const promises = [loadProperties(), loadManagers()]
      
      // Only load applications for authenticated users
      if (user) {
        promises.push(loadApplications())
      }

      await Promise.all(promises)
      console.log('useManagerData: All data loaded successfully')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      console.error('useManagerData: Failed to load data:', errorMessage)
      setError(errorMessage)
      
      toast({
        title: "Error Loading Data",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [loading, loadProperties, loadManagers, loadApplications, user, toast])

  // Load data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  // Refresh functions
  const refresh = useCallback(async () => {
    console.log('useManagerData: Refreshing all data...')
    apiService.clearCache()
    setLoadedData({ properties: false, managers: false, applications: false })
    await loadAllData()
  }, [loadAllData])

  const refreshProperties = useCallback(async () => {
    try {
      console.log('useManagerData: Refreshing properties...')
      const data = await apiService.refreshProperties()
      setProperties(data)
      console.log('useManagerData: Properties refreshed:', data.length)
    } catch (error) {
      console.error('useManagerData: Failed to refresh properties:', error)
      toast({
        title: "Error",
        description: "Failed to refresh properties",
        variant: "destructive",
      })
    }
  }, [toast])

  const refreshManagers = useCallback(async () => {
    try {
      console.log('useManagerData: Refreshing managers...')
      const data = await apiService.refreshManagers()
      setManagers(data)
      console.log('useManagerData: Managers refreshed:', data.length)
    } catch (error) {
      console.error('useManagerData: Failed to refresh managers:', error)
      toast({
        title: "Error",
        description: "Failed to refresh managers",
        variant: "destructive",
      })
    }
  }, [toast])

  const refreshApplications = useCallback(async () => {
    if (!user) return
    
    try {
      console.log('useManagerData: Refreshing applications...')
      const data = await apiService.refreshApplications()
      setApplications(data)
      console.log('useManagerData: Applications refreshed:', data.length)
    } catch (error) {
      console.error('useManagerData: Failed to refresh applications:', error)
      toast({
        title: "Error",
        description: "Failed to refresh applications",
        variant: "destructive",
      })
    }
  }, [user, toast])

  return {
    properties,
    managers,
    applications,
    loading,
    error,
    refresh,
    refreshProperties,
    refreshManagers,
    refreshApplications
  }
}