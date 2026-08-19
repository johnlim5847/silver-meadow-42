import * as React from "react"

import { cn } from "@/lib/utils"

interface MetaLineProps {
  /** Plain label, rendered as "Label: " */
  label: string
  /** Bold value (Figma: 14px semibold ink90), e.g. "Han Meimei" or "4,000.00 USD" */
  value: React.ReactNode
  className?: string
}

/**
 * The "Sender Name: Han Meimei" / "Available Balance: 4,000.00 USD" line under
 * a field (Figma node 7272:113270): 14px/22, label regular ink90, value
 * semibold ink90.
 */
export function MetaLine({ label, value, className }: MetaLineProps) {
  return (
    <p className={cn("text-sm leading-[22px] text-ink90", className)}>
      {label}: <span className="font-semibold">{value}</span>
    </p>
  )
}
