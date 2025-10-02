/**
 * State Components
 * Loading states, empty states, and error boundary components
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { 
  LoadingStatesProps, 
  SkeletonProps, 
  EmptyStatesProps, 
  ErrorBoundaryProps, 
  ErrorFallbackProps 
} from './types'

// ===== LOADING SPINNER VARIANTS =====

const SpinnerLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <svg
    className={cn('animate-spin', size, color)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

const DotsLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <div className="flex space-x-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          'rounded-full animate-pulse',
          size === 'h-3 w-3' ? 'h-1 w-1' :
          size === 'h-4 w-4' ? 'h-1.5 w-1.5' :
          size === 'h-5 w-5' ? 'h-2 w-2' :
          size === 'h-6 w-6' ? 'h-2.5 w-2.5' :
          'h-3 w-3',
          color.replace('text-', 'bg-')
        )}
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: '1.4s',
        }}
      />
    ))}
  </div>
)

const BarsLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <div className="flex items-end space-x-1">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={cn(
          'animate-pulse',
          size === 'h-3 w-3' ? 'w-1' :
          size === 'h-4 w-4' ? 'w-1' :
          size === 'h-5 w-5' ? 'w-1.5' :
          size === 'h-6 w-6' ? 'w-2' :
          'w-2',
          color.replace('text-', 'bg-')
        )}
        style={{
          height: `${20 + (i * 10)}%`,
          animationDelay: `${i * 0.15}s`,
          animationDuration: '1.2s',
        }}
      />
    ))}
  </div>
)

// ===== LOADING STATES COMPONENT =====

export const LoadingStates = React.forwardRef<HTMLDivElement, LoadingStatesProps>(
  ({
    className,
    variant = 'spinner',
    size = 'md',
    color = 'primary',
    text,
    overlay = false,
    fullScreen = false,
    delay = 0,
    'data-testid': testId,
    ...props
  }, ref) => {
    const [show, setShow] = React.useState(delay === 0)

    React.useEffect(() => {
      if (delay > 0) {
        const timer = setTimeout(() => setShow(true), delay)
        return () => clearTimeout(timer)
      }
    }, [delay])

    if (!show) return null

    const sizeClasses = {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-8 w-8',
    }

    const colorClasses = {
      primary: 'text-brand-primary',
      secondary: 'text-text-secondary',
      neutral: 'text-text-muted',
    }

    const textSizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    }

    const LoaderComponent = {
      spinner: SpinnerLoader,
      dots: DotsLoader,
      bars: BarsLoader,
      pulse: ({ size, color }: { size: string; color: string }) => (
        <div className={cn('animate-pulse rounded-full', size, color.replace('text-', 'bg-'))} />
      ),
    }[variant]

    const content = (
      <div className="flex flex-col items-center justify-center space-y-3">
        <LoaderComponent size={sizeClasses[size]} color={colorClasses[color]} />
        {text && (
          <p className={cn('font-medium', colorClasses[color], textSizes[size])}>
            {text}
          </p>
        )}
      </div>
    )

    if (fullScreen) {
      return (
        <div
          ref={ref}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center',
            'bg-surface-overlay backdrop-blur-sm',
            className
          )}
          data-testid={testId}
          {...props}
        >
          {content}
        </div>
      )
    }

    if (overlay) {
      return (
        <div
          ref={ref}
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center',
            'bg-surface-primary/80 backdrop-blur-sm',
            className
          )}
          data-testid={testId}
          {...props}
        >
          {content}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center p-4', className)}
        data-testid={testId}
        {...props}
      >
        {content}
      </div>
    )
  }
)

LoadingStates.displayName = 'LoadingStates'

// ===== SKELETON COMPONENT =====

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    className,
    variant = 'rectangular',
    width,
    height,
    lines = 1,
    animation = 'pulse',
    'data-testid': testId,
    ...props
  }, ref) => {
    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-pulse', // Could be enhanced with wave animation
      none: '',
    }

    const variantClasses = {
      text: 'rounded',
      rectangular: 'rounded',
      circular: 'rounded-full',
      rounded: 'rounded-lg',
    }

    if (variant === 'text' && lines > 1) {
      return (
        <div
          ref={ref}
          className={cn('space-y-2', className)}
          data-testid={testId}
          {...props}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'bg-neutral-200 h-4',
                animationClasses[animation],
                variantClasses[variant],
                index === lines - 1 && 'w-3/4' // Last line is shorter
              )}
              style={{
                width: index === lines - 1 ? '75%' : width,
              }}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-neutral-200',
          animationClasses[animation],
          variantClasses[variant],
          className
        )}
        style={{ width, height }}
        data-testid={testId}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// ===== EMPTY STATES COMPONENT =====

const EmptyStateIcons = {
  default: (
    <svg className="w-16 h-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  search: (
    <svg className="w-16 h-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  error: (
    <svg className="w-16 h-16 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  maintenance: (
    <svg className="w-16 h-16 text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  permission: (
    <svg className="w-16 h-16 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
}

export const EmptyStates = React.forwardRef<HTMLDivElement, EmptyStatesProps>(
  ({
    className,
    variant = 'default',
    title,
    description,
    icon,
    image,
    actions,
    size = 'md',
    'data-testid': testId,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: 'py-8 px-4',
      md: 'py-12 px-6',
      lg: 'py-16 px-8',
    }

    const titleSizes = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
    }

    const descriptionSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          sizeClasses[size],
          className
        )}
        data-testid={testId}
        {...props}
      >
        {image ? (
          <img
            src={image}
            alt=""
            className="w-32 h-32 object-contain mb-6 opacity-60"
          />
        ) : (
          <div className="mb-6">
            {icon || EmptyStateIcons[variant]}
          </div>
        )}

        <h3 className={cn(
          'font-semibold text-text-primary mb-2',
          titleSizes[size]
        )}>
          {title}
        </h3>

        {description && (
          <p className={cn(
            'text-text-muted max-w-md mb-6',
            descriptionSizes[size]
          )}>
            {description}
          </p>
        )}

        {actions && (
          <div className="flex flex-col sm:flex-row gap-3">
            {actions}
          </div>
        )}
      </div>
    )
  }
)

EmptyStates.displayName = 'EmptyStates'

// ===== ERROR BOUNDARY COMPONENT =====

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<ErrorBoundaryProps>,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null

  constructor(props: React.PropsWithChildren<ErrorBoundaryProps>) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: React.PropsWithChildren<ErrorBoundaryProps>) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys![index]
      )

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }

    // Reset error boundary when any prop changes (if resetOnPropsChange is true)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      })
    }, 0)
  }

  render() {
    const { hasError, error } = this.state
    const { fallback: Fallback, children, className } = this.props

    if (hasError && error) {
      if (Fallback) {
        return (
          <Fallback
            error={error}
            resetError={this.resetErrorBoundary}
            hasError={hasError}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={error}
          resetError={this.resetErrorBoundary}
          hasError={hasError}
          className={className}
        />
      )
    }

    return children
  }
}

// ===== DEFAULT ERROR FALLBACK =====

const DefaultErrorFallback: React.FC<ErrorFallbackProps & { className?: string }> = ({
  error,
  resetError,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'bg-error-50 border border-error-200 rounded-lg',
        className
      )}
      role="alert"
    >
      <div className="mb-4">
        <svg className="w-16 h-16 text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold text-error-800 mb-2">
        Something went wrong
      </h2>

      <p className="text-error-600 mb-4 max-w-md">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4 text-left">
          <summary className="cursor-pointer text-sm text-error-600 hover:text-error-800">
            Error details (development only)
          </summary>
          <pre className="mt-2 p-4 bg-error-100 rounded text-xs text-error-800 overflow-auto max-w-full">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <button
        onClick={resetError}
        className="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors duration-normal"
      >
        Try again
      </button>
    </div>
  )
}

// ===== EXPORTS =====

export { LoadingStates as default, Skeleton, EmptyStates, ErrorBoundary }

// ===== USAGE EXAMPLES =====

/*
// Loading States
<LoadingStates variant="spinner" size="md" text="Loading..." />
<LoadingStates variant="dots" color="primary" />
<LoadingStates variant="bars" size="lg" overlay />
<LoadingStates variant="pulse" fullScreen text="Please wait..." />

// Skeleton
<Skeleton variant="text" lines={3} />
<Skeleton variant="rectangular" width="100%" height="200px" />
<Skeleton variant="circular" width="40px" height="40px" />

// Empty States
<EmptyStates
  variant="search"
  title="No results found"
  description="Try adjusting your search criteria"
  actions={<Button>Clear filters</Button>}
/>

<EmptyStates
  variant="default"
  title="No data available"
  description="Get started by adding your first item"
  actions={
    <div className="space-x-3">
      <Button variant="primary">Add Item</Button>
      <Button variant="outline">Learn More</Button>
    </div>
  }
/>

// Error Boundary
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Error caught by boundary:', error, errorInfo)
  }}
  resetOnPropsChange
>
  <MyComponent />
</ErrorBoundary>

// Custom Error Fallback
<ErrorBoundary
  fallback={({ error, resetError }) => (
    <div className="p-4 text-center">
      <h2>Custom Error UI</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Reset</button>
    </div>
  )}
>
  <MyComponent />
</ErrorBoundary>
*/