"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * Label-above-the-box field used across the Crypto screens. The payment
 * screens use the inside-label FieldBox; the crypto reference design puts a
 * 14px semibold label above a 56px box, so this is its own primitive rather
 * than a variant bolted onto FieldBox.
 */
export function LabeledField({
  label,
  required,
  error,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-sm leading-[22px] font-semibold text-ink90"
      >
        {label}
        {required && <span className="text-error-red">*</span>}
      </label>
      {children}
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
      {!error && hint && <p className="text-xs leading-5 text-ink40">{hint}</p>}
    </div>
  )
}

const BOX =
  "flex h-14 w-full items-center gap-3 rounded-[8px] border-[0.5px] bg-panel-fill px-4 text-base leading-6 text-ink90 transition-colors outline-none"

export function TextField({
  id,
  value,
  onChange,
  placeholder,
  error,
  maxLength,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
  maxLength?: number
  className?: string
}) {
  return (
    <input
      id={id}
      type="text"
      autoComplete="off"
      spellCheck={false}
      maxLength={maxLength}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error || undefined}
      className={cn(
        BOX,
        "placeholder:text-ink40 focus-visible:border-navy",
        error ? "border-error-red" : "border-field-line",
        className
      )}
    />
  )
}

export interface SelectFieldOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export function SelectField({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  className,
}: {
  id?: string
  value?: string
  onValueChange: (value: string) => void
  options: SelectFieldOption[]
  placeholder?: string
  error?: boolean
  className?: string
}) {
  const selected = options.find((o) => o.value === value)

  return (
    <Select
      value={value ?? null}
      onValueChange={(v) => {
        if (typeof v === "string") onValueChange(v)
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={error || undefined}
        className={cn(
          BOX,
          "!h-14 justify-between focus-visible:ring-0 [&>svg]:hidden",
          error ? "border-error-red" : "border-field-line",
          className
        )}
      >
        <SelectValue>
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {selected ? (
              <>
                {selected.icon}
                <span className="truncate text-base leading-6 text-ink90">
                  {selected.label}
                </span>
              </>
            ) : (
              <span className="truncate text-base leading-6 text-ink40">
                {placeholder}
              </span>
            )}
          </span>
        </SelectValue>
        <ChevronDown className="size-5 shrink-0 text-ink60" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2.5">
              {o.icon}
              <span className="text-sm text-ink">{o.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Selectable card with the radio dot on the right, used for Network and
 * Wallet custody type. Selected state is a 2px ink border, unselected a
 * hairline.
 */
export function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  name,
  className,
}: {
  selected: boolean
  onSelect: () => void
  icon?: React.ReactNode
  title: string
  subtitle?: string
  /** Radio group name for keyboard semantics */
  name: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={title + (subtitle ? " " + subtitle : "")}
      data-group={name}
      onClick={onSelect}
      className={cn(
        "flex h-[68px] flex-1 items-center gap-3 rounded-[10px] bg-white px-4 text-left transition-colors outline-none",
        selected
          ? "border-2 border-ink90 px-[15px]"
          : "border border-field-line hover:border-ink40",
        className
      )}
    >
      {icon}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="truncate text-base leading-6 font-semibold text-ink90">
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-base leading-6 text-ink60">
            {subtitle}
          </span>
        )}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-ink90" : "border-[#c7cad1]"
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-ink90" />}
      </span>
    </button>
  )
}

/** Bordered consent block with the checkbox on the left of the legal text. */
export function ConsentBox({
  checked,
  onCheckedChange,
  error,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex w-full cursor-pointer items-start gap-4 rounded-[10px] border bg-white p-4 transition-colors",
        error ? "border-error-red" : "border-field-line"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          checked ? "border-ink90 bg-ink90" : "border-[#c7cad1] bg-white"
        )}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="size-3 text-white" aria-hidden="true">
            <path
              d="M3 8.5l3.2 3.2L13 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-[22px] text-ink90">
        {children}
      </span>
    </label>
  )
}
