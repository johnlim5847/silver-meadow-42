"use client"

// Shared local component for the batch and payroll upload flows (Agent C
// ownership). Imported by app/payments/batch/page.tsx and
// app/payments/payroll/page.tsx.
//
// Visuals per the Figma payment mockups (batch 17:35238 / 17:36195 /
// 17:36449 / 7736:127906, payroll 619:21114 / 619:20847 / 619:20754 /
// 619:20735 / 619:20440) using the frozen primitives in
// components/shared/figma. The flow logic (template downloads, CSV parsing
// against the 16-column header, per-row validation, remove-invalid gate,
// file-level purpose, computeFee totals, submitTask) is preserved from the
// original build.

import * as React from "react"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  Download,
  FileText,
  Info,
  Plus,
  Trash2,
  Undo2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { MetaLine } from "@/components/shared/figma/meta-line"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { StepperBand } from "@/components/shared/figma/stepper-band"
import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BTN_WALLET,
  COUNTRIES,
  CORRIDOR_CURRENCIES,
  MCA_WALLETS,
  computeFee,
  formatMoney,
  formatNumber,
  formatTimestamp,
  getCustomerRate,
  getPurposeCodes,
  getWallet,
  resolveCorridor,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import { ExecutionStatusTab } from "./execution-status"
import {
  SAMPLE_BATCH_ROWS,
  SAMPLE_PAYROLL_ROWS,
  TEMPLATE_COLUMNS,
  type TemplateRecord,
} from "./sample-rows"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** The API restricts the batch debit currency to USD or BTN. */
const DEBIT_WALLETS = [
  ...MCA_WALLETS.filter((w) => w.currency === "USD"),
  BTN_WALLET,
]

const CHARGE_BEARERS = new Set(["SHAR", "CRED", "DEBT"])
const STATE_REQUIRED_COUNTRIES = new Set(["US", "AU", "CA"])

interface VariantConfig {
  title: string
  /** First tab label (mockup: "Transfer Submission" / "Payroll Payment") */
  submissionTab: string
  /** Second tab label (mockup: "Execution Status" / "Saved Transfer Draft") */
  secondTab: string
  detailsTitle: string
  templateLabel: string
  defaultWalletId: string
  defaultPurpose?: string
  sampleRows: TemplateRecord[]
  sampleFileName: string
  taskLabel: (count: number) => string
}

const CONFIG: Record<"batch" | "payroll", VariantConfig> = {
  batch: {
    title: "Batch Payment",
    submissionTab: "Transfer Submission",
    secondTab: "Execution Status",
    detailsTitle: "Batch Payment Details",
    templateLabel: "Download the Batch Payment Template",
    defaultWalletId: "8296310892-USD",
    sampleRows: SAMPLE_BATCH_ROWS,
    sampleFileName: "sample-batch-payments.csv",
    taskLabel: (n) => `Batch payment (${n} payees)`,
  },
  payroll: {
    title: "Payroll Payment",
    submissionTab: "Payroll Payment",
    secondTab: "Saved Transfer Draft",
    detailsTitle: "Payroll Details",
    templateLabel: "Download the Payroll Payment template",
    defaultWalletId: "8289066238-BTN",
    defaultPurpose: "SALARY",
    sampleRows: SAMPLE_PAYROLL_ROWS,
    sampleFileName: "sample-payroll-payments.csv",
    taskLabel: (n) => `Payroll batch (${n} payees)`,
  },
}

// ---------------------------------------------------------------------------
// CSV parsing + row validation
// ---------------------------------------------------------------------------

interface ParsedRow {
  /** 1-based data row number from the file */
  row: number
  values: TemplateRecord
  /** Present when the row is invalid */
  reason?: string
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, "").trim()
  if (cleaned === "") return undefined
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

