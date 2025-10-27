import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Shield, Loader2, Eye, EyeOff } from 'lucide-react'
import { MobileInput } from '@/components/job-application/mobile-optimized/MobileInput'
import { MobileLabel } from '@/components/job-application/mobile-optimized/MobileLabel'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user, isAuthenticated, returnUrl, setReturnUrl } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  const urlReturnUrl = searchParams.get('returnUrl')

  // Set return URL from query parameter
  useEffect(() => {
    if (urlReturnUrl && !returnUrl) {
      setReturnUrl(urlReturnUrl)
    }
  }, [urlReturnUrl, returnUrl, setReturnUrl])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Use return URL if available, otherwise default based on role
      const targetUrl = returnUrl || (user.role === 'hr' ? '/hr' : user.role === 'manager' ? '/manager' : '/')
      
      // Clear return URL after using it
      if (returnUrl) {
        setReturnUrl(null)
      }
      
      navigate(targetUrl, { replace: true })
    }
  }, [isAuthenticated, user, navigate, returnUrl, setReturnUrl])

  // Role-specific configuration
  const getRoleConfig = () => {
    switch (role) {
      case 'hr':
        return {
          title: 'HR Administrative Portal',
          description: 'Access comprehensive property and employee management tools',
          icon: <Shield className="h-8 w-8 text-blue-600" />,
          badge: 'HR Administrator',
          badgeVariant: 'default' as const,
          gradient: 'from-blue-50 to-indigo-50',
          testCredentials: 'hr@hoteltest.com'
        }
      case 'manager':
        return {
          title: 'Property Manager Portal',
          description: 'Manage applications and employees for your property',
          icon: <Building2 className="h-8 w-8 text-green-600" />,
          badge: 'Property Manager',
          badgeVariant: 'secondary' as const,
          gradient: 'from-green-50 to-emerald-50',
          testCredentials: 'manager@hoteltest.com'
        }
      default:
        return {
          title: 'Hotel Management System',
          description: 'Access your dashboard with your credentials',
          icon: <Users className="h-8 w-8 text-gray-600" />,
          badge: 'User Login',
          badgeVariant: 'outline' as const,
          gradient: 'from-gray-50 to-slate-50',
          testCredentials: null
        }
    }
  }

  const config = getRoleConfig()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation
    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      await login(email.trim(), password, returnUrl || undefined)
      
      // Navigation will be handled by the login function or useEffect hook above
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fillTestCredentials = () => {
    if (config.testCredentials) {
      setEmail(config.testCredentials)
      setPassword('password') // Default test password
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} p-[clamp(1rem,3vw,1.5rem)]`}>
      <Card className="w-full max-w-md shadow-xl rounded-lg">
        <CardHeader className="p-[clamp(1.5rem,4vw,2rem)] text-center space-y-[clamp(1rem,3vw,1.5rem)]">
          <div className="flex justify-center">
            <div className="p-[clamp(1rem,3vw,1.25rem)] bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              {config.icon}
            </div>
          </div>

          <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
            <Badge className={`badge-${config.badgeVariant}`}>
              {config.badge}
            </Badge>
            <CardTitle className="text-[clamp(1.5rem,4vw,2rem)] font-bold">
              {config.title}
            </CardTitle>
            <CardDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
              {config.description}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-[clamp(1.5rem,4vw,2rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
          {returnUrl && (
            <Alert className="bg-blue-50 border-blue-200 p-[clamp(0.75rem,2vw,1rem)]">
              <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-blue-800">
                You'll be redirected to <strong>{returnUrl}</strong> after signing in.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-[clamp(1rem,3vw,1.5rem)]">
            {error && (
              <Alert variant="destructive" className="p-[clamp(0.75rem,2vw,1rem)]">
                <AlertDescription className="text-[clamp(0.875rem,2.5vw,1rem)]">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
              <MobileLabel htmlFor="email" required>
                Email Address
              </MobileLabel>
              <MobileInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                disabled={loading}
                mobileKeyboard="email"
              />
            </div>

            <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
              <MobileLabel htmlFor="password" required>
                Password
              </MobileLabel>
              <div className="relative">
                <MobileInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[clamp(0.75rem,2vw,1rem)] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)]" />
                  ) : (
                    <Eye className="h-[clamp(1.25rem,3vw,1.5rem)] w-[clamp(1.25rem,3vw,1.5rem)]" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/forgot-password')}
              className="text-[clamp(0.875rem,2.5vw,1rem)] text-blue-600 hover:text-blue-700 h-auto p-0"
              disabled={loading}
            >
              Forgot your password?
            </Button>
          </div>

          {/* Test credentials helper */}
          {config.testCredentials && (
            <div className="pt-[clamp(1rem,3vw,1.5rem)] border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={fillTestCredentials}
                className="w-full h-[clamp(2.5rem,5vw,2.75rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                disabled={loading}
              >
                Use Test Credentials
              </Button>
            </div>
          )}

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 hover:text-gray-800 h-auto p-0"
              disabled={loading}
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
