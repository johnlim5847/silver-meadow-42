"use client"

// Execution Status tab for the batch payment screen (Agent C ownership).
// Layout per the batch execution mockup (Figma node 7736:127906): filter
// panel, Batch Overview, Transaction Details stat cards, Report Download.
// Wired to the store's batch tasks; the mockup's "Transcation" typo is
// corrected (see BuildNote).

import * as React from "react"
import {
  Check,
  Download,
  FileDown,
  FilePenLine,
  FileSearch,
  List,
  X,
  type LucideIcon,
} from "lucide-react"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { FieldBox } from "@/components/shared/figma/field-box"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { StatCard } from "@/components/shared/figma/stat-card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate, type PaymentTask } from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Payee count embedded in the batch task label, e.g. "Batch payment (46 payees)". */
function payeeCount(task: PaymentTask): number {
  const m = /\((\d+) payees\)/.exec(task.toName)
  return m ? Number(m[1]) : 0
}

/** Demo execution counts derived from the task status (see BuildNote). */
function executionCounts(task: PaymentTask) {
  const total = payeeCount(task)
  return {
    total,
    processed: task.status === "Successful" ? total : 0,
    failed: task.status === "Failed" ? total : 0,
  }
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

interface Filters {
  reference: string
  batchId: string
  from?: Date
  to?: Date
}

const EMPTY_FILTERS: Filters = { reference: "", batchId: "" }

function matchesFilters(task: PaymentTask, f: Filters): boolean {
  if (
    f.reference &&
    !(task.reference ?? "")
      .toLowerCase()
      .includes(f.reference.trim().toLowerCase())
  )
    return false
  if (f.batchId && !task.id.toLowerCase().includes(f.batchId.trim().toLowerCase()))
    return false
  const at = new Date(task.submittedAt).getTime()
  if (f.from) {
    const start = new Date(f.from)
    start.setHours(0, 0, 0, 0)
    if (at < start.getTime()) return false
  }
  if (f.to) {
    const end = new Date(f.to)
    end.setHours(23, 59, 59, 999)
    if (at > end.getTime()) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Small local pieces
// ---------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  iconClass,
  children,
}: {
  icon: LucideIcon
  iconClass: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("size-6 shrink-0", iconClass)} strokeWidth={1.75} />
      <h2 className="text-2xl leading-8 font-semibold text-ink90">{children}</h2>
    </div>
  )
}

