"use client"

import {
  SearchCombobox,
  type SearchComboboxProps,
} from "@/components/shared/search-combobox"
import { CORRIDOR_CURRENCIES } from "@/lib/mock"

interface CurrencySelectProps
  extends Omit<SearchComboboxProps, "options" | "placeholder" | "searchPlaceholder"> {
  /** Defaults to the corridor-supported currencies. */
  currencies?: string[]
  placeholder?: string
}

/** Type-ahead currency picker. value is the ISO 4217 code. */
export function CurrencySelect({
  currencies = CORRIDOR_CURRENCIES,
  placeholder = "Select currency",
  ...props
}: CurrencySelectProps) {
  return (
    <SearchCombobox
      options={currencies.map((c) => ({ value: c, label: c }))}
      placeholder={placeholder}
      searchPlaceholder="Search currencies"
      emptyText="No currencies found"
      {...props}
    />
  )
}
