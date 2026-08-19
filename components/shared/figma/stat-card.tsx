import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  /** 14px label above the number ("Total Records") */
  label: string
  /** Big number, 32px semibold */
  value: React.ReactNode
  /** Solid icon-bubble color: blue / green / red per the batch mockup */
  tone?: "info" | "success" | "error"
  className?: string
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  info: "bg-[#0d74ce]",
  success: "bg-[#30a46c]",
  error: "bg-[#e5484d]",
}

/**
 * Stat card from the batch mockup (Total / Processed / Failed records): white
 * card, border rgba(0,0,51,0.06), radius 16, padding 24; solid colored 40px
 * icon bubble with a white glyph, label 14px ink60, value 32px semibold
 * ink90. Colors sized from the batch-input reference screenshot — no Figma
 * node was provided for it.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "info",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-[16px] border border-[rgba(0,0,51,0.06)] bg-white p-6",
        className
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          TONE[tone]
        )}
      >
        <Icon className="size-5 text-white" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-[22px] text-ink60">{label}</span>
        <span className="truncate text-[32px] leading-10 font-semibold text-ink90 tabular-nums">
          {value}
        </span>
      </span>
    </div>
  )
}
