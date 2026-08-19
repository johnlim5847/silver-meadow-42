"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SearchComboboxOption {
  value: string
  label: string
  /** Optional right-aligned hint (e.g. the code) */
  hint?: string
}

export interface SearchComboboxProps {
  options: SearchComboboxOption[]
  value?: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
  id?: string
  className?: string
}

/**
 * Generic type-ahead combobox (Popover + Command). CountrySelect,
 * CurrencySelect and PurposeSelect are thin wrappers over this.
 */
export function SearchCombobox({
  options,
  value,
  onChange,
  label,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyText = "No matches",
  error,
  disabled,
  id,
  className,
}: SearchComboboxProps) {
  const reactId = React.useId()
  const triggerId = id ?? reactId
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label htmlFor={triggerId}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              id={triggerId}
              aria-invalid={error ? true : undefined}
              className={cn(
                "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                error ? "border-destructive" : "border-input"
              )}
            />
          }
        >
          <span
            className={cn(
              "truncate text-left",
              selected ? "text-ink" : "text-muted-ink"
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-ink" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--anchor-width) min-w-64 p-0"
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-64">
              <CommandEmpty>{emptyText}</CommandEmpty>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value)
                    setOpen(false)
                  }}
                >
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="text-xs text-muted-ink">{o.hint}</span>
                  )}
                  {o.value === value && (
                    <Check className="size-4 text-navy" />
                  )}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
