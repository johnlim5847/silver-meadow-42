"use client"

import * as React from "react"
import { ArrowLeft, CircleCheck, Copy } from "lucide-react"
import { toast } from "sonner"

import { ChainIcon, ProviderIcon } from "@/components/shared/crypto/chain-icon"
import {
  ConsentBox,
  LabeledField,
  OptionCard,
  SelectField,
  TextField,
} from "@/components/shared/crypto/form-fields"
import { OwnershipVerification } from "@/components/shared/crypto/ownership-verification"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
import { StepperBand } from "@/components/shared/figma/stepper-band"
import { Button } from "@/components/ui/button"
import {
  ADDRESS_PLACEHOLDER,
  CUSTODY_TYPES,
  NETWORKS,
  WALLET_PURPOSES,
  custodyLabel,
  generateRequestId,
  generateWalletId,
  getNetwork,
  providerOptions,
  purposeLabel,
  splitAddress,
  validateAddress,
  type CryptoNetwork,
  type WalletCustodyType,
} from "@/lib/crypto"
import { formatTimestamp } from "@/lib/mock"
import { useAppStore } from "@/lib/store"

const STEPS = ["Enter details", "Verify ownership", "Review", "Submit"]

const CONSENT_ONRAMP = (
  <>
    I confirm that the selected wallet or exchange account{" "}
    <strong className="font-semibold">is owned or controlled by me/the company</strong>
    , and that the wallet information provided is true, accurate, and complete. I
    confirm that this wallet may be used to receive crypto from DK for the
    requested <strong className="font-semibold">on-ramp transaction</strong>.
    <br />I acknowledge that DK may screen, verify, reject, suspend, or request
    further information before allowing use of this wallet or completing the
    transaction.
  </>
)

const CONSENT_OFFRAMP = (
  <>
    I confirm that the selected wallet or exchange account{" "}
    <strong className="font-semibold">is owned or controlled by me/the company</strong>
    , and that the wallet information provided is true, accurate, and complete. I
    confirm that this wallet may be used to send crypto to DK for the requested{" "}
    <strong className="font-semibold">off-ramp transaction</strong>.
    <br />I acknowledge that DK may screen, verify, reject, suspend, or request
    further information before allowing use of this wallet or completing the
    transaction.
  </>
)

interface Errors {
  label?: string
  address?: string
  provider?: string
  purpose?: string
  consent?: string
}

