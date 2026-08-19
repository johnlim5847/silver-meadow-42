"use client"

import * as React from "react"
import { CircleCheck, CircleX, Eye } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney, formatTimestamp, type PaymentTask } from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import {
  ActionLink,
  DetailsModal,
  RecordsFooter,
  TaskIdCell,
  TD_CLS,
  TH_CLS,
  TYPE_LABELS,
} from "../../payments/inquiry/list-kit"

const PAGE_SIZE = 5

function RoleToggle() {
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  return (
    <BuildNote
      en="This toggle switches the demo between the maker and checker views. In the real system these are separate logins with separate entitlements."
      zh="此开关用于在演示中切换制单和复核视图。实际系统中两者是不同的登录账号和不同的权限。"
      className="shrink-0"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-sm leading-[22px] text-ink60">Acting as</span>
        <div className="flex items-center rounded-full bg-btn-muted p-0.5">
          {(["maker", "checker"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "h-7 rounded-full px-3.5 text-sm font-medium capitalize transition-colors",
                role === r
                  ? "bg-white text-ink90 shadow-sm"
                  : "text-ink60 hover:text-ink90"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </BuildNote>
  )
}

interface Decision {
  task: PaymentTask
  action: "approve" | "reject"
}

function DecisionDialog({
  decision,
  onClose,
}: {
  decision: Decision | null
  onClose: () => void
}) {
  const approveTask = useAppStore((s) => s.approveTask)
  const rejectTask = useAppStore((s) => s.rejectTask)
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    setNote("")
    setError("")
  }, [decision?.task.id, decision?.action])

  const confirm = () => {
    if (!decision) return
    const trimmed = note.trim()
    if (decision.action === "reject" && !trimmed) {
      setError("A note is required when rejecting")
      return
    }
    if (decision.action === "approve") {
      approveTask(decision.task.id, trimmed || undefined)
      toast.success("Request approved")
    } else {
      rejectTask(decision.task.id, trimmed)
      toast.success("Request rejected")
    }
    onClose()
  }

  return (
    <Dialog
      open={!!decision}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {decision && (
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="text-xl leading-7 font-semibold text-ink90">
              {decision.action === "approve"
                ? "Approve Payment Request"
                : "Reject Payment Request"}
            </DialogTitle>
            <DialogDescription>
              {TYPE_LABELS[decision.task.type]} of{" "}
              {formatMoney(
                decision.task.sourceAmount,
                decision.task.sourceCurrency
              )}{" "}
              to {decision.task.toName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="decision-note">
              Note
              {decision.action === "approve" && (
                <span className="text-xs font-normal text-ink40">optional</span>
              )}
            </Label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError("")
              }}
              placeholder={
                decision.action === "approve"
                  ? "Add a note for the audit trail"
                  : "State the reason for rejecting"
              }
              aria-invalid={error ? true : undefined}
            />
            {error && <p className="text-xs text-error-red">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              Cancel
            </DialogClose>
            <Button
              variant={decision.action === "reject" ? "destructive" : "default"}
              onClick={confirm}
            >
              {decision.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

export default function PendingRequestsPage() {
  const tasks = useAppStore((s) => s.tasks)
  const role = useAppStore((s) => s.role)
  const [tab, setTab] = React.useState("pending")
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [decision, setDecision] = React.useState<Decision | null>(null)

  const pending = tasks
    .filter((t) => t.status === "Pending")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const completed = tasks
    .filter((t) => t.status !== "Pending")
    .sort((a, b) =>
      (b.completedAt ?? b.submittedAt).localeCompare(
        a.completedAt ?? a.submittedAt
      )
    )

  const rows = tab === "pending" ? pending : completed
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const showDecisions = tab === "pending" && role === "checker"
  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  return (
    <PageShell
      title="Payment Request"
      actions={<RoleToggle />}
      className="mt-10 pb-24"
    >
      <PageTabs
        tabs={[
          { label: `Pending (${pending.length})`, value: "pending" },
          { label: `Completed (${completed.length})`, value: "completed" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setPage(1)
        }}
      />

      <div className="mt-10">
        <BuildNote
          en={
            tab === "pending"
              ? "Maker-checker approval applies to every payment type, including single payments. Each submission creates an approval task that a checker must action before the payment executes. The maker sees their submitted requests here read-only."
              : "An approval task starts as Pending and ends as Successful (approved) or Failed (rejected). Statuses use this vocabulary only."
          }
          zh={
            tab === "pending"
              ? "所有付款类型都需要制单-复核审批，包括单笔付款。每次提交都会生成审批任务，复核人处理后付款才会执行。制单人在此以只读方式查看自己提交的请求。"
              : "审批任务从 Pending 开始，批准后变为 Successful，拒绝后变为 Failed。状态仅使用这三个词。"
          }
        >
          {pageRows.length === 0 ? (
            <EmptyState
              title="No records"
              hint={
                tab === "pending"
                  ? "Submitted payment requests awaiting approval appear here."
                  : "Approved and rejected requests appear here."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
              <Table>
                <TableHeader>
                  <TableRow className="border-field-line hover:bg-transparent">
                    <TableHead className={TH_CLS}>Task ID</TableHead>
                    <TableHead className={TH_CLS}>Transaction Type</TableHead>
                    <TableHead className={TH_CLS}>
                      {tab === "pending" ? "Submitted" : "Decided"}
                    </TableHead>
                    <TableHead className={TH_CLS}>Beneficiary</TableHead>
                    <TableHead className={`${TH_CLS} text-right`}>
                      Amount
                    </TableHead>
                    {tab === "completed" && (
                      <TableHead className={TH_CLS}>Status</TableHead>
                    )}
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
                      <TableCell className={`${TD_CLS} whitespace-nowrap`}>
                        {formatTimestamp(
                          tab === "pending"
                            ? t.submittedAt
                            : (t.completedAt ?? t.submittedAt)
                        )}
                      </TableCell>
                      <TableCell className={TD_CLS}>
                        <span className="truncate">{t.toName}</span>
                      </TableCell>
                      <TableCell className={`${TD_CLS} text-right tabular-nums`}>
                        {formatMoney(t.sourceAmount, t.sourceCurrency)}
                      </TableCell>
                      {tab === "completed" && (
                        <TableCell className={TD_CLS}>
                          <StatusBadge status={t.status} />
                        </TableCell>
                      )}
                      <TableCell className={TD_CLS}>
                        <div className="flex items-center gap-4">
                          <ActionLink
                            icon={Eye}
                            onClick={() => setSelectedId(t.id)}
                          >
                            View Details
                          </ActionLink>
                          {showDecisions && (
                            <>
                              <ActionLink
                                icon={CircleCheck}
                                onClick={() =>
                                  setDecision({ task: t, action: "approve" })
                                }
                              >
                                Approve
                              </ActionLink>
                              <ActionLink
                                icon={CircleX}
                                destructive
                                onClick={() =>
                                  setDecision({ task: t, action: "reject" })
                                }
                              >
                                Reject
                              </ActionLink>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </BuildNote>
        {rows.length > 0 && (
          <RecordsFooter
            count={rows.length}
            page={safePage}
            pageCount={pageCount}
            onPageChange={setPage}
            className="mt-5"
          />
        )}
      </div>

      <DetailsModal task={selectedTask} onClose={() => setSelectedId(null)} />
      <DecisionDialog decision={decision} onClose={() => setDecision(null)} />
    </PageShell>
  )
}
