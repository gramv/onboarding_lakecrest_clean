import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Shield, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${config.gradient} padding-md`}>
      <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
        <CardHeader className="card-padding-lg text-center spacing-md">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              {config.icon}
            </div>
          </div>
          
          <div className="spacing-sm">
            <Badge className={`badge-${config.badgeVariant} badge-md`}>
              {config.badge}
            </Badge>
            <CardTitle className="text-display-sm">
              {config.title}
            </CardTitle>
            <CardDescription className="text-body-md text-secondary">
              {config.description}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="card-padding-lg spacing-md">
          {returnUrl && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                You'll be redirected to <strong>{returnUrl}</strong> after signing in.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="spacing-sm">
            {error && (
              <Alert variant="destructive" className="bg-error border-error animate-slide-down">
                <AlertDescription className="text-error">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="form-group">
              <Label htmlFor="email" className="form-label">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="form-input-base form-input-md focus-ring"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            
            <div className="form-group">
              <Label htmlFor="password" className="form-label">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input-base form-input-md focus-ring"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center pt-3">
            <Button
              variant="link"
              onClick={() => navigate('/forgot-password')}
              className="text-body-sm text-secondary hover:text-primary smooth-transition"
              disabled={loading}
            >
              Forgot your password?
            </Button>
          </div>

          {/* Test credentials helper */}
          {config.testCredentials && (
            <div className="pt-4 border-t border-muted">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={fillTestCredentials}
                className="w-full"
                disabled={loading}
              >
                Use Test Credentials
              </Button>
            </div>
          )}
          
          <div className="text-center pt-2">
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
              className="text-body-sm text-secondary hover:text-primary smooth-transition"
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
