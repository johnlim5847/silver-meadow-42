"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { cn } from "@/lib/utils"

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Centered modal title, e.g. "Select a Beneficiary" */
  title: string
  /** Filter inputs row(s), rendered inside the gray panel. Use SearchModalInput for the fields. */
  filters?: React.ReactNode
  onSearch?: () => void
  searchLabel?: string
  /** Results area — usually a Table under the "Search Results" heading */
  children: React.ReactNode
  resultsLabel?: string
  /** "{n} records" line bottom-left */
  recordCount?: number
  /** 1-based current page; pagination renders only when pageCount is set */
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  onConfirm?: () => void
  confirmLabel?: string
  confirmDisabled?: boolean
  className?: string
}

/**
 * Select-a-Beneficiary modal skeleton per the interbank mockup (reference
 * screenshot; no Figma node provided): centered white card ~1146px wide,
 * radius 16, centered title, gray filter panel with a secondary Search button,
 * "Search Results" heading over the results table, records count +
 * pagination row, navy 44px Confirm bottom-right, close X top-right.
 */
export function SearchModal({
  open,
  onOpenChange,
  title,
  filters,
  onSearch,
  searchLabel = "Search",
  children,
  resultsLabel = "Search Results",
  recordCount,
  page = 1,
  pageCount,
  onPageChange,
  onConfirm,
  confirmLabel = "Confirm",
  confirmDisabled,
  className,
}: SearchModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "block w-[calc(100vw-96px)] max-w-[1146px] gap-0 rounded-[16px] bg-white p-10 ring-0 shadow-[0px_16px_48px_0px_rgba(0,0,0,0.12)] sm:max-w-[1146px]",
          className
        )}
      >
        <DialogTitle className="text-center text-xl leading-[26px] font-semibold text-ink90">
          {title}
        </DialogTitle>
        {filters && (
          <GrayPanel className="mt-8 flex flex-col gap-4">
            {filters}
            <div className="flex justify-end">
              <Button variant="secondary" className="min-w-20" onClick={onSearch}>
                {searchLabel}
              </Button>
            </div>
          </GrayPanel>
        )}
        <h3 className="mt-8 text-base leading-6 font-semibold text-ink90">
          {resultsLabel}
        </h3>
        <div className="mt-4">{children}</div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-xs leading-5 text-ink60">
            {recordCount != null ? `${recordCount} records` : ""}
          </span>
          {pageCount != null && pageCount > 1 && (
            <ModalPagination
              page={page}
              pageCount={pageCount}
              onPageChange={onPageChange}
            />
          )}
        </div>
        {onConfirm && (
          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              className="min-w-[120px]"
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ModalPagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange?: (page: number) => void
}) {
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1)
  const pill =
    "flex size-[26px] items-center justify-center rounded-[6px] text-xs leading-5 transition-colors"
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        className={cn(pill, "text-ink60 disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          onClick={() => onPageChange?.(p)}
          className={cn(
            pill,
            p === page
              ? "bg-navy text-white"
              : "border-[0.5px] border-field-line bg-white text-ink90 hover:bg-panel-fill"
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
        className={cn(pill, "text-ink60 disabled:opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

interface SearchModalInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  className?: string
  id?: string
}

/** White filter input inside the modal's gray panel: 44px, radius 8, 14px text, ink40 placeholder. */
export function SearchModalInput({
  placeholder,
  value,
  onChange,
  className,
  id,
}: SearchModalInputProps) {
  return (
    <input
      id={id}
      type="text"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full min-w-0 rounded-[8px] border-[0.5px] border-field-line bg-white px-4 text-sm leading-[22px] text-ink90 outline-none placeholder:text-ink40 focus:border-navy",
        className
      )}
    />
  )
}
