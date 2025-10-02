/**
 * NavigationButtons - Mobile-optimized step navigation controls
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Save, RefreshCw, ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { scrollToTop } from '@/utils/scrollHelpers'
import { cn } from '@/lib/utils'
import { StepStatus } from '@/types/onboarding'

interface NavigationButtonsProps {
  showPrevious: boolean
  showNext: boolean
  showSave: boolean
  nextButtonText?: string
  onPrevious: () => void
  onNext: () => void
  onSave?: () => void
  disabled?: boolean
  saving?: boolean
  hasErrors?: boolean
  language?: 'en' | 'es'
  sticky?: boolean
  currentStep?: number
  totalSteps?: number
  progress?: number
  stepStatus?: StepStatus
}

export function NavigationButtons({
  showPrevious,
  showNext,
  showSave,
  nextButtonText = 'Next',
  onPrevious,
  onNext,
  onSave,
  disabled = false,
  saving = false,
  hasErrors = false,
  language = 'en',
  sticky = false,
  currentStep,
  totalSteps,
  progress,
  stepStatus
}: NavigationButtonsProps) {

  const translations = {
    en: {
      previous: 'Previous',
      next: 'Next',
      save: 'Save',
      saving: 'Saving...',
      continue: 'Continue',
      submit: 'Submit',
      review: 'Review & Submit',
      back: 'Back',
      getStarted: 'Get Started'
    },
    es: {
      previous: 'Anterior',
      next: 'Siguiente',
      save: 'Guardar',
      saving: 'Guardando...',
      continue: 'Continuar',
      submit: 'Enviar',
      review: 'Revisar y Enviar',
      back: 'Atrás',
      getStarted: 'Comenzar'
    }
  }

  const t = translations[language]

  // Determine if this is a submit button
  const isSubmitButton = nextButtonText === 'Submit' || nextButtonText === t.submit
  const isFirstStep = currentStep === 0
  const nextButtonDisabled = disabled || saving || hasErrors
  const baseDisabled = disabled || saving
  const nextButtonStateClasses = hasErrors
    ? ['bg-red-600 hover:bg-red-700 active:bg-red-800', 'text-white animate-pulse', 'border border-red-600']
    : baseDisabled
    ? ['bg-gray-300 text-gray-500', 'border border-gray-300']
    : isSubmitButton
    ? ['bg-green-600 hover:bg-green-700 active:bg-green-800', 'text-white', 'border border-green-600']
    : ['bg-blue-600 hover:bg-blue-700 active:bg-blue-800', 'text-white', 'border border-blue-600']
  const showStepReminder = stepStatus && stepStatus !== 'complete' && !saving && disabled && !hasErrors

  // Container classes based on sticky prop
  const containerClasses = cn(
    sticky
      ? [
          "flex flex-col gap-3",
          "sticky bottom-0 left-0 right-0 z-20",
          "bg-white border-t shadow-2xl",
          "p-4 -mx-6 sm:mx-0",
          "sm:relative sm:flex-row sm:items-center sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:pt-6"
        ]
      : [
          "flex gap-3",
          "pt-6 border-t border-gray-200"
        ]
  )

  return (
    <div className={containerClasses}>
      <div className={cn(
        "flex gap-3 flex-1",
        sticky ? "flex-col sm:flex-row" : "flex-row"
      )}>
        {/* Previous/Back Button */}
        {showPrevious ? (
          <Button
            variant="outline"
            onClick={() => {
              scrollToTop()
              onPrevious()
            }}
            disabled={disabled || saving}
            className={cn(
              "flex items-center justify-center",
              "transition-all duration-150",
              "hover:bg-gray-50 hover:text-gray-900",
              "active:scale-95 active:bg-gray-100",
              "shadow-sm",
              sticky ? [
                "w-full sm:w-auto",
                "flex-1 sm:flex-initial",
                "min-h-[48px] sm:min-h-[44px]",
                "py-3 px-6 sm:py-2 sm:px-4",
                "sm:min-w-[120px]"
              ] : [
                "min-h-[48px] sm:min-h-[44px]",
                "py-3 px-6 sm:py-2 sm:px-4"
              ]
            )}
          >
            <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4 mr-2 shrink-0" />
            <span className="hidden sm:inline">{t.previous}</span>
            <span className="sm:hidden">{t.back}</span>
          </Button>
        ) : sticky && (
          <div className="flex-1 sm:flex-initial sm:min-w-[120px]"></div>
        )}

        {/* Save Button (middle, if shown) */}
        {showSave && onSave && !sticky && (
          <Button
            variant="secondary"
            onClick={onSave}
            disabled={disabled || saving}
            className={cn(
              "flex items-center justify-center",
              "min-h-[48px] sm:min-h-[44px]",
              "py-3 px-6 sm:py-2 sm:px-4",
              "transition-all duration-150",
              "active:scale-95"
            )}
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                <span>{t.saving}</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                <span>{t.save}</span>
              </>
            )}
          </Button>
        )}

        {/* Next/Continue/Submit Button */}
        {showNext && (
          <Button
            onClick={() => {
              scrollToTop()
              onNext()
            }}
            disabled={nextButtonDisabled}
            className={cn(
              "flex items-center justify-center font-medium",
              "transition-all duration-150",
              "active:scale-95 shadow-md",
              sticky ? [
                "w-full sm:w-auto",
                "flex-1 sm:flex-initial",
                "min-h-[48px] sm:min-h-[44px]",
                "py-3 px-6 sm:py-2 sm:px-4",
                "sm:min-w-[120px]"
              ] : [
                "min-h-[48px] sm:min-h-[44px]",
                "py-3 px-6 sm:py-2 sm:px-4"
              ],
              nextButtonStateClasses,
              nextButtonDisabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
            )}
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                <span className="hidden sm:inline">{t.saving}</span>
              </>
            ) : isSubmitButton ? (
              <>
                <Send className="h-5 w-5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                <span>{t.submit}</span>
              </>
            ) : (
              <>
                <span>
                  {isFirstStep ? t.getStarted :
                   nextButtonText === 'Continue' ? t.continue :
                   nextButtonText === 'Review & Submit' ? t.review :
                   nextButtonText === 'Next' ? t.next :
                   nextButtonText}
                </span>
                <ArrowRight className="h-5 w-5 sm:h-4 sm:w-4 ml-2 shrink-0" />
              </>
            )}
          </Button>
        )}
      </div>

      {showStepReminder && (
        <div className="text-xs text-amber-600 sm:text-sm">
          Finish this section to unlock the next step.
        </div>
      )}

      {/* Mobile Progress Indicator (only when sticky) */}
      {sticky && currentStep !== undefined && totalSteps !== undefined && (
        <div className="sm:hidden mt-3 px-4 -mx-4 pb-2">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span className="font-medium">Step {currentStep + 1} of {totalSteps}</span>
            {progress !== undefined && (
              <span className="font-medium text-blue-600">{Math.round(progress)}% Complete</span>
            )}
          </div>
          {progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NavigationButtons
