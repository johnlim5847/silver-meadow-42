"use client"

// Local helpers shared by the three payment wizards (own-account, intrabank,
// interbank). All three routes are owned by the same build slice, so this file
// lives inside them — it is NOT part of the frozen shared contract.

import * as React from "react"
import Link from "next/link"
import { CircleCheck, Copy, Info } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { AmountRow } from "@/components/shared/figma/amount-row"
import { Button } from "@/components/ui/button"
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
  CORRIDOR_CURRENCIES,
  generateTaskId,
  getPurposeCodes,
  type FeeResult,
  type PaymentTask,
  type PaymentTemplate,
  type Wallet,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Template payload minus the fields the save dialog fills in. */
export type TemplateDraft = Omit<PaymentTemplate, "id" | "name" | "createdAt">

/**
 * Allowed destination currencies for a source currency, per PFX-109:
 * same currency always; BTN can send any foreign currency; USD can send any
 * foreign currency excluding BTN. Every other source stays in its own currency.
 * Shared by the intrabank and interbank wizards.
 */
export function allowedDestinationCurrencies(sourceCurrency: string): string[] {
  if (sourceCurrency === "BTN") return CORRIDOR_CURRENCIES
  if (sourceCurrency === "USD") {
    return CORRIDOR_CURRENCIES.filter((c) => c !== "BTN")
  }
  return [sourceCurrency]
}

/** Soft duplicate check for the reference/remittance text against submitted tasks. */
export function isDuplicateReference(
  tasks: PaymentTask[],
  value: string
): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return false
  return tasks.some((t) => t.reference?.toLowerCase() === v)
}

/** "Save as template" ghost button + name-prompt dialog. Calls store.addTemplate. */
export function SaveTemplateButton({
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
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
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

/** Text field with a live character counter (default 50), error and soft-warning lines. */
export function CounterField({
  label,
  value,
  onChange,
  onBlur,
  max = 50,
  error,
  warning,
  placeholder,
  id,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  max?: number
  error?: string
  /** Non-blocking amber hint (e.g. duplicate reference) */
  warning?: string
  placeholder?: string
  id?: string
  className?: string
}) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>{label}</Label>
        <span
          className={cn(
            "text-xs tabular-nums",
            value.length >= max ? "text-amber-600" : "text-muted-ink"
          )}
        >
          {value.length}/{max}
        </span>
      </div>
      <Input
        id={inputId}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        onBlur={onBlur}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && warning && <p className="text-xs text-amber-600">{warning}</p>}
    </div>
  )
}

/** Small muted hint line with an info icon. */
export function HintLine({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs leading-relaxed text-muted-ink",
        className
      )}
    >
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** Read-only label + value chip (e.g. resolved payout method, estimated delivery). */
export function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-soft px-3 py-1 text-xs">
      <span className="text-muted-ink">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </span>
  )
}

/** Sub-section heading inside a wizard card. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-heading">{children}</h3>
}

// ---------------------------------------------------------------------------
// Figma-mockup helpers (pixel-fidelity wave). Shared by the own-account and
// intrabank rebuilds; interbank may import them too. Additive exports only —
// nothing above this line changed signature.
// ---------------------------------------------------------------------------

/** LOCAL/BOOK corporate purpose codes as FieldBox select options. */
export const BOOK_PURPOSE_OPTIONS = getPurposeCodes("BOOK").map((p) => ({
  value: p.code,
  label: p.label,
}))

/**
 * Wallets → FieldBox select options. The dropdown row shows `account-CCY` so the
 * MCA currencies are distinguishable; the filled field shows the account number
 * only, because the currency sits in the sibling Currency box (per the Figma
 * frames). No balance in the row — it renders on the Available Balance line
 * under the field.
 */
export function walletOptions(wallets: Wallet[]) {
  return wallets.map((w) => ({
    value: w.id,
    label: `${w.accountNumber}-${w.currency}`,
    displayLabel: w.accountNumber,
    hint: w.accountName,
  }))
}

/** Readonly-preview label for a wallet: account number only. The currency shows in the sibling Currency box. */
export function walletLabel(w: Wallet): string {
  return w.accountNumber
}

/**
 * Paragraph input per Figma node 7272:113323 ("Reference"): radius 8, border
 * 0.5px field-line, px-16 py-12, floating label (16px ink40 placeholder →
 * 12px floated) with the `n/max` counter pinned top-right. Blur + Next
 * validation feeds `error`; the duplicate-reference soft check feeds `warning`.
 */
