/**
 * Enhanced Top Navigation Component
 * Professional top navigation with user context, notifications, and quick actions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  Menu,
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react'
import { useTheme } from '@/design-system/theme/ThemeProvider'
import { useAuth } from '@/contexts/AuthContext'

// ===== TYPES =====

export interface QuickAction {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  badge?: number | string
  variant?: 'default' | 'primary' | 'secondary' | 'destructive'
  disabled?: boolean
  ariaLabel?: string
}

export interface NotificationItem {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

interface TopNavigationProps {
  className?: string
  showSearch?: boolean
  showNotifications?: boolean
  showUserMenu?: boolean
  showThemeToggle?: boolean
  quickActions?: QuickAction[]
  notifications?: NotificationItem[]
  onSearch?: (query: string) => void
  onNotificationClick?: (notification: NotificationItem) => void
  onNotificationMarkRead?: (notificationId: string) => void
  onNotificationMarkAllRead?: () => void
  brand?: {
    logo?: string
    name?: string
    href?: string
  }
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

// ===== TOP NAVIGATION COMPONENT =====

export const TopNavigation: React.FC<TopNavigationProps> = ({
  className,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  showThemeToggle = true,
  quickActions = [],
  notifications = [],
  onSearch,
  onNotificationClick,
  onNotificationMarkRead,
  onNotificationMarkAllRead,
  brand,
  maxWidth = 'full'
}) => {
  const { user, logout } = useAuth()
  const { mode, setMode, toggleMode, isDark } = useTheme()
  const navigate = useNavigate()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim())
    }
  }, [searchQuery, onSearch])

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Handle notification click
  const handleNotificationClick = useCallback((notification: NotificationItem) => {
    onNotificationClick?.(notification)
    
    // Mark as read if not already
    if (!notification.read) {
      onNotificationMarkRead?.(notification.id)
    }
    
    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
    }
  }, [onNotificationClick, onNotificationMarkRead, navigate])

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.read).length

  // Get user initials for avatar fallback
  const getUserInitials = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  // Notification icon by type
  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return CheckCircle
      case 'warning':
        return AlertCircle
      case 'error':
        return AlertCircle
      default:
        return Info
    }
  }

  // Notification color by type
  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className={cn(
        "container mx-auto px-4",
        maxWidthClasses[maxWidth]
      )}>
        <div className="flex h-16 items-center justify-between">
          {/* Left section - Brand and Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle mobile menu"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Brand */}
            {brand && (
              <Link
                to={brand.href || '/'}
                className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
              >
                {brand.logo && (
                  <img
                    src={brand.logo}
                    alt={`${brand.name || 'Brand'} logo`}
                    className="h-8 w-8 object-contain"
                  />
                )}
                {brand.name && (
                  <span className="hidden sm:inline-block">{brand.name}</span>
                )}
              </Link>
            )}
          </div>

          {/* Center section - Search */}
          {showSearch && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className={cn(
                    "pl-10 pr-4 transition-all duration-200",
                    isSearchFocused && "ring-2 ring-primary ring-offset-2"
                  )}
                  aria-label="Search"
                />
              </form>
            </div>
          )}

          {/* Right section - Actions and User Menu */}
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.key}
                  variant={action.variant === 'primary' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="relative hidden sm:inline-flex"
                  aria-label={action.ariaLabel || action.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="sr-only">{action.label}</span>
                  {action.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
                    >
                      {action.badge}
                    </Badge>
                  )}
                </Button>
              )
            })}

            {/* Theme Toggle */}
            {showThemeToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Toggle theme">
                    {mode === 'light' && <Sun className="h-4 w-4" />}
                    {mode === 'dark' && <Moon className="h-4 w-4" />}
                    {mode === 'auto' && <Monitor className="h-4 w-4" />}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setMode('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMode('auto')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Notifications */}
            {showNotifications && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                    <span className="sr-only">
                      {unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between p-2">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onNotificationMarkAllRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.slice(0, 10).map((notification) => {
                        const Icon = getNotificationIcon(notification.type)
                        return (
                          <DropdownMenuItem
                            key={notification.id}
                            className={cn(
                              "flex items-start gap-3 p-3 cursor-pointer",
                              !notification.read && "bg-muted/50"
                            )}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <Icon className={cn(
                              "h-4 w-4 mt-0.5 flex-shrink-0",
                              getNotificationColor(notification.type)
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            {showUserMenu && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.email} />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.first_name && user.last_name 
                          ? `${user.first_name} ${user.last_name}`
                          : user.email
                        }
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {user.role} Role
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Mobile search */}
        {showSearch && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4"
                aria-label="Search"
              />
            </form>
          </div>
        )}
      </div>
    </header>
  )
}

// ===== EXPORTS =====

export default TopNavigation