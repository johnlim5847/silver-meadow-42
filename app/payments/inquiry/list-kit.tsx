"use client"

// Shared composition for the list screens (inquiry, beneficiaries, templates,
// pending requests) rebuilt against the Figma payment mockups. Owned by the
// inquiry route; the other list routes import from here via relative paths.

import * as React from "react"
import { ChevronLeft, ChevronRight, Copy } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { FieldBox } from "@/components/shared/figma/field-box"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  COMPANY,
  formatDate,
  formatMoney,
  formatRate,
  formatTimestamp,
  transactionIdFor,
  WALLETS,
  type PaymentTask,
  type TransferType,
} from "@/lib/mock"
import { cn } from "@/lib/utils"

export const TYPE_LABELS: Record<TransferType, string> = {
  "own-account": "Own account transfer",
  intrabank: "Intrabank transfer",
  interbank: "Interbank transfer",
  batch: "Batch payment",
  payroll: "Payroll payment",
}

/** Mockup results-table cell classes (inquiry/beneficiary/template frames). */
export const TH_CLS =
  "h-11 border-field-line bg-panel-fill px-4 text-left text-sm leading-[22px] font-semibold text-ink90"
export const TD_CLS = "border-field-line px-4 py-3.5 text-sm leading-[22px] text-ink90"

/** Navy text-link action per the mockup Action columns. */
export function ActionLink({
  icon: Icon,
  children,
  destructive,
  onClick,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  destructive?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-sm leading-[22px] font-medium whitespace-nowrap",
        destructive ? "text-error-red" : "text-navy",
        "hover:underline underline-offset-2",
        className
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  )
}

/** Short mono task id + copy, used in every results table. */
export function TaskIdCell({ id }: { id: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="font-mono text-[13px] text-ink90">{id.slice(0, 10)}…</span>
      <button
        type="button"
        aria-label="Copy task ID"
        onClick={(e) => {
          e.stopPropagation()
          void navigator.clipboard.writeText(id)
          toast.success("Task ID copied")
        }}
        className="flex size-6 shrink-0 items-center justify-center rounded-full text-ink60 transition-colors hover:bg-panel-fill hover:text-ink90"
      >
        <Copy className="size-3.5" />
      </button>
    </span>
  )
}

