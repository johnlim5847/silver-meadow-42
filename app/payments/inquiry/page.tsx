"use client"

import * as React from "react"
import { ChevronDown, Download, Eye } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FormSection } from "@/components/shared/figma/form-section"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CORRIDOR_CURRENCIES,
  formatMoney,
  formatTimestamp,
  getWallet,
  transactionIdFor,
  WALLETS,
  type PaymentTask,
  type TaskStatus,
  type TransferType,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import {
  ActionLink,
  DateField,
  DetailsModal,
  FilterActions,
  RecordsFooter,
  TaskIdCell,
  TD_CLS,
  TH_CLS,
  TYPE_LABELS,
} from "./list-kit"

const STATUSES: TaskStatus[] = ["Successful", "Failed", "Pending"]
const BATCH_TYPES = new Set<TransferType>(["batch", "payroll"])
const PAGE_SIZE = 5

interface Filters {
  type: string
  from?: Date
  to?: Date
  min: string
  max: string
  status: string
  transactionId: string
  taskId: string
  subFrom?: Date
  subTo?: Date
  currency: string
  sourceAccount: string
  beneficiaryName: string
}

const EMPTY_FILTERS: Filters = {
  type: "all",
  from: undefined,
  to: undefined,
  min: "",
  max: "",
  status: "all",
  transactionId: "",
  taskId: "",
  subFrom: undefined,
  subTo: undefined,
  currency: "all",
  sourceAccount: "all",
  beneficiaryName: "",
}

/** Start-of-day / end-of-day epoch bounds for an optional date range. */
function dayBounds(from?: Date, to?: Date): [number | undefined, number | undefined] {
  let start: number | undefined
  let end: number | undefined
  if (from) {
    const s = new Date(from)
    s.setHours(0, 0, 0, 0)
    start = s.getTime()
  }
  if (to) {
    const e = new Date(to)
    e.setHours(23, 59, 59, 999)
    end = e.getTime()
  }
  return [start, end]
}

function applyFilters(tasks: PaymentTask[], f: Filters): PaymentTask[] {
  const min = f.min ? Number(f.min) : undefined
  const max = f.max ? Number(f.max) : undefined
  const txnId = f.transactionId.trim().toLowerCase()
  const taskId = f.taskId.trim().toLowerCase()
  const benName = f.beneficiaryName.trim().toLowerCase()
  const [txStart, txEnd] = dayBounds(f.from, f.to)
  const [subStart, subEnd] = dayBounds(f.subFrom, f.subTo)
  const account = f.sourceAccount !== "all" ? getWallet(f.sourceAccount) : undefined
  return tasks.filter((t) => {
    if (f.type !== "all" && t.type !== f.type) return false
    if (f.status !== "all" && t.status !== f.status) return false
    if (
      f.currency !== "all" &&
      t.sourceCurrency !== f.currency &&
      t.destinationCurrency !== f.currency
    )
      return false
    if (min !== undefined && t.sourceAmount < min) return false
    if (max !== undefined && t.sourceAmount > max) return false
    // Transaction date = settlement time (completedAt); Submission date = submittedAt.
    if (txStart !== undefined || txEnd !== undefined) {
      if (!t.completedAt) return false
      const ct = new Date(t.completedAt).getTime()
      if (txStart !== undefined && ct < txStart) return false
      if (txEnd !== undefined && ct > txEnd) return false
    }
    const st = new Date(t.submittedAt).getTime()
    if (subStart !== undefined && st < subStart) return false
    if (subEnd !== undefined && st > subEnd) return false
    if (taskId && !t.id.toLowerCase().includes(taskId)) return false
    if (txnId) {
      const tid = transactionIdFor(t)?.toLowerCase() ?? ""
      if (!tid.includes(txnId)) return false
    }
    if (
      account &&
      !(t.fromAccount === account.accountNumber && t.sourceCurrency === account.currency)
    )
      return false
    if (benName && !t.toName.toLowerCase().includes(benName)) return false
    return true
  })
}

/** "Batch payment (42 payees)" → 42, per the batch task naming convention. */
function payeeCount(t: PaymentTask): string {
  const m = t.toName.match(/(\d+)\s*payees?/)
  return m ? m[1] : "—"
}