function DateFilterBox({
  label,
  value,
  onSelect,
}: {
  label: string
  value?: Date
  onSelect: (date?: Date) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <FieldBox
            variant="date"
            label={label}
            value={value ? formatDate(value.toISOString()) : ""}
          />
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onSelect(date ?? undefined)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------

export function ExecutionStatusTab() {
  const tasks = useAppStore((s) => s.tasks)
  const batchTasks = React.useMemo(
    () => tasks.filter((t) => t.type === "batch"),
    [tasks]
  )

  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters | null>(null)

  /** Newest matching batch task; the store prepends new submissions. */
  const selected = React.useMemo(() => {
    const pool = applied
      ? batchTasks.filter((t) => matchesFilters(t, applied))
      : batchTasks
    return pool[0] ?? null
  }, [applied, batchTasks])

  const counts = selected ? executionCounts(selected) : null

  function downloadReport(task: PaymentTask) {
    const { total, processed, failed } = executionCounts(task)
    const header = [
      "BATCH_ID",
      "BATCH_REFERENCE",
      "SOURCE_ACCOUNT",
      "CURRENCY",
      "ESTIMATED_DEBIT",
      "STATUS",
      "SUBMITTED_AT",
      "TOTAL_RECORDS",
      "PROCESSED_RECORDS",
      "FAILED_RECORDS",
    ]
    const row = [
      task.id,
      task.reference ?? "",
      task.fromAccount,
      task.sourceCurrency,
      String(task.sourceAmount),
      task.status,
      task.submittedAt,
      String(total),
      String(processed),
      String(failed),
    ]
    const csv = `${header.join(",")}\n${row.map(csvEscape).join(",")}\n`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `batch-execution-report-${task.id.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 flex flex-col gap-12">
      {/* Filter panel */}
      <GrayPanel>
        <div className="grid grid-cols-2 gap-x-10 gap-y-4">
          <FieldBox
            label="Batch Reference"
            value={draft.reference}
            onChange={(v) => setDraft((d) => ({ ...d, reference: v }))}
          />
          <FieldBox
            label="Batch ID"
            value={draft.batchId}
            onChange={(v) => setDraft((d) => ({ ...d, batchId: v }))}
          />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <DateFilterBox
                label="Transaction Date (From)"
                value={draft.from}
                onSelect={(from) => setDraft((d) => ({ ...d, from }))}
              />
            </div>
            <span className="shrink-0 text-sm leading-[22px] text-ink60">To</span>
            <div className="min-w-0 flex-1">
              <DateFilterBox
                label="Transaction Date (to)"
                value={draft.to}
                onSelect={(to) => setDraft((d) => ({ ...d, to }))}
              />
            </div>
          </div>
          <div />
        </div>
        <div className="mt-6 flex items-center justify-end gap-4">
          <Button
            variant="secondary"
            className="min-w-20"
            onClick={() => {
              setDraft(EMPTY_FILTERS)
              setApplied(null)
            }}
          >
            Reset
          </Button>
          <Button className="min-w-20" onClick={() => setApplied(draft)}>
            Search
          </Button>
        </div>
      </GrayPanel>

      {selected && counts ? (
        <>
          {/* Batch Overview */}
          <section>
            <SectionHeader icon={FilePenLine} iconClass="text-[#f76b15]">
              Batch Overview
            </SectionHeader>
            <div className="mt-4">
              <GrayPanel className="py-10">
                <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1 px-4">
                    <p className="text-sm leading-[22px] text-ink60">
                      Source Account
                    </p>
                    <p className="truncate text-lg leading-7 font-semibold text-ink90">
                      {selected.fromAccount} - {selected.sourceCurrency}
                    </p>
                  </div>
                  <div className="bg-[rgba(0,9,50,0.12)]" />
                  <div className="flex flex-col gap-1 pl-12">
                    <p className="text-sm leading-[22px] text-ink60">Batch ID</p>
                    <p className="truncate text-lg leading-7 font-semibold text-ink90">
                      {selected.id}
                    </p>
                  </div>
                </div>
              </GrayPanel>
            </div>
          </section>

          {/* Transaction Details */}
          <section>
            <BuildNote
              en='The mockup header reads "Transcation Details", a typo. The demo uses the correct spelling.'
              zh='设计稿标题为 "Transcation Details"，属拼写错误。演示使用正确拼写 Transaction Details。'
            >
              <SectionHeader icon={FileSearch} iconClass="text-[#0d74ce]">
                Transaction Details
              </SectionHeader>
            </BuildNote>
            <div className="mt-4">
              <BuildNote
                tbd
                en="Execution counts are derived from the task status in this demo. Successful shows all records processed, Failed shows all records failed, Pending shows no executions yet. No execution status API is defined in the sources."
                zh="本演示的执行数量由任务状态推导。Successful 表示全部处理完成，Failed 表示全部失败，Pending 表示尚未执行。来源中未定义执行状态查询 API。"
              >
                <div className="grid grid-cols-3 gap-[74px]">
                  <StatCard
                    icon={List}
                    label="Total Records"
                    value={counts.total.toLocaleString("en-US")}
                    tone="info"
                  />
                  <StatCard
                    icon={Check}
                    label="Processed Records"
                    value={counts.processed.toLocaleString("en-US")}
                    tone="success"
                  />
                  <StatCard
                    icon={X}
                    label="Failed Records"
                    value={counts.failed.toLocaleString("en-US")}
                    tone="error"
                  />
                </div>
              </BuildNote>
            </div>
          </section>

          {/* Report Download */}
          <section>
            <SectionHeader icon={Download} iconClass="text-ink90">
              Report Download
            </SectionHeader>
            <div className="mt-4">
              <GrayPanel className="p-10">
                <div className="flex items-start gap-6">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info-tint">
                    <FileDown
                      className="size-5 text-[#0d74ce]"
                      strokeWidth={1.75}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base leading-6 font-semibold text-ink90">
                      Download Full Execution Report
                    </p>
                    <p className="mt-1 text-sm leading-[22px] text-ink60">
                      To view full granular execution data or perform local ERP
                      reconciliation, download the full processing status
                      ledger.
                    </p>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <Button
                    size="lg"
                    className="min-w-[206px]"
                    onClick={() => downloadReport(selected)}
                  >
                    Download Report (CSV)
                  </Button>
                </div>
              </GrayPanel>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon={FileSearch}
          title={
            batchTasks.length === 0
              ? "No batch submissions yet"
              : "No matching batch"
          }
          hint={
            batchTasks.length === 0
              ? "Submit a file on the Transfer Submission tab to see its execution status here."
              : "Adjust the filters and search again."
          }
        />
      )}
    </div>
  )
}
