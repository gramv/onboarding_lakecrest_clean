/**
 * Settings Service
 * Service for managing user settings with cloud synchronization and device sync
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

// ===== TYPES =====

export interface UserSettings {
  // Profile settings
  profile: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    avatar?: string
    bio?: string
    department?: string
    title?: string
  }
  
  // Theme settings
  theme: {
    mode: 'light' | 'dark' | 'auto'
    primaryColor: string
    fontSize: 'small' | 'medium' | 'large'
    reducedMotion: boolean
    highContrast: boolean
    customColors?: Record<string, string>
  }
  
  // Dashboard settings
  dashboard: {
    layout: 'compact' | 'comfortable' | 'spacious'
    sidebarCollapsed: boolean
    showWelcomeMessage: boolean
    defaultView: string
    refreshInterval: number
    showTooltips: boolean
    widgetOrder: string[]
    pinnedItems: string[]
  }
  
  // Notification settings
  notifications: {
    enabled: boolean
    categories: Record<string, boolean>
    delivery: {
      browser: boolean
      email: boolean
      sms: boolean
    }
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
    sound: boolean
    vibration: boolean
  }
  
  // Privacy settings
  privacy: {
    shareUsageData: boolean
    allowCookies: boolean
    twoFactorAuth: boolean
    sessionTimeout: number
    dataRetention: number
  }
  
  // Accessibility settings
  accessibility: {
    screenReader: boolean
    keyboardNavigation: boolean
    focusIndicators: boolean
    colorBlindSupport: boolean
    textToSpeech: boolean
  }
  
  // Localization settings
  localization: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
    currency: string
    numberFormat: string
  }
}

interface SettingsState {
  settings: UserSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null
  lastSynced: Date | null
  hasUnsavedChanges: boolean
  syncStatus: 'idle' | 'syncing' | 'error' | 'success'
}

type SettingsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: UserSettings }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'UPDATE_SECTION'; payload: { section: keyof UserSettings; data: any } }
  | { type: 'SET_SYNC_STATUS'; payload: SettingsState['syncStatus'] }
  | { type: 'SET_LAST_SYNCED'; payload: Date }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'RESET_SETTINGS' }

interface SettingsContextValue {
  state: SettingsState
  actions: {
    updateSettings: (updates: Partial<UserSettings>) => void
    updateSection: <K extends keyof UserSettings>(section: K, data: Partial<UserSettings[K]>) => void
    saveSettings: () => Promise<void>
    resetSettings: () => void
    syncSettings: () => Promise<void>
    exportSettings: () => void
    importSettings: (settings: Partial<UserSettings>) => void
  }
}

// ===== DEFAULT SETTINGS =====

const defaultSettings: UserSettings = {
  profile: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: '',
    bio: '',
    department: '',
    title: ''
  },
  theme: {
    mode: 'auto',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false
  },
  dashboard: {
    layout: 'comfortable',
    sidebarCollapsed: false,
    showWelcomeMessage: true,
    defaultView: 'overview',
    refreshInterval: 30,
    showTooltips: true,
    widgetOrder: [],
    pinnedItems: []
  },
  notifications: {
    enabled: true,
    categories: {
      applications: true,
      employees: true,
      properties: true,
      system: true,
      reminders: true
    },
    delivery: {
      browser: true,
      email: false,
      sms: false
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    sound: true,
    vibration: true
  },
  privacy: {
    shareUsageData: false,
    allowCookies: true,
    twoFactorAuth: false,
    sessionTimeout: 480,
    dataRetention: 90
  },
  accessibility: {
    screenReader: false,
    keyboardNavigation: true,
    focusIndicators: true,
    colorBlindSupport: false,
    textToSpeech: false
  },
  localization: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    currency: 'USD',
    numberFormat: 'en-US'
  }
}

const initialState: SettingsState = {
  settings: defaultSettings,
  isLoading: false,
  isSaving: false,
  error: null,
  lastSynced: null,
  hasUnsavedChanges: false,
  syncStatus: 'idle'
}

// ===== REDUCER =====

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload }

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        hasUnsavedChanges: false,
        error: null
      }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        hasUnsavedChanges: true
      }

    case 'UPDATE_SECTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.section]: {
            ...state.settings[action.payload.section],
            ...action.payload.data
          }
        },
        hasUnsavedChanges: true
      }

    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload }

    case 'SET_LAST_SYNCED':
      return { ...state, lastSynced: action.payload }

    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload }

    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultSettings,
        hasUnsavedChanges: true,
        error: null
      }

    default:
      return state
  }
}

// ===== CONTEXT =====

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

// ===== PROVIDER COMPONENT =====

interface SettingsProviderProps {
  children: React.ReactNode
  apiEndpoint?: string
  enableCloudSync?: boolean
  enableAutoSave?: boolean
  autoSaveDelay?: number
  storageKey?: string
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  apiEndpoint = '/api/user/settings',
  enableCloudSync = true,
  enableAutoSave = true,
  autoSaveDelay = 2000,
  storageKey = 'user-settings'
}) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Auto-save when settings change
  useEffect(() => {
    if (!enableAutoSave || !state.hasUnsavedChanges) return

    const timeoutId = setTimeout(() => {
      saveSettings()
    }, autoSaveDelay)

    return () => clearTimeout(timeoutId)
  }, [state.settings, state.hasUnsavedChanges, enableAutoSave, autoSaveDelay])

  // Sync settings periodically if cloud sync is enabled
  useEffect(() => {
    if (!enableCloudSync) return

    const intervalId = setInterval(() => {
      syncSettings()
    }, 5 * 60 * 1000) // Sync every 5 minutes

    return () => clearInterval(intervalId)
  }, [enableCloudSync])

  // Load settings from storage and API
  const loadSettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })

      // Load from localStorage first
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedSettings = JSON.parse(stored)
        dispatch({ type: 'SET_SETTINGS', payload: { ...defaultSettings, ...parsedSettings } })
      }

      // Load from API if cloud sync is enabled
      if (enableCloudSync) {
        try {
          const response = await fetch(apiEndpoint, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })

          if (response.ok) {
            const apiSettings = await response.json()
            dispatch({ type: 'SET_SETTINGS', payload: { ...defaultSettings, ...apiSettings } })
            dispatch({ type: 'SET_LAST_SYNCED', payload: new Date() })
          }
        } catch (error) {
          console.warn('Failed to load settings from API:', error)
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [apiEndpoint, enableCloudSync, storageKey])

  // Save settings to storage and API
  const saveSettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_SAVING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify(state.settings))

      // Save to API if cloud sync is enabled
      if (enableCloudSync) {
        const response = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(state.settings)
        })

        if (!response.ok) {
          throw new Error('Failed to save settings to server')
        }

        dispatch({ type: 'SET_LAST_SYNCED', payload: new Date() })
      }

      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      console.error('Failed to save settings:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save settings' })
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }, [state.settings, apiEndpoint, enableCloudSync, storageKey])

  // Sync settings with server
  const syncSettings = useCallback(async () => {
    if (!enableCloudSync) return

    try {
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' })

      const response = await fetch(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const serverSettings = await response.json()
        const serverTimestamp = new Date(response.headers.get('last-modified') || Date.now())
        
        // Compare timestamps to determine which settings are newer
        if (!state.lastSynced || serverTimestamp > state.lastSynced) {
          dispatch({ type: 'SET_SETTINGS', payload: { ...defaultSettings, ...serverSettings } })
        } else if (state.hasUnsavedChanges) {
          // Local changes are newer, push to server
          await saveSettings()
        }

        dispatch({ type: 'SET_SYNC_STATUS', payload: 'success' })
        dispatch({ type: 'SET_LAST_SYNCED', payload: new Date() })
      } else {
        throw new Error('Failed to sync settings')
      }
    } catch (error) {
      console.error('Failed to sync settings:', error)
      dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' })
    }
  }, [enableCloudSync, apiEndpoint, state.lastSynced, state.hasUnsavedChanges, saveSettings])

  // Update settings
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates })
  }, [])

  // Update specific section
  const updateSection = useCallback(<K extends keyof UserSettings>(
    section: K,
    data: Partial<UserSettings[K]>
  ) => {
    dispatch({ type: 'UPDATE_SECTION', payload: { section, data } })
  }, [])

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' })
  }, [])

  // Export settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(state.settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }, [state.settings])

  // Import settings
  const importSettings = useCallback((importedSettings: Partial<UserSettings>) => {
    const mergedSettings = { ...defaultSettings, ...importedSettings }
    dispatch({ type: 'SET_SETTINGS', payload: mergedSettings })
  }, [])

  const contextValue: SettingsContextValue = {
    state,
    actions: {
      updateSettings,
      updateSection,
      saveSettings,
      resetSettings,
      syncSettings,
      exportSettings,
      importSettings
    }
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

// ===== HOOK =====

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext)
  
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  
  return context
}

// ===== UTILITY HOOKS =====

/**
 * Hook for specific settings section
 */
export function useSettingsSection<K extends keyof UserSettings>(section: K) {
  const { state, actions } = useSettings()
  
  return {
    settings: state.settings[section],
    updateSettings: (data: Partial<UserSettings[K]>) => actions.updateSection(section, data),
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    hasUnsavedChanges: state.hasUnsavedChanges
  }
}

/**
 * Hook for theme settings
 */
export function useThemeSettings() {
  return useSettingsSection('theme')
}

/**
 * Hook for dashboard settings
 */
export function useDashboardSettings() {
  return useSettingsSection('dashboard')
}

/**
 * Hook for notification settings
 */
export function useNotificationSettings() {
  return useSettingsSection('notifications')
}

/**
 * Hook for profile settings
 */
export function useProfileSettings() {
  return useSettingsSection('profile')
}

/**
 * Hook for privacy settings
 */
export function usePrivacySettings() {
  return useSettingsSection('privacy')
}

/**
 * Hook for accessibility settings
 */
export function useAccessibilitySettings() {
  return useSettingsSection('accessibility')
}

/**
 * Hook for localization settings
 */
export function useLocalizationSettings() {
  return useSettingsSection('localization')
}

// ===== EXPORTS =====

export default SettingsProvider