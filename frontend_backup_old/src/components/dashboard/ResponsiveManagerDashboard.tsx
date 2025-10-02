/**
 * Responsive Manager Dashboard
 * Automatically switches between desktop and mobile views based on device capabilities
 */

import React, { useState, useEffect } from 'react'
import { EnhancedManagerDashboard } from './EnhancedManagerDashboard'
import { MobileManagerDashboard } from '../mobile/MobileManagerDashboard'

// =====================================
// DEVICE DETECTION UTILITIES
// =====================================

interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  hasTouch: boolean
  screenWidth: number
  screenHeight: number
  userAgent: string
  orientation: 'portrait' | 'landscape'
}

const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  })

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const userAgent = navigator.userAgent.toLowerCase()
      
      // Check for mobile devices
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isMobileWidth = width <= 768
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // Determine device type
      const isMobile = (isMobileUA || isMobileWidth) && width <= 768
      const isTablet = (isMobileUA || hasTouch) && width > 768 && width <= 1024
      const isDesktop = !isMobile && !isTablet
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        screenWidth: width,
        screenHeight: height,
        userAgent: navigator.userAgent,
        orientation: width > height ? 'landscape' : 'portrait'
      })
    }

    // Initial detection
    updateDeviceInfo()

    // Listen for resize events
    window.addEventListener('resize', updateDeviceInfo)
    window.addEventListener('orientationchange', updateDeviceInfo)

    return () => {
      window.removeEventListener('resize', updateDeviceInfo)
      window.removeEventListener('orientationchange', updateDeviceInfo)
    }
  }, [])

  return deviceInfo
}

// =====================================
// PWA INSTALLATION PROMPT
// =====================================

interface PWAInstallPromptProps {
  onInstall: () => void
  onDismiss: () => void
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
  return (
    <div className="fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-40 md:hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Install App</h3>
          <p className="text-xs opacity-90">Add to home screen for better experience</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onDismiss}
            className="px-3 py-1 text-xs bg-white bg-opacity-20 rounded"
          >
            Later
          </button>
          <button
            onClick={onInstall}
            className="px-3 py-1 text-xs bg-white text-blue-600 rounded font-medium"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================
// RESPONSIVE MANAGER DASHBOARD
// =====================================

export const ResponsiveManagerDashboard: React.FC = () => {
  const deviceInfo = useDeviceDetection()
  const [showPWAPrompt, setShowPWAPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [forceDesktop, setForceDesktop] = useState(false)

  // Handle PWA installation
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      // Show install prompt for mobile users after a delay
      if (deviceInfo.isMobile) {
        setTimeout(() => {
          setShowPWAPrompt(true)
        }, 5000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [deviceInfo.isMobile])

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA installed')
      }
      
      setDeferredPrompt(null)
      setShowPWAPrompt(false)
    }
  }

  const handlePWADismiss = () => {
    setShowPWAPrompt(false)
    // Don't show again for 24 hours
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  // Check if PWA prompt was recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_prompt_dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = Date.now()
      const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60)
      
      if (hoursSinceDismissed < 24) {
        setShowPWAPrompt(false)
      }
    }
  }, [])

  // Add viewport meta tag for mobile optimization
  useEffect(() => {
    if (deviceInfo.isMobile) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
      } else {
        const meta = document.createElement('meta')
        meta.name = 'viewport'
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        document.head.appendChild(meta)
      }

      // Add mobile-specific styles
      document.body.style.touchAction = 'manipulation'
      document.body.style.webkitTouchCallout = 'none'
      document.body.style.webkitUserSelect = 'none'
      document.body.style.userSelect = 'none'
    }
  }, [deviceInfo.isMobile])

  // Determine which dashboard to show
  const shouldShowMobile = (deviceInfo.isMobile || deviceInfo.isTablet) && !forceDesktop

  return (
    <>
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 right-0 bg-black text-white text-xs p-2 z-50 opacity-75">
          <div>Width: {deviceInfo.screenWidth}px</div>
          <div>Mobile: {deviceInfo.isMobile ? 'Yes' : 'No'}</div>
          <div>Touch: {deviceInfo.hasTouch ? 'Yes' : 'No'}</div>
          <div>Orientation: {deviceInfo.orientation}</div>
          <button
            onClick={() => setForceDesktop(!forceDesktop)}
            className="mt-1 px-2 py-1 bg-blue-600 rounded text-xs"
          >
            {forceDesktop ? 'Show Mobile' : 'Force Desktop'}
          </button>
        </div>
      )}

      {/* Dashboard Content */}
      {shouldShowMobile ? (
        <MobileManagerDashboard />
      ) : (
        <EnhancedManagerDashboard />
      )}

      {/* PWA Install Prompt */}
      {showPWAPrompt && deferredPrompt && (
        <PWAInstallPrompt
          onInstall={handlePWAInstall}
          onDismiss={handlePWADismiss}
        />
      )}

      {/* Mobile-specific styles */}
      {shouldShowMobile && (
        <style jsx global>{`
          body {
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          
          * {
            -webkit-tap-highlight-color: transparent;
          }
          
          input, textarea, select {
            font-size: 16px; /* Prevent zoom on iOS */
          }
          
          .touch-manipulation {
            touch-action: manipulation;
          }
          
          /* Hide scrollbars on mobile */
          ::-webkit-scrollbar {
            display: none;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Safe area insets for devices with notches */
          @supports (padding: max(0px)) {
            .safe-area-top {
              padding-top: max(1rem, env(safe-area-inset-top));
            }
            
            .safe-area-bottom {
              padding-bottom: max(1rem, env(safe-area-inset-bottom));
            }
          }
        `}</style>
      )}
    </>
  )
}

export default ResponsiveManagerDashboard