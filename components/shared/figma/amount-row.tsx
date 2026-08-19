"use client"

import * as React from "react"

import { decimalsFor, formatNumber } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface AmountRowProps {
  /** ISO code chip on the left. "—", "" or undefined render no chip (empty state). */
  currency: string
  /** RAW numeric string ("12500.5", "" when empty) — same contract as CurrencyAmountInput */
  value: string
  onChange?: (value: string) => void
  /** Optional 14px line above the box ("You Send" / "Recipient Receives") */
  label?: string
  /** Gray #f7f8fa display row (Recipient Receives). Value is formatted, not editable. */
  readOnly?: boolean
  error?: string
  disabled?: boolean
  placeholder?: string
  id?: string
  className?: string
}

/**
 * The big amount row per Figma "input/amount" (nodes 7272:113297 editable,
 * 7272:113317 readonly): bordered 0.5px rgba(0,9,50,0.12) radius-8 box, a
 * generous 72px tall, currency ISO chip 16px/24 semibold ink60 baseline-aligned
 * to the 36px/44 semibold ink90 value. Readonly variant fills #f7f8fa. When no
 * currency is known yet (empty form) the chip is omitted and the value shows a
 * plain "0" — never a dash. Editable formats thousands + 2dp on blur (JPY 0dp),
 * raw digits while focused; `Number(value)` to read.
 */
export function AmountRow({
  currency,
  value,
  onChange,
  label,
  readOnly,
  error,
  disabled,
  placeholder = "0",
  id,
  className,
}: AmountRowProps) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  const [focused, setFocused] = React.useState(false)

  const showCcy = !!currency && currency !== "—"
  const dp = decimalsFor(showCcy ? currency : "USD")
  const pattern = React.useMemo(
    () => new RegExp(dp === 0 ? "^\\d*$" : `^\\d*(\\.\\d{0,${dp}})?$`),
    [dp]
  )

  const isEmpty = value === "" || Number.isNaN(Number(value))
  const display =
    focused || isEmpty ? value : formatNumber(Number(value), currency)

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {label && (
        <label
          htmlFor={readOnly ? undefined : inputId}
          className="text-sm leading-[22px] text-ink90"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex h-14 w-full items-center rounded-[8px] border-[0.5px] px-4",
          error ? "border-error-red" : "border-field-line",
          readOnly ? "bg-panel-fill" : "bg-white"
        )}
      >
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          {showCcy && (
            <span className="text-base leading-6 font-semibold text-ink60 uppercase">
              {currency}
            </span>
          )}
          {readOnly ? (
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-[36px] leading-[44px] font-semibold tabular-nums",
                isEmpty ? "text-ink40" : "text-ink90"
              )}
            >
              {isEmpty ? "0" : display}
            </p>
          ) : (
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              disabled={disabled}
              placeholder={placeholder}
              value={display}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "")
                if (raw === "" || pattern.test(raw)) onChange?.(raw)
              }}
              className="w-full min-w-0 flex-1 bg-transparent text-[36px] leading-[44px] font-semibold text-ink90 outline-none tabular-nums placeholder:text-ink40 disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
    </div>
  )
}
