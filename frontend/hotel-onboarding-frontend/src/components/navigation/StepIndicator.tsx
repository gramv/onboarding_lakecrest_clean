/**
 * StepIndicator - Shows current step information and status
 */

import React from 'react'
import { CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StepIndicatorProps {
  stepNumber: number
  stepName: string
  isComplete: boolean
  isCurrent: boolean
  isRequired: boolean
  isFederalRequired?: boolean
  estimatedMinutes?: number
  hasErrors?: boolean
  hasWarnings?: boolean
}

export function StepIndicator({
  stepNumber,
  stepName,
  isComplete,
  isCurrent,
  isRequired,
  isFederalRequired = false,
  estimatedMinutes = 0,
  hasErrors = false,
  hasWarnings = false
}: StepIndicatorProps) {
  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
      {/* Step Number/Status Icon */}
      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${
        isComplete 
          ? 'bg-green-100 text-green-600' 
          : isCurrent 
          ? 'bg-blue-100 text-blue-600' 
          : 'bg-gray-100 text-gray-500'
      }`}>
        {isComplete ? (
          <CheckCircle className="h-6 w-6" />
        ) : hasErrors ? (
          <AlertTriangle className="h-6 w-6 text-red-500" />
        ) : (
          <span className="text-lg">{stepNumber}</span>
        )}
      </div>

      {/* Step Information */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className={`text-lg font-semibold truncate ${
            isCurrent ? 'text-gray-900' : 'text-gray-600'
          }`}>
            {stepName}
          </h3>
          
          {/* Status Badges */}
          <div className="flex items-center space-x-1">
            {isRequired && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
            
            {isFederalRequired && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Shield className="h-3 w-3 mr-1" />
                Federal
              </Badge>
            )}
            
            {isComplete && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Step Metadata */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {estimatedMinutes > 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>~{estimatedMinutes} min</span>
            </div>
          )}
          
          {hasErrors && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Has errors</span>
            </div>
          )}
          
          {hasWarnings && !hasErrors && (
            <div className="flex items-center space-x-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Has warnings</span>
            </div>
          )}
          
          {isCurrent && !hasErrors && !hasWarnings && (
            <span className="text-blue-600 font-medium">Current step</span>
          )}
        </div>
      </div>

      {/* Current Step Indicator */}
      {isCurrent && (
        <div className="flex-shrink-0">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  )
}