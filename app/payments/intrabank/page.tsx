"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Trash2,
  UsersRound,
} from "lucide-react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { AmountRow } from "@/components/shared/figma/amount-row"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
import {
  FormSection,
  FormSectionLink,
} from "@/components/shared/figma/form-section"
import { MetaLine } from "@/components/shared/figma/meta-line"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { RateRow } from "@/components/shared/figma/rate-row"
import { StepperBand } from "@/components/shared/figma/stepper-band"
import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  COMPANY,
  computeFee,
  decimalsFor,
  formatMoney,
  formatNumber,
  getWallet,
  WALLETS,
  type MockBeneficiary,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { BeneficiarySearchModal } from "../interbank/wizard-support"

import {
  AckBlock,
  allowedDestinationCurrencies,
  BOOK_PURPOSE_OPTIONS,
  FeeBox,
  FooterDivider,
  isDuplicateReference,
  ReferenceTextarea,
  SaveDraftButton,
  SaveTemplateButton,
  walletLabel,
  walletOptions,
} from "../own-account/wizard-kit"

// ---------------------------------------------------------------------------
// Masked beneficiary-name resolution (mock). On a valid 10-digit DK account
// number the wizard confirms the holder with a masked name.
// ---------------------------------------------------------------------------

const KNOWN_DK_ACCOUNTS: Record<string, string> = {
  "8267014455": "D*** H******** L**",
  "0012345678": "T*** B********** P** L**",
  "8290114567": "G****** T****** P** L**",
  "8301226780": "T******* D***********",
  "8312338901": "P*** V******* L**",
}

// Saved DK Bank account payees for the "Select a Beneficiary" picker. Intrabank
// pays another DK account (BOOK transfer), so these are internal 10-digit
// accounts, NOT the external SWIFT/LOCAL beneficiaries the interbank flow uses.
const DK_ACCOUNT_BENEFICIARIES: MockBeneficiary[] = [
  { id: "dk-01", name: "Druk Holdings Ltd", accountNumber: "8267014455", accountType: "Corporate", destinationCurrency: "USD", destinationCountry: "BT", payoutMethod: "BOOK", bankName: "DK Bank", createdAt: "2026-07-05T10:00:00" },
  { id: "dk-02", name: "Gelephu Trading Pvt Ltd", accountNumber: "8290114567", accountType: "Corporate", destinationCurrency: "SGD", destinationCountry: "BT", payoutMethod: "BOOK", bankName: "DK Bank", createdAt: "2026-07-06T11:20:00" },
  { id: "dk-03", name: "Thimphu Distributors", accountNumber: "8301226780", accountType: "Corporate", destinationCurrency: "BTN", destinationCountry: "BT", payoutMethod: "BOOK", bankName: "DK Bank", createdAt: "2026-07-08T09:15:00" },
  { id: "dk-04", name: "Paro Ventures Ltd", accountNumber: "8312338901", accountType: "Corporate", destinationCurrency: "USD", destinationCountry: "BT", payoutMethod: "BOOK", bankName: "DK Bank", createdAt: "2026-07-10T14:30:00" },
]

const MASKED_NAME_POOL = [
  "U** T***",
  "T***** W*****",
  "S**** D*****",
  "K***** C*******",
  "P**** N******",
]

function resolveMaskedName(accountNumber: string): string {
  const known = KNOWN_DK_ACCOUNTS[accountNumber]
  if (known) return known
  const sum = accountNumber
    .split("")
    .reduce((acc, digit) => acc + Number(digit), 0)
  return MASKED_NAME_POOL[sum % MASKED_NAME_POOL.length]
}

const OWN_ACCOUNT_NUMBERS = new Set(WALLETS.map((w) => w.accountNumber))

// ---------------------------------------------------------------------------
// Saved Transfer Draft tab — LOCAL demo rows only. Drafts have no API
// endpoint; the rows exist to render the 2.3.1 layout and exercise Resume.
// ---------------------------------------------------------------------------

