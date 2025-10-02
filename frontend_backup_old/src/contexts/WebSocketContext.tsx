/**
 * WebSocket Context for real-time dashboard updates
 * Provides centralized WebSocket connection management across the application
 */
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useWebSocket, WebSocketHookReturn, WebSocketHookOptions } from '../hooks/useWebSocket';
import { useAuthContext } from './AuthContext';

interface WebSocketContextValue extends WebSocketHookReturn {
  /** Send notification to specific user (HR only) */
  sendUserNotification: (userId: string, title: string, message: string, severity?: string) => void;
  /** Broadcast system notification */
  broadcastSystemNotification: (message: string, severity?: string, targetRole?: string) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: ReactNode;
  options?: WebSocketHookOptions;
}

export function WebSocketProvider({ children, options }: WebSocketProviderProps) {
  const { user } = useAuthContext();
  
  const webSocketHook = useWebSocket({
    autoConnect: true,
    debug: process.env.NODE_ENV === 'development',
    ...options
  });

  const sendUserNotification = useCallback((
    userId: string, 
    title: string, 
    message: string, 
    severity: string = 'info'
  ) => {
    if (user?.role === 'HR') {
      webSocketHook.sendMessage({
        type: 'send_user_notification',
        data: {
          user_id: userId,
          title,
          message,
          severity
        }
      });
    }
  }, [webSocketHook, user?.role]);

  const broadcastSystemNotification = useCallback((
    message: string, 
    severity: string = 'info', 
    targetRole?: string
  ) => {
    if (user?.role === 'HR') {
      webSocketHook.sendMessage({
        type: 'broadcast_system_notification',
        data: {
          message,
          severity,
          target_role: targetRole
        }
      });
    }
  }, [webSocketHook, user?.role]);

  const contextValue: WebSocketContextValue = {
    ...webSocketHook,
    sendUserNotification,
    broadcastSystemNotification
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

/**
 * Hook for dashboard notifications
 * Provides simplified interface for handling real-time dashboard events
 */
export function useDashboardNotifications() {
  const ws = useWebSocketContext();
  const { user } = useAuthContext();

  // Subscribe to application events
  const onApplicationEvent = useCallback((
    handler: (data: { application_id: string; property_id: string; applicant_name?: string; status?: string }) => void
  ) => {
    const unsubscribers = [
      ws.onMessage('application_submitted', handler),
      ws.onMessage('application_approved', handler),
      ws.onMessage('application_rejected', handler)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [ws]);

  // Subscribe to onboarding events
  const onOnboardingEvent = useCallback((
    handler: (data: { session_id: string; employee_id: string; property_id: string; step?: string; status?: string }) => void
  ) => {
    const unsubscribers = [
      ws.onMessage('onboarding_started', handler),
      ws.onMessage('onboarding_completed', handler),
      ws.onMessage('form_submitted', handler),
      ws.onMessage('document_uploaded', handler)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [ws]);

  // Subscribe to system notifications
  const onSystemNotification = useCallback((
    handler: (data: { message: string; severity: string; target_role?: string }) => void
  ) => {
    return ws.onMessage('system_notification', handler);
  }, [ws]);

  // Subscribe to user notifications
  const onUserNotification = useCallback((
    handler: (data: { title: string; message: string; severity: string; action_url?: string }) => void
  ) => {
    return ws.onMessage('notification', handler);
  }, [ws]);

  // Get real-time stats (HR only)
  const getRealtimeStats = useCallback(() => {
    if (user?.role === 'HR') {
      ws.getStats();
    }
  }, [ws, user?.role]);

  // Subscribe to property-specific updates (Managers)
  const subscribeToProperty = useCallback((propertyId: string) => {
    if (user?.role === 'MANAGER' && user.property_id === propertyId) {
      ws.subscribeToRoom(`property-${propertyId}`);
    }
  }, [ws, user?.role, user?.property_id]);

  // Subscribe to global updates (HR)
  const subscribeToGlobal = useCallback(() => {
    if (user?.role === 'HR') {
      ws.subscribeToRoom('global');
    }
  }, [ws, user?.role]);

  return {
    // Connection state
    connectionState: ws.connectionState,
    isConnected: ws.isConnected,
    error: ws.error,
    
    // Event subscriptions
    onApplicationEvent,
    onOnboardingEvent,
    onSystemNotification,
    onUserNotification,
    
    // Actions
    getRealtimeStats,
    subscribeToProperty,
    subscribeToGlobal,
    
    // Stats
    stats: ws.stats,
    subscribedRooms: ws.subscribedRooms,
    
    // Connection management
    connect: ws.connect,
    disconnect: ws.disconnect
  };
}

/**
 * Hook for real-time event notifications with toast integration
 * Automatically displays toast notifications for real-time events
 */
export function useRealtimeToasts() {
  const notifications = useDashboardNotifications();

  // Application event toasts
  React.useEffect(() => {
    const unsubscribe = notifications.onApplicationEvent((data) => {
      const applicantName = data.applicant_name || 'Unknown';
      
      switch (data.status) {
        case 'submitted':
          // You can integrate with your toast library here
          console.log('🔔 New Application', `${applicantName} submitted an application`);
          break;
        case 'approved':
          console.log('✅ Application Approved', `${applicantName}'s application was approved`);
          break;
        case 'rejected':
          console.log('❌ Application Rejected', `${applicantName}'s application was rejected`);
          break;
      }
    });

    return unsubscribe;
  }, [notifications]);

  // Onboarding event toasts
  React.useEffect(() => {
    const unsubscribe = notifications.onOnboardingEvent((data) => {
      switch (data.status) {
        case 'started':
          console.log('🚀 Onboarding Started', `Employee ${data.employee_id} started onboarding`);
          break;
        case 'completed':
          console.log('🎉 Onboarding Completed', `Employee ${data.employee_id} completed onboarding`);
          break;
        case 'form_submitted':
          console.log('📝 Form Submitted', `Employee ${data.employee_id} submitted ${data.step}`);
          break;
      }
    });

    return unsubscribe;
  }, [notifications]);

  // System notification toasts
  React.useEffect(() => {
    const unsubscribe = notifications.onSystemNotification((data) => {
      console.log(`🔔 ${data.severity.toUpperCase()}`, data.message);
    });

    return unsubscribe;
  }, [notifications]);

  // User notification toasts
  React.useEffect(() => {
    const unsubscribe = notifications.onUserNotification((data) => {
      console.log(`📬 ${data.title}`, data.message);
    });

    return unsubscribe;
  }, [notifications]);

  return notifications;
}