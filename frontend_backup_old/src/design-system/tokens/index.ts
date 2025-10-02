/**
 * Design Token Values
 * Comprehensive design token system for the hotel management platform
 */

import type { 
  DesignTokens, 
  ThemeVariants, 
  ComponentTokens, 
  ResponsiveTokens, 
  AccessibilityTokens 
} from './types'

// ===== COLOR TOKENS =====

const colorTokens = {
  // Brand colors
  brand: {
    primary: '#3B82F6',      // Blue 500
    secondary: '#F59E0B',    // Amber 500
    accent: '#8B5CF6',       // Violet 500
    logo: '#1E40AF',         // Blue 800
  },
  
  // Semantic colors
  semantic: {
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
      950: '#052E16',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
      950: '#451A03',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
      950: '#450A0A',
    },
    info: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
      950: '#172554',
    },
  },
  
  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Surface colors
  surface: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#374151',
    tertiary: '#6B7280',
    muted: '#9CA3AF',
    disabled: '#D1D5DB',
    inverse: '#FFFFFF',
  },
  
  // Border colors
  border: {
    default: '#E5E7EB',
    muted: '#F3F4F6',
    strong: '#D1D5DB',
    brand: '#3B82F6',
    focus: '#2563EB',
  },
}

// ===== TYPOGRAPHY TOKENS =====

const typographyTokens = {
  fontFamilies: {
    sans: [
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ],
    serif: [
      'Georgia',
      'Cambria',
      'Times New Roman',
      'Times',
      'serif',
    ],
    mono: [
      'SFMono-Regular',
      'Menlo',
      'Monaco',
      'Consolas',
      'Liberation Mono',
      'Courier New',
      'monospace',
    ],
    display: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ],
  },
  
  fontSizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem',    // 128px
  },
  
  fontWeights: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  lineHeights: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
}

// ===== SPACING TOKENS =====

const spacingTokens = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
}

// ===== SHADOW TOKENS =====

const shadowTokens = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
}

// ===== BORDER RADIUS TOKENS =====

const borderRadiusTokens = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
}

// ===== BREAKPOINT TOKENS =====

const breakpointTokens = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// ===== ANIMATION TOKENS =====

const animationTokens = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '1000ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  keyframes: {
    fadeIn: `
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    `,
    fadeOut: `
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    `,
    slideUp: `
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    `,
    slideDown: `
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    `,
    slideLeft: `
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    `,
    slideRight: `
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    `,
    scaleIn: `
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    `,
    scaleOut: `
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.9); opacity: 0; }
    `,
    spin: `
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    `,
    pulse: `
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    `,
    bounce: `
      0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
      50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    `,
  },
}

// ===== Z-INDEX TOKENS =====

const zIndexTokens = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
}

// ===== MAIN DESIGN TOKENS =====

export const designTokens: DesignTokens = {
  colors: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  shadows: shadowTokens,
  borderRadius: borderRadiusTokens,
  breakpoints: breakpointTokens,
  animations: animationTokens,
  zIndex: zIndexTokens,
}

// ===== DARK THEME TOKENS =====

const darkColorTokens = {
  ...colorTokens,
  
  // Surface colors for dark theme
  surface: {
    primary: '#111827',
    secondary: '#1F2937',
    tertiary: '#374151',
    elevated: '#1F2937',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
  
  // Text colors for dark theme
  text: {
    primary: '#F9FAFB',
    secondary: '#E5E7EB',
    tertiary: '#D1D5DB',
    muted: '#9CA3AF',
    disabled: '#6B7280',
    inverse: '#111827',
  },
  
  // Border colors for dark theme
  border: {
    default: '#374151',
    muted: '#1F2937',
    strong: '#4B5563',
    brand: '#60A5FA',
    focus: '#3B82F6',
  },
}

// ===== THEME VARIANTS =====

export const themeVariants: ThemeVariants = {
  light: {
    mode: 'light',
    tokens: designTokens,
  },
  dark: {
    mode: 'dark',
    tokens: {
      ...designTokens,
      colors: darkColorTokens,
    },
  },
}

// ===== COMPONENT TOKENS =====

export const componentTokens: ComponentTokens = {
  button: {
    height: {
      sm: '2.25rem',  // 36px
      md: '2.75rem',  // 44px
      lg: '3rem',     // 48px
      xl: '3.5rem',   // 56px
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
      xl: '1.25rem 2.5rem',
    },
    fontSize: {
      sm: designTokens.typography.fontSizes.sm,
      md: designTokens.typography.fontSizes.base,
      lg: designTokens.typography.fontSizes.lg,
      xl: designTokens.typography.fontSizes.xl,
    },
    borderRadius: designTokens.borderRadius.lg,
  },
  
  input: {
    height: {
      sm: '2.25rem',  // 36px
      md: '2.75rem',  // 44px
      lg: '3rem',     // 48px
    },
    padding: '0.75rem 1rem',
    fontSize: designTokens.typography.fontSizes.base,
    borderRadius: designTokens.borderRadius.lg,
    borderWidth: '1px',
  },
  
  card: {
    padding: {
      sm: designTokens.spacing[4],
      md: designTokens.spacing[6],
      lg: designTokens.spacing[8],
    },
    borderRadius: designTokens.borderRadius.xl,
    borderWidth: '1px',
    shadow: designTokens.shadows.sm,
  },
  
  modal: {
    maxWidth: {
      sm: '24rem',    // 384px
      md: '32rem',    // 512px
      lg: '48rem',    // 768px
      xl: '64rem',    // 1024px
    },
    padding: designTokens.spacing[6],
    borderRadius: designTokens.borderRadius['2xl'],
    shadow: designTokens.shadows.xl,
  },
}

// ===== RESPONSIVE TOKENS =====

export const responsiveTokens: ResponsiveTokens = {
  container: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  grid: {
    columns: {
      xs: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 5,
      '2xl': 6,
    },
    gap: {
      xs: designTokens.spacing[2],
      sm: designTokens.spacing[3],
      md: designTokens.spacing[4],
      lg: designTokens.spacing[6],
      xl: designTokens.spacing[8],
      '2xl': designTokens.spacing[10],
    },
  },
  
  typography: {
    scale: {
      xs: 0.75,
      sm: 0.875,
      md: 1,
      lg: 1.125,
      xl: 1.25,
      '2xl': 1.5,
    },
  },
}

// ===== ACCESSIBILITY TOKENS =====

export const accessibilityTokens: AccessibilityTokens = {
  focusRing: {
    width: '2px',
    color: designTokens.colors.brand.primary,
    offset: '2px',
    style: 'solid',
  },
  
  contrast: {
    minimum: 4.5,   // WCAG AA
    enhanced: 7,    // WCAG AAA
    large: 3,       // WCAG AA Large Text
  },
  
  motion: {
    reduceMotion: false,
    duration: {
      short: designTokens.animations.duration.fast,
      medium: designTokens.animations.duration.normal,
      long: designTokens.animations.duration.slow,
    },
  },
  
  touch: {
    minTarget: '44px',  // iOS/Android minimum
    spacing: '8px',     // Minimum spacing between targets
  },
}

// ===== EXPORTS =====

export {
  colorTokens,
  typographyTokens,
  spacingTokens,
  shadowTokens,
  borderRadiusTokens,
  breakpointTokens,
  animationTokens,
  zIndexTokens,
}

export default designTokens