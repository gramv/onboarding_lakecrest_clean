/**
 * Responsive Design Tokens
 * Mobile-first responsive breakpoint system and utilities
 */

import type { BreakpointTokens, ResponsiveTokens } from './types'

// ===== BREAKPOINT DEFINITIONS =====

/**
 * Mobile-first breakpoint system
 * Based on common device sizes and usage patterns
 */
export const breakpoints: BreakpointTokens = {
  xs: '475px',   // Large phones (iPhone 12 Pro Max: 428px)
  sm: '640px',   // Small tablets (iPad Mini: 768px in portrait)
  md: '768px',   // Tablets (iPad: 768px)
  lg: '1024px',  // Small laptops (iPad Pro: 1024px)
  xl: '1280px',  // Laptops (MacBook Air: 1280px)
  '2xl': '1536px', // Large screens (MacBook Pro 16": 1536px)
}

/**
 * Breakpoint ranges for media queries
 */
export const breakpointRanges = {
  mobile: `(max-width: ${breakpoints.sm})`,
  tablet: `(min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.lg})`,
  desktop: `(min-width: ${breakpoints.lg})`,
  
  // Specific ranges
  xs: `(max-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.xs}) and (max-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.md}) and (max-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.lg}) and (max-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints.xl})`,
  
  // Min-width queries (mobile-first)
  'min-xs': `(min-width: ${breakpoints.xs})`,
  'min-sm': `(min-width: ${breakpoints.sm})`,
  'min-md': `(min-width: ${breakpoints.md})`,
  'min-lg': `(min-width: ${breakpoints.lg})`,
  'min-xl': `(min-width: ${breakpoints.xl})`,
  'min-2xl': `(min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries (desktop-first, use sparingly)
  'max-xs': `(max-width: ${breakpoints.xs})`,
  'max-sm': `(max-width: ${breakpoints.sm})`,
  'max-md': `(max-width: ${breakpoints.md})`,
  'max-lg': `(max-width: ${breakpoints.lg})`,
  'max-xl': `(max-width: ${breakpoints.xl})`,
  'max-2xl': `(max-width: ${breakpoints['2xl']})`,
}

// ===== RESPONSIVE CONTAINER SYSTEM =====

/**
 * Container max-widths for each breakpoint
 */
export const containerSizes = {
  xs: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

/**
 * Container padding for each breakpoint
 */
export const containerPadding = {
  xs: '1rem',      // 16px
  sm: '1.5rem',    // 24px
  md: '2rem',      // 32px
  lg: '2.5rem',    // 40px
  xl: '3rem',      // 48px
  '2xl': '4rem',   // 64px
}

// ===== RESPONSIVE GRID SYSTEM =====

/**
 * Grid column counts for each breakpoint
 */
export const gridColumns = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
  '2xl': 6,
}

/**
 * Grid gap sizes for each breakpoint
 */
export const gridGaps = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',   // 12px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '2.5rem', // 40px
}

// ===== RESPONSIVE TYPOGRAPHY SCALE =====

/**
 * Typography scale multipliers for each breakpoint
 */
export const typographyScale = {
  xs: 0.875,   // 87.5% of base size
  sm: 0.9375,  // 93.75% of base size
  md: 1,       // Base size
  lg: 1.0625,  // 106.25% of base size
  xl: 1.125,   // 112.5% of base size
  '2xl': 1.25, // 125% of base size
}

/**
 * Responsive font sizes for common text elements
 */
export const responsiveFontSizes = {
  // Display text
  'display-xl': {
    xs: '2.25rem',   // 36px
    sm: '2.5rem',    // 40px
    md: '3rem',      // 48px
    lg: '3.75rem',   // 60px
    xl: '4.5rem',    // 72px
    '2xl': '6rem',   // 96px
  },
  'display-lg': {
    xs: '1.875rem',  // 30px
    sm: '2.25rem',   // 36px
    md: '2.5rem',    // 40px
    lg: '3rem',      // 48px
    xl: '3.75rem',   // 60px
    '2xl': '4.5rem', // 72px
  },
  'display-md': {
    xs: '1.5rem',    // 24px
    sm: '1.875rem',  // 30px
    md: '2.25rem',   // 36px
    lg: '2.5rem',    // 40px
    xl: '3rem',      // 48px
    '2xl': '3.75rem', // 60px
  },
  
  // Heading text
  'heading-xl': {
    xs: '1.25rem',   // 20px
    sm: '1.5rem',    // 24px
    md: '1.875rem',  // 30px
    lg: '2.25rem',   // 36px
    xl: '2.5rem',    // 40px
    '2xl': '3rem',   // 48px
  },
  'heading-lg': {
    xs: '1.125rem',  // 18px
    sm: '1.25rem',   // 20px
    md: '1.5rem',    // 24px
    lg: '1.875rem',  // 30px
    xl: '2.25rem',   // 36px
    '2xl': '2.5rem', // 40px
  },
  'heading-md': {
    xs: '1rem',      // 16px
    sm: '1.125rem',  // 18px
    md: '1.25rem',   // 20px
    lg: '1.5rem',    // 24px
    xl: '1.875rem',  // 30px
    '2xl': '2.25rem', // 36px
  },
  
  // Body text
  'body-lg': {
    xs: '1rem',      // 16px
    sm: '1rem',      // 16px
    md: '1.125rem',  // 18px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.25rem', // 20px
  },
  'body-md': {
    xs: '0.875rem',  // 14px
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1rem',      // 16px
    xl: '1.125rem',  // 18px
    '2xl': '1.125rem', // 18px
  },
  'body-sm': {
    xs: '0.75rem',   // 12px
    sm: '0.75rem',   // 12px
    md: '0.875rem',  // 14px
    lg: '0.875rem',  // 14px
    xl: '1rem',      // 16px
    '2xl': '1rem',   // 16px
  },
}

// ===== RESPONSIVE SPACING SYSTEM =====

/**
 * Responsive spacing multipliers
 */
export const spacingMultipliers = {
  xs: 0.75,   // 75% of base spacing
  sm: 0.875,  // 87.5% of base spacing
  md: 1,      // Base spacing
  lg: 1.25,   // 125% of base spacing
  xl: 1.5,    // 150% of base spacing
  '2xl': 2,   // 200% of base spacing
}

/**
 * Component spacing for each breakpoint
 */
export const componentSpacing = {
  // Section spacing
  section: {
    xs: '2rem',      // 32px
    sm: '3rem',      // 48px
    md: '4rem',      // 64px
    lg: '5rem',      // 80px
    xl: '6rem',      // 96px
    '2xl': '8rem',   // 128px
  },
  
  // Card spacing
  card: {
    xs: '1rem',      // 16px
    sm: '1.25rem',   // 20px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
    xl: '2.5rem',    // 40px
    '2xl': '3rem',   // 48px
  },
  
  // Form spacing
  form: {
    xs: '1rem',      // 16px
    sm: '1.25rem',   // 20px
    md: '1.5rem',    // 24px
    lg: '2rem',      // 32px
    xl: '2rem',      // 32px
    '2xl': '2rem',   // 32px
  },
}

// ===== RESPONSIVE COMPONENT SIZES =====

/**
 * Button sizes for each breakpoint
 */
export const buttonSizes = {
  sm: {
    xs: { height: '2rem', padding: '0.5rem 0.75rem', fontSize: '0.75rem' },
    sm: { height: '2.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem' },
    md: { height: '2.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem' },
    lg: { height: '2.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem' },
    xl: { height: '2.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem' },
    '2xl': { height: '2.75rem', padding: '0.75rem 1.5rem', fontSize: '1rem' },
  },
  md: {
    xs: { height: '2.5rem', padding: '0.625rem 1rem', fontSize: '0.875rem' },
    sm: { height: '2.75rem', padding: '0.75rem 1.25rem', fontSize: '0.875rem' },
    md: { height: '2.75rem', padding: '0.75rem 1.5rem', fontSize: '1rem' },
    lg: { height: '3rem', padding: '0.875rem 1.75rem', fontSize: '1rem' },
    xl: { height: '3rem', padding: '0.875rem 2rem', fontSize: '1rem' },
    '2xl': { height: '3.25rem', padding: '1rem 2.25rem', fontSize: '1.125rem' },
  },
  lg: {
    xs: { height: '2.75rem', padding: '0.75rem 1.25rem', fontSize: '1rem' },
    sm: { height: '3rem', padding: '0.875rem 1.5rem', fontSize: '1rem' },
    md: { height: '3rem', padding: '0.875rem 2rem', fontSize: '1rem' },
    lg: { height: '3.5rem', padding: '1rem 2.5rem', fontSize: '1.125rem' },
    xl: { height: '3.5rem', padding: '1rem 3rem', fontSize: '1.125rem' },
    '2xl': { height: '4rem', padding: '1.25rem 3.5rem', fontSize: '1.25rem' },
  },
}

/**
 * Input sizes for each breakpoint
 */
export const inputSizes = {
  sm: {
    xs: { height: '2rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
    sm: { height: '2.25rem', padding: '0.5rem 1rem', fontSize: '0.875rem' },
    md: { height: '2.25rem', padding: '0.5rem 1rem', fontSize: '1rem' },
    lg: { height: '2.5rem', padding: '0.625rem 1.25rem', fontSize: '1rem' },
    xl: { height: '2.5rem', padding: '0.625rem 1.25rem', fontSize: '1rem' },
    '2xl': { height: '2.75rem', padding: '0.75rem 1.5rem', fontSize: '1rem' },
  },
  md: {
    xs: { height: '2.5rem', padding: '0.625rem 1rem', fontSize: '1rem' },
    sm: { height: '2.75rem', padding: '0.75rem 1.25rem', fontSize: '1rem' },
    md: { height: '2.75rem', padding: '0.75rem 1.5rem', fontSize: '1rem' },
    lg: { height: '3rem', padding: '0.875rem 1.75rem', fontSize: '1rem' },
    xl: { height: '3rem', padding: '0.875rem 2rem', fontSize: '1rem' },
    '2xl': { height: '3.25rem', padding: '1rem 2.25rem', fontSize: '1.125rem' },
  },
  lg: {
    xs: { height: '2.75rem', padding: '0.75rem 1.25rem', fontSize: '1rem' },
    sm: { height: '3rem', padding: '0.875rem 1.5rem', fontSize: '1rem' },
    md: { height: '3rem', padding: '0.875rem 2rem', fontSize: '1rem' },
    lg: { height: '3.5rem', padding: '1rem 2.5rem', fontSize: '1.125rem' },
    xl: { height: '3.5rem', padding: '1rem 3rem', fontSize: '1.125rem' },
    '2xl': { height: '4rem', padding: '1.25rem 3.5rem', fontSize: '1.25rem' },
  },
}

// ===== RESPONSIVE UTILITIES =====

/**
 * Generates media query strings
 */
export function mediaQuery(breakpoint: keyof BreakpointTokens, type: 'min' | 'max' = 'min'): string {
  const value = breakpoints[breakpoint]
  return `@media (${type}-width: ${value})`
}

/**
 * Generates responsive CSS properties
 */
export function responsiveProperty(
  property: string,
  values: Partial<Record<keyof BreakpointTokens, string>>
): string {
  const css: string[] = []
  
  // Base value (mobile-first)
  if (values.xs) {
    css.push(`${property}: ${values.xs};`)
  }
  
  // Responsive values
  const breakpointOrder: (keyof BreakpointTokens)[] = ['sm', 'md', 'lg', 'xl', '2xl']
  
  for (const bp of breakpointOrder) {
    if (values[bp]) {
      css.push(`${mediaQuery(bp)} {`)
      css.push(`  ${property}: ${values[bp]};`)
      css.push(`}`)
    }
  }
  
  return css.join('\n')
}

/**
 * Generates responsive grid CSS
 */
export function responsiveGrid(
  columns: Partial<Record<keyof BreakpointTokens, number>>,
  gap?: Partial<Record<keyof BreakpointTokens, string>>
): string {
  const css: string[] = []
  
  css.push('display: grid;')
  
  // Base columns
  if (columns.xs) {
    css.push(`grid-template-columns: repeat(${columns.xs}, 1fr);`)
  }
  
  // Base gap
  if (gap?.xs) {
    css.push(`gap: ${gap.xs};`)
  }
  
  // Responsive columns and gaps
  const breakpointOrder: (keyof BreakpointTokens)[] = ['sm', 'md', 'lg', 'xl', '2xl']
  
  for (const bp of breakpointOrder) {
    const hasColumns = columns[bp]
    const hasGap = gap?.[bp]
    
    if (hasColumns || hasGap) {
      css.push(`${mediaQuery(bp)} {`)
      
      if (hasColumns) {
        css.push(`  grid-template-columns: repeat(${hasColumns}, 1fr);`)
      }
      
      if (hasGap) {
        css.push(`  gap: ${hasGap};`)
      }
      
      css.push(`}`)
    }
  }
  
  return css.join('\n')
}

/**
 * Generates responsive container CSS
 */
export function responsiveContainer(): string {
  const css: string[] = []
  
  css.push('width: 100%;')
  css.push('margin-left: auto;')
  css.push('margin-right: auto;')
  css.push(`padding-left: ${containerPadding.xs};`)
  css.push(`padding-right: ${containerPadding.xs};`)
  
  const breakpointOrder: (keyof BreakpointTokens)[] = ['sm', 'md', 'lg', 'xl', '2xl']
  
  for (const bp of breakpointOrder) {
    css.push(`${mediaQuery(bp)} {`)
    css.push(`  max-width: ${containerSizes[bp]};`)
    css.push(`  padding-left: ${containerPadding[bp]};`)
    css.push(`  padding-right: ${containerPadding[bp]};`)
    css.push(`}`)
  }
  
  return css.join('\n')
}

// ===== COMPLETE RESPONSIVE TOKENS =====

export const responsiveTokens: ResponsiveTokens = {
  container: containerSizes,
  grid: {
    columns: gridColumns,
    gap: gridGaps,
  },
  typography: {
    scale: typographyScale,
  },
}

// ===== EXPORTS =====

export {
  breakpoints as default,
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
}

export const responsiveUtils = {
  mediaQuery,
  responsiveProperty,
  responsiveGrid,
  responsiveContainer,
}