export function AddWalletFlow({
  onFinish,
}: {
  /** Called from the acknowledgement screen to go back to Your wallets */
  onFinish: () => void
}) {
  const addCryptoWallet = useAppStore((s) => s.addCryptoWallet)

  const [step, setStep] = React.useState(0)
  const [label, setLabel] = React.useState("")
  const [network, setNetwork] = React.useState<CryptoNetwork>("ETH")
  const [address, setAddress] = React.useState("")
  const [custody, setCustody] = React.useState<WalletCustodyType>("SELF_HOSTED")
  const [provider, setProvider] = React.useState<string>()
  const [purpose, setPurpose] = React.useState<string>()
  const [consentIn, setConsentIn] = React.useState(false)
  const [consentOut, setConsentOut] = React.useState(false)
  const [proof, setProof] = React.useState("")
  const [errors, setErrors] = React.useState<Errors>({})
  const [receipt, setReceipt] = React.useState<{ id: string; at: string }>()

  const providers = React.useMemo(
    () => providerOptions(network, custody),
    [network, custody]
  )

  // Keep the provider consistent with the chain and custody type above it.
  // Cleared on the change that invalidates it, not synced in an effect.
  const chooseNetwork = (next: CryptoNetwork) => {
    setNetwork(next)
    setProof("")
    if (provider && !providerOptions(next, custody).some((p) => p.value === provider)) {
      setProvider(undefined)
    }
  }

  const chooseCustody = (next: WalletCustodyType) => {
    setCustody(next)
    setProof("")
    if (provider && !providerOptions(network, next).some((p) => p.value === provider)) {
      setProvider(undefined)
    }
  }

  const validateDetails = (): boolean => {
    const next: Errors = {}
    if (!label.trim()) next.label = "Enter a name for this wallet"
    next.address = validateAddress(network, address)
    if (!provider) next.provider = "Select the wallet provider"
    if (!purpose) next.purpose = "Select what this wallet is used for"
    if (!consentIn || !consentOut)
      next.consent = "Both confirmations are required before you can continue"
    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, v]) => v)
    ) as Errors
    setErrors(cleaned)
    return Object.keys(cleaned).length === 0
  }

  const submit = () => {
    const id = generateWalletId()
    const at = new Date().toISOString()
    addCryptoWallet({
      id,
      label: label.trim(),
      address: address.trim(),
      network,
      custodyType: custody,
      provider: provider!,
      purpose: purpose!,
      status: "Pending",
      ownershipVerified: true,
      createdAt: at,
    })
    setReceipt({ id: generateRequestId(), at })
    setStep(3)
  }

  return (
    <div>
      <StepperBand
        steps={STEPS}
        current={step}
        tone="navy"
        size="lg"
        className="mt-0"
      />

      {step === 0 && (
        <DetailsStep
          label={label}
          setLabel={setLabel}
          network={network}
          setNetwork={chooseNetwork}
          address={address}
          setAddress={(next) => {
            setAddress(next)
            setProof("")
          }}
          custody={custody}
          setCustody={chooseCustody}
          provider={provider}
          setProvider={setProvider}
          providers={providers}
          purpose={purpose}
          setPurpose={setPurpose}
          consentIn={consentIn}
          setConsentIn={setConsentIn}
          consentOut={consentOut}
          setConsentOut={setConsentOut}
          errors={errors}
        />
      )}

      {step === 1 && (
        <div className="mx-auto mt-12 w-full max-w-[720px]">
          <OwnershipVerification
            key={network + custody + provider + address.trim()}
            network={network}
            custodyType={custody}
            providerId={provider}
            address={address.trim()}
            onProofChange={setProof}
            onUseAccount={(next) => {
              setAddress(next)
              setProof("")
              setStep(0)
              toast.success("Wallet address updated, check the details and continue")
            }}
          />
        </div>
      )}

      {step === 2 && (
        <ReviewStep
          label={label.trim()}
          network={network}
          address={address.trim()}
          custody={custody}
          purpose={purpose!}
        />
      )}

      {step === 3 && receipt && (
        <SubmittedStep
          requestId={receipt.id}
          submittedAt={receipt.at}
          walletLabel={label.trim()}
          onFinish={onFinish}
        />
      )}

      {step === 0 && (
        <FooterActionBar>
          <Button
            className="min-w-20"
            onClick={() => {
              if (validateDetails()) setStep(1)
            }}
          >
            Next
          </Button>
        </FooterActionBar>
      )}

      {step === 1 && (
        <FooterActionBar
          left={
            <Button
              variant="ghost"
              className="min-w-20 gap-2 text-ink90"
              onClick={() => setStep(0)}
            >
              <ArrowLeft />
              Back
            </Button>
          }
        >
          <Button
            className="min-w-20"
            disabled={!proof}
            onClick={() => setStep(2)}
          >
            Next
          </Button>
        </FooterActionBar>
      )}

      {step === 2 && (
        <FooterActionBar
          left={
            <Button
              variant="ghost"
              className="min-w-20 gap-2 text-ink90"
              onClick={() => setStep(1)}
            >
              <ArrowLeft />
              Back
            </Button>
          }
        >
          <Button className="min-w-20" onClick={submit}>
            Submit
          </Button>
        </FooterActionBar>
      )}
    </div>
  )
}

