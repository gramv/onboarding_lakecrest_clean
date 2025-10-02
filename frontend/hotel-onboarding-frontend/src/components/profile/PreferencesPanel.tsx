/**
 * Preferences Panel Component
 * Comprehensive preferences interface for theme, notifications, and dashboard customization
 */

import React, { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Palette,
  Bell,
  Layout,
  Globe,
  Shield,
  Database,
  Monitor,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  MessageSquare,
  Clock,
  Zap,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { useTheme } from '@/design-system/theme/ThemeProvider'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

// ===== TYPES =====

interface UserPreferences {
  // Theme preferences
  theme: {
    mode: 'light' | 'dark' | 'auto'
    primaryColor: string
    fontSize: 'small' | 'medium' | 'large'
    reducedMotion: boolean
    highContrast: boolean
  }
  
  // Notification preferences
  notifications: {
    enabled: boolean
    categories: {
      applications: boolean
      employees: boolean
      properties: boolean
      system: boolean
      reminders: boolean
    }
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
  
  // Dashboard preferences
  dashboard: {
    layout: 'compact' | 'comfortable' | 'spacious'
    sidebarCollapsed: boolean
    showWelcomeMessage: boolean
    defaultView: string
    refreshInterval: number
    showTooltips: boolean
  }
  
  // Language and localization
  localization: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: '12h' | '24h'
    currency: string
  }
  
  // Privacy and security
  privacy: {
    shareUsageData: boolean
    allowCookies: boolean
    twoFactorAuth: boolean
    sessionTimeout: number
  }
  
  // Data management
  data: {
    autoSave: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    retentionPeriod: number
    exportFormat: 'json' | 'csv' | 'xlsx'
  }
}

interface PreferencesPanelProps {
  className?: string
  onPreferencesChange?: (preferences: UserPreferences) => void
  onSave?: (preferences: UserPreferences) => void
  onReset?: () => void
  showSaveButton?: boolean
  showResetButton?: boolean
}

// ===== DEFAULT PREFERENCES =====

const defaultPreferences: UserPreferences = {
  theme: {
    mode: 'auto',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    reducedMotion: false,
    highContrast: false
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
  dashboard: {
    layout: 'comfortable',
    sidebarCollapsed: false,
    showWelcomeMessage: true,
    defaultView: 'overview',
    refreshInterval: 30,
    showTooltips: true
  },
  localization: {
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    currency: 'USD'
  },
  privacy: {
    shareUsageData: false,
    allowCookies: true,
    twoFactorAuth: false,
    sessionTimeout: 480
  },
  data: {
    autoSave: true,
    backupFrequency: 'weekly',
    retentionPeriod: 90,
    exportFormat: 'json'
  }
}

// ===== PREFERENCES PANEL COMPONENT =====

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  className,
  onPreferencesChange,
  onSave,
  onReset,
  showSaveButton = true,
  showResetButton = true
}) => {
  const { user } = useAuth()
  const { mode, setMode } = useTheme()
  const { toast } = useToast()
  
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  // Load preferences from storage or API
  const loadPreferences = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Try to load from localStorage first
      const stored = localStorage.getItem('user-preferences')
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences({ ...defaultPreferences, ...parsed })
      }
      
      // TODO: Load from API
      // const response = await fetch('/api/user/preferences')
      // const apiPreferences = await response.json()
      // setPreferences(apiPreferences)
      
    } catch (error) {
      console.error('Failed to load preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to load preferences. Using defaults.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Update preferences
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates }
      setHasChanges(true)
      onPreferencesChange?.(updated)
      return updated
    })
  }, [onPreferencesChange])

  // Update nested preference
  const updateNestedPreference = useCallback((
    section: keyof UserPreferences,
    key: string,
    value: any
  ) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      }
      setHasChanges(true)
      onPreferencesChange?.(updated)
      return updated
    })
  }, [onPreferencesChange])

  // Save preferences
  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Save to localStorage
      localStorage.setItem('user-preferences', JSON.stringify(preferences))
      
      // TODO: Save to API
      // await fetch('/api/user/preferences', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(preferences)
      // })
      
      setHasChanges(false)
      onSave?.(preferences)
      
      toast({
        title: 'Success',
        description: 'Preferences saved successfully.'
      })
      
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [preferences, onSave, toast])

  // Reset preferences
  const handleReset = useCallback(() => {
    setPreferences(defaultPreferences)
    setHasChanges(true)
    onReset?.()
    
    toast({
      title: 'Reset',
      description: 'Preferences reset to defaults.'
    })
  }, [onReset, toast])

  // Export preferences
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'preferences.json'
    link.click()
    
    URL.revokeObjectURL(url)
    
    toast({
      title: 'Exported',
      description: 'Preferences exported successfully.'
    })
  }, [preferences, toast])

  // Import preferences
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        setPreferences({ ...defaultPreferences, ...imported })
        setHasChanges(true)
        
        toast({
          title: 'Imported',
          description: 'Preferences imported successfully.'
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Invalid preferences file.',
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(file)
  }, [toast])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Preferences</h2>
          <p className="text-muted-foreground">
            Customize your experience and manage your account settings.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved changes
            </Badge>
          )}
          
          {showResetButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          
          {showSaveButton && (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Preferences Tabs */}
      <Tabs defaultValue="theme" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Theme Preferences */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the visual appearance of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Mode */}
              <div className="space-y-2">
                <Label>Theme Mode</Label>
                <Select
                  value={preferences.theme.mode}
                  onValueChange={(value: 'light' | 'dark' | 'auto') => {
                    updateNestedPreference('theme', 'mode', value)
                    setMode(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={preferences.theme.fontSize}
                  onValueChange={(value) => updateNestedPreference('theme', 'fontSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accessibility Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations and transitions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.theme.reducedMotion}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('theme', 'reducedMotion', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast</Label>
                    <p className="text-sm text-muted-foreground">
                      Increase contrast for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={preferences.theme.highContrast}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('theme', 'highContrast', checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Control how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn all notifications on or off
                  </p>
                </div>
                <Switch
                  checked={preferences.notifications.enabled}
                  onCheckedChange={(checked) => 
                    updateNestedPreference('notifications', 'enabled', checked)
                  }
                />
              </div>

              <Separator />

              {/* Categories */}
              <div className="space-y-4">
                <Label>Notification Categories</Label>
                {Object.entries(preferences.notifications.categories).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="capitalize">{key}</Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        updateNestedPreference('notifications', 'categories', {
                          ...preferences.notifications.categories,
                          [key]: checked
                        })
                      }
                      disabled={!preferences.notifications.enabled}
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Delivery Methods */}
              <div className="space-y-4">
                <Label>Delivery Methods</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <Label>Browser Notifications</Label>
                    </div>
                    <Switch
                      checked={preferences.notifications.delivery.browser}
                      onCheckedChange={(checked) => 
                        updateNestedPreference('notifications', 'delivery', {
                          ...preferences.notifications.delivery,
                          browser: checked
                        })
                      }
                      disabled={!preferences.notifications.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label>Email Notifications</Label>
                    </div>
                    <Switch
                      checked={preferences.notifications.delivery.email}
                      onCheckedChange={(checked) => 
                        updateNestedPreference('notifications', 'delivery', {
                          ...preferences.notifications.delivery,
                          email: checked
                        })
                      }
                      disabled={!preferences.notifications.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <Label>SMS Notifications</Label>
                    </div>
                    <Switch
                      checked={preferences.notifications.delivery.sms}
                      onCheckedChange={(checked) => 
                        updateNestedPreference('notifications', 'delivery', {
                          ...preferences.notifications.delivery,
                          sms: checked
                        })
                      }
                      disabled={!preferences.notifications.enabled}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quiet Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Disable notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifications.quietHours.enabled}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('notifications', 'quietHours', {
                        ...preferences.notifications.quietHours,
                        enabled: checked
                      })
                    }
                    disabled={!preferences.notifications.enabled}
                  />
                </div>

                {preferences.notifications.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={preferences.notifications.quietHours.start}
                        onChange={(e) => 
                          updateNestedPreference('notifications', 'quietHours', {
                            ...preferences.notifications.quietHours,
                            start: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={preferences.notifications.quietHours.end}
                        onChange={(e) => 
                          updateNestedPreference('notifications', 'quietHours', {
                            ...preferences.notifications.quietHours,
                            end: e.target.value
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Preferences */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>
                Customize your dashboard layout and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Layout Density */}
              <div className="space-y-2">
                <Label>Layout Density</Label>
                <Select
                  value={preferences.dashboard.layout}
                  onValueChange={(value) => updateNestedPreference('dashboard', 'layout', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Interval */}
              <div className="space-y-2">
                <Label>Auto-refresh Interval (seconds)</Label>
                <div className="px-3">
                  <Slider
                    value={[preferences.dashboard.refreshInterval]}
                    onValueChange={([value]) => 
                      updateNestedPreference('dashboard', 'refreshInterval', value)
                    }
                    max={300}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>10s</span>
                    <span>{preferences.dashboard.refreshInterval}s</span>
                    <span>5m</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collapsed Sidebar</Label>
                    <p className="text-sm text-muted-foreground">
                      Start with sidebar collapsed
                    </p>
                  </div>
                  <Switch
                    checked={preferences.dashboard.sidebarCollapsed}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('dashboard', 'sidebarCollapsed', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Welcome Message</Label>
                    <p className="text-sm text-muted-foreground">
                      Display welcome message on dashboard
                    </p>
                  </div>
                  <Switch
                    checked={preferences.dashboard.showWelcomeMessage}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('dashboard', 'showWelcomeMessage', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Tooltips</Label>
                    <p className="text-sm text-muted-foreground">
                      Display helpful tooltips throughout the interface
                    </p>
                  </div>
                  <Switch
                    checked={preferences.dashboard.showTooltips}
                    onCheckedChange={(checked) => 
                      updateNestedPreference('dashboard', 'showTooltips', checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your data backup, export, and retention settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import/Export */}
              <div className="space-y-4">
                <Label>Import/Export Preferences</Label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Preferences
                  </Button>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                      id="import-preferences"
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="import-preferences" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        Import Preferences
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Auto-save */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes as you make them
                  </p>
                </div>
                <Switch
                  checked={preferences.data.autoSave}
                  onCheckedChange={(checked) => 
                    updateNestedPreference('data', 'autoSave', checked)
                  }
                />
              </div>

              {/* Backup Frequency */}
              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <Select
                  value={preferences.data.backupFrequency}
                  onValueChange={(value) => updateNestedPreference('data', 'backupFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data Retention */}
              <div className="space-y-2">
                <Label>Data Retention Period (days)</Label>
                <div className="px-3">
                  <Slider
                    value={[preferences.data.retentionPeriod]}
                    onValueChange={([value]) => 
                      updateNestedPreference('data', 'retentionPeriod', value)
                    }
                    max={365}
                    min={30}
                    step={30}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>30 days</span>
                    <span>{preferences.data.retentionPeriod} days</span>
                    <span>1 year</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===== EXPORTS =====

export default PreferencesPanel