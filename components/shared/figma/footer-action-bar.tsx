import * as React from "react"

import { cn } from "@/lib/utils"

interface FooterActionBarProps {
  /** Left slot — usually <Button variant="secondary" className="min-w-20">Back</Button> */
  left?: React.ReactNode
  /** Right group — gray pills + navy primary, e.g. Save as Template / Save Draft / Next */
  children?: React.ReactNode
  className?: string
}

/**
 * The pinned bottom action bar per Figma node 7272:113226: 58px white bar
 * spanning the main area (right of the 268px sidebar), fixed at the viewport
 * bottom, shadow 0 3px 16px 2px rgba(0,0,0,0.05), 48px side padding, 36px pill
 * buttons with 8px gaps. Back/Next are 80px wide in the mockup — pass
 * className="min-w-20" on those buttons. Screens rendering this add pb-[144px]
 * to their PageShell className so content clears the bar.
 */
export function FooterActionBar({ left, children, className }: FooterActionBarProps) {
  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 left-[268px] z-30 h-[58px] bg-white shadow-[0px_3px_16px_2px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className="flex h-full items-center justify-between gap-4 px-12">
        <div className="flex items-center gap-2">{left}</div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  )
}
