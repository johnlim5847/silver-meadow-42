"use client"

import * as React from "react"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMoney, WALLETS, type Wallet } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface AccountSelectProps {
  /** Wallet id, e.g. "8296310892-USD" (see WALLETS in lib/mock) */
  value?: string
  onChange: (walletId: string) => void
  /** Defaults to every wallet. Pass a filtered list to constrain choices. */
  wallets?: Wallet[]
  /** Convenience: hide one wallet id (e.g. the already-chosen source) */
  excludeId?: string
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  id?: string
  className?: string
}

/** Account + currency wallet picker. Every option shows name, number, currency and balance with ISO code. */
export function AccountSelect({
  value,
  onChange,
  wallets = WALLETS,
  excludeId,
  label,
  placeholder = "Select account",
  error,
  disabled,
  id,
  className,
}: AccountSelectProps) {
  const reactId = React.useId()
  const triggerId = id ?? reactId
  const options = excludeId
    ? wallets.filter((w) => w.id !== excludeId)
    : wallets
  const selected = options.find((w) => w.id === value)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={triggerId}>{label}</Label>}
      <Select
        value={value ?? null}
        onValueChange={(v) => {
          if (typeof v === "string") onChange(v)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          className="h-11 w-full"
        >
          <SelectValue>
            {selected ? (
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-ink">
                    {selected.accountName} · {selected.currency}
                  </span>
                  <span className="text-xs text-muted-ink">
                    {selected.accountNumber}
                  </span>
                </span>
                <span className="text-xs text-secondary-ink tabular-nums">
                  {formatMoney(selected.balance, selected.currency)}
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-ink">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((w) => (
            <SelectItem key={w.id} value={w.id}>
              <span className="flex w-full items-center justify-between gap-6">
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium text-ink">
                    {w.accountName} · {w.currency}
                  </span>
                  <span className="text-xs text-muted-ink">
                    {w.accountNumber}
                  </span>
                </span>
                <span className="text-xs text-secondary-ink tabular-nums">
                  {formatMoney(w.balance, w.currency)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
