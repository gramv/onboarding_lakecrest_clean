/**
 * WebSocket Test Component
 * Simple component to demonstrate and test WebSocket functionality
 * Can be used for development and debugging
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Send,
  MessageCircle,
  Users,
  Wifi
} from 'lucide-react';
import { useWebSocket, WebSocketMessage } from '../../hooks/useWebSocket';
import { useAuthContext } from '../../contexts/AuthContext';

interface TestMessage {
  id: string;
  timestamp: Date;
  direction: 'sent' | 'received';
  type: string;
  data: any;
}

export function WebSocketTest() {
  const { user, token } = useAuthContext();
  const [testMode, setTestMode] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [customMessage, setCustomMessage] = useState('{"type": "heartbeat", "data": {}}');
  const [roomToSubscribe, setRoomToSubscribe] = useState('');

  const websocket = useWebSocket({
    autoConnect: testMode,
    debug: true,
    reconnect: {
      enabled: true,
      maxAttempts: 3,
      initialDelay: 1000
    }
  });

  // Add received messages to test log
  const addMessage = (direction: 'sent' | 'received', type: string, data: any) => {
    const message: TestMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      direction,
      type,
      data
    };
    setMessages(prev => [message, ...prev.slice(0, 49)]); // Keep last 50 messages
  };

  // Subscribe to all message types for testing
  useEffect(() => {
    if (!testMode) return;

    const messageTypes = [
      'connection_established',
      'heartbeat_ack',
      'subscribe_success',
      'subscribe_error',
      'unsubscribe_success',
      'stats',
      'notification',
      'application_submitted',
      'application_approved',
      'onboarding_started',
      'system_notification',
      'error'
    ];

    const unsubscribers = messageTypes.map(type =>
      websocket.onMessage(type, (data) => {
        addMessage('received', type, data);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [websocket, testMode]);

  // Connection state change listener
  useEffect(() => {
    if (!testMode) return;

    return websocket.onConnectionChange((state) => {
      addMessage('received', 'connection_state_change', { state });
    });
  }, [websocket, testMode]);

  const handleStartTest = () => {
    setTestMode(true);
    setMessages([]);
    websocket.connect();
  };

  const handleStopTest = () => {
    setTestMode(false);
    websocket.disconnect();
  };

  const handleSendCustomMessage = () => {
    try {
      const messageObj = JSON.parse(customMessage);
      const success = websocket.sendMessage(messageObj);
      
      if (success) {
        addMessage('sent', messageObj.type || 'unknown', messageObj.data || {});
      }
    } catch (error) {
      console.error('Invalid JSON:', error);
    }
  };

  const handleSubscribeToRoom = () => {
    if (roomToSubscribe.trim()) {
      websocket.subscribeToRoom(roomToSubscribe.trim());
      addMessage('sent', 'subscribe_request', { room_id: roomToSubscribe.trim() });
    }
  };

  const handleGetStats = () => {
    websocket.getStats();
    addMessage('sent', 'get_stats', {});
  };

  const handleSendHeartbeat = () => {
    const success = websocket.sendMessage({
      type: 'heartbeat',
      data: { timestamp: new Date().toISOString() }
    });
    
    if (success) {
      addMessage('sent', 'heartbeat', { timestamp: new Date().toISOString() });
    }
  };

  if (!user || !token) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to test WebSocket functionality</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* WebSocket Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              WebSocket Test Console
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={websocket.isConnected ? 'default' : 'secondary'}>
                {websocket.connectionState}
              </Badge>
              {!testMode ? (
                <Button onClick={handleStartTest} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Test
                </Button>
              ) : (
                <Button onClick={handleStopTest} size="sm" variant="destructive">
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Test
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium">Connection State</p>
              <p className="text-sm text-muted-foreground">{websocket.connectionState}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Reconnect Attempts</p>
              <p className="text-sm text-muted-foreground">{websocket.reconnectAttempt}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Subscribed Rooms</p>
              <p className="text-sm text-muted-foreground">
                {websocket.subscribedRooms.size > 0 
                  ? Array.from(websocket.subscribedRooms).join(', ')
                  : 'None'
                }
              </p>
            </div>
          </div>
          
          {websocket.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">Error: {websocket.error.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleSendHeartbeat} 
              disabled={!websocket.isConnected}
              size="sm"
              variant="outline"
            >
              Send Heartbeat
            </Button>
            <Button 
              onClick={handleGetStats} 
              disabled={!websocket.isConnected || user?.role !== 'HR'}
              size="sm"
              variant="outline"
            >
              Get Stats
            </Button>
          </div>

          <Separator />

          {/* Room Subscription */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Room Subscription</p>
            <div className="flex gap-2">
              <Input
                placeholder="Room ID (e.g., global, property-123)"
                value={roomToSubscribe}
                onChange={(e) => setRoomToSubscribe(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSubscribeToRoom}
                disabled={!websocket.isConnected || !roomToSubscribe.trim()}
                size="sm"
              >
                Subscribe
              </Button>
            </div>
          </div>

          <Separator />

          {/* Custom Message */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Custom Message</p>
            <Textarea
              placeholder="JSON message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleSendCustomMessage}
              disabled={!websocket.isConnected}
              size="sm"
            >
              Send Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {websocket.stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              WebSocket Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-xl font-bold text-blue-600">{websocket.stats.activeConnections}</div>
                <div className="text-sm text-blue-600">Active Connections</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-xl font-bold text-green-600">{websocket.stats.activeRooms}</div>
                <div className="text-sm text-green-600">Active Rooms</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-xl font-bold text-purple-600">{websocket.stats.messagesSent}</div>
                <div className="text-sm text-purple-600">Messages Sent</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-xl font-bold text-orange-600">{websocket.stats.eventsBroadcasted}</div>
                <div className="text-sm text-orange-600">Events Broadcasted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Message Log ({messages.length})
            </CardTitle>
            <Button 
              onClick={() => setMessages([])} 
              size="sm" 
              variant="ghost"
              disabled={messages.length === 0}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No messages yet. Start the test and send/receive messages to see them here.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={message.id}>
                  <div className={`p-3 rounded border ${
                    message.direction === 'sent' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={message.direction === 'sent' ? 'default' : 'secondary'}>
                          {message.direction}
                        </Badge>
                        <span className="text-sm font-mono">{message.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs text-muted-foreground overflow-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </div>
                  {index < messages.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}