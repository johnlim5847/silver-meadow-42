# FIGMA-PATTERNS.md — frozen contract for the pixel-fidelity payment rebuild

Supersedes the visual parts of SCAFFOLD.md (data contracts in SCAFFOLD.md — `lib/mock`, `lib/store`, BuildNote — stay valid). Built from exact values fetched via the Figma MCP from file `8W73ENCQZP3yCYrpC2dwBY`:

| Node | Frame | What it defines |
|---|---|---|
| `7272:113225` | 1.1.2 Transfer submission, input, different currency | Chrome, tabs, stepper (input state), sections, FieldBox, MetaLine, AmountRow, RateRow, footer bars |
| `16:8723` | 1.1.7 Transfer submission, submit | Stepper done states, ack result block |
| `7256:112543` | 1.1.x input, same currency | Focused/large AmountRow variant, single-amount layout |
| (screenshots only) | interbank-input.png, batch-input.png | SearchModal, GrayPanel, StatCard — values approximated from screenshots, no node was provided; treat their internals as ±2px |

## File ownership (next wave)

Screen agents own ONLY their route dirs under `app/`. **Nobody edits `components/`, `lib/`, `app/layout.tsx`, `app/globals.css` after this wave.** Old shared components (`WizardSteps`, `PreviewSummary`, `FxQuoteRow`, `CurrencyAmountInput`, `AccountSelect`, …) still exist and still work — replace their usage in your screens with the primitives below, do not delete the old files (the maintainer removes them after all screens migrate). Import path: `@/components/shared/figma/<file>`.

## Design tokens (new, in `app/globals.css` — frozen names)

| Class | Value | Figma source | Use |
|---|---|---|---|
| `text-ink90` | `rgba(0,0,0,0.9)` | `--font/primary` | page/section titles, field values, body |
| `text-ink60` | `rgba(0,0,0,0.6)` | `--font/secondary` | currency chips, inactive tabs, task-id line |
| `text-ink40` | `rgba(0,0,0,0.4)` | `--font/tertiary` | field labels, placeholders, legal text |
| `border-field-line` | `rgba(0,9,50,0.12)` | input/tab border | field boxes, tab hairline, pagination pills |
| `bg-sidebar-shell` | `#f5f7fa` | `--bg/faint` | sidebar bg |
| `bg-btn-muted` | `#e6e9ed` | `--bg/muted` | secondary buttons |
| `bg-stepper-band` | `rgba(0,143,245,0.1)` | Steps band fill | StepperBand |
| `bg-stepper-line` | `#d5d9e0` | connector SVG stroke | pending stepper connector |
| `bg-stepper-idle` | `rgba(17,50,100,0.2)` | todo circle | todo stepper circle |
| `bg-success-teal` / `text-success-teal` | `#369398` | `--function/success/500` | done stepper circle, ack check, legal shield |
| `text-error-red` / `border-error-red` | `#dd494b` | `--function/error` | required asterisk, field errors |
| `bg-panel-fill` | `#f7f8fa` | readonly amount fill | readonly fields, gray panels |

Existing tokens (`text-heading #1c2024`, `bg-navy #113264`, `bg-nav-active #dfecff`, `bg-shell`, …) unchanged. Canvas behind payment screens is **white** (body is already white).

## Type scale (payment frames; Inter substitutes for SF Pro)

| Role | Spec |
|---|---|
| Page title | 36/44 semibold `ink90` (PageShell renders it) |
| Section title | **24/32 semibold** `ink90` (FormSection) — NOT the 20px home-card size |
| Amount value | 36/44 semibold `ink90` |
| Field value | 16/24 regular `ink90` |
| Field label (floated) | 12/20 regular `ink40`, asterisk `#dd494b`, 4px gap |
| Field label (empty = placeholder) | 16/24 regular `ink40` |
| Body/labels/tabs/stepper/buttons | 14/22 |
| Legal/counters/records | 12/20 |
| Ack title | 20/28 semibold `ink90` |

Buttons and sidebar labels carry Inter `tracking-[-0.084px]`.

## Page anatomy (payment screen recipe)

At 1440 the frame is: sidebar 268 / content x=316..1392 (48px gutters, content 1076) / title baseline row at y=40 / tabs at y=124 (40px under the title block) / stepper band directly under tabs / content 40px under the band / fixed action bar 58px above the fixed 56px legal footer.

