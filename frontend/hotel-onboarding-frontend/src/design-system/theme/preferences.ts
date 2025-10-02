/**
 * User Preference Persistence
 * System for storing and syncing user preferences with cloud storage
 */

import type { ThemeMode, DesignTokens } from '../tokens/types'

// ===== PREFERENCE TYPES =====

export interface UserPreferences {
  // Theme preferences
  theme: {
    mode: ThemeMode
    customTokens: Partial<DesignTokens>
    reducedMotion: boolean
    highContrast: boolean
  }
  
  // Layout preferences
  layout: {
    sidebarCollapsed: boolean
    sidebarWidth: number
    density: 'compact' | 'comfortable' | 'spacious'
    gridView: boolean
  }
  
  // Dashboard preferences
  dashboard: {
    widgets: DashboardWidget[]
    layout: DashboardLayout
    refreshInterval: number
    showWelcome: boolean
  }
  
  // Accessibility preferences
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large'
    keyboardNavigation: boolean
    screenReader: boolean
    focusIndicators: boolean
  }
  
  // Notification preferences
  notifications: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    email: boolean
    categories: NotificationCategory[]
  }
  
  // Language and localization
  localization: {
    language: string
    timezone: string
    dateFormat: string
    numberFormat: string
    currency: string
  }
  
  // Data preferences
  data: {
    itemsPerPage: number
    defaultSort: string
    defaultFilters: Record<string, any>
    autoRefresh: boolean
  }
}

export interface DashboardWidget {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: Record<string, any>
  visible: boolean
}

export interface DashboardLayout {
  columns: number
  gap: number
  padding: number
  responsive: boolean
}

export interface NotificationCategory {
  id: string
  enabled: boolean
  priority: 'low' | 'medium' | 'high'
  channels: ('app' | 'email' | 'sms')[]
}

// ===== STORAGE ADAPTERS =====

interface StorageAdapter {
  get(key: string): Promise<any>
  set(key: string, value: any): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

class LocalStorageAdapter implements StorageAdapter {
  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.warn('Failed to get item from localStorage:', error)
      return null
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to set item in localStorage:', error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove item from localStorage:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }
}

class CloudStorageAdapter implements StorageAdapter {
  private apiEndpoint: string
  private userId: string

  constructor(apiEndpoint: string, userId: string) {
    this.apiEndpoint = apiEndpoint
    this.userId = userId
  }

  async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiEndpoint}/preferences/${this.userId}/${key}`)
      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.warn('Failed to get preferences from cloud:', error)
      return null
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/preferences/${this.userId}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })
    } catch (error) {
      console.warn('Failed to save preferences to cloud:', error)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/preferences/${this.userId}/${key}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('Failed to remove preferences from cloud:', error)
    }
  }

  async clear(): Promise<void> {
    try {
      await fetch(`${this.apiEndpoint}/preferences/${this.userId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.warn('Failed to clear preferences from cloud:', error)
    }
  }
}

// ===== PREFERENCE MANAGER =====

export class PreferenceManager {
  private localAdapter: StorageAdapter
  private cloudAdapter?: StorageAdapter
  private preferences: UserPreferences
  private listeners: Map<string, Set<(value: any) => void>>
  private syncEnabled: boolean
  private syncInterval?: number

