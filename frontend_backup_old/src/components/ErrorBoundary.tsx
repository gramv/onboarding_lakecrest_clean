import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <Alert className="max-w-2xl border-red-200 bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-900">
              Something went wrong
            </AlertTitle>
            <AlertDescription className="mt-2 text-red-800">
              <p className="mb-4">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="sm"
                >
                  Go to Home
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}