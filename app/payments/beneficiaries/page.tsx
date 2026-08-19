"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FormSection } from "@/components/shared/figma/form-section"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { PageShell } from "@/components/shell/page-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type MockBeneficiary } from "@/lib/mock"
import { useAppStore } from "@/lib/store"

import {
  ActionLink,
  DeleteConfirmDialog,
  FilterActions,
  RecordsFooter,
  TD_CLS,
  TH_CLS,
} from "../inquiry/list-kit"
import { AddBeneficiaryForm } from "./add-beneficiary-form"

const PAGE_SIZE = 5

/** Internal = intra-DK (BOOK), Other Bank = LOCAL/SWIFT — the vendor's type split. */
function typeLabel(b: MockBeneficiary): string {
  return b.payoutMethod === "BOOK" ? "Internal Beneficiary" : "Other Bank Beneficiary"
}

interface Filters {
  type: string
  name: string
  account: string
  bank: string
}

const EMPTY_FILTERS: Filters = { type: "all", name: "", account: "", bank: "" }

export default function BeneficiaryListPage() {
  const beneficiaries = useAppStore((s) => s.beneficiaries)
  const removeBeneficiary = useAppStore((s) => s.removeBeneficiary)
  const [tab, setTab] = React.useState("search")
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [editing, setEditing] = React.useState<MockBeneficiary | null>(null)
  const [deleting, setDeleting] = React.useState<{
    id: string
    name: string
  } | null>(null)

  const filtered = beneficiaries.filter((b) => {
    if (applied.type === "internal" && b.payoutMethod !== "BOOK") return false
    if (applied.type === "other" && b.payoutMethod === "BOOK") return false
    const name = applied.name.trim().toLowerCase()
    if (name && !b.name.toLowerCase().includes(name)) return false
    const account = applied.account.trim().toLowerCase()
    if (account && !b.accountNumber.toLowerCase().includes(account)) return false
    const bank = applied.bank.trim().toLowerCase()
    if (bank && !b.bankName.toLowerCase().includes(bank)) return false
    return true
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const startEdit = (b: MockBeneficiary) => {
    setEditing(b)
    setTab("add")
  }

  return (
    <PageShell
      title="Beneficiary List"
      className={tab === "add" ? "mt-10 pb-[144px]" : "mt-10 pb-24"}
    >
      <PageTabs
        tabs={[
          { label: "Search Beneficiary", value: "search" },
          { label: "Add Beneficiary", value: "add" },
        ]}
        value={tab}
        onChange={(v) => {
          setTab(v)
          setEditing(null)
        }}
      />

      {tab === "search" ? (
        <>
          <GrayPanel className="mt-10">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldBox
                  variant="select"
                  label="Beneficiary Type"
                  options={[
                    { value: "all", label: "All types" },
                    { value: "internal", label: "Internal Beneficiary" },
                    { value: "other", label: "Other Bank Beneficiary" },
                  ]}
                  value={draft.type === "all" ? undefined : draft.type}
                  onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                  filled={false}
                />
                <FieldBox
                  label="Beneficiary Name"
                  value={draft.name}
                  onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldBox
                  label="Beneficiary Account No. / IBAN"
                  value={draft.account}
                  onChange={(v) => setDraft((d) => ({ ...d, account: v }))}
                />
                <FieldBox
                  label="Beneficiary Bank Name"
                  value={draft.bank}
                  onChange={(v) => setDraft((d) => ({ ...d, bank: v }))}
                />
              </div>
              <FilterActions
                onReset={() => {
                  setDraft(EMPTY_FILTERS)
                  setApplied(EMPTY_FILTERS)
                  setPage(1)
                }}
                onSearch={() => {
                  setApplied(draft)
                  setPage(1)
                }}
              />
            </div>
          </GrayPanel>

          <FormSection title="Search Results" className="mt-10">
            <BuildNote
              en="The Payment API has create only — there is still no list, update or delete beneficiary endpoint. This list and its Edit and Delete actions are client-side demo state, persisted for the browser session, so the full add, edit and delete flow from the design is clickable. Flagged to the platform team as a TODO."
              zh="Payment API 只有创建接口，仍然没有收款人查询、修改或删除接口。此列表及其 Edit、Delete 操作为客户端演示数据，保存在当前浏览器会话，因此设计稿中的完整增删改流程均可点击。已作为 TODO 反馈给平台团队。"
              tbd
            >
              {pageRows.length === 0 ? (
                <EmptyState
                  title="No records"
                  hint="No beneficiaries match the search. Adjust the filters or add a beneficiary."
                />
              ) : (
                <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-field-line hover:bg-transparent">
                        <TableHead className={TH_CLS}>
                          Beneficiary Type
                        </TableHead>
                        <TableHead className={TH_CLS}>Account Type</TableHead>
                        <TableHead className={TH_CLS}>
                          Beneficiary Account
                        </TableHead>
                        <TableHead className={TH_CLS}>
                          Beneficiary Name
                        </TableHead>
                        <TableHead className={TH_CLS}>Street</TableHead>
                        <TableHead className={TH_CLS}>Town</TableHead>
                        <TableHead className={TH_CLS}>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((b) => (
                        <TableRow key={b.id} className="border-field-line">
                          <TableCell className={TD_CLS}>
                            {typeLabel(b)}
                          </TableCell>
                          <TableCell className={TD_CLS}>
                            {b.accountType}
                          </TableCell>
                          <TableCell className={`${TD_CLS} tabular-nums`}>
                            {b.accountNumber}
                          </TableCell>
                          <TableCell className={TD_CLS}>{b.name}</TableCell>
                          <TableCell className={TD_CLS}>
                            {b.street ?? "—"}
                          </TableCell>
                          <TableCell className={TD_CLS}>
                            {b.town ?? "—"}
                          </TableCell>
                          <TableCell className={TD_CLS}>
                            <div className="flex items-center gap-4">
                              <ActionLink
                                icon={Pencil}
                                onClick={() => startEdit(b)}
                              >
                                Edit
                              </ActionLink>
                              <ActionLink
                                icon={Trash2}
                                destructive
                                onClick={() =>
                                  setDeleting({ id: b.id, name: b.name })
                                }
                              >
                                Delete
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
            {filtered.length > 0 && (
              <RecordsFooter
                count={filtered.length}
                page={safePage}
                pageCount={pageCount}
                onPageChange={setPage}
                className="mt-5"
              />
            )}
          </FormSection>
        </>
      ) : (
        <div className="mt-10">
          <AddBeneficiaryForm
            key={editing?.id ?? "new"}
            editing={editing ?? undefined}
            onSaved={() => {
              setEditing(null)
              setDraft(EMPTY_FILTERS)
              setApplied(EMPTY_FILTERS)
              setPage(1)
              setTab("search")
            }}
          />
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        resource="Beneficiary"
        name={deleting?.name}
        onConfirm={() => {
          if (deleting) {
            removeBeneficiary(deleting.id)
            toast.success("Beneficiary deleted")
          }
          setDeleting(null)
        }}
      />
    </PageShell>
  )
}
