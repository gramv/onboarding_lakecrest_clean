/**
 * ProgressBar - Shows overall onboarding progress
 */

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Shield } from 'lucide-react'
import { OnboardingStep, StepStatus } from '../../types/onboarding'

interface ProgressBarProps {
  steps: OnboardingStep[]
  currentStep: number
  completedSteps: string[]
  percentComplete: number
  estimatedTimeRemaining: number
  federalStepsCompleted?: number
  totalFederalSteps?: number
  onStepClick?: (stepIndex: number) => void
  canNavigateToStep?: (stepIndex: number) => boolean
  stepStates?: Record<string, StepStatus>
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  percentComplete,
  estimatedTimeRemaining,
  federalStepsCompleted = 0,
  totalFederalSteps = 0,
  onStepClick,
  canNavigateToStep,
  stepStates
}: ProgressBarProps) {
  const currentStepMeta = steps[currentStep]

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Mobile summary */}
        <div className="space-y-3 sm:hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {currentStepMeta?.name || 'Current step'}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {Math.round(percentComplete)}%
            </span>
          </div>

          <Progress value={percentComplete} className="h-3 w-full bg-gray-200 rounded-full" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="h-3.5 w-3.5 text-gray-500" />
              <span>~{estimatedTimeRemaining} min left</span>
            </div>
            {currentStepMeta?.governmentRequired && (
              <div className="flex items-center space-x-1">
                <Shield className="h-3.5 w-3.5 text-blue-500" />
                <span>Federal requirement</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop summary */}
        <div className="hidden sm:block">
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
              const stepStatus = stepStates?.[step.id]
              const isCompleted = stepStatus === 'complete' || completedSteps.includes(step.id)
              const isCurrent = stepStatus === 'in-progress' || index === currentStep
              const isLocked = stepStatus === 'locked'
              const isReady = stepStatus === 'ready'

              const canNavigate = canNavigateToStep
                ? canNavigateToStep(index)
                : !isLocked && (isCompleted || isReady || isCurrent)
              const isClickable = canNavigate && onStepClick && !isCurrent

              const circleClasses = (() => {
                if (isCompleted) return 'bg-green-500 text-white border border-green-500'
                if (isCurrent) return 'bg-blue-600 text-white border border-blue-600'
                if (isLocked) return 'bg-gray-100 text-gray-400 border border-gray-200'
                if (isReady) return 'bg-white text-blue-600 border border-blue-300'
                return 'bg-gray-300 text-gray-700 border border-gray-300'
              })()

              return (
                <div key={step.id} className="flex flex-col items-center space-y-1 gap-1">
                  {/* Step Circle */}
                  <button
                    onClick={() => isClickable && onStepClick(index)}
                    disabled={!isClickable}
                    className={`w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${circleClasses} ${
                      isClickable
                        ? 'cursor-pointer hover:scale-110 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        : 'cursor-default'
                    }`}
                    title={isClickable ? `Jump to ${step.name}` : step.name}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                  
                  {/* Step Name (truncated) */}
                  <span
                    className={`text-xs text-center max-w-16 truncate ${
                      isCurrent
                        ? 'text-blue-600 font-medium'
                        : isReady
                        ? 'text-blue-500'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                    title={step.name}
                  >
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
    </div>
  )
}
