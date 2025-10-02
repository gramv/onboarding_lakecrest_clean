import { useState, useEffect, useRef, useCallback } from 'react'

export interface WebSocketOptions {
  url: string
  token?: string
  reconnect?: boolean
  reconnectInterval?: number
  reconnectAttempts?: number
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  onMessage?: (data: any) => void
}

export interface WebSocketHook {
  isConnected: boolean
  lastMessage: any
  sendMessage: (message: any) => void
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  reconnect: () => void
  disconnect: () => void
}

export function useWebSocket(options: WebSocketOptions): WebSocketHook {
  const {
    url,
    token,
    reconnect = true,
    reconnectInterval = 5000,
    reconnectAttempts = 5,
    onOpen,
    onClose,
    onError,
    onMessage
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  
  const ws = useRef<WebSocket | null>(null)
  const reconnectCount = useRef(0)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    try {
      // Construct URL with token as query parameter for WebSocket
      const wsUrl = token ? `${url}?token=${token}` : url
      
      setConnectionStatus('connecting')
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectCount.current = 0
        
        // Start heartbeat
        startHeartbeat()
        
        onOpen?.()
      }

      ws.current.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        setConnectionStatus('disconnected')
        
        stopHeartbeat()
        onClose?.()
        
        // Attempt reconnection if enabled
        if (reconnect && reconnectCount.current < reconnectAttempts) {
          reconnectCount.current++
          console.log(`Reconnecting... Attempt ${reconnectCount.current}/${reconnectAttempts}`)
          
          reconnectTimer.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
        onError?.(error)
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle heartbeat/pong messages
          if (data.type === 'pong') {
            return
          }
          
          setLastMessage(data)
          onMessage?.(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }, [url, token, reconnect, reconnectInterval, reconnectAttempts, onOpen, onClose, onError, onMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    
    stopHeartbeat()
    
    if (ws.current) {
      ws.current.close()
      ws.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message)
      ws.current.send(data)
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  const startHeartbeat = () => {
    // Send heartbeat every 30 seconds
    heartbeatTimer.current = setInterval(() => {
      sendMessage({ type: 'ping' })
    }, 30000)
  }

  const stopHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }

  const reconnectManually = useCallback(() => {
    reconnectCount.current = 0
    disconnect()
    setTimeout(() => connect(), 100)
  }, [connect, disconnect])

  // Initialize connection
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && reconnect) {
        console.log('Tab became visible, attempting reconnection...')
        reconnectManually()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isConnected, reconnect, reconnectManually])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connectionStatus,
    reconnect: reconnectManually,
    disconnect
  }
}