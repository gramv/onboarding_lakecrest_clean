/**
 * Real-time Dashboard Component
 * Demonstrates WebSocket functionality with live updates, connection status, and statistics
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { 
  Activity, 
  Users, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  RefreshCw, 
  Bell,
  BarChart3,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useDashboardNotifications } from '../../contexts/WebSocketContext';
import { useAuthContext } from '../../contexts/AuthContext';

interface RealtimeEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export function RealtimeDashboard() {
  const { user } = useAuthContext();
  const {
    connectionState,
    isConnected,
    error,
    onApplicationEvent,
    onOnboardingEvent,
    onSystemNotification,
    onUserNotification,
    getRealtimeStats,
    stats,
    subscribedRooms,
    connect,
    disconnect
  } = useDashboardNotifications();

  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // Add event to the list
  const addEvent = (type: string, title: string, message: string, severity: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const event: RealtimeEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      severity
    };

    setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
  };

  // Subscribe to events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Application events
    unsubscribers.push(
      onApplicationEvent((data) => {
        const applicantName = data.applicant_name || 'Unknown Applicant';
        switch (data.status) {
          case 'submitted':
            addEvent('application', 'New Application', `${applicantName} submitted an application`, 'info');
            break;
          case 'approved':
            addEvent('application', 'Application Approved', `${applicantName}'s application was approved`, 'success');
            break;
          case 'rejected':
            addEvent('application', 'Application Rejected', `${applicantName}'s application was rejected`, 'warning');
            break;
          default:
            addEvent('application', 'Application Update', `${applicantName}: ${data.status}`, 'info');
        }
      })
    );

    // Onboarding events
    unsubscribers.push(
      onOnboardingEvent((data) => {
        const employeeName = data.employee_id || 'Employee';
        switch (data.status) {
          case 'started':
            addEvent('onboarding', 'Onboarding Started', `${employeeName} started onboarding`, 'info');
            break;
          case 'completed':
            addEvent('onboarding', 'Onboarding Completed', `${employeeName} completed onboarding`, 'success');
            break;
          case 'form_submitted':
            addEvent('onboarding', 'Form Submitted', `${employeeName} submitted ${data.step || 'a form'}`, 'info');
            break;
          case 'document_uploaded':
            addEvent('onboarding', 'Document Uploaded', `${employeeName} uploaded a document`, 'info');
            break;
          default:
            addEvent('onboarding', 'Onboarding Update', `${employeeName}: ${data.status}`, 'info');
        }
      })
    );

    // System notifications
    unsubscribers.push(
      onSystemNotification((data) => {
        addEvent('system', 'System Notification', data.message, data.severity as any || 'info');
      })
    );

    // User notifications
    unsubscribers.push(
      onUserNotification((data) => {
        addEvent('notification', data.title, data.message, data.severity as any || 'info');
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [onApplicationEvent, onOnboardingEvent, onSystemNotification, onUserNotification]);

  // Auto-refresh stats
  useEffect(() => {
    if (user?.role === 'HR' && isConnected) {
      getRealtimeStats();
      const interval = setInterval(getRealtimeStats, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user?.role, isConnected, getRealtimeStats]);

  // Connection status helpers
  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'connecting':
      case 'reconnecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionState) {
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting':
      case 'reconnecting': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'application': return <Users className="h-4 w-4" />;
      case 'onboarding': return <Activity className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Real-time Connection Status</CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
              {getConnectionStatusIcon()}
              <Badge variant="outline" className="capitalize">
                {connectionState}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected and receiving real-time updates' : 'Not connected to real-time updates'}
                </p>
                {error && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {error.message}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isConnected && (
                <Button onClick={connect} size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              )}
              {isConnected && (
                <Button onClick={disconnect} size="sm" variant="outline">
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              )}
              <Button 
                onClick={() => setShowDebug(!showDebug)} 
                size="sm" 
                variant="ghost"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Debug
              </Button>
            </div>
          </div>

          {/* Subscribed Rooms */}
          {subscribedRooms.size > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Subscribed Rooms:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(subscribedRooms).map(room => (
                  <Badge key={room} variant="secondary" className="text-xs">
                    {room}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WebSocket Statistics (HR Only) */}
      {user?.role === 'HR' && stats && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">WebSocket Statistics</CardTitle>
              <Button onClick={getRealtimeStats} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.activeConnections}</div>
                <div className="text-sm text-blue-600">Active Connections</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.activeRooms}</div>
                <div className="text-sm text-green-600">Active Rooms</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.messagesSent}</div>
                <div className="text-sm text-purple-600">Messages Sent</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.eventsBroadcasted}</div>
                <div className="text-sm text-orange-600">Events Broadcasted</div>
              </div>
            </div>

            {/* Room Details */}
            {Object.keys(stats.roomDetails).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Room Member Counts:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(stats.roomDetails).map(([roomId, memberCount]) => (
                    <div key={roomId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-xs font-mono">{roomId}</span>
                      <Badge variant="secondary" className="text-xs">
                        {memberCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {showDebug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Connection Details</h4>
                <div className="text-sm text-muted-foreground font-mono bg-gray-50 p-3 rounded">
                  <div>State: {connectionState}</div>
                  <div>User: {user?.id} ({user?.role})</div>
                  <div>Property: {user?.property_id || 'N/A'}</div>
                  <div>Subscribed Rooms: {Array.from(subscribedRooms).join(', ') || 'None'}</div>
                  <div>Error: {error?.message || 'None'}</div>
                </div>
              </div>
              
              {stats && (
                <div>
                  <h4 className="font-medium mb-2">Full Statistics</h4>
                  <pre className="text-xs text-muted-foreground bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(stats, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Events */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Real-time Events</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{events.length} events</Badge>
              {events.length > 0 && (
                <Button 
                  onClick={() => setEvents([])} 
                  size="sm" 
                  variant="ghost"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No real-time events yet</p>
              <p className="text-sm">Events will appear here as they occur</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event, index) => (
                <div key={event.id}>
                  <div className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(event.severity)}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  {index < events.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}