"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatMoney, type FeeResult } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface FeeLineProps {
  fee: FeeResult
  /** Defaults to "Transfer fee" */
  label?: string
  className?: string
}

/** Computed fee row with a category badge; the tooltip explains the PFX-18 rule that applied. */
export function FeeLine({ fee, label = "Transfer fee", className }: FeeLineProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="text-sm text-muted-ink">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink">
          {formatMoney(fee.amount, fee.currency)}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="inline-flex cursor-default items-center rounded-full border border-line bg-soft px-2 py-0.5 text-[11px] font-medium text-secondary-ink" />
            }
          >
            Category {fee.category}
          </TooltipTrigger>
          <TooltipContent className="max-w-64">{fee.ruleText}</TooltipContent>
        </Tooltip>
      </span>
    </div>
  )
}
