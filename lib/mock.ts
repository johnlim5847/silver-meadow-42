// lib/mock.ts — FROZEN CONTRACT. Mock data for the CIB payments reference demo.
// Agents B/C/D import from here. Do not edit after scaffold freeze (see SCAFFOLD.md).
// Data shapes mirror the DK Payment API condensed reference (api-facts.md).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = "Successful" | "Failed" | "Pending"
export type TransferType =
  | "own-account"
  | "intrabank"
  | "interbank"
  | "batch"
  | "payroll"
export type PayoutMethod = "LOCAL" | "SWIFT" | "BOOK"
/** Rail key for purpose-code sets. LOCAL and BOOK share one corporate set. */
export type Rail = "LOCAL" | "BOOK" | "SWIFT"
export type FeeCategory = "A" | "B" | "C" | "D"
/** SWIFT charge bearer (ISO 20022). Only applicable to SWIFT payouts; default SHAR. */
export type ChargeBearer = "SHAR" | "CRED" | "DEBT"

export interface Wallet {
  /** `${accountNumber}-${currency}` — unique across all accounts */
  id: string
  accountNumber: string
  accountName: string
  currency: string
  balance: number
}

export interface Country {
  /** ISO 3166-1 alpha-2 */
  code: string
  name: string
}

export interface PurposeCode {
  code: string
  label: string
}

export interface Corridor {
  currency: string
  /** ISO alpha-2 codes served for this currency */
  countries: string[]
  payoutMethod: PayoutMethod
  /** e.g. "Same day" */
  delivery: string
}

export interface FeeResult {
  category: FeeCategory
  amount: number
  currency: string
  /** Plain-English explanation of the PFX-18 rule that applied (tooltip copy) */
  ruleText: string
}

export interface PaymentTask {
  /** 32-hex task id */
  id: string
  type: TransferType
  status: TaskStatus
  /** ISO datetime */
  submittedAt: string
  completedAt?: string
  fromAccount: string
  sourceCurrency: string
  sourceAmount: number
  toName: string
  toAccount: string
  destinationCurrency: string
  destinationAmount?: number
  destinationCountry?: string
  payoutMethod?: PayoutMethod
  /** Customer FX rate applied, destination-per-source, when FX was involved */
  rate?: number
  fee?: FeeResult
  /** SWIFT charge bearer chosen at submit. Only set for SWIFT payouts. */
  chargeBearer?: ChargeBearer
  purpose?: string
  reference?: string
  /** Receiving bank — BIC on SWIFT, bank name on LOCAL */
  beneficiaryBank?: string
  checkerNote?: string
}

export interface TxHistoryEntry {
  id: string
  /** ISO datetime */
  date: string
  description: string
  /** display string, e.g. "8296310892 · USD" */
  account: string
  /** signed: negative = debit, positive = credit */
  amount: number
  currency: string
  status: TaskStatus
}

export interface MockBeneficiary {
  id: string
  name: string
  accountNumber: string
  accountType: "Individual" | "Corporate"
  destinationCurrency: string
  destinationCountry: string
  payoutMethod: PayoutMethod
  bankName: string
  swiftCode?: string
  street?: string
  town?: string
  postcode?: string
  createdAt: string
  // LOCAL-rail KYC block (only collected on LOCAL payouts).
  alias?: string
  bankAccountType?: string
  bankCode?: string
  contact?: string
  email?: string
  idType?: string
  idNumber?: string
  relationship?: string
}

/** Beneficiary bank account type, collected on LOCAL payouts. */
export const BANK_ACCOUNT_TYPES = ["Current Account", "Savings Account"] as const
/** Beneficiary identification type (LOCAL KYC). */
export const ID_TYPES = ["Passport", "National ID", "Driving License", "Tax ID"] as const
/** Remitter-to-beneficiary relationship (LOCAL KYC). */
export const BENEFICIARY_RELATIONSHIPS = [
  "Supplier",
  "Customer",
  "Employee",
  "Intercompany",
  "Other",
] as const

