/**
 * NavigationButtons - Step navigation controls
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Save, RefreshCw } from 'lucide-react'
import { scrollToTop } from '@/utils/scrollHelpers'

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
  language = 'en'
}: NavigationButtonsProps) {
  
  const translations = {
    en: {
      previous: 'Previous',
      next: 'Next',
      save: 'Save',
      saving: 'Saving...',
      continue: 'Continue',
      submit: 'Submit',
      review: 'Review & Submit'
    },
    es: {
      previous: 'Anterior',
      next: 'Siguiente',
      save: 'Guardar',
      saving: 'Guardando...',
      continue: 'Continuar',
      submit: 'Enviar',
      review: 'Revisar y Enviar'
    }
  }

  const t = translations[language]

  return (
    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-6 border-t border-gray-200">
      {/* Previous Button */}
      <div className="order-2 sm:order-1">
        {showPrevious ? (
          <Button
            variant="outline"
            onClick={() => {
              scrollToTop()
              onPrevious()
            }}
            disabled={disabled || saving}
            className="w-full sm:w-auto flex items-center space-x-2 button-transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t.previous}</span>
          </Button>
        ) : (
          <div></div> // Spacer for flex layout
        )}
      </div>

      {/* Save Button (if shown separately) */}
      {showSave && onSave && (
        <div className="order-3 sm:order-2">
          <Button
            variant="secondary"
            onClick={onSave}
            disabled={disabled || saving}
            className="w-full sm:w-auto flex items-center space-x-2 button-transition"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.saving}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t.save}</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Next/Continue/Submit Button */}
      <div className="order-1 sm:order-3">
        {showNext && (
          <Button
            size="lg"
            onClick={() => {
              scrollToTop()
              onNext()
            }}
            disabled={disabled || saving}
            className={`w-full sm:w-auto flex items-center space-x-2 font-semibold button-transition ${
              hasErrors 
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.saving}</span>
              </>
            ) : (
              <>
                <span>
                  {nextButtonText === 'Next' ? t.next : 
                   nextButtonText === 'Continue' ? t.continue :
                   nextButtonText === 'Submit' ? t.submit :
                   nextButtonText === 'Review & Submit' ? t.review :
                   nextButtonText}
                </span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default NavigationButtons