"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        data-slot="progress"
        className={cn(
          "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
          className
        )}
        {...props}
      >
        <div
          data-slot="progress-indicator"
          className="bg-primary h-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
