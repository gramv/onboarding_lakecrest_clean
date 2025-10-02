/**
 * CSS Custom Properties Generator
 * Generates CSS custom properties from design tokens with fallback support
 */

import { designTokens, themeVariants } from './index'
import type { DesignTokens, ColorScale, ThemeMode } from './types'

// ===== UTILITY FUNCTIONS =====

/**
 * Converts a nested object to CSS custom properties
 */
function objectToCSSProperties(
  obj: Record<string, any>,
  prefix: string = '',
  separator: string = '-'
): Record<string, string> {
  const result: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const cssKey = prefix ? `${prefix}${separator}${key}` : key
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively process nested objects
      Object.assign(result, objectToCSSProperties(value, cssKey, separator))
    } else if (Array.isArray(value)) {
      // Handle arrays (like font families)
      result[`--${cssKey}`] = value.join(', ')
    } else {
      // Handle primitive values
      result[`--${cssKey}`] = String(value)
    }
  }
  
  return result
}

/**
 * Converts color scale to HSL values for better CSS manipulation
 */
function colorScaleToHSL(colorScale: ColorScale): Record<string, string> {
  const result: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(colorScale)) {
    // Convert hex to HSL (simplified - in production, use a proper color library)
    result[key] = hexToHSL(value)
  }
  
  return result
}

/**
 * Simple hex to HSL conversion (for demonstration - use a proper library in production)
 */
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// ===== CSS GENERATION FUNCTIONS =====

/**
 * Generates CSS custom properties for colors
 */
