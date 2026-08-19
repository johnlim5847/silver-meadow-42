"use client"

// Add / Edit Beneficiary, reverted to the Figma payment mockup (frames
// benef-add / benef-add-2 for Other-bank, benef-add-3 for Internal). The
// corridor-driven redesign is superseded: there is no currency selector and no
// separate address section. A single Country field lives inside Beneficiary
// Details, and destinationCurrency is derived from that country's corridor at
// save time. The same form powers Edit via the `editing` prop.

import * as React from "react"
import { toast } from "sonner"

import { BuildNote } from "@/components/shared/build-note"
import { FieldBox } from "@/components/shared/figma/field-box"
import { FooterActionBar } from "@/components/shared/figma/footer-action-bar"
import { FormSection } from "@/components/shared/figma/form-section"
import { GrayPanel } from "@/components/shared/figma/gray-panel"
import { Button } from "@/components/ui/button"
import {
  CORRIDORS,
  COUNTRIES,
  type MockBeneficiary,
  type PayoutMethod,
} from "@/lib/mock"
import { useAppStore } from "@/lib/store"

import { FieldCombobox } from "../interbank/wizard-support"

/** 8 or 11 character SWIFT/BIC. */
const BIC_RE = /^[A-Z0-9]{8}([A-Z0-9]{3})?$/

/** Bank names resolved from the 8-char base BIC, mirroring the API's routing-based bank resolution. */
const KNOWN_BANKS: Record<string, string> = {
  CHASUS33: "JPMorgan Chase Bank",
  CITIUS33: "Citibank N.A.",
  BOFAUS3N: "Bank of America",
  DEUTDEFF: "Deutsche Bank AG",
  BNPAFRPP: "BNP Paribas",
  INGBNL2A: "ING Bank N.V.",
  BARCGB22: "Barclays Bank UK",
  HSBCHKHH: "HSBC Hong Kong",
  SMBCJPJT: "Sumitomo Mitsui Banking Corporation",
  ANZBAU3M: "ANZ Banking Group",
}

/** The type-ahead Country list is the full country set, not corridor-filtered. */
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }))

/** Map a destination country to its corridor currency, USD when it has none. */
function currencyForCountry(code: string): string {
  return CORRIDORS.find((c) => c.countries.includes(code))?.currency ?? "USD"
}

type BenKind = "internal" | "other"

