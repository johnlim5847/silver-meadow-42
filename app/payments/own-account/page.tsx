"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { BuildNote } from "@/components/shared/build-note"
import { AmountRow } from "@/components/shared/figma/amount-row"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
import { FormSection } from "@/components/shared/figma/form-section"
import { MetaLine } from "@/components/shared/figma/meta-line"
import { PageTabs } from "@/components/shared/figma/page-tabs"
import { RateRow } from "@/components/shared/figma/rate-row"
import { StepperBand } from "@/components/shared/figma/stepper-band"
import { PageShell } from "@/components/shell/page-shell"
import { Button } from "@/components/ui/button"
import {
  COMPANY,
  decimalsFor,
  formatMoney,
  getWallet,
  WALLETS,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"

import {
  AckBlock,
  BOOK_PURPOSE_OPTIONS,
  FooterDivider,
  isDuplicateReference,
  ReferenceTextarea,
  SaveDraftButton,
  SaveTemplateButton,
  walletLabel,
  walletOptions,
} from "./wizard-kit"

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <OwnAccountEntry />
    </React.Suspense>
  )
}

/** Keyed on the ?new= param so "Make Another Transfer" fully resets the wizard. */
function OwnAccountEntry() {
  const searchParams = useSearchParams()
  return <OwnAccountWizard key={searchParams.get("new") ?? "initial"} />
}

