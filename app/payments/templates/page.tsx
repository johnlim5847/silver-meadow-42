"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeftRight, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { EmptyState } from "@/components/shared/empty-state"
import { AmountRow } from "@/components/shared/figma/amount-row"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
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
  formatTimestamp,
  generateTaskId,
  getPurposeCodes,
  getWallet,
  WALLETS,
  type PaymentTemplate,
  type TransferType,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"

import {
  ActionLink,
  DeleteConfirmDialog,
  FilterActions,
  RecordsFooter,
  TD_CLS,
  TH_CLS,
  TYPE_LABELS,
} from "../inquiry/list-kit"
import { FieldCombobox, RemittanceBox } from "../interbank/wizard-support"

const PAGE_SIZE = 5

const WIZARD_ROUTES: Record<TransferType, string> = {
  "own-account": "/payments/own-account",
  intrabank: "/payments/intrabank",
  interbank: "/payments/interbank",
  batch: "/payments/batch",
  payroll: "/payments/payroll",
}

/** Template add supports the three single-payment wizards (mockup 8.2.x set). */
const ADDABLE_TYPES: TransferType[] = ["own-account", "intrabank", "interbank"]

interface Filters {
  type: string
  name: string
}
const EMPTY_FILTERS: Filters = { type: "all", name: "" }

