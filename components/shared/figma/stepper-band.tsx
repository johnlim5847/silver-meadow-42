import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface StepperBandProps {
  /** Step labels, default ["Input", "Preview", "Submit"] */
  steps?: string[]
  /** 0-based index of the active step. Steps before it render as completed. */
  current: number
  /**
   * Completed-circle colour. Payment frames use teal; the crypto frames use
   * navy for done and active alike. Defaults to teal so existing screens are
   * untouched.
   */
  tone?: "teal" | "navy"
  /** "lg" is the taller crypto band: 28px circles, more vertical padding. */
  size?: "sm" | "lg"
  className?: string
}

const DEFAULT_STEPS = ["Input", "Preview", "Submit"]

/**
 * Light-blue stepper band per Figma "Steps 步骤条" (nodes 7272:113235 input
 * state, 16:9084 submit state). Band bg rgba(0,143,245,0.1), pt-12 pb-8.
 * Circles 22px: done = teal #369398 with white check, active = navy #113264
 * with white number, todo = rgba(17,50,100,0.2) with ink40 number. Connector
 * halves: navy #113264 once the step left of them is done, else #d5d9e0;
 * outer edges transparent. Labels 14px: done ink90, active semibold navy,
 * todo ink40.
 */
export function StepperBand({
  steps = DEFAULT_STEPS,
  current,
  tone = "teal",
  size = "sm",
  className,
}: StepperBandProps) {
  const large = size === "lg"
  return (
    <div
      className={cn(
        "w-full overflow-hidden bg-stepper-band",
        large ? "pt-6 pb-5" : "pt-3 pb-2",
        className
      )}
    >
      <div
        className={cn(
          "flex w-full items-start justify-center",
          large && "mx-auto max-w-[760px]"
        )}
      >
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        // Connector between step k and k+1 is navy when step k is done.
        const leftLine =
          i === 0 ? "bg-transparent" : i - 1 < current ? "bg-navy" : "bg-stepper-line"
        const rightLine =
          i === steps.length - 1
            ? "bg-transparent"
            : i < current
              ? "bg-navy"
              : "bg-stepper-line"
        return (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full items-center justify-center gap-2">
              <div
                className={cn(
                  "h-px min-w-px flex-1",
                  leftLine
                )}
              />
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full",
                  large ? "size-7" : "size-[22px]",
                  done && (tone === "navy" ? "bg-navy" : "bg-success-teal"),
                  active && "bg-navy",
                  !done && !active && "bg-stepper-idle"
                )}
              >
                {done ? (
                  <Check
                    className={large ? "size-4.5 text-white" : "size-4 text-white"}
                    strokeWidth={2.5}
                  />
                ) : (
                  <span
                    className={cn(
                      "text-sm leading-[22px]",
                      active ? "text-white" : "text-ink40"
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "h-px min-w-px flex-1",
                  rightLine
                )}
              />
            </div>
            <p
              className={cn(
                "w-full truncate text-center text-sm leading-[22px]",
                large && "mt-1",
                done && (tone === "navy" ? "font-semibold text-navy" : "text-ink90"),
                active && "font-semibold text-navy",
                !done && !active && "text-ink40"
              )}
            >
              {label}
            </p>
          </div>
        )
      })}
      </div>
    </div>
  )
}