function OwnAccountWizard() {
  const router = useRouter()
  const submitTask = useAppStore((s) => s.submitTask)
  const tasks = useAppStore((s) => s.tasks)

  const [step, setStep] = React.useState(0)
  const [sourceId, setSourceId] = React.useState<string>()
  const [destId, setDestId] = React.useState<string>()
  const [amount, setAmount] = React.useState("")
  const [purpose, setPurpose] = React.useState<string>()
  const [reference, setReference] = React.useState("")
  const [rate, setRate] = React.useState<number>()
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [result, setResult] = React.useState<{
    id: string
    submittedAt: string
  }>()

  const source = sourceId ? getWallet(sourceId) : undefined
  const dest = destId ? getWallet(destId) : undefined

  // PFX-109 item 1: same currency between own accounts, or FCY into the BTN
  // account for conversion. Disallowed pairs are filtered out, not error-trapped.
  const destOptions = React.useMemo(() => {
    if (!source) return []
    return WALLETS.filter(
      (w) =>
        w.id !== source.id &&
        (w.currency === source.currency ||
          (source.currency !== "BTN" && w.currency === "BTN"))
    )
  }, [source])

  React.useEffect(() => {
    if (destId && !destOptions.some((w) => w.id === destId)) {
      setDestId(undefined)
    }
  }, [destOptions, destId])

  const isFx = !!source && !!dest && source.currency !== dest.currency
  const amountNum = Number(amount || 0)

  const sourceError = !sourceId ? "Select a source account" : undefined
  const destError = !destId
    ? source && destOptions.length === 0
      ? "No eligible destination for this source account"
      : "Select a destination account"
    : undefined
  const amountError =
    !amount || amountNum <= 0
      ? "Enter an amount greater than zero"
      : source && amountNum > source.balance
        ? "Amount exceeds the available balance"
        : undefined
  const purposeError = !purpose ? "Select a purpose of payment" : undefined

  const dupReference = isDuplicateReference(tasks, reference)

  const showError = (key: string, error?: string) =>
    touched[key] ? error : undefined
  const markTouched = (key: string) =>
    setTouched((t) => ({ ...t, [key]: true }))

  const next = () => {
    setTouched({
      source: true,
      dest: true,
      amount: true,
      purpose: true,
      reference: true,
    })
    if (sourceError || destError || amountError || purposeError) return
    setStep(1)
  }

  const purposeLabel = purpose
    ? BOOK_PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label
    : undefined

  const destAmount =
    isFx && rate && dest
      ? Number((amountNum * rate).toFixed(decimalsFor(dest.currency)))
      : amountNum

  const submit = () => {
    if (!source || !dest) return
    const task = submitTask({
      type: "own-account",
      fromAccount: source.accountNumber,
      sourceCurrency: source.currency,
      sourceAmount: amountNum,
      toName: COMPANY.name,
      toAccount: dest.accountNumber,
      destinationCurrency: dest.currency,
      destinationAmount: destAmount,
      payoutMethod: "BOOK",
      rate: isFx ? rate : undefined,
      purpose: purposeLabel,
      reference: reference.trim() || undefined,
    })
    setResult({ id: task.id, submittedAt: task.submittedAt })
    setStep(2)
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

  return (
    <PageShell
      title="Transfer To Own Account"
      className={step < 2 ? "mt-10 pb-[144px]" : "mt-10 pb-20"}
    >
      <PageTabs
        tabs={[{ label: "Make a Transfer", value: "make" }]}
        value="make"
      />
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

            {/* No "Select a Beneficiary" here: own-account destinations are the
                client's own accounts (PFX-109 item 1), not external beneficiaries.
                The Figma frame shows the link, but it does not fit this flow. */}
            <FormSection title="To" className="w-[520px]">
              <div className="flex flex-col gap-2">
                <BuildNote
                  en="A destination is another own account in the same currency, or the BTN account receiving a foreign currency conversion (PFX-109 item 1). Ineligible pairs are not offered. Conversions always settle into BTN."
                  zh="收款账户只能是同币种的另一个本人账户，或接收外币兑换的 BTN 账户（PFX-109 第 1 条）。不符合规则的组合不会出现在选项中。兑换始终以 BTN 结算。"
                  api="POST /fx/conversion-orders"
                >
                  <div className="flex items-start gap-2">
                    <FieldBox
                      variant="select"
                      label="Destination Account"
                      required
                      className="min-w-0 flex-1"
                      options={walletOptions(destOptions)}
                      value={destId}
                      onValueChange={(id) => {
                        setDestId(id)
                        markTouched("dest")
                      }}
                      disabled={!source}
                      hint={
                        source && destOptions.length === 0
                          ? "No eligible destination"
                          : undefined
                      }
                      error={showError("dest", destError)}
                    />
                    <FieldBox
                      variant="readonly"
                      filled={false}
                      label="Currency"
                      value={dest?.currency ?? ""}
                      className="w-[184px] shrink-0"
                    />
                  </div>
                </BuildNote>
                {dest && (
                  <MetaLine label="Beneficiary Name" value={COMPANY.name} />
                )}
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
                  error={showError("amount", amountError)}
                />
              </div>

              {isFx && source && dest && (
                <BuildNote
                  en="The exchange rate section appears only when the source and destination currencies differ. The customer rate is the raw rate less the FX margin, shown to 4 decimal places. The 2% margin is the PFX-104 worked example value, not a confirmed production figure."
                  zh="仅当源币种与目标币种不同时才显示汇率区域。客户汇率为原始汇率扣除外汇加成后的价格，显示 4 位小数。2% 加成是 PFX-104 的示例值，不是确认的生产数值。"
                >
                  <RateRow
                    sourceCurrency={source.currency}
                    destinationCurrency={dest.currency}
                    sourceAmount={amountNum > 0 ? amountNum : 0}
                    onQuote={(q) => setRate(q.rate)}
                  />
                </BuildNote>
              )}

              {isFx && dest && (
                <AmountRow
                  label="Recipient Receives"
                  readOnly
                  currency={dest.currency}
                  value={amount === "" ? "" : String(destAmount)}
                />
              )}
            </div>
          </FormSection>

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

      {step === 1 && source && dest && (
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
            <FormSection title="To" className="w-[520px]">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <FieldBox
                    variant="readonly"
                    filled={false}
                    chevron
                    label="Destination Account"
                    required
                    value={walletLabel(dest)}
                    className="min-w-0 flex-1"
                  />
                  <FieldBox
                    variant="readonly"
                    label="Currency"
                    value={dest.currency}
                    className="w-[184px] shrink-0"
                  />
                </div>
                <MetaLine label="Beneficiary Name" value={COMPANY.name} />
              </div>
            </FormSection>
          </div>

          <FormSection title="Amount">
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
                  destinationCurrency={dest.currency}
                  sourceAmount={amountNum}
                  onQuote={(q) => setRate(q.rate)}
                />
              )}
              {isFx && (
                <AmountRow
                  label="Recipient Receives"
                  readOnly
                  currency={dest.currency}
                  value={String(destAmount)}
                />
              )}
            </div>
          </FormSection>

          <FormSection title="Transfer Information">
            <div className="flex flex-col gap-4">
              <FieldBox
                variant="readonly"
                filled={false}
                chevron
                label="Purpose"
                value={purposeLabel ?? ""}
              />
              <ReferenceTextarea readOnly label="Reference" value={reference} />
            </div>
          </FormSection>
        </div>
      )}

      {step === 2 && result && (
        <AckBlock
          taskId={result.id}
          submittedAt={result.submittedAt}
          makeAnotherHref={`/payments/own-account?new=${result.id}`}
        />
      )}

      {step < 2 && (
        <FooterActionBar
          left={
            <Button
              variant="secondary"
              className="min-w-20"
              onClick={step === 0 ? () => router.back() : () => setStep(0)}
            >
              Back
            </Button>
          }
        >
          <div className="flex items-center gap-3">
            <SaveTemplateButton
              missingMessage="Select the source and destination accounts first"
              getTemplate={() =>
                source && dest
                  ? {
                      type: "own-account",
                      fromAccount: source.accountNumber,
                      sourceCurrency: source.currency,
                      toName: COMPANY.name,
                      toAccount: dest.accountNumber,
                      destinationCurrency: dest.currency,
                      amount: amountNum > 0 ? amountNum : undefined,
                      purpose: purposeLabel,
                      reference: reference.trim() || undefined,
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
    </PageShell>
  )
}
