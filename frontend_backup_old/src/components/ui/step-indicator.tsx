import * as React from "react"
import { Check, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  id: string
  title: string
  description?: string
  status: 'pending' | 'current' | 'completed'
}

interface StepIndicatorProps {
  steps: Step[]
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

const sizeClasses = {
  sm: {
    circle: "h-8 w-8",
    icon: "h-4 w-4",
    text: "text-xs",
    line: "h-0.5",
    gap: "gap-2"
  },
  md: {
    circle: "h-10 w-10",
    icon: "h-5 w-5",
    text: "text-sm",
    line: "h-0.5",
    gap: "gap-3"
  },
  lg: {
    circle: "h-12 w-12",
    icon: "h-6 w-6",
    text: "text-base",
    line: "h-1",
    gap: "gap-4"
  }
}

export function StepIndicator({
  steps,
  orientation = 'horizontal',
  size = 'md',
  showLabels = true,
  className
}: StepIndicatorProps) {
  const sizes = sizeClasses[size]
  
  return (
    <div 
      className={cn(
        "flex",
        orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
        sizes.gap,
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const isCompleted = step.status === 'completed'
        const isCurrent = step.status === 'current'
        
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              orientation === 'horizontal' ? 'flex-row' : 'flex-col',
              !isLast && orientation === 'horizontal' && 'flex-1'
            )}
          >
            {/* Step Circle */}
            <div className={cn("flex", orientation === 'vertical' && 'flex-row items-center w-full')}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center transition-all duration-300 font-semibold",
                    sizes.circle,
                    isCompleted && "bg-green-600 text-white shadow-lg shadow-green-600/25",
                    isCurrent && "bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-4 ring-blue-600/20",
                    !isCompleted && !isCurrent && "bg-gray-200 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <Check className={cn(sizes.icon, "stroke-[3]")} />
                  ) : (
                    <span className={sizes.text}>{index + 1}</span>
                  )}
                </div>
                
                {/* Labels */}
                {showLabels && orientation === 'horizontal' && (
                  <div className="mt-2 text-center">
                    <p className={cn(
                      "font-medium",
                      sizes.text,
                      isCurrent && "text-blue-600",
                      isCompleted && "text-green-600",
                      !isCurrent && !isCompleted && "text-gray-500"
                    )}>
                      {step.title}
                    </p>
                    {step.description && (
                      <p className={cn("text-gray-500 mt-0.5", sizes.text === 'text-xs' ? 'text-xs' : 'text-xs')}>
                        {step.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Vertical Labels */}
              {showLabels && orientation === 'vertical' && (
                <div className="ml-4 flex-1">
                  <p className={cn(
                    "font-medium",
                    sizes.text,
                    isCurrent && "text-blue-600",
                    isCompleted && "text-green-600",
                    !isCurrent && !isCompleted && "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className={cn("text-gray-500 mt-0.5", sizes.text === 'text-xs' ? 'text-xs' : 'text-xs')}>
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  "transition-all duration-300",
                  orientation === 'horizontal' ? cn('flex-1 mx-2', sizes.line) : cn('w-0.5 my-2 ml-5', size === 'sm' ? 'h-8' : size === 'md' ? 'h-10' : 'h-12'),
                  (isCompleted || (isCurrent && index > 0 && steps[index - 1].status === 'completed')) 
                    ? "bg-green-600" 
                    : "bg-gray-200"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Mini version for compact spaces
export function StepIndicatorMini({
  currentStep,
  totalSteps,
  className
}: {
  currentStep: number
  totalSteps: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <React.Fragment key={index}>
          <div
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              index < currentStep 
                ? "bg-green-600" 
                : index === currentStep 
                ? "bg-blue-600 w-6" 
                : "bg-gray-300"
            )}
          />
          {index < totalSteps - 1 && (
            <div 
              className={cn(
                "h-0.5 w-4 transition-all duration-300",
                index < currentStep ? "bg-green-600" : "bg-gray-300"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}