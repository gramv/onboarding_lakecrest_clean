import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, Users, FileText, BarChart3, Bell, Search, Filter, 
  RefreshCw, Menu, X, ChevronDown, Activity, Clock, TrendingUp,
  CheckCircle, AlertCircle, UserPlus, BellRing, Wifi, WifiOff
} from 'lucide-react'
import { ApplicationsTab } from '@/components/dashboard/ApplicationsTab'
import { EmployeesTab } from '@/components/dashboard/EmployeesTab'
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { format } from 'date-fns'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

interface Property {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  qr_code_url: string
  is_active: boolean
  created_at: string
}

interface DashboardStats {
  total_applications: number
  pending_applications: number
  approved_applications: number
  total_employees: number
  active_employees: number
  new_today: number
  completion_rate: number
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface RealtimeEvent {
  type: string
  data: any
  timestamp: string
}

export default function EnhancedManagerDashboardV2() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')
  
  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    lastMessage, 
    sendMessage, 
    connectionStatus 
  } = useWebSocket({
    url: `ws://localhost:8000/ws/dashboard`,
    token: user?.token,
    reconnect: true,
    reconnectInterval: 5000
  })

  // State management
  const [property, setProperty] = useState<Property | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Real-time event handling
  useEffect(() => {
    if (lastMessage) {
      handleRealtimeEvent(lastMessage)
    }
  }, [lastMessage])

  const handleRealtimeEvent = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'application_submitted':
        toast({
          title: 'New Application',
          description: `New application received from ${event.data.applicant_name}`,
          variant: 'default'
        })
        refreshStats()
        break
      case 'application_approved':
        toast({
          title: 'Application Approved',
          description: `Application for ${event.data.applicant_name} has been approved`,
          variant: 'success'
        })
        refreshStats()
        break
      case 'employee_onboarding_complete':
        toast({
          title: 'Onboarding Complete',
          description: `${event.data.employee_name} has completed onboarding`,
          variant: 'success'
        })
        refreshStats()
        break
      case 'system_notification':
        addNotification({
          id: Date.now().toString(),
          type: event.data.severity || 'info',
          title: event.data.title,
          message: event.data.message,
          timestamp: new Date(),
          read: false
        })
        break
    }
  }

  // Data fetching
  useEffect(() => {
    if (user?.property_id) {
      fetchInitialData()
    }
  }, [user])

  const fetchInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      await Promise.all([
        fetchPropertyData(),
        fetchDashboardStats(),
        fetchNotifications()
      ])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchPropertyData = async () => {
    const response = await axios.get('/api/properties')
    const properties = response.data
    const userProperty = properties.find((p: Property) => p.id === user?.property_id)
    setProperty(userProperty || null)
  }

  const fetchDashboardStats = async () => {
    const response = await axios.get('/api/manager/dashboard-stats')
    setStats(response.data)
  }

  const fetchNotifications = async () => {
    const response = await axios.get('/api/notifications')
    setNotifications(response.data.map((n: any) => ({
      ...n,
      timestamp: new Date(n.created_at)
    })))
  }

  const refreshStats = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchDashboardStats()
      toast({
        title: 'Dashboard Refreshed',
        description: 'Statistics have been updated',
        variant: 'default'
      })
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh statistics',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }, [])

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notificationsPanelOpen) {
      setNotificationsPanelOpen(true)
    }
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length,
    [notifications]
  )

  // Mobile responsive sidebar
  const SidebarContent = () => (
    <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Dashboard</h2>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav className="space-y-2">
          <Button
            variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('overview')
              isMobile && setSidebarOpen(false)
            }}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'applications' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('applications')
              isMobile && setSidebarOpen(false)
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Applications
            {stats?.pending_applications ? (
              <Badge className="ml-auto" variant="destructive">
                {stats.pending_applications}
              </Badge>
            ) : null}
          </Button>
          <Button
            variant={activeTab === 'employees' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('employees')
              isMobile && setSidebarOpen(false)
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Employees
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab('analytics')
              isMobile && setSidebarOpen(false)
            }}
          >
            <Activity className="mr-2 h-4 w-4" />
            Analytics
          </Button>
        </nav>
      </div>
      
      {/* Connection Status */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-green-600 dark:text-green-400">Live Updates Active</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-gray-500">Reconnecting...</span>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-4"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {property?.name || 'Manager Dashboard'}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Welcome back, {user?.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Search Bar - Hidden on mobile */}
                {!isMobile && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      className="pl-10 w-64"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                )}
                
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative"
                  onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
                
                {/* Refresh */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshStats}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Grid - Responsive */}
            {activeTab === 'overview' && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Applications
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total_applications}</div>
                      <p className="text-xs text-muted-foreground">
                        +{stats.new_today} today
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pending Review
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.pending_applications}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requires action
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Employees
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.active_employees}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.total_employees} total
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Completion Rate
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.completion_rate}%</div>
                      <p className="text-xs text-muted-foreground">
                        Onboarding success
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                          Latest updates from your property
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Activity items would go here */}
                          <p className="text-sm text-muted-foreground">
                            Real-time activity feed will appear here
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'applications' && (
                  <ApplicationsTab searchQuery={searchQuery} filterStatus={filterStatus} />
                )}
                
                {activeTab === 'employees' && (
                  <EmployeesTab searchQuery={searchQuery} />
                )}
                
                {activeTab === 'analytics' && (
                  <AnalyticsTab />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {notificationsPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notifications</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotificationsPanelOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="overflow-y-auto h-full pb-20">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer",
                        !notification.read && "bg-blue-50 dark:bg-blue-900/20"
                      )}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          "mt-1 h-2 w-2 rounded-full",
                          notification.type === 'error' && "bg-red-500",
                          notification.type === 'warning' && "bg-yellow-500",
                          notification.type === 'success' && "bg-green-500",
                          notification.type === 'info' && "bg-blue-500"
                        )} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(notification.timestamp, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}