export function AddBeneficiaryForm({
  onSaved,
  editing,
}: {
  onSaved: () => void
  editing?: MockBeneficiary
}) {
  const addBeneficiary = useAppStore((s) => s.addBeneficiary)
  const updateBeneficiary = useAppStore((s) => s.updateBeneficiary)

  // Lazy initial state prefills from `editing`. The parent remounts this form
  // (keyed on the edited id) whenever the edit target changes, so reading the
  // prop once at mount is correct.
  const [kind, setKind] = React.useState<BenKind | undefined>(
    editing ? (editing.payoutMethod === "BOOK" ? "internal" : "other") : undefined
  )
  const [accountType, setAccountType] = React.useState<"Corporate" | "Individual">(
    editing?.accountType ?? "Corporate"
  )
  const [name, setName] = React.useState(editing?.name ?? "")
  const [accountNumber, setAccountNumber] = React.useState(
    editing?.accountNumber ?? ""
  )
  const [country, setCountry] = React.useState(editing?.destinationCountry ?? "")
  const [street, setStreet] = React.useState(editing?.street ?? "")
  const [town, setTown] = React.useState(editing?.town ?? "")
  const [postcode, setPostcode] = React.useState(editing?.postcode ?? "")
  const [swiftCode, setSwiftCode] = React.useState(editing?.swiftCode ?? "")
  // Intermediary SWIFT/BIC is collected per the mockup but has no field on
  // MockBeneficiary, so it is validated and then dropped (not persisted).
  const [intermediaryBic, setIntermediaryBic] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

  const handleKindChange = (v: string) => {
    setKind(v as BenKind)
    setErrors({})
  }

  const handleSave = () => {
    if (!kind) {
      setErrors({ kind: "Select the beneficiary type" })
      return
    }
    const next: Record<string, string> = {}
    if (!accountNumber.trim()) next.accountNumber = "Enter the beneficiary account"
    if (!name.trim()) next.name = "Enter the beneficiary name"
    if (!country) next.country = "Select the country"
    if (kind === "other") {
      if (!street.trim()) next.street = "Enter the street address"
      if (!town.trim()) next.town = "Enter the town or city"
      if (!postcode.trim()) next.postcode = "Enter the postcode"
    }
    const swift = swiftCode.trim().toUpperCase()
    const interSwift = intermediaryBic.trim().toUpperCase()
    if (!BIC_RE.test(swift)) next.swiftCode = "Enter an 8 or 11 character SWIFT/BIC"
    if (!BIC_RE.test(interSwift))
      next.intermediaryBic = "Enter an 8 or 11 character SWIFT/BIC"
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }

    // Internal is intra-DK (BOOK); Other-bank resolves to SWIFT when a BIC is
    // given (always, since it is required here) and LOCAL otherwise.
    const rail: PayoutMethod =
      kind === "internal" ? "BOOK" : swift ? "SWIFT" : "LOCAL"
    const bankName =
      rail === "SWIFT"
        ? (KNOWN_BANKS[swift.slice(0, 8)] ?? swift)
        : rail === "BOOK"
          ? "DK Bank"
          : swift || "Beneficiary bank"

    const fields = {
      name: name.trim(),
      accountNumber: accountNumber.trim(),
      accountType,
      destinationCurrency: currencyForCountry(country),
      destinationCountry: country,
      payoutMethod: rail,
      bankName,
      swiftCode: swift || undefined,
      street: kind === "other" ? street.trim() : undefined,
      town: kind === "other" ? town.trim() : undefined,
      postcode: kind === "other" ? postcode.trim() : undefined,
    }

    if (editing) {
      updateBeneficiary(editing.id, fields)
      toast.success(`${fields.name} updated`)
    } else {
      addBeneficiary({
        ...fields,
        id: `ben-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      })
      toast.success(`${fields.name} added to beneficiaries`)
    }
    onSaved()
  }

  return (
    <>
      <BuildNote
        en="Add Beneficiary follows the payment mockup. There is no currency selector, so destinationCurrency is derived from the chosen Country's corridor (USD when the country has none). Create maps to POST /clients/{clientNo}/beneficiaries; there is still no list, update or delete endpoint, so saved beneficiaries are client-side demo state for the browser session."
        zh="新增收款人与付款设计稿一致。没有币种选择器，destinationCurrency 由所选国家的走廊推导（无走廊时回退 USD）。创建对应 POST /clients/{clientNo}/beneficiaries，仍然没有查询、修改或删除接口，因此已保存的收款人为当前浏览器会话的客户端演示数据。"
        api="POST /clients/{clientNo}/beneficiaries"
      >
        <div className="flex flex-col gap-10">
          <GrayPanel>
            <div className="grid grid-cols-2 gap-4">
              <FieldBox
                variant="select"
                label="Beneficiary Type"
                required
                options={[
                  { value: "internal", label: "Internal Beneficiary" },
                  { value: "other", label: "Other Bank Beneficiary" },
                ]}
                value={kind}
                onValueChange={handleKindChange}
                error={errors.kind}
                filled={false}
              />
            </div>
          </GrayPanel>

          {kind && (
            <>
              <FormSection title="Beneficiary Details">
                <div className="flex flex-col gap-4">
                  {kind === "other" && (
                    <FieldBox
                      variant="select"
                      label="Account Type"
                      required
                      options={[
                        { value: "Corporate", label: "Corporate" },
                        { value: "Individual", label: "Individual" },
                      ]}
                      value={accountType}
                      onValueChange={(v) =>
                        setAccountType(v as "Corporate" | "Individual")
                      }
                    />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FieldBox
                      label="Beneficiary Account"
                      required
                      value={accountNumber}
                      onChange={(v) => {
                        setAccountNumber(v)
                        clearError("accountNumber")
                      }}
                      error={errors.accountNumber}
                    />
                    <FieldBox
                      label="Beneficiary Name"
                      required
                      value={name}
                      onChange={(v) => {
                        setName(v)
                        clearError("name")
                      }}
                      error={errors.name}
                    />
                  </div>
                  {kind === "other" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FieldBox
                        label="Street"
                        required
                        value={street}
                        onChange={(v) => {
                          setStreet(v)
                          clearError("street")
                        }}
                        error={errors.street}
                      />
                      <FieldBox
                        label="Town"
                        required
                        value={town}
                        onChange={(v) => {
                          setTown(v)
                          clearError("town")
                        }}
                        error={errors.town}
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FieldCombobox
                      label="Country"
                      required
                      options={COUNTRY_OPTIONS}
                      value={country || undefined}
                      onChange={(v) => {
                        setCountry(v)
                        clearError("country")
                      }}
                      error={errors.country}
                    />
                    {kind === "other" && (
                      <FieldBox
                        label="Postcode"
                        required
                        value={postcode}
                        onChange={(v) => {
                          setPostcode(v)
                          clearError("postcode")
                        }}
                        error={errors.postcode}
                      />
                    )}
                  </div>
                </div>
              </FormSection>

              <FormSection title="Beneficiary Bank Details">
                <div className="grid grid-cols-2 gap-4">
                  <FieldBox
                    label="SWIFT code"
                    required
                    value={swiftCode}
                    onChange={(v) => {
                      setSwiftCode(v.toUpperCase())
                      clearError("swiftCode")
                    }}
                    error={errors.swiftCode}
                  />
                  <FieldBox
                    label="Intermediary SWIFT code"
                    required
                    value={intermediaryBic}
                    onChange={(v) => {
                      setIntermediaryBic(v.toUpperCase())
                      clearError("intermediaryBic")
                    }}
                    error={errors.intermediaryBic}
                  />
                </div>
              </FormSection>
            </>
          )}
        </div>
      </BuildNote>

      <FooterActionBar>
        <Button className="min-w-20" onClick={handleSave}>
          {editing ? "Update" : "Save"}
        </Button>
      </FooterActionBar>
    </>
  )
}
