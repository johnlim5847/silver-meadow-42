import * as React from "react"
import { Inbox, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  /** Defaults to "No records" */
  title?: string
  hint?: string
  className?: string
  /** Optional actions (e.g. a button) rendered under the hint */
  children?: React.ReactNode
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "No records",
  hint,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-soft">
        <Icon className="size-6 text-muted-ink" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-base font-semibold text-heading">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-ink">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
