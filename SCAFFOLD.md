# SCAFFOLD.md - frozen contract for the CIB payments reference demo

Built by Agent A. Agents B, C, D build screens on top of this scaffold **without editing the frozen files**. Everything documented here is a contract: import it, do not change it.

## File ownership

| Owner | Files |
|---|---|
| B | `app/payments/own-account/`, `app/payments/intrabank/`, `app/payments/interbank/` |
| C | `app/payments/batch/`, `app/payments/payroll/`, `app/payments/inquiry/` |
| D | `app/payments/beneficiaries/`, `app/payments/templates/`, `app/requests/payments/` |
| NOBODY | `components/shared/`, `components/shell/`, `components/ui/`, `lib/mock.ts`, `lib/store.ts`, `lib/utils.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, the nav stubs (`app/account|loan|crypto|administration`) |

Each owned route currently contains a stub page (`PageShell` + `EmptyState`). Overwrite the whole `page.tsx`. Add extra files (sub-components, `layout.tsx`, nested routes) only inside your owned directories.

## Stack facts

- Next.js 16 app router, TypeScript, Tailwind v4 (CSS-config in `globals.css`, no tailwind.config), no `src/` dir. Routes live at `app/...`.
- shadcn/ui **base-nova style on Base UI** (`@base-ui/react`), NOT Radix. Composition uses `render={<Component />}` , **never `asChild`**. Example: `<Button render={<Link href="/x" />}>Go</Button>`.
- Installed ui components (`components/ui/`): alert, badge, button, calendar, card, checkbox, command, dialog, dropdown-menu, input, input-group, label, popover, progress, radio-group, scroll-area, select, separator, skeleton, sonner, switch, table, tabs, textarea, tooltip. Toasts: `import { toast } from "sonner"` (Toaster already mounted in the root layout, `position="bottom-center"`).
- `zustand` installed. Icons: `lucide-react`.
- Client pages: the wizards need `"use client"` at the top of your `page.tsx` (they use the store and stateful shared components).
- Quality gate: `npx tsc --noEmit` and `npm run build` must stay clean. Desktop only (≥1280px), no tests.

## Design tokens (Tailwind classes, defined in `app/globals.css`)

| Class | Value | Use |
|---|---|---|
| `text-ink` | `#262a2e` | body text |
| `text-heading` | `#1c2024` | headings |
| `text-muted-ink` | `#80838d` | muted text, labels |
| `text-secondary-ink` | `#60646c` | secondary text |
| `bg-shell` | `#f7f8fa` | sidebar / soft panel bg |
| `bg-soft` | `#f5f5f5` | soft fills, chips |
| `border-line` | `#efefef` | card borders, dividers |
| `bg-navy` | `#113264` | primary buttons, active accents |
| `bg-navy-deep` | `#0c2544` | button hover |
| `text-link` | `#0d74ce` | text links |
| `bg-nav-active` | `#dfecff` | active nav pill |
| `bg-info-tint` | `#e6f4fe` | info icon tiles |
| `bg-warm-tint` | `#fff7ed` | warning icon tiles |

shadcn semantic vars are mapped to the same palette (`primary` = navy, `muted-foreground` = `#80838d`, `border` = `#efefef`, `--radius` = 12px, so `rounded-lg` = 12px, `rounded-2xl` ≈ 22px; big cards in the demo use `rounded-2xl border border-line bg-white p-6`).

Type scale: page title 36px semibold (PageShell does it), section titles `text-xl leading-[26px] font-semibold text-heading` (20px), body 14px (`text-sm`), small 12px (`text-xs`). Font is Inter 400/500/600 (auto via `font-sans`). **Sentence case everywhere.** Amounts always with ISO code (`formatMoney`), never a bare `$`. Timestamps human via `formatTimestamp`, never raw ms. Buttons are pill-shaped by default (`Button` = navy pill, 32px high).

## Layout shell

Root layout already renders the sidebar, BuildNotesProvider and Toaster. A page renders ONLY:

```tsx
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return <PageShell title="Interbank transfer">...content...</PageShell>
}
```

`PageShell` props:

