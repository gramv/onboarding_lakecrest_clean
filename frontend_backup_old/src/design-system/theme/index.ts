/**
 * Theme System - Main Export
 * Complete theme system with provider, customization, and persistence
 */

// ===== THEME PROVIDER =====
export { 
  ThemeProvider as default,
  ThemeProvider,
  useTheme,
  getTokenValue,
  getColorValue,
  createThemeClasses,
  getCurrentThemeMode,
  useSystemTheme,
  useReducedMotion,
} from './ThemeProvider'

// ===== THEME CUSTOMIZER =====
export {
  ThemeCustomizer,
  ThemeCustomizerModal,
  ThemeToggle,
} from './ThemeCustomizer'

// ===== STYLED COMPONENTS =====
export {
  styled,
  css,
  keyframes,
  createGlobalStyle,
  useStyledTheme,
  useDynamicStyles,
} from './styled'

// ===== PREFERENCES =====
export {
  PreferenceManager,
  usePreferences,
  usePreference,
} from './preferences'

export type {
  UserPreferences,
  DashboardWidget,
  DashboardLayout,
  NotificationCategory,
} from './preferences'

// ===== THEME UTILITIES =====

import { useTheme } from './ThemeProvider'
import type { DesignTokens, ThemeMode } from '../tokens/types'

/**
 * Hook for accessing design tokens
 */
export function useDesignTokens(): DesignTokens {
  const { tokens } = useTheme()
  return tokens
}

/**
 * Hook for theme mode utilities
 */
export function useThemeMode() {
  const { mode, setMode, toggleMode, isDark, isLight, isAuto } = useTheme()
  
  return {
    mode,
    setMode,
    toggleMode,
    isDark,
    isLight,
    isAuto,
  }
}

/**
 * Hook for theme customization
 */
export function useThemeCustomization() {
  const { customTokens, updateTokens, resetTokens } = useTheme()
  
  return {
    customTokens,
    updateTokens,
    resetTokens,
  }
}

/**
 * Hook for accessibility preferences
 */
export function useAccessibility() {
  const { prefersReducedMotion } = useTheme()
  
  return {
    prefersReducedMotion,
  }
}

// ===== THEME CONSTANTS =====

export const THEME_STORAGE_KEY = 'hotel-theme'
export const CUSTOM_TOKENS_STORAGE_KEY = 'hotel-theme-custom'

export const SUPPORTED_THEME_MODES: ThemeMode[] = ['light', 'dark', 'auto']

export const DEFAULT_THEME_MODE: ThemeMode = 'light'

// ===== THEME CONFIGURATION =====

export interface ThemeSystemConfig {
  defaultMode?: ThemeMode
  storageKey?: string
  enableSystemDetection?: boolean
  enableCustomization?: boolean
  enableCloudSync?: boolean
  syncInterval?: number
  apiEndpoint?: string
}

export const DEFAULT_THEME_CONFIG: ThemeSystemConfig = {
  defaultMode: 'light',
  storageKey: THEME_STORAGE_KEY,
  enableSystemDetection: true,
  enableCustomization: true,
  enableCloudSync: false,
  syncInterval: 60000, // 1 minute
}

// ===== THEME SETUP UTILITIES =====

/**
 * Initialize theme system with configuration
 */
export function initializeThemeSystem(config: ThemeSystemConfig = {}) {
  const finalConfig = { ...DEFAULT_THEME_CONFIG, ...config }
  
  // Apply initial theme
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(finalConfig.storageKey!)
    const mode = (stored as ThemeMode) || finalConfig.defaultMode!
    
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(mode === 'auto' ? 'light' : mode)
  }
  
  return finalConfig
}

/**
 * Create theme provider with configuration
 */
export function createThemeProvider(config: ThemeSystemConfig = {}) {
  const finalConfig = initializeThemeSystem(config)
  
  return function ConfiguredThemeProvider({ children }: { children: React.ReactNode }) {
    return React.createElement(ThemeProvider, {
      defaultMode: finalConfig.defaultMode,
      storageKey: finalConfig.storageKey,
      enableSystemDetection: finalConfig.enableSystemDetection,
      enableCustomization: finalConfig.enableCustomization
    }, children)
  }
}

// ===== THEME VALIDATION =====

/**
 * Validate theme mode
 */
export function isValidThemeMode(mode: string): mode is ThemeMode {
  return SUPPORTED_THEME_MODES.includes(mode as ThemeMode)
}

/**
 * Validate custom tokens
 */