/** FieldBox-skinned single-date picker (Calendar in a Popover, no native input). */
export function DateField({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value?: Date
  onChange: (d?: Date) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <FieldBox
            variant="date"
            label={label}
            value={value ? formatDate(value.toISOString()) : undefined}
            className={className}
          />
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(d) => {
            onChange(d)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * "{n} records" + Page select + pill pagination, per the mockup footer row.
 *
 * The control is persistent chrome — it renders at a single page too, with the
 * select and both arrows inert. A footer that disappears below one page reads
 * as a missing feature on the low-volume screens (beneficiaries, templates) and
 * makes the results block jump height as filters narrow.
 */
export function RecordsFooter({
  count,
  page,
  pageCount,
  onPageChange,
  className,
}: {
  count: number
  page: number
  pageCount: number
  onPageChange: (p: number) => void
  className?: string
}) {
  const pills = Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1)
  const single = pageCount <= 1
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-xs leading-5 text-ink60">
        {count} {count === 1 ? "record" : "records"}
      </span>
      <div className="flex items-center gap-2">
        <Select
          value={String(page)}
          onValueChange={(v) => {
            if (typeof v === "string") onPageChange(Number(v))
          }}
        >
          <SelectTrigger
            disabled={single}
            className="h-9 gap-2 rounded-[8px] border-[0.5px] border-field-line px-3 text-sm text-ink90 focus-visible:ring-0 [&_svg]:text-ink60"
          >
            <SelectValue>Page {page}</SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <SelectItem key={p} value={String(p)}>
                Page {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex size-[26px] items-center justify-center rounded-[6px] text-ink60 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pills.map((p) => (
          <button
            key={p}
            type="button"
            disabled={single}
            onClick={() => onPageChange(p)}
            className={cn(
              "flex size-[26px] items-center justify-center rounded-[6px] border-[0.5px] text-xs font-medium",
              p === page
                ? "border-navy bg-navy text-white"
                : "border-field-line bg-white text-ink90"
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="flex size-[26px] items-center justify-center rounded-[6px] text-ink60 disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Reset / (extra) / Search buttons, right-aligned per the mockup filter panels. */
export function FilterActions({
  onReset,
  onSearch,
  extra,
  className,
}: {
  onReset: () => void
  onSearch: () => void
  extra?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-end gap-3", className)}>
      <Button variant="secondary" onClick={onReset}>
        Reset
      </Button>
      {extra}
      <Button className="min-w-[88px]" onClick={onSearch}>
        Search
      </Button>
    </div>
  )
}

/** Navy tick + heading above each detail table (the mockup's section rows). */
function DetailSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-[18px] w-[3px] rounded-full bg-navy" />
        <h3 className="text-[15px] leading-5 font-semibold text-navy">{title}</h3>
      </div>
      {/* gap-px over a field-line background paints the 1px inner grid lines */}
      <div className="grid grid-cols-[2fr_3fr_2fr_3fr] gap-px overflow-hidden rounded-[8px] border-[0.5px] border-field-line bg-field-line">
        {children}
      </div>
    </section>
  )
}

/** Gray label cell in a detail table. */
function LabelCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-panel-fill px-4 py-3.5 text-sm leading-[22px] text-ink60">
      {children}
    </div>
  )
}

/** White value cell; `span` stretches it across the remaining 3 columns. */
function ValueCell({
  children,
  span,
  className,
}: {
  children: React.ReactNode
  span?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-white px-4 py-3.5 text-sm leading-[22px] text-ink90",
        span && "col-span-3",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Payment-details modal (the mockup's View Details presentation — Frame
 * 1912056047). A centered card over a dimmed page, grouping the transaction
 * into four titled sections of label/value tables.
 */
export function DetailsModal({
  task,
  onClose,
}: {
  task: PaymentTask | null
  onClose: () => void
}) {
  const sourceName = task
    ? WALLETS.find(
        (w) =>
          w.accountNumber === task.fromAccount &&
          w.currency === task.sourceCurrency
      )?.accountName
    : undefined
  return (
    <Dialog
      open={!!task}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {task && (
        <DialogContent className="max-h-[calc(100vh-4rem)] max-w-[1080px] overflow-y-auto rounded-[16px] p-8 sm:max-w-[1080px] sm:p-10">
          <DialogTitle className="text-center text-2xl leading-8 font-semibold text-ink90">
            Payment Details
          </DialogTitle>
          <BuildNote
            en="Detail groups the transaction into overview, account, amount and audit sections. A single transaction is retrieved by the external ID supplied at creation. Audit fields come from the maker-checker approval."
            zh="详情分为交易概览、账户、金额和审计四个部分。单笔交易通过创建时提供的 external ID 查询。审计字段来自 maker-checker 审批。"
            api="GET /clients/{clientNo}/transactions/{externalID}"
            className="mt-2"
          >
            <div className="flex flex-col gap-7">
              <DetailSection title="Transaction Overview">
                <LabelCell>Transaction ID</LabelCell>
                <ValueCell className="font-mono text-[13px]">
                  {transactionIdFor(task) ?? "—"}
                </ValueCell>
                <LabelCell>Task ID</LabelCell>
                <ValueCell className="font-mono text-[13px]">{task.id}</ValueCell>
                <LabelCell>Transaction Type</LabelCell>
                <ValueCell>{TYPE_LABELS[task.type]}</ValueCell>
                <LabelCell>Status</LabelCell>
                <ValueCell>{task.status}</ValueCell>
                <LabelCell>Submission Time</LabelCell>
                <ValueCell>{formatTimestamp(task.submittedAt)}</ValueCell>
                <LabelCell>Execution Time</LabelCell>
                <ValueCell>
                  {task.completedAt ? formatTimestamp(task.completedAt) : "—"}
                </ValueCell>
              </DetailSection>

              <DetailSection title="Account Details">
                <LabelCell>Source Account Name</LabelCell>
                <ValueCell>{sourceName ?? "—"}</ValueCell>
                <LabelCell>Source Account</LabelCell>
                <ValueCell className="tabular-nums">{task.fromAccount}</ValueCell>
                <LabelCell>Beneficiary Name</LabelCell>
                <ValueCell>{task.toName}</ValueCell>
                <LabelCell>Beneficiary Account</LabelCell>
                <ValueCell className="tabular-nums">
                  {task.toAccount || "—"}
                </ValueCell>
                <LabelCell>Beneficiary Bank</LabelCell>
                <ValueCell span>{task.beneficiaryBank || "—"}</ValueCell>
                <LabelCell>Payment Reference</LabelCell>
                <ValueCell span>{task.reference || "—"}</ValueCell>
              </DetailSection>

              <DetailSection title="Amount & Exchange">
                <LabelCell>Debit Amount</LabelCell>
                <ValueCell className="tabular-nums">
                  {formatMoney(task.sourceAmount, task.sourceCurrency)}
                </ValueCell>
                <LabelCell>Destination Amount</LabelCell>
                <ValueCell className="tabular-nums">
                  {formatMoney(
                    task.destinationAmount ?? task.sourceAmount,
                    task.destinationCurrency
                  )}
                </ValueCell>
                <LabelCell>Total Fee Charge</LabelCell>
                <ValueCell className="tabular-nums">
                  {task.fee
                    ? formatMoney(task.fee.amount, task.fee.currency)
                    : formatMoney(0, task.sourceCurrency)}
                </ValueCell>
                <LabelCell>Exchange Rate</LabelCell>
                <ValueCell className="tabular-nums">
                  {task.rate !== undefined
                    ? `1 ${task.sourceCurrency} = ${formatRate(task.rate)} ${task.destinationCurrency}`
                    : "—"}
                </ValueCell>
              </DetailSection>

              <DetailSection title="Audit">
                <LabelCell>Requestor</LabelCell>
                <ValueCell>{COMPANY.name}</ValueCell>
                <LabelCell>Approver(s)</LabelCell>
                <ValueCell>
                  {task.status === "Pending" ? "Awaiting approval" : "Checker"}
                </ValueCell>
                <LabelCell>Approver Remarks</LabelCell>
                <ValueCell span>{task.checkerNote || "—"}</ValueCell>
              </DetailSection>
            </div>
          </BuildNote>
        </DialogContent>
      )}
    </Dialog>
  )
}

/**
 * Edit/Delete affordances exist in the design ahead of the API — the
 * beneficiary and template resources are create-only today. This dialog states
 * exactly that instead of mutating anything.
 */
export function NoEndpointDialog({
  open,
  onOpenChange,
  action,
  resource,
  en,
  zh,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  action: string
  resource: string
  en: string
  zh: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[16px] p-8">
        <DialogTitle className="text-xl leading-7 font-semibold text-ink90">
          {action} {resource}
        </DialogTitle>
        <span className="w-fit rounded-full bg-warm-tint px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          TBD / 待定
        </span>
        <p className="text-sm leading-[22px] text-ink90">{en}</p>
        <p className="text-sm leading-[22px] text-ink60">{zh}</p>
        <div className="mt-2 flex justify-end gap-3">
          <DialogClose render={<Button variant="secondary" />}>Close</DialogClose>
          <Button disabled>{action}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Destructive confirm dialog for client-side Delete (templates, beneficiaries). */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  resource,
  name,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  resource: string
  name?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[16px] p-8">
        <DialogTitle className="text-xl leading-7 font-semibold text-ink90">
          Delete {resource}
        </DialogTitle>
        <p className="text-sm leading-[22px] text-ink90">
          Delete{" "}
          {name ? (
            <span className="font-semibold">{name}</span>
          ) : (
            `this ${resource.toLowerCase()}`
          )}
          ? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button
            onClick={onConfirm}
            className="bg-error-red text-white hover:opacity-90"
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