  constructor(options: {
    userId?: string
    apiEndpoint?: string
    syncEnabled?: boolean
    syncInterval?: number
  } = {}) {
    this.localAdapter = new LocalStorageAdapter()
    this.cloudAdapter = options.userId && options.apiEndpoint
      ? new CloudStorageAdapter(options.apiEndpoint, options.userId)
      : undefined
    this.preferences = this.getDefaultPreferences()
    this.listeners = new Map()
    this.syncEnabled = options.syncEnabled ?? true
    this.syncInterval = options.syncInterval

    this.initialize()
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: {
        mode: 'light',
        customTokens: {},
        reducedMotion: false,
        highContrast: false,
      },
      layout: {
        sidebarCollapsed: false,
        sidebarWidth: 280,
        density: 'comfortable',
        gridView: false,
      },
      dashboard: {
        widgets: [],
        layout: {
          columns: 12,
          gap: 16,
          padding: 24,
          responsive: true,
        },
        refreshInterval: 30000,
        showWelcome: true,
      },
      accessibility: {
        fontSize: 'medium',
        keyboardNavigation: false,
        screenReader: false,
        focusIndicators: true,
      },
      notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        email: false,
        categories: [],
      },
      localization: {
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/dd/yyyy',
        numberFormat: 'en-US',
        currency: 'USD',
      },
      data: {
        itemsPerPage: 25,
        defaultSort: 'created_at',
        defaultFilters: {},
        autoRefresh: false,
      },
    }
  }

  private async initialize(): Promise<void> {
    // Load preferences from local storage
    await this.loadFromLocal()

    // Sync with cloud if enabled
    if (this.syncEnabled && this.cloudAdapter) {
      await this.syncWithCloud()
      
      // Set up periodic sync
      if (this.syncInterval) {
        setInterval(() => this.syncWithCloud(), this.syncInterval)
      }
    }
  }

  private async loadFromLocal(): Promise<void> {
    try {
      const stored = await this.localAdapter.get('user-preferences')
      if (stored) {
        this.preferences = { ...this.preferences, ...stored }
      }
    } catch (error) {
      console.warn('Failed to load preferences from local storage:', error)
    }
  }

  private async saveToLocal(): Promise<void> {
    try {
      await this.localAdapter.set('user-preferences', this.preferences)
    } catch (error) {
      console.warn('Failed to save preferences to local storage:', error)
    }
  }

  private async syncWithCloud(): Promise<void> {
    if (!this.cloudAdapter) return

    try {
      // Get cloud preferences
      const cloudPrefs = await this.cloudAdapter.get('preferences')
      
      if (cloudPrefs) {
        // Merge with local preferences (cloud takes precedence)
        this.preferences = { ...this.preferences, ...cloudPrefs }
        await this.saveToLocal()
        this.notifyListeners()
      } else {
        // Upload local preferences to cloud
        await this.cloudAdapter.set('preferences', this.preferences)
      }
    } catch (error) {
      console.warn('Failed to sync preferences with cloud:', error)
    }
  }

  // ===== PUBLIC API =====

  /**
   * Get a preference value by path
   */
  get<T = any>(path: string): T {
    return this.getNestedValue(this.preferences, path)
  }

  /**
   * Set a preference value by path
   */
  async set(path: string, value: any): Promise<void> {
    this.setNestedValue(this.preferences, path, value)
    
    // Save locally
    await this.saveToLocal()
    
    // Sync to cloud if enabled
    if (this.syncEnabled && this.cloudAdapter) {
      await this.cloudAdapter.set('preferences', this.preferences)
    }
    
    // Notify listeners
    this.notifyListeners(path, value)
  }

  /**
   * Update multiple preferences at once
   */
  async update(updates: Partial<UserPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...updates }
    
    // Save locally
    await this.saveToLocal()
    
    // Sync to cloud if enabled
    if (this.syncEnabled && this.cloudAdapter) {
      await this.cloudAdapter.set('preferences', this.preferences)
    }
    
    // Notify listeners
    this.notifyListeners()
  }

  /**
   * Reset preferences to defaults
   */
  async reset(): Promise<void> {
    this.preferences = this.getDefaultPreferences()
    
    // Clear local storage
    await this.localAdapter.remove('user-preferences')
    
    // Clear cloud storage if enabled
    if (this.syncEnabled && this.cloudAdapter) {
      await this.cloudAdapter.remove('preferences')
    }
    
    // Notify listeners
    this.notifyListeners()
  }

  /**
   * Get all preferences
   */
  getAll(): UserPreferences {
    return { ...this.preferences }
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(path: string, callback: (value: any) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set())
    }
    
    this.listeners.get(path)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path)
      if (pathListeners) {
        pathListeners.delete(callback)
        if (pathListeners.size === 0) {
          this.listeners.delete(path)
        }
      }
    }
  }

  /**
   * Export preferences as JSON
   */
  export(): string {
    return JSON.stringify(this.preferences, null, 2)
  }

  /**
   * Import preferences from JSON
   */
  async import(json: string): Promise<void> {
    try {
      const imported = JSON.parse(json)
      await this.update(imported)
    } catch (error) {
      throw new Error('Invalid preferences JSON')
    }
  }

  // ===== PRIVATE HELPERS =====

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {}
      }
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  private notifyListeners(changedPath?: string, value?: any): void {
    // Notify specific path listeners
    if (changedPath && this.listeners.has(changedPath)) {
      const pathValue = value !== undefined ? value : this.get(changedPath)
      this.listeners.get(changedPath)!.forEach(callback => callback(pathValue))
    }
    
    // Notify global listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*')!.forEach(callback => callback(this.preferences))
    }
  }
}

