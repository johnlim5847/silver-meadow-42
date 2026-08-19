"use client"

import * as React from "react"
import {
  CircleCheck,
  ExternalLink,
  FileUp,
  Loader2,
  PenLine,
  TriangleAlert,
  Wallet as WalletIcon,
} from "lucide-react"

import { useDetectedWallets } from "@/components/shared/crypto/use-wallets"
import { Button } from "@/components/ui/button"
import {
  buildOwnershipMessage,
  generateSignature,
  getProvider,
  shortenAddress,
  walletMatcher,
  type CryptoNetwork,
  type WalletCustodyType,
} from "@/lib/crypto"
import { COMPANY } from "@/lib/mock"
import { findWallet, sameAddress, WalletError, type WalletHandle } from "@/lib/wallet-connect"
import { cn } from "@/lib/utils"

type Busy = "connect" | "switch" | "sign" | undefined

interface OwnershipVerificationProps {
  network: CryptoNetwork
  custodyType: WalletCustodyType
  /** WALLET_PROVIDERS value chosen on the details step */
  providerId?: string
  /** The address being proven. The selected account has to equal it. */
  address: string
  /** Fires with the proof, and with an empty string when the proof stops being valid */
  onProofChange: (proof: string) => void
  /**
   * Lets the client adopt the account the wallet is actually on when it is not
   * the address they typed. Omitted where the address can no longer change,
   * such as verifying a wallet already on the list.
   */
  onUseAccount?: (address: string) => void
  className?: string
}

/**
 * Ownership proof capture (FSD FR-4, FR-5).
 *
 * The screen starts disconnected on purpose. Any standing permission from an
 * earlier visit is ignored until the client connects here, so what is on
 * screen is always something they did in this session rather than a leftover
 * the page found lying around.
 *
 * After connecting, the account tracked is the one the wallet currently has
 * selected. Switch account in the extension and the screen follows, warns that
 * it no longer matches the address entered on the details step, and drops any
 * signature captured under the previous account.
 *
 * The extension opened is the one named on the details step, resolved over
 * EIP-6963 on Ethereum and the Wallet Standard registry on Solana, so a second
 * installed wallet cannot answer in its place. Custodial exchange accounts
 * cannot sign at all, so they upload evidence instead.
 */
