import React from 'react'
import { Check, Clock, AlertCircle, Loader2 } from 'lucide-react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveIndicatorProps {
  status: SaveStatus
  lastSaved?: Date | string | null
  error?: string
  className?: string
  language?: 'en' | 'es'
}

/**
 * Unified auto-save indicator for consistent save status display across all onboarding steps
 */
export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved,
  error,
  className = '',
  language = 'en'
}) => {
  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return null
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const messages = {
    en: {
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Failed to save',
      lastSaved: 'Last saved at'
    },
    es: {
      saving: 'Guardando...',
      saved: 'Guardado',
      error: 'Error al guardar',
      lastSaved: 'Guardado por última vez a las'
    }
  }

  const t = messages[language]

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-gray-600">{t.saving}</span>
        </>
      )}
      
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600">
            {t.saved}
            {lastSaved && (
              <span className="text-gray-500 ml-1">
                ({t.lastSaved} {formatTime(lastSaved)})
              </span>
            )}
          </span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-600">
            {error || t.error}
          </span>
        </>
      )}
      
      {status === 'idle' && lastSaved && (
        <span className="text-gray-500">
          <Clock className="h-4 w-4 inline mr-1" />
          {t.lastSaved} {formatTime(lastSaved)}
        </span>
      )}
    </div>
  )
}

export default AutoSaveIndicator