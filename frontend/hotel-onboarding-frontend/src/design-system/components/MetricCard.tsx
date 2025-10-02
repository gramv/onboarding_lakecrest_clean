/**
 * MetricCard and KPIWidget Components
 * Professional metric display components with trend indicators and animations
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { MetricCardProps, KPIWidgetProps, TrendData, KPIData } from './types'

// ===== TREND ICONS =====

const TrendUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const TrendDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
)

const TrendNeutralIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
)

// ===== TREND INDICATOR COMPONENT =====

interface TrendIndicatorProps {
  trend: TrendData
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showValue?: boolean
  showPeriod?: boolean
  className?: string
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  size = 'md',
  showIcon = true,
  showValue = true,
  showPeriod = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const colorClasses = {
    increase: 'text-success-600',
    decrease: 'text-error-600',
    neutral: 'text-text-muted',
  }

  const TrendIcon = {
    increase: TrendUpIcon,
    decrease: TrendDownIcon,
    neutral: TrendNeutralIcon,
  }[trend.changeType]

  const sign = trend.changeType === 'increase' ? '+' : trend.changeType === 'decrease' ? '-' : ''
  const absChange = Math.abs(trend.change)

  return (
    <div
      className={cn(
        'flex items-center space-x-1',
        sizeClasses[size],
        colorClasses[trend.changeType],
        className
      )}
    >
      {showIcon && <TrendIcon className={iconSizes[size]} />}
      {showValue && (
        <span className="font-medium">
          {sign}{absChange}%
        </span>
      )}
      {showPeriod && (
        <span className="text-text-muted">
          {trend.period}
        </span>
      )}
    </div>
  )
}

// ===== LOADING SKELETON =====

const MetricSkeleton: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const skeletonSizes = {
    sm: {
      title: 'h-4 w-24',
      value: 'h-6 w-16',
      subtitle: 'h-3 w-20',
    },
    md: {
      title: 'h-5 w-32',
      value: 'h-8 w-24',
      subtitle: 'h-4 w-28',
    },
    lg: {
      title: 'h-6 w-40',
      value: 'h-10 w-32',
      subtitle: 'h-5 w-36',
    },
  }

  return (
    <div className="animate-pulse space-y-3">
      <div className={cn('bg-neutral-200 rounded', skeletonSizes[size].title)} />
      <div className={cn('bg-neutral-200 rounded', skeletonSizes[size].value)} />
      <div className={cn('bg-neutral-200 rounded', skeletonSizes[size].subtitle)} />
    </div>
  )
}

// ===== METRIC CARD COMPONENT =====

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({
    className,
    title,
    value,
    subtitle,
    description,
    icon,
    trend,
    color = 'default',
    size = 'md',
    loading = false,
    interactive = false,
    onClick,
    actions,
    footer,
    'data-testid': testId,
    ...props
  }, ref) => {
    const colorClasses = {
      default: 'border-neutral-200',
      primary: 'border-brand-primary/20 bg-brand-primary/5',
      success: 'border-success-200 bg-success-50',
      warning: 'border-warning-200 bg-warning-50',
      error: 'border-error-200 bg-error-50',
      info: 'border-info-200 bg-info-50',
    }

    const sizeClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const titleSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    }

    const valueSizes = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
    }

    const iconSizes = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    }

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-surface-primary border rounded-xl',
            sizeClasses[size],
            colorClasses[color],
            className
          )}
          data-testid={testId}
        >
          <MetricSkeleton size={size} />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface-primary border rounded-xl transition-all duration-normal',
          'hover:shadow-md',
          sizeClasses[size],
          colorClasses[color],
          interactive && [
            'cursor-pointer',
            'hover:scale-[1.02]',
            'active:scale-[0.98]',
            'transform-gpu',
          ],
          className
        )}
        onClick={onClick}
        data-testid={testId}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              {icon && (
                <div className={cn('flex-shrink-0', iconSizes[size])}>
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={cn(
                  'font-medium text-text-primary truncate',
                  titleSizes[size]
                )}>
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-sm text-text-muted mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className={cn(
                'font-bold text-text-primary',
                valueSizes[size]
              )}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>

              {trend && (
                <TrendIndicator
                  trend={trend}
                  size={size === 'lg' ? 'md' : 'sm'}
                />
              )}

              {description && (
                <p className="text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex-shrink-0 ml-4">
              {actions}
            </div>
          )}
        </div>

        {footer && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            {footer}
          </div>
        )}
      </div>
    )
  }
)

MetricCard.displayName = 'MetricCard'

// ===== KPI WIDGET COMPONENT =====

export const KPIWidget = React.forwardRef<HTMLDivElement, KPIWidgetProps>(
  ({
    className,
    title,
    data,
    unit = '',
    format = 'number',
    precision = 0,
    trend,
    chart,
    status = 'neutral',
    size = 'md',
    loading = false,
    error,
    actions,
    onClick,
    'data-testid': testId,
    ...props
  }, ref) => {
    const statusClasses = {
      success: 'border-success-200 bg-success-50',
      warning: 'border-warning-200 bg-warning-50',
      error: 'border-error-200 bg-error-50',
      neutral: 'border-neutral-200',
    }

    const sizeClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    }

    const titleSizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    }

    const valueSizes = {
      sm: 'text-2xl',
      md: 'text-3xl',
      lg: 'text-4xl',
      xl: 'text-5xl',
    }

    // Format value based on format type
    const formatValue = (value: number): string => {
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          }).format(value)
        case 'percentage':
          return `${value.toFixed(precision)}%`
        default:
          return value.toLocaleString('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          })
      }
    }

    // Calculate progress percentage
    const progressPercentage = data.target
      ? Math.min((data.current / data.target) * 100, 100)
      : 0

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-surface-primary border rounded-xl',
            sizeClasses[size],
            statusClasses[status],
            className
          )}
          data-testid={testId}
        >
          <MetricSkeleton size={size} />
        </div>
      )
    }

    if (error) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-surface-primary border rounded-xl',
            sizeClasses[size],
            'border-error-200 bg-error-50',
            className
          )}
          data-testid={testId}
        >
          <div className="text-center text-error-600">
            <p className="font-medium">Error loading KPI</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface-primary border rounded-xl transition-all duration-normal',
          'hover:shadow-md',
          sizeClasses[size],
          statusClasses[status],
          onClick && [
            'cursor-pointer',
            'hover:scale-[1.02]',
            'active:scale-[0.98]',
            'transform-gpu',
          ],
          className
        )}
        onClick={onClick}
        data-testid={testId}
        {...props}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className={cn(
            'font-semibold text-text-primary',
            titleSizes[size]
          )}>
            {title}
          </h3>
          {actions && (
            <div className="flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className={cn(
            'font-bold text-text-primary',
            valueSizes[size]
          )}>
            {formatValue(data.current)}{unit}
          </div>

          {data.target && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-text-muted">
                <span>Target: {formatValue(data.target)}{unit}</span>
                <span>{progressPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all duration-500',
                    progressPercentage >= 100 ? 'bg-success-500' :
                    progressPercentage >= 75 ? 'bg-warning-500' :
                    'bg-brand-primary'
                  )}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {trend && (
            <TrendIndicator
              trend={trend}
              size={size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm'}
            />
          )}

          {data.previous && (
            <div className="text-sm text-text-muted">
              Previous: {formatValue(data.previous)}{unit}
            </div>
          )}

          {data.benchmark && (
            <div className="text-sm text-text-muted">
              Benchmark: {formatValue(data.benchmark)}{unit}
            </div>
          )}

          {chart && (
            <div className="mt-4">
              <div
                className="w-full bg-neutral-100 rounded"
                style={{ height: chart.height || 100 }}
              >
                {/* Chart placeholder - integrate with actual chart library */}
                <div className="flex items-center justify-center h-full text-text-muted">
                  Chart: {chart.type}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

