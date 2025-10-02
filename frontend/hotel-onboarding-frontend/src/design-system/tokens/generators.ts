/**
 * Token Generation System
 * Utilities for generating consistent color scales and spacing systems
 */

import type { ColorScale, SpacingScale } from './types'

// ===== COLOR GENERATION UTILITIES =====

/**
 * Generates a consistent color scale from a base color
 */
export function generateColorScale(baseColor: string, options?: {
  lightnessSteps?: number[]
  saturationAdjustment?: number
}): ColorScale {
  const { lightnessSteps, saturationAdjustment = 0 } = options || {}
  
  // Default lightness steps for a 11-step scale
  const defaultSteps = [95, 90, 80, 65, 50, 45, 35, 25, 15, 10, 5]
  const steps = lightnessSteps || defaultSteps
  
  // Parse base color (simplified - in production, use a proper color library)
  const hsl = parseHSL(baseColor)
  
  const scale: Partial<ColorScale> = {}
  const scaleKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const
  
  steps.forEach((lightness, index) => {
    if (index < scaleKeys.length) {
      const adjustedSaturation = Math.max(0, Math.min(100, hsl.s + saturationAdjustment))
      scale[scaleKeys[index]] = `hsl(${hsl.h}, ${adjustedSaturation}%, ${lightness}%)`
    }
  })
  
  return scale as ColorScale
}

/**
 * Generates a semantic color palette from brand colors
 */
export function generateSemanticColors(brandPrimary: string): {
  success: ColorScale
  warning: ColorScale
  error: ColorScale
  info: ColorScale
} {
  return {
    success: generateColorScale('hsl(142, 76%, 36%)', { saturationAdjustment: 5 }),
    warning: generateColorScale('hsl(39, 84%, 56%)', { saturationAdjustment: 0 }),
    error: generateColorScale('hsl(0, 84%, 60%)', { saturationAdjustment: 5 }),
    info: generateColorScale(brandPrimary, { saturationAdjustment: 0 }),
  }
}

/**
 * Generates accessible color combinations
 */
export function generateAccessibleColorPairs(backgroundColor: string): {
  primary: string
  secondary: string
  muted: string
} {
  const bgHSL = parseHSL(backgroundColor)
  const isLight = bgHSL.l > 50
  
  if (isLight) {
    return {
      primary: `hsl(${bgHSL.h}, ${Math.min(100, bgHSL.s + 20)}%, 15%)`,
      secondary: `hsl(${bgHSL.h}, ${Math.min(100, bgHSL.s + 10)}%, 25%)`,
      muted: `hsl(${bgHSL.h}, ${Math.max(0, bgHSL.s - 10)}%, 45%)`,
    }
  } else {
    return {
      primary: `hsl(${bgHSL.h}, ${Math.min(100, bgHSL.s + 20)}%, 95%)`,
      secondary: `hsl(${bgHSL.h}, ${Math.min(100, bgHSL.s + 10)}%, 85%)`,
      muted: `hsl(${bgHSL.h}, ${Math.max(0, bgHSL.s - 10)}%, 65%)`,
    }
  }
}

// ===== SPACING GENERATION UTILITIES =====

/**
 * Generates a consistent spacing scale based on a base unit
 */
export function generateSpacingScale(baseUnit: number = 4): SpacingScale {
  const scale: Partial<SpacingScale> = {}
  
  // Define the spacing multipliers
  const spacingMap = {
    0: 0,
    px: 0.25,
    0.5: 0.5,
    1: 1,
    1.5: 1.5,
    2: 2,
    2.5: 2.5,
    3: 3,
    3.5: 3.5,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
    14: 14,
    16: 16,
    20: 20,
    24: 24,
    28: 28,
    32: 32,
    36: 36,
    40: 40,
    44: 44,
    48: 48,
    52: 52,
    56: 56,
    60: 60,
    64: 64,
    72: 72,
    80: 80,
    96: 96,
  }
  
  for (const [key, multiplier] of Object.entries(spacingMap)) {
    if (key === '0') {
      scale[key as keyof SpacingScale] = '0px'
    } else if (key === 'px') {
      scale[key as keyof SpacingScale] = '1px'
    } else {
      const value = multiplier * baseUnit
      scale[key as keyof SpacingScale] = `${value / 16}rem` // Convert to rem
    }
  }
  
  return scale as SpacingScale
}