```ts
{
  title: string                 // 36px page title, sentence case
  actions?: React.ReactNode     // optional header slot, left of the bell cluster
                                // (D: put the Maker/Checker role toggle here)
  className?: string            // applied to the content wrapper (default mt-8)
  children: React.ReactNode
}
```

Content column is centered, `max-w-[1160px] px-12`. Wizards look best constrained to `max-w-[640px]`; do that inside your page.

## Shared components (`components/shared/`)

All importable as `@/components/shared/<file>`.

### WizardSteps - `wizard-steps.tsx`
```ts
{ steps?: string[]           // default ["Input", "Preview", "Submit"]
  current: number            // 0-based; MUST advance as the user moves through the wizard
  className?: string }
```

### AccountSelect - `account-select.tsx`
```ts
{ value?: string                      // Wallet id, e.g. "8296310892-USD"
  onChange: (walletId: string) => void
  wallets?: Wallet[]                  // default WALLETS; pass a filtered list to constrain
  excludeId?: string                  // hide one wallet id (e.g. the chosen source)
  label?: string; placeholder?: string; error?: string
  disabled?: boolean; id?: string; className?: string }
```
Options show account name, number, currency and balance with ISO code.

### CurrencyAmountInput - `currency-amount-input.tsx`
```ts
{ currency: string                    // ISO prefix chip
  value: string                       // RAW numeric string ("12500.5", "" when empty)
  onChange: (value: string) => void
  label?: string; error?: string; disabled?: boolean
  placeholder?: string; id?: string; className?: string }
```
Formats thousands + 2dp on blur (JPY 0dp), raw while focused. `Number(value)` to get the amount.

### FxQuoteRow - `fx-quote-row.tsx`
```ts
{ sourceCurrency: string
  destinationCurrency: string
  sourceAmount: number               // pass 0 while amount is empty
  onQuote?: (quote: { rate: number }) => void
  className?: string }
```
Shows customer rate at 4dp, a 60s countdown ring, a refresh button and the computed recipient-receives amount. Auto-re-quotes at 0 and calls `onQuote` on mount + every refresh. Store the last rate for submit. Render it ONLY when source and destination currencies differ (V18 rule).

### FeeLine - `fee-line.tsx`
```ts
{ fee: FeeResult                     // from computeFee(...)
  label?: string                     // default "Transfer fee"
  className?: string }
```
Amount with ISO code + "Category X" badge whose tooltip shows `fee.ruleText`.

### PreviewSummary - `preview-summary.tsx`
```ts
export interface SummaryRow { label: string; value: React.ReactNode; emphasize?: boolean }
{ title?: string; rows: SummaryRow[]; className?: string }
```
Proper read-back card (never a greyed form). Use `emphasize: true` on the total-debit row.

### AckScreen - `ack-screen.tsx`
```ts
{ taskId: string                     // from submitTask(...)
  submittedAt: string                // ISO; rendered "23 Jul 2026, 19:12"
  makeAnotherHref: string            // usually the wizard's own route
  title?: string                     // default "Payment submitted"
  message?: string                   // default "Your payment request has been submitted for approval."
  children?: React.ReactNode         // optional recap above the buttons
  className?: string }
```
Green check, task id with copy-to-clipboard toast, "View in payment inquiry" (→ /payments/inquiry) and "Make another" buttons.

### CountrySelect - `country-select.tsx`
```ts
{ value?: string                     // ISO alpha-2 code
  onChange: (code: string) => void
  countries?: Country[]              // default full COUNTRIES; pass getCountriesForCurrency(ccy) for corridor-driven options
  label?: string; placeholder?: string; error?: string
  disabled?: boolean; id?: string; className?: string }
```

### CurrencySelect - `currency-select.tsx`
```ts
{ value?: string                     // ISO 4217 code
  onChange: (code: string) => void
  currencies?: string[]              // default CORRIDOR_CURRENCIES
  ...same common props }
```

### PurposeSelect - `purpose-select.tsx`
```ts
{ rail: Rail                         // "LOCAL" | "BOOK" | "SWIFT" (LOCAL and BOOK share a set)
  value?: string                     // purpose code
  onChange: (code: string) => void
  ...same common props }
```

