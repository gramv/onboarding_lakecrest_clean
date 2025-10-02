import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  animated?: boolean
  striped?: boolean
  className?: string
  showMilestones?: boolean
  milestones?: number[]
}

const sizeClasses = {
  sm: {
    height: "h-2",
    text: "text-xs",
    milestone: "h-3 w-3"
  },
  md: {
    height: "h-3",
    text: "text-sm",
    milestone: "h-4 w-4"
  },
  lg: {
    height: "h-4",
    text: "text-base",
    milestone: "h-5 w-5"
  }
}

const variantClasses = {
  default: "bg-blue-600",
  success: "bg-green-600",
  warning: "bg-amber-500",
  danger: "bg-red-600"
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  variant = 'default',
  animated = true,
  striped = false,
  className,
  showMilestones = false,
  milestones = [25, 50, 75, 100]
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const sizes = sizeClasses[size]
  const variantClass = variantClasses[variant]
  
  return (
    <div className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={cn("font-medium text-gray-700", sizes.text)}>
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={cn("font-medium text-gray-600", sizes.text)}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        {/* Background */}
        <div className={cn(
          "w-full bg-gray-200 rounded-full overflow-hidden",
          sizes.height
        )}>
          {/* Progress Fill */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
              variantClass,
              animated && "transition-all duration-1000",
              className
            )}
            style={{ width: `${percentage}%` }}
          >
            {/* Stripes */}
            {striped && (
              <div className="absolute inset-0 opacity-20">
                <div className="h-full w-full bg-stripes animate-stripes" />
              </div>
            )}
            
            {/* Glow Effect */}
            {animated && percentage > 0 && percentage < 100 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
        
        {/* Milestones */}
        {showMilestones && (
          <div className="absolute inset-0 flex items-center">
            {milestones.map((milestone) => {
              const milestonePercentage = (milestone / max) * 100
              const isPassed = percentage >= milestonePercentage
              
              return (
                <div
                  key={milestone}
                  className="absolute flex items-center justify-center"
                  style={{ left: `${milestonePercentage}%`, transform: 'translateX(-50%)' }}
                >
                  <div className={cn(
                    "rounded-full bg-white border-2 transition-all duration-300",
                    sizes.milestone,
                    isPassed ? "border-green-600 bg-green-600" : "border-gray-300"
                  )}>
                    {isPassed && (
                      <Check className="h-full w-full text-white p-0.5" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Segmented Progress Bar for multi-step processes
export function SegmentedProgressBar({
  segments,
  currentSegment,
  size = 'md',
  className
}: {
  segments: Array<{ id: string; label: string; value?: number }>
  currentSegment: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = sizeClasses[size]
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-1">
        {segments.map((segment, index) => {
          const isActive = index === currentSegment
          const isCompleted = index < currentSegment
          const value = segment.value ?? (isCompleted ? 100 : isActive ? 50 : 0)
          
          return (
            <div key={segment.id} className="flex-1">
              <div className="mb-2">
                <p className={cn(
                  "font-medium truncate",
                  sizes.text,
                  isActive && "text-blue-600",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-gray-400"
                )}>
                  {segment.label}
                </p>
              </div>
              <div className={cn(
                "w-full bg-gray-200 rounded-full overflow-hidden",
                sizes.height
              )}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted && "bg-green-600",
                    isActive && "bg-blue-600",
                    !isActive && !isCompleted && "bg-gray-300"
                  )}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Add stripe animation styles
const stripeStyles = `
  @keyframes stripes {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 40px 0;
    }
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .bg-stripes {
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, .15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, .15) 50%,
      rgba(255, 255, 255, .15) 75%,
      transparent 75%,
      transparent
    );
    background-size: 40px 40px;
  }
  
  .animate-stripes {
    animation: stripes 1s linear infinite;
  }
  
  .animate-shimmer {
    animation: shimmer 2s ease-in-out infinite;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = stripeStyles
  document.head.appendChild(styleSheet)
}