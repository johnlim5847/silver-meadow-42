// lib/store.ts — FROZEN CONTRACT. Cross-screen client state, persisted to
// sessionStorage so a full page reload keeps submitted tasks within the tab.
// Import from client components only ("use client").

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import {
  SEED_CRYPTO_WALLETS,
  type CryptoWallet,
  type CryptoWalletStatus,
} from "@/lib/crypto"
import {
  generateTaskId,
  SEED_BENEFICIARIES,
  SEED_TASKS,
  SEED_TEMPLATES,
  type MockBeneficiary,
  type PaymentTask,
  type PaymentTemplate,
} from "@/lib/mock"

export type Role = "maker" | "checker"

/** Everything the wizard knows at submit time. id/status/submittedAt are set by the store. */
export type SubmitTaskInput = Omit<
  PaymentTask,
  "id" | "status" | "submittedAt" | "completedAt" | "checkerNote"
>

export interface AppState {
  tasks: PaymentTask[]
  cryptoWallets: CryptoWallet[]
  beneficiaries: MockBeneficiary[]
  templates: PaymentTemplate[]
  role: Role
  buildNotesOn: boolean
  /** Creates a Pending task with a fresh 32-hex id, prepends it, returns it. */
  submitTask: (input: SubmitTaskInput) => PaymentTask
  /** Marks the task Successful (sets completedAt, optional checker note). */
  approveTask: (id: string, note?: string) => void
  /** Marks the task Failed (sets completedAt, required checker note). */
  rejectTask: (id: string, note: string) => void
  addBeneficiary: (beneficiary: MockBeneficiary) => void
  updateBeneficiary: (id: string, patch: Partial<MockBeneficiary>) => void
  removeBeneficiary: (id: string) => void
  addTemplate: (template: PaymentTemplate) => void
  updateTemplate: (id: string, patch: Partial<PaymentTemplate>) => void
  removeTemplate: (id: string) => void
  setRole: (role: Role) => void
  toggleBuildNotes: () => void
  /** Adds a submitted wallet request. Lands as Pending until a checker approves. */
  addCryptoWallet: (wallet: CryptoWallet) => void
  /** CIB-local label change, no maker-checker workflow (FSD FR-2). */
  renameCryptoWallet: (id: string, label: string) => void
  /** Removes the wallet from the client view (FSD FR-3 delete request). */
  removeCryptoWallet: (id: string) => void
  /** Records the ownership proof against an already-listed wallet. */
  verifyCryptoWallet: (id: string) => void
  setCryptoWalletStatus: (id: string, status: CryptoWalletStatus) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      tasks: SEED_TASKS,
      cryptoWallets: SEED_CRYPTO_WALLETS,
  beneficiaries: SEED_BENEFICIARIES,
  templates: SEED_TEMPLATES,
  role: "maker",
  buildNotesOn: false,

  submitTask: (input) => {
    const task: PaymentTask = {
      ...input,
      id: generateTaskId(),
      status: "Pending",
      submittedAt: new Date().toISOString(),
    }
    set((state) => ({ tasks: [task, ...state.tasks] }))
    return task
  },

  approveTask: (id, note) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "Successful" as const,
              completedAt: new Date().toISOString(),
              checkerNote: note ?? t.checkerNote,
            }
          : t
      ),
    })),

  rejectTask: (id, note) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "Failed" as const,
              completedAt: new Date().toISOString(),
              checkerNote: note,
            }
          : t
      ),
    })),

  addBeneficiary: (beneficiary) =>
    set((state) => ({ beneficiaries: [beneficiary, ...state.beneficiaries] })),

  updateBeneficiary: (id, patch) =>
    set((state) => ({
      beneficiaries: state.beneficiaries.map((b) =>
        b.id === id ? { ...b, ...patch } : b
      ),
    })),

  removeBeneficiary: (id) =>
    set((state) => ({
      beneficiaries: state.beneficiaries.filter((b) => b.id !== id),
    })),

  addTemplate: (template) =>
    set((state) => ({ templates: [template, ...state.templates] })),

  updateTemplate: (id, patch) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    })),

  removeTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

      setRole: (role) => set({ role }),

      toggleBuildNotes: () =>
        set((state) => ({ buildNotesOn: !state.buildNotesOn })),

      addCryptoWallet: (wallet) =>
        set((state) => ({ cryptoWallets: [wallet, ...state.cryptoWallets] })),

      renameCryptoWallet: (id, label) =>
        set((state) => ({
          cryptoWallets: state.cryptoWallets.map((w) =>
            w.id === id ? { ...w, label } : w
          ),
        })),

      removeCryptoWallet: (id) =>
        set((state) => ({
          cryptoWallets: state.cryptoWallets.filter((w) => w.id !== id),
        })),

      verifyCryptoWallet: (id) =>
        set((state) => ({
          cryptoWallets: state.cryptoWallets.map((w) =>
            w.id === id
              ? { ...w, ownershipVerified: true, status: "Pending" as const }
              : w
          ),
        })),

      setCryptoWalletStatus: (id, status) =>
        set((state) => ({
          cryptoWallets: state.cryptoWallets.map((w) =>
            w.id === id ? { ...w, status } : w
          ),
        })),
    }),
    {
      name: "cib-payments-demo",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
