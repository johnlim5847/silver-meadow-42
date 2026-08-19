// lib/wallet-connect.ts — browser wallet connection for the Crypto module.
//
// Two things this file exists to get right:
//
// 1. Open the wallet the client actually picked. `window.ethereum` is a single
//    slot that the last extension to load wins, so with MetaMask and Phantom
//    both installed a naive `window.ethereum.request()` can open the wrong one.
//    EVM wallets are therefore discovered over EIP-6963, which gives one
//    provider object per installed wallet, each tagged with an `rdns`.
//    Solana has the same problem and the same answer, the Wallet Standard
//    registry, which is how MetaMask exposes Solana at all — it injects no
//    `window.*` Solana object. A handful of older wallets only inject a
//    global, so those are read directly as a fallback and deduped by name.
//
// 2. Follow the account the wallet is on. Both chains emit an event when the
//    client switches account in the extension, so the screen can invalidate a
//    signature that was captured under a different address.
//
// No network calls, no SDK. Everything here runs in the browser only.

import { SolanaSignMessage } from "@solana/wallet-standard-features"
import type { SolanaSignMessageFeature } from "@solana/wallet-standard-features"
import { getWallets } from "@wallet-standard/app"
import type { Wallet as StandardWallet, WalletAccount } from "@wallet-standard/base"
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
} from "@wallet-standard/features"
import type {
  StandardConnectFeature,
  StandardDisconnectFeature,
  StandardEventsFeature,
} from "@wallet-standard/features"

import { base58Encode } from "@/lib/base58"
import type { CryptoNetwork } from "@/lib/crypto"

export class WalletError extends Error {
  constructor(
    message: string,
    /** True when the client dismissed the wallet popup */
    readonly rejected = false
  ) {
    super(message)
    this.name = "WalletError"
  }
}

interface RequestArgs {
  method: string
  params?: unknown[] | object
}

interface Eip1193Provider {
  request(args: RequestArgs): Promise<unknown>
  on?(event: string, handler: (...args: never[]) => void): void
  removeListener?(event: string, handler: (...args: never[]) => void): void
}

export interface Eip6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

interface Eip6963Detail {
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
}

interface SolanaPublicKey {
  toString(): string
}

interface SolanaProvider {
  publicKey?: SolanaPublicKey | null
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: SolanaPublicKey }>
  disconnect?(): Promise<void>
  signMessage(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array } | Uint8Array>
  on?(event: string, handler: (...args: never[]) => void): void
  off?(event: string, handler: (...args: never[]) => void): void
  removeListener?(event: string, handler: (...args: never[]) => void): void
}

/**
 * One installed wallet the client can be sent to.
 *
 * Every account call returns the whole authorised list rather than a single
 * address. A wallet may hold several accounts open for this site at once, and
 * the order is the wallet's own, so the caller has to look for the address it
 * actually wants instead of trusting the first entry.
 */
export interface WalletHandle {
  /** Stable key: the EIP-6963 rdns on EVM, the window key on Solana */
  id: string
  name: string
  /** data: URI supplied by the wallet itself (EVM only) */
  icon?: string
  chain: CryptoNetwork
  /**
   * Opens the wallet and returns its accounts, selected one first.
   *
   * There is no account picker here on purpose. MetaMask's permissions call is
   * the only one in the field, and it edits which accounts a site may see
   * rather than which account is selected, so it silently does nothing on
   * every other wallet. Disconnect, switch inside the wallet, connect again is
   * the one route that behaves the same everywhere.
   */
  connect(): Promise<string[]>
  /** Ends the session so the next connect starts clean */
  disconnect(): Promise<void>
  /** Signs the challenge as `from`, returning hex (EVM) or base58 (Solana) */
  signMessage(message: string, from: string): Promise<string>
  /** Addresses already authorised for this site, without prompting */
  listAccounts(): Promise<string[]>
  /** Fires with the full list whenever the client changes accounts in the extension */
  subscribeAccounts(handler: (addresses: string[]) => void): () => void
}

/* ------------------------------------------------------------------ EVM */

