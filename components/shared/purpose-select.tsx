"use client"

import {
  SearchCombobox,
  type SearchComboboxProps,
} from "@/components/shared/search-combobox"
import { getPurposeCodes, type Rail } from "@/lib/mock"

interface PurposeSelectProps
  extends Omit<SearchComboboxProps, "options" | "placeholder" | "searchPlaceholder"> {
  /** Purpose-code set is rail-driven: LOCAL and BOOK share the corporate set, SWIFT has its own. */
  rail: Rail
  placeholder?: string
}

/** Type-ahead purpose-of-payment picker. value is the purpose code, options show corporate labels only. */
export function PurposeSelect({
  rail,
  placeholder = "Select purpose of payment",
  ...props
}: PurposeSelectProps) {
  return (
    <SearchCombobox
      options={getPurposeCodes(rail).map((p) => ({
        value: p.code,
        label: p.label,
      }))}
      placeholder={placeholder}
      searchPlaceholder="Search purposes"
      emptyText="No purposes found"
      {...props}
    />
  )
}
