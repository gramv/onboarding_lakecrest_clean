/**
 * User Profile Dropdown Component
 * Professional user profile dropdown with account information and quick settings
 */

import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Bell,
  Shield,
  HelpCircle,
  ChevronDown,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Palette,
  Globe,
  Keyboard,
  Download,
  Upload
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/design-system/theme/ThemeProvider'

// ===== TYPES =====

interface UserProfileDropdownProps {
  className?: string
  showUserInfo?: boolean
  showQuickSettings?: boolean
  showThemeToggle?: boolean
  showNotificationToggle?: boolean
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogout?: () => void
}

interface QuickSetting {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  badge?: string | number
  disabled?: boolean
}

// ===== USER PROFILE DROPDOWN COMPONENT =====

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  className,
  showUserInfo = true,
  showQuickSettings = true,
  showThemeToggle = true,
  showNotificationToggle = true,
  onProfileClick,
  onSettingsClick,
  onLogout
}) => {
  const { user, logout } = useAuth()
  const { mode, setMode, isDark } = useTheme()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // Handle navigation
  const handleNavigation = useCallback((path: string) => {
    navigate(path)
    setIsOpen(false)
  }, [navigate])

  // Handle logout
  const handleLogout = useCallback(() => {
    onLogout?.()
    logout()
    setIsOpen(false)
  }, [onLogout, logout])

  // Handle profile click
  const handleProfileClick = useCallback(() => {
    if (onProfileClick) {
      onProfileClick()
    } else {
      handleNavigation('/profile')
    }
  }, [onProfileClick, handleNavigation])

  // Handle settings click
  const handleSettingsClick = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick()
    } else {
      handleNavigation('/settings')
    }
  }, [onSettingsClick, handleNavigation])

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

  // Get user display name
  const getUserDisplayName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || 'User'
  }

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'hr':
        return 'default'
      case 'manager':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Quick settings
  const quickSettings: QuickSetting[] = [
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      action: () => handleNavigation('/settings/notifications'),
      disabled: !showNotificationToggle
    },
    {
      key: 'appearance',
      label: 'Appearance',
      icon: Palette,
      action: () => handleNavigation('/settings/appearance')
    },
    {
      key: 'language',
      label: 'Language',
      icon: Globe,
      action: () => handleNavigation('/settings/language')
    },
    {
      key: 'shortcuts',
      label: 'Keyboard Shortcuts',
      icon: Keyboard,
      action: () => handleNavigation('/settings/shortcuts')
    }
  ]

  if (!user) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "relative h-10 w-10 rounded-full focus:ring-2 focus:ring-primary focus:ring-offset-2",
            className
          )}
          aria-label="User menu"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getUserInitials(user)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end" forceMount>
        {/* User Info Section */}
        {showUserInfo && (
          <>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {getUserDisplayName(user)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                      {user.role.toUpperCase()}
                    </Badge>
                    {user.property_name && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="h-3 w-3 mr-1" />
                        {user.property_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional user info */}
              {(user.phone || user.department || user.hire_date) && (
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  {user.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.department && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{user.department}</span>
                    </div>
                  )}
                  {user.hire_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {new Date(user.hire_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Main Menu Items */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleProfileClick}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Quick Settings */}
        {showQuickSettings && quickSettings.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Theme Toggle */}
              {showThemeToggle && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {mode === 'light' && <Sun className="mr-2 h-4 w-4" />}
                    {mode === 'dark' && <Moon className="mr-2 h-4 w-4" />}
                    {mode === 'auto' && <Monitor className="mr-2 h-4 w-4" />}
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setMode('light')}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                      {mode === 'light' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode('dark')}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                      {mode === 'dark' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode('auto')}>
                      <Monitor className="mr-2 h-4 w-4" />
                      <span>System</span>
                      {mode === 'auto' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              {/* Other Quick Settings */}
              {quickSettings
                .filter(setting => !setting.disabled)
                .map((setting) => {
                  const Icon = setting.icon
                  return (
                    <DropdownMenuItem
                      key={setting.key}
                      onClick={setting.action}
                      disabled={setting.disabled}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{setting.label}</span>
                      {setting.badge && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {setting.badge}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  )
                })}
            </DropdownMenuGroup>
          </>
        )}

        {/* Data Management */}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/data/export')}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export Data</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/data/import')}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import Data</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Help & Support */}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleNavigation('/help')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Help & Support</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleNavigation('/privacy')}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Privacy & Security</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Logout */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ===== COMPACT USER PROFILE COMPONENT =====

interface CompactUserProfileProps {
  className?: string
  showName?: boolean
  showRole?: boolean
  onClick?: () => void
}

export const CompactUserProfile: React.FC<CompactUserProfileProps> = ({
  className,
  showName = true,
  showRole = false,
  onClick
}) => {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const getUserInitials = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || 'User'
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        "flex items-center gap-2 h-auto p-2 justify-start",
        onClick && "cursor-pointer hover:bg-muted",
        className
      )}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar} alt={getUserDisplayName(user)} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
          {getUserInitials(user)}
        </AvatarFallback>
      </Avatar>
      
      {(showName || showRole) && (
        <div className="flex flex-col items-start min-w-0">
          {showName && (
            <span className="text-sm font-medium truncate max-w-[120px]">
              {getUserDisplayName(user)}
            </span>
          )}
          {showRole && (
            <span className="text-xs text-muted-foreground capitalize">
              {user.role}
            </span>
          )}
        </div>
      )}
      
      {onClick && <ChevronDown className="h-3 w-3 ml-auto" />}
    </Button>
  )
}

// ===== EXPORTS =====

export default UserProfileDropdown