const evmDetails = new Map<string, Eip6963Detail>()
let evmSnapshot: Eip6963Detail[] = []
const subscribers = new Set<() => void>()
let discoveryStarted = false
/** Bumped whenever the set of detected wallets changes, for useSyncExternalStore. */
let registryVersion = 0

function notify() {
  evmSnapshot = [...evmDetails.values()]
  registryVersion++
  subscribers.forEach((fn) => fn())
}

function startDiscovery() {
  if (typeof window === "undefined") return
  if (!discoveryStarted) {
    discoveryStarted = true
    window.addEventListener("eip6963:announceProvider", (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail
      if (!detail?.info?.rdns || !detail.provider) return
      evmDetails.set(detail.info.rdns, detail)
      notify()
    })
  }
  // Re-announce on every subscribe: extensions that loaded late still answer.
  window.dispatchEvent(new Event("eip6963:requestProvider"))
}

function rejection(error: unknown, fallback: string): WalletError {
  const code = (error as { code?: number })?.code
  const message = (error as { message?: string })?.message
  if (code === 4001 || /reject|denied|cancel/i.test(message ?? "")) {
    return new WalletError("You dismissed the wallet request", true)
  }
  if (code === -32002) {
    return new WalletError("The wallet already has a request open. Finish it first.")
  }
  return new WalletError(message || fallback)
}

function toHex(message: string): string {
  return (
    "0x" +
    Array.from(new TextEncoder().encode(message))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  )
}

function evmHandle(detail: Eip6963Detail): WalletHandle {
  const provider = detail.provider

  const accounts = async (method: string, params?: unknown[]) => {
    const result = (await provider.request({ method, params })) as string[] | undefined
    return result ?? []
  }

  return {
    id: detail.info.rdns,
    name: detail.info.name,
    icon: detail.info.icon,
    chain: "ETH",

    async disconnect() {
      try {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        })
      } catch {
        // Not every EVM wallet implements revoke. Nothing to do.
      }
    },

    async connect() {
      try {
        const list = await accounts("eth_requestAccounts")
        if (!list.length) throw new WalletError("The wallet returned no account")
        return list
      } catch (error) {
        throw rejection(error, "Could not connect to " + detail.info.name)
      }
    },

    async signMessage(message, from) {
      try {
        if (!from) throw new WalletError("Connect the wallet first")
        const signature = (await provider.request({
          method: "personal_sign",
          params: [toHex(message), from],
        })) as string
        return signature
      } catch (error) {
        throw rejection(error, "Could not sign the message")
      }
    },

    async listAccounts() {
      try {
        return await accounts("eth_accounts")
      } catch {
        return []
      }
    },

    subscribeAccounts(handler) {
      const listener = ((list: string[]) => handler(list ?? [])) as (
        ...args: never[]
      ) => void
      provider.on?.("accountsChanged", listener)
      return () => provider.removeListener?.("accountsChanged", listener)
    },
  }
}

/* ------------------------------------------------- Solana, Wallet Standard */

type SolanaFeatures = StandardConnectFeature &
  StandardEventsFeature &
  SolanaSignMessageFeature &
  Partial<StandardDisconnectFeature>

/** A registered wallet is usable here only if it can connect, sign and report changes. */
function isSolanaStandardWallet(wallet: StandardWallet): boolean {
  const solana = wallet.chains.some((chain) => chain.startsWith("solana:"))
  const features = wallet.features as Record<string, unknown>
  return (
    solana &&
    StandardConnect in features &&
    StandardEvents in features &&
    SolanaSignMessage in features
  )
}

