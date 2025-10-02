/**
 * Design Token Type Definitions
 * Comprehensive TypeScript interfaces for the enhanced design system
 */

// ===== COLOR SYSTEM =====

export interface ColorScale {
  50: string   // Lightest
  100: string
  200: string
  300: string
  400: string
  500: string  // Base color
  600: string
  700: string
  800: string
  900: string  // Darkest
  950: string  // Ultra dark
}

export interface BrandColors {
  primary: string      // Hotel brand primary
  secondary: string    // Hotel brand secondary
  accent: string       // Accent color
  logo: string        // Logo color
}

export interface SemanticColors {
  success: ColorScale
  warning: ColorScale
  error: ColorScale
  info: ColorScale
}

export interface NeutralColors extends ColorScale {
  white: string
  black: string
}

export interface ColorTokens {
  // Brand colors
  brand: BrandColors
  
  // Semantic colors
  semantic: SemanticColors
  
  // Neutral colors
  neutral: NeutralColors
  
  // Surface colors
  surface: {
    primary: string
    secondary: string
    tertiary: string
    elevated: string
    overlay: string
  }
  
  // Text colors
  text: {
    primary: string
    secondary: string
    tertiary: string
    muted: string
    disabled: string
    inverse: string
  }
  
  // Border colors
  border: {
    default: string
    muted: string
    strong: string
    brand: string
    focus: string
  }
}

// ===== TYPOGRAPHY SYSTEM =====

export interface FontFamilyTokens {
  sans: string[]
  serif: string[]
  mono: string[]
  display: string[]
}

export interface FontSizeScale {
  xs: string    // 12px
  sm: string    // 14px
  base: string  // 16px
  lg: string    // 18px
  xl: string    // 20px
  '2xl': string // 24px
  '3xl': string // 30px
  '4xl': string // 36px
  '5xl': string // 48px
  '6xl': string // 60px
  '7xl': string // 72px
  '8xl': string // 96px
  '9xl': string // 128px
}

export interface FontWeightScale {
  thin: number      // 100
  extralight: number // 200
  light: number     // 300
  normal: number    // 400
  medium: number    // 500
  semibold: number  // 600
  bold: number      // 700
  extrabold: number // 800
  black: number     // 900
}

export interface LineHeightScale {
  none: number      // 1
  tight: number     // 1.25
  snug: number      // 1.375
  normal: number    // 1.5
  relaxed: number   // 1.625
  loose: number     // 2
}

export interface LetterSpacingScale {
  tighter: string   // -0.05em
  tight: string     // -0.025em
  normal: string    // 0em
  wide: string      // 0.025em
  wider: string     // 0.05em
  widest: string    // 0.1em
}

export interface TypographyTokens {
  fontFamilies: FontFamilyTokens
  fontSizes: FontSizeScale
  fontWeights: FontWeightScale
  lineHeights: LineHeightScale
  letterSpacing: LetterSpacingScale
}

// ===== SPACING SYSTEM =====

export interface SpacingScale {
  0: string     // 0px
  px: string    // 1px
  0.5: string   // 2px
  1: string     // 4px
  1.5: string   // 6px
  2: string     // 8px
  2.5: string   // 10px
  3: string     // 12px
  3.5: string   // 14px
  4: string     // 16px
  5: string     // 20px
  6: string     // 24px
  7: string     // 28px
  8: string     // 32px
  9: string     // 36px
  10: string    // 40px
  11: string    // 44px
  12: string    // 48px
  14: string    // 56px
  16: string    // 64px
  20: string    // 80px
  24: string    // 96px
  28: string    // 112px
  32: string    // 128px
  36: string    // 144px
  40: string    // 160px
  44: string    // 176px
  48: string    // 192px
  52: string    // 208px
  56: string    // 224px
  60: string    // 240px
  64: string    // 256px
  72: string    // 288px
  80: string    // 320px
  96: string    // 384px
}

// ===== SHADOW SYSTEM =====

export interface ShadowScale {
  none: string
  sm: string
  base: string
  md: string
  lg: string
  xl: string
  '2xl': string
  inner: string
}

// ===== BORDER RADIUS SYSTEM =====

export interface BorderRadiusScale {
  none: string
  sm: string
  base: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  full: string
}

// ===== BREAKPOINT SYSTEM =====