// ===== REACT HOOKS =====

/**
 * Hook for using preferences in React components
 */
export function usePreferences() {
  const [preferences, setPreferences] = React.useState<UserPreferences>()
  const [manager] = React.useState(() => new PreferenceManager())

  React.useEffect(() => {
    // Initial load
    setPreferences(manager.getAll())
    
    // Subscribe to changes
    const unsubscribe = manager.subscribe('*', (prefs) => {
      setPreferences(prefs)
    })
    
    return unsubscribe
  }, [manager])

  const get = React.useCallback(<T = any>(path: string): T => {
    return manager.get<T>(path)
  }, [manager])

  const set = React.useCallback(async (path: string, value: any) => {
    await manager.set(path, value)
  }, [manager])

  const update = React.useCallback(async (updates: Partial<UserPreferences>) => {
    await manager.update(updates)
  }, [manager])

  const reset = React.useCallback(async () => {
    await manager.reset()
  }, [manager])

  return {
    preferences,
    get,
    set,
    update,
    reset,
    manager,
  }
}

/**
 * Hook for using a specific preference value
 */
export function usePreference<T = any>(path: string, defaultValue?: T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = React.useState<T>(defaultValue as T)
  const [manager] = React.useState(() => new PreferenceManager())

  React.useEffect(() => {
    // Initial load
    setValue(manager.get<T>(path) ?? defaultValue as T)
    
    // Subscribe to changes
    const unsubscribe = manager.subscribe(path, (newValue) => {
      setValue(newValue ?? defaultValue as T)
    })
    
    return unsubscribe
  }, [path, defaultValue, manager])

  const setter = React.useCallback(async (newValue: T) => {
    await manager.set(path, newValue)
  }, [path, manager])

  return [value, setter]
}

// ===== EXPORTS =====

export default PreferenceManager

// ===== USAGE EXAMPLES =====

/*
// Initialize preference manager
const preferenceManager = new PreferenceManager({
  userId: 'user123',
  apiEndpoint: '/api',
  syncEnabled: true,
  syncInterval: 60000, // Sync every minute
})

// Get preferences
const themeMode = preferenceManager.get('theme.mode')
const sidebarCollapsed = preferenceManager.get('layout.sidebarCollapsed')

// Set preferences
await preferenceManager.set('theme.mode', 'dark')
await preferenceManager.set('layout.sidebarWidth', 320)

// Update multiple preferences
await preferenceManager.update({
  theme: { mode: 'dark', reducedMotion: true },
  layout: { sidebarCollapsed: true, density: 'compact' }
})

// Subscribe to changes
const unsubscribe = preferenceManager.subscribe('theme.mode', (mode) => {
  console.log('Theme mode changed to:', mode)
})

// React hooks
function MyComponent() {
  const { preferences, get, set } = usePreferences()
  const [themeMode, setThemeMode] = usePreference('theme.mode', 'light')
  
  return (
    <div>
      <p>Current theme: {themeMode}</p>
      <button onClick={() => setThemeMode('dark')}>
        Switch to dark mode
      </button>
    </div>
  )
}

// Export/Import preferences
const exported = preferenceManager.export()
await preferenceManager.import(exported)
*/