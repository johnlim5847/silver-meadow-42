// lib/crypto.ts — Crypto module domain data. Mirrors the CIB Fiat-Crypto
// Conversion FSD (Confluence 697958534): Phase 1 is pass-through only, assets
// USDC/USDT, networks Ethereum + Solana, first-party wallets only.
// Wallet lifecycle is maker-checker (FR-3..FR-6): a submitted wallet sits
// Pending until a checker approves it, and only an Approved wallet is
// selectable on a conversion.

export type CryptoNetwork = "ETH" | "SOL"

export type WalletCustodyType = "SELF_HOSTED" | "CUSTODIAL_VASP"

/** Client-facing wallet status. Unverified = ownership proof not captured yet. */
export type CryptoWalletStatus = "Unverified" | "Pending" | "Approved" | "Rejected"

export interface CryptoWallet {
  id: string
  /** CIB-local label, renameable with no workflow (FR-2) */
  label: string
  address: string
  network: CryptoNetwork
  custodyType: WalletCustodyType
  /** WalletProvider.value */
  provider: string
  /** WalletPurpose.value */
  purpose: string
  status: CryptoWalletStatus
  /** Ownership challenge answered (signature or custodial evidence) */
  ownershipVerified: boolean
  createdAt: string
}

export interface NetworkMeta {
  value: CryptoNetwork
  /** Short ticker shown in bold, e.g. "ETH" */
  ticker: string
  /** Full chain name, e.g. "Ethereum" */
  label: string
  /** Assets DK supports on this chain in Phase 1 */
  assets: string[]
}

export const NETWORKS: NetworkMeta[] = [
  { value: "ETH", ticker: "ETH", label: "Ethereum", assets: ["USDC", "USDT"] },
  { value: "SOL", ticker: "SOL", label: "Solana", assets: ["USDC", "USDT"] },
]

export function getNetwork(value: CryptoNetwork): NetworkMeta {
  return NETWORKS.find((n) => n.value === value) ?? NETWORKS[0]
}

export interface WalletProvider {
  value: string
  label: string
  networks: CryptoNetwork[]
  custody: WalletCustodyType[]
  /** EIP-6963 rdns values the browser extension announces itself under */
  rdns?: string[]
  /** window key the Solana extension injects under */
  solanaKey?: string
  /** Extra name fragments to match on when the identifier does not line up */
  aliases?: string[]
  /** Where to send a client who does not have the extension yet */
  installUrl?: string
  /** False for hardware and exchange wallets that cannot sign in the browser */
  connectable?: boolean
}

export const WALLET_PROVIDERS: WalletProvider[] = [
  {
    value: "metamask",
    label: "MetaMask",
    networks: ["ETH", "SOL"],
    custody: ["SELF_HOSTED"],
    rdns: ["io.metamask", "io.metamask.flask"],
    installUrl: "https://metamask.io/download/",
    connectable: true,
  },
  {
    value: "rabby",
    label: "Rabby",
    networks: ["ETH"],
    custody: ["SELF_HOSTED"],
    rdns: ["io.rabby"],
    installUrl: "https://rabby.io/",
    connectable: true,
  },
  {
    value: "coinbase-wallet",
    label: "Coinbase Wallet",
    networks: ["ETH", "SOL"],
    custody: ["SELF_HOSTED"],
    rdns: ["com.coinbase.wallet"],
    installUrl: "https://www.coinbase.com/wallet/downloads",
    connectable: true,
  },
  {
    value: "phantom",
    label: "Phantom",
    networks: ["SOL", "ETH"],
    custody: ["SELF_HOSTED"],
    rdns: ["app.phantom"],
    solanaKey: "phantom",
    installUrl: "https://phantom.app/download",
    connectable: true,
  },
  {
    value: "solflare",
    label: "Solflare",
    networks: ["SOL"],
    custody: ["SELF_HOSTED"],
    solanaKey: "solflare",
    installUrl: "https://solflare.com/download",
    connectable: true,
  },
  {
    value: "backpack",
    label: "Backpack",
    networks: ["ETH", "SOL"],
    custody: ["SELF_HOSTED"],
    solanaKey: "backpack",
    installUrl: "https://backpack.app/downloads",
    connectable: true,
  },
  {
    value: "ledger",
    label: "Ledger",
    networks: ["ETH", "SOL"],
    custody: ["SELF_HOSTED"],
    connectable: false,
  },
  { value: "coinbase", label: "Coinbase", networks: ["ETH", "SOL"], custody: ["CUSTODIAL_VASP"] },
  { value: "kraken", label: "Kraken", networks: ["ETH", "SOL"], custody: ["CUSTODIAL_VASP"] },
  { value: "binance", label: "Binance", networks: ["ETH", "SOL"], custody: ["CUSTODIAL_VASP"] },
  { value: "okx", label: "OKX", networks: ["ETH", "SOL"], custody: ["CUSTODIAL_VASP"] },
  {
    value: "other",
    label: "Other",
    networks: ["ETH", "SOL"],
    custody: ["SELF_HOSTED", "CUSTODIAL_VASP"],
    connectable: true,
  },
]

export function getProvider(value: string): WalletProvider | undefined {
  return WALLET_PROVIDERS.find((p) => p.value === value)
}

/**
 * Identifiers and names to hand to `findWallet` for a chosen provider.
 * Includes the Wallet Standard id form, since a wallet that registers there
 * is keyed by its own display name rather than by an rdns.
 */