```tsx
<PageShell title="Transfer To Own Account" className="mt-10 pb-[144px]">
  <PageTabs tabs={[{ label: "Make a Transfer", value: "make" }]} value="make" />
  <StepperBand current={0} />
  <div className="mt-10 flex flex-col gap-10">
    <FormSection title="From">…</FormSection>
    <FormSection title="Amount">…</FormSection>
  </div>
  <FooterActionBar left={<Button variant="secondary" className="min-w-20">Back</Button>}>
    <Button variant="secondary">Save as Template</Button>
    <Button variant="secondary">Save Draft</Button>
    <Button className="min-w-20">Next</Button>
  </FooterActionBar>
  <LegalFooter />
</PageShell>
```

- `PageShell` container is now `max-w-[1172px] px-12` → content 1076px at 1440. Title Case titles are passed verbatim.
- `className="mt-10"` gives the exact 40px title→tabs gap (default stays `mt-8` for home).
- Sections stack with `gap-10` (40px). Two-column From/To: `flex justify-between`, each column `w-[520px]` (form content column is 1064px in the mockup, 12px narrower than the tabs row — acceptable to keep 1076 full width).
- Screens with both footer bars add `pb-[144px]`; LegalFooter only → `pb-20`.

## Primitives (`components/shared/figma/`)

### PageTabs — `page-tabs.tsx` (node `7272:113234`)
```ts
{ tabs: { label: string; value: string }[]; value: string; onChange?: (v: string) => void; className?: string }
```
48px row, white, full-width 1px `field-line` hairline under it. Active: 4px `#113264` bottom bar, 14/22 semibold `ink90`; inactive: 14/22 regular `ink60` (inactive weight/color inferred from screenshots). Item padding: 8px box + 8px/5px inner.

### StepperBand — `stepper-band.tsx` (nodes `7272:113235`, `16:9084`)
```ts
{ steps?: string[]; current: number; className?: string }   // default ["Input","Preview","Submit"], 0-based current
```
Band `bg-stepper-band` pt-12 pb-8. Circles 22px: done teal `#369398` + white check (16px), active navy + white number, todo `rgba(17,50,100,0.2)` + `ink40` number. Connector between step k and k+1: navy `#113264` when step k is done, else `#d5d9e0`; outer edges transparent. Labels 14/22: done `ink90`, active semibold `#113264`, todo `ink40`. Band height 72px.

### FormSection + FormSectionLink — `form-section.tsx` (nodes `7272:113255`, `7272:113624`)
```ts
FormSection: { title: string; action?: ReactNode; className?: string; children }
FormSectionLink: { icon?: LucideIcon; onClick?: () => void; className?: string; children }
```
Title 24/32 semibold `ink90`, content 16px below. FormSectionLink is the "Select a Beneficiary" pill: h-36, px-12, 4px gap, 20px icon, 14px regular **navy `#113264`** text (not link blue).

### FieldBox — `field-box.tsx` (nodes `7272:113259` filled select, `7272:113321` empty select, `7272:113269` readonly currency)
```ts
{
  label: string; required?: boolean
  variant?: "input" | "select" | "readonly" | "date"   // default "input"
  value?: string; placeholder?: string
  onChange?: (v: string) => void                        // input
  options?: { value; label; hint? }[]; onValueChange?: (v: string) => void   // select (Base UI Select)
  filled?: boolean          // gray #f7f8fa fill; defaults true only for readonly
  chevron?: boolean         // readonly: keep the chevron (interbank gray selects)
  error?: string; hint?: string; disabled?: boolean; id?: string; className?: string
}
```
Box: 56px, radius 8, border 0.5px `field-line`, px-16, white (readonly gray `#f7f8fa`). Floating label: empty → label at 16/24 `ink40` (with red asterisk) as placeholder; has value → 12/20 `ink40` label over 16/24 `ink90` value. Select chevron 20px `ink60`. Readonly value: `ink90` on gray, `ink60` on white (the Currency companion boxes are `variant="readonly" filled={false}` with label "Currency", value ink60, width `w-[184px]` via className). `date` renders a CalendarDays trigger button and forwards DOM props, so `<PopoverTrigger render={<FieldBox variant="date" …/>} />` works. Feed existing datasets by mapping to options, e.g. `WALLETS.map(w => ({ value: w.id, label: w.accountNumber, hint: formatMoney(w.balance, w.currency) }))`.

