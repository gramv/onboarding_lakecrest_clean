/**
 * Notification Service
 * Service for managing notifications with persistence and real-time updates
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { NotificationItem, NotificationPreferences } from './NotificationCenter'
import { createNotificationFromTemplate } from './NotificationTemplates'

// ===== TYPES =====

interface NotificationState {
  notifications: NotificationItem[]
  preferences: NotificationPreferences
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

type NotificationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATIONS'; payload: NotificationItem[] }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationItem }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<NotificationItem> } }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'ARCHIVE_NOTIFICATION'; payload: string }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences }
  | { type: 'CLEAR_EXPIRED' }

interface NotificationContextValue {
  state: NotificationState
  actions: {
    addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'archived'>) => void
    addNotificationFromTemplate: (templateId: string, variables: Record<string, any>) => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    deleteNotification: (id: string) => void
    archiveNotification: (id: string) => void
    updatePreferences: (preferences: NotificationPreferences) => void
    clearExpiredNotifications: () => void
    refreshNotifications: () => Promise<void>
  }
  // Computed values
  unreadCount: number
  urgentCount: number
  recentNotifications: NotificationItem[]
}

// ===== INITIAL STATE =====

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  categories: {
    application: true,
    employee: true,
    property: true,
    system: true,
    reminder: true
  },
  priorities: {
    low: true,
    medium: true,
    high: true,
    urgent: true
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
  groupSimilar: true,
  autoMarkRead: false,
  retentionDays: 30
}

const initialState: NotificationState = {
  notifications: [],
  preferences: defaultPreferences,
  isLoading: false,
  error: null,
  lastUpdated: null
}

// ===== REDUCER =====

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        lastUpdated: new Date()
      }

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, ...action.payload.updates }
            : notification
        ),
        lastUpdated: new Date()
      }

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        lastUpdated: new Date()
      }

    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        lastUpdated: new Date()
      }

    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true
        })),
        lastUpdated: new Date()
      }

    case 'ARCHIVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, archived: !notification.archived }
            : notification
        ),
        lastUpdated: new Date()
      }

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: action.payload
      }

    case 'CLEAR_EXPIRED':
      const now = new Date()
      return {
        ...state,
        notifications: state.notifications.filter(notification => {
          if (!notification.expiresAt) return true
          return notification.expiresAt > now
        }),
        lastUpdated: new Date()
      }

    default:
      return state
  }
}

// ===== CONTEXT =====

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

// ===== PROVIDER COMPONENT =====

interface NotificationProviderProps {
  children: React.ReactNode
  apiEndpoint?: string
  enableRealTime?: boolean
  enablePersistence?: boolean
  storageKey?: string
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  apiEndpoint = '/api/notifications',
  enableRealTime = true,
  enablePersistence = true,
  storageKey = 'hotel-notifications'
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  // Load from localStorage on mount
  useEffect(() => {
    if (!enablePersistence) return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const { notifications, preferences } = JSON.parse(stored)
        
        // Parse dates
        const parsedNotifications = notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined
        }))
        
        dispatch({ type: 'SET_NOTIFICATIONS', payload: parsedNotifications })
        dispatch({ type: 'SET_PREFERENCES', payload: preferences || defaultPreferences })
      }
    } catch (error) {
      console.warn('Failed to load notifications from storage:', error)
    }
  }, [enablePersistence, storageKey])

  // Save to localStorage when state changes
  useEffect(() => {
    if (!enablePersistence) return

    try {
      const dataToStore = {
        notifications: state.notifications,
        preferences: state.preferences
      }
      localStorage.setItem(storageKey, JSON.stringify(dataToStore))
    } catch (error) {
      console.warn('Failed to save notifications to storage:', error)
    }
  }, [state.notifications, state.preferences, enablePersistence, storageKey])

  // Clear expired notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_EXPIRED' })
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  // Real-time updates (WebSocket or polling)
  useEffect(() => {
    if (!enableRealTime) return

    // TODO: Implement WebSocket connection for real-time updates
    // This would connect to the backend WebSocket endpoint
    // and dispatch ADD_NOTIFICATION actions when new notifications arrive

    // For now, we'll use polling as a fallback
    const pollInterval = setInterval(async () => {
      try {
        await refreshNotifications()
      } catch (error) {
        console.warn('Failed to poll for notifications:', error)
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(pollInterval)
  }, [enableRealTime, apiEndpoint])

  // Request browser notification permission
  useEffect(() => {
    if (state.preferences.delivery.browser && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [state.preferences.delivery.browser])

  // Actions
  const addNotification = useCallback((
    notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'archived'>
  ) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      read: false,
      archived: false
    }

    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification })

    // Show browser notification if enabled and permission granted
    if (
      state.preferences.delivery.browser &&
      'Notification' in window &&
      Notification.permission === 'granted' &&
      !isInQuietHours(state.preferences.quietHours)
    ) {
      showBrowserNotification(newNotification)
    }
  }, [state.preferences])

  const addNotificationFromTemplate = useCallback((
    templateId: string,
    variables: Record<string, any>
  ) => {
    try {
      const notification = createNotificationFromTemplate(templateId, variables)
      addNotification(notification)
    } catch (error) {
      console.error('Failed to create notification from template:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create notification' })
    }
  }, [addNotification])

  const markAsRead = useCallback((id: string) => {
    dispatch({ type: 'MARK_READ', payload: id })
  }, [])

  const markAllAsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_READ' })
  }, [])

  const deleteNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }, [])

  const archiveNotification = useCallback((id: string) => {
    dispatch({ type: 'ARCHIVE_NOTIFICATION', payload: id })
  }, [])

  const updatePreferences = useCallback((preferences: NotificationPreferences) => {
    dispatch({ type: 'SET_PREFERENCES', payload: preferences })
  }, [])

  const clearExpiredNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_EXPIRED' })
  }, [])

  const refreshNotifications = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // TODO: Implement API call to fetch notifications
      // const response = await fetch(apiEndpoint)
      // const notifications = await response.json()
      // dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications })
      
      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh notifications' })
    }
  }, [apiEndpoint])

  // Computed values
  const unreadCount = state.notifications.filter(n => !n.read && !n.archived).length
  const urgentCount = state.notifications.filter(n => 
    n.priority === 'urgent' && !n.read && !n.archived
  ).length
  const recentNotifications = state.notifications
    .filter(n => !n.archived)
    .slice(0, 5)

  const contextValue: NotificationContextValue = {
    state,
    actions: {
      addNotification,
      addNotificationFromTemplate,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      archiveNotification,
      updatePreferences,
      clearExpiredNotifications,
      refreshNotifications
    },
    unreadCount,
    urgentCount,
    recentNotifications
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// ===== HOOK =====

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext)
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  
  return context
}

// ===== UTILITY FUNCTIONS =====

function generateId(): string {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function isInQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
  if (!quietHours.enabled) return false

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  const start = quietHours.start
  const end = quietHours.end
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end
  }
  
  // Handle same-day quiet hours (e.g., 12:00 to 14:00)
  return currentTime >= start && currentTime <= end
}

function showBrowserNotification(notification: NotificationItem): void {
  try {
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico', // TODO: Use appropriate icon based on notification type
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.priority === 'urgent',
      silent: notification.priority === 'low'
    })

    // Auto-close after 5 seconds for non-urgent notifications
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        browserNotification.close()
      }, 5000)
    }

    // Handle click
    browserNotification.onclick = () => {
      window.focus()
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl
      }
      browserNotification.close()
    }
  } catch (error) {
    console.warn('Failed to show browser notification:', error)
  }
}

// ===== NOTIFICATION HOOKS =====

/**
 * Hook for adding notifications easily
 */
export const useNotificationActions = () => {
  const { actions } = useNotifications()
  return actions
}

/**
 * Hook for notification counts
 */
export const useNotificationCounts = () => {
  const { unreadCount, urgentCount } = useNotifications()
  return { unreadCount, urgentCount }
}

/**
 * Hook for recent notifications
 */
export const useRecentNotifications = () => {
  const { recentNotifications } = useNotifications()
  return recentNotifications
}

// ===== EXPORTS =====

export default NotificationProvider