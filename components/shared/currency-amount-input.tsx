"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import { decimalsFor, formatNumber } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface CurrencyAmountInputProps {
  /** ISO currency code shown as the input prefix */
  currency: string
  /** Raw numeric string, e.g. "12500.5" — "" when empty. Parse with Number() when submitting. */
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
  placeholder?: string
  id?: string
  className?: string
}

/**
 * Amount input with an ISO-code prefix. Shows thousands-formatted text when
 * blurred (2dp, JPY 0dp), raw digits while editing. Value round-trips as a raw
 * numeric string.
 */
export function CurrencyAmountInput({
  currency,
  value,
  onChange,
  label,
  error,
  disabled,
  placeholder = "0.00",
  id,
  className,
}: CurrencyAmountInputProps) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  const [focused, setFocused] = React.useState(false)

  const dp = decimalsFor(currency)
  const pattern = React.useMemo(
    () => new RegExp(dp === 0 ? "^\\d*$" : `^\\d*(\\.\\d{0,${dp}})?$`),
    [dp]
  )

  const display =
    focused || value === "" || Number.isNaN(Number(value))
      ? value
      : formatNumber(Number(value), currency)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div
        className={cn(
          "flex h-9 items-center overflow-hidden rounded-lg border bg-white transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error ? "border-destructive" : "border-input"
        )}
      >
        <span className="flex h-full items-center border-r border-line bg-soft px-3 text-sm font-medium text-secondary-ink">
          {currency}
        </span>
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
            if (raw === "" || pattern.test(raw)) onChange(raw)
          }}
          className="h-full w-full min-w-0 flex-1 bg-transparent px-3 text-right text-sm text-ink tabular-nums outline-none placeholder:text-muted-ink disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