interface DemoDraft {
  id: string
  /** Wallet id used to prefill the wizard on Resume */
  walletId: string
  sourceAccount: string
  destinationAccount: string
  /** Raw amount string, same contract as the AmountRow value */
  amount: string
  currency: string
  createdAt: string
}

const DEMO_DRAFTS: DemoDraft[] = [
  {
    id: "draft-1",
    walletId: "8296310892-USD",
    sourceAccount: "8296310892",
    destinationAccount: "8267014455",
    amount: "2500",
    currency: "USD",
    createdAt: "12-Jul-2026 09:14",
  },
  {
    id: "draft-2",
    walletId: "8289066238-BTN",
    sourceAccount: "8289066238",
    destinationAccount: "0012345678",
    amount: "180000",
    currency: "BTN",
    createdAt: "08-Jul-2026 16:45",
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

function DraftTable({
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
              <td className={cell}>{d.sourceAccount}</td>
              <td className={cell}>{d.destinationAccount}</td>
              <td className={`${cell} text-right tabular-nums`}>
                {formatNumber(Number(d.amount), d.currency)}
              </td>
              <td className={cell}>{d.currency}</td>
              <td className={`${cell} tabular-nums`}>{d.createdAt}</td>
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

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <IntrabankEntry />
    </React.Suspense>
  )
}

/** Keyed on the ?new= param so "Make Another Transfer" fully resets the wizard. */
function IntrabankEntry() {
  const searchParams = useSearchParams()
  return <IntrabankWizard key={searchParams.get("new") ?? "initial"} />
}

function IntrabankWizard() {
  const router = useRouter()
  const submitTask = useAppStore((s) => s.submitTask)
  const tasks = useAppStore((s) => s.tasks)

  const [tab, setTab] = React.useState<"make" | "drafts">("make")
  const [drafts, setDrafts] = React.useState<DemoDraft[]>(DEMO_DRAFTS)

  const [step, setStep] = React.useState(0)
  const [benModalOpen, setBenModalOpen] = React.useState(false)
  const [sourceId, setSourceId] = React.useState<string>()
  const [destAccount, setDestAccount] = React.useState("")
  const [destCcy, setDestCcy] = React.useState<string>()
  const [amount, setAmount] = React.useState("")
  const [purpose, setPurpose] = React.useState<string>()
  const [reference, setReference] = React.useState("")
  const [remittance, setRemittance] = React.useState("")
  const [rate, setRate] = React.useState<number>()
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [result, setResult] = React.useState<{
    id: string
    submittedAt: string
  }>()

  const source = sourceId ? getWallet(sourceId) : undefined

  // PFX-109 item 2: same currency, BTN→FCY, USD→FCY excluding BTN.
  const currencyOptions = source
    ? allowedDestinationCurrencies(source.currency)
    : []

  React.useEffect(() => {
    if (!source) return
    setDestCcy((prev) => {
      const options = allowedDestinationCurrencies(source.currency)
      return prev && options.includes(prev) ? prev : source.currency
    })
  }, [source])

  const destAccountValid =
    destAccount.length === 10 && !OWN_ACCOUNT_NUMBERS.has(destAccount)
  const resolvedName = destAccountValid
    ? resolveMaskedName(destAccount)
    : undefined

  const isFx = !!source && !!destCcy && source.currency !== destCcy
  const fee =
    source && destCcy
      ? computeFee("intrabank", source.currency, destCcy)
      : undefined
  const amountNum = Number(amount || 0)
  const feeInSource =
    fee && source && fee.currency === source.currency ? fee.amount : 0

  const sourceError = !sourceId ? "Select a source account" : undefined
  const destAccountError =
    destAccount.length !== 10
      ? "Enter the 10-digit DK Bank account number"
      : OWN_ACCOUNT_NUMBERS.has(destAccount)
        ? "This is one of your own accounts. Use transfer to own account instead."
        : undefined
  const destCcyError = !destCcy ? "Select a destination currency" : undefined
  const amountError =
    !amount || amountNum <= 0
      ? "Enter an amount greater than zero"
      : source && amountNum + feeInSource > source.balance
        ? "Amount plus the transfer fee exceeds the available balance"
        : undefined
  const purposeError = !purpose ? "Select a purpose of payment" : undefined
  const remittanceError = !remittance.trim()
    ? "Enter remittance information"
    : undefined

  const dupReference = isDuplicateReference(tasks, reference)
  const dupRemittance = isDuplicateReference(tasks, remittance)

  const showError = (key: string, error?: string) =>
    touched[key] ? error : undefined
  const markTouched = (key: string) =>
    setTouched((t) => ({ ...t, [key]: true }))

  const next = () => {
    setTouched({
      source: true,
      destAccount: true,
      destCcy: true,
      amount: true,
      purpose: true,
      remittance: true,
      reference: true,
    })
    if (
      sourceError ||
      destAccountError ||
      destCcyError ||
      amountError ||
      purposeError ||
      remittanceError
    ) {
      return
    }
    setStep(1)
  }

  const purposeLabel = purpose
    ? BOOK_PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label
    : undefined

  const destAmount =
    isFx && rate && destCcy
      ? Number((amountNum * rate).toFixed(decimalsFor(destCcy)))
      : amountNum

  const submit = () => {
    if (!source || !destCcy || !resolvedName) return
    const task = submitTask({
      type: "intrabank",
      fromAccount: source.accountNumber,
      sourceCurrency: source.currency,
      sourceAmount: amountNum,
      toName: resolvedName,
      toAccount: destAccount,
      destinationCurrency: destCcy,
      destinationAmount: destAmount,
      destinationCountry: "BT",
      payoutMethod: "BOOK",
      rate: isFx ? rate : undefined,
      fee,
      purpose: purposeLabel,
      reference: remittance.trim(),
    })
    setResult({ id: task.id, submittedAt: task.submittedAt })
    setStep(2)
  }

  const resumeDraft = (draft: DemoDraft) => {
    setSourceId(draft.walletId)
    setDestAccount(draft.destinationAccount)
    setDestCcy(draft.currency)
    setAmount(draft.amount)
    setTouched({})
    setResult(undefined)
    setStep(0)
    setTab("make")
    toast.success("Draft loaded into the form")
  }

  const deleteDraft = (id: string) => {
    setDrafts((d) => d.filter((x) => x.id !== id))
    toast.success("Draft deleted")
  }

  const senderMeta = source && (
    <>
      <MetaLine label="Sender Name" value={COMPANY.name} />
      <MetaLine
        label="Available Balance"
        value={formatMoney(source.balance, source.currency)}
      />
    </>
  )

  const applyBeneficiary = (b: MockBeneficiary) => {
    setDestAccount(b.accountNumber)
    markTouched("destAccount")
    setBenModalOpen(false)
  }

  const beneficiaryLink = (
    <BuildNote
      className="max-w-[320px] shrink-0"
      en="The picker lists saved DK Bank account payees. Selecting one fills the 10-digit destination account, then the holder is confirmed with a masked name. External SWIFT/LOCAL beneficiaries are not shown here because intrabank only pays other DK accounts."
      zh="选择器列出已保存的 DK Bank 账户收款人。选择后自动填入 10 位收款账号，并以掩码姓名确认持有人。此处不显示外部 SWIFT/LOCAL 收款人，因为行内转账只能转给其他 DK 账户。"
    >
      <FormSectionLink
        icon={UsersRound}
        onClick={() => setBenModalOpen(true)}
      >
        Select a Beneficiary
      </FormSectionLink>
    </BuildNote>
  )

  return (
    <PageShell
      title="Intrabank Transfer"
      className={
        tab === "make" && step < 2 ? "mt-10 pb-[144px]" : "mt-10 pb-20"
      }
    >
      <PageTabs
        tabs={[
          { label: "Transfer Submission", value: "make" },
          { label: "Saved Transfer Draft", value: "drafts" },
        ]}
        value={tab}
        onChange={(v) => setTab(v as "make" | "drafts")}
      />

      {tab === "drafts" && (
        <div className="mt-12 flex flex-col gap-5">
          <BuildNote
            tbd
            en="Saved drafts are demo data rendered locally. The payment API contract defines no draft endpoint, so nothing here is persisted; Resume prefills the submission form, Delete removes the row for this session."
            zh="「已保存草稿」为本地演示数据。支付 API 契约中没有草稿接口，此处不做持久化；「恢复」会把草稿填入转账表单，「删除」仅在本次会话中移除该行。"
          >
            <DraftTable
              drafts={drafts}
              onResume={resumeDraft}
              onDelete={deleteDraft}
            />
          </BuildNote>
          <div className="flex items-center justify-between">
            <span className="text-xs leading-5 text-ink60">
              {drafts.length} records
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center gap-1 rounded-[6px] border-[0.5px] border-field-line px-3 text-sm leading-[22px] text-ink90">
                Page 1
                <ChevronDown className="size-4 text-ink60" />
              </div>
              <button
                type="button"
                disabled
                aria-label="Previous page"
                className="flex size-[26px] items-center justify-center rounded-[6px] border-[0.5px] border-field-line text-ink40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="flex size-[26px] items-center justify-center rounded-[6px] bg-navy text-xs font-medium text-white">
                1
              </span>
              <button
                type="button"
                disabled
                aria-label="Next page"
                className="flex size-[26px] items-center justify-center rounded-[6px] border-[0.5px] border-field-line text-ink40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "make" && (
        <>
          <StepperBand current={step} />

          {step === 0 && (
            <div className="mt-10 flex flex-col gap-10">
              <div className="flex justify-between gap-4">
                <FormSection title="From" className="w-[520px]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <FieldBox
                        variant="select"
                        label="Source Account"
                        required
                        className="min-w-0 flex-1"
                        options={walletOptions(WALLETS)}
                        value={sourceId}
                        onValueChange={(id) => {
                          setSourceId(id)
                          markTouched("source")
                        }}
                        error={showError("source", sourceError)}
                      />
                      <FieldBox
                        variant="readonly"
                        filled={false}
                        label="Currency"
                        value={source?.currency ?? ""}
                        className="w-[184px] shrink-0"
                      />
                    </div>
                    {senderMeta}
                  </div>
                </FormSection>

                <FormSection
                  title="To"
                  className="w-[520px]"
                  action={beneficiaryLink}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <BuildNote
                        tbd
                        className="min-w-0 flex-1"
                        en="On a valid 10-digit DK Bank account number the beneficiary name is shown masked for confirmation before the transfer continues. The payment API contract does not define an account name lookup endpoint."
                        zh="输入有效的 10 位 DK Bank 账号后，系统以掩码形式显示收款人姓名供确认，然后才能继续转账。支付 API 契约中未定义账户名称查询接口。"
                      >
                        <div
                          onBlurCapture={() => markTouched("destAccount")}
                        >
                          <FieldBox
                            variant="input"
                            label="Destination Account"
                            required
                            value={destAccount}
                            onChange={(v) =>
                              setDestAccount(
                                v.replace(/\D/g, "").slice(0, 10)
                              )
                            }
                            error={showError(
                              "destAccount",
                              destAccountError
                            )}
                          />
                        </div>
                      </BuildNote>
                      <BuildNote
                        className="w-[184px] shrink-0"
                        en="An intrabank transfer allows the same currency, BTN to foreign currency, and USD to foreign currency excluding BTN (PFX-109 item 2). Other combinations are not offered."
                        zh="行内转账允许同币种、BTN 转外币、以及 USD 转外币（不含 BTN）（PFX-109 第 2 条）。其他组合不会出现在选项中。"
                      >
                        <FieldBox
                          variant="select"
                          label="Currency"
                          required
                          options={currencyOptions.map((c) => ({
                            value: c,
                            label: c,
                          }))}
                          value={destCcy}
                          onValueChange={(c) => {
                            setDestCcy(c)
                            markTouched("destCcy")
                          }}
                          disabled={!source}
                          error={showError("destCcy", destCcyError)}
                        />
                      </BuildNote>
                    </div>
                    {resolvedName && (
                      <MetaLine
                        label="Beneficiary Name"
                        value={resolvedName}
                      />
                    )}
                  </div>
                </FormSection>
              </div>

              <FormSection title={isFx ? "Amount & FX Rate" : "Amount"}>
                <div className="flex flex-col gap-4">
                  <BuildNote
                    en="The balance check compares the amount plus the transfer fee against the available balance (PFX-53)."
                    zh="余额校验将金额加转账费用与可用余额比较（PFX-53）。"
                  >
                    <div onBlurCapture={() => markTouched("amount")}>
                      <AmountRow
                        label="You Send"
                        currency={source?.currency ?? "—"}
                        value={amount}
                        onChange={setAmount}
                        disabled={!source}
                        error={showError("amount", amountError)}
                      />
                    </div>
                  </BuildNote>

                  {isFx && source && destCcy && (
                    <BuildNote
                      en="The FX quote returns instantly with the customer rate at 4 decimal places and a 60 second validity window."
                      zh="外汇报价即时返回，客户汇率显示 4 位小数，有效期 60 秒。"
                    >
                      <RateRow
                        sourceCurrency={source.currency}
                        destinationCurrency={destCcy}
                        sourceAmount={amountNum > 0 ? amountNum : 0}
                        onQuote={(q) => setRate(q.rate)}
                      />
                    </BuildNote>
                  )}

                  {isFx && destCcy && (
                    <AmountRow
                      label="Recipient Receives"
                      readOnly
                      currency={destCcy}
                      value={amount === "" ? "" : String(destAmount)}
                    />
                  )}
                </div>
              </FormSection>

              {fee && (
                <FormSection title="Fees">
                  <BuildNote
                    className="w-fit max-w-full"
                    en="Intrabank transfers are intra-entity and charged the Category A fee under the PFX-18 fee logic, charged in the debit currency."
                    zh="行内转账属于同一主体，按 PFX-18 费用逻辑收取 A 类费用，以扣款币种计收。"
                  >
                    <FeeBox fee={fee} />
                  </BuildNote>
                </FormSection>
              )}

              <FormSection title="Transfer Information">
                <div className="flex flex-col gap-4">
                  <FieldBox
                    variant="select"
                    label="Purpose"
                    required
                    options={BOOK_PURPOSE_OPTIONS}
                    value={purpose}
                    onValueChange={(code) => {
                      setPurpose(code)
                      markTouched("purpose")
                    }}
                    error={showError("purpose", purposeError)}
                  />
                  <BuildNote
                    en="Remittance information is required for every transaction. The API rejects a transaction without it (`remittanceInformation`)."
                    zh="每笔交易必须填写汇款附言（`remittanceInformation`），API 拒绝缺少附言的交易。"
                    api="POST /clients/{clientNo}/transactions"
                  >
                    <ReferenceTextarea
                      label="Remittance Information"
                      required
                      value={remittance}
                      onChange={setRemittance}
                      onBlur={() => markTouched("remittance")}
                      error={showError("remittance", remittanceError)}
                      warning={
                        dupRemittance
                          ? "This text matches an earlier payment. Check it is not a duplicate."
                          : undefined
                      }
                    />
                  </BuildNote>
                  <ReferenceTextarea
                    label="Reference"
                    value={reference}
                    onChange={setReference}
                    onBlur={() => markTouched("reference")}
                    warning={
                      dupReference
                        ? "This reference matches an earlier payment. Check it is not a duplicate."
                        : undefined
                    }
                  />
                </div>
              </FormSection>
            </div>
          )}

          {step === 1 && source && destCcy && (
            <div className="mt-10 flex flex-col gap-10">
              <div className="flex justify-between gap-4">
                <FormSection title="From" className="w-[520px]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <FieldBox
                        variant="readonly"
                        filled={false}
                        chevron
                        label="Source Account"
                        required
                        value={walletLabel(source)}
                        className="min-w-0 flex-1"
                      />
                      <FieldBox
                        variant="readonly"
                        label="Currency"
                        value={source.currency}
                        className="w-[184px] shrink-0"
                      />
                    </div>
                    {senderMeta}
                  </div>
                </FormSection>
                <FormSection
                  title="To"
                  className="w-[520px]"
                  action={beneficiaryLink}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <FieldBox
                        variant="readonly"
                        filled={false}
                        label="Destination Account"
                        required
                        value={destAccount}
                        className="min-w-0 flex-1"
                      />
                      <FieldBox
                        variant="readonly"
                        filled={false}
                        chevron
                        label="Currency"
                        required
                        value={destCcy}
                        className="w-[184px] shrink-0"
                      />
                    </div>
                    {resolvedName && (
                      <MetaLine
                        label="Beneficiary Name"
                        value={resolvedName}
                      />
                    )}
                  </div>
                </FormSection>
              </div>

              <FormSection title={isFx ? "Amount & FX Rate" : "Amount"}>
                <div className="flex flex-col gap-4">
                  <AmountRow
                    label="You Send"
                    readOnly
                    currency={source.currency}
                    value={amount}
                  />
                  {isFx && (
                    <RateRow
                      sourceCurrency={source.currency}
                      destinationCurrency={destCcy}
                      sourceAmount={amountNum}
                      onQuote={(q) => setRate(q.rate)}
                    />
                  )}
                  {isFx && (
                    <AmountRow
                      label="Recipient Receives"
                      readOnly
                      currency={destCcy}
                      value={String(destAmount)}
                    />
                  )}
                </div>
              </FormSection>

              {fee && (
                <FormSection title="Fees">
                  <div className="flex flex-col gap-2">
                    <FeeBox fee={fee} />
                    <MetaLine
                      label="Total Debit"
                      value={formatMoney(
                        amountNum + feeInSource,
                        source.currency
                      )}
                    />
                  </div>
                </FormSection>
              )}

              <FormSection title="Transfer Information">
                <div className="flex flex-col gap-4">
                  <FieldBox
                    variant="readonly"
                    filled={false}
                    chevron
                    label="Purpose"
                    value={purposeLabel ?? ""}
                  />
                  <ReferenceTextarea
                    readOnly
                    label="Remittance Information"
                    required
                    value={remittance}
                  />
                  <ReferenceTextarea
                    readOnly
                    label="Reference"
                    value={reference}
                  />
                </div>
              </FormSection>
            </div>
          )}

          {step === 2 && result && (
            <AckBlock
              taskId={result.id}
              submittedAt={result.submittedAt}
              makeAnotherHref={`/payments/intrabank?new=${result.id}`}
            />
          )}

          {step < 2 && (
            <FooterActionBar
              left={
                <Button
                  variant="secondary"
                  className="min-w-20"
                  onClick={
                    step === 0 ? () => router.back() : () => setStep(0)
                  }
                >
                  Back
                </Button>
              }
            >
              <div className="flex items-center gap-3">
                <SaveTemplateButton
                  getTemplate={() =>
                    source
                      ? {
                          type: "intrabank",
                          fromAccount: source.accountNumber,
                          sourceCurrency: source.currency,
                          toName: resolvedName ?? "—",
                          toAccount: destAccount,
                          destinationCurrency: destCcy ?? source.currency,
                          destinationCountry: "BT",
                          amount: amountNum > 0 ? amountNum : undefined,
                          purpose: purposeLabel,
                          reference: remittance.trim() || undefined,
                        }
                      : null
                  }
                />
                <SaveDraftButton />
                <FooterDivider />
                <Button
                  className="min-w-20"
                  onClick={step === 0 ? next : submit}
                >
                  {step === 0 ? "Next" : "Submit"}
                </Button>
              </div>
            </FooterActionBar>
          )}
        </>
      )}

      <BeneficiarySearchModal
        open={benModalOpen}
        onOpenChange={setBenModalOpen}
        beneficiaries={DK_ACCOUNT_BENEFICIARIES}
        onConfirm={applyBeneficiary}
      />
    </PageShell>
  )
}