function DetailsStep(props: {
  label: string
  setLabel: (v: string) => void
  network: CryptoNetwork
  setNetwork: (v: CryptoNetwork) => void
  address: string
  setAddress: (v: string) => void
  custody: WalletCustodyType
  setCustody: (v: WalletCustodyType) => void
  provider?: string
  setProvider: (v: string) => void
  providers: { value: string; label: string }[]
  purpose?: string
  setPurpose: (v: string) => void
  consentIn: boolean
  setConsentIn: (v: boolean) => void
  consentOut: boolean
  setConsentOut: (v: boolean) => void
  errors: Errors
}) {
  const { errors } = props

  return (
    <div className="mx-auto mt-12 flex w-full max-w-[720px] flex-col gap-6">
      <h2 className="text-2xl leading-8 font-semibold text-ink90">
        Enter wallet details
      </h2>

      <LabeledField
        label="Wallet name"
        htmlFor="wallet-name"
        error={errors.label}
      >
        <TextField
          id="wallet-name"
          value={props.label}
          onChange={props.setLabel}
          placeholder="Kraken ETH"
          maxLength={40}
          error={Boolean(errors.label)}
        />
      </LabeledField>

      <LabeledField label="Network">
        <div className="flex gap-4" role="radiogroup" aria-label="Network">
          {NETWORKS.map((n) => (
            <OptionCard
              key={n.value}
              name="network"
              selected={props.network === n.value}
              onSelect={() => props.setNetwork(n.value)}
              icon={<ChainIcon network={n.value} className="size-8" />}
              title={n.ticker}
              subtitle={n.label}
            />
          ))}
        </div>
      </LabeledField>

      <LabeledField
        label="Wallet address"
        htmlFor="wallet-address"
        error={errors.address}
      >
        <TextField
          id="wallet-address"
          value={props.address}
          onChange={props.setAddress}
          placeholder={ADDRESS_PLACEHOLDER[props.network]}
          error={Boolean(errors.address)}
        />
      </LabeledField>

      <LabeledField label="Wallet custody type">
        <div className="flex gap-4" role="radiogroup" aria-label="Wallet custody type">
          {CUSTODY_TYPES.map((c) => (
            <OptionCard
              key={c.value}
              name="custody"
              selected={props.custody === c.value}
              onSelect={() => props.setCustody(c.value)}
              title={c.label}
            />
          ))}
        </div>
      </LabeledField>

      <LabeledField label="Wallet provider" error={errors.provider}>
        <SelectField
          value={props.provider}
          onValueChange={props.setProvider}
          placeholder="Select a provider"
          error={Boolean(errors.provider)}
          options={props.providers.map((p) => ({
            value: p.value,
            label: p.label,
            icon: <ProviderIcon provider={p.value} label={p.label} />,
          }))}
        />
      </LabeledField>

      <LabeledField label="Wallet purpose" error={errors.purpose}>
        <SelectField
          value={props.purpose}
          onValueChange={props.setPurpose}
          placeholder="Select a purpose"
          error={Boolean(errors.purpose)}
          options={WALLET_PURPOSES.map((p) => ({ value: p.value, label: p.label }))}
        />
      </LabeledField>

      <div className="flex flex-col gap-4">
        <ConsentBox
          checked={props.consentIn}
          onCheckedChange={props.setConsentIn}
          error={Boolean(errors.consent) && !props.consentIn}
        >
          {CONSENT_ONRAMP}
        </ConsentBox>
        <ConsentBox
          checked={props.consentOut}
          onCheckedChange={props.setConsentOut}
          error={Boolean(errors.consent) && !props.consentOut}
        >
          {CONSENT_OFFRAMP}
        </ConsentBox>
        {errors.consent && (
          <p className="text-xs leading-5 text-error-red">{errors.consent}</p>
        )}
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={
        last
          ? "py-5"
          : "border-b border-dashed border-field-line py-5 first:pt-0"
      }
    >
      <p className="text-sm leading-[22px] font-semibold text-ink90">{label}</p>
      <div className="mt-2 text-base leading-6 text-ink90">{children}</div>
    </div>
  )
}

function ReviewStep(props: {
  label: string
  network: CryptoNetwork
  address: string
  custody: WalletCustodyType
  purpose: string
}) {
  const parts = splitAddress(props.address)
  const chain = getNetwork(props.network)

  return (
    <div className="mx-auto mt-12 w-full max-w-[720px]">
      <h2 className="text-2xl leading-8 font-semibold text-ink90">
        Review wallet details
      </h2>
      <div className="mt-6 rounded-[12px] border border-field-line px-8 py-6">
        <ReviewRow label="Wallet name">{props.label}</ReviewRow>
        <ReviewRow label="Network">
          <span className="flex items-center gap-2">
            <ChainIcon network={props.network} />
            <span className="font-semibold">{chain.ticker}</span>
            <span className="text-ink60">{chain.label}</span>
          </span>
        </ReviewRow>
        <ReviewRow label="Wallet address">
          <span className="break-all">
            <span className="font-semibold">{parts.head}</span>
            <span className="text-ink60">{parts.body}</span>
            <span className="font-semibold">{parts.tail}</span>
          </span>
        </ReviewRow>
        <ReviewRow label="Wallet custody type">
          {custodyLabel(props.custody)}
        </ReviewRow>
        <ReviewRow label="Wallet purpose" last>
          {purposeLabel(props.purpose)}
        </ReviewRow>
      </div>
    </div>
  )
}

function SubmittedStep({
  requestId,
  submittedAt,
  walletLabel,
  onFinish,
}: {
  requestId: string
  submittedAt: string
  walletLabel: string
  onFinish: () => void
}) {
  const copy = async () => {
    await navigator.clipboard.writeText(requestId)
    toast.success("Request ID copied")
  }

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50">
        <CircleCheck className="size-8 text-emerald-600" strokeWidth={1.75} />
      </div>
      <h2 className="mt-5 text-xl leading-[26px] font-semibold text-heading">
        Wallet request submitted
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-ink">
        {walletLabel} has been sent for approval. Your approver signs off first,
        then DK screens the wallet. You can convert with it once it shows
        Approved.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-line bg-soft py-1.5 pr-1.5 pl-4">
        <span className="font-mono text-[13px] text-ink">{requestId}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Copy request ID" onClick={copy}>
          <Copy />
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-muted-ink">
        Submitted {formatTimestamp(submittedAt)}
      </p>

      <div className="mt-8">
        <Button onClick={onFinish}>Back to your wallets</Button>
      </div>
    </div>
  )
}
