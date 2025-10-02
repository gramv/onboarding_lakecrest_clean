/**
 * TrendIndicator Component
 * Displays trend information with directional arrows and percentage changes
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface TrendData {
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  period: string
}

interface TrendIndicatorProps {
  trend: TrendData
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showValue?: boolean
  showPeriod?: boolean
  className?: string
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
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
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-500',
  }

  const TrendIcon = {
    increase: TrendingUp,
    decrease: TrendingDown,
    neutral: Minus,
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
          {sign}{absChange.toFixed(1)}%
        </span>
      )}
      {showPeriod && (
        <span className="text-gray-500">
          {trend.period}
        </span>
      )}
    </div>
  )
}

export default TrendIndicator