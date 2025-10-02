/**
 * WebSocket Service for Real-time Notifications
 * Handles WebSocket connections, message handling, and notification delivery
 */

export interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
  priority?: 'low' | 'normal' | 'high' | 'critical'
}

export interface NotificationData {
  id: string
  user_id: string
  title: string
  message: string
  category: string
  severity: string
  created_at: string
  expires_at?: string
  status: string
  channels: string[]
  actions: Array<{
    id: string
    label: string
    action_type: string
    action_data: any
    style: string
  }>
  metadata: any
  read_at?: string
  dismissed_at?: string
}

export interface ConnectionStatus {
  connected: boolean
  reconnecting: boolean
  lastConnected?: Date
  connectionId?: string
  reconnectionAttempts: number
}

type MessageHandler = (message: WebSocketMessage) => void
type ConnectionHandler = (status: ConnectionStatus) => void
type NotificationHandler = (notification: NotificationData) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectionAttempts: 0
  }

  // Event handlers
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private connectionHandlers: ConnectionHandler[] = []
  private notificationHandlers: NotificationHandler[] = []

  // Message queue for offline messages
  private messageQueue: WebSocketMessage[] = []
  private maxQueueSize = 100

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = process.env.NODE_ENV === 'development' 
      ? 'localhost:8000' 
      : window.location.host
    this.url = `${protocol}//${host}/ws/dashboard`
  }

  /**
   * Connect to WebSocket server
   */
  connect(authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.token = authToken
      this.ws = new WebSocket(`${this.url}?token=${authToken}`)

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        this.connectionStatus = {
          connected: true,
          reconnecting: false,
          lastConnected: new Date(),
          reconnectionAttempts: this.reconnectAttempts
        }
        
        this.notifyConnectionHandlers()
        this.startHeartbeat()
        this.processMessageQueue()
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.connectionStatus.connected = false
        this.notifyConnectionHandlers()
        this.stopHeartbeat()

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.stopHeartbeat()
    this.connectionStatus.connected = false
    this.notifyConnectionHandlers()
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for when connection is restored
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push(message)
      }
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, [])
    }
    this.messageHandlers.get(messageType)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler)
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler)
      if (index > -1) {
        this.connectionHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to notifications
   */
  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.push(handler)
    
    // Return unsubscribe function
    return () => {
      const index = this.notificationHandlers.indexOf(handler)
      if (index > -1) {
        this.notificationHandlers.splice(index, 1)
      }
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): void {
    this.send({
      type: 'mark_notification_read',
      data: { notification_id: notificationId }
    })
  }

  /**
   * Dismiss notification
   */
  dismissNotification(notificationId: string): void {
    this.send({
      type: 'dismiss_notification',
      data: { notification_id: notificationId }
    })
  }

  // Private methods

  private handleMessage(message: WebSocketMessage): void {
    // Handle specific message types
    switch (message.type) {
      case 'notification':
        this.handleNotification(message.data)
        break
      case 'connection_established':
        this.handleConnectionEstablished(message.data)
        break
      case 'reconnection_successful':
        this.handleReconnectionSuccessful(message.data)
        break
      case 'ping':
        this.handlePing()
        break
      default:
        // Forward to registered handlers
        const handlers = this.messageHandlers.get(message.type)
        if (handlers) {
          handlers.forEach(handler => handler(message))
        }
    }
  }

  private handleNotification(notificationData: NotificationData): void {
    // Play notification sound if enabled
    this.playNotificationSound(notificationData.severity)
    
    // Show browser notification if permission granted
    this.showBrowserNotification(notificationData)
    
    // Notify all notification handlers
    this.notificationHandlers.forEach(handler => handler(notificationData))
  }

  private handleConnectionEstablished(data: any): void {
    console.log('Connection established:', data)
    this.connectionStatus.connectionId = data.connection_id
    this.notifyConnectionHandlers()
  }

  private handleReconnectionSuccessful(data: any): void {
    console.log('Reconnection successful:', data)
    this.connectionStatus.reconnecting = false
    this.notifyConnectionHandlers()
  }

  private handlePing(): void {
    // Respond to server ping with pong
    this.send({
      type: 'pong',
      data: { timestamp: new Date().toISOString() }
    })
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    this.connectionStatus.reconnecting = true
    this.connectionStatus.reconnectionAttempts = this.reconnectAttempts
    this.notifyConnectionHandlers()

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      if (this.token) {
        this.connect(this.token).catch(error => {
          console.error('Reconnection failed:', error)
          this.attemptReconnect()
        })
      }
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'heartbeat',
          data: { timestamp: new Date().toISOString() }
        })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  private notifyConnectionHandlers(): void {
    this.connectionHandlers.forEach(handler => handler(this.connectionStatus))
  }

  private playNotificationSound(severity: string): void {
    // Only play sound for high priority notifications
    if (severity === 'warning' || severity === 'error' || severity === 'critical') {
      try {
        const audio = new Audio('/notification-sound.mp3')
        audio.volume = 0.3
        audio.play().catch(error => {
          console.log('Could not play notification sound:', error)
        })
      } catch (error) {
        console.log('Notification sound not available:', error)
      }
    }
  }

  private showBrowserNotification(notificationData: NotificationData): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(notificationData.title, {
          body: notificationData.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notificationData.id,
          requireInteraction: notificationData.severity === 'critical'
        })

        notification.onclick = () => {
          window.focus()
          // Handle notification click action
          if (notificationData.actions.length > 0) {
            const primaryAction = notificationData.actions[0]
            if (primaryAction.action_type === 'url') {
              window.location.href = primaryAction.action_data.url
            }
          }
          notification.close()
        }

        // Auto-close after 5 seconds for non-critical notifications
        if (notificationData.severity !== 'critical') {
          setTimeout(() => notification.close(), 5000)
        }
      } catch (error) {
        console.error('Failed to show browser notification:', error)
      }
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()