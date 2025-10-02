import { useState, useEffect, useCallback, useRef } from 'react'
import { SaveStatus } from '@/components/onboarding/AutoSaveIndicator'

interface UseAutoSaveOptions {
  onSave: (data: any) => Promise<void>
  delay?: number // milliseconds
  enabled?: boolean
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus
  lastSaved: Date | null
  saveError: string | null
  triggerSave: () => void
}

/**
 * Hook for handling auto-save functionality with debouncing
 */
export const useAutoSave = (
  data: any,
  options: UseAutoSaveOptions
): UseAutoSaveReturn => {
  const { onSave, delay = 2000, enabled = true } = options
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const lastDataRef = useRef<string>('')

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const performSave = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return

    try {
      setSaveStatus('saving')
      setSaveError(null)
      
      await onSave(data)
      
      if (isMountedRef.current) {
        setSaveStatus('saved')
        setLastSaved(new Date())
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          if (isMountedRef.current && saveStatus === 'saved') {
            setSaveStatus('idle')
          }
        }, 3000)
      }
    } catch (error) {
      if (isMountedRef.current) {
        setSaveStatus('error')
        setSaveError(error instanceof Error ? error.message : 'Failed to save')
        
        // Reset to idle after 5 seconds for errors
        setTimeout(() => {
          if (isMountedRef.current && saveStatus === 'error') {
            setSaveStatus('idle')
          }
        }, 5000)
      }
    }
  }, [data, enabled, onSave, saveStatus])

  // Trigger save manually
  const triggerSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    performSave()
  }, [performSave])

  // Auto-save on data change with debouncing
  useEffect(() => {
    if (!enabled) return

    const dataString = JSON.stringify(data)
    
    // Skip if data hasn't changed
    if (dataString === lastDataRef.current) {
      return
    }
    
    lastDataRef.current = dataString

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      performSave()
    }, delay)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, performSave])

  return {
    saveStatus,
    lastSaved,
    saveError,
    triggerSave
  }
}

export default useAutoSave