import React from 'react'
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline'

interface SyncIndicatorProps {
  status: SyncStatus
  lastSyncTime?: Date
  error?: string
  className?: string
  showDetails?: boolean
}

export function SyncIndicator({
  status,
  lastSyncTime,
  error,
  className,
  showDetails = true
}: SyncIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'synced':
        return <Check className="h-4 w-4" />
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'offline':
        return <CloudOff className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'synced':
        return 'text-green-600'
      case 'syncing':
        return 'text-blue-600'
      case 'error':
        return 'text-red-600'
      case 'offline':
        return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'synced':
        return 'Synced to cloud'
      case 'syncing':
        return 'Syncing...'
      case 'error':
        return 'Sync error'
      case 'offline':
        return 'Offline - saved locally'
    }
  }

  const formatSyncTime = () => {
    if (!lastSyncTime) return null
    
    const now = new Date()
    const diff = now.getTime() - lastSyncTime.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return lastSyncTime.toLocaleDateString()
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn('flex items-center space-x-1', getStatusColor())}>
        {status === 'synced' ? (
          <Cloud className="h-4 w-4" />
        ) : (
          getStatusIcon()
        )}
        {showDetails && (
          <span className="text-sm font-medium">{getStatusText()}</span>
        )}
      </div>
      
      {showDetails && lastSyncTime && status === 'synced' && (
        <span className="text-xs text-gray-500">
          ({formatSyncTime()})
        </span>
      )}
      
      {showDetails && error && status === 'error' && (
        <span className="text-xs text-red-600" title={error}>
          - {error.length > 30 ? error.substring(0, 30) + '...' : error}
        </span>
      )}
    </div>
  )
}

interface SyncBadgeProps {
  status: SyncStatus
  className?: string
}

export function SyncBadge({ status, className }: SyncBadgeProps) {
  const getBackgroundColor = () => {
    switch (status) {
      case 'synced':
        return 'bg-green-100'
      case 'syncing':
        return 'bg-blue-100'
      case 'error':
        return 'bg-red-100'
      case 'offline':
        return 'bg-gray-100'
    }
  }

  const getIconColor = () => {
    switch (status) {
      case 'synced':
        return 'text-green-600'
      case 'syncing':
        return 'text-blue-600'
      case 'error':
        return 'text-red-600'
      case 'offline':
        return 'text-gray-600'
    }
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full p-1',
        getBackgroundColor(),
        className
      )}
    >
      <div className={getIconColor()}>
        {status === 'synced' ? (
          <Cloud className="h-3 w-3" />
        ) : status === 'syncing' ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : status === 'error' ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <CloudOff className="h-3 w-3" />
        )}
      </div>
    </div>
  )
}