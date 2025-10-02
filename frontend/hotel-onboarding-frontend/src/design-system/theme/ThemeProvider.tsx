/**
 * Theme Provider
 * Context-based theme switching with persistence and customization
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ThemeMode, ThemeConfig, DesignTokens } from '../tokens/types'
import { themeVariants } from '../tokens'

// ===== THEME CONTEXT TYPES =====

interface ThemeContextValue {
  // Current theme state
  mode: ThemeMode
  config: ThemeConfig
  tokens: DesignTokens
  
  // Theme actions
  setMode: (mode: ThemeMode) => void
  toggleMode: () => void
  
  // Theme customization
  customTokens: Partial<DesignTokens>
  updateTokens: (tokens: Partial<DesignTokens>) => void
  resetTokens: () => void
  
  // System preferences
  systemPreference: 'light' | 'dark'
  prefersReducedMotion: boolean
  
  // Theme utilities
  isDark: boolean
  isLight: boolean
  isAuto: boolean
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultMode?: ThemeMode
  storageKey?: string
  enableSystemDetection?: boolean
  enableCustomization?: boolean
  customTokens?: Partial<DesignTokens>
  onThemeChange?: (mode: ThemeMode) => void
}

// ===== THEME CONTEXT =====

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// ===== THEME PROVIDER COMPONENT =====

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light',
  storageKey = 'hotel-theme',
  enableSystemDetection = true,
  enableCustomization = true,
  customTokens: initialCustomTokens = {},
  onThemeChange,
}) => {
  // State
  const [mode, setModeState] = useState<ThemeMode>(defaultMode)
  const [customTokens, setCustomTokens] = useState<Partial<DesignTokens>>(initialCustomTokens)
  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>('light')
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Detect system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemPreference(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)

    // Detect motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(motionQuery.matches)

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    motionQuery.addEventListener('change', handleMotionChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  // Load theme from storage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && ['light', 'dark', 'auto'].includes(stored)) {
        setModeState(stored as ThemeMode)
      }

      // Load custom tokens from storage
      if (enableCustomization) {
        const storedTokens = localStorage.getItem(`${storageKey}-custom`)
        if (storedTokens) {
          const parsed = JSON.parse(storedTokens)
          setCustomTokens(parsed)
        }
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error)
    }
  }, [storageKey, enableCustomization])

  // Determine effective theme mode
  const effectiveMode = mode === 'auto' 
    ? (enableSystemDetection ? systemPreference : 'light')
    : mode

  // Get current theme config
  const config = themeVariants[effectiveMode]
  
  // Merge custom tokens with base tokens
  const mergedTokens: DesignTokens = React.useMemo(() => {
    if (!enableCustomization || Object.keys(customTokens).length === 0) {
      return config.tokens
    }

    // Deep merge custom tokens
    const merged = { ...config.tokens }
    
    if (customTokens.colors) {
      merged.colors = { ...merged.colors, ...customTokens.colors }
    }
    
    if (customTokens.typography) {
      merged.typography = { ...merged.typography, ...customTokens.typography }
    }
    
    if (customTokens.spacing) {
      merged.spacing = { ...merged.spacing, ...customTokens.spacing }
    }
    
    // Add other token categories as needed
    
    return merged
  }, [config.tokens, customTokens, enableCustomization])

  // Apply theme to DOM
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement
    
    // Apply theme class
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveMode)
    
    // Apply reduced motion preference
    if (prefersReducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    // Apply custom CSS properties if customization is enabled
    if (enableCustomization && Object.keys(customTokens).length > 0) {
      applyCustomTokensToDOM(customTokens)
    }
  }, [effectiveMode, prefersReducedMotion, customTokens, enableCustomization])

  // Theme actions
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    
    // Persist to storage
    try {
      localStorage.setItem(storageKey, newMode)
    } catch (error) {
      console.warn('Failed to save theme to storage:', error)
    }
    
    // Call change handler
    onThemeChange?.(newMode)
  }, [storageKey, onThemeChange])

  const toggleMode = useCallback(() => {
    const newMode = effectiveMode === 'light' ? 'dark' : 'light'
    setMode(newMode)
  }, [effectiveMode, setMode])

  const updateTokens = useCallback((newTokens: Partial<DesignTokens>) => {
    if (!enableCustomization) return

    const updatedTokens = { ...customTokens, ...newTokens }
    setCustomTokens(updatedTokens)
    
    // Persist to storage
    try {
      localStorage.setItem(`${storageKey}-custom`, JSON.stringify(updatedTokens))
    } catch (error) {
      console.warn('Failed to save custom tokens to storage:', error)
    }
  }, [customTokens, enableCustomization, storageKey])

  const resetTokens = useCallback(() => {
    if (!enableCustomization) return

    setCustomTokens({})
    
    // Remove from storage
    try {
      localStorage.removeItem(`${storageKey}-custom`)
    } catch (error) {
      console.warn('Failed to remove custom tokens from storage:', error)
    }
  }, [enableCustomization, storageKey])

  // Context value
  const contextValue: ThemeContextValue = {
    mode,
    config: { ...config, tokens: mergedTokens },
    tokens: mergedTokens,
    setMode,
    toggleMode,
    customTokens,
    updateTokens,
    resetTokens,
    systemPreference,
    prefersReducedMotion,
    isDark: effectiveMode === 'dark',
    isLight: effectiveMode === 'light',
    isAuto: mode === 'auto',
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// ===== THEME HOOK =====

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

// ===== UTILITY FUNCTIONS =====

/**
 * Apply custom tokens to DOM as CSS custom properties
 */