export function OwnershipVerification({
  network,
  custodyType,
  providerId,
  address,
  onProofChange,
  onUseAccount,
  className,
}: OwnershipVerificationProps) {
  const selfHosted = custodyType === "SELF_HOSTED"
  const provider = providerId ? getProvider(providerId) : undefined
  const detected = useDetectedWallets(network)

  const [picked, setPicked] = React.useState<string>()
  const [connected, setConnected] = React.useState<string>()
  const [started, setStarted] = React.useState(false)
  const [signature, setSignature] = React.useState("")
  const [demo, setDemo] = React.useState(false)
  const [busy, setBusy] = React.useState<Busy>()
  const [error, setError] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const fileInput = React.useRef<HTMLInputElement>(null)

  const message = React.useMemo(
    () =>
      buildOwnershipMessage({
        clientNo: COMPANY.clientNo,
        address,
        network,
        issuedAt: new Date(),
      }),
    [address, network]
  )

  // The named wallet, or the one the client picked when they chose "Other".
  const wallet: WalletHandle | undefined = React.useMemo(() => {
    if (!selfHosted) return undefined
    if (picked) return detected.find((w) => w.id === picked)
    if (!providerId || providerId === "other") return undefined
    if (provider?.connectable === false) return undefined
    return findWallet(network, walletMatcher(providerId))
    // `detected` is the discovery tick — findWallet reads the same registry.
  }, [selfHosted, picked, detected, providerId, provider, network])

  const matched = Boolean(connected) && sameAddress(network, connected!, address)

  const unmounted = React.useRef(false)
  React.useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
    }
  }, [])

  /**
   * `eth_accounts` lists the selected account first, so the head of the list
   * is what the wallet is on right now. A change to it invalidates a signature
   * made under the previous account.
   */
  const applyAccount = React.useCallback(
    (list: string[]) => {
      const next = list[0]
      setConnected((current) => (current === next ? current : next))
      setSignature((current) => {
        if (!current) return current
        if (next && sameAddress(network, next, address)) return current
        onProofChange("")
        return ""
      })
    },
    [network, address, onProofChange]
  )

  const readAccount = React.useCallback(async () => {
    if (!wallet) return []
    const list = await wallet.listAccounts()
    // Only an unmount discards a read. Tying this to an effect's lifetime made
    // a re-run throw away the very read that carried the new account.
    if (!unmounted.current) applyAccount(list)
    return list
  }, [wallet, applyAccount])

  /**
   * Watching only starts once the client has connected in this session. Before
   * that the screen deliberately shows nothing, whatever standing permission
   * the wallet may still hold for this site.
   */
  React.useEffect(() => {
    if (!wallet || !started) return
    const tick = () => {
      void readAccount()
    }
    const unsubscribe = wallet.subscribeAccounts((list) => {
      if (!unmounted.current) applyAccount(list)
    })
    window.addEventListener("focus", tick)
    document.addEventListener("visibilitychange", tick)
    const interval = setInterval(tick, 1500)
    return () => {
      unsubscribe()
      window.removeEventListener("focus", tick)
      document.removeEventListener("visibilitychange", tick)
      clearInterval(interval)
    }
  }, [wallet, started, applyAccount, readAccount])

  const run = async (kind: Exclude<Busy, undefined>, task: () => Promise<void>) => {
    setBusy(kind)
    setError("")
    try {
      await task()
    } catch (caught) {
      setError(
        caught instanceof WalletError
          ? caught.message
          : "Something went wrong talking to the wallet"
      )
    } finally {
      setBusy(undefined)
    }
  }

  const connect = () =>
    run("connect", async () => {
      if (!wallet) return
      applyAccount(await wallet.connect())
      setStarted(true)
    })

  const disconnect = () =>
    run("switch", async () => {
      if (!wallet) return
      await wallet.disconnect()
      setConnected(undefined)
      setStarted(false)
      setSignature("")
      onProofChange("")
    })

  const sign = () =>
    run("sign", async () => {
      if (!wallet || !connected) return
      try {
        const proof = await wallet.signMessage(message, connected)
        setSignature(proof)
        setDemo(false)
        onProofChange(proof)
      } catch (caught) {
        if (caught instanceof WalletError && !caught.rejected) {
          throw new WalletError(
            caught.message + ". Open " + wallet.name + " and try again."
          )
        }
        throw caught
      }
    })

  const useDemoSignature = () => {
    const proof = generateSignature(network)
    setSignature(proof)
    setDemo(true)
    setError("")
    onProofChange(proof)
  }

  const pickFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setSignature(file.name)
    setError("")
    onProofChange(file.name)
  }

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <h2 className="text-2xl leading-8 font-semibold text-ink90">Verify ownership</h2>
      <p className="mt-4 max-w-[560px] text-base leading-6 text-ink90">
        {selfHosted
          ? "To add this wallet, you need to prove you control it by signing a message with your wallet app. This does not initiate a transaction or move any funds."
          : "An exchange account cannot sign a message. Upload evidence that the account is held in your company name, for example a screenshot of the account holder page or a deposit address page showing the entity name."}
      </p>

      {!selfHosted && !signature && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <Button
            size="lg"
            className="mt-8 min-w-[180px]"
            onClick={() => fileInput.current?.click()}
          >
            <FileUp />
            Upload evidence
          </Button>
        </>
      )}

      {selfHosted && !signature && (
        <div className="mt-8 flex w-full max-w-[560px] flex-col items-center gap-4">
          {wallet && !connected && (
            <>
              <Button
                size="lg"
                className="min-w-[180px]"
                disabled={busy === "connect"}
                onClick={connect}
              >
                {busy === "connect" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Waiting for wallet
                  </>
                ) : (
                  <>
                    <WalletIcon />
                    Connect {wallet.name}
                  </>
                )}
              </Button>
              <p className="max-w-[440px] text-sm leading-[22px] text-ink60">
                {wallet.name} connects the account it currently has selected.
                Select {shortenAddress(address)} before you connect.
              </p>
            </>
          )}

          {wallet && connected && !matched && (
            <AccountMismatch
              walletName={wallet.name}
              connected={connected}
              expected={address}
              busy={busy === "switch"}
              onDisconnect={disconnect}
              onUseAccount={onUseAccount}
            />
          )}

          {wallet && connected && matched && (
            <>
              <ConnectedChip
                walletName={wallet.name}
                account={connected}
                busy={busy === "switch"}
                onDisconnect={disconnect}
              />
              <Button
                size="lg"
                className="min-w-[180px]"
                disabled={busy === "sign"}
                onClick={sign}
              >
                {busy === "sign" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Waiting for signature
                  </>
                ) : (
                  <>
                    <PenLine />
                    Sign message
                  </>
                )}
              </Button>
            </>
          )}

          {!wallet && (
            <WalletUnavailable
              network={network}
              providerLabel={providerId === "other" ? undefined : provider?.label}
              installUrl={provider?.installUrl}
              connectable={provider?.connectable !== false}
              choices={detected}
              onPick={setPicked}
              onDemo={useDemoSignature}
            />
          )}

          {error && (
            <p className="max-w-[520px] text-sm leading-[22px] text-error-red">
              {error}
            </p>
          )}
        </div>
      )}

      {signature && (
        <div className="mt-8 w-full max-w-[560px] rounded-[10px] border border-emerald-200 bg-emerald-50/60 p-4 text-left">
          <p className="flex items-center gap-2 text-sm leading-[22px] font-semibold text-emerald-700">
            <CircleCheck className="size-4" />
            {selfHosted ? "Message signed" : "Evidence uploaded"}
            {demo && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                demo signature
              </span>
            )}
          </p>
          <p className="mt-1 text-sm leading-[22px] text-ink60">
            {selfHosted
              ? "Signed by " +
                shortenAddress(connected || address) +
                ". It is submitted to DK for screening after your approver signs off."
              : fileName +
                " attached. It is submitted to DK for screening after your approver signs off."}
          </p>
          {selfHosted && (
            <p className="mt-3 truncate font-mono text-xs text-ink40">{signature}</p>
          )}
        </div>
      )}
    </div>
  )
}

