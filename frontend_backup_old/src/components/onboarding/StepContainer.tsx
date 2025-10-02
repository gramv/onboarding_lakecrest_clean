import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { FormError } from './FormError'
import { AutoSaveIndicator, SaveStatus } from './AutoSaveIndicator'

interface StepContainerProps {
  children: React.ReactNode
  errors?: string[]
  fieldErrors?: Record<string, string>
  saveStatus?: SaveStatus
  className?: string
}

/**
 * StepContainer provides consistent layout and error handling for all onboarding steps
 */
export function StepContainer({
  children,
  errors = [],
  fieldErrors = {},
  saveStatus = 'idle',
  className = ''
}: StepContainerProps) {
  // Collect all field errors into a single array
  const allFieldErrors = Object.values(fieldErrors).filter(Boolean)
  const hasErrors = errors.length > 0 || allFieldErrors.length > 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top-level errors */}
      {errors.length > 0 && (
        <FormError errors={errors} variant="alert" />
      )}

      {/* Main content */}
      <div className="relative">
        {children}
        
        {/* Auto-save indicator */}
        {saveStatus !== 'idle' && (
          <div className="absolute top-0 right-0 -mt-8">
            <AutoSaveIndicator status={saveStatus} />
          </div>
        )}
      </div>

      {/* Field-level errors summary (optional) */}
      {allFieldErrors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-amber-800 mb-2">
              Please correct the following fields:
            </p>
            <ul className="text-sm text-amber-700 space-y-1">
              {allFieldErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}