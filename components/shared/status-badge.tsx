import { cn } from "@/lib/utils"
import type { TaskStatus } from "@/lib/mock"

const STYLES: Record<TaskStatus, string> = {
  Successful: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
}

/** A1 status vocabulary only: Successful | Failed | Pending. */
export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[status],
        className
      )}
    >
      {status}
    </span>
  )
}
