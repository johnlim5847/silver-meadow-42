"use client"

import * as React from "react"
import { RotateCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatMoney, formatRate, getCustomerRate } from "@/lib/mock"
import { cn } from "@/lib/utils"

const QUOTE_TTL_SECONDS = 60

interface FxQuoteRowProps {
  sourceCurrency: string
  destinationCurrency: string
  /** Numeric source amount; pass 0 while the amount field is empty */
  sourceAmount: number
  /**
   * Called on mount and on every refresh (manual or auto at expiry) with the
   * customer rate. Store this for submit — it is the rate the quote showed.
   */
  onQuote?: (quote: { rate: number }) => void
  className?: string
}

function CountdownRing({ seconds }: { seconds: number }) {
  const r = 8
  const c = 2 * Math.PI * r
  const frac = seconds / QUOTE_TTL_SECONDS
  return (
    <span className="relative inline-flex size-6 items-center justify-center">
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-6 -rotate-90">
        <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2" className="stroke-line" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className={cn(
            "transition-[stroke-dashoffset] duration-1000 ease-linear",
            seconds <= 10 ? "stroke-amber-500" : "stroke-navy"
          )}
        />
      </svg>
      <span className="text-[9px] font-medium text-secondary-ink tabular-nums">
        {seconds}
      </span>
    </span>
  )
}

/**
 * FX quote row: customer rate to 4dp, 60s countdown ring, manual refresh, and
 * the auto-computed recipient-receives amount. Quotes are instant (mock).
 * The quote auto-refreshes when the countdown reaches zero.
 */
export function FxQuoteRow({
  sourceCurrency,
  destinationCurrency,
  sourceAmount,
  onQuote,
  className,
}: FxQuoteRowProps) {
  const [seconds, setSeconds] = React.useState(QUOTE_TTL_SECONDS)
  const rate = getCustomerRate(sourceCurrency, destinationCurrency)
  const onQuoteRef = React.useRef(onQuote)
  onQuoteRef.current = onQuote

  // Emit the quote on mount and whenever the pair changes.
  React.useEffect(() => {
    onQuoteRef.current?.({ rate: getCustomerRate(sourceCurrency, destinationCurrency) })
    setSeconds(QUOTE_TTL_SECONDS)
  }, [sourceCurrency, destinationCurrency])

  // 1s tick; at zero, re-quote (mock: same rate) and restart the window.
  React.useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          onQuoteRef.current?.({
            rate: getCustomerRate(sourceCurrency, destinationCurrency),
          })
          return QUOTE_TTL_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [sourceCurrency, destinationCurrency])

  const refresh = () => {
    onQuoteRef.current?.({ rate })
    setSeconds(QUOTE_TTL_SECONDS)
  }

  const receives = sourceAmount > 0 ? sourceAmount * rate : 0

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-line bg-shell px-4 py-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-ink">Exchange rate</span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink tabular-nums">
            1 {sourceCurrency} = {formatRate(rate)} {destinationCurrency}
          </span>
          <CountdownRing seconds={seconds} />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh rate"
            onClick={refresh}
          >
            <RotateCw />
          </Button>
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-ink">Recipient receives</span>
        <span className="text-sm font-semibold text-heading tabular-nums">
          {receives > 0 ? formatMoney(receives, destinationCurrency) : "—"}
        </span>
      </div>
    </div>
  )
}