export function generateColorProperties(tokens: DesignTokens['colors']): string {
  const properties: string[] = []
  
  // Brand colors
  properties.push('  /* Brand Colors */')
  for (const [key, value] of Object.entries(tokens.brand)) {
    properties.push(`  --color-brand-${key}: ${hexToHSL(value)};`)
  }
  
  // Semantic colors
  properties.push('\n  /* Semantic Colors */')
  for (const [category, colorScale] of Object.entries(tokens.semantic)) {
    for (const [shade, value] of Object.entries(colorScale)) {
      properties.push(`  --color-${category}-${shade}: ${hexToHSL(value)};`)
    }
  }
  
  // Neutral colors
  properties.push('\n  /* Neutral Colors */')
  for (const [key, value] of Object.entries(tokens.neutral)) {
    if (key === 'white' || key === 'black') {
      properties.push(`  --color-neutral-${key}: ${hexToHSL(value)};`)
    } else {
      properties.push(`  --color-neutral-${key}: ${hexToHSL(value)};`)
    }
  }
  
  // Surface colors
  properties.push('\n  /* Surface Colors */')
  for (const [key, value] of Object.entries(tokens.surface)) {
    properties.push(`  --color-surface-${key}: ${typeof value === 'string' && value.startsWith('#') ? hexToHSL(value) : value};`)
  }
  
  // Text colors
  properties.push('\n  /* Text Colors */')
  for (const [key, value] of Object.entries(tokens.text)) {
    properties.push(`  --color-text-${key}: ${hexToHSL(value)};`)
  }
  
  // Border colors
  properties.push('\n  /* Border Colors */')
  for (const [key, value] of Object.entries(tokens.border)) {
    properties.push(`  --color-border-${key}: ${hexToHSL(value)};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for typography
 */
export function generateTypographyProperties(tokens: DesignTokens['typography']): string {
  const properties: string[] = []
  
  // Font families
  properties.push('  /* Font Families */')
  for (const [key, value] of Object.entries(tokens.fontFamilies)) {
    properties.push(`  --font-family-${key}: ${value.join(', ')};`)
  }
  
  // Font sizes
  properties.push('\n  /* Font Sizes */')
  for (const [key, value] of Object.entries(tokens.fontSizes)) {
    properties.push(`  --font-size-${key}: ${value};`)
  }
  
  // Font weights
  properties.push('\n  /* Font Weights */')
  for (const [key, value] of Object.entries(tokens.fontWeights)) {
    properties.push(`  --font-weight-${key}: ${value};`)
  }
  
  // Line heights
  properties.push('\n  /* Line Heights */')
  for (const [key, value] of Object.entries(tokens.lineHeights)) {
    properties.push(`  --line-height-${key}: ${value};`)
  }
  
  // Letter spacing
  properties.push('\n  /* Letter Spacing */')
  for (const [key, value] of Object.entries(tokens.letterSpacing)) {
    properties.push(`  --letter-spacing-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for spacing
 */
export function generateSpacingProperties(tokens: DesignTokens['spacing']): string {
  const properties: string[] = []
  
  properties.push('  /* Spacing Scale */')
  for (const [key, value] of Object.entries(tokens)) {
    properties.push(`  --spacing-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for shadows
 */
export function generateShadowProperties(tokens: DesignTokens['shadows']): string {
  const properties: string[] = []
  
  properties.push('  /* Shadow Scale */')
  for (const [key, value] of Object.entries(tokens)) {
    properties.push(`  --shadow-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for border radius
 */
export function generateBorderRadiusProperties(tokens: DesignTokens['borderRadius']): string {
  const properties: string[] = []
  
  properties.push('  /* Border Radius Scale */')
  for (const [key, value] of Object.entries(tokens)) {
    properties.push(`  --border-radius-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for breakpoints
 */
export function generateBreakpointProperties(tokens: DesignTokens['breakpoints']): string {
  const properties: string[] = []
  
  properties.push('  /* Breakpoints */')
  for (const [key, value] of Object.entries(tokens)) {
    properties.push(`  --breakpoint-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for animations
 */
export function generateAnimationProperties(tokens: DesignTokens['animations']): string {
  const properties: string[] = []
  
  // Duration
  properties.push('  /* Animation Duration */')
  for (const [key, value] of Object.entries(tokens.duration)) {
    properties.push(`  --duration-${key}: ${value};`)
  }
  
  // Easing
  properties.push('\n  /* Animation Easing */')
  for (const [key, value] of Object.entries(tokens.easing)) {
    properties.push(`  --easing-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates CSS custom properties for z-index
 */
export function generateZIndexProperties(tokens: DesignTokens['zIndex']): string {
  const properties: string[] = []
  
  properties.push('  /* Z-Index Scale */')
  for (const [key, value] of Object.entries(tokens)) {
    properties.push(`  --z-index-${key}: ${value};`)
  }
  
  return properties.join('\n')
}

/**
 * Generates complete CSS custom properties for a theme
 */
export function generateThemeCSS(tokens: DesignTokens, mode: ThemeMode = 'light'): string {
  const css = `
/* Design System CSS Custom Properties - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Theme */

:root${mode === 'dark' ? '.dark' : ''} {
${generateColorProperties(tokens.colors)}

${generateTypographyProperties(tokens.typography)}

${generateSpacingProperties(tokens.spacing)}

${generateShadowProperties(tokens.shadows)}

${generateBorderRadiusProperties(tokens.borderRadius)}

${generateBreakpointProperties(tokens.breakpoints)}

${generateAnimationProperties(tokens.animations)}

${generateZIndexProperties(tokens.zIndex)}
}
`
  
  return css.trim()
}

/**
 * Generates CSS for all theme variants
 */
export function generateAllThemesCSS(): string {
  const lightCSS = generateThemeCSS(themeVariants.light.tokens, 'light')
  const darkCSS = generateThemeCSS(themeVariants.dark.tokens, 'dark')
  
  return `${lightCSS}\n\n${darkCSS}`
}

/**
 * Generates CSS keyframes from animation tokens
 */
export function generateKeyframesCSS(tokens: DesignTokens['animations']): string {
  const keyframes: string[] = []
  
  for (const [name, definition] of Object.entries(tokens.keyframes)) {
    keyframes.push(`
@keyframes ${name} {
${definition}
}`)
  }
  
  return keyframes.join('\n')
}

/**
 * Generates utility classes based on design tokens
 */
export function generateUtilityClasses(tokens: DesignTokens): string {
  const utilities: string[] = []
  
  // Spacing utilities
  utilities.push('/* Spacing Utilities */')
  for (const [key, value] of Object.entries(tokens.spacing)) {
    utilities.push(`.p-${key} { padding: var(--spacing-${key}); }`)
    utilities.push(`.m-${key} { margin: var(--spacing-${key}); }`)
    utilities.push(`.gap-${key} { gap: var(--spacing-${key}); }`)
  }
  
  // Color utilities
  utilities.push('\n/* Color Utilities */')
  utilities.push('.text-brand-primary { color: hsl(var(--color-brand-primary)); }')
  utilities.push('.bg-brand-primary { background-color: hsl(var(--color-brand-primary)); }')
  utilities.push('.border-brand-primary { border-color: hsl(var(--color-brand-primary)); }')
  
  // Typography utilities
  utilities.push('\n/* Typography Utilities */')
  for (const [key] of Object.entries(tokens.typography.fontSizes)) {
    utilities.push(`.text-${key} { font-size: var(--font-size-${key}); }`)
  }
  
  // Shadow utilities
  utilities.push('\n/* Shadow Utilities */')
  for (const [key] of Object.entries(tokens.shadows)) {
    utilities.push(`.shadow-${key} { box-shadow: var(--shadow-${key}); }`)
  }
  
  // Border radius utilities
  utilities.push('\n/* Border Radius Utilities */')
  for (const [key] of Object.entries(tokens.borderRadius)) {
    utilities.push(`.rounded-${key} { border-radius: var(--border-radius-${key}); }`)
  }
  
  return utilities.join('\n')
}

/**
 * Generates responsive utilities with mobile-first approach
 */
export function generateResponsiveUtilities(tokens: DesignTokens): string {
  const utilities: string[] = []
  
  utilities.push('/* Responsive Utilities */')
  
  // Container utilities
  utilities.push(`
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--spacing-4);
  padding-right: var(--spacing-4);
}

@media (min-width: var(--breakpoint-sm)) {
  .container { max-width: var(--breakpoint-sm); padding-left: var(--spacing-6); padding-right: var(--spacing-6); }
}

@media (min-width: var(--breakpoint-md)) {
  .container { max-width: var(--breakpoint-md); padding-left: var(--spacing-8); padding-right: var(--spacing-8); }
}

@media (min-width: var(--breakpoint-lg)) {
  .container { max-width: var(--breakpoint-lg); }
}

@media (min-width: var(--breakpoint-xl)) {
  .container { max-width: var(--breakpoint-xl); }
}

@media (min-width: var(--breakpoint-2xl)) {
  .container { max-width: var(--breakpoint-2xl); }
}`)
  
  // Grid utilities
  utilities.push(`
.grid-responsive {
  display: grid;
  gap: var(--spacing-4);
  grid-template-columns: 1fr;
}

@media (min-width: var(--breakpoint-sm)) {
  .grid-responsive { grid-template-columns: repeat(2, 1fr); gap: var(--spacing-6); }
}

@media (min-width: var(--breakpoint-md)) {
  .grid-responsive { grid-template-columns: repeat(3, 1fr); gap: var(--spacing-8); }
}

@media (min-width: var(--breakpoint-lg)) {
  .grid-responsive { grid-template-columns: repeat(4, 1fr); }
}`)
  
  return utilities.join('\n')
}

// ===== MAIN EXPORT =====

/**
 * Generates the complete CSS file with all design tokens
 */
export function generateCompleteCSS(): string {
  const sections = [
    '/* Design System - Generated CSS Custom Properties */',
    '',
    generateAllThemesCSS(),
    '',
    generateKeyframesCSS(designTokens.animations),
    '',
    generateUtilityClasses(designTokens),
    '',
    generateResponsiveUtilities(designTokens),
  ]
  
  return sections.join('\n')
}

export default {
  generateThemeCSS,
  generateAllThemesCSS,
  generateKeyframesCSS,
  generateUtilityClasses,
  generateResponsiveUtilities,
  generateCompleteCSS,
}