export interface BreakpointTokens {
  xs: string    // 475px
  sm: string    // 640px
  md: string    // 768px
  lg: string    // 1024px
  xl: string    // 1280px
  '2xl': string // 1536px
}

// ===== ANIMATION SYSTEM =====

export interface AnimationTokens {
  // Duration
  duration: {
    instant: string    // 0ms
    fast: string       // 150ms
    normal: string     // 200ms
    slow: string       // 300ms
    slower: string     // 500ms
    slowest: string    // 1000ms
  }
  
  // Easing
  easing: {
    linear: string
    in: string
    out: string
    inOut: string
    bounce: string
    elastic: string
  }
  
  // Keyframes
  keyframes: {
    fadeIn: string
    fadeOut: string
    slideUp: string
    slideDown: string
    slideLeft: string
    slideRight: string
    scaleIn: string
    scaleOut: string
    spin: string
    pulse: string
    bounce: string
  }
}

// ===== Z-INDEX SYSTEM =====

export interface ZIndexTokens {
  hide: number      // -1
  auto: string      // auto
  base: number      // 0
  docked: number    // 10
  dropdown: number  // 1000
  sticky: number    // 1100
  banner: number    // 1200
  overlay: number   // 1300
  modal: number     // 1400
  popover: number   // 1500
  skipLink: number  // 1600
  toast: number     // 1700
  tooltip: number   // 1800
}

// ===== MAIN DESIGN TOKENS INTERFACE =====

export interface DesignTokens {
  colors: ColorTokens
  typography: TypographyTokens
  spacing: SpacingScale
  shadows: ShadowScale
  borderRadius: BorderRadiusScale
  breakpoints: BreakpointTokens
  animations: AnimationTokens
  zIndex: ZIndexTokens
}

// ===== THEME VARIANTS =====

export type ThemeMode = 'light' | 'dark' | 'auto'

export interface ThemeConfig {
  mode: ThemeMode
  tokens: DesignTokens
}

export interface ThemeVariants {
  light: ThemeConfig
  dark: ThemeConfig
}

// ===== COMPONENT TOKEN TYPES =====

export interface ComponentTokens {
  button: {
    height: {
      sm: string
      md: string
      lg: string
      xl: string
    }
    padding: {
      sm: string
      md: string
      lg: string
      xl: string
    }
    fontSize: {
      sm: string
      md: string
      lg: string
      xl: string
    }
    borderRadius: string
  }
  
  input: {
    height: {
      sm: string
      md: string
      lg: string
    }
    padding: string
    fontSize: string
    borderRadius: string
    borderWidth: string
  }
  
  card: {
    padding: {
      sm: string
      md: string
      lg: string
    }
    borderRadius: string
    borderWidth: string
    shadow: string
  }
  
  modal: {
    maxWidth: {
      sm: string
      md: string
      lg: string
      xl: string
    }
    padding: string
    borderRadius: string
    shadow: string
  }
}

// ===== UTILITY TYPES =====

export type TokenValue = string | number
export type TokenPath = string
export type TokenReference = `{${TokenPath}}`

export interface TokenMetadata {
  description?: string
  deprecated?: boolean
  category?: string
  source?: string
}

export interface Token<T = TokenValue> {
  value: T
  metadata?: TokenMetadata
}

export type TokenGroup<T = TokenValue> = Record<string, Token<T> | TokenGroup<T>>

// ===== RESPONSIVE DESIGN TOKENS =====

export interface ResponsiveTokens {
  container: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  
  grid: {
    columns: {
      xs: number
      sm: number
      md: number
      lg: number
      xl: number
      '2xl': number
    }
    gap: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
      '2xl': string
    }
  }
  
  typography: {
    scale: {
      xs: number
      sm: number
      md: number
      lg: number
      xl: number
      '2xl': number
    }
  }
}

// ===== ACCESSIBILITY TOKENS =====

export interface AccessibilityTokens {
  focusRing: {
    width: string
    color: string
    offset: string
    style: string
  }
  
  contrast: {
    minimum: number    // 4.5:1
    enhanced: number   // 7:1
    large: number      // 3:1
  }
  
  motion: {
    reduceMotion: boolean
    duration: {
      short: string
      medium: string
      long: string
    }
  }
  
  touch: {
    minTarget: string  // 44px minimum
    spacing: string    // 8px minimum
  }
}