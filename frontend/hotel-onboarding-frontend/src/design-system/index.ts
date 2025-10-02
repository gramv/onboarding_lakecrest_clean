/**
 * Design System - Main Export
 * Comprehensive design system for the hotel management platform
 */

// ===== DESIGN TOKENS =====
export { 
  designTokens as default,
  designTokens,
  themeVariants,
  componentTokens,
  responsiveTokens,
  accessibilityTokens,
  colorTokens,
  typographyTokens,
  spacingTokens,
  shadowTokens,
  borderRadiusTokens,
  breakpointTokens,
  animationTokens,
  zIndexTokens,
} from './tokens'

// ===== TOKEN TYPES =====
export type {
  DesignTokens,
  ThemeVariants,
  ThemeMode,
  ThemeConfig,
  ComponentTokens,
  ResponsiveTokens,
  AccessibilityTokens,
  ColorScale,
  ColorTokens,
  BrandColors,
  SemanticColors,
  NeutralColors,
  TypographyTokens,
  FontFamilyTokens,
  FontSizeScale,
  FontWeightScale,
  LineHeightScale,
  LetterSpacingScale,
  SpacingScale,
  ShadowScale,
  BorderRadiusScale,
  BreakpointTokens,
  AnimationTokens,
  ZIndexTokens,
} from './tokens/types'

// ===== TOKEN GENERATORS =====
export { 
  tokenGenerators,
  generateColorScale,
  generateSemanticColors,
  generateAccessibleColorPairs,
  generateSpacingScale,
  generateResponsiveSpacing,
  generateTypographyScale,
  generateLineHeights,
  generateShadowScale,
  generateColoredShadows,
  generateAnimationDurations,
  generateEasingCurves,
  generateBreakpoints,
  generateContainerSizes,
  validateColorContrast,
  generateAccessibleVariants,
} from './tokens/generators'

// ===== CSS GENERATORS =====
export {
  generateThemeCSS,
  generateAllThemesCSS,
  generateKeyframesCSS,
  generateUtilityClasses,
  generateResponsiveUtilities,
  generateCompleteCSS,
  generateColorProperties,
  generateTypographyProperties,
  generateSpacingProperties,
  generateShadowProperties,
  generateBorderRadiusProperties,
  generateBreakpointProperties,
  generateAnimationProperties,
  generateZIndexProperties,
} from './tokens/css-generator'

// ===== RESPONSIVE UTILITIES =====
export {
  breakpoints,
  breakpointRanges,
  containerSizes,
  containerPadding,
  gridColumns,
  gridGaps,
  typographyScale,
  responsiveFontSizes,
  spacingMultipliers,
  componentSpacing,
  buttonSizes,
  inputSizes,
  responsiveUtils,
  mediaQuery,
  responsiveProperty,
  responsiveGrid,
  responsiveContainer,
} from './tokens/responsive'

// ===== DESIGN SYSTEM UTILITIES =====

/**
 * Get a design token value by path
 * @param path - Dot notation path to the token (e.g., 'colors.brand.primary')
 * @param tokens - Token object to search in (defaults to designTokens)
 * @returns Token value or undefined if not found
 */
export function getToken(path: string, tokens: any = designTokens): any {
  return path.split('.').reduce((obj, key) => obj?.[key], tokens)
}

/**
 * Get a CSS custom property name for a token path
 * @param path - Dot notation path to the token
 * @returns CSS custom property name
 */
export function getTokenVar(path: string): string {
  return `var(--${path.replace(/\./g, '-')})`
}

/**
 * Get a color value with HSL function wrapper
 * @param colorPath - Path to color token
 * @returns HSL color value ready for CSS
 */
export function getColorValue(colorPath: string): string {
  return `hsl(var(--color-${colorPath.replace(/\./g, '-')}))`
}

/**
 * Get responsive breakpoint media query
 * @param breakpoint - Breakpoint name
 * @param type - Query type ('min' or 'max')
 * @returns Media query string
 */
export function getBreakpoint(breakpoint: keyof BreakpointTokens, type: 'min' | 'max' = 'min'): string {
  const value = getToken(`breakpoints.${breakpoint}`)
  return `@media (${type}-width: ${value})`
}

/**
 * Get spacing value
 * @param size - Spacing size key
 * @returns Spacing value
 */
export function getSpacing(size: keyof SpacingScale): string {
  return getTokenVar(`spacing.${size}`)
}

/**
 * Get shadow value
 * @param size - Shadow size key
 * @returns Shadow value
 */
export function getShadow(size: keyof ShadowScale): string {
  return getTokenVar(`shadow.${size}`)
}

/**
 * Get border radius value
 * @param size - Border radius size key
 * @returns Border radius value
 */
export function getBorderRadius(size: keyof BorderRadiusScale): string {
  return getTokenVar(`border-radius.${size}`)
}

/**
 * Get font size value with line height
 * @param size - Font size key
 * @returns Font size value
 */
export function getFontSize(size: keyof FontSizeScale): string {
  return getTokenVar(`font-size.${size}`)
}

/**
 * Get animation duration value
 * @param duration - Duration key
 * @returns Duration value
 */
export function getDuration(duration: keyof AnimationTokens['duration']): string {
  return getTokenVar(`duration.${duration}`)
}

/**
 * Get easing function value
 * @param easing - Easing key
 * @returns Easing function value
 */
export function getEasing(easing: keyof AnimationTokens['easing']): string {
  return getTokenVar(`easing.${easing}`)
}

/**
 * Get z-index value
 * @param layer - Z-index layer key
 * @returns Z-index value
 */
export function getZIndex(layer: keyof ZIndexTokens): string {
  return getTokenVar(`z-index.${layer}`)
}

// ===== THEME UTILITIES =====

/**
 * Apply theme to document
 * @param theme - Theme mode ('light' | 'dark')
 */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  
  // Store theme preference
  localStorage.setItem('theme', theme)
}

/**
 * Get current theme from DOM or localStorage
 * @returns Current theme mode
 */
export function getCurrentTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  
  const stored = localStorage.getItem('theme') as ThemeMode
  if (stored && ['light', 'dark'].includes(stored)) {
    return stored
  }
  
  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  
  return 'light'
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): ThemeMode {
  const current = getCurrentTheme()
  const next = current === 'light' ? 'dark' : 'light'
  applyTheme(next)
  return next
}

/**
 * Initialize theme system
 */
export function initializeTheme(): void {
  const theme = getCurrentTheme()
  applyTheme(theme)
  
  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const stored = localStorage.getItem('theme')
      if (!stored || stored === 'auto') {
        applyTheme(e.matches ? 'dark' : 'light')
      }
    })
  }
}

// ===== DESIGN SYSTEM CONSTANTS =====

export const DESIGN_SYSTEM_VERSION = '1.0.0'

export const SUPPORTED_THEMES: ThemeMode[] = ['light', 'dark', 'auto']

export const DEFAULT_THEME: ThemeMode = 'light'

export const BREAKPOINT_ORDER: (keyof BreakpointTokens)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']

export const COLOR_SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

export const SPACING_SCALE_KEYS = [
  '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60',
  '64', '72', '80', '96'
] as const

export const FONT_SIZE_KEYS = [
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'
] as const

// ===== RE-EXPORTS FOR CONVENIENCE =====

// Re-export commonly used types
export type { BreakpointTokens } from './tokens/types'

// Re-export main design tokens for direct access
export { designTokens as tokens }