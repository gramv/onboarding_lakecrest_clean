/**
 * Notification Panel Component
 * Displays notifications in a dropdown panel with actions and filtering
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Clock,
  User,
  Building2,
  FileText,
  X,
  Check,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { NotificationData } from '@/services/websocketService'

export interface NotificationPanelProps {
  notifications: NotificationData[]
  onMarkAsRead: (notificationId: string) => void
  onDismiss: (notificationId: string) => void
  onClearAll: () => void
  onNotificationClick?: (notification: NotificationData) => void
  maxHeight?: string
  className?: string
}

const getNotificationIcon = (category: string, severity: string) => {
  if (severity === 'error' || severity === 'critical') {
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }
  if (severity === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }
  if (severity === 'success') {
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  switch (category) {
    case 'application':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'employee':
      return <User className="h-4 w-4 text-purple-500" />
    case 'property':
      return <Building2 className="h-4 w-4 text-orange-500" />
    case 'system':
      return <Info className="h-4 w-4 text-gray-500" />
    default:
      return <Info className="h-4 w-4 text-gray-500" />
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-l-red-600 bg-red-50'
    case 'error':
      return 'border-l-red-500 bg-red-50'
    case 'warning':
      return 'border-l-yellow-500 bg-yellow-50'
    case 'success':
      return 'border-l-green-500 bg-green-50'
    case 'info':
    default:
      return 'border-l-blue-500 bg-blue-50'
  }
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onMarkAsRead,
  onDismiss,
  onClearAll,
  onNotificationClick,
  maxHeight = '400px',
  className
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read_at)
        break
      case 'urgent':
        filtered = filtered.filter(n => 
          n.severity === 'warning' || n.severity === 'error' || n.severity === 'critical'
        )
        break
      case 'all':
      default:
        break
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [notifications, filter])

  const unreadCount = notifications.filter(n => !n.read_at).length
  const urgentCount = notifications.filter(n => 
    (n.severity === 'warning' || n.severity === 'error' || n.severity === 'critical') && !n.read_at
  ).length

  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read if not already read
    if (!notification.read_at) {
      onMarkAsRead(notification.id)
    }

    // Handle primary action if available
    if (notification.actions.length > 0) {
      const primaryAction = notification.actions[0]
      if (primaryAction.action_type === 'url') {
        window.location.href = primaryAction.action_data.url
      }
    }

    // Call custom click handler
    if (onNotificationClick) {
      onNotificationClick(notification)
    }
  }

  if (notifications.length === 0) {
    return (
      <div className={cn('p-6 text-center text-gray-500', className)}>
        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm">No notifications</p>
        <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
      </div>
    )
  }

  return (
    <div className={cn('w-80', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-6 px-2"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs h-7 px-3"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs h-7 px-3"
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'urgent' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('urgent')}
            className="text-xs h-7 px-3"
          >
            Urgent ({urgentCount})
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea style={{ maxHeight }} className="p-2">
        {filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No {filter} notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-sm',
                  getSeverityColor(notification.severity),
                  !notification.read_at && 'ring-1 ring-blue-200',
                  notification.read_at && 'opacity-75'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.category, notification.severity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkAsRead(notification.id)
                            }}
                            className="h-6 w-6 p-0 hover:bg-white/50"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDismiss(notification.id)
                          }}
                          className="h-6 w-6 p-0 hover:bg-white/50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                          {notification.category}
                        </Badge>
                        {notification.severity !== 'info' && (
                          <Badge 
                            variant={notification.severity === 'critical' || notification.severity === 'error' ? 'destructive' : 'secondary'}
                            className="text-xs px-1.5 py-0.5"
                          >
                            {notification.severity}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Actions */}
                    {notification.actions.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        {notification.actions.slice(0, 2).map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (action.action_type === 'url') {
                                window.location.href = action.action_data.url
                              }
                            }}
                            className="text-xs h-6 px-2"
                          >
                            {action.label}
                            {action.action_type === 'url' && (
                              <ExternalLink className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export default NotificationPanel