### SearchCombobox - `search-combobox.tsx`
Generic type-ahead combobox the three selects wrap. Use it for any other type-ahead field.
```ts
export interface SearchComboboxOption { value: string; label: string; hint?: string }
{ options: SearchComboboxOption[]; value?: string; onChange: (v: string) => void
  label?, placeholder?, searchPlaceholder?, emptyText?, error?, disabled?, id?, className? }
```

### EmptyState - `empty-state.tsx`
```ts
{ icon?: LucideIcon                  // default Inbox
  title?: string                     // default "No records"
  hint?: string; className?: string
  children?: React.ReactNode }       // optional actions under the hint
```

### StatusBadge - `status-badge.tsx`
```ts
{ status: TaskStatus; className?: string }   // "Successful" | "Failed" | "Pending" ONLY
```

### BuildNote system - `build-note.tsx`
`BuildNotesProvider` is already mounted in the root layout (it renders the floating bottom-right toggle). Wrap annotated blocks:
```tsx
<BuildNote
  en="Charge bearer only appears when the resolved rail is SWIFT."
  zh="仅当路由为 SWIFT 时才显示费用承担方。"
  api="POST /clients/{clientNo}/transactions"   // optional, mono line
  tbd                                            // optional, bilingual TBD / 待定 badge
>
  <YourBlock />
</BuildNote>
```
When notes are OFF it renders children untouched. Every note is bilingual: `en` first, `zh` below. Only state correct rules, no vendor comparisons. Use `tbd` where no source defines the behavior.

## Mock data module (`@/lib/mock`)

Types: `TaskStatus`, `TransferType` (`"own-account" | "intrabank" | "interbank" | "batch" | "payroll"`), `PayoutMethod` (`"LOCAL" | "SWIFT" | "BOOK"`), `Rail`, `FeeCategory`, `Wallet`, `Country`, `PurposeCode`, `Corridor`, `FeeResult`, `PaymentTask`, `TxHistoryEntry`, `MockBeneficiary`, `PaymentTemplate`.

Company + accounts
- `COMPANY` - `{ name: "UAT Test", clientNo: "66666666" }`
- `MCA_ACCOUNT_NUMBER` = `"8296310892"`, `BTN_ACCOUNT_NUMBER` = `"8289066238"`
- `MCA_WALLETS: Wallet[]` - SGD, USD, INR, AUD, EUR, JPY, GBP, HKD wallets on the MCA
- `BTN_WALLET: Wallet` - BTN 1,185,671.57 on 8289066238
- `WALLETS: Wallet[]` - all of the above; wallet ids are `"<account>-<CCY>"`
- `getWallet(id: string): Wallet | undefined`

FX
- `FX_MARGIN = 0.02` - EXAMPLE value (PFX-104 worked example), label it as example in UI copy/notes
- `getRawRate(source, dest): number` - raw mid, destination-per-source (BTN→SGD 0.0135, USD→SGD 1.2744; throws on unknown currency)
- `getCustomerRate(source, dest): number` - `raw × (1 − FX_MARGIN)`
- `formatRate(rate): string` - 4dp

Fees (PFX-18 category logic)
- `computeFee(type: TransferType, sourceCurrency: string, destCurrency: string, destCountry?: string): FeeResult`
  - own-account / intrabank → A (SGD 15 equiv), interbank INR → B, BTN→BTN → C, else D (SGD 50 equiv). Fee charged in the debit currency. `ruleText` explains the rule (tooltip copy). Cat B and C amounts are EXAMPLE values pending PFX-19/22/24 verification and say so in `ruleText`.
- `FEE_TABLE` - the per-category per-currency amounts, if you need to display a table

Purpose codes (corporate only, rail-keyed)
- `getPurposeCodes(rail: Rail): PurposeCode[]` - LOCAL/BOOK share one set, SWIFT has its own
- `PURPOSE_CODES_LOCAL_BOOK`, `PURPOSE_CODES_SWIFT`

