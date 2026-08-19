"use client"

// Local composition for the interbank screen rebuild. Owned by the interbank
// route — everything here skins existing behavior with the FIGMA-PATTERNS
// primitives without touching the frozen shared components.

import * as React from "react"
import { Check, ChevronDown, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { SearchModal, SearchModalInput } from "@/components/shared/figma/search-modal"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  formatNumber,
  formatTimestamp,
  generateTaskId,
  type ExternalFeeResult,
  type FeeResult,
  type MockBeneficiary,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import type { TemplateDraft } from "../own-account/wizard-kit"

// ---------------------------------------------------------------------------
// FieldCombobox — FieldBox-skinned type-ahead select (Popover + Command).
// Preserves the SearchCombobox type-ahead behavior inside the 56px floating-
// label box from the Figma frames.
// ---------------------------------------------------------------------------

export interface FieldComboboxOption {
  value: string
  label: string
  /** Muted right-aligned hint in the dropdown row */
  hint?: string
}

export function FieldCombobox({
  label,
  required,
  options,
  value,
  onChange,
  /** Gray #f7f8fa fill once a value is set (the interbank Transfer Details look) */
  filled,
  disabled,
  error,
  hint,
  searchPlaceholder = "Search",
  emptyText = "No matches",
  id,
  className,
}: {
  label: string
  required?: boolean
  options: FieldComboboxOption[]
  value?: string
  onChange: (value: string) => void
  filled?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  searchPlaceholder?: string
  emptyText?: string
  id?: string
  className?: string
}) {
  const reactId = React.useId()
  const triggerId = id ?? reactId
  const [open, setOpen] = React.useState(false)
  const selected = options.find((o) => o.value === value)
  const hasValue = selected != null

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              id={triggerId}
              aria-invalid={error ? true : undefined}
              className={cn(
                "flex h-14 w-full items-center gap-4 rounded-[8px] border-[0.5px] px-4 text-left transition-colors outline-none",
                error ? "border-error-red" : "border-field-line",
                filled && hasValue ? "bg-panel-fill" : "bg-white",
                disabled && "opacity-50"
              )}
            />
          }
        >
          <span className="flex min-w-0 flex-1 flex-col">
            {hasValue ? (
              <>
                <span className="flex items-center gap-1 text-xs leading-5 whitespace-nowrap text-ink40">
                  {label}
                  {required && <span className="text-error-red">*</span>}
                </span>
                <span className="w-full truncate text-base leading-6 text-ink90">
                  {selected.label}
                </span>
              </>
            ) : (
              <span className="pointer-events-none flex items-center gap-1 truncate text-base leading-6 text-ink40">
                {label}
                {required && <span className="text-error-red">*</span>}
              </span>
            )}
          </span>
          <ChevronDown className="size-5 shrink-0 text-ink60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64 p-0">
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
                  {o.value === value && <Check className="size-4 text-navy" />}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
      {!error && hint && <p className="text-xs leading-5 text-ink40">{hint}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RemittanceBox — the reference textarea per Figma node 7272:113323 (radius 8,
// border 0.5px field-line, px-16 py-12, 0/50 counter top-right). Keeps the
// CounterField behavior: max length, error line, non-blocking amber warning.
// ---------------------------------------------------------------------------

export function RemittanceBox({
  label,
  value,
  onChange,
  onBlur,
  max = 50,
  error,
  warning,
  readOnly,
  id,
  className,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  max?: number
  error?: string
  /** Non-blocking amber hint (e.g. duplicate reference) */
  warning?: string
  /** Gray read-back variant for the preview step (floated label + value) */
  readOnly?: boolean
  id?: string
  className?: string
}) {
  const reactId = React.useId()
  const inputId = id ?? reactId

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      {readOnly ? (
        <div className="flex min-h-[84px] w-full flex-col gap-1 rounded-[8px] border-[0.5px] border-field-line bg-panel-fill px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <span className="text-xs leading-5 text-ink40">{label}</span>
            <span className="text-xs leading-5 text-ink40 tabular-nums">
              {value.length}/{max}
            </span>
          </div>
          <p className="min-h-6 text-base leading-6 break-words text-ink90">
            {value}
          </p>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "relative flex min-h-[84px] w-full cursor-text flex-col rounded-[8px] border-[0.5px] bg-white px-4 py-3",
            error ? "border-error-red" : "border-field-line"
          )}
        >
          <span className="absolute top-3 right-4 text-xs leading-5 text-ink40 tabular-nums">
            {value.length}/{max}
          </span>
          <textarea
            id={inputId}
            rows={2}
            maxLength={max}
            placeholder={label}
            value={value}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange?.(e.target.value.slice(0, max))}
            onBlur={onBlur}
            className="w-full flex-1 resize-none bg-transparent pr-14 text-base leading-6 text-ink90 outline-none placeholder:text-ink40"
          />
        </label>
      )}
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
      {!error && warning && (
        <p className="text-xs leading-5 text-amber-600">{warning}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FeeCategoryHint — keeps the PFX-18 category + rule-text tooltip from the old
// FeeLine, restyled as the 12px hint line under the mockup's fee box.
// ---------------------------------------------------------------------------

export function FeeCategoryHint({ fee, className }: { fee: FeeResult; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "self-start text-xs leading-5 text-ink40 underline-offset-2 hover:underline",
              className
            )}
          />
        }
      >
        Category {fee.category}
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{fee.ruleText}</TooltipContent>
    </Tooltip>
  )
}