export default function Page() {
  const tasks = useAppStore((s) => s.tasks)

  const [tab, setTab] = React.useState("single")
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const sorted = React.useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ),
    [tasks]
  )
  const filtered = React.useMemo(
    () => applyFilters(sorted, applied),
    [sorted, applied]
  )
  const rows = filtered.filter((t) =>
    tab === "single" ? !BATCH_TYPES.has(t.type) : BATCH_TYPES.has(t.type)
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  const search = () => {
    setApplied(draft)
    setPage(1)
  }
  const reset = () => {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
    setPage(1)
  }

  const adviceToast = () =>
    toast("Payment advice export is designed but not part of this demo")

  const typeOptions = [
    { value: "all", label: "All types" },
    ...(Object.entries(TYPE_LABELS) as [TransferType, string][]).map(
      ([value, label]) => ({ value, label })
    ),
  ]
  const statusOptions = [
    { value: "all", label: "All statuses" },
    ...STATUSES.map((s) => ({ value: s, label: s })),
  ]
  const currencyOptions = [
    { value: "all", label: "All currencies" },
    ...CORRIDOR_CURRENCIES.map((c) => ({ value: c, label: c })),
  ]
  const accountOptions = [
    { value: "all", label: "All accounts" },
    ...WALLETS.map((w) => ({
      value: w.id,
      label: `${w.accountNumber}-${w.currency}`,
    })),
  ]

  return (
    <PageShell title="Payment Inquiry" className="mt-10 pb-24">
      <PageTabs
        tabs={[
          { label: "Single Payment", value: "single" },
          { label: "Batch Payment", value: "batch" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setPage(1)
        }}
      />

      <BuildNote
        en="Statuses use only Successful, Failed and Pending. Filters apply on Search, Reset restores the full list."
        zh="状态仅使用 Successful、Failed 和 Pending。点击 Search 应用筛选，Reset 恢复完整列表。"
        className="mt-10"
      >
        <GrayPanel>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FieldBox
                variant="select"
                label="Transaction Type"
                options={typeOptions}
                value={draft.type === "all" ? undefined : draft.type}
                placeholder="Transaction Type"
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                filled={false}
              />
              <div className="flex items-center gap-3">
                <DateField
                  label="Transaction Date (From)"
                  value={draft.from}
                  onChange={(from) => setDraft((d) => ({ ...d, from }))}
                  className="flex-1"
                />
                <span className="text-sm text-ink60">To</span>
                <DateField
                  label="Transaction Date (To)"
                  value={draft.to}
                  onChange={(to) => setDraft((d) => ({ ...d, to }))}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FieldBox
                  label="Min. Amount"
                  value={draft.min}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, min: v.replace(/[^\d.]/g, "") }))
                  }
                  className="flex-1"
                />
                <span className="text-sm text-ink60">To</span>
                <FieldBox
                  label="Max. Amount"
                  value={draft.max}
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, max: v.replace(/[^\d.]/g, "") }))
                  }
                  className="flex-1"
                />
              </div>
              {showAdvanced ? (
                <FieldBox
                  variant="select"
                  label="Transaction Status"
                  options={statusOptions}
                  value={draft.status === "all" ? undefined : draft.status}
                  onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                  filled={false}
                />
              ) : (
                <div />
              )}
            </div>

            {showAdvanced && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FieldBox
                    label="Transaction ID"
                    value={draft.transactionId}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, transactionId: v }))
                    }
                  />
                  <FieldBox
                    label="Task ID"
                    value={draft.taskId}
                    onChange={(v) => setDraft((d) => ({ ...d, taskId: v }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <DateField
                      label="Submission Date (from)"
                      value={draft.subFrom}
                      onChange={(subFrom) => setDraft((d) => ({ ...d, subFrom }))}
                      className="flex-1"
                    />
                    <span className="text-sm text-ink60">To</span>
                    <DateField
                      label="Submission Date (to)"
                      value={draft.subTo}
                      onChange={(subTo) => setDraft((d) => ({ ...d, subTo }))}
                      className="flex-1"
                    />
                  </div>
                  <FieldBox
                    variant="select"
                    label="Currency"
                    options={currencyOptions}
                    value={draft.currency === "all" ? undefined : draft.currency}
                    onValueChange={(v) => setDraft((d) => ({ ...d, currency: v }))}
                    filled={false}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FieldBox
                    variant="select"
                    label="Source Account"
                    options={accountOptions}
                    value={
                      draft.sourceAccount === "all"
                        ? undefined
                        : draft.sourceAccount
                    }
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, sourceAccount: v }))
                    }
                    filled={false}
                  />
                  <FieldBox
                    label="Beneficiary Name"
                    value={draft.beneficiaryName}
                    onChange={(v) =>
                      setDraft((d) => ({ ...d, beneficiaryName: v }))
                    }
                  />
                </div>
              </>
            )}

            <FilterActions
              onReset={reset}
              onSearch={search}
              extra={
                <Button
                  variant="secondary"
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  Advanced
                  <ChevronDown
                    data-icon="inline-end"
                    className={cn(
                      "transition-transform",
                      showAdvanced && "rotate-180"
                    )}
                  />
                </Button>
              }
            />
          </div>
        </GrayPanel>
      </BuildNote>

      <FormSection title="Search Results" className="mt-10">
        {tab === "single" ? (
          <BuildNote
            en="Transaction history is paginated, newest first. Query params are `page` (1-based, default 1) and `pageSize` (default 50, max 200). A maker's own submissions appear here immediately after submit. The payment-advice PDF in the design is not part of this demo."
            zh="交易历史分页返回，最新在前。查询参数为 `page`（从 1 开始，默认 1）和 `pageSize`（默认 50，最大 200）。制单人提交后自己的交易立即显示在这里。设计稿中的付款回单 PDF 不在本演示范围内。"
            api="GET /clients/{clientNo}/transactions"
          >
            {pageRows.length === 0 ? (
              <EmptyState
                title="No records"
                hint="No payments match the current filters. Adjust or reset the filters to see more results."
              />
            ) : (
              <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
                <Table>
                  <TableHeader>
                    <TableRow className="border-field-line hover:bg-transparent">
                      <TableHead className={TH_CLS}>Task ID</TableHead>
                      <TableHead className={TH_CLS}>Transaction ID</TableHead>
                      <TableHead className={TH_CLS}>Transaction Time</TableHead>
                      <TableHead className={TH_CLS}>Transaction Type</TableHead>
                      <TableHead className={TH_CLS}>Source Account</TableHead>
                      <TableHead className={TH_CLS}>Currency</TableHead>
                      <TableHead className={TH_CLS}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((t) => (
                      <TableRow key={t.id} className="border-field-line">
                        <TableCell className={TD_CLS}>
                          <TaskIdCell id={t.id} />
                        </TableCell>
                        <TableCell className={`${TD_CLS} tabular-nums`}>
                          {transactionIdFor(t) ?? "—"}
                        </TableCell>
                        <TableCell className={`${TD_CLS} whitespace-nowrap`}>
                          {formatTimestamp(t.submittedAt)}
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          {TYPE_LABELS[t.type]}
                        </TableCell>
                        <TableCell className={`${TD_CLS} tabular-nums`}>
                          {t.fromAccount}
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          {t.sourceCurrency}
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          <div className="flex items-center gap-4">
                            <ActionLink
                              icon={Eye}
                              onClick={() => setSelectedId(t.id)}
                            >
                              View Details
                            </ActionLink>
                            <ActionLink icon={Download} onClick={adviceToast}>
                              PDF
                            </ActionLink>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </BuildNote>
        ) : (
          <BuildNote
            en="Batch and payroll submissions appear as one row per uploaded file. The transactions materialized from a batch are retrieved per batch, ordered by batch row."
            zh="批量付款和工资发放每个上传文件显示为一行。批次生成的交易按批次查询，按批次行排序。"
            api="GET /clients/{clientNo}/batches/{batchID}/transactions"
          >
            {pageRows.length === 0 ? (
              <EmptyState
                title="No records"
                hint="No batch payments match the current filters."
              />
            ) : (
              <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
                <Table>
                  <TableHeader>
                    <TableRow className="border-field-line hover:bg-transparent">
                      <TableHead className={TH_CLS}>Task ID</TableHead>
                      <TableHead className={TH_CLS}>Transaction Type</TableHead>
                      <TableHead className={TH_CLS}>Source Account</TableHead>
                      <TableHead className={`${TH_CLS} text-right`}>
                        Total Amount
                      </TableHead>
                      <TableHead className={`${TH_CLS} text-right`}>
                        Total Number
                      </TableHead>
                      <TableHead className={TH_CLS}>Submission Time</TableHead>
                      <TableHead className={TH_CLS}>Status</TableHead>
                      <TableHead className={TH_CLS}>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((t) => (
                      <TableRow key={t.id} className="border-field-line">
                        <TableCell className={TD_CLS}>
                          <TaskIdCell id={t.id} />
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          {TYPE_LABELS[t.type]}
                        </TableCell>
                        <TableCell className={`${TD_CLS} tabular-nums`}>
                          {t.fromAccount}
                        </TableCell>
                        <TableCell
                          className={`${TD_CLS} text-right tabular-nums`}
                        >
                          {formatMoney(t.sourceAmount, t.sourceCurrency)}
                        </TableCell>
                        <TableCell
                          className={`${TD_CLS} text-right tabular-nums`}
                        >
                          {payeeCount(t)}
                        </TableCell>
                        <TableCell className={`${TD_CLS} whitespace-nowrap`}>
                          {formatTimestamp(t.submittedAt)}
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className={TD_CLS}>
                          <div className="flex items-center gap-4">
                            <ActionLink
                              icon={Eye}
                              onClick={() => setSelectedId(t.id)}
                            >
                              View Details
                            </ActionLink>
                            <ActionLink icon={Download} onClick={adviceToast}>
                              Excel
                            </ActionLink>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </BuildNote>
        )}
        {rows.length > 0 && (
          <RecordsFooter
            count={rows.length}
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            className="mt-5"
          />
        )}
      </FormSection>

      <DetailsModal task={selectedTask} onClose={() => setSelectedId(null)} />
    </PageShell>
  )
}
