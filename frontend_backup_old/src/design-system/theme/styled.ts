/**
 * CSS-in-JS Solution with Theme Integration
 * Performance-optimized styling utilities with design tokens
 */

import React from 'react'
import type { DesignTokens, ThemeMode } from '../tokens/types'

// ===== STYLED COMPONENT TYPES =====

interface StyledProps {
  theme: DesignTokens
  mode: ThemeMode
  className?: string
}

type StyledFunction<P = {}> = (
  template: TemplateStringsArray,
  ...interpolations: Array<string | number | ((props: StyledProps & P) => string | number)>
) => React.ComponentType<P & { className?: string }>

type StyledComponentFactory = {
  [K in keyof JSX.IntrinsicElements]: StyledFunction<JSX.IntrinsicElements[K]>
} & {
  <T extends React.ComponentType<any>>(component: T): StyledFunction<React.ComponentProps<T>>
}

// ===== CSS UTILITIES =====

/**
 * Parse template literal with interpolations
 */
function parseTemplate(
  template: TemplateStringsArray,
  interpolations: Array<string | number | Function>,
  props: StyledProps & any
): string {
  let result = template[0]

  for (let i = 0; i < interpolations.length; i++) {
    const interpolation = interpolations[i]
    const value = typeof interpolation === 'function' ? interpolation(props) : interpolation
    result += String(value) + template[i + 1]
  }

  return result
}

/**
 * Generate unique class name
 */
function generateClassName(css: string): string {
  // Simple hash function for generating unique class names
  let hash = 0
  for (let i = 0; i < css.length; i++) {
    const char = css.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `styled-${Math.abs(hash).toString(36)}`
}

/**
 * Inject CSS into the document
 */
function injectCSS(className: string, css: string): void {
  if (typeof document === 'undefined') return

  // Check if style already exists
  const existingStyle = document.querySelector(`style[data-styled="${className}"]`)
  if (existingStyle) return

  // Create and inject style element
  const style = document.createElement('style')
  style.setAttribute('data-styled', className)
  style.textContent = `.${className} { ${css} }`
  document.head.appendChild(style)
}

/**
 * Process CSS with theme tokens
 */
function processCSS(css: string, theme: DesignTokens): string {
  // Replace theme token references
  return css.replace(/theme\.(\w+(?:\.\w+)*)/g, (match, path) => {
    const value = getNestedValue(theme, path)
    return value !== undefined ? String(value) : match
  })
}

/**
 * Get nested object value by path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

// ===== THEME UTILITIES =====

/**
 * Theme-aware CSS helper functions
 */
export const css = {
  /**
   * Get color value with HSL wrapper
   */
  color: (path: string) => (props: StyledProps) => {
    const value = getNestedValue(props.theme.colors, path)
    return value ? `hsl(${value})` : 'transparent'
  },

  /**
   * Get spacing value
   */
  spacing: (key: keyof DesignTokens['spacing']) => (props: StyledProps) => {
    return props.theme.spacing[key] || '0'
  },

  /**
   * Get font size value
   */
  fontSize: (key: keyof DesignTokens['typography']['fontSizes']) => (props: StyledProps) => {
    return props.theme.typography.fontSizes[key] || '1rem'
  },

  /**
   * Get font weight value
   */
  fontWeight: (key: keyof DesignTokens['typography']['fontWeights']) => (props: StyledProps) => {
    return String(props.theme.typography.fontWeights[key] || 400)
  },

  /**
   * Get shadow value
   */
  shadow: (key: keyof DesignTokens['shadows']) => (props: StyledProps) => {
    return props.theme.shadows[key] || 'none'
  },

  /**
   * Get border radius value
   */
  borderRadius: (key: keyof DesignTokens['borderRadius']) => (props: StyledProps) => {
    return props.theme.borderRadius[key] || '0'
  },

  /**
   * Get animation duration
   */
  duration: (key: keyof DesignTokens['animations']['duration']) => (props: StyledProps) => {
    return props.theme.animations.duration[key] || '200ms'
  },

  /**
   * Get easing function
   */
  easing: (key: keyof DesignTokens['animations']['easing']) => (props: StyledProps) => {
    return props.theme.animations.easing[key] || 'ease'
  },

  /**
   * Responsive breakpoint helper
   */
  breakpoint: (bp: keyof DesignTokens['breakpoints']) => (styles: string) => {
    return `@media (min-width: ${(props: StyledProps) => props.theme.breakpoints[bp]}) { ${styles} }`
  },

  /**
   * Dark mode styles
   */
  dark: (styles: string) => (props: StyledProps) => {
    return props.mode === 'dark' ? styles : ''
  },

  /**
   * Light mode styles
   */
  light: (styles: string) => (props: StyledProps) => {
    return props.mode === 'light' ? styles : ''
  },

  /**
   * Conditional styles based on props
   */
  when: (condition: (props: any) => boolean, styles: string) => (props: any) => {
    return condition(props) ? styles : ''
  },
}

// ===== STYLED COMPONENT FACTORY =====

/**
 * Create styled component
 */
function createStyledComponent<P = {}>(
  Component: React.ComponentType<any> | keyof JSX.IntrinsicElements
): StyledFunction<P> {
  return (template: TemplateStringsArray, ...interpolations: any[]) => {
    const StyledComponent = React.forwardRef<any, P & StyledProps & { className?: string }>(
      (props, ref) => {
        const { theme, mode, className: externalClassName, ...restProps } = props

        // Parse CSS template
        const css = parseTemplate(template, interpolations, props)
        
        // Process CSS with theme tokens
        const processedCSS = processCSS(css, theme)
        
        // Generate unique class name
        const className = generateClassName(processedCSS)
        
        // Inject CSS
        React.useEffect(() => {
          injectCSS(className, processedCSS)
        }, [processedCSS, className])

        // Combine class names
        const finalClassName = [className, externalClassName].filter(Boolean).join(' ')

        // Render component
        if (typeof Component === 'string') {
          return React.createElement(Component, {
            ...restProps,
            className: finalClassName,
            ref,
          })
        }

        return React.createElement(Component, {
          ...restProps,
          className: finalClassName,
          ref,
        })
      }
    )

    StyledComponent.displayName = `Styled(${
      typeof Component === 'string' ? Component : Component.displayName || Component.name || 'Component'
    })`

    return StyledComponent as any
  }
}

// ===== STYLED OBJECT =====

const styledTags = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'button', 'input', 'textarea', 'select', 'label', 'form',
  'section', 'article', 'header', 'footer', 'nav', 'main',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img', 'svg', 'canvas', 'video', 'audio',
] as const