export function ReferenceTextarea({
  label,
  value,
  onChange,
  onBlur,
  max = 50,
  required,
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
  required?: boolean
  error?: string
  /** Non-blocking amber hint (e.g. duplicate reference) */
  warning?: string
  readOnly?: boolean
  id?: string
  className?: string
}) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  const [focused, setFocused] = React.useState(false)
  const floated = focused || value !== ""

  return (
    <div className={cn("flex w-full flex-col gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-[88px] w-full flex-col gap-1 rounded-[8px] border-[0.5px] bg-white px-4 py-3",
          error ? "border-error-red" : "border-field-line",
          readOnly ? "cursor-default" : "cursor-text"
        )}
      >
        <span className="flex items-start justify-between gap-4">
          <span
            className={cn(
              "flex items-center gap-1 text-ink40",
              floated ? "text-xs leading-5" : "text-base leading-6"
            )}
          >
            {label}
            {required && <span className="text-error-red">*</span>}
          </span>
          <span className="text-xs leading-5 text-ink40 tabular-nums">
            {value.length}/{max}
          </span>
        </span>
        <textarea
          id={inputId}
          rows={2}
          maxLength={max}
          readOnly={readOnly}
          value={value}
          aria-invalid={error ? true : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
          onChange={(e) => onChange?.(e.target.value.slice(0, max))}
          className={cn(
            "w-full resize-none bg-transparent text-base leading-6 text-ink90 outline-none",
            !floated && "pointer-events-none h-0 opacity-0"
          )}
        />
      </label>
      {error && <p className="text-xs leading-5 text-error-red">{error}</p>}
      {!error && warning && (
        <p className="text-xs leading-5 text-amber-600">{warning}</p>
      )}
    </div>
  )
}

/**
 * Fee display per the intrabank mockup "Fees" section (node 7385:129806):
 * 14px "Transaction Fees *" label over a readonly gray amount row, 520px wide.
 * The fee itself stays `computeFee` output — one fee, charged in the debit
 * currency.
 */
export function FeeBox({
  fee,
  label = "Transaction Fees",
  className,
}: {
  fee: FeeResult
  label?: string
  className?: string
}) {
  return (
    <div className={cn("flex w-[520px] max-w-full flex-col gap-4", className)}>
      <p className="text-sm leading-[22px] text-ink90">
        {label} <span className="text-error-red">*</span>
      </p>
      <AmountRow readOnly currency={fee.currency} value={String(fee.amount)} />
    </div>
  )
}

/** Vertical hairline between Save Draft and Next in the footer bar (node 792:20817). */
export function FooterDivider() {
  return <div className="h-8 w-px shrink-0 bg-[rgba(0,9,50,0.12)]" aria-hidden />
}

/**
 * "Save Draft" per the mockup footer. Demo-only: the payment API contract has
 * no draft endpoint. This button sits inside the fixed FooterActionBar, so it
 * is NOT wrapped in a BuildNote (an in-flow note card cannot render in a fixed
 * 58px bar). The demo-only meaning is carried by the click toast, and the
 * no-draft-endpoint note lives on the Saved Transfer Draft tab.
 */
export function SaveDraftButton({ className }: { className?: string }) {
  return (
    <Button
      variant="secondary"
      className={className}
      onClick={() =>
        toast.info("Drafts are demo-only in this build. Nothing was saved.")
      }
    >
      Save Draft
    </Button>
  )
}

/** `Submitted On` timestamp in the mockup's `YYYY-MM-DD HH:mm` shape (viewer-local). */
export function formatAckTimestamp(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Ack block per Figma node 16:9088 "Result": 80px teal check, 20px title,
 * `Task ID` line with copy, light-gray `Submitted On`. The two buttons are not
 * in the mockup — they carry the preserved `?new=` reset mechanism and the
 * payment-inquiry hand-off.
 */
export function AckBlock({
  taskId,
  submittedAt,
  makeAnotherHref,
}: {
  taskId: string
  submittedAt: string
  makeAnotherHref: string
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(taskId)
      toast.success("Task ID copied")
    } catch {
      toast.error("Could not copy the task ID")
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 py-10">
      <CircleCheck
        className="size-20 text-success-teal"
        strokeWidth={1}
        aria-hidden
      />
      <h2 className="text-center text-xl leading-7 font-semibold text-ink90">
        Your Transaction Has Been Submitted for Approval
      </h2>
      <div className="-mt-1 flex flex-col items-center gap-3">
        <span className="flex items-center gap-2 text-sm leading-[22px] text-ink60">
          <span>
            Task ID: <span className="tabular-nums">{taskId}</span>
          </span>
          <button
            type="button"
            aria-label="Copy task ID"
            onClick={copy}
            className="text-ink60 transition-colors hover:text-navy"
          >
            <Copy className="size-4" />
          </button>
        </span>
        <span className="text-sm leading-[22px] text-[rgba(153,153,153,0.6)]">
          Submitted On: {formatAckTimestamp(submittedAt)}
        </span>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/payments/inquiry" />}
        >
          View in Payment Inquiry
        </Button>
        <Button nativeButton={false} render={<Link href={makeAnotherHref} />}>
          Make Another Transfer
        </Button>
      </div>
    </div>
  )
}