/** Returns the first validation failure for a row, or undefined when valid. */
function validateRow(v: TemplateRecord): string | undefined {
  if (!v.BENEFICIARY_NAME.trim()) return "Beneficiary name missing"

  const type = v.BENEFICIARY_ACCOUNT_TYPE.trim().toLowerCase()
  if (type !== "individual" && type !== "corporate")
    return "Account type must be Individual or Corporate"

  const account = v.BENEFICIARY_ACCOUNT_NUMBER.trim()
  if (!account) return "Beneficiary account number missing"
  if (!/^[A-Za-z0-9]{4,34}$/.test(account))
    return "Beneficiary account number format invalid"

  const ccy = v.DESTINATION_CURRENCY.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(ccy) || !CORRIDOR_CURRENCIES.includes(ccy))
    return "Invalid currency code"

  const country = v.DESTINATION_COUNTRY.trim().toUpperCase()
  if (!COUNTRIES.some((c) => c.code === country)) return "Invalid country code"
  const corridor = resolveCorridor(ccy, country)
  if (!corridor) return `No payout corridor for ${ccy} to ${country}`

  if (!v.STREET.trim()) return "Street address missing"
  if (!v.TOWN.trim()) return "Town missing"
  if (STATE_REQUIRED_COUNTRIES.has(country) && !v.STATE.trim())
    return "State required for US, AU and CA"

  const src = parseAmount(v.SOURCE_AMOUNT)
  const dst = parseAmount(v.DESTINATION_AMOUNT)
  if (src === undefined && dst === undefined)
    return "Amount missing, provide a source or destination amount"
  if (src !== undefined && (Number.isNaN(src) || src <= 0))
    return "Source amount must be a positive number"
  if (dst !== undefined && (Number.isNaN(dst) || dst <= 0))
    return "Destination amount must be a positive number"

  if (!v.REMITTANCE_INFORMATION.trim()) return "Missing remittance information"

  const bearer = v.CHARGE_BEARER.trim().toUpperCase()
  if (bearer && !CHARGE_BEARERS.has(bearer))
    return "Charge bearer must be SHAR, CRED or DEBT"

  if (corridor.payoutMethod === "SWIFT" && !v.SWIFT_CODE.trim())
    return "SWIFT code required for SWIFT payout"

  return undefined
}

function buildRows(records: TemplateRecord[]): ParsedRow[] {
  return records.map((values, i) => ({
    row: i + 1,
    values,
    reason: validateRow(values),
  }))
}

/** Payment totals per currency: source amounts are in the debit currency,
 *  destination-pinned amounts in their destination currency. */
function computeTotalsByCurrency(validRows: ParsedRow[], debitCcy: string) {
  const totals = new Map<string, { count: number; amount: number }>()
  for (const r of validRows) {
    const src = parseAmount(r.values.SOURCE_AMOUNT)
    const dst = parseAmount(r.values.DESTINATION_AMOUNT)
    const ccy =
      src !== undefined
        ? debitCcy
        : r.values.DESTINATION_CURRENCY.trim().toUpperCase()
    const amount = src !== undefined ? src : (dst ?? 0)
    const entry = totals.get(ccy) ?? { count: 0, amount: 0 }
    entry.count += 1
    entry.amount += amount
    totals.set(ccy, entry)
  }
  return totals
}

/** Fees per row via computeFee, summed in the debit currency. */
function computeFeeTotal(
  validRows: ParsedRow[],
  variant: "batch" | "payroll",
  debitCcy: string
) {
  let total = 0
  for (const r of validRows) {
    const fee = computeFee(
      variant,
      debitCcy,
      r.values.DESTINATION_CURRENCY.trim().toUpperCase(),
      r.values.DESTINATION_COUNTRY.trim().toUpperCase()
    )
    total += fee.amount
  }
  return total
}

/** Estimated debit in the batch currency. Destination-pinned rows are
 *  converted at the indicative customer rate. */
function computeEstimatedDebit(validRows: ParsedRow[], debitCcy: string) {
  let total = 0
  for (const r of validRows) {
    const src = parseAmount(r.values.SOURCE_AMOUNT)
    if (src !== undefined) {
      total += src
      continue
    }
    const dst = parseAmount(r.values.DESTINATION_AMOUNT) ?? 0
    const destCcy = r.values.DESTINATION_CURRENCY.trim().toUpperCase()
    total +=
      destCcy === debitCcy ? dst : dst / getCustomerRate(debitCcy, destCcy)
  }
  return total
}

