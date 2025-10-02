import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StepStatus } from '@/types/onboarding'
import { CheckCircle, Circle, Lock } from 'lucide-react'

export interface StepNavigatorSection {
  id: string
  title: string
  description?: string
  status: StepStatus
  icon?: React.ReactNode
}

interface StepNavigatorProps {
  sections: StepNavigatorSection[]
  currentSectionId: string
  onSelect?: (sectionId: string) => void
  onContinue?: () => void
  onBack?: () => void
  continueLabel?: string
  backLabel?: string
  continueDisabled?: boolean
  layout?: 'horizontal' | 'vertical'
  className?: string
  compact?: boolean
}

const statusStyleMap: Record<StepStatus, string> = {
  complete: 'bg-green-100 text-green-700 border border-green-200',
  'in-progress': 'bg-blue-600 text-white border border-blue-600',
  ready: 'bg-white text-blue-600 border border-blue-300',
  locked: 'bg-gray-100 text-gray-400 border border-gray-200'
}

const statusIconMap: Record<StepStatus, React.ReactNode> = {
  complete: <CheckCircle className="h-4 w-4" />,
  'in-progress': <Circle className="h-4 w-4" />,
  ready: <Circle className="h-4 w-4" />,
  locked: <Lock className="h-4 w-4" />
}

export function StepNavigator({
  sections,
  currentSectionId,
  onSelect,
  onContinue,
  onBack,
  continueLabel = 'Continue',
  backLabel = 'Back',
  continueDisabled = false,
  layout = 'horizontal',
  className,
  compact = false
}: StepNavigatorProps) {
  const isHorizontal = layout === 'horizontal'

  const containerClasses = cn(
    'space-y-3',
    className
  )

  return (
    <div className={containerClasses}>
      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-gray-700">
            Section {sections.findIndex(section => section.id === currentSectionId) + 1} of {sections.length}
          </div>
          <div className="text-xs text-gray-500">
            {sections.find(section => section.id === currentSectionId)?.title}
          </div>
        </div>
        <div className="relative h-1.5 rounded-full bg-gray-200">
          <div
            className="absolute left-0 top-0 h-1.5 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(sections.findIndex(section => section.id === currentSectionId) + 1) / sections.length * 100}%` }}
          />
        </div>
        <div className={cn(
          'grid gap-2',
          isHorizontal ? 'grid-cols-5 sm:grid-cols-5 md:grid-cols-5' : 'grid-cols-1'
        )}>
          {sections.map((section, index) => {
            const isCurrent = section.id === currentSectionId
            const isLocked = section.status === 'locked'
            const canSelect = onSelect && !isLocked
            const isComplete = section.status === 'complete'

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => canSelect && onSelect(section.id)}
                disabled={!canSelect}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/60',
                  isLocked && 'cursor-not-allowed opacity-60'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isComplete ? 'bg-green-100 text-green-700 border border-green-300' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                )}>
                  {isComplete ? <CheckCircle className="h-3 w-3" /> : index + 1}
                </div>
                <span className="text-[11px] font-medium text-gray-700 line-clamp-2">
                  {section.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {(onBack || onContinue) && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="sm:w-auto"
            >
              {backLabel}
            </Button>
          )}
          {onContinue && (
            <Button
              onClick={onContinue}
              disabled={continueDisabled}
              className={cn(
                'sm:w-auto'
              )}
            >
              {continueLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default StepNavigator