export const styled = styledTags.reduce((acc, tag) => {
  acc[tag] = createStyledComponent(tag)
  return acc
}, {} as any) as StyledComponentFactory

// Add the generic styled function for custom components
styled.default = createStyledComponent
Object.assign(styled, createStyledComponent)

// ===== THEME-AWARE HOOKS =====

/**
 * Hook for accessing theme tokens in components
 */
export function useStyledTheme(): DesignTokens {
  // This would integrate with your ThemeProvider
  // For now, return a default theme
  return {} as DesignTokens
}

/**
 * Hook for creating dynamic styles
 */
export function useDynamicStyles<P = {}>(
  stylesFn: (props: P & StyledProps) => string,
  deps: React.DependencyList = []
): string {
  const theme = useStyledTheme()
  
  return React.useMemo(() => {
    const css = stylesFn({ theme, mode: 'light' } as P & StyledProps)
    const className = generateClassName(css)
    injectCSS(className, css)
    return className
  }, [stylesFn, theme, ...deps])
}

// ===== PERFORMANCE OPTIMIZATIONS =====

/**
 * CSS cache for performance
 */
const cssCache = new Map<string, string>()

/**
 * Memoized CSS processing
 */
function memoizedProcessCSS(css: string, theme: DesignTokens): string {
  const cacheKey = `${css}-${JSON.stringify(theme)}`
  
  if (cssCache.has(cacheKey)) {
    return cssCache.get(cacheKey)!
  }
  
  const processed = processCSS(css, theme)
  cssCache.set(cacheKey, processed)
  
  // Limit cache size
  if (cssCache.size > 1000) {
    const firstKey = cssCache.keys().next().value
    cssCache.delete(firstKey)
  }
  
  return processed
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create theme-aware keyframes
 */
export function keyframes(
  template: TemplateStringsArray,
  ...interpolations: Array<string | number | ((props: StyledProps) => string | number)>
) {
  return (props: StyledProps) => {
    const css = parseTemplate(template, interpolations, props)
    const processed = processCSS(css, props.theme)
    const name = `keyframes-${generateClassName(processed)}`
    
    // Inject keyframes
    if (typeof document !== 'undefined') {
      const existingStyle = document.querySelector(`style[data-keyframes="${name}"]`)
      if (!existingStyle) {
        const style = document.createElement('style')
        style.setAttribute('data-keyframes', name)
        style.textContent = `@keyframes ${name} { ${processed} }`
        document.head.appendChild(style)
      }
    }
    
    return name
  }
}

/**
 * Create global styles
 */
export function createGlobalStyle(
  template: TemplateStringsArray,
  ...interpolations: Array<string | number | ((props: StyledProps) => string | number)>
) {
  return (props: StyledProps) => {
    const css = parseTemplate(template, interpolations, props)
    const processed = processCSS(css, props.theme)
    
    // Inject global styles
    if (typeof document !== 'undefined') {
      const existingStyle = document.querySelector('style[data-global="true"]')
      if (existingStyle) {
        existingStyle.textContent += processed
      } else {
        const style = document.createElement('style')
        style.setAttribute('data-global', 'true')
        style.textContent = processed
        document.head.appendChild(style)
      }
    }
  }
}

// ===== EXPORTS =====

export default styled

// ===== USAGE EXAMPLES =====

/*
// Basic styled component
const StyledButton = styled.button`
  background: ${css.color('brand.primary')};
  color: ${css.color('text.inverse')};
  padding: ${css.spacing('4')} ${css.spacing('6')};
  border-radius: ${css.borderRadius('lg')};
  font-size: ${css.fontSize('base')};
  font-weight: ${css.fontWeight('semibold')};
  transition: all ${css.duration('normal')} ${css.easing('out')};
  
  &:hover {
    background: ${css.color('brand.primary')};
    transform: scale(1.02);
  }
  
  ${css.dark(`
    background: ${css.color('brand.primary')};
    color: ${css.color('text.inverse')};
  `)}
  
  ${css.breakpoint('md')(`
    padding: ${css.spacing('6')} ${css.spacing('8')};
    font-size: ${css.fontSize('lg')};
  `)}
`

// Conditional styling
const ConditionalButton = styled.button`
  background: ${props => props.primary ? css.color('brand.primary')(props) : css.color('surface.secondary')(props)};
  color: ${props => props.primary ? css.color('text.inverse')(props) : css.color('text.primary')(props)};
  
  ${css.when(props => props.disabled, `
    opacity: 0.5;
    cursor: not-allowed;
  `)}
`

// Styled custom component
const StyledCard = styled(Card)`
  background: ${css.color('surface.elevated')};
  border: 1px solid ${css.color('border.default')};
  border-radius: ${css.borderRadius('xl')};
  box-shadow: ${css.shadow('md')};
  
  &:hover {
    box-shadow: ${css.shadow('lg')};
    transform: translateY(-2px);
  }
`

// Using keyframes
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(${css.spacing('4')});
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const AnimatedDiv = styled.div`
  animation: ${fadeIn} ${css.duration('slow')} ${css.easing('out')};
`

// Global styles
const GlobalStyles = createGlobalStyle`
  body {
    font-family: ${props => props.theme.typography.fontFamilies.sans.join(', ')};
    background: ${css.color('surface.primary')};
    color: ${css.color('text.primary')};
  }
  
  * {
    box-sizing: border-box;
  }
`

// Dynamic styles hook
function MyComponent() {
  const [isActive, setIsActive] = useState(false)
  
  const dynamicClass = useDynamicStyles(
    ({ theme }) => `
      background: ${isActive ? theme.colors.brand.primary : theme.colors.surface.secondary};
      transition: all ${theme.animations.duration.normal} ${theme.animations.easing.out};
    `,
    [isActive]
  )
  
  return <div className={dynamicClass}>Dynamic content</div>
}
*/