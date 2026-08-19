"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CircleCheck, Copy, UsersRound } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  applySettlement,
  BANK_ACCOUNT_TYPES,
  BENEFICIARY_RELATIONSHIPS,
  BTFN_INVOICES,
  computeExternalFee,
  computeFee,
  COUNTRIES,
  ID_TYPES,
  decimalsFor,
  formatMoney,
  formatNumber,
  getCountriesForCurrency,
  getPurposeCodes,
  getWallet,
  hasExternalFee,
  payoutRail,
  resolveCorridor,
  SEED_BENEFICIARIES,
  TRADE_TYPES,
  WALLETS,
  type ChargeBearer,
  type MockBeneficiary,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import { TD_CLS, TH_CLS } from "../inquiry/list-kit"
import {
  allowedDestinationCurrencies,
  isDuplicateReference,
} from "../own-account/wizard-kit"
import {
  BeneficiarySearchModal,
  DEMO_DRAFTS,
  DraftsTable,
  ExternalFeeHint,
  FeeCategoryHint,
  FieldCombobox,
  formatAckTime,
  RemittanceBox,
  SaveAsTemplateButton,
  type DemoDraft,
} from "./wizard-support"

// One-line helper text per charge-bearer option (PFX-59).
const CHARGE_BEARER_OPTIONS: {
  value: ChargeBearer
  label: string
  helper: string
}[] = [
  {
    value: "SHAR",
    label: "Shared (SHAR)",
    helper:
      "You pay DK Bank's charges and the beneficiary pays the receiving bank's charges.",
  },
  {
    value: "CRED",
    label: "Beneficiary pays (CRED)",
    helper: "All charges are deducted from the amount the beneficiary receives.",
  },
  {
    value: "DEBT",
    label: "Remitter pays (DEBT)",
    helper: "You pay all charges and the beneficiary receives the full amount.",
  },
]

const BIC_PATTERN = /^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/

// BOP / BTFN trade payments are out of scope for the August build. The flow is
// kept in code (data, validation, preview) but gated off so it does not render.
// Flip to true to bring it back for a later phase.
const BOP_ENABLED = false

function countryLabel(code?: string): string {
  if (!code) return ""
  const country = COUNTRIES.find((c) => c.code === code)
  return country ? `${country.name} (${country.code})` : code
}

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <InterbankEntry />
    </React.Suspense>
  )
}

/** Keyed on the ?new= param so "Make Another Transfer" fully resets the wizard. */
function InterbankEntry() {
  const searchParams = useSearchParams()
  return <InterbankWizard key={searchParams.get("new") ?? "initial"} />
}

