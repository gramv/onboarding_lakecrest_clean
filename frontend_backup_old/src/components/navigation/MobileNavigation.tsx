/**
 * Mobile-First Navigation Component
 * Touch-optimized navigation with swipe gestures and mobile adaptation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Menu, 
  X, 
  Home,
  ArrowLeft,
  MoreVertical,
  ChevronDown,
  LucideIcon
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// ===== TYPES =====

export interface MobileNavigationItem {
  key: string
  label: string
  path: string
  icon: LucideIcon
  badge?: number | string
  roles: ('hr' | 'manager')[]
  children?: MobileNavigationItem[]
  ariaLabel?: string
  disabled?: boolean
}

interface MobileNavigationProps {
  items: MobileNavigationItem[]
  userRole: 'hr' | 'manager'
  className?: string
  onNavigate?: (item: MobileNavigationItem) => void
  showLabels?: boolean
  variant?: 'drawer' | 'bottom-tabs' | 'floating'
  swipeEnabled?: boolean
  hapticFeedback?: boolean
}

interface SwipeState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  isDragging: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}

// ===== MOBILE NAVIGATION COMPONENT =====

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  userRole,
  className,
  onNavigate,
  showLabels = true,
  variant = 'drawer',
  swipeEnabled = true,
  hapticFeedback = true
}) => {
  const location = useLocation()
  const { user } = useAuth()
  
  const [isOpen, setIsOpen] = useState(false)
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    direction: null
  })
  
  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Filter items based on user role
  const filteredItems = items.filter(item => 
    item.roles.includes(userRole) && !item.disabled
  )

  // Haptic feedback function
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || typeof window === 'undefined') return
    
    try {
      if ('vibrate' in navigator) {
        const patterns = {
          light: [10],
          medium: [20],
          heavy: [30]
        }
        navigator.vibrate(patterns[type])
      }
    } catch (error) {
      // Silently fail if vibration is not supported
    }
  }, [hapticFeedback])

  // Handle navigation
  const handleNavigate = useCallback((item: MobileNavigationItem) => {
    triggerHaptic('light')
    onNavigate?.(item)
    setIsOpen(false)
  }, [onNavigate, triggerHaptic])

  // Toggle drawer
  const toggleDrawer = useCallback(() => {
    triggerHaptic('medium')
    setIsOpen(!isOpen)
  }, [isOpen, triggerHaptic])

  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!swipeEnabled) return
    
    const touch = e.touches[0]
    setSwipeState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: true,
      direction: null
    })
  }, [swipeEnabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeEnabled || !swipeState.isDragging) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - swipeState.startX
    const deltaY = touch.clientY - swipeState.startY
    
    // Determine swipe direction
    let direction: SwipeState['direction'] = null
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left'
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
    }
    
    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction
    }))

    // Apply transform for drawer swipe
    if (variant === 'drawer' && drawerRef.current) {
      const drawer = drawerRef.current
      const maxSwipe = drawer.offsetWidth
      const swipeDistance = Math.max(0, Math.min(maxSwipe, -deltaX))
      
      if (isOpen && deltaX < 0) {
        drawer.style.transform = `translateX(-${swipeDistance}px)`
      }
    }
  }, [swipeEnabled, swipeState, variant, isOpen])

  const handleTouchEnd = useCallback(() => {
    if (!swipeEnabled || !swipeState.isDragging) return
    
    const deltaX = swipeState.currentX - swipeState.startX
    const deltaY = swipeState.currentY - swipeState.startY
    const threshold = 50

    // Handle swipe gestures
    if (variant === 'drawer') {
      if (isOpen && deltaX < -threshold) {
        // Swipe left to close
        closeDrawer()
        triggerHaptic('medium')
      } else if (!isOpen && deltaX > threshold) {
        // Swipe right to open
        setIsOpen(true)
        triggerHaptic('medium')
      }
      
      // Reset transform
      if (drawerRef.current) {
        drawerRef.current.style.transform = ''
      }
    }

    setSwipeState(prev => ({
      ...prev,
      isDragging: false,
      direction: null
    }))
  }, [swipeEnabled, swipeState, variant, isOpen, closeDrawer, triggerHaptic])

  // Close drawer on route change
  useEffect(() => {
    closeDrawer()
  }, [location.pathname, closeDrawer])

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && overlayRef.current.contains(event.target as Node)) {
        closeDrawer()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closeDrawer])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Drawer variant
  if (variant === 'drawer') {
    return (
      <>
        {/* Menu button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDrawer}
          className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm"
          aria-expanded={isOpen}
          aria-controls="mobile-drawer"
          aria-label={`${isOpen ? 'Close' : 'Open'} navigation menu`}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Overlay */}
        {isOpen && (
          <div 
            ref={overlayRef}
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          ref={drawerRef}
          id="mobile-drawer"
          className={cn(
            "fixed left-0 top-0 h-full w-80 max-w-[85vw] z-50",
            "bg-background border-r border-border shadow-xl",
            "transform transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
            className
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden={!isOpen}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeDrawer}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* User info */}
            {user && (
              <div className="p-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user.first_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.email
                      }
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role} Role
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto" role="navigation">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    onClick={() => handleNavigate(item)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      "active:scale-95 touch-manipulation",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    aria-label={item.ariaLabel || `Navigate to ${item.label}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {showLabels && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant={isActive ? "secondary" : "outline"} 
                            className="text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>
      </>
    )
  }

  // Bottom tabs variant
  if (variant === 'bottom-tabs') {
    return (
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40",
          "bg-background/95 backdrop-blur-sm border-t border-border",
          "safe-area-inset-bottom",
          className
        )}
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-2 py-2">
          {filteredItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={() => handleNavigate(item)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "active:scale-95 touch-manipulation min-w-0 flex-1",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.ariaLabel || `Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {showLabels && (
                  <span className="text-xs truncate max-w-full">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Floating variant
  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-6 right-6 z-40",
        className
      )}>
        <Button
          onClick={toggleDrawer}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-expanded={isOpen}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Floating menu */}
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30"
              onClick={closeDrawer}
              aria-hidden="true"
            />
            <div className="absolute bottom-16 right-0 w-64 bg-background border border-border rounded-lg shadow-xl z-40">
              <div className="p-2 space-y-1">
                {filteredItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  
                  return (
                    <Link
                      key={item.key}
                      to={item.path}
                      onClick={() => handleNavigate(item)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md text-sm font-medium transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        "active:scale-95 touch-manipulation",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      aria-label={item.ariaLabel || `Navigate to ${item.label}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"} 
                          className="text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

// ===== EXPORTS =====

export default MobileNavigation