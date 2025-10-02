import React, { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'hr' | 'manager'
  fallbackUrl?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallbackUrl = '/login'
}) => {
  const { user, loading, isAuthenticated, setReturnUrl } = useAuth()
  const location = useLocation()

  // Set return URL when user is not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated && location.pathname !== '/login') {
      setReturnUrl(location.pathname + location.search)
    }
  }, [loading, isAuthenticated, location.pathname, location.search, setReturnUrl])

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Authenticating...
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your credentials
          </p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    const loginUrl = requiredRole ? `${fallbackUrl}?role=${requiredRole}` : fallbackUrl
    return <Navigate to={loginUrl} replace />
  }

  // Check role if specified
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this area. 
              {requiredRole && ` This section requires ${requiredRole.toUpperCase()} role access.`}
            </p>
            
            <Alert className="mb-6 text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Role:</strong> {user.role?.toUpperCase() || 'Unknown'}
                <br />
                <strong>Required Role:</strong> {requiredRole?.toUpperCase()}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = user.role === 'hr' ? '/hr' : '/manager'}
                className="w-full"
              >
                Go to My Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Switch Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}