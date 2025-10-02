/**
 * ProgressBar - Shows overall onboarding progress
 */

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Shield } from 'lucide-react'
import { OnboardingStep } from '../../types/onboarding'

interface ProgressBarProps {
  steps: OnboardingStep[]
  currentStep: number
  completedSteps: string[]
  percentComplete: number
  estimatedTimeRemaining: number
  federalStepsCompleted?: number
  totalFederalSteps?: number
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  percentComplete,
  estimatedTimeRemaining,
  federalStepsCompleted = 0,
  totalFederalSteps = 0
}: ProgressBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Summary */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Onboarding Progress</h3>
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length} • {completedSteps.length}/{steps.length} completed
            </p>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            {/* Federal Steps Indicator */}
            {totalFederalSteps > 0 && (
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>Federal: {federalStepsCompleted}/{totalFederalSteps}</span>
              </div>
            )}
            
            {/* Time Remaining */}
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>~{estimatedTimeRemaining} min remaining</span>
            </div>
            
            {/* Completion Percentage */}
            <div className="flex items-center space-x-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">{Math.round(percentComplete)}% Complete</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <Progress 
            value={percentComplete} 
            className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
          />
          
          {/* Progress Percentage Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-white drop-shadow-sm">
              {Math.round(percentComplete)}%
            </span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-4 flex justify-between items-center">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = index === currentStep
            const isAccessible = index <= currentStep || isCompleted
            
            return (
              <div key={step.id} className="flex flex-col items-center space-y-1">
                {/* Step Circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-blue-600 text-white' 
                    : isAccessible 
                    ? 'bg-gray-300 text-gray-700'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                
                {/* Step Name (truncated) */}
                <span className={`text-xs text-center max-w-16 truncate ${
                  isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`} title={step.name}>
                  {step.name}
                </span>
                
                {/* Federal Requirement Indicator */}
                {step.governmentRequired && (
                  <Shield className="h-3 w-3 text-blue-500" title="Federal Requirement" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}