function standardSolanaHandle(wallet: StandardWallet): WalletHandle {
  const features = wallet.features as unknown as SolanaFeatures
  const addresses = (accounts: readonly WalletAccount[]) =>
    accounts.map((account) => account.address)

  return {
    id: "ws:" + wallet.name,
    name: wallet.name,
    icon: wallet.icon,
    chain: "SOL",

    async disconnect() {
      try {
        await features[StandardDisconnect]?.disconnect()
      } catch {
        // Already disconnected.
      }
    },

    async connect() {
      try {
        const output = await features[StandardConnect].connect()
        return addresses(output.accounts)
      } catch (error) {
        throw rejection(error, "Could not connect to " + wallet.name)
      }
    },

    async signMessage(message, from) {
      const account = wallet.accounts.find((candidate) => candidate.address === from)
      if (!account) {
        throw new WalletError(
          "That account is no longer connected in " + wallet.name
        )
      }
      try {
        const [output] = await features[SolanaSignMessage].signMessage({
          account,
          message: new TextEncoder().encode(message),
        })
        return base58Encode(new Uint8Array(output.signature))
      } catch (error) {
        throw rejection(error, "Could not sign the message")
      }
    },

    async listAccounts() {
      if (wallet.accounts.length) return addresses(wallet.accounts)
      try {
        // `silent` is the standard's "only if this site is already trusted".
        const output = await features[StandardConnect].connect({ silent: true })
        return addresses(output.accounts)
      } catch {
        return []
      }
    },

    subscribeAccounts(handler) {
      return features[StandardEvents].on("change", ({ accounts }) => {
        if (accounts) handler(addresses(accounts))
      })
    },
  }
}

/* ------------------------------------------------------- Solana, injected */

/** window keys the supported Solana wallets inject under. */
const SOLANA_KEYS: { key: string; name: string }[] = [
  { key: "phantom", name: "Phantom" },
  { key: "solflare", name: "Solflare" },
  { key: "backpack", name: "Backpack" },
]

function readSolanaProvider(key: string): SolanaProvider | undefined {
  if (typeof window === "undefined") return undefined
  const scope = window as unknown as Record<string, unknown>
  const root = scope[key] as { solana?: SolanaProvider } | SolanaProvider | undefined
  if (!root) return undefined
  const candidate =
    (root as { solana?: SolanaProvider }).solana ?? (root as SolanaProvider)
  return typeof candidate?.connect === "function" ? candidate : undefined
}

function solanaHandle(key: string, name: string, provider: SolanaProvider): WalletHandle {
  return {
    id: key,
    name,
    chain: "SOL",

    async disconnect() {
      try {
        await provider.disconnect?.()
      } catch {
        // Already disconnected.
      }
    },

    async connect() {
      try {
        const result = await provider.connect()
        return [result.publicKey.toString()]
      } catch (error) {
        throw rejection(error, "Could not connect to " + name)
      }
    },

    async signMessage(message) {
      try {
        const encoded = new TextEncoder().encode(message)
        const result = await provider.signMessage(encoded, "utf8")
        const raw =
          result instanceof Uint8Array
            ? result
            : (result as { signature: Uint8Array }).signature
        return base58Encode(raw instanceof Uint8Array ? raw : new Uint8Array(raw))
      } catch (error) {
        throw rejection(error, "Could not sign the message")
      }
    },

    async listAccounts() {
      if (provider.publicKey) return [provider.publicKey.toString()]
      try {
        const result = await provider.connect({ onlyIfTrusted: true })
        return [result.publicKey.toString()]
      } catch {
        return []
      }
    },

    subscribeAccounts(handler) {
      const listener = ((key: SolanaPublicKey | null) =>
        handler(key ? [key.toString()] : [])) as (...args: never[]) => void
      provider.on?.("accountChanged", listener)
      provider.on?.("disconnect", (() => handler([])) as (...args: never[]) => void)
      return () => {
        const off = provider.off ?? provider.removeListener
        off?.call(provider, "accountChanged", listener)
      }
    },
  }
}

/* ------------------------------------------------------------- Registry */

/**
 * Handles are cached by identity so the same wallet keeps the same object
 * across discovery ticks. Without this every tick hands React a new handle,
 * which tears down the account listeners and the refresh loop and throws away
 * whatever read was in flight — the page then shows an account the wallet
 * stopped reporting several seconds ago.
 */
const handleCache = new Map<string, { source: object; handle: WalletHandle }>()

