import React, { useState, useEffect, useCallback } from 'react'
import { 
  Bell, X, Check, AlertCircle, Info, CheckCircle, 
  XCircle, Clock, Mail, MessageSquare, Smartphone,
  Filter, Settings, Archive, Trash2, RefreshCw
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useWebSocket } from '../../hooks/useWebSocket'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

// Notification types
interface Notification {
  id: string
  type: 'application' | 'deadline' | 'system' | 'compliance' | 'approval' | 'reminder'
  channel: 'in_app' | 'email' | 'sms' | 'push'
  subject: string
  body: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: 'unread' | 'read' | 'archived'
  created_at: string
  read_at?: string
  metadata?: Record<string, any>
  action_url?: string
  action_text?: string
}

interface NotificationPreferences {
  email: {
    enabled: boolean
    frequency: 'immediate' | 'hourly' | 'daily'
    types: string[]
  }
  in_app: {
    enabled: boolean
    frequency: 'immediate' | 'hourly' | 'daily'
    types: string[]
  }
  sms: {
    enabled: boolean
    frequency: 'immediate' | 'hourly' | 'daily'
    types: string[]
  }
  push: {
    enabled: boolean
    frequency: 'immediate' | 'hourly' | 'daily'
    types: string[]
  }
  quiet_hours?: {
    start: string
    end: string
  }
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())

  // WebSocket connection for real-time notifications
  const { lastMessage, isConnected } = useWebSocket({
    url: `ws://localhost:8000/ws/notifications`,
    token: user?.token,
    reconnect: true,
    onMessage: (data) => {
      if (data.type === 'notification') {
        handleNewNotification(data.data)
      }
    }
  })

  // Fetch notifications on mount
  useEffect(() => {
    if (user?.token) {
      fetchNotifications()
      fetchPreferences()
    }
  }, [user])

  // Update unread count
  useEffect(() => {
    const count = notifications.filter(n => n.status === 'unread').length
    setUnreadCount(count)
  }, [notifications])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${user?.token}` }
      })
      setNotifications(response.data.notifications || [])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${user?.token}` }
      })
      setPreferences(response.data.preferences)
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const handleNewNotification = (notification: Notification) => {
    // Add new notification to the top
    setNotifications(prev => [notification, ...prev])
    
    // Show browser notification if enabled
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.subject, {
        body: notification.body,
        icon: '/notification-icon.png',
        tag: notification.id
      })
    }
    
    // Play notification sound for urgent notifications
    if (notification.priority === 'urgent') {
      playNotificationSound()
    }
  }

  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3')
    audio.play().catch(e => console.log('Could not play notification sound:', e))
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await axios.post(
        '/api/notifications/mark-read',
        { notification_ids: notificationIds },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      )
      
      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id)
            ? { ...n, status: 'read', read_at: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const archiveNotifications = async (notificationIds: string[]) => {
    try {
      await axios.post(
        '/api/notifications/archive',
        { notification_ids: notificationIds },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      )
      
      setNotifications(prev =>
        prev.filter(n => !notificationIds.includes(n.id))
      )
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Failed to archive notifications:', error)
    }
  }

  const deleteNotifications = async (notificationIds: string[]) => {
    try {
      await axios.delete('/api/notifications', {
        data: { notification_ids: notificationIds },
        headers: { Authorization: `Bearer ${user?.token}` }
      })
      
      setNotifications(prev =>
        prev.filter(n => !notificationIds.includes(n.id))
      )
      setSelectedNotifications(new Set())
    } catch (error) {
      console.error('Failed to delete notifications:', error)
    }
  }

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await axios.put(
        '/api/notifications/preferences',
        newPreferences,
        { headers: { Authorization: `Bearer ${user?.token}` } }
      )
      setPreferences(newPreferences)
      setShowPreferences(false)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.status === 'unread'
    if (filter === 'urgent') return n.priority === 'urgent' || n.priority === 'high'
    return true
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application': return <Mail className="w-5 h-5" />
      case 'deadline': return <Clock className="w-5 h-5" />
      case 'system': return <Info className="w-5 h-5" />
      case 'compliance': return <AlertCircle className="w-5 h-5" />
      case 'approval': return <CheckCircle className="w-5 h-5" />
      case 'reminder': return <Bell className="w-5 h-5" />
      default: return <MessageSquare className="w-5 h-5" />
    }
  }

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Connection Status Indicator */}
        <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 h-full w-full sm:w-96 bg-white shadow-xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPreferences(!showPreferences)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={fetchNotifications}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Preferences Panel */}
                {showPreferences && preferences && (
                  <div className="p-4 bg-gray-50 border-b">
                    <h3 className="font-medium mb-3">Notification Preferences</h3>
                    <div className="space-y-3">
                      {(['email', 'in_app', 'sms', 'push'] as const).map(channel => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{channel.replace('_', ' ')}</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences[channel].enabled}
                              onChange={(e) => {
                                const newPrefs = {
                                  ...preferences,
                                  [channel]: {
                                    ...preferences[channel],
                                    enabled: e.target.checked
                                  }
                                }
                                updatePreferences(newPrefs)
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 p-4 border-b">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'unread'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    onClick={() => setFilter('urgent')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'urgent'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Urgent
                  </button>
                </div>

                {/* Bulk Actions */}
                {selectedNotifications.size > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border-b">
                    <span className="text-sm font-medium">
                      {selectedNotifications.size} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markAsRead(Array.from(selectedNotifications))}
                        className="p-1.5 hover:bg-blue-100 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => archiveNotifications(Array.from(selectedNotifications))}
                        className="p-1.5 hover:bg-blue-100 rounded-lg"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNotifications(Array.from(selectedNotifications))}
                        className="p-1.5 hover:bg-red-100 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                      <Bell className="w-8 h-8 mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredNotifications.map(notification => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${
                            notification.status === 'unread' ? 'bg-blue-50 bg-opacity-30' : ''
                          }`}
                          onClick={() => {
                            if (notification.status === 'unread') {
                              markAsRead([notification.id])
                            }
                            if (notification.action_url) {
                              window.location.href = notification.action_url
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedNotifications.has(notification.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleNotificationSelection(notification.id)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />

                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${getNotificationColor(notification.priority)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 truncate">
                                    {notification.subject}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {notification.body}
                                  </p>
                                  {notification.action_text && (
                                    <button className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium">
                                      {notification.action_text} →
                                    </button>
                                  )}
                                </div>
                                {notification.status === 'unread' && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 flex-shrink-0" />
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                <span>{new Date(notification.created_at).toRelativeTimeString()}</span>
                                {notification.channel !== 'in_app' && (
                                  <span className="capitalize">{notification.channel}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t">
                  <button
                    onClick={() => markAsRead(filteredNotifications.filter(n => n.status === 'unread').map(n => n.id))}
                    className="w-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Add this extension to Date prototype for relative time
declare global {
  interface Date {
    toRelativeTimeString(): string
  }
}

Date.prototype.toRelativeTimeString = function() {
  const now = new Date()
  const diff = now.getTime() - this.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}