KPIWidget.displayName = 'KPIWidget'

// ===== EXPORTS =====

export { TrendIndicator }
export default MetricCard

// ===== USAGE EXAMPLES =====

/*
// Basic MetricCard
<MetricCard
  title="Total Users"
  value={1234}
  subtitle="Active users"
  icon={<UsersIcon />}
  trend={{
    value: 12.5,
    change: 12.5,
    changeType: 'increase',
    period: 'vs last month'
  }}
/>

// Interactive MetricCard with actions
<MetricCard
  title="Revenue"
  value="$45,678"
  description="Monthly recurring revenue"
  color="success"
  size="lg"
  interactive
  onClick={() => navigate('/revenue')}
  actions={
    <Button variant="ghost" size="sm">
      View Details
    </Button>
  }
/>

// KPI Widget with target and chart
<KPIWidget
  title="Sales Target"
  data={{
    current: 85000,
    target: 100000,
    previous: 78000,
    benchmark: 90000
  }}
  format="currency"
  trend={{
    value: 8.9,
    change: 8.9,
    changeType: 'increase',
    period: 'vs last month'
  }}
  chart={{
    type: 'line',
    data: chartData,
    height: 120
  }}
  status="success"
  size="lg"
/>

// Loading states
<MetricCard
  title="Loading Metric"
  value=""
  loading
/>

<KPIWidget
  title="Loading KPI"
  data={{ current: 0 }}
  loading
/>

// Error state
<KPIWidget
  title="Failed KPI"
  data={{ current: 0 }}
  error="Failed to load data"
/>
*/