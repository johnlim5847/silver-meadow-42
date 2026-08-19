"use client"

import * as React from "react"
import { CalendarDays, ChevronDown } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FieldBoxOption {
  value: string
  label: string
  /** Filled-state display when it should differ from the dropdown row (e.g. account number only, with the currency in a sibling box). Falls back to `label`. */
  displayLabel?: string
  /** Muted right-aligned hint in the dropdown row */
  hint?: string
}

type NativeButtonProps = Omit<
  React.ComponentProps<"button">,
  | "value"
  | "onChange"
  | "children"
  | "className"
  | "id"
  | "disabled"
  | "onClick"
>

export interface FieldBoxProps extends NativeButtonProps {
  /** Field label. Floats to 12px on top when the field has a value, renders as the 16px placeholder when empty. */
  label: string
  /** Red asterisk after the label (Figma #dd494b) */
  required?: boolean
  variant?: "input" | "select" | "readonly" | "date"
  /** Current value. For `select` this is the option value; the option label is displayed. */
  value?: string
  /** Extra placeholder under the floated label while typing (input variant only) */
  placeholder?: string
  /** input variant */
  onChange?: (value: string) => void
  /** select variant */
  options?: FieldBoxOption[]
  /** select variant */
  onValueChange?: (value: string) => void
  /** Gray #f7f8fa fill. Defaults true for `readonly`, false otherwise. */
  filled?: boolean
  /** readonly variant: render the chevron anyway (Figma interbank gray selects) */
  chevron?: boolean
  error?: string
  /** 12px ink40 helper line under the box */
  hint?: string
  disabled?: boolean
  /** date variant (and generic composition): click handler for the whole box */
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  id?: string
  className?: string
}

/**
 * The inside-label field box per Figma "Basic Input" (node 7272:113259):
 * 56px tall, radius 8, border 0.5px rgba(0,9,50,0.12), px-16. Filled state
 * shows the label at 12px/20 ink40 above the 16px/24 ink90 value; empty state
 * shows the label at 16px/24 ink40 as the placeholder. Required renders a red
 * #dd494b asterisk. `select` opens a Base UI select with `options`;
 * `readonly` is a gray display box; `date` is a plain trigger button
 * (compose with Popover/Calendar via `render={<FieldBox variant="date" …/>}`).
 */
export function FieldBox({
  label,
  required,
  variant = "input",
  value,
  placeholder,
  onChange,
  options = [],
  onValueChange,
  filled,
  chevron,
  error,
  hint,
  disabled,
  onClick,
  id,
  className,
  ...rest
}: FieldBoxProps) {
  const [focused, setFocused] = React.useState(false)
  const reactId = React.useId()
  const inputId = id ?? reactId

  const hasValue = value != null && value !== ""
  const isFilled = filled ?? variant === "readonly"

  // `!h-14` (56px, the Figma "Basic Input" height) is important because the
  // Base UI SelectTrigger ships `data-[size=default]:h-8` which otherwise wins
  // by specificity and collapses selects to 32px.
  const frame = cn(
    "flex !h-14 w-full items-center gap-4 rounded-[8px] border-[0.5px] px-4 text-left transition-colors",
    error ? "border-error-red" : "border-field-line",
    isFilled ? "bg-panel-fill" : "bg-white",
    disabled && "opacity-50"
  )

  const labelSmall = (
    <span className="flex items-center gap-1 text-xs leading-5 whitespace-nowrap text-ink40">
      {label}
      {required && <span className="text-error-red">*</span>}
    </span>
  )
  const labelBig = (
    <span className="pointer-events-none flex items-center gap-1 truncate text-base leading-6 text-ink40">
      {label}
      {required && <span className="text-error-red">*</span>}
    </span>
  )

  let box: React.ReactNode

  if (variant === "select") {
    const selected = options.find((o) => o.value === value)
    box = (
      <Select
        value={value ?? null}
        onValueChange={(v) => {
          if (typeof v === "string") onValueChange?.(v)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={cn(
            frame,
            "justify-between focus-visible:ring-0 [&_svg]:text-ink60 [&_svg:not([class*='size-'])]:size-5"
          )}
        >
          <SelectValue>
            <span className="flex min-w-0 flex-1 flex-col items-start">
              {hasValue ? (
                <>
                  {labelSmall}
                  <span className="w-full truncate text-base leading-6 text-ink90">
                    {selected?.displayLabel ?? selected?.label ?? value}
                  </span>
                </>
              ) : (
                labelBig
              )}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex w-full items-center justify-between gap-6">
                <span className="text-sm text-ink">{o.label}</span>
                {o.hint && (
                  <span className="text-xs text-muted-ink">{o.hint}</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else if (variant === "readonly") {
    box = (
      <div className={frame}>
        <span className="flex min-w-0 flex-1 flex-col">
          {hasValue ? (
            <>
              {labelSmall}
              <span
                className={cn(
                  "w-full truncate text-base leading-6",
                  isFilled ? "text-ink90" : "text-ink60"
                )}
              >
                {value}
              </span>
            </>
          ) : (
            labelBig
          )}
        </span>
        {chevron && <ChevronDown className="size-5 shrink-0 text-ink60" />}
      </div>
    )
  } else if (variant === "date") {
    box = (
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={onClick}
        className={cn(frame, "cursor-pointer outline-none")}
        {...rest}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          {hasValue ? (
            <>
              {labelSmall}
              <span className="w-full truncate text-base leading-6 text-ink90">
                {value}
              </span>
            </>
          ) : (
            labelBig
          )}
        </span>
        <CalendarDays className="size-5 shrink-0 text-ink40" strokeWidth={1.75} />
      </button>
    )
  } else {
    const floated = focused || hasValue
    box = (
      <label className={cn(frame, "cursor-text")} htmlFor={inputId}>
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          {floated ? labelSmall : labelBig}
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled}
            placeholder={floated ? placeholder : undefined}
            value={value ?? ""}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onChange?.(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={cn(
              "w-full min-w-0 bg-transparent text-base leading-6 text-ink90 outline-none placeholder:text-ink40",
              !floated && "h-0 opacity-0"
            )}
          />
        </span>
      </label>
    )
  }

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      {box}
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
      {!error && hint && <p className="text-xs leading-5 text-ink40">{hint}</p>}
    </div>
  )
}
