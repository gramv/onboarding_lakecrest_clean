import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { MobileInput } from '@/components/job-application/mobile-optimized/MobileInput'
import { MobileLabel } from '@/components/job-application/mobile-optimized/MobileLabel'
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-[clamp(1rem,3vw,1.5rem)]">
        <Card className="w-full max-w-md shadow-xl rounded-lg">
          <CardHeader className="p-[clamp(1.5rem,4vw,2rem)] text-center space-y-[clamp(1rem,3vw,1.5rem)]">
            <div className="flex justify-center">
              <div className="p-[clamp(1rem,3vw,1.25rem)] bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <CheckCircle className="h-[clamp(2rem,5vw,2.5rem)] w-[clamp(2rem,5vw,2.5rem)] text-green-600" />
              </div>
            </div>

            <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Email Sent
              </Badge>
              <CardTitle className="text-[clamp(1.5rem,4vw,2rem)] font-bold">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
                If an account exists with this email, you will receive a password reset link.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-[clamp(1.5rem,4vw,2rem)]">
            <div className="space-y-[clamp(1rem,3vw,1.5rem)] text-center">
              <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>

              <div className="flex flex-col gap-[clamp(0.75rem,2vw,1rem)]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                  className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)]"
                >
                  Try Different Email
                </Button>

                <Button
                  variant="link"
                  onClick={() => navigate('/login')}
                  className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 hover:text-gray-800 h-auto p-0"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-[clamp(1rem,3vw,1.5rem)]">
      <Card className="w-full max-w-md shadow-xl rounded-lg">
        <CardHeader className="p-[clamp(1.5rem,4vw,2rem)] text-center space-y-[clamp(1rem,3vw,1.5rem)]">
          <div className="flex justify-center">
            <div className="p-[clamp(1rem,3vw,1.25rem)] bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <Mail className="h-[clamp(2rem,5vw,2.5rem)] w-[clamp(2rem,5vw,2.5rem)] text-blue-600" />
            </div>
          </div>

          <div className="space-y-[clamp(0.5rem,1.5vw,0.75rem)]">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              Password Reset
            </Badge>
            <CardTitle className="text-[clamp(1.5rem,4vw,2rem)] font-bold">
              Forgot Your Password?
            </CardTitle>
            <CardDescription className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-[clamp(1.5rem,4vw,2rem)]">
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

            <Button
              type="submit"
              className="w-full h-[clamp(2.75rem,6vw,3rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold flex items-center justify-center gap-[clamp(0.5rem,1.5vw,0.75rem)]"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Mail className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
                  Send Reset Link
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-[clamp(1rem,3vw,1.5rem)]">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600 hover:text-gray-800 h-auto p-0 flex items-center justify-center gap-[clamp(0.25rem,1vw,0.5rem)]"
              disabled={loading}
            >
              <ArrowLeft className="h-[clamp(0.75rem,2vw,1rem)] w-[clamp(0.75rem,2vw,1rem)]" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
