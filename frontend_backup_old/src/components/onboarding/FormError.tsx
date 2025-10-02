import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FormErrorProps {
  error: string | string[]
  className?: string
  variant?: 'inline' | 'alert'
}

/**
 * Unified error display component for consistent error handling across all onboarding steps
 */
export const FormError: React.FC<FormErrorProps> = ({ 
  error, 
  className = '', 
  variant = 'inline' 
}) => {
  if (!error || (Array.isArray(error) && error.length === 0)) {
    return null
  }

  const errors = Array.isArray(error) ? error : [error]

  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={`${className}`}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {errors.length === 1 ? (
            errors[0]
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {errors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Inline variant for field-level errors
  return (
    <div className={`text-sm text-red-600 mt-1 ${className}`}>
      {errors.length === 1 ? (
        <p className="flex items-start space-x-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{errors[0]}</span>
        </p>
      ) : (
        <ul className="space-y-1">
          {errors.map((err, index) => (
            <li key={index} className="flex items-start space-x-1">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{err}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FormError