function InterbankWizard() {
  const submitTask = useAppStore((s) => s.submitTask)
  const tasks = useAppStore((s) => s.tasks)
  const storeBeneficiaries = useAppStore((s) => s.beneficiaries)

  const [tab, setTab] = React.useState<"make" | "drafts">("make")
  const [step, setStep] = React.useState(0)
  // Step 0 (Input) is two sub-screens: 0 = pre-validation (routing + amount),
  // 1 = the corridor detail form. Preview/Submit keep step 1/2.
  const [inputScreen, setInputScreen] = React.useState<0 | 1>(0)
  const [sourceId, setSourceId] = React.useState<string>()
  const [destCcy, setDestCcy] = React.useState<string>()
  const [destCountry, setDestCountry] = React.useState<string>()
  const [amount, setAmount] = React.useState("")
  const [chargeBearer, setChargeBearer] = React.useState<ChargeBearer>("SHAR")
  const [benBankBic, setBenBankBic] = React.useState("")
  // LOCAL-rail beneficiary bank KYC block
  const [benAlias, setBenAlias] = React.useState("")
  const [benBankAccountType, setBenBankAccountType] =
    React.useState<string>("Current Account")
  const [benBankCode, setBenBankCode] = React.useState("")
  const [benContact, setBenContact] = React.useState("")
  const [benEmail, setBenEmail] = React.useState("")
  const [benIdType, setBenIdType] = React.useState<string>("Passport")
  const [benIdNumber, setBenIdNumber] = React.useState("")
  const [benRelationship, setBenRelationship] = React.useState<string>("Supplier")
  const [intermediaryBic, setIntermediaryBic] = React.useState("")
  const [benType, setBenType] = React.useState<"Corporate" | "Individual">(
    "Corporate"
  )
  const [benName, setBenName] = React.useState("")
  const [benAccount, setBenAccount] = React.useState("")
  const [benStreet, setBenStreet] = React.useState("")
  const [benTown, setBenTown] = React.useState("")
  const [benState, setBenState] = React.useState("")
  const [benCountry, setBenCountry] = React.useState<string>()
  const [benPostcode, setBenPostcode] = React.useState("")
  const [purpose, setPurpose] = React.useState<string>()
  const [remittance, setRemittance] = React.useState("")
  const [rate, setRate] = React.useState<number>()
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [result, setResult] = React.useState<{
    id: string
    submittedAt: string
  }>()
  const [benModalOpen, setBenModalOpen] = React.useState(false)
  const [drafts, setDrafts] = React.useState<DemoDraft[]>(DEMO_DRAFTS)
  // BOP / BTFN trade-payment block
  const [isBop, setIsBop] = React.useState(false)
  const [tradeType, setTradeType] = React.useState<string>()
  const [btfnRef, setBtfnRef] = React.useState("")
  const [invoiceId, setInvoiceId] = React.useState<string>()
  const [declarationNumber, setDeclarationNumber] = React.useState("")

  const source = sourceId ? getWallet(sourceId) : undefined

  // PFX-109: same currency, BTN→FCY, USD→FCY only. An SGD source can only
  // send SGD, so it can never send BTN — the option simply is not offered.
  const currencyOptions = source
    ? allowedDestinationCurrencies(source.currency)
    : []
  const countryOptions = destCcy ? getCountriesForCurrency(destCcy) : []

  React.useEffect(() => {
    if (!source) return
    const options = allowedDestinationCurrencies(source.currency)
    if (destCcy && options.includes(destCcy)) return
    // The destination currency is no longer payable from this source (e.g. an
    // SGD source can only send SGD). Reset the whole destination so a selected
    // beneficiary can't sit under a mismatched corridor.
    setDestCcy(source.currency)
    setDestCountry(undefined)
    setBenName("")
    setBenAccount("")
    setBenStreet("")
    setBenTown("")
    setBenPostcode("")
    setBenBankBic("")
    setBenAlias("")
    setBenBankCode("")
    setBenContact("")
    setBenEmail("")
    setBenIdNumber("")
  }, [source, destCcy])

  React.useEffect(() => {
    if (!destCcy) return
    const options = getCountriesForCurrency(destCcy)
    setDestCountry((prev) => {
      if (prev && options.some((c) => c.code === prev)) return prev
      return options.length === 1 ? options[0].code : undefined
    })
  }, [destCcy])

  const corridor =
    destCcy && destCountry ? resolveCorridor(destCcy, destCountry) : undefined
  const rail = corridor?.payoutMethod
  const isSwift = rail === "SWIFT"
  const needsState = destCountry === "AU" || destCountry === "US"

  // Purpose codes are rail-specific — clear a selection the new rail does not offer.
  React.useEffect(() => {
    if (!rail) return
    setPurpose((prev) =>
      prev && getPurposeCodes(rail).some((p) => p.code === prev)
        ? prev
        : undefined
    )
  }, [rail])

  // Follow the destination country whenever it changes — the beneficiary
  // address country stays editable but never silently lags a corridor switch.
  React.useEffect(() => {
    if (destCountry) setBenCountry(destCountry)
  }, [destCountry])

  const isFx = !!source && !!destCcy && source.currency !== destCcy
  const fee =
    source && destCcy
      ? computeFee("interbank", source.currency, destCcy, destCountry)
      : undefined
  const externalFee =
    source && rail === "SWIFT"
      ? computeExternalFee(rail, source.currency)
      : undefined
  const amountNum = Number(amount || 0)
  const feeInSource =
    fee && source && fee.currency === source.currency ? fee.amount : 0

  const sourceError = !sourceId ? "Select a source account" : undefined
  const destCcyError = !destCcy ? "Select a destination currency" : undefined
  const destCountryError = !destCountry
    ? "Select a destination country"
    : undefined
  const amountError =
    !amount || amountNum <= 0
      ? "Enter an amount greater than zero"
      : source && amountNum + feeInSource > source.balance
        ? "Amount plus the transfer fee exceeds the available balance"
        : undefined
  const benBankBicError = !isSwift
    ? undefined
    : !benBankBic.trim()
      ? "Enter the beneficiary bank BIC"
      : !BIC_PATTERN.test(benBankBic.trim())
        ? "Enter an 8 or 11 character BIC"
        : undefined
  const isLocal = rail === "LOCAL"
  const benAliasError =
    isLocal && !benAlias.trim() ? "Enter the beneficiary alias" : undefined
  const benBankCodeError =
    isLocal && !benBankCode.trim() ? "Enter the beneficiary bank code" : undefined
  const benContactError =
    isLocal && !benContact.trim() ? "Enter the contact number" : undefined
  const benEmailError =
    isLocal && !benEmail.trim() ? "Enter the email" : undefined
  const benIdNumberError =
    isLocal && !benIdNumber.trim()
      ? "Enter the identification number"
      : undefined
  const bicError =
    isSwift && intermediaryBic.trim() && !BIC_PATTERN.test(intermediaryBic.trim())
      ? "Enter an 8 or 11 character BIC"
      : undefined
  const benNameError = !benName.trim() ? "Enter the beneficiary name" : undefined
  const benAccountError = !benAccount.trim()
    ? "Enter the beneficiary account number"
    : undefined
  const benStreetError = !benStreet.trim() ? "Enter the street" : undefined
  const benTownError = !benTown.trim() ? "Enter the town" : undefined
  const benStateError =
    needsState && !benState.trim() ? "Enter the state or province" : undefined
  const benCountryError = !benCountry
    ? "Select the beneficiary country"
    : undefined
  const purposeError = !purpose ? "Select a purpose of payment" : undefined
  const remittanceError = !remittance.trim()
    ? "Enter remittance information"
    : undefined
  const tradeTypeError = isBop && !tradeType ? "Select the trade type" : undefined
  const btfnRefError =
    isBop && !btfnRef.trim() ? "Enter the BTFN App Ref No." : undefined
  const invoiceError = isBop && !invoiceId ? "Select an invoice" : undefined
  const declarationError =
    isBop && !declarationNumber.trim()
      ? "Enter the declaration number"
      : undefined
  const selectedInvoice = BTFN_INVOICES.find((inv) => inv.id === invoiceId)

  const dupRemittance = isDuplicateReference(tasks, remittance)

  const showError = (key: string, error?: string) =>
    touched[key] ? error : undefined
  const markTouched = (key: string) =>
    setTouched((t) => ({ ...t, [key]: true }))

  // Pre-validation screen -> corridor detail screen. Only the routing basics
  // are checked here; the full beneficiary/fee fields are validated on Next.
  const nextToDetail = () => {
    setTouched((t) => ({
      ...t,
      source: true,
      destCcy: true,
      destCountry: true,
      benAccount: true,
      amount: true,
    }))
    if (
      sourceError ||
      destCcyError ||
      destCountryError ||
      benAccountError ||
      amountError
    ) {
      return
    }
    setInputScreen(1)
  }

  const next = () => {
    setTouched({
      source: true,
      destCcy: true,
      destCountry: true,
      amount: true,
      benBankBic: true,
      bic: true,
      benName: true,
      benAccount: true,
      benStreet: true,
      benTown: true,
      benState: true,
      benCountry: true,
      purpose: true,
      remittance: true,
      tradeType: true,
      btfnRef: true,
      invoice: true,
      declaration: true,
      benAlias: true,
      benBankCode: true,
      benContact: true,
      benEmail: true,
      benIdNumber: true,
    })
    if (
      sourceError ||
      destCcyError ||
      destCountryError ||
      amountError ||
      benBankBicError ||
      bicError ||
      benNameError ||
      benAccountError ||
      benStreetError ||
      benTownError ||
      benStateError ||
      benCountryError ||
      purposeError ||
      remittanceError ||
      tradeTypeError ||
      btfnRefError ||
      invoiceError ||
      declarationError ||
      benAliasError ||
      benBankCodeError ||
      benContactError ||
      benEmailError ||
      benIdNumberError
    ) {
      return
    }
    setStep(1)
  }

  const purposeLabel =
    rail && purpose
      ? getPurposeCodes(rail).find((p) => p.code === purpose)?.label
      : undefined
  const chargeBearerLabel = CHARGE_BEARER_OPTIONS.find(
    (o) => o.value === chargeBearer
  )?.label
  const chargeBearerHelper = CHARGE_BEARER_OPTIONS.find(
    (o) => o.value === chargeBearer
  )?.helper

  const destAmount =
    isFx && rate && destCcy
      ? Number((amountNum * rate).toFixed(decimalsFor(destCcy)))
      : amountNum

  // Charge bearer decides the debit and what the beneficiary receives. It only
  // varies on SWIFT; other rails debit the DK fee separately (SHAR-equivalent).
  const payoutFeeInSource = externalFee ? externalFee.amount : 0
  const settlement =
    source && destCcy
      ? applySettlement({
          sourceAmount: amountNum,
          dkFee: feeInSource,
          payoutFee: payoutFeeInSource,
          rate: isFx && rate ? rate : 1,
          chargeBearer: isSwift ? chargeBearer : "SHAR",
          sourceCurrency: source.currency,
          destCurrency: destCcy,
        })
      : undefined
  const recipientReceives = settlement?.beneficiaryReceives ?? destAmount
  const totalDebit = settlement?.totalDebit ?? amountNum + feeInSource

  const submit = () => {
    if (!source || !destCcy || !destCountry || !rail) return
    const task = submitTask({
      type: "interbank",
      fromAccount: source.accountNumber,
      sourceCurrency: source.currency,
      sourceAmount: amountNum,
      toName: benName.trim(),
      toAccount: benAccount.trim(),
      destinationCurrency: destCcy,
      destinationAmount: recipientReceives,
      destinationCountry: destCountry,
      payoutMethod: rail,
      rate: isFx ? rate : undefined,
      fee,
      chargeBearer: isSwift ? chargeBearer : undefined,
      purpose: purposeLabel,
      reference: remittance.trim(),
      beneficiaryBank: isSwift
        ? benBankBic.trim().toUpperCase()
        : benBankCode.trim() || undefined,
    })
    setResult({ id: task.id, submittedAt: task.submittedAt })
    setStep(2)
  }

  /** Store beneficiaries already include the seeds; the merge keeps the modal
   * working even if an older persisted session predates a seed change. */
  const allBeneficiaries = React.useMemo(() => {
    const seen = new Set<string>()
    return [...storeBeneficiaries, ...SEED_BENEFICIARIES].filter((b) => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
  }, [storeBeneficiaries])

  /** Confirm in the search modal fills the whole destination from the chosen
   * beneficiary — account, name, address, and the corridor (currency + country)
   * when the source can send that currency. Everything is set from the
   * beneficiary's own attributes so switching to a different one fully updates. */
  const applyBeneficiary = (b: MockBeneficiary) => {
    setBenType(b.accountType)
    setBenName(b.name)
    setBenAccount(b.accountNumber)
    setBenStreet(b.street ?? "")
    setBenTown(b.town ?? "")
    setBenPostcode(b.postcode ?? "")
    setBenCountry(b.destinationCountry)
    setBenBankBic(b.swiftCode ?? "")
    setBenAlias(b.alias ?? "")
    setBenBankAccountType(b.bankAccountType ?? "Current Account")
    setBenBankCode(b.bankCode ?? "")
    setBenContact(b.contact ?? "")
    setBenEmail(b.email ?? "")
    setBenIdType(b.idType ?? "Passport")
    setBenIdNumber(b.idNumber ?? "")
    setBenRelationship(b.relationship ?? "Supplier")
    // Follow the beneficiary's corridor when the source supports the currency;
    // otherwise leave it for the user (that beneficiary is not payable here).
    if (
      source &&
      allowedDestinationCurrencies(source.currency).includes(b.destinationCurrency)
    ) {
      setDestCcy(b.destinationCurrency)
      setDestCountry(b.destinationCountry)
    }
  }

  const saveDraft = () => {
    setDrafts((prev) => [
      {
        id: `draft-${Date.now()}`,
        sourceAccount: source?.accountNumber ?? "—",
        walletId: sourceId ?? "",
        beneficiaryName: benName.trim() || "—",
        destinationAccount: benAccount.trim() || "—",
        amount: amountNum > 0 ? amountNum : undefined,
        currency: source?.currency ?? "—",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    toast.success("Draft saved for this session · see Saved Transfer Draft")
  }

  const resumeDraft = (draft: DemoDraft) => {
    setSourceId(draft.walletId)
    setDestCcy(draft.currency)
    setBenName(draft.beneficiaryName)
    setBenAccount(draft.destinationAccount)
    setAmount(draft.amount != null ? String(draft.amount) : "")
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

  const copyTaskId = () => {
    if (!result) return
    void navigator.clipboard.writeText(result.id).then(() => {
      toast.success("Task ID copied")
    })
  }

  const walletOptions = WALLETS.map((w) => ({
    value: w.id,
    label: `${w.accountNumber}-${w.currency}`,
  }))
  const purposeOptions = getPurposeCodes(rail ?? "SWIFT").map((p) => ({
    value: p.code,
    label: p.label,
    hint: p.code,
  }))

  const showFooter = tab === "make" && step < 2

  return (
    <PageShell
      title="Interbank Transfer"
      className={cn("mt-10", showFooter ? "pb-[144px]" : "pb-20")}
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
        <div className="mt-10">
          <BuildNote
            en="Saved Transfer Draft is a demo-only list kept in this browser session. No draft API endpoint exists in the payment contract, so Save Draft does not call the backend."
            zh="转账草稿为演示功能，仅保存在当前浏览器会话中。支付接口契约中没有草稿相关端点，Save Draft 不会调用后端。"
            tbd
          >
            <DraftsTable
              drafts={drafts}
              onResume={resumeDraft}
              onDelete={deleteDraft}
            />
          </BuildNote>
        </div>
      )}

      {tab === "make" && (
        <>
          <StepperBand current={step} />

          {step === 0 && inputScreen === 0 && (
            <div className="mt-10 flex flex-col gap-10">
              <div className="flex justify-between gap-4">
                <FormSection title="From" className="w-[520px]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <FieldBox
                        variant="select"
                        label="Select Source Account"
                        required
                        className="min-w-0 flex-1"
                        value={sourceId}
                        options={walletOptions}
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
                        className="w-[160px] shrink-0"
                      />
                    </div>
                    {source && (
                      <MetaLine
                        label="Available Balance"
                        value={formatMoney(source.balance, source.currency)}
                      />
                    )}
                  </div>
                </FormSection>

                <FormSection
                  title="To"
                  className="w-[520px]"
                  action={
                    <FormSectionLink
                      icon={UsersRound}
                      onClick={() => setBenModalOpen(true)}
                    >
                      Select a Beneficiary
                    </FormSectionLink>
                  }
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-2">
                      <div
                        className="min-w-0 flex-1"
                        onBlurCapture={() => markTouched("benAccount")}
                      >
                        <FieldBox
                          label="Select Destination Account"
                          required
                          value={benAccount}
                          placeholder="Enter or pick a beneficiary account"
                          onChange={setBenAccount}
                          error={showError("benAccount", benAccountError)}
                        />
                      </div>
                      <FieldCombobox
                        label="Currency"
                        required
                        className="w-[160px] shrink-0"
                        options={currencyOptions.map((c) => ({
                          value: c,
                          label: c,
                        }))}
                        value={destCcy}
                        onChange={(c) => {
                          setDestCcy(c)
                          markTouched("destCcy")
                        }}
                        disabled={!source}
                        error={showError("destCcy", destCcyError)}
                        searchPlaceholder="Search currencies"
                      />
                    </div>
                    <FieldCombobox
                      label="Destination Country"
                      required
                      options={countryOptions.map((c) => ({
                        value: c.code,
                        label: `${c.name} (${c.code})`,
                      }))}
                      value={destCountry}
                      onChange={(c) => {
                        setDestCountry(c)
                        markTouched("destCountry")
                      }}
                      disabled={!destCcy}
                      error={showError("destCountry", destCountryError)}
                      searchPlaceholder="Search countries"
                    />
                  </div>
                </FormSection>
              </div>

              <FormSection title="Amount">
                <div className="flex flex-col gap-4">
                  <div onBlurCapture={() => markTouched("amount")}>
                    <AmountRow
                      label="You Send"
                      currency={source?.currency ?? "—"}
                      value={amount}
                      onChange={setAmount}
                      disabled={!source}
                      placeholder="0"
                      error={showError("amount", amountError)}
                    />
                  </div>
                  {isFx && source && destCcy && (
                    <RateRow
                      sourceCurrency={source.currency}
                      destinationCurrency={destCcy}
                      sourceAmount={amountNum > 0 ? amountNum : 0}
                      onQuote={(q) => setRate(q.rate)}
                    />
                  )}
                  <AmountRow
                    label="Recipient Receives"
                    currency={destCcy ?? "—"}
                    value={amount === "" ? "" : String(recipientReceives)}
                    readOnly
                  />
                </div>
              </FormSection>

            </div>
          )}

          {step === 0 && inputScreen === 1 && (
            <div className="mt-10 flex flex-col gap-10">
              <FormSection title="Transfer Details">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <FieldBox
                      variant="select"
                      label="Source Account"
                      required
                      disabled
                      filled={!!sourceId}
                      value={sourceId}
                      options={walletOptions}
                      onValueChange={(id) => {
                        setSourceId(id)
                        markTouched("source")
                      }}
                      error={showError("source", sourceError)}
                    />
                    {source && (
                      <MetaLine
                        label="Available Balance"
                        value={formatMoney(source.balance, source.currency)}
                      />
                    )}
                  </div>

                  <BuildNote
                    en="An interbank transfer allows the same currency, BTN to foreign currency, and USD to foreign currency (PFX-109). A source in any other currency can only send that same currency. Destination countries are limited to countries with a corridor for the chosen currency."
                    zh="跨行转账允许同币种、BTN 转外币、以及 USD 转外币（PFX-109）。其他币种的账户只能以同币种付款。目标国家仅限所选币种有通道支持的国家。"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="grid grid-cols-2 gap-4">
                        <FieldCombobox
                          label="Destination Currency"
                          required
                          filled
                          options={currencyOptions.map((c) => ({
                            value: c,
                            label: c,
                          }))}
                          value={destCcy}
                          onChange={(c) => {
                            setDestCcy(c)
                            markTouched("destCcy")
                          }}
                          disabled
                          error={showError("destCcy", destCcyError)}
                          searchPlaceholder="Search currencies"
                        />
                        <FieldCombobox
                          label="Destination Country"
                          required
                          filled
                          options={countryOptions.map((c) => ({
                            value: c.code,
                            label: `${c.name} (${c.code})`,
                          }))}
                          value={destCountry}
                          onChange={(c) => {
                            setDestCountry(c)
                            markTouched("destCountry")
                          }}
                          disabled
                          error={showError("destCountry", destCountryError)}
                          searchPlaceholder="Search countries"
                        />
                      </div>
                    </div>
                  </BuildNote>

                  {corridor && (
                    <BuildNote
                      en="The payout method and estimated delivery resolve automatically from the destination currency and country. LOCAL is preferred over SWIFT when both rails are available."
                      zh="付款方式和预计到账时间根据目标币种和目标国家自动解析。当 LOCAL 和 SWIFT 都可用时优先 LOCAL。"
                      api="GET /clients/{clientNo}/corridors"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Payout Method"
                          required
                          value={corridor.payoutMethod}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Estimated Delivery"
                          required
                          value={corridor.delivery}
                        />
                      </div>
                    </BuildNote>
                  )}
                </div>
              </FormSection>

              <FormSection title="Amount">
                <div className="flex flex-col gap-4">
                  <div onBlurCapture={() => markTouched("amount")}>
                    <AmountRow
                      label="You Send"
                      currency={source?.currency ?? "—"}
                      value={amount}
                      onChange={setAmount}
                      disabled={!source}
                      placeholder="0"
                      error={showError("amount", amountError)}
                    />
                  </div>

                  {isFx && source && destCcy && (
                    <RateRow
                      sourceCurrency={source.currency}
                      destinationCurrency={destCcy}
                      sourceAmount={amountNum > 0 ? amountNum : 0}
                      onQuote={(q) => setRate(q.rate)}
                    />
                  )}

                  <AmountRow
                    label="Recipient Receives"
                    currency={destCcy ?? "—"}
                    value={amount === "" ? "" : String(recipientReceives)}
                    readOnly
                  />

                  {isSwift && (
                    <BuildNote
                      en="Charge bearer applies to SWIFT payouts only, with values `SHAR`, `CRED` and `DEBT` (PFX-59). It is hidden on LOCAL and BOOK rails."
                      zh="费用承担方仅适用于 SWIFT 付款，取值 `SHAR`、`CRED`、`DEBT`（PFX-59）。LOCAL 和 BOOK 通道不显示该选项。"
                    >
                      <FieldBox
                        variant="select"
                        label="Fee Charge Type"
                        required
                        value={chargeBearer}
                        options={CHARGE_BEARER_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                        onValueChange={(v) =>
                          setChargeBearer(v as ChargeBearer)
                        }
                        hint={chargeBearerHelper}
                      />
                    </BuildNote>
                  )}
                </div>
              </FormSection>

              {BOP_ENABLED && (
              <BuildNote
                en="Balance of Payments (BOP) applies to FCY trade payments from Bhutan- and GMC-registered companies. The customer enters the BTFN App Ref, the portal pulls the linked invoices from BTFN, and the payment is validated against the selected invoice (approval status, amount, unpaid balance)."
                zh="国际收支申报（BOP）适用于不丹和 GMC 注册公司的外币贸易付款。客户输入 BTFN 申请编号，系统从 BTFN 门户拉取关联发票，并对所选发票进行校验（审批状态、金额、未付余额）。"
                api="BTFN portal enquiry"
              >
                <FormSection
                  title="BOP"
                  action={
                    <label className="flex shrink-0 items-center gap-2 text-sm leading-[22px] text-ink90">
                      Trade payment
                      <Switch checked={isBop} onCheckedChange={setIsBop} />
                    </label>
                  }
                >
                  {isBop ? (
                    <div className="grid grid-cols-2 gap-4">
                      <FieldBox
                        variant="select"
                        label="Trade Type"
                        required
                        value={tradeType}
                        options={TRADE_TYPES.map((t) => ({ value: t, label: t }))}
                        onValueChange={(v) => {
                          setTradeType(v)
                          markTouched("tradeType")
                        }}
                        error={showError("tradeType", tradeTypeError)}
                      />
                      <div onBlurCapture={() => markTouched("btfnRef")}>
                        <FieldBox
                          label="BTFN App Ref No."
                          required
                          value={btfnRef}
                          placeholder="e.g. 100-0005"
                          onChange={setBtfnRef}
                          error={showError("btfnRef", btfnRefError)}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-[22px] text-ink40">
                      Turn on Trade payment to declare a BOP FCY trade payment
                      against BTFN invoices.
                    </p>
                  )}
                </FormSection>
              </BuildNote>
              )}

              {isBop && btfnRef.trim() && (
                <FormSection title="Invoices">
                  <div className="flex flex-col gap-1">
                    <div className="overflow-x-auto rounded-[8px] border-[0.5px] border-field-line">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-field-line hover:bg-transparent">
                            <TableHead className={TH_CLS}>Select</TableHead>
                            <TableHead className={TH_CLS}>Invoice ID</TableHead>
                            <TableHead className={TH_CLS}>Importer TPN</TableHead>
                            <TableHead className={TH_CLS}>Invoice Currency</TableHead>
                            <TableHead className={`${TH_CLS} text-right`}>
                              Invoice Amount
                            </TableHead>
                            <TableHead className={`${TH_CLS} text-right`}>
                              Pending Amount
                            </TableHead>
                            <TableHead className={TH_CLS}>
                              Good Declaration Number
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {BTFN_INVOICES.map((inv) => (
                            <TableRow
                              key={inv.id}
                              onClick={() => {
                                setInvoiceId(inv.id)
                                markTouched("invoice")
                              }}
                              className="cursor-pointer border-field-line"
                            >
                              <TableCell className={TD_CLS}>
                                <input
                                  type="radio"
                                  name="btfn-invoice"
                                  aria-label={`Select invoice ${inv.id}`}
                                  checked={invoiceId === inv.id}
                                  onChange={() => setInvoiceId(inv.id)}
                                  className="size-4 accent-navy"
                                />
                              </TableCell>
                              <TableCell className={`${TD_CLS} tabular-nums`}>
                                {inv.id}
                              </TableCell>
                              <TableCell className={TD_CLS}>
                                {inv.importerTpn}
                              </TableCell>
                              <TableCell className={TD_CLS}>
                                {inv.currency}
                              </TableCell>
                              <TableCell
                                className={`${TD_CLS} text-right tabular-nums`}
                              >
                                {formatNumber(inv.amount, inv.currency)}
                              </TableCell>
                              <TableCell
                                className={`${TD_CLS} text-right tabular-nums`}
                              >
                                {formatNumber(inv.pending, inv.currency)}
                              </TableCell>
                              <TableCell className={`${TD_CLS} tabular-nums`}>
                                {inv.declarationNumber}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {showError("invoice", invoiceError) && (
                      <p className="text-xs leading-5 text-error-red">
                        {invoiceError}
                      </p>
                    )}
                  </div>
                </FormSection>
              )}

              {isBop && (
                <FormSection title="Declaration">
                  <div
                    className="grid grid-cols-2 gap-4"
                    onBlurCapture={() => markTouched("declaration")}
                  >
                    <FieldBox
                      label="Declaration Number"
                      required
                      value={declarationNumber}
                      placeholder="e.g. DECL-22026-001"
                      onChange={setDeclarationNumber}
                      error={showError("declaration", declarationError)}
                    />
                  </div>
                </FormSection>
              )}

              <FormSection
                title="Beneficiary Details"
                action={
                  <FormSectionLink
                    icon={UsersRound}
                    onClick={() => setBenModalOpen(true)}
                  >
                    Select a Beneficiary
                  </FormSectionLink>
                }
              >
                <div className="flex flex-col gap-4">
                  <FieldBox
                    variant="select"
                    label="Account Type"
                    required
                    value={benType}
                    options={[
                      { value: "Corporate", label: "Corporate" },
                      { value: "Individual", label: "Individual" },
                    ]}
                    onValueChange={(v) =>
                      setBenType(v as "Corporate" | "Individual")
                    }
                  />

                  <div onBlurCapture={() => markTouched("benName")}>
                    <FieldBox
                      label="Beneficiary Name"
                      required
                      value={benName}
                      placeholder="Full legal name"
                      onChange={(v) => setBenName(v.slice(0, 140))}
                      error={showError("benName", benNameError)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div onBlurCapture={() => markTouched("benStreet")}>
                      <FieldBox
                        label="Street"
                        required
                        value={benStreet}
                        onChange={setBenStreet}
                        error={showError("benStreet", benStreetError)}
                      />
                    </div>
                    <div onBlurCapture={() => markTouched("benTown")}>
                      <FieldBox
                        label="Town"
                        required
                        value={benTown}
                        onChange={setBenTown}
                        error={showError("benTown", benTownError)}
                      />
                    </div>
                  </div>

                  {needsState && (
                    <div className="grid grid-cols-2 gap-4">
                      <div onBlurCapture={() => markTouched("benState")}>
                        <FieldBox
                          label="State or Province"
                          required
                          value={benState}
                          placeholder="Required for AU and US corridors"
                          onChange={setBenState}
                          error={showError("benState", benStateError)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FieldCombobox
                      label="Country"
                      required
                      options={COUNTRIES.map((c) => ({
                        value: c.code,
                        label: `${c.name} (${c.code})`,
                      }))}
                      value={benCountry}
                      onChange={(c) => {
                        setBenCountry(c)
                        markTouched("benCountry")
                      }}
                      error={showError("benCountry", benCountryError)}
                      searchPlaceholder="Search countries"
                    />
                    <BuildNote
                      en="The postcode is optional in the payment API contract (`address.postcode`)."
                      zh="邮编在支付 API 契约中为可选字段（`address.postcode`）。"
                    >
                      <div onBlurCapture={() => markTouched("benPostcode")}>
                        <FieldBox
                          label="Postcode (Optional)"
                          value={benPostcode}
                          onChange={(v) => setBenPostcode(v.slice(0, 12))}
                        />
                      </div>
                    </BuildNote>
                  </div>

                  <div onBlurCapture={() => markTouched("benAccount")}>
                    <FieldBox
                      label="Account Number"
                      required
                      value={benAccount}
                      placeholder="IBAN or local account number"
                      onChange={(v) => setBenAccount(v.slice(0, 34))}
                      error={showError("benAccount", benAccountError)}
                    />
                  </div>

                  {isSwift && (
                    <BuildNote
                      en="The beneficiary bank is identified by its SWIFT/BIC on SWIFT payouts (`bank.swiftCode`, required)."
                      zh="SWIFT 付款通过收款银行的 SWIFT/BIC 识别收款行（`bank.swiftCode`，必填）。"
                      api="POST /clients/{clientNo}/beneficiaries"
                    >
                      <div onBlurCapture={() => markTouched("benBankBic")}>
                        <FieldBox
                          label="Beneficiary Bank BIC"
                          required
                          value={benBankBic}
                          placeholder="8 or 11 characters, e.g. DBSSSGSG"
                          onChange={(v) =>
                            setBenBankBic(v.toUpperCase().slice(0, 11))
                          }
                          error={showError("benBankBic", benBankBicError)}
                        />
                      </div>
                    </BuildNote>
                  )}
                </div>
              </FormSection>

              {rail === "LOCAL" && (
                <FormSection title="Beneficiary Bank">
                  <BuildNote
                    en="LOCAL payouts route by local bank code and collect the beneficiary KYC block (contact, identification, relationship). SWIFT/BIC is not used on this rail."
                    zh="LOCAL 付款按本地清算行代码路由，并采集收款人 KYC 信息（联系方式、证件、关系）。该通道不使用 SWIFT/BIC。"
                    api="POST /clients/{clientNo}/beneficiaries"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div onBlurCapture={() => markTouched("benAlias")}>
                          <FieldBox
                            label="Beneficiary Alias"
                            required
                            value={benAlias}
                            onChange={setBenAlias}
                            error={showError("benAlias", benAliasError)}
                          />
                        </div>
                        <FieldBox
                          variant="select"
                          label="Beneficiary Bank Account Type"
                          required
                          value={benBankAccountType}
                          options={BANK_ACCOUNT_TYPES.map((t) => ({
                            value: t,
                            label: t,
                          }))}
                          onValueChange={setBenBankAccountType}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div onBlurCapture={() => markTouched("benBankCode")}>
                          <FieldBox
                            label="Beneficiary Bank Code"
                            required
                            value={benBankCode}
                            onChange={setBenBankCode}
                            error={showError("benBankCode", benBankCodeError)}
                          />
                        </div>
                        <div onBlurCapture={() => markTouched("benContact")}>
                          <FieldBox
                            label="Beneficiary Contact Number"
                            required
                            value={benContact}
                            onChange={setBenContact}
                            error={showError("benContact", benContactError)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div onBlurCapture={() => markTouched("benEmail")}>
                          <FieldBox
                            label="Beneficiary Email"
                            required
                            value={benEmail}
                            onChange={setBenEmail}
                            error={showError("benEmail", benEmailError)}
                          />
                        </div>
                        <FieldBox
                          variant="select"
                          label="Beneficiary Identification Type"
                          required
                          value={benIdType}
                          options={ID_TYPES.map((t) => ({ value: t, label: t }))}
                          onValueChange={setBenIdType}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div onBlurCapture={() => markTouched("benIdNumber")}>
                          <FieldBox
                            label="Beneficiary Identification Number"
                            required
                            value={benIdNumber}
                            onChange={setBenIdNumber}
                            error={showError("benIdNumber", benIdNumberError)}
                          />
                        </div>
                        <FieldBox
                          variant="select"
                          label="Remitter Beneficiary Relationship"
                          required
                          value={benRelationship}
                          options={BENEFICIARY_RELATIONSHIPS.map((t) => ({
                            value: t,
                            label: t,
                          }))}
                          onValueChange={setBenRelationship}
                        />
                      </div>
                    </div>
                  </BuildNote>
                </FormSection>
              )}

              {isSwift && (
                <FormSection title="Intermediary Bank">
                  <BuildNote
                    en="The intermediary bank BIC is optional and applies to SWIFT payouts only (`additionalData.intermediaryBankSwiftCode`, MT103 field 56)."
                    zh="中转行 BIC 为可选项，仅适用于 SWIFT 付款（`additionalData.intermediaryBankSwiftCode`，MT103 第 56 域）。"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div onBlurCapture={() => markTouched("bic")}>
                        <FieldBox
                          label="Intermediary Bank BIC (Optional)"
                          value={intermediaryBic}
                          placeholder="8 or 11 characters, e.g. CHASUS33"
                          onChange={(v) =>
                            setIntermediaryBic(v.toUpperCase().slice(0, 11))
                          }
                          error={showError("bic", bicError)}
                        />
                      </div>
                    </div>
                  </BuildNote>
                </FormSection>
              )}

              {fee && (
                <FormSection title="Fees">
                  <BuildNote
                    en="The DK fee category follows the PFX-18 logic. When the debit account is INR or BTN and the payout is INR it is Category B, BTN to BTN domestic payments are Category C (no fee), all other interbank transfers are Category D, charged in the debit currency. SWIFT payouts also carry a correspondent payout fee (the hasExternalFee flag), set by the correspondent bank."
                    zh="DK 费用类别遵循 PFX-18 逻辑。当扣款账户为 INR 或 BTN 且付款币种为 INR 时为 B 类，BTN 至 BTN 境内付款为 C 类（免费），其余跨行转账为 D 类，以扣款币种计收。SWIFT 付款还包含由代理行收取的付款费（hasExternalFee 标志）。"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <AmountRow
                          label="Transaction Fees"
                          currency={fee.currency}
                          value={String(fee.amount)}
                          readOnly
                        />
                        <FeeCategoryHint fee={fee} />
                      </div>
                      {externalFee && (
                        <div className="flex flex-col gap-1">
                          <AmountRow
                            label="Payout Fees"
                            currency={externalFee.currency}
                            value={String(externalFee.amount)}
                            readOnly
                          />
                          <ExternalFeeHint fee={externalFee} />
                        </div>
                      )}
                    </div>
                  </BuildNote>
                </FormSection>
              )}

              <FormSection title="Transfer Information">
                <div className="flex flex-col gap-4">
                  <BuildNote
                    en="Purpose codes are rail specific. The LOCAL and BOOK rails share one corporate set and SWIFT has its own. Only corporate purposes are offered."
                    zh="付款用途代码按通道区分。LOCAL 和 BOOK 共用一套企业用途，SWIFT 有独立的一套。仅提供企业用途。"
                    api="GET /purpose-codes"
                  >
                    <FieldBox
                      variant="select"
                      label="Purpose"
                      required
                      value={purpose}
                      options={purposeOptions}
                      onValueChange={(code) => {
                        setPurpose(code)
                        markTouched("purpose")
                      }}
                      disabled={!rail}
                      error={showError("purpose", purposeError)}
                    />
                  </BuildNote>

                  <RemittanceBox
                    label="Remittance Information"
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
                </div>
              </FormSection>
            </div>
          )}

          {step === 1 && source && destCcy && corridor && (
            <div className="mt-10">
              <BuildNote
                en="Submitting creates the transaction with inline beneficiary details. The transaction starts in `initiated` status, is screened, then submitted on the resolved rail."
                zh="提交时携带内联收款人信息创建交易。交易以 `initiated` 状态创建，经筛查后在解析出的通道上提交。"
                api="POST /clients/{clientNo}/transactions"
              >
                <div className="flex flex-col gap-10">
                  <FormSection title="Transfer Details">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Source Account"
                          required
                          value={`${source.accountNumber}-${source.currency}`}
                        />
                        <MetaLine
                          label="Available Balance"
                          value={formatMoney(source.balance, source.currency)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Destination Currency"
                          required
                          value={destCcy}
                        />
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Destination Country"
                          required
                          value={countryLabel(destCountry)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          label="Payout Method"
                          required
                          value={corridor.payoutMethod}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Estimated Delivery"
                          required
                          value={corridor.delivery}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          label="Payout Rail"
                          value={payoutRail(corridor.payoutMethod, destCcy)}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Has External Fee"
                          value={
                            hasExternalFee(corridor.payoutMethod) ? "Yes" : "No"
                          }
                        />
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Amount">
                    <div className="flex flex-col gap-4">
                      <AmountRow
                        currency={source.currency}
                        value={amount}
                        readOnly
                      />
                      {isFx && (
                        <RateRow
                          sourceCurrency={source.currency}
                          destinationCurrency={destCcy}
                          sourceAmount={amountNum}
                          onQuote={(q) => setRate(q.rate)}
                        />
                      )}
                      <AmountRow
                        label="Recipient Receives"
                        currency={destCcy}
                        value={String(recipientReceives)}
                        readOnly
                      />
                      {isSwift && (
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Fee Charge Type"
                          required
                          value={chargeBearerLabel}
                        />
                      )}
                    </div>
                  </FormSection>

                  <FormSection title="Beneficiary Details">
                    <div className="flex flex-col gap-4">
                      <FieldBox
                        variant="readonly"
                        chevron
                        label="Account Type"
                        required
                        value={benType}
                      />
                      <FieldBox
                        variant="readonly"
                        label="Beneficiary Name"
                        required
                        value={benName.trim()}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          label="Street"
                          required
                          value={benStreet.trim()}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Town"
                          required
                          value={benTown.trim()}
                        />
                      </div>
                      {needsState && (
                        <div className="grid grid-cols-2 gap-4">
                          <FieldBox
                            variant="readonly"
                            label="State or Province"
                            required
                            value={benState.trim()}
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Country"
                          required
                          value={countryLabel(benCountry)}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Postcode (Optional)"
                          value={benPostcode.trim()}
                        />
                      </div>
                      <FieldBox
                        variant="readonly"
                        label="Account Number"
                        required
                        value={benAccount.trim()}
                      />
                      {isSwift && (
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Bank BIC"
                          required
                          value={benBankBic.trim().toUpperCase()}
                        />
                      )}
                    </div>
                  </FormSection>

                  {isLocal && (
                    <FormSection title="Beneficiary Bank">
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Alias"
                          required
                          value={benAlias}
                        />
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Beneficiary Bank Account Type"
                          required
                          value={benBankAccountType}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Bank Code"
                          required
                          value={benBankCode}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Contact Number"
                          required
                          value={benContact}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Email"
                          required
                          value={benEmail}
                        />
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Beneficiary Identification Type"
                          required
                          value={benIdType}
                        />
                        <FieldBox
                          variant="readonly"
                          label="Beneficiary Identification Number"
                          required
                          value={benIdNumber}
                        />
                        <FieldBox
                          variant="readonly"
                          chevron
                          label="Remitter Beneficiary Relationship"
                          required
                          value={benRelationship}
                        />
                      </div>
                    </FormSection>
                  )}

                  {isSwift && intermediaryBic.trim() && (
                    <FormSection title="Intermediary Bank">
                      <div className="grid grid-cols-2 gap-4">
                        <FieldBox
                          variant="readonly"
                          label="Intermediary Bank BIC (Optional)"
                          value={intermediaryBic.trim().toUpperCase()}
                        />
                      </div>
                    </FormSection>
                  )}

                  {fee && (
                    <FormSection title="Fees">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <AmountRow
                            label="Transaction Fees"
                            currency={fee.currency}
                            value={String(fee.amount)}
                            readOnly
                          />
                          <FeeCategoryHint fee={fee} />
                        </div>
                        {externalFee && (
                          <div className="flex flex-col gap-1">
                            <AmountRow
                              label="Payout Fees"
                              currency={externalFee.currency}
                              value={String(externalFee.amount)}
                              readOnly
                            />
                            <ExternalFeeHint fee={externalFee} />
                          </div>
                        )}
                        <AmountRow
                          label="Total Debit"
                          currency={source.currency}
                          value={String(totalDebit)}
                          readOnly
                        />
                      </div>
                    </FormSection>
                  )}

                  {isBop && (
                    <FormSection title="BOP">
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldBox
                            variant="readonly"
                            label="Trade Type"
                            required
                            value={tradeType}
                          />
                          <FieldBox
                            variant="readonly"
                            label="BTFN App Ref No."
                            required
                            value={btfnRef.trim()}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FieldBox
                            variant="readonly"
                            label="Invoice ID"
                            required
                            value={selectedInvoice?.id ?? ""}
                          />
                          <FieldBox
                            variant="readonly"
                            label="Declaration Number"
                            required
                            value={declarationNumber.trim()}
                          />
                        </div>
                      </div>
                    </FormSection>
                  )}

                  <FormSection title="Transfer Information">
                    <div className="flex flex-col gap-4">
                      <FieldBox
                        variant="readonly"
                        chevron
                        label="Purpose"
                        required
                        value={purposeLabel}
                      />
                      <RemittanceBox
                        label="Remittance Information"
                        value={remittance.trim()}
                        readOnly
                      />
                    </div>
                  </FormSection>
                </div>
              </BuildNote>
            </div>
          )}

          {step === 2 && result && (
            <div className="flex flex-col items-center gap-3 py-10">
              <CircleCheck
                className="size-20 text-success-teal"
                strokeWidth={1}
              />
              <h2 className="text-center text-xl leading-7 font-semibold text-ink90">
                Your Transaction Has Been Submitted for Approval
              </h2>
              <div className="flex items-center gap-2 text-sm leading-[22px] text-ink60">
                <span>Task ID: {result.id}</span>
                <button
                  type="button"
                  aria-label="Copy task ID"
                  onClick={copyTaskId}
                  className="flex size-4 items-center justify-center text-ink60 transition-colors hover:text-ink90"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <p className="text-sm leading-[22px] text-[rgba(153,153,153,0.6)]">
                Submitted On: {formatAckTime(result.submittedAt)}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Button
                  variant="secondary"
                  render={<Link href="/payments/inquiry" />}
                >
                  View in Payment Inquiry
                </Button>
                <Button
                  render={<Link href={`/payments/interbank?new=${result.id}`} />}
                >
                  Make Another Transfer
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <BeneficiarySearchModal
        open={benModalOpen}
        onOpenChange={setBenModalOpen}
        beneficiaries={allBeneficiaries}
        onConfirm={applyBeneficiary}
      />

      {showFooter && step === 0 && inputScreen === 0 && (
        <FooterActionBar>
          <Button className="min-w-20" onClick={nextToDetail}>
            Next
          </Button>
        </FooterActionBar>
      )}

      {showFooter && step === 0 && inputScreen === 1 && (
        <FooterActionBar
          left={
            <Button
              variant="secondary"
              className="min-w-20"
              onClick={() => setInputScreen(0)}
            >
              Back
            </Button>
          }
        >
          <SaveAsTemplateButton
            getTemplate={() =>
              source
                ? {
                    type: "interbank",
                    fromAccount: source.accountNumber,
                    sourceCurrency: source.currency,
                    toName: benName.trim() || "—",
                    toAccount: benAccount.trim(),
                    destinationCurrency: destCcy ?? source.currency,
                    destinationCountry: destCountry,
                    amount: amountNum > 0 ? amountNum : undefined,
                    purpose: purposeLabel,
                    reference: remittance.trim() || undefined,
                  }
                : null
            }
          />
          <Button variant="secondary" onClick={saveDraft}>
            Save Draft
          </Button>
          <Button className="min-w-20" onClick={next}>
            Next
          </Button>
        </FooterActionBar>
      )}

      {showFooter && step === 1 && (
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
          <Button className="min-w-20" onClick={submit}>
            Submit
          </Button>
        </FooterActionBar>
      )}

    </PageShell>
  )
}
