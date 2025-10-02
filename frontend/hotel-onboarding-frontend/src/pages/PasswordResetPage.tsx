import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import type { AxiosError } from 'axios'

export default function PasswordResetPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid or missing reset token')
        setVerifying(false)
        return
      }

      try {
        await api.auth.verifyResetToken(token)
        setTokenValid(true)
      } catch (err) {
        const axiosError = err as AxiosError<{ detail?: string; error?: string }>
        const apiMessage = axiosError.response?.data?.detail || axiosError.response?.data?.error
        setError(apiMessage || 'Invalid or expired reset token')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!password.trim()) {
      setError('Password is required')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!token) {
      setError('Invalid reset token')
      setLoading(false)
      return
    }

    try {
      await api.auth.resetPassword({ token, password })
      setSuccess(true)
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string; error?: string }>
      const apiMessage = axiosError.response?.data?.detail || axiosError.response?.data?.error
      setError(apiMessage || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 padding-md">
        <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
          <CardContent className="card-padding-lg text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Verifying reset token...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 padding-md">
        <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
          <CardHeader className="card-padding-lg text-center spacing-md">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="spacing-sm">
              <Badge className="badge-success badge-md">
                Password Reset
              </Badge>
              <CardTitle className="text-display-sm">
                Password Updated Successfully
              </CardTitle>
              <CardDescription className="text-body-md text-secondary">
                Your password has been reset. You can now log in with your new password.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="card-padding-lg">
            <Button 
              onClick={() => navigate('/login')}
              className="w-full btn-primary btn-md"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state (invalid token)
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 padding-md">
        <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
          <CardHeader className="card-padding-lg text-center spacing-md">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <div className="spacing-sm">
              <Badge className="badge-destructive badge-md">
                Invalid Token
              </Badge>
              <CardTitle className="text-display-sm">
                Reset Link Invalid
              </CardTitle>
              <CardDescription className="text-body-md text-secondary">
                {error || 'This password reset link is invalid or has expired.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="card-padding-lg">
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => navigate('/forgot-password')}
                className="w-full btn-primary btn-md"
              >
                Request New Reset Link
              </Button>
              
              <Button 
                variant="link" 
                onClick={() => navigate('/login')}
                className="text-body-sm text-secondary hover:text-primary"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 padding-md">
      <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
        <CardHeader className="card-padding-lg text-center spacing-md">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="spacing-sm">
            <Badge className="badge-primary badge-md">
              Reset Password
            </Badge>
            <CardTitle className="text-display-sm">
              Create New Password
            </CardTitle>
            <CardDescription className="text-body-md text-secondary">
              Enter your new password below.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="card-padding-lg">
          <form onSubmit={handleSubmit} className="spacing-sm">
            {error && (
              <Alert variant="destructive" className="bg-error border-error animate-slide-down">
                <AlertDescription className="text-error">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="form-group">
              <Label htmlFor="password" className="form-label">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="form-input-base form-input-md focus-ring"
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="form-group">
              <Label htmlFor="confirmPassword" className="form-label">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="form-input-base form-input-md focus-ring"
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary btn-md"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
