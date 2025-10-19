import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        // Mobile-first sizing: larger on mobile, smaller on desktop
        "h-6 w-6 sm:h-5 sm:w-5 rounded-full border-2 border-zinc-300 text-zinc-900 shadow-sm transition-all",
        // Minimum touch target for mobile (44px as per Apple HIG)
        "min-h-[44px] min-w-[44px] sm:min-h-[20px] sm:min-w-[20px]",
        // Better mobile interaction states
        "hover:border-zinc-400 active:scale-95 active:bg-blue-50",
        // Focus states
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Checked state
        "data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-50",
        // Dark mode
        "dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus-visible:ring-zinc-300 dark:data-[state=checked]:border-blue-500 dark:active:bg-blue-900",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3 w-3 sm:h-2.5 sm:w-2.5 fill-blue-600 dark:fill-blue-500" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export { RadioGroup, RadioGroupItem }
