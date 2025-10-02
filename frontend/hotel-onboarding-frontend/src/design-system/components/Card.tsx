/**
 * Enhanced Card Component
 * Professional card component with design tokens integration
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps } from './types'

// ===== CARD VARIANTS =====

const cardVariants = {
  default: 'bg-surface-primary border border-neutral-200',
  elevated: 'bg-surface-elevated shadow-md hover:shadow-lg transition-shadow duration-normal',
  outlined: 'bg-surface-primary border-2 border-neutral-300',
  filled: 'bg-surface-secondary border border-neutral-100',
}

const cardPadding = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

const cardRadius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

const cardShadow = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
}

// ===== MAIN CARD COMPONENT =====

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    children,
    variant = 'default',
    padding = 'md',
    radius = 'lg',
    shadow = 'none',
    interactive = false,
    hover = false,
    focus = false,
    'data-testid': testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden transition-all duration-normal ease-out',
          
          // Variant styles
          cardVariants[variant],
          
          // Padding styles
          cardPadding[padding],
          
          // Radius styles
          cardRadius[radius],
          
          // Shadow styles
          cardShadow[shadow],
          
          // Interactive styles
          interactive && [
            'cursor-pointer',
            'hover:scale-[1.02]',
            'active:scale-[0.98]',
            'transform-gpu',
          ],
          
          // Hover effects
          hover && 'hover:shadow-lg hover:-translate-y-1',
          
          // Focus styles
          focus && [
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-brand-primary',
            'focus-visible:ring-offset-2',
          ],
          
          className
        )}
        data-testid={testId}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// ===== CARD HEADER COMPONENT =====

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({
    className,
    children,
    title,
    subtitle,
    actions,
    avatar,
    badge,
    'data-testid': testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start justify-between space-x-4 pb-4',
          className
        )}
        data-testid={testId}
        {...props}
      >
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {avatar && (
            <div className="flex-shrink-0">
              {avatar}
            </div>
          )}
          
          <div className="min-w-0 flex-1">
            {title && (
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-text-primary truncate">
                  {title}
                </h3>
                {badge && badge}
              </div>
            )}
            
            {subtitle && (
              <p className="text-sm text-text-secondary mt-1">
                {subtitle}
              </p>
            )}
            
            {children}
          </div>
        </div>
        
        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

// ===== CARD CONTENT COMPONENT =====

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({
    className,
    children,
    spacing = 'md',
    'data-testid': testId,
    ...props
  }, ref) => {
    const spacingClasses = {
      none: '',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'text-text-primary',
          spacingClasses[spacing],
          className
        )}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

// ===== CARD FOOTER COMPONENT =====

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({
    className,
    children,
    justify = 'end',
    actions,
    'data-testid': testId,
    ...props
  }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center pt-4 mt-4 border-t border-neutral-200',
          justifyClasses[justify],
          className
        )}
        data-testid={testId}
        {...props}
      >
        {actions || children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

// ===== CARD COMPOUND COMPONENT =====

const CardCompound = Object.assign(Card, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
})

export default CardCompound

// ===== USAGE EXAMPLES =====

/*
// Basic Card
<Card>
  <CardHeader title="Card Title" subtitle="Card subtitle" />
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Elevated Interactive Card
<Card variant="elevated" interactive hover>
  <CardHeader 
    title="Interactive Card" 
    actions={<Button variant="ghost" size="sm">•••</Button>}
  />
  <CardContent>
    <p>This card is interactive and has hover effects</p>
  </CardContent>
</Card>

// Card with Avatar and Badge
<Card>
  <CardHeader 
    title="User Profile"
    subtitle="Software Engineer"
    avatar={<Avatar src="/avatar.jpg" />}
    badge={<Badge variant="success">Online</Badge>}
  />
  <CardContent>
    <p>User profile information</p>
  </CardContent>
</Card>

// Minimal Card
<Card variant="outlined" padding="sm" radius="md">
  <p>Simple card content</p>
</Card>
*/