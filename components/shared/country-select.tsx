"use client"

import {
  SearchCombobox,
  type SearchComboboxProps,
} from "@/components/shared/search-combobox"
import { COUNTRIES, type Country } from "@/lib/mock"

interface CountrySelectProps
  extends Omit<SearchComboboxProps, "options" | "placeholder" | "searchPlaceholder"> {
  /** Defaults to the full COUNTRIES dataset. Pass getCountriesForCurrency(...) for corridor-driven options. */
  countries?: Country[]
  placeholder?: string
}

/** Type-ahead country picker. value is the ISO alpha-2 code, options show full country names. */
export function CountrySelect({
  countries = COUNTRIES,
  placeholder = "Select country",
  ...props
}: CountrySelectProps) {
  return (
    <SearchCombobox
      options={countries.map((c) => ({ value: c.code, label: c.name }))}
      placeholder={placeholder}
      searchPlaceholder="Search countries"
      emptyText="No countries found"
      {...props}
    />
  )
}
