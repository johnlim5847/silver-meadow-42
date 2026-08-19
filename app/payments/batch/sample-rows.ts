// Local to the batch/payroll upload flow (Agent C ownership).
// Column list is the ground-truth 16-column header from the real vendor
// batch template (public/templates/batch-payment-template.csv), matching
// the DK Payment API TransactionBatchRow. The file carries no source
// currency column — the debit currency is set once for the whole batch.

export const TEMPLATE_COLUMNS = [
  "BENEFICIARY_NAME",
  "BENEFICIARY_ACCOUNT_TYPE",
  "BENEFICIARY_ACCOUNT_NUMBER",
  "DESTINATION_CURRENCY",
  "DESTINATION_COUNTRY",
  "STREET",
  "TOWN",
  "POSTCODE",
  "STATE",
  "SOURCE_AMOUNT",
  "DESTINATION_AMOUNT",
  "CHARGE_BEARER",
  "REMITTANCE_INFORMATION",
  "SWIFT_CODE",
  "LOCAL_BANK_CODE",
  "LOCAL_BANK_SUBCODE",
] as const

export type TemplateColumn = (typeof TEMPLATE_COLUMNS)[number]
export type TemplateRecord = Record<TemplateColumn, string>

function toRecord(values: string[]): TemplateRecord {
  const record = {} as TemplateRecord
  TEMPLATE_COLUMNS.forEach((col, i) => {
    record[col] = values[i] ?? ""
  })
  return record
}

/**
 * Built-in sample rows for the batch demo. 4 valid + 2 invalid
 * (one missing remittance information, one with a bad currency code)
 * so the validation table has something to show.
 */
export const SAMPLE_BATCH_ROWS: TemplateRecord[] = [
  [
    "Test Beneficiary Pte Ltd", "Corporate", "0012345678", "SGD", "SG",
    "12 Marina Boulevard", "Singapore", "018982", "",
    "1650", "", "", "INV-3021 July services", "", "", "",
  ],
  [
    "Pacific Components Inc", "Corporate", "739201845", "USD", "US",
    "2900 Semiconductor Drive", "San Jose", "95051", "CA",
    "8500", "", "SHAR", "PO-4471 semiconductors", "CHASUS33", "", "",
  ],
  [
    "Mumbai Textiles Pvt Ltd", "Corporate", "911020045067812", "INR", "IN",
    "84 Linking Road", "Mumbai", "400050", "",
    "", "210000", "", "PO-4483 fabric order", "", "HDFC0000240", "",
  ],
  [
    "Kyoto Precision KK", "Corporate", "7502210", "JPY", "JP",
    "4-1 Nakagyo Ward", "Kyoto", "6048006", "",
    "", "1250000", "", "Machined parts INV-990", "SMBCJPJT", "", "",
  ],
  [
    "Acme Trading GmbH", "Corporate", "DE44500105175407324931", "EUR", "DE",
    "Friedrichstrasse 61", "Berlin", "10117", "",
    "4200", "", "CRED", "", "DEUTDEFF", "", "",
  ],
  [
    "Horizon Logistics Ltd", "Corporate", "HL882201", "EUD", "HK",
    "9 Harbour Road", "Hong Kong", "", "",
    "2750", "", "", "Freight June statement", "", "", "",
  ],
].map(toRecord)

/**
 * Built-in sample rows for the payroll demo, BTN salaries to BT accounts.
 * 3 valid + 2 invalid (one missing amount, one missing remittance).
 */
export const SAMPLE_PAYROLL_ROWS: TemplateRecord[] = [
  [
    "Tashi Dorji", "Individual", "8267001122", "BTN", "BT",
    "Chang Lam", "Thimphu", "11001", "",
    "48000", "", "", "July 2026 salary", "", "", "",
  ],
  [
    "Sonam Choden", "Individual", "8267003344", "BTN", "BT",
    "Norzin Lam", "Thimphu", "11001", "",
    "52500", "", "", "July 2026 salary", "", "", "",
  ],
  [
    "Karma Wangchuk", "Individual", "8267005566", "BTN", "BT",
    "Wogzin Lam", "Paro", "12001", "",
    "61250", "", "", "July 2026 salary", "", "", "",
  ],
  [
    "Pema Lhamo", "Individual", "8267007788", "BTN", "BT",
    "Gatoen Lam", "Phuentsholing", "21101", "",
    "", "", "", "July 2026 salary", "", "", "",
  ],
  [
    "Ugyen Tshering", "Individual", "8267009900", "BTN", "BT",
    "Dechen Lam", "Thimphu", "11001", "",
    "49800", "", "", "", "", "", "",
  ],
].map(toRecord)