function ConnectedChip({
  walletName,
  account,
  busy,
  onDisconnect,
}: {
  walletName: string
  account: string
  busy: boolean
  onDisconnect: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm leading-[22px] text-ink60">
      <span className="flex items-center gap-2 rounded-full border border-field-line bg-panel-fill px-3 py-1">
        <span className="size-2 rounded-full bg-emerald-500" />
        Signing with {walletName}
        <span className="font-mono text-ink90">{shortenAddress(account)}</span>
      </span>
      <button
        type="button"
        className="text-link hover:underline disabled:opacity-50"
        disabled={busy}
        onClick={onDisconnect}
      >
        {busy ? "Waiting for wallet" : "Disconnect"}
      </button>
      <span className="w-full text-xs leading-5 text-ink40">
        To use another account, switch it in {walletName} and connect again.
      </span>
    </div>
  )
}

function AccountMismatch({
  walletName,
  connected,
  expected,
  busy,
  onDisconnect,
  onUseAccount,
}: {
  walletName: string
  /** The account the wallet currently has selected */
  connected: string
  expected: string
  busy: boolean
  onDisconnect: () => void
  /** Present only where the address being added can still be corrected */
  onUseAccount?: (address: string) => void
}) {
  return (
    <div className="w-full rounded-[10px] border border-navy/15 bg-info-tint p-5 text-left">
      <p className="flex items-center gap-2 text-base leading-6 font-semibold text-navy">
        <TriangleAlert className="size-[18px]" strokeWidth={1.75} />
        This is not the wallet you entered
      </p>
      <dl className="mt-4 flex flex-col gap-2 border-t border-navy/10 pt-4 text-sm leading-[22px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink60">You entered</dt>
          <dd className="font-mono text-ink90">{shortenAddress(expected)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink60">{walletName} is on</dt>
          <dd className="font-mono text-ink90">{shortenAddress(connected)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-[22px] text-ink60">
        Switch to {shortenAddress(expected)} inside {walletName}. This screen
        follows the account {walletName} has selected, so it updates on its own.
        If it does not, disconnect and connect again.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy} onClick={onDisconnect}>
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              Waiting for wallet
            </>
          ) : (
            "Disconnect"
          )}
        </Button>
        {onUseAccount && (
          <button
            type="button"
            className="text-sm leading-[22px] text-link hover:underline"
            onClick={() => onUseAccount(connected)}
          >
            Add {shortenAddress(connected)} instead
          </button>
        )}
      </div>
    </div>
  )
}

function WalletUnavailable({
  network,
  providerLabel,
  installUrl,
  connectable,
  choices,
  onPick,
  onDemo,
}: {
  network: CryptoNetwork
  providerLabel?: string
  installUrl?: string
  connectable: boolean
  choices: WalletHandle[]
  onPick: (id: string) => void
  onDemo: () => void
}) {
  const chainName = network === "ETH" ? "Ethereum" : "Solana"

  return (
    <div className="w-full rounded-[10px] border border-field-line bg-panel-fill p-4 text-left">
      <p className="text-sm leading-[22px] font-semibold text-ink90">
        {!connectable
          ? providerLabel + " signs through a wallet app"
          : providerLabel
            ? providerLabel + " is not installed in this browser"
            : "Pick the wallet to sign with"}
      </p>
      <p className="mt-1 text-sm leading-[22px] text-ink60">
        {!connectable
          ? "Open the wallet app you use with your " +
            providerLabel +
            " device, select the account you are adding, then connect it below."
          : choices.length > 0
            ? "These " + chainName + " wallets are available here."
            : "Install it, then reload this page."}
      </p>

      {choices.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onPick(choice.id)}
              className="flex items-center gap-3 rounded-[8px] border border-field-line bg-white px-3 py-2.5 text-left transition-colors hover:border-ink40"
            >
              {choice.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={choice.icon} alt="" className="size-6 rounded-md" />
              ) : (
                <WalletIcon className="size-5 text-ink60" />
              )}
              <span className="flex-1 text-sm leading-[22px] text-ink90">
                {choice.name}
              </span>
              <span className="text-sm leading-[22px] text-link">Use this</span>
            </button>
          ))}
        </div>
      )}

      {connectable && installUrl && choices.length === 0 && (
        <a
          href={installUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm leading-[22px] text-link hover:underline"
        >
          Install {providerLabel}
          <ExternalLink className="size-3.5" />
        </a>
      )}

      <div className="mt-4 border-t border-field-line pt-3">
        <button
          type="button"
          onClick={onDemo}
          className="text-sm leading-[22px] text-ink60 underline underline-offset-2 hover:text-ink90"
        >
          Continue with a demo signature
        </button>
        <p className="mt-1 text-xs leading-5 text-ink40">
          For walkthroughs only. It produces a placeholder proof, not a real one.
        </p>
      </div>
    </div>
  )
}
