import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AutoSaveIndicator, SaveStatus } from './AutoSaveIndicator'
import { FormError } from './FormError'
import { LucideIcon } from 'lucide-react'

interface OnboardingStepWrapperProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  saveStatus?: SaveStatus
  lastSaved?: Date | string | null
  saveError?: string
  formError?: string | string[]
  language?: 'en' | 'es'
  className?: string
}

/**
 * Unified wrapper component for consistent styling and layout across all onboarding steps
 */
export const OnboardingStepWrapper: React.FC<OnboardingStepWrapperProps> = ({
  title,
  description,
  icon: Icon,
  children,
  saveStatus = 'idle',
  lastSaved,
  saveError,
  formError,
  language = 'en',
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with save status */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          {Icon && <Icon className="h-6 w-6 text-blue-600" />}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        {description && (
          <p className="text-gray-600 max-w-3xl mx-auto mb-4">{description}</p>
        )}
        
        {/* Auto-save indicator */}
        <div className="flex justify-center">
          <AutoSaveIndicator
            status={saveStatus}
            lastSaved={lastSaved}
            error={saveError}
            language={language}
          />
        </div>
      </div>

      {/* Form-level errors */}
      {formError && (
        <FormError error={formError} variant="alert" />
      )}

      {/* Main content */}
      <Card>
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

export default OnboardingStepWrapper