### MetaLine — `meta-line.tsx` (node `7272:113270`)
```ts
{ label: string; value: ReactNode; className?: string }
```
Renders `Label: Value`, 14/22 `ink90`, value semibold. 8px gap under the field (parent uses `gap-2`).

### AmountRow — `amount-row.tsx` (nodes `7272:113297` editable, `7272:113317` readonly)
```ts
{ currency: string; value: string; onChange?: (raw: string) => void; label?: string
  readOnly?: boolean; error?: string; disabled?: boolean; placeholder?: string; id?: string; className?: string }
```
Same raw-string contract as CurrencyAmountInput (thousands-format on blur, JPY 0dp, `Number(value)` to read). Optional `label` renders the 14/22 "You Send"/"Recipient Receives" line 16px above. Box: radius 8, border 0.5px `field-line`, px-16 py-8; currency chip 16/24 semibold `ink60` uppercase at the baseline; value 36/44 semibold `ink90`. `readOnly` → gray `#f7f8fa` fill, shows formatted value (em dash when empty). Same-currency frame `7256:112543` also shows a focused 100px variant (py-28, 2px border, 20px clear icon) — not implemented; use the compact row everywhere.

### RateRow — `rate-row.tsx` (node `7272:113300`)
```ts
{ sourceCurrency: string; destinationCurrency: string; sourceAmount: number; onQuote?: (q: { rate: number }) => void; className?: string }
```
**Drop-in replacement for FxQuoteRow** — identical props and quote behavior (emits on mount/pair change, 60s window, auto re-quote at 0, manual refresh). Renders the 56px bordered row: "Indicative Exchange Rate" 14/22 semibold + 14px navy info icon | `1 SRC = rate DST` 14/22 semibold + 16px navy refresh | "Valid for N Seconds" 14/22 regular. Rate stays 4dp via `formatRate` (app convention; mockup literal shows 6dp). Render only when currencies differ; put the converted amount in a `readOnly` AmountRow (`value={String(sourceAmount * rate)}` or preformatted).

### FooterActionBar — `footer-action-bar.tsx` (node `7272:113226`)
```ts
{ left?: ReactNode; children?: ReactNode; className?: string }
```
Fixed white bar, h-58, spans `left-[268px]` → right edge, sits 56px above the viewport bottom (over LegalFooter), shadow `0 3px 16px 2px rgba(0,0,0,0.05)`, px-48, buttons vertically centered (36px pills, 8px gaps). Back/Next are 80px wide → `className="min-w-20"`. Screens using it add `pb-[144px]`.

### LegalFooter — `legal-footer.tsx` (node `7272:113413`)
```ts
{ className?: string }
```
Fixed 56px white band at bottom-0 spanning the full viewport width. Centered: 20px teal `#369398` shield + 12/20 `ink40` "Licensed and Regulated as a Conventional Wholesale Bank by the Central Bank of DK" + 16px gap + 12/20 navy "Deposit Instruction".

### GrayPanel — `gray-panel.tsx` (batch screenshot, no node)
```ts
{ className?: string; children }
```
`#f7f8fa`, radius 16, p-24. Filter card, Batch Overview, Report Download panel.

### StatCard — `stat-card.tsx` (batch screenshot, no node)
```ts
{ icon: LucideIcon; label: string; value: ReactNode; tone?: "info" | "success" | "error"; className?: string }
```
White card, border `rgba(0,0,51,0.06)`, radius 16, p-24. Solid 40px icon bubble (info `#0d74ce`, success `#30a46c`, error `#e5484d` — screenshot-approximated) with white 20px glyph; label 14/22 `ink60`; value 32/40 semibold `ink90`.

### SearchModal + SearchModalInput — `search-modal.tsx` (interbank screenshot, no node)
```ts
SearchModal: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string
  filters?: ReactNode; onSearch?: () => void; searchLabel?: string        // default "Search"
  children: ReactNode; resultsLabel?: string                              // default "Search Results"
  recordCount?: number; page?: number; pageCount?: number; onPageChange?: (p: number) => void
  onConfirm?: () => void; confirmLabel?: string; confirmDisabled?: boolean; className?: string
}
SearchModalInput: { placeholder?: string; value: string; onChange: (v: string) => void; className?: string; id?: string }
```
Wraps ui/dialog. Card ~1146px wide, radius 16, p-40, built-in X top-right. Centered 20px semibold title → gray filter panel (inputs 44px radius 8; Search = secondary 36px pill, right) → "Search Results" 16px semibold → your Table → `{n} records` (12px `ink60`) left + pagination right (26px pills, radius 6, active navy) → navy 44px Confirm (`min-w-[120px]`) bottom-right.