/**
 * Generates responsive spacing values
 */
export function generateResponsiveSpacing(baseSpacing: string): {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
} {
  const baseValue = parseFloat(baseSpacing)
  const unit = baseSpacing.replace(baseValue.toString(), '')
  
  return {
    xs: `${baseValue * 0.5}${unit}`,
    sm: `${baseValue * 0.75}${unit}`,
    md: baseSpacing,
    lg: `${baseValue * 1.5}${unit}`,
    xl: `${baseValue * 2}${unit}`,
    '2xl': `${baseValue * 3}${unit}`,
  }
}

// ===== TYPOGRAPHY GENERATION UTILITIES =====

/**
 * Generates a modular typography scale
 */
export function generateTypographyScale(
  baseSize: number = 16,
  ratio: number = 1.25
): Record<string, string> {
  const scale: Record<string, string> = {}
  
  const sizes = [
    { key: 'xs', step: -2 },
    { key: 'sm', step: -1 },
    { key: 'base', step: 0 },
    { key: 'lg', step: 1 },
    { key: 'xl', step: 2 },
    { key: '2xl', step: 3 },
    { key: '3xl', step: 4 },
    { key: '4xl', step: 5 },
    { key: '5xl', step: 6 },
    { key: '6xl', step: 7 },
    { key: '7xl', step: 8 },
    { key: '8xl', step: 9 },
    { key: '9xl', step: 10 },
  ]
  
  sizes.forEach(({ key, step }) => {
    const size = baseSize * Math.pow(ratio, step)
    scale[key] = `${size / 16}rem`
  })
  
  return scale
}

/**
 * Generates line heights based on font sizes
 */
export function generateLineHeights(fontSizes: Record<string, string>): Record<string, number> {
  const lineHeights: Record<string, number> = {}
  
  for (const [key, fontSize] of Object.entries(fontSizes)) {
    const size = parseFloat(fontSize)
    
    // Generate appropriate line heights based on font size
    if (size <= 0.875) { // xs, sm
      lineHeights[key] = 1.4
    } else if (size <= 1.125) { // base, lg
      lineHeights[key] = 1.5
    } else if (size <= 1.5) { // xl, 2xl
      lineHeights[key] = 1.4
    } else if (size <= 2.25) { // 3xl, 4xl
      lineHeights[key] = 1.3
    } else { // 5xl and above
      lineHeights[key] = 1.2
    }
  }
  
  return lineHeights
}

// ===== SHADOW GENERATION UTILITIES =====

/**
 * Generates a consistent shadow scale
 */
export function generateShadowScale(baseColor: string = 'rgb(0 0 0)'): Record<string, string> {
  return {
    none: 'none',
    sm: `0 1px 2px 0 ${baseColor} / 0.05)`,
    base: `0 1px 3px 0 ${baseColor} / 0.1), 0 1px 2px -1px ${baseColor} / 0.1)`,
    md: `0 4px 6px -1px ${baseColor} / 0.1), 0 2px 4px -2px ${baseColor} / 0.1)`,
    lg: `0 10px 15px -3px ${baseColor} / 0.1), 0 4px 6px -4px ${baseColor} / 0.1)`,
    xl: `0 20px 25px -5px ${baseColor} / 0.1), 0 8px 10px -6px ${baseColor} / 0.1)`,
    '2xl': `0 25px 50px -12px ${baseColor} / 0.25)`,
    inner: `inset 0 2px 4px 0 ${baseColor} / 0.05)`,
  }
}

/**
 * Generates colored shadows for brand elements
 */
export function generateColoredShadows(brandColor: string): Record<string, string> {
  const hsl = parseHSL(brandColor)
  const shadowColor = `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(0, hsl.l - 20)}%)`
  
  return {
    brand: `0 4px 14px 0 ${shadowColor} / 0.25)`,
    'brand-lg': `0 8px 25px 0 ${shadowColor} / 0.35)`,
    'brand-xl': `0 12px 35px 0 ${shadowColor} / 0.45)`,
  }
}