Corridors + countries
- `CORRIDORS: Corridor[]` - SGD→SG LOCAL Same day, USD→US SWIFT, INR→IN LOCAL, EUR→DE/FR/NL SWIFT, GBP→GB, JPY→JP, AUD→AU, HKD→HK SWIFT, BTN→BT BOOK Instant
- `resolveCorridor(currency, country): Corridor | undefined` - gives payoutMethod + delivery estimate
- `getCountriesForCurrency(currency): Country[]` - corridor-driven destination options (feed CountrySelect)
- `CORRIDOR_CURRENCIES: string[]`
- `COUNTRIES: Country[]` - 71 full-name countries (Zimbabwe spelled in full)

Seeds
- `SEED_TASKS: PaymentTask[]` - 8 tasks. The first two are the REAL UAT tasks verbatim (intrabank `bcc17a8a…` BTN 100 Pending 23 Jul 19:12, interbank `0aa7934b…` SGD 5 Pending 23 Jul 19:18). Do not alter them.
- `TX_HISTORY: TxHistoryEntry[]` - home dashboard rows
- `SEED_BENEFICIARIES: MockBeneficiary[]` (3), `SEED_TEMPLATES: PaymentTemplate[]` (2)

Formatting
- `formatNumber(amount, currency?)` - "50,000.75" (JPY 0dp)
- `formatMoney(amount, currency)` - "50,000.75 SGD" (amount then ISO code)
- `formatTimestamp(iso)` - "23 Jul 2026, 19:12"
- `formatDate(iso)` - "23 Jul 2026"
- `decimalsFor(currency)` - 0 or 2
- `generateTaskId()` - 32-hex (the store already uses it; you rarely need it directly)
- `mcaTotalUsd()` - MCA total in USD at raw rates

## Store (`@/lib/store`)

```ts
import { useAppStore, type Role, type SubmitTaskInput } from "@/lib/store"
```

State: `tasks: PaymentTask[]` (seeded), `beneficiaries: MockBeneficiary[]`, `templates: PaymentTemplate[]`, `role: "maker" | "checker"` (default maker), `buildNotesOn: boolean`.

Actions
- `submitTask(input: SubmitTaskInput): PaymentTask` - input is `PaymentTask` minus `id/status/submittedAt/completedAt/checkerNote`. Generates the 32-hex id, sets status `"Pending"`, `submittedAt` now, prepends, RETURNS the task (use its `id`/`submittedAt` for AckScreen).
- `approveTask(id, note?)` - → `"Successful"`, sets `completedAt`
- `rejectTask(id, note)` - → `"Failed"`, sets `completedAt` + `checkerNote`
- `addBeneficiary(b)`, `addTemplate(t)`, `setRole(role)`, `toggleBuildNotes()`

Persisted to sessionStorage (key `cib-payments-demo`) since the 2026-07-23 QA pass - a reload keeps submitted tasks within the tab; a new tab starts from seeds.

Selector usage: `const tasks = useAppStore((s) => s.tasks)`. Client components only.

## Known gotchas

- Base UI `Select` root takes `value` / `onValueChange`; `value` may be `null` when empty. AccountSelect already handles this - copy its pattern if you build a custom select.
- `Button render={<Link href=... />}` for link-buttons; same `render` pattern for `PopoverTrigger` / `TooltipTrigger` with custom elements.
- Tables that must fit a card: `<Table className="table-fixed">` + width classes on `TableHead` + `truncate` on cells (see `app/page.tsx`).
- The date picker (`calendar.tsx`) is react-day-picker v10 - custom part names differ from v8 (`month_grid` etc.). Compose with Popover for date fields.
- `formatTimestamp(new Date().toISOString())` renders in the viewer's local time. Fine for the demo.

## Post-freeze changes (2026-07-23 QA pass, maintainer edits)

- `lib/mock.ts` exports `LOCAL_BANKS` (local clearing banks per LOCAL-rail country) - used by the beneficiary add form and the interbank wizard.
- `PaymentTask.beneficiaryBank?: string` - receiving bank (BIC on SWIFT, bank name on LOCAL), set by the interbank wizard.
- `lib/store.ts` wrapped in zustand `persist` with sessionStorage.
- Interbank wizard now collects the required receiving bank (beneficiary bank BIC on SWIFT, local bank on LOCAL) and re-syncs the beneficiary address country when the destination country changes.
