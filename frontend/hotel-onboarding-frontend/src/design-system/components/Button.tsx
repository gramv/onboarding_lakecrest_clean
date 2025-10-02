/**
 * Enhanced Button Component
 * Professional button component with design tokens integration
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { ButtonProps, IconButtonProps } from './types'

// ===== BUTTON VARIANTS =====

const buttonVariants = {
  primary: [
    'bg-brand-primary text-white',
    'hover:bg-brand-primary/90',
    'focus-visible:ring-brand-primary/25',
    'disabled:bg-brand-primary/50',
    'shadow-sm hover:shadow-md',
  ],
  secondary: [
    'bg-surface-primary text-text-primary border border-neutral-300',
    'hover:bg-surface-secondary hover:border-neutral-400',
    'focus-visible:ring-neutral-500/25',
    'disabled:bg-neutral-100 disabled:text-text-disabled disabled:border-neutral-200',
    'shadow-sm hover:shadow-md',
  ],
  outline: [
    'bg-transparent text-brand-primary border border-brand-primary',
    'hover:bg-brand-primary hover:text-white',
    'focus-visible:ring-brand-primary/25',
    'disabled:bg-transparent disabled:text-brand-primary/50 disabled:border-brand-primary/50',
  ],
  ghost: [
    'bg-transparent text-text-primary',
    'hover:bg-surface-secondary',
    'focus-visible:ring-neutral-500/25',
    'disabled:bg-transparent disabled:text-text-disabled',
  ],
  destructive: [
    'bg-error-500 text-white',
    'hover:bg-error-600',
    'focus-visible:ring-error-500/25',
    'disabled:bg-error-500/50',
    'shadow-sm hover:shadow-md',
  ],
}

const buttonSizes = {
  sm: 'h-9 px-4 py-2 text-sm',
  md: 'h-11 px-6 py-3 text-sm',
  lg: 'h-12 px-8 py-3 text-base',
  xl: 'h-14 px-10 py-4 text-lg',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
}

// ===== LOADING SPINNER COMPONENT =====

const LoadingSpinner: React.FC<{ size: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size }) => {
  const spinnerSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  }

  return (
    <svg
      className={cn('animate-spin', spinnerSizes[size])}
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
}

// ===== MAIN BUTTON COMPONENT =====

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    iconOnly = false,
    href,
    target,
    rel,
    onClick,
    onFocus,
    onBlur,
    'data-testid': testId,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading
    const Component = href ? 'a' : 'button'
    
    const buttonClasses = cn(
      // Base styles
      'inline-flex items-center justify-center gap-2 font-semibold',
      'rounded-lg transition-all duration-normal ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transform hover:scale-[1.02] active:scale-[0.98]',
      'disabled:transform-none disabled:hover:scale-100',
      
      // Variant styles
      buttonVariants[variant],
      
      // Size styles
      buttonSizes[size],
      
      // Full width
      fullWidth && 'w-full',
      
      // Icon only
      iconOnly && 'aspect-square p-0',
      
      className
    )

    const iconClass = iconSizes[size]

    const buttonContent = (
      <>
        {loading && <LoadingSpinner size={size} />}
        {!loading && leftIcon && (
          <span className={cn('flex-shrink-0', iconClass)}>
            {leftIcon}
          </span>
        )}
        {!iconOnly && children && (
          <span className={loading ? 'opacity-0' : ''}>
            {children}
          </span>
        )}
        {iconOnly && !loading && (
          <span className={iconClass}>
            {children}
          </span>
        )}
        {!loading && rightIcon && (
          <span className={cn('flex-shrink-0', iconClass)}>
            {rightIcon}
          </span>
        )}
      </>
    )

    if (href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={rel}
          className={buttonClasses}
          data-testid={testId}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {buttonContent}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={buttonClasses}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        data-testid={testId}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ===== ICON BUTTON COMPONENT =====

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({
    icon,
    'aria-label': ariaLabel,
    tooltip,
    className,
    size = 'md',
    variant = 'ghost',
    ...props
  }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        iconOnly
        className={className}
        aria-label={ariaLabel}
        title={tooltip || ariaLabel}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// ===== BUTTON GROUP COMPONENT =====

export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  orientation?: 'horizontal' | 'vertical'
  attached?: boolean
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  size,
  variant,
  orientation = 'horizontal',
  attached = false,
  spacing = 'sm',
}) => {
  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
    md: orientation === 'horizontal' ? 'space-x-3' : 'space-y-3',
    lg: orientation === 'horizontal' ? 'space-x-4' : 'space-y-4',
  }

  const attachedClasses = attached
    ? orientation === 'horizontal'
      ? '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px'
      : '[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px'
    : ''

  return (
    <div
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-stretch',
        attached ? '' : spacingClasses[spacing],
        attachedClasses,
        className
      )}
      role="group"
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Button) {
          return React.cloneElement(child, {
            size: size || child.props.size,
            variant: variant || child.props.variant,
          })
        }
        return child
      })}
    </div>
  )
}

ButtonGroup.displayName = 'ButtonGroup'

// ===== EXPORTS =====

export default Button

// ===== USAGE EXAMPLES =====

/*
// Basic Buttons
<Button>Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete</Button>

// Button Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

// Button with Icons
<Button leftIcon={<PlusIcon />}>Add Item</Button>
<Button rightIcon={<ArrowRightIcon />}>Continue</Button>
<IconButton icon={<SearchIcon />} aria-label="Search" />

// Button States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>

// Button as Link
<Button href="/dashboard" target="_blank">Go to Dashboard</Button>

// Button Group
<ButtonGroup>
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</ButtonGroup>

<ButtonGroup attached>
  <Button>Bold</Button>
  <Button>Italic</Button>
  <Button>Underline</Button>
</ButtonGroup>
*/