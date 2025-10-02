import { useState, useEffect, useCallback } from 'react'
import { SyncStatus } from '@/components/ui/sync-indicator'

interface UseSyncStatusOptions {
  onlineCheckUrl?: string
  onlineCheckInterval?: number
}

export function useSyncStatus(options: UseSyncStatusOptions = {}) {
  const {
    onlineCheckUrl = '/api/healthz',
    onlineCheckInterval = 30000 // 30 seconds
  } = options

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>()
  const [syncError, setSyncError] = useState<string | undefined>()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (syncStatus === 'offline') {
        setSyncStatus('synced')
        setSyncError(undefined)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncStatus])

  // Periodic online check
  useEffect(() => {
    if (!isOnline) return

    const checkOnline = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(onlineCheckUrl, {
          method: 'GET',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`)
        }
        
        setIsOnline(true)
        if (syncStatus === 'offline') {
          setSyncStatus('synced')
          setSyncError(undefined)
        }
      } catch (error) {
        console.warn('Online check failed:', error)
        // Don't immediately mark as offline - could be temporary
      }
    }

    checkOnline() // Initial check
    const interval = setInterval(checkOnline, onlineCheckInterval)

    return () => clearInterval(interval)
  }, [onlineCheckUrl, onlineCheckInterval, isOnline, syncStatus])

  const startSync = useCallback(() => {
    if (!isOnline) {
      setSyncStatus('offline')
      return
    }
    setSyncStatus('syncing')
    setSyncError(undefined)
  }, [isOnline])

  const syncSuccess = useCallback(() => {
    setSyncStatus('synced')
    setLastSyncTime(new Date())
    setSyncError(undefined)
  }, [])

  const reportSyncError = useCallback((error: string) => {
    setSyncStatus('error')
    setSyncError(error)
  }, [])

  const syncOffline = useCallback(() => {
    setSyncStatus('offline')
    setSyncError(undefined)
  }, [])

  return {
    syncStatus,
    lastSyncTime,
    syncError,
    isOnline,
    startSync,
    syncSuccess,
    reportSyncError,
    syncOffline
  }
}