function applyCustomTokensToDOM(tokens: Partial<DesignTokens>): void {
  const root = document.documentElement
  
  // Apply color tokens
  if (tokens.colors) {
    Object.entries(tokens.colors).forEach(([category, colors]) => {
      if (typeof colors === 'object' && colors !== null) {
        Object.entries(colors).forEach(([key, value]) => {
          if (typeof value === 'string') {
            root.style.setProperty(`--color-${category}-${key}`, value)
          }
        })
      }
    })
  }
  
  // Apply typography tokens
  if (tokens.typography) {
    const { fontSizes, fontWeights, lineHeights, letterSpacing } = tokens.typography
    
    if (fontSizes) {
      Object.entries(fontSizes).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value)
      })
    }
    
    if (fontWeights) {
      Object.entries(fontWeights).forEach(([key, value]) => {
        root.style.setProperty(`--font-weight-${key}`, String(value))
      })
    }
    
    if (lineHeights) {
      Object.entries(lineHeights).forEach(([key, value]) => {
        root.style.setProperty(`--line-height-${key}`, String(value))
      })
    }
    
    if (letterSpacing) {
      Object.entries(letterSpacing).forEach(([key, value]) => {
        root.style.setProperty(`--letter-spacing-${key}`, value)
      })
    }
  }
  
  // Apply spacing tokens
  if (tokens.spacing) {
    Object.entries(tokens.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value)
    })
  }
  
  // Apply other token categories as needed
}

// ===== THEME UTILITIES =====

/**
 * Get CSS custom property value for a token
 */
export function getTokenValue(path: string): string {
  return `var(--${path.replace(/\./g, '-')})`
}

/**
 * Get color value with HSL wrapper
 */
export function getColorValue(colorPath: string): string {
  return `hsl(var(--color-${colorPath.replace(/\./g, '-')}))`
}

/**
 * Create theme-aware CSS classes
 */
export function createThemeClasses(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`
}

/**
 * Get current theme mode from DOM
 */
export function getCurrentThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  
  const root = document.documentElement
  
  if (root.classList.contains('dark')) return 'dark'
  if (root.classList.contains('light')) return 'light'
  
  return 'light'
}

// ===== THEME DETECTION HOOK =====

/**
 * Hook for detecting system theme changes
 */
export function useSystemTheme(): 'light' | 'dark' {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return systemTheme
}

// ===== REDUCED MOTION HOOK =====

/**
 * Hook for detecting reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// ===== EXPORTS =====

export default ThemeProvider

// ===== USAGE EXAMPLES =====

/*
// Basic Theme Provider
<ThemeProvider defaultMode="light">
  <App />
</ThemeProvider>

// Theme Provider with customization
<ThemeProvider
  defaultMode="auto"
  enableSystemDetection
  enableCustomization
  customTokens={{
    colors: {
      brand: {
        primary: '#FF6B35',
        secondary: '#004E89',
      }
    }
  }}
  onThemeChange={(mode) => console.log('Theme changed to:', mode)}
>
  <App />
</ThemeProvider>

// Using the theme hook
function MyComponent() {
  const { mode, isDark, toggleMode, updateTokens } = useTheme()
  
  return (
    <div>
      <p>Current theme: {mode}</p>
      <button onClick={toggleMode}>
        Switch to {isDark ? 'light' : 'dark'} mode
      </button>
      <button onClick={() => updateTokens({
        colors: { brand: { primary: '#FF0000' } }
      })}>
        Customize primary color
      </button>
    </div>
  )
}

// System theme detection
function ThemeDetector() {
  const systemTheme = useSystemTheme()
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div>
      <p>System prefers: {systemTheme}</p>
      <p>Reduced motion: {prefersReducedMotion ? 'Yes' : 'No'}</p>
    </div>
  )
}
*/