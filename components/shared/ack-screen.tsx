"use client"

import * as React from "react"
import Link from "next/link"
import { CircleCheck, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatTimestamp } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface AckScreenProps {
  /** The 32-hex task id returned by submitTask */
  taskId: string
  /** ISO datetime; rendered human, e.g. "23 Jul 2026, 19:12" */
  submittedAt: string
  /** Where "Make another" goes (usually the wizard's own route) */
  makeAnotherHref: string
  /** Defaults to "Payment submitted" */
  title?: string
  /** Defaults to "Your payment request has been submitted for approval." */
  message?: string
  /** Optional extra content (e.g. a small summary recap) rendered above the buttons */
  children?: React.ReactNode
  className?: string
}

/** Submit-step acknowledgment: check, task id with copy, human timestamp, next actions. */
export function AckScreen({
  taskId,
  submittedAt,
  makeAnotherHref,
  title = "Payment submitted",
  message = "Your payment request has been submitted for approval.",
  children,
  className,
}: AckScreenProps) {
  const copy = async () => {
    await navigator.clipboard.writeText(taskId)
    toast.success("Task ID copied")
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50">
        <CircleCheck className="size-8 text-emerald-600" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 text-xl leading-[26px] font-semibold text-heading">
        {title}
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-ink">{message}</p>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-line bg-soft py-1.5 pr-1.5 pl-4">
        <span className="font-mono text-[13px] text-ink">{taskId}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy task ID"
          onClick={copy}
        >
          <Copy />
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-muted-ink">
        Submitted {formatTimestamp(submittedAt)}
      </p>

      {children && <div className="mt-6 w-full max-w-md">{children}</div>}

      <div className="mt-8 flex items-center gap-3">
        <Button render={<Link href="/payments/inquiry" />}>
          View in payment inquiry
        </Button>
        <Button variant="outline" render={<Link href={makeAnotherHref} />}>
          Make another
        </Button>
      </div>
    </div>
  )
}