export default function PaymentTemplatePage() {
  const router = useRouter()
  const templates = useAppStore((s) => s.templates)
  const addTemplate = useAppStore((s) => s.addTemplate)
  const updateTemplate = useAppStore((s) => s.updateTemplate)
  const removeTemplate = useAppStore((s) => s.removeTemplate)

  const [tab, setTab] = React.useState("search")
  const [draft, setDraft] = React.useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = React.useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = React.useState(1)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<{
    id: string
    name: string
  } | null>(null)

  // Add Payment Template form state
  const [addType, setAddType] = React.useState<TransferType>()
  const [addName, setAddName] = React.useState("")
  const [fromId, setFromId] = React.useState<string>()
  const [toName, setToName] = React.useState("")
  const [toAccount, setToAccount] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [purpose, setPurpose] = React.useState<string>()
  const [reference, setReference] = React.useState("")
  const [addErrors, setAddErrors] = React.useState<Record<string, string>>({})

  const filtered = templates.filter((t) => {
    if (applied.type !== "all" && t.type !== applied.type) return false
    const q = applied.name.trim().toLowerCase()
    if (q && !t.name.toLowerCase().includes(q)) return false
    return true
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const fromWallet = fromId ? getWallet(fromId) : undefined

  const resetAdd = () => {
    setAddType(undefined)
    setAddName("")
    setFromId(undefined)
    setToName("")
    setToAccount("")
    setAmount("")
    setPurpose(undefined)
    setReference("")
    setAddErrors({})
    setEditingId(null)
  }

  const startEdit = (t: PaymentTemplate) => {
    setAddType(t.type)
    setAddName(t.name)
    setFromId(
      WALLETS.find(
        (w) =>
          w.accountNumber === t.fromAccount && w.currency === t.sourceCurrency
      )?.id
    )
    setToName(t.toName === "Own account" ? "" : t.toName)
    setToAccount(t.toAccount)
    setAmount(t.amount != null ? String(t.amount) : "")
    setPurpose(getPurposeCodes("BOOK").find((p) => p.label === t.purpose)?.code)
    setReference(t.reference ?? "")
    setAddErrors({})
    setEditingId(t.id)
    setTab("add")
  }

  const saveTemplate = () => {
    const next: Record<string, string> = {}
    if (!addType) next.type = "Select the payment type"
    if (!addName.trim()) next.name = "Enter a template name"
    if (!fromWallet) next.from = "Select the source account"
    if (addType && addType !== "own-account") {
      if (!toName.trim()) next.toName = "Enter the beneficiary name"
      if (!toAccount.trim()) next.toAccount = "Enter the beneficiary account"
    }
    if (Object.keys(next).length > 0) {
      setAddErrors(next)
      return
    }
    const payload = {
      name: addName.trim(),
      type: addType!,
      fromAccount: fromWallet!.accountNumber,
      sourceCurrency: fromWallet!.currency,
      toName: addType === "own-account" ? "Own account" : toName.trim(),
      toAccount: toAccount.trim(),
      destinationCurrency: fromWallet!.currency,
      amount: amount ? Number(amount) : undefined,
      purpose: purpose
        ? getPurposeCodes("BOOK").find((p) => p.code === purpose)?.label
        : undefined,
      reference: reference.trim() || undefined,
    }
    if (editingId) {
      updateTemplate(editingId, payload)
      toast.success("Template updated")
    } else {
      addTemplate({
        ...payload,
        id: `tpl-${generateTaskId().slice(0, 12)}`,
        createdAt: new Date().toISOString(),
      })
      toast.success("Template saved")
    }
    resetAdd()
    setApplied(EMPTY_FILTERS)
    setDraft(EMPTY_FILTERS)
    setPage(1)
    setTab("search")
  }

  return (
    <PageShell
      title="Payment Template"
      className={tab === "add" ? "mt-10 pb-[144px]" : "mt-10 pb-24"}
    >
      <PageTabs
        tabs={[
          { label: "Search Payment Template", value: "search" },
          { label: "Add Payment Template", value: "add" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "search" ? (
        <>
          <GrayPanel className="mt-10">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldBox
                  variant="select"
                  label="Payment Type"
                  options={[
                    { value: "all", label: "All types" },
                    ...(
                      Object.entries(TYPE_LABELS) as [TransferType, string][]
                    ).map(([value, label]) => ({ value, label })),
                  ]}
                  value={draft.type === "all" ? undefined : draft.type}
                  onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                  filled={false}
                />
                <FieldBox
                  label="Template Name"
                  value={draft.name}
                  onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
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
              en="Templates are client-side demo state — the Payment API has no template endpoints. Add, Edit and Delete all persist only in this browser session, matching the design's full CRUD."
              zh="模板为客户端演示数据，Payment API 没有模板接口。新增、编辑和删除均仅保存在当前浏览器会话，与设计稿的完整增删改一致。"
              tbd
            >
              {pageRows.length === 0 ? (
                <EmptyState
                  title="No records"
                  hint="Save a payment as a template from any wizard, or add one from the Add Payment Template tab."
                />
              ) : (
                <div className="overflow-hidden rounded-[8px] border-[0.5px] border-field-line">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-field-line hover:bg-transparent">
                        <TableHead className={TH_CLS}>Payment Type</TableHead>
                        <TableHead className={TH_CLS}>Template Name</TableHead>
                        <TableHead className={TH_CLS}>Last Updated</TableHead>
                        <TableHead className={TH_CLS}>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageRows.map((t) => (
                        <TableRow key={t.id} className="border-field-line">
                          <TableCell className={TD_CLS}>
                            {TYPE_LABELS[t.type]}
                          </TableCell>
                          <TableCell className={`${TD_CLS} font-medium`}>
                            {t.name}
                          </TableCell>
                          <TableCell className={`${TD_CLS} whitespace-nowrap`}>
                            {formatTimestamp(t.createdAt)}
                          </TableCell>
                          <TableCell className={TD_CLS}>
                            <div className="flex items-center gap-4">
                              <ActionLink
                                icon={ArrowLeftRight}
                                onClick={() =>
                                  router.push(
                                    `${WIZARD_ROUTES[t.type]}?template=${t.id}`
                                  )
                                }
                              >
                                Transfer
                              </ActionLink>
                              <ActionLink
                                icon={Pencil}
                                onClick={() => startEdit(t)}
                              >
                                Edit
                              </ActionLink>
                              <ActionLink
                                icon={Trash2}
                                destructive
                                onClick={() =>
                                  setDeleting({ id: t.id, name: t.name })
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
          <BuildNote
            en="Templates are client-side demo state — the Payment API has no template endpoints. A template pre-fills a wizard, and the wizard's own corrected rules (PFX-109 combinations, corridor resolution, validation) still apply at payment time."
            zh="模板为客户端演示数据，Payment API 没有模板接口。模板用于预填付款向导，付款时向导自身的规则（PFX-109 币种组合、通道解析、校验）仍然生效。"
            tbd
          >
            <div className="flex flex-col gap-10">
              <GrayPanel>
                <div className="grid grid-cols-2 gap-4">
                  <FieldBox
                    variant="select"
                    label="Payment Type"
                    required
                    options={ADDABLE_TYPES.map((t) => ({
                      value: t,
                      label: TYPE_LABELS[t],
                    }))}
                    value={addType}
                    onValueChange={(v) => {
                      setAddType(v as TransferType)
                      setAddErrors({})
                    }}
                    error={addErrors.type}
                    filled={false}
                  />
                  <FieldBox
                    label="Template Name"
                    required
                    value={addName}
                    onChange={(v) => {
                      setAddName(v)
                      setAddErrors((e) => ({ ...e, name: "" }))
                    }}
                    error={addErrors.name || undefined}
                  />
                </div>
              </GrayPanel>

              {addType && (
                <>
                  <div className="grid grid-cols-2 gap-8">
                    <FormSection title="From">
                      <FieldCombobox
                        label="Select Source Account"
                        required
                        options={WALLETS.map((w) => ({
                          value: w.id,
                          label: `${w.accountName} · ${w.currency}`,
                          hint: w.accountNumber,
                        }))}
                        value={fromId}
                        onChange={(v) => {
                          setFromId(v)
                          setAddErrors((e) => ({ ...e, from: "" }))
                        }}
                        error={addErrors.from || undefined}
                      />
                    </FormSection>
                    <FormSection title="To">
                      {addType === "own-account" ? (
                        <FieldBox
                          variant="readonly"
                          label="Destination"
                          value="Own account (chosen in the wizard)"
                        />
                      ) : (
                        <div className="flex flex-col gap-4">
                          <FieldBox
                            label="Beneficiary Name"
                            required
                            value={toName}
                            onChange={(v) => {
                              setToName(v)
                              setAddErrors((e) => ({ ...e, toName: "" }))
                            }}
                            error={addErrors.toName || undefined}
                          />
                          <FieldBox
                            label="Beneficiary Account"
                            required
                            value={toAccount}
                            onChange={(v) => {
                              setToAccount(v)
                              setAddErrors((e) => ({ ...e, toAccount: "" }))
                            }}
                            error={addErrors.toAccount || undefined}
                          />
                        </div>
                      )}
                    </FormSection>
                  </div>

                  <FormSection title="Amount">
                    <AmountRow
                      label="You Send"
                      currency={fromWallet?.currency ?? "—"}
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.00"
                    />
                  </FormSection>

                  <FormSection title="Transfer Information">
                    <div className="flex flex-col gap-4">
                      <FieldBox
                        variant="select"
                        label="Purpose"
                        options={getPurposeCodes("BOOK").map((p) => ({
                          value: p.code,
                          label: p.label,
                        }))}
                        value={purpose}
                        onValueChange={setPurpose}
                        filled={false}
                      />
                      <RemittanceBox
                        label="Reference"
                        value={reference}
                        onChange={setReference}
                      />
                    </div>
                  </FormSection>
                </>
              )}
            </div>
          </BuildNote>

          <FooterActionBar>
            <Button className="min-w-20" onClick={saveTemplate}>
              {editingId ? "Update" : "Save"}
            </Button>
          </FooterActionBar>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => {
          if (!o) setDeleting(null)
        }}
        resource="Template"
        name={deleting?.name}
        onConfirm={() => {
          if (deleting) {
            removeTemplate(deleting.id)
            toast.success("Template deleted")
          }
          setDeleting(null)
        }}
      />
    </PageShell>
  )
}
