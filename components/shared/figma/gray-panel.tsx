import * as React from "react"

import { cn } from "@/lib/utils"

interface GrayPanelProps {
  className?: string
  children: React.ReactNode
}

/**
 * The light-gray rounded panel from the batch mockup (filter card, Batch
 * Overview, Report Download): #f7f8fa fill, radius 16, padding 24. Sized from
 * the batch-input reference screenshot — no Figma node was provided for it.
 */
export function GrayPanel({ className, children }: GrayPanelProps) {
  return (
    <div className={cn("rounded-[16px] bg-panel-fill p-6", className)}>
      {children}
    </div>
  )
}