## Ack screen values (node `16:9088` "Result 结果" — for the submit-step agents)

Centered column, py-40, 12px gaps: 80px check-circle in `#369398` (lucide `CircleCheck` at `size-20 text-success-teal` is the closest match) → 20/28 semibold `ink90` "Your Transaction Has Been Submitted for Approval" → 8px → 14/22 `ink60` `Task ID: …` + 16px copy icon → 14/22 `rgba(153,153,153,0.6)` `Submitted On: YYYY-MM-DD HH:mm`. Tab row shows a single "Transfer Submission" tab; stepper `current={2}` with steps 1-2 done. The mockup shows no footer action bar on this screen.

Reference textarea (node `7272:113323`): radius 8, border 0.5px `field-line`, px-16 py-12, placeholder 16/24 `ink40`, `0/50` counter 12/20 `ink40` top-right.

## Chrome changes made this wave

- **Sidebar** (`components/shell/sidebar.tsx`): 268px, `#f5f7fa`, no right border. Logo = real DK SVGs at `public/figma/dk-logo-symbol.svg` + `dk-logo-text.svg` (105×27, block px-24 pt-32 pb-16). Items 38px, p-8, gap-8, radius 8, 24px icons, 14/22 Inter `#1c2024` `tracking-[-0.084px]`, 20px chevrons; active `#dfecff`. Children: 38px rows, text starts 52px from the sidebar edge (`pl-9` inside the item), 14/22 `ink90`, 4px gaps. Nav: Home / Account / Payment (default-expanded: Transfer to Own Account, Intrabank Transfer, Interbank Transfer, Batch Payment, Payroll Payment, Payment Inquiry, Beneficiary List, Payment Template) / Task Center (Payment Request → `/requests/payments`) / Loan / Administration pinned bottom. Crypto removed from the nav (`app/crypto/` route still exists, unlinked).
- **PageShell** (`components/shell/page-shell.tsx`): container `max-w-[1172px] px-12 pt-10`; title 36/44 semibold `ink90`; right cluster 16px gaps — bell (20px), help (24px), user chip (24px navy icon + `UAT Test · Client 66666666` 14/22 navy + 16px navy chevron). `actions` slot unchanged.
- **Button** (`components/ui/button.tsx`): default = navy pill **36px** (h-9, px-12, 14/22 medium, `tracking-[-0.084px]`); `secondary` = `#e6e9ed` pill, no border; `lg` = 44px (login/modal Confirm); `sm` = 26px 12px-medium pill (pair with `variant="outline"` for the bordered View-all style — outline border is now `field-line`). All existing call sites compile; old screens just render the new metrics.

## Where the payment frames contradicted the home/login values (payment frame wins)

| Assumed (home/login brief) | Actual (payment design context) |
|---|---|
| Sidebar bg `#f0f2f5` | `#f5f7fa` (`--bg/faint`, both payment frames) |
| Footer/secondary buttons ~40px | **36px** (h-36, px-12, py-6, gap-8) |
| Secondary button bg `#f0f2f5` | `#e6e9ed` (`--bg/muted`) |
| Section titles 20px/26 | **24px/32** semibold |
| Field radius ~10–12px | **8px**, border 0.5px `rgba(0,9,50,0.12)` |
| Active tab: 2px bar, text `#0c2544` | **4px** `#113264` bar, text `rgba(0,0,0,0.9)` semibold |
| "Select a Beneficiary" link blue `#0d74ce` | navy `#113264`, borderless pill |
| Amount value ~28–32px | **36px/44** semibold |
| Big-card radius 16 for form fields | forms use radius-8 boxes; radius 16 only for panels/cards/modal |

Also: the mockup's user chip reads "Lucy Liu" — we keep our real `UAT Test · Client 66666666` content with the mockup's styling, and the mockup's primary button carries a resting 10% white overlay state-layer which we ignore (solid `#113264`).
