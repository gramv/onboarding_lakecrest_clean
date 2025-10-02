/**
 * Notification Badge Component
 * Displays notification count with visual indicators and click-through functionality
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, BellRing } from 'lucide-react'

export interface NotificationBadgeProps {
  count: number
  urgentCount?: number
  hasUnread?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showZero?: boolean
  animate?: boolean
  onClick?: () => void
  className?: string
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  urgentCount = 0,
  hasUnread = false,
  size = 'md',
  variant = 'ghost',
  showZero = false,
  animate = true,
  onClick,
  className
}) => {
  const shouldShow = count > 0 || showZero
  const hasUrgent = urgentCount > 0
  const displayCount = count > 99 ? '99+' : count.toString()

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const badgeSizeClasses = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-5 w-5 text-xs',
    lg: 'h-6 w-6 text-sm'
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size="icon"
        onClick={onClick}
        className={cn(
          sizeClasses[size],
          'relative transition-all duration-200',
          hasUnread && animate && 'animate-pulse',
          hasUrgent && 'text-red-600 hover:text-red-700',
          className
        )}
      >
        {hasUnread || hasUrgent ? (
          <BellRing className={cn(
            size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6',
            hasUrgent && 'text-red-600'
          )} />
        ) : (
          <Bell className={cn(
            size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
          )} />
        )}
      </Button>

      {/* Notification Count Badge */}
      {shouldShow && (
        <Badge
          variant={hasUrgent ? 'destructive' : 'default'}
          className={cn(
            'absolute -top-1 -right-1 flex items-center justify-center rounded-full border-2 border-background',
            badgeSizeClasses[size],
            'min-w-0 px-1',
            animate && hasUnread && 'animate-bounce',
            hasUrgent && 'bg-red-600 text-white animate-pulse'
          )}
        >
          {displayCount}
        </Badge>
      )}

      {/* Urgent Indicator Dot */}
      {hasUrgent && (
        <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-600 rounded-full border-2 border-background animate-ping" />
      )}
    </div>
  )
}

export default NotificationBadge