export function walletMatcher(value: string) {
  const provider = getProvider(value)
  if (!provider) return { ids: [], names: [] }
  return {
    ids: [
      ...(provider.rdns ?? []),
      ...(provider.solanaKey ? [provider.solanaKey] : []),
      "ws:" + provider.label,
    ],
    names: [provider.label, ...(provider.aliases ?? [])],
  }
}

export function providerOptions(network: CryptoNetwork, custody: WalletCustodyType) {
  return WALLET_PROVIDERS.filter(
    (p) => p.networks.includes(network) && p.custody.includes(custody)
  )
}

export function providerLabel(value: string): string {
  return WALLET_PROVIDERS.find((p) => p.value === value)?.label ?? value
}

export const WALLET_PURPOSES = [
  { value: "operational", label: "Operational payments" },
  { value: "treasury", label: "Treasury" },
  { value: "supplier", label: "Supplier payments" },
  { value: "payroll", label: "Payroll" },
  { value: "settlement", label: "Client settlement" },
  { value: "business", label: "Business" },
] as const

export function purposeLabel(value: string): string {
  return WALLET_PURPOSES.find((p) => p.value === value)?.label ?? value
}

export const CUSTODY_TYPES: { value: WalletCustodyType; label: string }[] = [
  { value: "SELF_HOSTED", label: "Self-hosted" },
  { value: "CUSTODIAL_VASP", label: "Custodial exchange / VASP" },
]

export function custodyLabel(value: WalletCustodyType): string {
  return CUSTODY_TYPES.find((c) => c.value === value)?.label ?? value
}

/** Ownership proof method per FSD FR-4. Self-hosted signs, custodial uploads evidence. */
export function ownershipMethod(custody: WalletCustodyType) {
  return custody === "SELF_HOSTED" ? "WALLET_SIGNING" : "CUSTODIAL_EVIDENCE"
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** Returns an error string, or undefined when the address is well formed. */
export function validateAddress(
  network: CryptoNetwork,
  address: string
): string | undefined {
  const value = address.trim()
  if (!value) return "Enter the wallet address"
  if (network === "ETH") {
    return EVM_ADDRESS.test(value)
      ? undefined
      : "Enter a valid Ethereum address, 0x followed by 40 hexadecimal characters"
  }
  return SOLANA_ADDRESS.test(value)
    ? undefined
    : "Enter a valid Solana address, 32 to 44 base58 characters"
}

export const ADDRESS_PLACEHOLDER: Record<CryptoNetwork, string> = {
  ETH: "0xA9C34567890abcdef1234567890abcdef1234567",
  SOL: "7xKXtg2CW3eBc5s1Yb9tKQZpVn4rJmDqHfLuAeSoP1aZ",
}

/** First 4 and last 4 characters bold, middle plain — the Review screen treatment. */
export function splitAddress(address: string) {
  if (address.length <= 12) return { head: address, body: "", tail: "" }
  return {
    head: address.slice(0, 4),
    body: address.slice(4, -4),
    tail: address.slice(-4),
  }
}

export function shortenAddress(address: string) {
  if (address.length <= 16) return address
  return address.slice(0, 8) + "..." + address.slice(-6)
}

const HEX = "0123456789abcdef"

function randomHex(length: number) {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += HEX[Math.floor(Math.random() * 16)]
  }
  return out
}

export function generateWalletId() {
  return "wlt_" + randomHex(16)
}

export function generateRequestId() {
  return randomHex(32)
}

/**
 * The challenge text the client signs (FSD FR-4). Nonce plus a 10 minute TTL,
 * the same shape the Crypto Engine returns on
 * POST /wallets/{walletId}/ownership-challenge.
 */
export function buildOwnershipMessage(input: {
  clientNo: string
  address: string
  network: CryptoNetwork
  issuedAt: Date
}) {
  const expires = new Date(input.issuedAt.getTime() + 10 * 60 * 1000)
  return [
    "DK Bank wallet ownership verification",
    "Client: " + input.clientNo,
    "Wallet: " + input.address,
    "Network: " + getNetwork(input.network).label,
    "Nonce: " + randomHex(16),
    "Expires: " + expires.toISOString(),
    "",
    "Signing this message proves you control this wallet. It does not move funds.",
  ].join("\n")
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** Mock proof. EVM = 65-byte EIP-191 hex, Solana = base58 ed25519 (FSD FR-5). */
export function generateSignature(network: CryptoNetwork) {
  if (network === "ETH") return "0x" + randomHex(130)
  let out = ""
  for (let i = 0; i < 88; i++) {
    out += BASE58[Math.floor(Math.random() * BASE58.length)]
  }
  return out
}

/**
 * Seeded so the list matches the reference design on first load. One
 * unverified wallet, so both the Verify wallet action and the empty state
 * (after deleting it) are reachable.
 */
export const SEED_CRYPTO_WALLETS: CryptoWallet[] = [
  {
    id: "wlt_9f3c17a45be20d81",
    label: "Default own wallet",
    address: "0xA9A71cbe430D8F2E1e5f4B2c638d3e0F47A3c9d5",
    network: "ETH",
    custodyType: "SELF_HOSTED",
    provider: "metamask",
    purpose: "operational",
    status: "Unverified",
    ownershipVerified: false,
    createdAt: "2026-08-11T03:24:00.000Z",
  },
]