function parseCsv(text: string): { rows: ParsedRow[] } | { error: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length === 0) return { error: "The file is empty" }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase())
  const matches =
    header.length === TEMPLATE_COLUMNS.length &&
    TEMPLATE_COLUMNS.every((col, i) => header[i] === col)
  if (!matches)
    return {
      error: "The file header does not match the 16-column batch template",
    }

  const records: TemplateRecord[] = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const record = {} as TemplateRecord
    TEMPLATE_COLUMNS.forEach((col, i) => {
      record[col] = (cells[i] ?? "").trim()
    })
    return record
  })
  if (records.length === 0) return { error: "The file has no payment rows" }

  return { rows: buildRows(records) }
}

// ---------------------------------------------------------------------------
// Demo drafts (payroll "Saved Transfer Draft" tab, local data only)
// ---------------------------------------------------------------------------

interface DemoDraft {
  id: string
  sourceAccount: string
  beneficiaryAccount: string
  amount: number
  currency: string
  createdAt: string
}

const DEMO_DRAFTS: DemoDraft[] = [
  {
    id: "draft-1",
    sourceAccount: "8289066238",
    beneficiaryAccount: "8267001122",
    amount: 161_750,
    currency: "BTN",
    createdAt: "2026-07-20T09:15:00",
  },
  {
    id: "draft-2",
    sourceAccount: "8296310892",
    beneficiaryAccount: "739201845",
    amount: 8_500,
    currency: "USD",
    createdAt: "2026-07-18T14:40:00",
  },
]

// ---------------------------------------------------------------------------
// Small local pieces
// ---------------------------------------------------------------------------

interface LabelValueRow {
  label: string
  value: React.ReactNode
}

/** Bordered label/value summary table per the preview mockup (17:36195). */
function PreviewTable({ rows }: { rows: LabelValueRow[] }) {
  return (
    <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
      {rows.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          className={cn(
            "grid grid-cols-[200px_minmax(0,1fr)]",
            i > 0 && "border-t-[0.5px] border-field-line"
          )}
        >
          <div className="flex min-h-14 items-center border-r-[0.5px] border-field-line bg-panel-fill px-4 py-2 text-sm leading-[22px] text-ink90">
            {r.label}
          </div>
          <div className="flex min-h-14 items-center px-4 py-2 text-xl leading-7 font-semibold text-ink90 tabular-nums">
            {r.value}
          </div>
        </div>
      ))}
    </div>
  )
}