export function validateCustomTokens(tokens: any): tokens is Partial<DesignTokens> {
  if (!tokens || typeof tokens !== 'object') return false
  
  // Basic validation - could be expanded
  const validKeys = ['colors', 'typography', 'spacing', 'shadows', 'borderRadius', 'breakpoints', 'animations', 'zIndex']
  
  return Object.keys(tokens).every(key => validKeys.includes(key))
}

// ===== THEME MIGRATION =====

/**
 * Migrate old theme preferences to new format
 */
export function migrateThemePreferences(oldPrefs: any): Partial<DesignTokens> {
  // Handle migration from old theme format
  if (!oldPrefs) return {}
  
  const migrated: Partial<DesignTokens> = {}
  
  // Migrate colors
  if (oldPrefs.colors) {
    migrated.colors = oldPrefs.colors
  }
  
  // Migrate other properties as needed
  
  return migrated
}

// ===== THEME DEBUGGING =====

/**
 * Debug theme system
 */
export function debugTheme() {
  if (typeof window === 'undefined') return
  
  const theme = {
    mode: getCurrentThemeMode(),
    systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    stored: localStorage.getItem(THEME_STORAGE_KEY),
    customTokens: localStorage.getItem(CUSTOM_TOKENS_STORAGE_KEY),
  }
  
  console.group('🎨 Theme Debug Info')
  console.table(theme)
  console.groupEnd()
  
  return theme
}

// ===== THEME PERFORMANCE =====

/**
 * Preload theme assets
 */
export function preloadThemeAssets(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  
  // Preload theme-specific assets
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'style'
  link.href = `/themes/${mode}.css`
  document.head.appendChild(link)
}

/**
 * Optimize theme switching performance
 */
export function optimizeThemeSwitching() {
  if (typeof window === 'undefined') return
  
  // Add CSS to prevent flash of unstyled content
  const style = document.createElement('style')
  style.textContent = `
    * {
      transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
    }
  `
  document.head.appendChild(style)
  
  // Remove after theme is applied
  setTimeout(() => {
    document.head.removeChild(style)
  }, 300)
}

// ===== THEME ANALYTICS =====

/**
 * Track theme usage analytics
 */
export function trackThemeUsage(mode: ThemeMode, customizations?: Partial<DesignTokens>) {
  // Send analytics data
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', 'theme_change', {
      theme_mode: mode,
      has_customizations: !!customizations && Object.keys(customizations).length > 0,
      timestamp: new Date().toISOString(),
    })
  }
}

// ===== EXPORTS =====

export * from '../tokens/types'

// Re-export for convenience
export { designTokens, themeVariants } from '../tokens'

// ===== USAGE EXAMPLES =====

/*
// Basic setup
import { ThemeProvider } from '@/design-system/theme'

function App() {
  return (
    <ThemeProvider defaultMode="auto" enableCustomization>
      <MyApp />
    </ThemeProvider>
  )
}

// Advanced setup with configuration
import { createThemeProvider, initializeThemeSystem } from '@/design-system/theme'

const config = {
  defaultMode: 'light' as const,
  enableSystemDetection: true,
  enableCustomization: true,
  enableCloudSync: true,
  apiEndpoint: '/api/preferences',
}

initializeThemeSystem(config)
const ConfiguredThemeProvider = createThemeProvider(config)

function App() {
  return (
    <ConfiguredThemeProvider>
      <MyApp />
    </ConfiguredThemeProvider>
  )
}

// Using theme hooks
import { useTheme, useThemeMode, useDesignTokens } from '@/design-system/theme'

function MyComponent() {
  const { mode, isDark } = useThemeMode()
  const tokens = useDesignTokens()
  const { updateTokens } = useThemeCustomization()
  
  return (
    <div style={{ 
      backgroundColor: tokens.colors.surface.primary,
      color: tokens.colors.text.primary 
    }}>
      <p>Current theme: {mode}</p>
      <button onClick={() => updateTokens({
        colors: { brand: { primary: '#ff0000' } }
      })}>
        Customize
      </button>
    </div>
  )
}

// Theme customizer
import { ThemeCustomizerModal, ThemeToggle } from '@/design-system/theme'

function Settings() {
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  return (
    <div>
      <ThemeToggle />
      <button onClick={() => setShowCustomizer(true)}>
        Customize Theme
      </button>
      
      <ThemeCustomizerModal
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </div>
  )
}

// Styled components with theme
import { styled, css } from '@/design-system/theme'

const ThemedButton = styled.button`
  background: ${css.color('brand.primary')};
  color: ${css.color('text.inverse')};
  padding: ${css.spacing('4')} ${css.spacing('6')};
  border-radius: ${css.borderRadius('lg')};
  
  ${css.dark(`
    background: ${css.color('brand.primary')};
    box-shadow: ${css.shadow('lg')};
  `)}
`
*/