import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface WizardStepsProps {
  /** Defaults to the standard 3-step wizard */
  steps?: string[]
  /** 0-based index of the current step. Advance it at each stage. */
  current: number
  className?: string
}

/** Input → Preview → Submit stepper. The active step is filled navy, completed steps show a check. */
export function WizardSteps({
  steps = ["Input", "Preview", "Submit"],
  current,
  className,
}: WizardStepsProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div
                className={cn("h-px w-8", done || active ? "bg-navy/40" : "bg-line")}
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                  done || active
                    ? "bg-navy text-white"
                    : "border border-line bg-soft text-muted-ink"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active
                    ? "font-medium text-heading"
                    : done
                      ? "text-secondary-ink"
                      : "text-muted-ink"
                )}
              >
                {step}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