/** 2x2 label/value grid per the "Payroll Details" mockup (619:20847). */
function DetailsGrid({ cells }: { cells: LabelValueRow[] }) {
  return (
    <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
      <div className="grid grid-cols-[232px_minmax(0,1fr)_232px_minmax(0,1fr)]">
        {cells.map((c, i) => {
          const lastRow = i >= cells.length - 2
          const leftPair = i % 2 === 0
          return (
            <React.Fragment key={c.label}>
              <div
                className={cn(
                  "flex h-14 items-center border-r-[0.5px] border-field-line bg-panel-fill px-6 text-base leading-6 text-ink90",
                  !lastRow && "border-b-[0.5px]"
                )}
              >
                {c.label}
              </div>
              <div
                className={cn(
                  "flex h-14 items-center border-field-line px-6 text-lg leading-7 font-semibold text-ink90 tabular-nums",
                  !lastRow && "border-b-[0.5px]",
                  leftPair && "border-r-[0.5px]"
                )}
              >
                {c.value}
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/** "{n} records" line + pagination cluster per the table mockups. */
function RecordsBar({ count }: { count: number }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs leading-5 text-ink60">
        {count} {count === 1 ? "record" : "records"}
      </p>
      <div className="flex items-center gap-2">
        <span className="flex h-[34px] items-center gap-2 rounded-[6px] border-[0.5px] border-field-line bg-white px-3 text-sm leading-[22px] text-ink90">
          Page 1
          <ChevronDown className="size-4 text-ink60" />
        </span>
        <ChevronLeft className="size-4 text-ink40" />
        <span className="flex size-[26px] items-center justify-center rounded-[6px] bg-navy text-xs font-medium text-white">
          1
        </span>
        <ChevronRight className="size-4 text-ink40" />
      </div>
    </div>
  )
}

/** Ack block per the submit mockups (17:36449 / 619:20735). */
function AckBlock({
  taskId,
  submittedAt,
}: {
  taskId: string
  submittedAt: string
}) {
  function copyId() {
    navigator.clipboard.writeText(taskId).then(
      () => toast.success("Task ID copied"),
      () => toast.error("Could not copy the task ID")
    )
  }
  return (
    <div className="flex flex-col items-center pt-[120px] pb-10 text-center">
      <CircleCheck className="size-20 text-success-teal" strokeWidth={1.25} />
      <h2 className="mt-3 text-xl leading-7 font-semibold text-ink90">
        Your Transaction Has Been Submitted for Approval
      </h2>
      <p className="mt-2 flex items-center gap-1 text-sm leading-[22px] text-ink60">
        Task ID: {taskId}
        <button
          type="button"
          onClick={copyId}
          aria-label="Copy task ID"
          className="ml-1 text-ink60 transition-colors hover:text-ink90"
        >
          <Copy className="size-4" />
        </button>
      </p>
      <p className="mt-2 text-sm leading-[22px] text-[rgba(153,153,153,0.6)]">
        Submitted On: {formatTimestamp(submittedAt)}
      </p>
    </div>
  )
}

/** Payroll "Saved Transfer Draft" tab per mockup 619:20440, local demo data. */
function DraftsTab({ onResume }: { onResume: () => void }) {
  const [drafts, setDrafts] = React.useState<DemoDraft[]>(DEMO_DRAFTS)
  return (
    <div className="mt-10">
      <BuildNote
        tbd
        en="No drafts API is defined in any source. These rows are local demo data. Resume loads the built-in sample file into the wizard, delete removes the row locally."
        zh="任何来源均未定义草稿 API。这些行是本地演示数据。恢复会将内置示例文件载入向导，删除仅在本地移除该行。"
      >
        {drafts.length === 0 ? (
          <EmptyState
            title="No saved drafts"
            hint="Deleted demo drafts stay gone until the page reloads."
          />
        ) : (
          <div>
            <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-field-line bg-panel-fill hover:bg-transparent">
                    <TableHead className="h-10 px-4 text-sm font-medium text-ink90">
                      Source Account
                    </TableHead>
                    <TableHead className="h-10 px-4 text-sm font-medium text-ink90">
                      Beneficiary Account
                    </TableHead>
                    <TableHead className="h-10 w-[13%] px-4 text-right text-sm font-medium text-ink90">
                      Amount
                    </TableHead>
                    <TableHead className="h-10 w-[11%] px-4 text-sm font-medium text-ink90">
                      Currency
                    </TableHead>
                    <TableHead className="h-10 px-4 text-sm font-medium text-ink90">
                      Created time
                    </TableHead>
                    <TableHead className="h-10 w-[19%] px-4 text-sm font-medium text-ink90">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d) => (
                    <TableRow
                      key={d.id}
                      className="border-field-line hover:bg-transparent"
                    >
                      <TableCell className="truncate px-4 py-2.5 text-sm text-ink90">
                        {d.sourceAccount}
                      </TableCell>
                      <TableCell className="truncate px-4 py-2.5 text-sm text-ink90">
                        {d.beneficiaryAccount}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right text-sm text-ink90 tabular-nums">
                        {formatNumber(d.amount, d.currency)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-ink90">
                        {d.currency}
                      </TableCell>
                      <TableCell className="truncate px-4 py-2.5 text-sm text-ink90">
                        {formatTimestamp(d.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center gap-6">
                          <button
                            type="button"
                            onClick={onResume}
                            className="flex items-center gap-1 text-sm leading-[22px] font-medium text-navy"
                          >
                            <Undo2 className="size-4" />
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDrafts((rows) =>
                                rows.filter((r) => r.id !== d.id)
                              )
                            }
                            className="flex items-center gap-1 text-sm leading-[22px] font-medium text-navy"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <RecordsBar count={drafts.length} />
          </div>
        )}
      </BuildNote>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

export function UploadFlow({ variant }: { variant: "batch" | "payroll" }) {
  const config = CONFIG[variant]
  const submitTask = useAppStore((s) => s.submitTask)

  const [tab, setTab] = React.useState("submission")
  const [step, setStep] = React.useState(0)
  const [walletId, setWalletId] = React.useState(config.defaultWalletId)
  const [purpose, setPurpose] = React.useState<string | undefined>(
    config.defaultPurpose
  )
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<ParsedRow[] | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [ack, setAck] = React.useState<{
    id: string
    submittedAt: string
  } | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)

  const wallet = getWallet(walletId)
  const debitCcy = wallet?.currency ?? "USD"

  // ---- derived summary (plain computations, auto-memoized by the React
  // Compiler; manual useMemo here breaks its preserve-memoization rule) ----

  const validRows = (rows ?? []).filter((r) => !r.reason)
  const invalidCount = (rows?.length ?? 0) - validRows.length
  const totalsByCurrency = computeTotalsByCurrency(validRows, debitCcy)
  const feeTotal = computeFeeTotal(validRows, variant, debitCcy)
  const estimatedDebit = computeEstimatedDebit(validRows, debitCcy)

  const grandTotal = estimatedDebit + feeTotal
  const hasFxRows = validRows.some((r) => {
    const src = parseAmount(r.values.SOURCE_AMOUNT)
    return (
      src === undefined &&
      r.values.DESTINATION_CURRENCY.trim().toUpperCase() !== debitCcy
    )
  })

  const purposeLabel =
    getPurposeCodes("LOCAL").find((p) => p.code === purpose)?.label ?? purpose

  // ---- handlers ---------------------------------------------------------

  function clearFile() {
    setRows(null)
    setFileName(null)
    setFileError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function resetWizard() {
    setStep(0)
    setWalletId(config.defaultWalletId)
    setPurpose(config.defaultPurpose)
    setAck(null)
    clearFile()
  }

  function handleTabChange(next: string) {
    // Returning to the submission tab after an ack starts a fresh wizard.
    if (next === "submission" && step === 2) resetWizard()
    setTab(next)
  }

  function handleFile(file: File) {
    setFileError(null)
    const name = file.name.toLowerCase()
    if (name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = () => {
        const parsed = parseCsv(String(reader.result ?? ""))
        if ("error" in parsed) {
          setRows(null)
          setFileName(null)
          setFileError(parsed.error)
          return
        }
        setRows(parsed.rows)
        setFileName(file.name)
      }
      reader.readAsText(file)
    } else if (name.endsWith(".xlsx")) {
      // Demo behavior: .xlsx files load the built-in sample rows (see build note).
      setRows(buildRows(config.sampleRows))
      setFileName(file.name)
      toast.info("Demo behavior, .xlsx files load the built-in sample rows")
    } else {
      setFileError("Unsupported file type. Upload a .xlsx or .csv file.")
    }
  }

  function loadSample() {
    setFileError(null)
    setRows(buildRows(config.sampleRows))
    setFileName(config.sampleFileName)
  }

  function handleResumeDraft() {
    resetWizard()
    setRows(buildRows(config.sampleRows))
    setFileName(config.sampleFileName)
    setTab("submission")
    toast.info("Demo behavior, the draft resumes with the built-in sample file")
  }

  function removeInvalidRows() {
    if (!rows) return
    setRows(rows.filter((r) => !r.reason))
  }

  function handleSubmit() {
    if (!wallet || !purpose) return
    const task = submitTask({
      type: variant,
      fromAccount: wallet.accountNumber,
      sourceCurrency: debitCcy,
      sourceAmount: Math.round(estimatedDebit * 100) / 100,
      toName: config.taskLabel(validRows.length),
      toAccount: "—",
      destinationCurrency: debitCcy,
      purpose: purposeLabel,
      reference: fileName ?? undefined,
    })
    setAck({ id: task.id, submittedAt: task.submittedAt })
    setStep(2)
  }

  const continueBlocked =
    !rows || validRows.length === 0 || invalidCount > 0 || !purpose || !wallet
  const continueHint = !rows
    ? "Upload a file to continue"
    : invalidCount > 0
      ? "Fix or remove invalid rows to continue"
      : !purpose
        ? "Select a purpose of payment to continue"
        : undefined

  const hasActionBar =
    tab === "submission" && ((step === 0 && rows !== null) || step === 1)

  // ---- input step pieces ------------------------------------------------

  const dropzone = (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFile(file)
      }}
      className={cn(
        "flex min-h-[136px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-[0.5px] bg-white px-6 py-8 text-center transition-colors",
        dragOver ? "border-navy bg-nav-active/40" : "border-field-line"
      )}
    >
      <Plus className="mb-1 size-6 text-navy" strokeWidth={2.5} />
      <p className="text-base leading-6 text-ink90">
        Click or drag a file here to upload
      </p>
      <p className="text-sm leading-[22px] text-ink60">
        Only single file uploads supported. Supported formats: Excel and CSV
      </p>
    </div>
  )

  const fileBox = (
    <div className="relative flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-[12px] border-[0.5px] border-field-line bg-white px-6 py-8 text-center">
      <FileText className="size-7 text-ink60" strokeWidth={1.5} />
      <p className="max-w-full truncate text-base leading-6 text-ink90">
        {fileName}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Remove file"
        onClick={clearFile}
        className="absolute top-3 right-3 text-ink60"
      >
        <X />
      </Button>
    </div>
  )

  const inputPanel = (
    <GrayPanel>
      <div className="flex justify-between gap-10">
        <div className="flex w-[520px] flex-col gap-2">
          <FieldBox
            variant="select"
            label="Source Account"
            required
            value={walletId}
            options={DEBIT_WALLETS.map((w) => ({
              value: w.id,
              label: `${w.accountNumber}-${w.currency}`,
            }))}
            onValueChange={setWalletId}
          />
          {wallet && (
            <MetaLine
              label="Available Balance"
              value={formatMoney(wallet.balance, wallet.currency)}
            />
          )}
        </div>
        <div className="w-[520px]">
          <BuildNote
            en="One purpose code applies to the whole file, it is not set per row. The purpose is sent once at batch level."
            zh="一个用途代码适用于整个文件，不按行设置。用途在批次级别提交一次。"
            api="POST /clients/{clientNo}/batches"
          >
            <FieldBox
              variant="select"
              label="Purpose of Payment"
              required
              value={purpose}
              options={getPurposeCodes("LOCAL").map((p) => ({
                value: p.code,
                label: p.label,
              }))}
              onValueChange={setPurpose}
            />
          </BuildNote>
        </div>
      </div>

      <div className="mt-4">
        <BuildNote
          en="Both .xlsx and .csv files are accepted. One debit account and currency (USD or BTN) applies to every row, the file carries no source currency column. In this demo, .csv files are parsed in the browser and .xlsx files load a built-in sample dataset."
          zh="接受 .xlsx 和 .csv 两种文件。整个文件使用同一个扣款账户和币种（USD 或 BTN），文件中没有源币种列。本演示中 .csv 文件在浏览器内解析，.xlsx 文件加载内置示例数据。"
          api="POST /clients/{clientNo}/batches/upload"
        >
          {rows && fileName ? fileBox : dropzone}
        </BuildNote>
      </div>
      {fileError && (
        <p className="mt-2 text-sm leading-[22px] text-error-red">{fileError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={loadSample}
          className="text-sm leading-[22px] font-medium text-navy"
        >
          Use Sample File
        </button>
        <BuildNote
          en="The template columns are the 16 TransactionBatchRow columns from the DK Payment API. Both the Excel and CSV templates download from this screen."
          zh="模板列为 DK Payment API 中 TransactionBatchRow 的 16 个列。Excel 和 CSV 模板均可从本页面下载。"
          api="POST /clients/{clientNo}/batches"
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm leading-[22px] font-medium text-navy"
                />
              }
            >
              <Download className="size-5" strokeWidth={1.75} />
              {config.templateLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[298px] p-0">
              <DropdownMenuItem
                className="h-14 rounded-none border-b-[0.5px] border-field-line px-4 text-base text-ink90"
                render={
                  <a
                    href="/templates/batch-payment-template.xlsx"
                    download="batch-payment-template.xlsx"
                  />
                }
              >
                Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-14 rounded-none px-4 text-base text-ink90"
                render={
                  <a
                    href="/templates/batch-payment-template.csv"
                    download="batch-payment-template.csv"
                  />
                }
              >
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BuildNote>
      </div>
    </GrayPanel>
  )

  const detailsSection = rows && (
    <div className="mt-12">
      <BuildNote
        en="Every row is validated before submission. Invalid rows are listed with a reason and do not block the upload, but a batch can only be confirmed once no rows are invalid."
        zh="提交前会校验每一行。无效行会连同原因一并列出，不会阻止上传，但只有当没有无效行时批次才能确认。"
        api="POST /clients/{clientNo}/batches/{batchID}/confirm"
      >
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl leading-8 font-semibold text-ink90">
              {config.detailsTitle}
            </h2>
            {invalidCount > 0 && (
              <Button variant="secondary" onClick={removeInvalidRows}>
                <Trash2 data-icon="inline-start" />
                Remove Invalid Rows
              </Button>
            )}
          </div>
          <div className="mt-4">
            <DetailsGrid
              cells={[
                {
                  label: "Total Amount",
                  value: formatMoney(estimatedDebit, debitCcy),
                },
                { label: "Total Fee", value: formatMoney(feeTotal, debitCcy) },
                {
                  label: "Number of Transactions",
                  value: String(validRows.length),
                },
                { label: "Invalid Rows", value: String(invalidCount) },
              ]}
            />
          </div>
          <div className="mt-6 overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="border-field-line bg-panel-fill hover:bg-transparent">
                  <TableHead className="h-10 w-[15%] px-4 text-sm font-medium text-ink90">
                    Beneficiary Name
                  </TableHead>
                  <TableHead className="h-10 w-[19%] px-4 text-sm font-medium text-ink90">
                    Account Number
                  </TableHead>
                  <TableHead className="h-10 w-[10%] px-4 text-sm font-medium text-ink90">
                    Currency
                  </TableHead>
                  <TableHead className="h-10 w-[10%] px-4 text-sm font-medium text-ink90">
                    Country
                  </TableHead>
                  <TableHead className="h-10 w-[13%] px-4 text-right text-sm font-medium text-ink90">
                    Amount
                  </TableHead>
                  <TableHead className="h-10 px-4 text-sm font-medium text-ink90">
                    Validation
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const src = parseAmount(r.values.SOURCE_AMOUNT)
                  const dst = parseAmount(r.values.DESTINATION_AMOUNT)
                  const destCcy = r.values.DESTINATION_CURRENCY.trim().toUpperCase()
                  const amountCell =
                    src !== undefined && !Number.isNaN(src) && src > 0
                      ? formatNumber(src, debitCcy)
                      : dst !== undefined &&
                          !Number.isNaN(dst) &&
                          dst > 0 &&
                          /^[A-Z]{3}$/.test(destCcy)
                        ? formatNumber(dst, destCcy)
                        : "—"
                  return (
                    <TableRow
                      key={r.row}
                      className="border-field-line hover:bg-transparent"
                    >
                      <TableCell className="truncate px-4 py-2.5 text-sm text-ink90">
                        {r.values.BENEFICIARY_NAME || "—"}
                      </TableCell>
                      <TableCell className="truncate px-4 py-2.5 text-sm text-ink90">
                        {r.values.BENEFICIARY_ACCOUNT_NUMBER || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-ink90">
                        {destCcy || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-ink90">
                        {r.values.DESTINATION_COUNTRY.trim().toUpperCase() ||
                          "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-right text-sm text-ink90 tabular-nums">
                        {amountCell}
                      </TableCell>
                      <TableCell className="px-4 py-2.5 text-sm text-ink90">
                        {r.reason ? (
                          <span className="flex items-center gap-1">
                            <span className="truncate">{r.reason}</span>
                            <Info className="size-3.5 shrink-0 text-ink60" />
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <RecordsBar count={rows.length} />
        </div>
      </BuildNote>
    </div>
  )

  const previewRows: LabelValueRow[] = [
    {
      label: "Source Account",
      value: wallet ? `${wallet.accountNumber} - ${wallet.currency}` : "—",
    },
    { label: "File", value: fileName ?? "—" },
    { label: "Number of Transactions", value: String(validRows.length) },
    ...[...totalsByCurrency.entries()].map(
      ([ccy, t]): LabelValueRow => ({
        label: `${t.count} ${t.count === 1 ? "Payment" : "Payments"} in ${ccy}`,
        value: formatMoney(t.amount, ccy),
      })
    ),
    { label: "Purpose of Payment", value: purposeLabel ?? "—" },
    { label: "Total Amount", value: formatMoney(estimatedDebit, debitCcy) },
    { label: "Total Fee", value: formatMoney(feeTotal, debitCcy) },
    {
      label: "Estimated Total Debit",
      value: formatMoney(grandTotal, debitCcy),
    },
  ]

  const submitButton = (
    <Button className="min-w-20" onClick={handleSubmit}>
      Submit
    </Button>
  )

  // ---- render -----------------------------------------------------------

  return (
    <PageShell
      title={config.title}
      className={cn("mt-10", hasActionBar ? "pb-[144px]" : "pb-20")}
    >
      <PageTabs
        tabs={[
          { label: config.submissionTab, value: "submission" },
          { label: config.secondTab, value: "second" },
        ]}
        value={tab}
        onChange={handleTabChange}
      />

      {tab === "submission" ? (
        <>
          <StepperBand current={step} />

          {step === 0 && (
            <div className="mt-10">
              {variant === "payroll" ? (
                <BuildNote
                  tbd
                  en="Payroll differs from batch payment only in the pre-selected salary purpose. Payroll-specific tagging beyond the purpose code is not defined in any source."
                  zh="工资发放与批量付款的唯一区别是预选的工资用途。除用途代码外，任何来源均未定义工资专属的标记方式。"
                >
                  {inputPanel}
                </BuildNote>
              ) : (
                inputPanel
              )}
              {detailsSection}
            </div>
          )}

          {step === 1 && (
            <div className="mt-10">
              <PreviewTable rows={previewRows} />
              {hasFxRows && (
                <p className="mt-3 text-xs leading-5 text-ink40">
                  Rows paying another currency are estimated at the indicative
                  customer rate. The final debit amount is fixed when the batch
                  is processed.
                </p>
              )}
            </div>
          )}

          {step === 2 && ack && (
            <AckBlock taskId={ack.id} submittedAt={ack.submittedAt} />
          )}

          {step === 0 && rows && (
            <FooterActionBar>
              {continueHint && (
                <p className="text-xs leading-5 text-ink40">{continueHint}</p>
              )}
              <Button
                className="min-w-20"
                disabled={continueBlocked}
                onClick={() => setStep(1)}
              >
                Next
              </Button>
            </FooterActionBar>
          )}
          {step === 1 && (
            <FooterActionBar
              left={
                <Button
                  variant="secondary"
                  className="min-w-20"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
              }
            >
              {variant === "payroll" ? (
                <BuildNote
                  tbd
                  en="The mockup shows an OTP challenge before submission. The intended submission authentication policy is an open question, so the demo submits directly and approval runs through the maker-checker flow."
                  zh="设计稿在提交前显示 OTP 验证。提交时的鉴权策略仍是待定的开放问题，本演示直接提交，审批通过 maker-checker 流程完成。"
                >
                  {submitButton}
                </BuildNote>
              ) : (
                submitButton
              )}
            </FooterActionBar>
          )}
        </>
      ) : variant === "batch" ? (
        <ExecutionStatusTab />
      ) : (
        <DraftsTab onResume={handleResumeDraft} />
      )}

    </PageShell>
  )
}