/** Example-value hint for the SWIFT payout/external fee (hasExternalFee). */
export function ExternalFeeHint({
  fee,
  className,
}: {
  fee: ExternalFeeResult
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "self-start text-xs leading-5 text-ink40 underline-offset-2 hover:underline",
              className
            )}
          />
        }
      >
        Example fee
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{fee.ruleText}</TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// SaveAsTemplateButton — same behavior as wizard-kit's SaveTemplateButton
// (name-prompt dialog → store.addTemplate → toast), restyled as the mockup's
// secondary footer pill so the FooterActionBar matches the frames.
// ---------------------------------------------------------------------------

export function SaveAsTemplateButton({
  getTemplate,
  missingMessage = "Select a source account first",
}: {
  /** Return null while the form is not far enough along to save. */
  getTemplate: () => TemplateDraft | null
  missingMessage?: string
}) {
  const addTemplate = useAppStore((s) => s.addTemplate)
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")

  const openDialog = () => {
    if (!getTemplate()) {
      toast.error(missingMessage)
      return
    }
    setName("")
    setOpen(true)
  }

  const save = () => {
    const draft = getTemplate()
    if (!draft || !name.trim()) return
    addTemplate({
      ...draft,
      id: `tpl-${generateTaskId().slice(0, 12)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    })
    toast.success("Template saved")
    setOpen(false)
  }

  return (
    <>
      <Button variant="secondary" onClick={openDialog}>
        Save as Template
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Name this template to reuse the payment details later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="interbank-template-name">Template Name</Label>
            <Input
              id="interbank-template-name"
              value={name}
              maxLength={60}
              placeholder="e.g. Monthly supplier payment"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!name.trim()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// BeneficiarySearchModal — SearchModal wiring per the interbank mockup:
// Account No./IBAN + Name filters, results table (Type, Account No., Currency,
// Name, SWIFT Code), record count, pagination at 5, Confirm fills the form.
// ---------------------------------------------------------------------------

const MODAL_PAGE_SIZE = 5

export function BeneficiarySearchModal({
  open,
  onOpenChange,
  beneficiaries,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  beneficiaries: MockBeneficiary[]
  onConfirm: (beneficiary: MockBeneficiary) => void
}) {
  const [pendingAccount, setPendingAccount] = React.useState("")
  const [pendingName, setPendingName] = React.useState("")
  const [query, setQuery] = React.useState({ account: "", name: "" })
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string>()

  // Fresh search state each time the modal opens.
  React.useEffect(() => {
    if (!open) return
    setPendingAccount("")
    setPendingName("")
    setQuery({ account: "", name: "" })
    setPage(1)
    setSelectedId(undefined)
  }, [open])

  const filtered = beneficiaries.filter((b) => {
    const acct = query.account.trim().toLowerCase()
    const name = query.name.trim().toLowerCase()
    if (acct && !b.accountNumber.toLowerCase().includes(acct)) return false
    if (name && !b.name.toLowerCase().includes(name)) return false
    return true
  })

  const pageCount = Math.max(1, Math.ceil(filtered.length / MODAL_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const rows = filtered.slice(
    (safePage - 1) * MODAL_PAGE_SIZE,
    safePage * MODAL_PAGE_SIZE
  )
  const selected = filtered.find((b) => b.id === selectedId)

  const runSearch = () => {
    setQuery({ account: pendingAccount, name: pendingName })
    setPage(1)
    setSelectedId(undefined)
  }

  return (
    <SearchModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select a Beneficiary"
      filters={
        <div className="grid grid-cols-2 gap-4">
          <SearchModalInput
            placeholder="Beneficiary Account No. / IBAN"
            value={pendingAccount}
            onChange={setPendingAccount}
          />
          <SearchModalInput
            placeholder="Beneficiary Name"
            value={pendingName}
            onChange={setPendingName}
          />
        </div>
      }
      onSearch={runSearch}
      recordCount={filtered.length}
      page={safePage}
      pageCount={pageCount}
      onPageChange={setPage}
      onConfirm={() => {
        if (!selected) return
        onConfirm(selected)
        onOpenChange(false)
      }}
      confirmDisabled={!selected}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-field-line hover:bg-transparent">
            <TableHead className="h-[38px] bg-panel-fill px-4 text-xs leading-5 font-medium text-ink90">
              Beneficiary Type
            </TableHead>
            <TableHead className="h-[38px] bg-panel-fill px-4 text-xs leading-5 font-medium text-ink90">
              Beneficiary Account No.
            </TableHead>
            <TableHead className="h-[38px] bg-panel-fill px-4 text-xs leading-5 font-medium text-ink90">
              Currency
            </TableHead>
            <TableHead className="h-[38px] bg-panel-fill px-4 text-xs leading-5 font-medium text-ink90">
              Beneficiary Name
            </TableHead>
            <TableHead className="h-[38px] bg-panel-fill px-4 text-xs leading-5 font-medium text-ink90">
              SWIFT Code
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="border-field-line">
              <TableCell
                colSpan={5}
                className="px-4 py-6 text-center text-xs leading-5 text-ink40"
              >
                No beneficiaries match the search
              </TableCell>
            </TableRow>
          ) : (
            rows.map((b) => {
              const isSelected = b.id === selectedId
              return (
                <TableRow
                  key={b.id}
                  aria-selected={isSelected}
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    "cursor-pointer border-field-line",
                    isSelected && "bg-nav-active hover:bg-nav-active"
                  )}
                >
                  <TableCell className="px-4 py-3 text-xs leading-5 text-ink90">
                    {b.accountType}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs leading-5 text-ink90 tabular-nums">
                    {b.accountNumber}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs leading-5 text-ink90">
                    {b.destinationCurrency}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs leading-5 text-ink90">
                    {b.name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs leading-5 text-ink90">
                    {b.swiftCode ?? "—"}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </SearchModal>
  )
}

// ---------------------------------------------------------------------------
// Saved Transfer Draft tab — demo-only rows, no store or API behind it.
// ---------------------------------------------------------------------------

export interface DemoDraft {
  id: string
  /** Debit account number shown in the Source Account column */
  sourceAccount: string
  /** Wallet id used to prefill the wizard source on Resume */
  walletId: string
  /** Beneficiary name, stacked above the destination account */
  beneficiaryName: string
  /** Beneficiary account number */
  destinationAccount: string
  amount?: number
  currency: string
  /** ISO datetime saved */
  createdAt: string
}

/** Demo rows reusing seeded entities (CapitaLand + Pacific Components). */
export const DEMO_DRAFTS: DemoDraft[] = [
  {
    id: "draft-01",
    sourceAccount: "8296310892",
    walletId: "8296310892-SGD",
    beneficiaryName: "CapitaLand Commercial",
    destinationAccount: "0271884236",
    amount: 8_500,
    currency: "SGD",
    createdAt: "2026-07-22T18:40:00",
  },
  {
    id: "draft-02",
    sourceAccount: "8296310892",
    walletId: "8296310892-USD",
    beneficiaryName: "Pacific Components Inc",
    destinationAccount: "739201845",
    currency: "USD",
    createdAt: "2026-07-21T11:05:00",
  },
]

const DRAFT_HEADERS = [
  "Source Account",
  "Destination Account",
  "Amount",
  "Currency",
  "Created time",
  "Action",
] as const

/**
 * Saved Transfer Draft table per the Figma "2.3.1" frame (intrabank-draft.png):
 * bordered cells, Resume + Delete in the Action column. Same layout the
 * intrabank tab uses, so the two draft tabs read identically. The beneficiary
 * name is stacked above the account in the Destination Account cell because an
 * interbank draft pays an external payee, not an internal account.
 */
export function DraftsTable({
  drafts,
  onResume,
  onDelete,
}: {
  drafts: DemoDraft[]
  onResume: (draft: DemoDraft) => void
  onDelete: (id: string) => void
}) {
  const headerCell =
    "border-[0.5px] border-[#d5d9e0] bg-panel-fill px-3 py-2.5 text-left text-sm leading-[22px] font-semibold text-ink90"
  const cell =
    "border-[0.5px] border-[#d5d9e0] bg-white px-3 py-2.5 text-sm leading-[22px] text-ink90"
  const action =
    "flex items-center gap-1 text-sm leading-[22px] text-ink90 transition-colors hover:text-navy"

  return (
    <div className="w-full overflow-hidden rounded-[8px] border-[0.5px] border-[#e5e6eb]">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {DRAFT_HEADERS.map((h) => (
              <th
                key={h}
                className={
                  h === "Amount"
                    ? `${headerCell} text-right`
                    : h === "Currency"
                      ? `${headerCell} w-[160px]`
                      : h === "Action"
                        ? `${headerCell} w-[200px]`
                        : headerCell
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drafts.length === 0 && (
            <tr>
              <td
                colSpan={DRAFT_HEADERS.length}
                className={`${cell} py-8 text-center text-ink40`}
              >
                No saved drafts
              </td>
            </tr>
          )}
          {drafts.map((d) => (
            <tr key={d.id}>
              <td className={`${cell} tabular-nums`}>{d.sourceAccount}</td>
              <td className={cell}>
                <span className="flex flex-col">
                  <span>{d.beneficiaryName}</span>
                  <span className="text-xs text-ink40 tabular-nums">
                    {d.destinationAccount}
                  </span>
                </span>
              </td>
              <td className={`${cell} text-right tabular-nums`}>
                {d.amount != null ? formatNumber(d.amount, d.currency) : "—"}
              </td>
              <td className={cell}>{d.currency}</td>
              <td className={`${cell} tabular-nums`}>
                {formatTimestamp(d.createdAt)}
              </td>
              <td className={cell}>
                <span className="flex items-center gap-6">
                  <button
                    type="button"
                    className={action}
                    onClick={() => onResume(d)}
                  >
                    <RotateCcw className="size-4" />
                    Resume
                  </button>
                  <button
                    type="button"
                    className={action}
                    onClick={() => onDelete(d.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ack helpers
// ---------------------------------------------------------------------------

/** "2026-04-22 16:02" — the ack screen's Submitted On format (local time). */
export function formatAckTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
