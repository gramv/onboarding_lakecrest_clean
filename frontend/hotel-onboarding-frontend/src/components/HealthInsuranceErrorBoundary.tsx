/**
 * Health Insurance Error Boundary
 * Catches and handles React errors in the Health Insurance module
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react'
import type { HealthInsuranceError, ErrorSeverity } from '@/types/healthInsuranceErrors'
import { healthInsuranceErrorHandler } from '@/services/HealthInsuranceErrorHandler'
import { HealthInsuranceErrorType } from '@/types/healthInsuranceErrors'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: HealthInsuranceError) => void
  language?: 'en' | 'es'
}

interface State {
  hasError: boolean
  error: HealthInsuranceError | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class HealthInsuranceErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert JavaScript error to HealthInsuranceError
    const healthInsuranceError: HealthInsuranceError = {
      id: `boundary_error_${Date.now()}`,
      type: HealthInsuranceErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.HIGH,
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date(),
      context: {
        component: 'HealthInsuranceErrorBoundary',
        operation: 'render',
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      stack: error.stack,
      recoverable: true
    }

    return {
      hasError: true,
      error: healthInsuranceError
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error through our error handler
    if (this.state.error) {
      healthInsuranceErrorHandler.handleError(this.state.error, this.props.language)
    }

    // Call optional error callback
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('HealthInsurance Error Boundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleContactSupport = () => {
    // In a real implementation, this would open a support modal or redirect
    window.open('mailto:support@hotel-onboarding.com?subject=Health Insurance Error', '_blank')
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                {this.props.language === 'es' 
                  ? 'Error Inesperado' 
                  : 'Unexpected Error'
                }
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {this.props.language === 'es'
                    ? 'Algo salió mal con su formulario de seguro de salud. Su información está segura y nuestro equipo ha sido notificado.'
                    : 'Something went wrong with your health insurance form. Your information is safe and our team has been notified.'
                  }
                </AlertDescription>
              </Alert>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-gray-100 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                    Technical Details (Development)
                  </summary>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div><strong>Error Type:</strong> {this.state.error.type}</div>
                    <div><strong>Message:</strong> {this.state.error.message}</div>
                    <div><strong>Timestamp:</strong> {this.state.error.timestamp.toISOString()}</div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.state.retryCount < this.maxRetries && (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {this.props.language === 'es' ? 'Intentar de Nuevo' : 'Try Again'}
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {this.props.language === 'es' ? 'Reiniciar' : 'Reset'}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  {this.props.language === 'es' ? 'Ir al Inicio' : 'Go Home'}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={this.handleContactSupport}
                  className="flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  {this.props.language === 'es' ? 'Contactar Soporte' : 'Contact Support'}
                </Button>
              </div>

              {/* Retry Information */}
              {this.state.retryCount > 0 && (
                <div className="text-center text-sm text-gray-600">
                  {this.props.language === 'es'
                    ? `Intento ${this.state.retryCount} de ${this.maxRetries}`
                    : `Attempt ${this.state.retryCount} of ${this.maxRetries}`
                  }
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-500">
                {this.props.language === 'es'
                  ? 'Si el problema persiste, por favor contacte a soporte técnico con el código de error mostrado arriba.'
                  : 'If the problem persists, please contact technical support with the error code shown above.'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use with hooks
interface HealthInsuranceErrorFallbackProps {
  error?: HealthInsuranceError
  onRetry?: () => void
  onReset?: () => void
  language?: 'en' | 'es'
}

export function HealthInsuranceErrorFallback({ 
  error, 
  onRetry, 
  onReset, 
  language = 'en' 
}: HealthInsuranceErrorFallbackProps) {
  return (
    <div className="p-6 text-center">
      <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {language === 'es' ? 'Error en el Formulario' : 'Form Error'}
      </h3>
      
      <p className="text-gray-600 mb-4">
        {error?.message || (
          language === 'es' 
            ? 'Ocurrió un error inesperado. Por favor intente de nuevo.'
            : 'An unexpected error occurred. Please try again.'
        )}
      </p>
      
      <div className="flex gap-2 justify-center">
        {onRetry && (
          <Button onClick={onRetry} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Reintentar' : 'Retry'}
          </Button>
        )}
        
        {onReset && (
          <Button onClick={onReset} variant="outline" size="sm">
            {language === 'es' ? 'Reiniciar' : 'Reset'}
          </Button>
        )}
      </div>
    </div>
  )
}
