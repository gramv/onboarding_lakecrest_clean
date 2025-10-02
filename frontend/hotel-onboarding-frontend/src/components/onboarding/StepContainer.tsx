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
  canProceed?: boolean
}

/**
 * StepContainer provides consistent layout and error handling for all onboarding steps
 */
export function StepContainer({
  children,
  errors = [],
  fieldErrors = {},
  saveStatus = 'idle',
  className = '',
  canProceed = true
}: StepContainerProps) {
  // Collect all field errors into a single array
  const allFieldErrors = Object.values(fieldErrors).filter(Boolean)
  const hasErrors = errors.length > 0 || allFieldErrors.length > 0

  return (
    <div className={`space-y-6 pb-24 sm:pb-0 ${className}`}>
      {/* Top-level errors */}
      {errors.length > 0 && (
        <FormError errors={errors} variant="alert" />
      )}

      {/* Main content */}
      <div
        className="relative"
        data-step-container="true"
        data-can-proceed={canProceed}
        role="group"
      >
        {children}

        {/* Auto-save indicator */}
        {saveStatus !== 'idle' && (
          <div className="mt-4 flex justify-end sm:mt-0 sm:absolute sm:top-0 sm:right-0 sm:-mt-8">
            <AutoSaveIndicator
              status={saveStatus}
              className="rounded-full bg-white/90 px-3 py-1 text-xs text-gray-600 shadow-sm backdrop-blur sm:bg-transparent sm:px-0 sm:py-0 sm:text-sm sm:shadow-none"
            />
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
