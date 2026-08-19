import * as React from "react"

import { cn } from "@/lib/utils"

export interface SummaryRow {
  label: string
  value: React.ReactNode
  /** Renders the row emphasized (semibold, separated by a top border) — use for total debit */
  emphasize?: boolean
}

interface PreviewSummaryProps {
  title?: string
  rows: SummaryRow[]
  className?: string
}

/**
 * Read-back card for the Preview step: from, to, amount, rate, fee, total
 * debit, purpose, reference — a proper summary, not a greyed-out form.
 */
export function PreviewSummary({ title, rows, className }: PreviewSummaryProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white p-6",
        className
      )}
    >
      {title && (
        <h3 className="mb-4 text-xl leading-[26px] font-semibold text-heading">
          {title}
        </h3>
      )}
      <dl className="flex flex-col">
        {rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className={cn(
              "flex items-baseline justify-between gap-6 py-2.5",
              row.emphasize && "mt-1.5 border-t border-line pt-4"
            )}
          >
            <dt className="text-sm text-muted-ink">{row.label}</dt>
            <dd
              className={cn(
                "text-right text-sm text-ink",
                row.emphasize ? "text-base font-semibold text-heading" : "font-medium"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
