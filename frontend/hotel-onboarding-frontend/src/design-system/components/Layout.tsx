/**
 * Enhanced Layout Components
 * Professional layout components with design tokens integration
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { ContainerProps, StackProps, GridProps } from './types'

// ===== CONTAINER COMPONENT =====

const containerSizes = {
  xs: 'max-w-xs',      // 475px
  sm: 'max-w-sm',      // 640px
  md: 'max-w-md',      // 768px
  lg: 'max-w-lg',      // 1024px
  xl: 'max-w-xl',      // 1280px
  '2xl': 'max-w-2xl',  // 1536px
  full: 'max-w-full',
}

const containerPadding = {
  none: '',
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
  xl: 'px-12',
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({
    className,
    children,
    size = 'xl',
    padding = 'md',
    center = true,
    fluid = false,
    'data-testid': testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          !fluid && containerSizes[size],
          center && 'mx-auto',
          containerPadding[padding],
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

Container.displayName = 'Container'

// ===== STACK COMPONENT =====

const stackSpacing = {
  none: '',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

const stackAlign = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
}

const stackJustify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({
    className,
    children,
    direction = 'column',
    spacing = 'md',
    align = 'stretch',
    justify = 'start',
    wrap = false,
    divider,
    'data-testid': testId,
    ...props
  }, ref) => {
    const childrenArray = React.Children.toArray(children)
    
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'row' ? 'flex-row' : 'flex-col',
          stackSpacing[spacing],
          stackAlign[align],
          stackJustify[justify],
          wrap && 'flex-wrap',
          className
        )}
        data-testid={testId}
        {...props}
      >
        {divider
          ? childrenArray.map((child, index) => (
              <React.Fragment key={index}>
                {child}
                {index < childrenArray.length - 1 && (
                  <div className="flex-shrink-0">
                    {divider}
                  </div>
                )}
              </React.Fragment>
            ))
          : children
        }
      </div>
    )
  }
)

Stack.displayName = 'Stack'

// ===== GRID COMPONENT =====

const gridGaps = {
  none: '',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({
    className,
    children,
    columns = 'responsive',
    gap = 'md',
    rows = 'auto',
    autoFit = false,
    minItemWidth = '280px',
    'data-testid': testId,
    ...props
  }, ref) => {
    const getGridColumns = () => {
      if (columns === 'responsive') {
        return autoFit
          ? `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
          : 'repeat(auto-fit, minmax(280px, 1fr))'
      }
      
      if (columns === 'auto') {
        return 'repeat(auto-fit, minmax(0, 1fr))'
      }
      
      if (typeof columns === 'number') {
        return `repeat(${columns}, 1fr)`
      }
      
      return columns
    }

    const getGridRows = () => {
      if (rows === 'auto') {
        return 'auto'
      }
      
      if (typeof rows === 'number') {
        return `repeat(${rows}, 1fr)`
      }
      
      return rows
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          gridGaps[gap],
          className
        )}
        style={{
          gridTemplateColumns: getGridColumns(),
          gridTemplateRows: getGridRows(),
        }}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Grid.displayName = 'Grid'

// ===== FLEX COMPONENT =====

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  wrap?: boolean | 'reverse'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  'data-testid'?: string
}

const flexDirection = {
  row: 'flex-row',
  column: 'flex-col',
  'row-reverse': 'flex-row-reverse',
  'column-reverse': 'flex-col-reverse',
}

const flexWrap = {
  true: 'flex-wrap',
  false: 'flex-nowrap',
  reverse: 'flex-wrap-reverse',
}

const flexAlign = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const flexJustify = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

const flexGap = {
  none: '',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({
    className,
    children,
    direction = 'row',
    wrap = false,
    align = 'stretch',
    justify = 'start',
    gap = 'none',
    'data-testid': testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          flexDirection[direction],
          flexWrap[wrap],
          flexAlign[align],
          flexJustify[justify],
          flexGap[gap],
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

Flex.displayName = 'Flex'

// ===== SPACER COMPONENT =====

export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  axis?: 'horizontal' | 'vertical' | 'both'
  className?: string
}

const spacerSizes = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  axis = 'both',
  className,
}) => {
  const spacerSize = spacerSizes[size]
  
  const style: React.CSSProperties = {}
  
  if (axis === 'horizontal' || axis === 'both') {
    style.width = spacerSize
  }
  
  if (axis === 'vertical' || axis === 'both') {
    style.height = spacerSize
  }
  
  return (
    <div
      className={cn('flex-shrink-0', className)}
      style={style}
      aria-hidden="true"
    />
  )
}

Spacer.displayName = 'Spacer'

// ===== DIVIDER COMPONENT =====

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted'
  thickness?: 'thin' | 'medium' | 'thick'
  color?: 'default' | 'muted' | 'strong'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}

const dividerVariants = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
}

const dividerThickness = {
  thin: 'border-t',
  medium: 'border-t-2',
  thick: 'border-t-4',
}

const dividerColors = {
  default: 'border-neutral-200',
  muted: 'border-neutral-100',
  strong: 'border-neutral-300',
}

const dividerSpacing = {
  none: '',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 'thin',
  color = 'default',
  spacing = 'md',
  children,
  className,
}) => {
  if (children) {
    return (
      <div
        className={cn(
          'relative flex items-center',
          dividerSpacing[spacing],
          className
        )}
      >
        <div
          className={cn(
            'flex-grow',
            dividerThickness[thickness],
            dividerVariants[variant],
            dividerColors[color]
          )}
        />
        <span className="px-4 text-sm text-text-muted bg-surface-primary">
          {children}
        </span>
        <div
          className={cn(
            'flex-grow',
            dividerThickness[thickness],
            dividerVariants[variant],
            dividerColors[color]
          )}
        />
      </div>
    )
  }

  if (orientation === 'vertical') {
    return (
      <div
        className={cn(
          'border-l h-full',
          dividerVariants[variant],
          dividerColors[color],
          thickness === 'medium' && 'border-l-2',
          thickness === 'thick' && 'border-l-4',
          className
        )}
      />
    )
  }

  return (
    <hr
      className={cn(
        'w-full border-0',
        dividerThickness[thickness],
        dividerVariants[variant],
        dividerColors[color],
        dividerSpacing[spacing],
        className
      )}
    />
  )
}

Divider.displayName = 'Divider'

// ===== EXPORTS =====

export { Container as default }

// ===== USAGE EXAMPLES =====

/*
// Container
<Container size="lg" padding="md">
  <h1>Page Content</h1>
</Container>

// Stack
<Stack direction="column" spacing="lg" align="center">
  <Button>First</Button>
  <Button>Second</Button>
  <Button>Third</Button>
</Stack>

// Stack with Divider
<Stack direction="row" divider={<Divider orientation="vertical" />}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Stack>

// Grid
<Grid columns={3} gap="lg">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</Grid>

// Responsive Grid
<Grid columns="responsive" minItemWidth="300px" gap="md">
  <Card>Responsive Card 1</Card>
  <Card>Responsive Card 2</Card>
  <Card>Responsive Card 3</Card>
</Grid>

// Flex
<Flex justify="between" align="center" gap="md">
  <h2>Title</h2>
  <Button>Action</Button>
</Flex>

// Spacer
<div>
  <p>First paragraph</p>
  <Spacer size="lg" axis="vertical" />
  <p>Second paragraph with large spacing</p>
</div>

// Divider
<Divider />
<Divider variant="dashed" color="muted" />
<Divider thickness="thick" spacing="lg">
  Section Title
</Divider>
*/