// ===== ANIMATION GENERATION UTILITIES =====

/**
 * Generates consistent animation durations
 */
export function generateAnimationDurations(baseDuration: number = 200): Record<string, string> {
  return {
    instant: '0ms',
    fast: `${baseDuration * 0.75}ms`,
    normal: `${baseDuration}ms`,
    slow: `${baseDuration * 1.5}ms`,
    slower: `${baseDuration * 2.5}ms`,
    slowest: `${baseDuration * 5}ms`,
  }
}

/**
 * Generates easing curves for different interaction types
 */
export function generateEasingCurves(): Record<string, string> {
  return {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  }
}

// ===== BREAKPOINT GENERATION UTILITIES =====

/**
 * Generates responsive breakpoints based on common device sizes
 */
export function generateBreakpoints(): Record<string, string> {
  return {
    xs: '475px',   // Large phones
    sm: '640px',   // Small tablets
    md: '768px',   // Tablets
    lg: '1024px',  // Small laptops
    xl: '1280px',  // Laptops
    '2xl': '1536px', // Large screens
  }
}

/**
 * Generates container max-widths for each breakpoint
 */
export function generateContainerSizes(breakpoints: Record<string, string>): Record<string, string> {
  const containers: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(breakpoints)) {
    // Container should be slightly smaller than breakpoint
    const breakpointValue = parseInt(value)
    containers[key] = `${breakpointValue - 40}px`
  }
  
  return containers
}

// ===== UTILITY FUNCTIONS =====

/**
 * Simple HSL parser (for demonstration - use a proper color library in production)
 */
function parseHSL(color: string): { h: number; s: number; l: number } {
  // Handle HSL format
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
    if (match) {
      return {
        h: parseInt(match[1]),
        s: parseInt(match[2]),
        l: parseInt(match[3]),
      }
    }
  }
  
  // Handle hex format (simplified conversion)
  if (color.startsWith('#')) {
    // This is a simplified conversion - use a proper color library in production
    return { h: 220, s: 83, l: 53 } // Default blue
  }
  
  // Default fallback
  return { h: 220, s: 83, l: 53 }
}

/**
 * Validates color contrast ratio
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): { isValid: boolean; ratio: number; required: number } {
  // Simplified contrast calculation - use a proper library in production
  const required = level === 'AAA' ? 7 : 4.5
  const ratio = 4.5 // Placeholder - implement proper contrast calculation
  
  return {
    isValid: ratio >= required,
    ratio,
    required,
  }
}

/**
 * Generates accessible color variants
 */
export function generateAccessibleVariants(baseColor: string): {
  light: string
  dark: string
  contrast: string
} {
  const hsl = parseHSL(baseColor)
  
  return {
    light: `hsl(${hsl.h}, ${Math.max(0, hsl.s - 20)}%, ${Math.min(100, hsl.l + 30)}%)`,
    dark: `hsl(${hsl.h}, ${Math.min(100, hsl.s + 10)}%, ${Math.max(0, hsl.l - 30)}%)`,
    contrast: hsl.l > 50 
      ? `hsl(${hsl.h}, ${hsl.s}%, 10%)` 
      : `hsl(${hsl.h}, ${hsl.s}%, 90%)`,
  }
}

// ===== EXPORTS =====

export const tokenGenerators = {
  // Color generators
  generateColorScale,
  generateSemanticColors,
  generateAccessibleColorPairs,
  generateColoredShadows,
  generateAccessibleVariants,
  
  // Spacing generators
  generateSpacingScale,
  generateResponsiveSpacing,
  
  // Typography generators
  generateTypographyScale,
  generateLineHeights,
  
  // Shadow generators
  generateShadowScale,
  
  // Animation generators
  generateAnimationDurations,
  generateEasingCurves,
  
  // Breakpoint generators
  generateBreakpoints,
  generateContainerSizes,
  
  // Validation utilities
  validateColorContrast,
}

export default tokenGenerators