export interface PaymentTemplate {
  id: string
  name: string
  type: TransferType
  fromAccount: string
  sourceCurrency: string
  toName: string
  toAccount: string
  destinationCurrency: string
  destinationCountry?: string
  amount?: number
  purpose?: string
  reference?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Company + accounts
// ---------------------------------------------------------------------------

export const COMPANY = {
  name: "UAT Test",
  clientNo: "66666666",
} as const

export const MCA_ACCOUNT_NUMBER = "8296310892"
export const BTN_ACCOUNT_NUMBER = "8289066238"

export const MCA_WALLETS: Wallet[] = [
  { id: "8296310892-SGD", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "SGD", balance: 50_000.75 },
  { id: "8296310892-USD", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "USD", balance: 90_674_131.98 },
  { id: "8296310892-INR", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "INR", balance: 12_450_000.0 },
  { id: "8296310892-AUD", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "AUD", balance: 125_640.2 },
  { id: "8296310892-EUR", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "EUR", balance: 310_905.12 },
  { id: "8296310892-JPY", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "JPY", balance: 8_540_000 },
  { id: "8296310892-GBP", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "GBP", balance: 64_780.55 },
  { id: "8296310892-HKD", accountNumber: MCA_ACCOUNT_NUMBER, accountName: "Multi-currency account", currency: "HKD", balance: 1_204_330.18 },
]

export const BTN_WALLET: Wallet = {
  id: "8289066238-BTN",
  accountNumber: BTN_ACCOUNT_NUMBER,
  accountName: "BTN account",
  currency: "BTN",
  balance: 1_185_671.57,
}

// A second company account that overlaps currencies with the MCA. Without a
// second account of the same currency, a same-currency own-account transfer
// (e.g. USD -> USD) has no eligible destination, so the rule cannot be shown.
export const OPERATING_ACCOUNT_NUMBER = "8296310777"
export const OPERATING_WALLETS: Wallet[] = [
  { id: "8296310777-USD", accountNumber: OPERATING_ACCOUNT_NUMBER, accountName: "Operating account", currency: "USD", balance: 2_450_000.0 },
  { id: "8296310777-SGD", accountNumber: OPERATING_ACCOUNT_NUMBER, accountName: "Operating account", currency: "SGD", balance: 880_500.25 },
  { id: "8296310777-EUR", accountNumber: OPERATING_ACCOUNT_NUMBER, accountName: "Operating account", currency: "EUR", balance: 145_200.1 },
]

/** Every wallet the company holds: MCA currencies, the operating account, then BTN. */
export const WALLETS: Wallet[] = [...MCA_WALLETS, ...OPERATING_WALLETS, BTN_WALLET]

export function getWallet(id: string): Wallet | undefined {
  return WALLETS.find((w) => w.id === id)
}

// ---------------------------------------------------------------------------
// FX
// ---------------------------------------------------------------------------

/** EXAMPLE margin (2%), the PFX-104 worked-example value. Not a confirmed production figure. */
export const FX_MARGIN = 0.02

/**
 * Units of each currency per 1 USD (raw mid).
 * Chosen so the two pinned raw pairs hold exactly:
 * BTN→SGD 0.0135 (= 1.2744 / 94.4), USD→SGD 1.2744.
 * BTN is pegged 1:1 to INR.
 */
const USD_PER: Record<string, number> = {
  USD: 1,
  SGD: 1.2744,
  BTN: 94.4,
  INR: 94.4,
  EUR: 0.86,
  GBP: 0.74,
  JPY: 148.5,
  AUD: 1.52,
  HKD: 7.85,
}

/** Raw (pre-margin) rate, destination-per-source. Throws on unknown currency. */
export function getRawRate(source: string, dest: string): number {
  const s = USD_PER[source]
  const d = USD_PER[dest]
  if (s === undefined || d === undefined) {
    throw new Error(`No mock FX rate for ${source}→${dest}`)
  }
  return d / s
}

/** Customer rate = raw × (1 − FX_MARGIN), destination-per-source. */
export function getCustomerRate(source: string, dest: string): number {
  return getRawRate(source, dest) * (1 - FX_MARGIN)
}

/** Display rates to 4dp everywhere. */
export function formatRate(rate: number): string {
  return rate.toFixed(4)
}

// ---------------------------------------------------------------------------
// Fees (PFX-18 category logic; corporate values)
// ---------------------------------------------------------------------------

/**
 * Flat fee per category, per debit currency, from the official fee schedule
 * (page 742424586, "Transaction Fees" tab of the UAT setup sheet). UAT Test is
 * a GMC-registered corporate, so the "International & GMC companies — flat"
 * table applies. USD is the base (Category A = USD 10, Category D = USD 40) and
 * the non-USD entries are the published account-currency equivalents. Category
 * C (BTN to BTN domestic) carries no fee. The BTN value for Categories A and D
 * is not published — inferred here from the 1:1 INR peg and flagged in the
 * tooltip shown to users.
 */
export const FEE_TABLE: Record<FeeCategory, Record<string, number>> = {
  A: { USD: 10, SGD: 15, AUD: 15, INR: 950, JPY: 1600, HKD: 75, EUR: 10, GBP: 10, BTN: 950 },
  B: { INR: 750, BTN: 750 },
  C: { BTN: 0 },
  D: { USD: 40, SGD: 50, AUD: 60, INR: 3800, JPY: 6400, HKD: 300, EUR: 35, GBP: 30, BTN: 3800 },
}

const FEE_RULE_TEXT: Record<FeeCategory, string> = {
  A: "Category A. Intrabank or intra-entity transfer (within DK, or between the GMC and Bhutan entities). Flat fee, USD 10 equivalent, charged in the debit currency.",
  B: "Category B. Interbank transfer where the debit account is INR or BTN and the payout currency is INR. Flat fee 750, charged in the debit currency.",
  C: "Category C. Interbank BTN to BTN domestic payment. No fee.",
  D: "Category D. All other interbank transfers. Flat fee, USD 40 equivalent, charged in the debit currency.",
}

/**
 * PFX-18 decision logic (fees apply to outgoing payments only, page 742424586;
 * amounts from the "Transaction Fees" fee schedule):
 *   - intrabank / intra-entity                           -> A
 *   - interbank, debit ccy INR or BTN, payout ccy INR    -> B
 *   - interbank, BTN to BTN domestic                     -> C (no fee)
 *   - interbank, all others                              -> D
 * Category B requires the debit (account) currency to be INR or BTN. An INR
 * payout from, say, a USD account is Category D, not B.
 * Own-account transfers move funds between the client's own accounts and carry
 * no transaction fee, so this function is never called for them.
 * destCountry is accepted for future corridor-specific rules; unused today.
 */
export function computeFee(
  type: TransferType,
  sourceCurrency: string,
  destCurrency: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destCountry?: string
): FeeResult {
  let category: FeeCategory
  if (type === "intrabank") {
    category = "A"
  } else if (
    (sourceCurrency === "INR" || sourceCurrency === "BTN") &&
    destCurrency === "INR"
  ) {
    category = "B"
  } else if (sourceCurrency === "BTN" && destCurrency === "BTN") {
    category = "C"
  } else {
    category = "D"
  }
  const amounts = FEE_TABLE[category]
  const currency =
    amounts[sourceCurrency] !== undefined
      ? sourceCurrency
      : Object.keys(amounts)[0]
  let ruleText = FEE_RULE_TEXT[category]
  if (currency === "BTN" && (category === "A" || category === "D")) {
    ruleText +=
      " The BTN value is inferred from the 1:1 INR peg and is not yet published (open item for ET)."
  }
  return {
    category,
    amount: amounts[currency],
    currency,
    ruleText,
  }
}

// ---------------------------------------------------------------------------
// Payout / external fee (SWIFT correspondent charge; `hasExternalFee` API field)
// ---------------------------------------------------------------------------

export interface ExternalFeeResult {
  amount: number
  currency: string
  ruleText: string
}

/**
 * Example correspondent/payout fee per debit currency for SWIFT payouts. The
 * real amount is set by the correspondent bank and depends on the charge
 * bearer, so these are EXAMPLE values, not confirmed figures.
 */
const EXTERNAL_FEE: Record<string, number> = {
  USD: 20, SGD: 25, EUR: 18, GBP: 15, JPY: 3000, AUD: 30, HKD: 155, INR: 1600, BTN: 1600,
}

/** `hasExternalFee` is true only for SWIFT payouts (correspondent leg). */
export function hasExternalFee(payoutMethod: PayoutMethod): boolean {
  return payoutMethod === "SWIFT"
}

/**
 * The specific SWIFT rail the payout routes over. USD clears via the SCB
 * nostro, every other currency via DBS (per the interim-routing docs). LOCAL
 * uses the local clearing rail, BOOK is an internal book transfer.
 */
export function payoutRail(payoutMethod: PayoutMethod, destCurrency: string): string {
  if (payoutMethod === "SWIFT") return destCurrency === "USD" ? "SWIFT_SCB" : "SWIFT_DBS"
  return payoutMethod
}

/** Payout/external fee on SWIFT payouts (example), or undefined for LOCAL/BOOK. */
export function computeExternalFee(
  payoutMethod: PayoutMethod,
  debitCurrency: string
): ExternalFeeResult | undefined {
  if (payoutMethod !== "SWIFT") return undefined
  const currency = EXTERNAL_FEE[debitCurrency] !== undefined ? debitCurrency : "USD"
  return {
    amount: EXTERNAL_FEE[currency],
    currency,
    ruleText:
      "Correspondent bank payout fee on SWIFT payouts (the hasExternalFee flag). Example value. The actual amount is set by the correspondent bank and who pays it depends on the charge bearer.",
  }
}

// ---------------------------------------------------------------------------
// Settlement (charge bearer applied to the money math)
// ---------------------------------------------------------------------------

export interface SettlementResult {
  /** Amount taken from the debit account, in the source (debit) currency. */
  totalDebit: number
  /** Amount the beneficiary receives, in the destination currency. */
  beneficiaryReceives: number
}

/**
 * Applies the charge bearer to the money math for an outgoing payment. Both the
 * DK transaction fee (dkFee) and the correspondent payout fee (payoutFee) are
 * expressed in the source (debit) currency; rate is destination-per-source
 * (pass 1 for a same-currency payment). Charge bearer only varies on SWIFT
 * payouts (page 742424586 "Transaction Fees" charge-bearer table + ISO 20022);
 * on LOCAL/BOOK rails pass "SHAR" with payoutFee 0, which debits the DK fee
 * separately and sends the full amount.
 *   DEBT — remitter pays both fees. Full amount reaches the beneficiary.
 *   SHAR — remitter pays the DK fee. The payout fee is borne downstream by the
 *          receiver, so it is not added to the debit; the DK fee is.
 *   CRED — the DK fee is netted out of the amount the beneficiary receives, so
 *          the debit is just the amount and the beneficiary receives less.
 */
export function applySettlement(input: {
  sourceAmount: number
  dkFee: number
  payoutFee: number
  rate: number
  chargeBearer: ChargeBearer
  sourceCurrency: string
  destCurrency: string
}): SettlementResult {
  const { sourceAmount, dkFee, payoutFee, rate, chargeBearer } = input
  let totalDebit: number
  let sentInSource: number
  if (chargeBearer === "DEBT") {
    totalDebit = sourceAmount + dkFee + payoutFee
    sentInSource = sourceAmount
  } else if (chargeBearer === "CRED") {
    totalDebit = sourceAmount
    sentInSource = sourceAmount - dkFee
  } else {
    // SHAR (also the LOCAL/BOOK default): DK fee debited separately, full amount sent.
    totalDebit = sourceAmount + dkFee
    sentInSource = sourceAmount
  }
  return {
    totalDebit: Number(totalDebit.toFixed(decimalsFor(input.sourceCurrency))),
    beneficiaryReceives: Number(
      (Math.max(sentInSource, 0) * rate).toFixed(decimalsFor(input.destCurrency))
    ),
  }
}

// ---------------------------------------------------------------------------
// BOP / BTFN (Bhutan TradeFin Net) — invoice-linked FCY trade payments
// ---------------------------------------------------------------------------

/** Trade type collected on a BOP trade payment (BTFN requirements, page 574095362). */
export const TRADE_TYPES = ["Goods Trade", "Service Trade"] as const

export interface BtfnInvoice {
  /** Invoice ID from the BTFN portal */
  id: string
  /** Importer Taxpayer Number */
  importerTpn: string
  currency: string
  /** Full invoice amount */
  amount: number
  /** Amount still unpaid against the invoice */
  pending: number
  /** Good Declaration Number */
  declarationNumber: string
}

/**
 * Example invoices the BTFN portal returns for a BTFN App Ref. In production the
 * CIB portal pulls these from BTFN by the reference and validates them against
 * the payment (approval status, invoice amount vs payment amount, unpaid status).
 * BTFN applies to FCY payments from Bhutan- and GMC-registered companies. Demo data.
 */
export const BTFN_INVOICES: BtfnInvoice[] = [
  { id: "2342342435", importerTpn: "TPN-001", currency: "SGD", amount: 231_242.0, pending: 12_696.0, declarationNumber: "8915775287" },
  { id: "2342323212", importerTpn: "TPN-001", currency: "SGD", amount: 221_842.0, pending: 3_542.0, declarationNumber: "8915775287" },
  { id: "2356735653", importerTpn: "TPN-001", currency: "SGD", amount: 738_241.5, pending: 3_542.0, declarationNumber: "8915775287" },
]

// ---------------------------------------------------------------------------
// Purpose codes (corporate sets, keyed by rail — no retail purposes)
// ---------------------------------------------------------------------------

export const PURPOSE_CODES_LOCAL_BOOK: PurposeCode[] = [
  { code: "TRADE", label: "Trade payment" },
  { code: "SERVICES", label: "Services rendered" },
  { code: "INVOICE", label: "Invoice settlement" },
  { code: "SALARY", label: "Salary payment" },
  { code: "INTERCO", label: "Intercompany transfer" },
  { code: "OTHER", label: "Other corporate purposes" },
]

export const PURPOSE_CODES_SWIFT: PurposeCode[] = [
  { code: "TRADE", label: "Trade payment" },
  { code: "SERVICES", label: "Services rendered" },
  { code: "INVOICE", label: "Invoice settlement" },
  { code: "CAPITAL", label: "Capital injection" },
  { code: "DIVIDEND", label: "Dividend payment" },
  { code: "SALARY", label: "Salary payment" },
  { code: "OTHER", label: "Other corporate purposes" },
]

export function getPurposeCodes(rail: Rail): PurposeCode[] {
  return rail === "SWIFT" ? PURPOSE_CODES_SWIFT : PURPOSE_CODES_LOCAL_BOOK
}

// ---------------------------------------------------------------------------
// Corridors
// ---------------------------------------------------------------------------

export const CORRIDORS: Corridor[] = [
  { currency: "SGD", countries: ["SG"], payoutMethod: "LOCAL", delivery: "Same day" },
  { currency: "USD", countries: ["US"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "INR", countries: ["IN"], payoutMethod: "LOCAL", delivery: "Same day" },
  { currency: "EUR", countries: ["DE", "FR", "NL"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "GBP", countries: ["GB"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "JPY", countries: ["JP"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "AUD", countries: ["AU"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "HKD", countries: ["HK"], payoutMethod: "SWIFT", delivery: "1-3 business days"},
  { currency: "BTN", countries: ["BT"], payoutMethod: "BOOK", delivery: "Instant" },
]

/** Currencies that have at least one payout corridor (use for CurrencySelect). */
export const CORRIDOR_CURRENCIES: string[] = CORRIDORS.map((c) => c.currency)

export function resolveCorridor(
  currency: string,
  country: string
): Corridor | undefined {
  return CORRIDORS.find(
    (c) => c.currency === currency && c.countries.includes(country)
  )
}

/** Destination-country options for a chosen currency (corridor-driven, not the world list). */
export function getCountriesForCurrency(currency: string): Country[] {
  const corridor = CORRIDORS.find((c) => c.currency === currency)
  if (!corridor) return []
  return corridor.countries
    .map((code) => COUNTRIES.find((c) => c.code === code))
    .filter((c): c is Country => c !== undefined)
}

/** Local clearing banks per LOCAL-rail destination country. */
export const LOCAL_BANKS: Record<string, string[]> = {
  SG: [
    "DBS Bank Ltd",
    "OCBC Bank",
    "United Overseas Bank Ltd",
    "Maybank Singapore",
  ],
  IN: ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"],
}

// ---------------------------------------------------------------------------
// Countries (full names, correct spellings)
// ---------------------------------------------------------------------------

export const COUNTRIES: Country[] = [
  { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" },
  { code: "AU", name: "Australia" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BH", name: "Bahrain" },
  { code: "BR", name: "Brazil" },
  { code: "BT", name: "Bhutan" },
  { code: "CA", name: "Canada" },
  { code: "CH", name: "Switzerland" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CZ", name: "Czechia" },
  { code: "DE", name: "Germany" },
  { code: "DK", name: "Denmark" },
  { code: "EG", name: "Egypt" },
  { code: "ES", name: "Spain" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IN", name: "India" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KH", name: "Cambodia" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "LK", name: "Sri Lanka" },
  { code: "LU", name: "Luxembourg" },
  { code: "MA", name: "Morocco" },
  { code: "MM", name: "Myanmar" },
  { code: "MN", name: "Mongolia" },
  { code: "MU", name: "Mauritius" },
  { code: "MV", name: "Maldives" },
  { code: "MX", name: "Mexico" },
  { code: "MY", name: "Malaysia" },
  { code: "NG", name: "Nigeria" },
  { code: "NL", name: "Netherlands" },
  { code: "NO", name: "Norway" },
  { code: "NP", name: "Nepal" },
  { code: "NZ", name: "New Zealand" },
  { code: "OM", name: "Oman" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PK", name: "Pakistan" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SE", name: "Sweden" },
  { code: "SG", name: "Singapore" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "VN", name: "Vietnam" },
  { code: "ZA", name: "South Africa" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
]

// ---------------------------------------------------------------------------
// Seeded tasks (the two real UAT tasks verbatim + varied ones)
// ---------------------------------------------------------------------------

export const SEED_TASKS: PaymentTask[] = [
  {
    // Real UAT task, verbatim
    id: "bcc17a8a87fa4449b1ac79180cb948a8",
    type: "intrabank",
    status: "Pending",
    submittedAt: "2026-07-23T19:12:00",
    fromAccount: BTN_ACCOUNT_NUMBER,
    sourceCurrency: "BTN",
    sourceAmount: 100,
    toName: "UAT Test",
    toAccount: MCA_ACCOUNT_NUMBER,
    destinationCurrency: "SGD",
    destinationCountry: "BT",
    payoutMethod: "BOOK",
  },
  {
    // Real UAT task, verbatim
    id: "0aa7934b49f748658ce02c614af98de5",
    type: "interbank",
    status: "Pending",
    submittedAt: "2026-07-23T19:18:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "SGD",
    sourceAmount: 5,
    toName: "Test Beneficiary Pte Ltd",
    toAccount: "0012345678",
    destinationCurrency: "SGD",
    destinationCountry: "SG",
    payoutMethod: "LOCAL",
  },
  {
    id: "3f8a1c62e94b47d0a1c58e72b6d90f14",
    type: "interbank",
    status: "Successful",
    submittedAt: "2026-07-21T10:04:00",
    completedAt: "2026-07-22T09:40:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    sourceAmount: 12_500,
    toName: "Pacific Components Inc",
    toAccount: "739201845",
    destinationCurrency: "USD",
    destinationCountry: "US",
    payoutMethod: "SWIFT",
    fee: computeFee("interbank", "USD", "USD", "US"),
    purpose: "Trade payment",
    reference: "INV-2088 semiconductors",
  },
  {
    id: "9b04d7e1a52c48f3b6a90d1c47e82a55",
    type: "interbank",
    status: "Successful",
    submittedAt: "2026-07-20T14:22:00",
    completedAt: "2026-07-20T16:05:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "INR",
    sourceAmount: 250_000,
    toName: "Mumbai Textiles Pvt Ltd",
    toAccount: "911020045067812",
    destinationCurrency: "INR",
    destinationCountry: "IN",
    payoutMethod: "LOCAL",
    fee: computeFee("interbank", "INR", "INR", "IN"),
    purpose: "Invoice settlement",
    reference: "PO-4471 fabric order",
  },
  {
    id: "c71e5b09d834a2f6b1e04c98a7d52e36",
    type: "own-account",
    status: "Successful",
    submittedAt: "2026-07-22T09:31:00",
    completedAt: "2026-07-22T09:31:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    sourceAmount: 10_000,
    toName: "UAT Test",
    toAccount: MCA_ACCOUNT_NUMBER,
    destinationCurrency: "SGD",
    destinationAmount: 12_489.12,
    rate: 1.2489,
    payoutMethod: "BOOK",
  },
  {
    id: "5d20a9f4c1b83e67a942f05d8c31b7e0",
    type: "interbank",
    status: "Failed",
    submittedAt: "2026-07-19T11:15:00",
    completedAt: "2026-07-19T15:48:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "EUR",
    sourceAmount: 8_400,
    toName: "Acme Trading GmbH",
    toAccount: "DE44500105175407324931",
    destinationCurrency: "EUR",
    destinationCountry: "DE",
    payoutMethod: "SWIFT",
    fee: computeFee("interbank", "EUR", "EUR", "DE"),
    purpose: "Invoice settlement",
    reference: "INV-2201",
    checkerNote: "Rejected. Duplicate of invoice INV-2201, already paid on 12 Jul.",
  },
  {
    id: "e83b6d15f7a04c29b5d18e64a0c97f42",
    type: "intrabank",
    status: "Successful",
    submittedAt: "2026-07-18T16:40:00",
    completedAt: "2026-07-18T17:02:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "SGD",
    sourceAmount: 2_000,
    toName: "Druk Holdings Ltd",
    toAccount: "8267014455",
    destinationCurrency: "SGD",
    destinationCountry: "BT",
    payoutMethod: "BOOK",
    fee: computeFee("intrabank", "SGD", "SGD"),
    purpose: "Intercompany transfer",
    reference: "July working capital",
  },
  {
    id: "d4f7a1b9c62e480fb3a5719d84c60e27",
    type: "batch",
    status: "Successful",
    submittedAt: "2026-07-16T10:20:00",
    completedAt: "2026-07-16T14:30:00",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    sourceAmount: 486_200,
    toName: "Batch payment (18 payees)",
    toAccount: "—",
    destinationCurrency: "USD",
    destinationCountry: "US",
    payoutMethod: "SWIFT",
    purpose: "Trade payment",
    reference: "supplier-batch-jul.csv",
  },
  {
    id: "1a5c9e37b6d24f80a3e71b09c8d45f26",
    type: "payroll",
    status: "Successful",
    submittedAt: "2026-07-15T08:30:00",
    completedAt: "2026-07-15T12:10:00",
    fromAccount: BTN_ACCOUNT_NUMBER,
    sourceCurrency: "BTN",
    sourceAmount: 845_000,
    toName: "Payroll batch (42 payees)",
    toAccount: "—",
    destinationCurrency: "BTN",
    destinationCountry: "BT",
    payoutMethod: "LOCAL",
    purpose: "Salary payment",
    reference: "July 2026 payroll",
  },
]

// ---------------------------------------------------------------------------
// Transaction history (home dashboard)
// ---------------------------------------------------------------------------

export const TX_HISTORY: TxHistoryEntry[] = [
  { id: "th-01", date: "2026-07-22T09:40:00", description: "Pacific Components Inc · Trade payment", account: "8296310892 · USD", amount: -12_500, currency: "USD", status: "Successful" },
  { id: "th-02", date: "2026-07-22T09:31:00", description: "FX conversion USD to SGD", account: "8296310892 · SGD", amount: 12_489.12, currency: "SGD", status: "Successful" },
  { id: "th-03", date: "2026-07-21T15:20:00", description: "Incoming · Horizon Logistics Pte Ltd", account: "8296310892 · SGD", amount: 45_200, currency: "SGD", status: "Successful" },
  { id: "th-04", date: "2026-07-20T16:05:00", description: "Mumbai Textiles Pvt Ltd · Invoice settlement", account: "8296310892 · INR", amount: -250_000, currency: "INR", status: "Successful" },
  { id: "th-05", date: "2026-07-19T15:48:00", description: "Acme Trading GmbH · Invoice settlement", account: "8296310892 · EUR", amount: -8_400, currency: "EUR", status: "Failed" },
  { id: "th-06", date: "2026-07-17T10:12:00", description: "Incoming · Bhutan Ventures LLC", account: "8296310892 · USD", amount: 230_000, currency: "USD", status: "Successful" },
  { id: "th-07", date: "2026-07-15T12:10:00", description: "July 2026 payroll · 42 payees", account: "8289066238 · BTN", amount: -845_000, currency: "BTN", status: "Successful" },
]

// ---------------------------------------------------------------------------
// Seed beneficiaries + templates
// ---------------------------------------------------------------------------

export const SEED_BENEFICIARIES: MockBeneficiary[] = [
  {
    id: "ben-01",
    name: "Test Beneficiary Pte Ltd",
    accountNumber: "0012345678",
    accountType: "Corporate",
    destinationCurrency: "SGD",
    destinationCountry: "SG",
    payoutMethod: "LOCAL",
    bankName: "DBS Bank Ltd",
    street: "12 Marina Boulevard",
    town: "Singapore",
    postcode: "018982",
    alias: "Test Bene SG",
    bankAccountType: "Current Account",
    bankCode: "7171-001",
    contact: "+65 6221 0000",
    email: "ap@testbeneficiary.sg",
    idType: "Tax ID",
    idNumber: "200812345K",
    relationship: "Supplier",
    createdAt: "2026-07-10T09:00:00",
  },
  {
    id: "ben-02",
    name: "Pacific Components Inc",
    accountNumber: "739201845",
    accountType: "Corporate",
    destinationCurrency: "USD",
    destinationCountry: "US",
    payoutMethod: "SWIFT",
    bankName: "JPMorgan Chase Bank",
    swiftCode: "CHASUS33",
    street: "2900 Semiconductor Drive",
    town: "San Jose",
    postcode: "95051",
    createdAt: "2026-06-28T11:30:00",
  },
  {
    id: "ben-03",
    name: "Mumbai Textiles Pvt Ltd",
    accountNumber: "911020045067812",
    accountType: "Corporate",
    destinationCurrency: "INR",
    destinationCountry: "IN",
    payoutMethod: "LOCAL",
    bankName: "HDFC Bank",
    street: "84 Linking Road",
    town: "Mumbai",
    postcode: "400050",
    alias: "Mumbai Textiles",
    bankAccountType: "Current Account",
    bankCode: "HDFC0000084",
    contact: "+91 22 6100 2200",
    email: "accounts@mumbaitextiles.in",
    idType: "Tax ID",
    idNumber: "27AAACM1234F1Z5",
    relationship: "Supplier",
    createdAt: "2026-07-02T14:45:00",
  },
  {
    id: "ben-04",
    name: "Lily Tan Mei Ling",
    accountNumber: "0198822345",
    accountType: "Individual",
    destinationCurrency: "SGD",
    destinationCountry: "SG",
    payoutMethod: "LOCAL",
    bankName: "OCBC Bank",
    street: "8 Bedok Reservoir Road",
    town: "Singapore",
    postcode: "479232",
    alias: "Lily Tan",
    bankAccountType: "Savings Account",
    bankCode: "7339-002",
    contact: "+65 9123 4567",
    email: "lily.tan@gmail.com",
    idType: "Passport",
    idNumber: "E1234567X",
    relationship: "Employee",
    createdAt: "2026-07-14T10:15:00",
  },
  // BOOK payees — the beneficiary list splits Internal (BOOK) from Other Bank
  // (LOCAL/SWIFT), so the type filter needs rows on both sides. No address on
  // the domestic BT rail (A4).
  {
    id: "ben-05",
    name: "Druk Holdings Ltd",
    accountNumber: "8267014455",
    accountType: "Corporate",
    destinationCurrency: "BTN",
    destinationCountry: "BT",
    payoutMethod: "BOOK",
    bankName: "DK Bank",
    createdAt: "2026-06-20T09:20:00",
  },
  {
    id: "ben-06",
    name: "Karma Wangchuk",
    accountNumber: "8271903846",
    accountType: "Individual",
    destinationCurrency: "BTN",
    destinationCountry: "BT",
    payoutMethod: "BOOK",
    bankName: "DK Bank",
    createdAt: "2026-07-08T15:40:00",
  },
  {
    id: "ben-07",
    name: "Acme Trading GmbH",
    accountNumber: "DE89370400440532013000",
    accountType: "Corporate",
    destinationCurrency: "EUR",
    destinationCountry: "DE",
    payoutMethod: "SWIFT",
    bankName: "Deutsche Bank AG",
    swiftCode: "DEUTDEFF",
    street: "16 Taunusanlage",
    town: "Frankfurt am Main",
    postcode: "60325",
    createdAt: "2026-07-16T11:05:00",
  },
  {
    id: "ben-08",
    name: "Thames Freight Services Ltd",
    accountNumber: "31926819",
    accountType: "Corporate",
    destinationCurrency: "GBP",
    destinationCountry: "GB",
    payoutMethod: "SWIFT",
    bankName: "Barclays Bank PLC",
    swiftCode: "BARCGB22",
    street: "1 Churchill Place",
    town: "London",
    postcode: "E14 5HP",
    createdAt: "2026-07-19T13:25:00",
  },
]

export const SEED_TEMPLATES: PaymentTemplate[] = [
  {
    id: "tpl-01",
    name: "Monthly office rent · SG",
    type: "interbank",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "SGD",
    toName: "CapitaLand Commercial",
    toAccount: "0271884236",
    destinationCurrency: "SGD",
    destinationCountry: "SG",
    amount: 8_500,
    purpose: "Services rendered",
    reference: "Office rent 61 Robinson Road",
    createdAt: "2026-06-15T10:00:00",
  },
  {
    id: "tpl-02",
    name: "US supplier · Pacific Components",
    type: "interbank",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    toName: "Pacific Components Inc",
    toAccount: "739201845",
    destinationCurrency: "USD",
    destinationCountry: "US",
    purpose: "Trade payment",
    createdAt: "2026-06-28T11:35:00",
  },
  // Every seeded template is a currency pair PFX-109 actually enables for its
  // payment type, so opening one in a wizard never lands on a blocked combination.
  {
    id: "tpl-03",
    name: "Intercompany top-up · Druk Holdings",
    type: "intrabank",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    toName: "Druk Holdings Ltd",
    toAccount: "8267014455",
    destinationCurrency: "SGD",
    destinationCountry: "BT",
    amount: 25_000,
    purpose: "Intercompany transfer",
    reference: "Monthly intercompany funding",
    createdAt: "2026-07-04T09:15:00",
  },
  {
    id: "tpl-04",
    name: "INR to BTN conversion",
    type: "own-account",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "INR",
    toName: "Own account",
    toAccount: BTN_ACCOUNT_NUMBER,
    destinationCurrency: "BTN",
    destinationCountry: "BT",
    amount: 500_000,
    purpose: "Other corporate purposes",
    createdAt: "2026-07-09T14:20:00",
  },
  {
    id: "tpl-05",
    name: "India supplier · Mumbai Textiles",
    type: "interbank",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "INR",
    toName: "Mumbai Textiles Pvt Ltd",
    toAccount: "911020045067812",
    destinationCurrency: "INR",
    destinationCountry: "IN",
    amount: 250_000,
    purpose: "Invoice settlement",
    reference: "Invoice settlement INR",
    createdAt: "2026-07-11T16:00:00",
  },
  {
    id: "tpl-06",
    name: "BTN payroll funding · USD",
    type: "intrabank",
    fromAccount: BTN_ACCOUNT_NUMBER,
    sourceCurrency: "BTN",
    toName: "Druk Holdings Ltd",
    toAccount: "8267014455",
    destinationCurrency: "USD",
    destinationCountry: "BT",
    purpose: "Salary payment",
    createdAt: "2026-07-17T10:40:00",
  },
  {
    id: "tpl-07",
    name: "Operating account sweep · USD",
    type: "own-account",
    fromAccount: MCA_ACCOUNT_NUMBER,
    sourceCurrency: "USD",
    toName: "Own account",
    toAccount: OPERATING_ACCOUNT_NUMBER,
    destinationCurrency: "USD",
    amount: 100_000,
    purpose: "Other corporate purposes",
    createdAt: "2026-07-21T08:50:00",
  },
]

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Currencies conventionally displayed without decimals. */
const ZERO_DP_CURRENCIES = new Set(["JPY"])

export function decimalsFor(currency: string): number {
  return ZERO_DP_CURRENCIES.has(currency) ? 0 : 2
}

/** "50,000.75" — thousands separators, dp by currency (JPY 0dp, else 2dp). */
export function formatNumber(amount: number, currency = "USD"): string {
  const dp = decimalsFor(currency)
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })
}

/** "50,000.75 SGD" — amount then ISO code, never a bare symbol. */
export function formatMoney(amount: number, currency: string): string {
  return `${formatNumber(amount, currency)} ${currency}`
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "23 Jul 2026, 19:12" */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

/** "23 Jul 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * CBS transaction id, assigned by the core banking system once a payment
 * settles. Only Successful transactions have one; Pending/Failed return
 * undefined. Derived deterministically from the task id so it is stable across
 * renders (no hydration mismatch).
 */
export function transactionIdFor(task: PaymentTask): string | undefined {
  if (task.status !== "Successful") return undefined
  let n = 0
  for (const ch of task.id.slice(0, 14)) n = (n * 31 + ch.charCodeAt(0)) >>> 0
  return `CBS${String(10_000_000_000 + (n % 89_999_999_999))}`
}

/** Random 32-char lowercase hex id, matching the UAT task id shape. */
export function generateTaskId(): string {
  let out = ""
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16)
  }
  return out
}

/** Sum of all MCA wallet balances converted to USD at raw rates, 2dp. */
export function mcaTotalUsd(): number {
  const total = MCA_WALLETS.reduce(
    (sum, w) => sum + w.balance / USD_PER[w.currency],
    0
  )
  return Math.round(total * 100) / 100
}