function cachedHandle(
  key: string,
  source: object,
  build: () => WalletHandle
): WalletHandle {
  const existing = handleCache.get(key)
  if (existing && existing.source === source) return existing.handle
  const handle = build()
  handleCache.set(key, { source, handle })
  return handle
}

/**
 * Every wallet detected for a chain, in discovery order.
 *
 * Solana merges two sources. The Wallet Standard registry is the current one
 * and the only place MetaMask appears, since it ships no Solana window object.
 * The legacy injected globals cover wallets that have not registered, and are
 * dropped when the same wallet is already in the registry.
 */
export function listWallets(chain: CryptoNetwork): WalletHandle[] {
  if (chain !== "SOL") {
    return evmSnapshot.map((detail) =>
      cachedHandle(detail.info.rdns, detail.provider, () => evmHandle(detail))
    )
  }

  const standard = solanaStandardWallets.map((wallet) =>
    cachedHandle("ws:" + wallet.name, wallet, () => standardSolanaHandle(wallet))
  )
  const seen = new Set(standard.map((w) => w.name.toLowerCase()))

  const injected = SOLANA_KEYS.flatMap(({ key, name }) => {
    if (seen.has(name.toLowerCase())) return []
    const provider = readSolanaProvider(key)
    return provider
      ? [cachedHandle(key, provider, () => solanaHandle(key, name, provider))]
      : []
  })

  return [...standard, ...injected]
}

/**
 * The handle for the wallet the client chose on the details step. Matches on
 * the wallet's own identifier first, then on name, so a wallet that ships a
 * different rdns than expected is still found.
 */
export function findWallet(
  chain: CryptoNetwork,
  match: { ids?: string[]; names?: string[] }
): WalletHandle | undefined {
  const wallets = listWallets(chain)
  const ids = (match.ids ?? []).map((v) => v.toLowerCase())
  const names = (match.names ?? []).map((v) => v.toLowerCase())

  const byId = wallets.find((w) => ids.includes(w.id.toLowerCase()))
  if (byId) return byId

  return wallets.find((w) => {
    const name = w.name.toLowerCase()
    return names.some((n) => name.includes(n) || n.includes(name))
  })
}

let solanaStandardWallets: StandardWallet[] = []
let standardStarted = false

/** Wallet Standard discovery. Handshake and ordering are the package's job. */
function startStandardDiscovery() {
  if (standardStarted || typeof window === "undefined") return
  standardStarted = true
  const wallets = getWallets()
  const refresh = () => {
    solanaStandardWallets = wallets.get().filter(isSolanaStandardWallet)
    registryVersion++
    subscribers.forEach((fn) => fn())
  }
  wallets.on("register", refresh)
  wallets.on("unregister", refresh)
  solanaStandardWallets = wallets.get().filter(isSolanaStandardWallet)
}

let solanaFingerprint = ""

/** Legacy injected wallets arrive silently, so their presence is polled. */
function pollSolana() {
  const present = SOLANA_KEYS.filter(({ key }) => readSolanaProvider(key))
    .map(({ key }) => key)
    .join(",")
  if (present === solanaFingerprint) return
  solanaFingerprint = present
  registryVersion++
  subscribers.forEach((fn) => fn())
}

/** React `useSyncExternalStore` wiring for the detected-wallet list. */
export function subscribeWallets(onChange: () => void): () => void {
  startDiscovery()
  startStandardDiscovery()
  subscribers.add(onChange)
  const timers = [0, 300, 1200].map((ms) => setTimeout(pollSolana, ms))
  return () => {
    subscribers.delete(onChange)
    timers.forEach(clearTimeout)
  }
}

/** Changes only when the detected set changes. -1 is the server value. */
export function getRegistryVersion(): number {
  return registryVersion
}

export function getServerRegistryVersion(): number {
  return -1
}

/** Addresses compare case-insensitively on EVM, exactly on Solana. */
export function sameAddress(chain: CryptoNetwork, a: string, b: string): boolean {
  if (!a || !b) return false
  return chain === "ETH" ? a.toLowerCase() === b.toLowerCase() : a === b
}
