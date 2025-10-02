import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import type { AxiosError } from 'axios'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

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

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      await api.auth.requestPasswordReset(email.trim())
      setSuccess(true)
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string; error?: string }>
      const apiMessage = axiosError.response?.data?.detail || axiosError.response?.data?.error
      setError(apiMessage || 'Failed to send password reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
                Email Sent
              </Badge>
              <CardTitle className="text-display-sm">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-body-md text-secondary">
                If an account exists with this email, you will receive a password reset link.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="card-padding-lg">
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
              
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full"
                >
                  Try Different Email
                </Button>
                
                <Button 
                  variant="link" 
                  onClick={() => navigate('/login')}
                  className="text-body-sm text-secondary hover:text-primary"
                >
                  ← Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 padding-md">
      <Card className="w-full max-w-md card-elevated card-rounded-lg animate-fade-in">
        <CardHeader className="card-padding-lg text-center spacing-md">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="spacing-sm">
            <Badge className="badge-primary badge-md">
              Password Reset
            </Badge>
            <CardTitle className="text-display-sm">
              Forgot Your Password?
            </CardTitle>
            <CardDescription className="text-body-md text-secondary">
              Enter your email address and we'll send you a link to reset your password.
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
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary btn-md"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>
          
          <div className="text-center pt-4">
            <Button 
              variant="link" 
              onClick={() => navigate('/login')}
              className="text-body-sm text-secondary hover:text-primary smooth-transition"
              disabled={loading}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
