import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface WebSocketOptions {
  enabled?: boolean
  onMessage?: (event: MessageEvent) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
  heartbeatInterval?: number
  reconnectDelay?: number
  maxReconnectAttempts?: number
}

interface WebSocketState {
  isConnected: boolean
  lastMessage: any
  connectionError: string | null
}

export function useWebSocket(
  endpoint: string,
  options: WebSocketOptions = {}
) {
  const {
    enabled = true,
    onMessage,
    onOpen,
    onClose,
    onError,
    heartbeatInterval = 30000, // 30 seconds
    reconnectDelay = 3000, // 3 seconds
    maxReconnectAttempts = 5
  } = options

  const { token } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const isIntentionallyClosed = useRef(false)

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    connectionError: null
  })

  // Clear timers utility
  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  // Send heartbeat message
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Only log heartbeat in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.debug('[WebSocket] Sending heartbeat')
      }
      wsRef.current.send(JSON.stringify({ type: 'heartbeat' }))
    }
  }, [])

  // Setup heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }
    heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval)
  }, [heartbeatInterval, sendHeartbeat])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || !token || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Prevent reconnecting if already in process
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.debug('[WebSocket] Connection already in progress, skipping')
      return
    }

    // Clean up existing connection
    if (wsRef.current) {
      isIntentionallyClosed.current = true
      wsRef.current.close()
      wsRef.current = null
    }

    try {
      // Construct WebSocket URL with token as query parameter
      const wsUrl = `${endpoint}?token=${encodeURIComponent(token)}`
      console.debug('[WebSocket] Connecting to:', endpoint)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = (event) => {
        console.debug('[WebSocket] Connected successfully')
        reconnectAttempts.current = 0
        isIntentionallyClosed.current = false
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null
        }))
        setupHeartbeat()
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          // Only log non-heartbeat messages to reduce console noise
          if (data.type !== 'heartbeat_ack') {
            console.debug('[WebSocket] Message received:', data.type)
          }
          
          // Update last message in state
          setState(prev => ({
            ...prev,
            lastMessage: data
          }))

          // Handle heartbeat acknowledgment
          if (data.type === 'heartbeat_ack') {
            // Silently handle heartbeat acknowledgment
            return
          }

          // Call custom message handler
          onMessage?.(event)
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
          // Still call the handler with raw event
          onMessage?.(event)
        }
      }

      ws.onclose = (event) => {
        console.debug('[WebSocket] Connection closed:', event.code, event.reason)
        clearTimers()
        setState(prev => ({
          ...prev,
          isConnected: false
        }))
        wsRef.current = null

        // Don't reconnect if authentication failed (4001) or forbidden (1008/4003)
        const authFailureCodes = [4001, 1008, 4003]
        if (authFailureCodes.includes(event.code)) {
          console.error('[WebSocket] Authentication failed - not reconnecting')
          setState(prev => ({
            ...prev,
            connectionError: 'Authentication failed - please refresh the page'
          }))
          return
        }

        // Reconnect if not intentionally closed and within retry limits
        if (!isIntentionallyClosed.current && 
            reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          
          // Calculate delay with exponential backoff (3s, 6s, 12s, 24s, 30s max)
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts.current - 1), 30000)
          
          console.debug(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setState(prev => ({
            ...prev,
            connectionError: 'Maximum reconnection attempts reached'
          }))
        }

        onClose?.(event)
      }

      ws.onerror = (event) => {
        console.error('[WebSocket] Error occurred:', event)
        setState(prev => ({
          ...prev,
          connectionError: 'WebSocket connection error'
        }))
        onError?.(event)
      }
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error)
      setState(prev => ({
        ...prev,
        connectionError: 'Failed to establish WebSocket connection'
      }))
    }
  }, [enabled, token, endpoint, onOpen, onMessage, onClose, onError, setupHeartbeat, clearTimers, reconnectDelay, maxReconnectAttempts])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.debug('[WebSocket] Disconnecting...')
    isIntentionallyClosed.current = true
    clearTimers()
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      connectionError: null
    }))
  }, [clearTimers])

  // Send a message through WebSocket
  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      wsRef.current.send(message)
      console.debug('[WebSocket] Message sent:', data)
    } else {
      console.warn('[WebSocket] Cannot send message - connection not open')
    }
  }, [])

  // Effect to manage connection lifecycle
  useEffect(() => {
    // Only connect if explicitly enabled and we have a token
    if (enabled && token) {
      // Add a small delay to prevent React StrictMode double-mount issues
      const connectTimer = setTimeout(() => {
        connect()
      }, 100)
      
      return () => {
        clearTimeout(connectTimer)
        disconnect()
      }
    }
  }, [enabled, token]) // Removed connect and disconnect to prevent loops

  return {
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    connectionError: state.connectionError,
    sendMessage,
    connect,
    disconnect
  }
}