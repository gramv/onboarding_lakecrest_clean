import * as React from "react"
import { Check, Circle, Clock, AlertCircle, X, User, FileText, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface TimelineItem {
  id: string
  title: string
  description?: string
  timestamp: string | Date
  status?: 'completed' | 'current' | 'pending' | 'error'
  icon?: React.ReactNode
  user?: {
    name: string
    avatar?: string
    role?: string
  }
  metadata?: Record<string, any>
  actions?: React.ReactNode
}

interface TimelineProps {
  items: TimelineItem[]
  orientation?: 'vertical' | 'horizontal'
  variant?: 'default' | 'compact' | 'detailed'
  showConnector?: boolean
  className?: string
}

const statusConfig = {
  completed: {
    icon: Check,
    color: "text-green-600 bg-green-100",
    lineColor: "bg-green-600",
    badge: "success"
  },
  current: {
    icon: Circle,
    color: "text-blue-600 bg-blue-100",
    lineColor: "bg-blue-600",
    badge: "default"
  },
  pending: {
    icon: Clock,
    color: "text-gray-400 bg-gray-100",
    lineColor: "bg-gray-300",
    badge: "secondary"
  },
  error: {
    icon: X,
    color: "text-red-600 bg-red-100",
    lineColor: "bg-red-600",
    badge: "destructive"
  }
} as const

export function Timeline({
  items,
  orientation = 'vertical',
  variant = 'default',
  showConnector = true,
  className
}: TimelineProps) {
  if (orientation === 'horizontal') {
    return (
      <HorizontalTimeline
        items={items}
        variant={variant}
        showConnector={showConnector}
        className={className}
      />
    )
  }
  
  return (
    <VerticalTimeline
      items={items}
      variant={variant}
      showConnector={showConnector}
      className={className}
    />
  )
}

function VerticalTimeline({
  items,
  variant,
  showConnector,
  className
}: Omit<TimelineProps, 'orientation'>) {
  return (
    <div className={cn("relative", className)}>
      {showConnector && (
        <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200" />
      )}
      
      <div className="space-y-6">
        {items.map((item, index) => {
          const status = item.status || 'pending'
          const config = statusConfig[status]
          const StatusIcon = item.icon ? () => item.icon : config.icon
          
          return (
            <div key={item.id} className="relative flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "relative z-10 flex h-12 w-12 items-center justify-center rounded-full",
                config.color
              )}>
                <StatusIcon className="h-5 w-5" />
                {showConnector && status === 'completed' && index < items.length - 1 && (
                  <div 
                    className={cn(
                      "absolute top-12 left-1/2 h-6 w-0.5 -translate-x-1/2",
                      config.lineColor
                    )}
                  />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-6">
                {variant === 'compact' ? (
                  <CompactContent item={item} status={status} />
                ) : variant === 'detailed' ? (
                  <DetailedContent item={item} status={status} />
                ) : (
                  <DefaultContent item={item} status={status} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HorizontalTimeline({
  items,
  variant,
  showConnector,
  className
}: Omit<TimelineProps, 'orientation'>) {
  return (
    <div className={cn("relative overflow-x-auto", className)}>
      <div className="flex items-start gap-8 pb-4">
        {items.map((item, index) => {
          const status = item.status || 'pending'
          const config = statusConfig[status]
          const StatusIcon = item.icon ? () => item.icon : config.icon
          const isLast = index === items.length - 1
          
          return (
            <div key={item.id} className="flex flex-col items-center min-w-[150px]">
              {/* Icon with connector */}
              <div className="relative">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  config.color
                )}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                {showConnector && !isLast && (
                  <div 
                    className={cn(
                      "absolute left-12 top-1/2 h-0.5 w-[calc(8rem-3rem)] -translate-y-1/2",
                      status === 'completed' ? config.lineColor : "bg-gray-300"
                    )}
                  />
                )}
              </div>
              
              {/* Content */}
              <div className="mt-4 text-center">
                <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                <p className="mt-1 text-xs text-gray-500">
                  {formatTimestamp(item.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DefaultContent({ item, status }: { item: TimelineItem; status: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
        <Badge variant={statusConfig[status as keyof typeof statusConfig].badge as any}>
          {status}
        </Badge>
      </div>
      {item.description && (
        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {formatTimestamp(item.timestamp)}
      </p>
      {item.actions && (
        <div className="mt-3">
          {item.actions}
        </div>
      )}
    </div>
  )
}

function CompactContent({ item, status }: { item: TimelineItem; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatTimestamp(item.timestamp)}
        </p>
      </div>
      <Badge variant={statusConfig[status as keyof typeof statusConfig].badge as any} className="ml-4">
        {status}
      </Badge>
    </div>
  )
}

function DetailedContent({ item, status }: { item: TimelineItem; status: string }) {
  return (
    <div className="bg-white rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-base font-medium text-gray-900">{item.title}</h4>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatTimestamp(item.timestamp)}
          </p>
        </div>
        <Badge variant={statusConfig[status as keyof typeof statusConfig].badge as any}>
          {status}
        </Badge>
      </div>
      
      {item.description && (
        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
      )}
      
      {item.user && (
        <div className="flex items-center gap-3 mb-3 pt-3 border-t">
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.user.avatar} alt={item.user.name} />
            <AvatarFallback>
              {item.user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
            {item.user.role && (
              <p className="text-xs text-gray-500">{item.user.role}</p>
            )}
          </div>
        </div>
      )}
      
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t">
          {Object.entries(item.metadata).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs text-gray-500">{formatKey(key)}</p>
              <p className="text-sm font-medium text-gray-900">{String(value)}</p>
            </div>
          ))}
        </div>
      )}
      
      {item.actions && (
        <div className="mt-4 pt-3 border-t">
          {item.actions}
        </div>
      )}
    </div>
  )
}

// Activity timeline for audit logs
export function ActivityTimeline({
  activities,
  className
}: {
  activities: Array<{
    id: string
    action: string
    timestamp: string | Date
    user: {
      name: string
      avatar?: string
    }
    details?: string
    type?: 'create' | 'update' | 'delete' | 'view' | 'comment'
  }>
  className?: string
}) {
  const typeIcons = {
    create: <FileText className="h-4 w-4" />,
    update: <FileText className="h-4 w-4" />,
    delete: <X className="h-4 w-4" />,
    view: <User className="h-4 w-4" />,
    comment: <Mail className="h-4 w-4" />
  }
  
  const typeColors = {
    create: "text-green-600",
    update: "text-blue-600",
    delete: "text-red-600",
    view: "text-gray-600",
    comment: "text-purple-600"
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
            <AvatarFallback>
              {activity.user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm">
                <span className="font-medium text-gray-900">{activity.user.name}</span>
                {' '}
                <span className="text-gray-600">{activity.action}</span>
              </p>
              {activity.type && (
                <span className={cn("inline-flex", typeColors[activity.type])}>
                  {typeIcons[activity.type]}
                </span>
              )}
            </div>
            {activity.details && (
              <p className="text-sm text-gray-500">{activity.details}</p>
            )}
            <p className="text-xs text-gray-400">
              {formatTimestamp(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper functions
function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return days === 1 ? 'Yesterday' : `${days} days ago`
  }
  
  // Default to date format
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}