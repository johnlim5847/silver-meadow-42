"use client"

import * as React from "react"
import { Info, RotateCw } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatRate, getCustomerRate } from "@/lib/mock"
import { cn } from "@/lib/utils"

const QUOTE_TTL_SECONDS = 60

interface RateRowProps {
  sourceCurrency: string
  destinationCurrency: string
  /** Numeric source amount; pass 0 while the amount field is empty (kept for FxQuoteRow drop-in parity) */
  sourceAmount: number
  /**
   * Called on mount and on every refresh (manual or auto at expiry) with the
   * customer rate. Store this for submit — it is the rate the quote showed.
   */
  onQuote?: (quote: { rate: number }) => void
  className?: string
}

/**
 * The indicative-rate row per Figma node 7272:113300. Drop-in replacement for
 * FxQuoteRow (same props, same quote/countdown behavior): 56px bordered row —
 * "Indicative Exchange Rate" 14px semibold + navy info icon left, "1 USD =
 * 1.2767 SGD" + navy refresh icon center, "Valid for N Seconds" right.
 * Render ONLY when source and destination currencies differ; pair with a
 * readonly AmountRow for the recipient-receives amount.
 */
export function RateRow({
  sourceCurrency,
  destinationCurrency,
  sourceAmount: _sourceAmount,
  onQuote,
  className,
}: RateRowProps) {
  const [seconds, setSeconds] = React.useState(QUOTE_TTL_SECONDS)
  const rate = getCustomerRate(sourceCurrency, destinationCurrency)
  // Per the Figma tooltip: BTN-out execution rate is set when DK processes the
  // transaction; every other source sets it at final approval.
  const executionNote =
    sourceCurrency === "BTN"
      ? "This is an indicative rate only. The execution rate (the rate at which your transfer will be processed) is determined at the time when DK processes the transaction."
      : "This is an indicative rate only. The execution rate (the rate at which your transfer will be processed) is determined at the time of final approval."
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

  return (
    <div
      className={cn(
        "flex h-14 w-full items-center justify-between gap-4 rounded-[8px] border-[0.5px] border-field-line bg-white px-4",
        className
      )}
    >
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-sm leading-[22px] font-semibold text-ink90">
          Indicative Exchange Rate
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label="About the indicative rate"
                className="flex items-center justify-center text-navy outline-none"
              />
            }
          >
            <Info className="size-3.5" strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{executionNote}</TooltipContent>
        </Tooltip>
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm leading-[22px] font-semibold text-ink90 tabular-nums">
          1 {sourceCurrency} = {formatRate(rate)} {destinationCurrency}
        </span>
        <button
          type="button"
          aria-label="Refresh rate"
          onClick={refresh}
          className="flex size-5 shrink-0 items-center justify-center text-navy transition-colors hover:text-navy-deep"
        >
          <RotateCw className="size-4" />
        </button>
      </span>
      <span className="shrink-0 text-sm leading-[22px] text-ink90 tabular-nums">
        Valid for {seconds} Seconds
      </span>
    </div>
  )
}
