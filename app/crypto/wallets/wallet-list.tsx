"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react"
import { toast } from "sonner"

import { ChainIcon } from "@/components/shared/crypto/chain-icon"
import { LabeledField, TextField } from "@/components/shared/crypto/form-fields"
import { OwnershipVerification } from "@/components/shared/crypto/ownership-verification"
import { WalletStatusBadge } from "@/components/shared/crypto/wallet-status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  custodyLabel,
  getNetwork,
  providerLabel,
  purposeLabel,
  type CryptoWallet,
} from "@/lib/crypto"
import { formatTimestamp } from "@/lib/mock"
import { useAppStore } from "@/lib/store"

const TH_CLS =
  "h-14 border-field-line bg-panel-fill px-6 text-left text-base leading-6 font-normal text-ink90"
const TD_CLS = "border-field-line px-6 py-5 align-middle text-ink90"

export function WalletList({ onAdd }: { onAdd: () => void }) {
  const wallets = useAppStore((s) => s.cryptoWallets)
  const renameCryptoWallet = useAppStore((s) => s.renameCryptoWallet)
  const removeCryptoWallet = useAppStore((s) => s.removeCryptoWallet)
  const verifyCryptoWallet = useAppStore((s) => s.verifyCryptoWallet)

  const [verifying, setVerifying] = React.useState<CryptoWallet>()
  const [renaming, setRenaming] = React.useState<CryptoWallet>()
  const [deleting, setDeleting] = React.useState<CryptoWallet>()
  const [viewing, setViewing] = React.useState<CryptoWallet>()
  const [draftLabel, setDraftLabel] = React.useState("")
  const [proof, setProof] = React.useState("")

  if (wallets.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No wallets yet"
        hint="Add the wallet you want DK to send crypto to, or receive crypto from. It needs your approver's sign-off and a DK screening check before you can convert with it."
        className="py-24"
      >
        <Button size="lg" onClick={onAdd}>
          Add new wallet
        </Button>
      </EmptyState>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-field-line hover:bg-transparent">
            <TableHead className={TH_CLS}>Wallet address</TableHead>
            <TableHead className={TH_CLS}>Network</TableHead>
            <TableHead className={TH_CLS}>Status</TableHead>
            <TableHead className={TH_CLS + " w-[220px]"}>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallets.map((w) => {
            const chain = getNetwork(w.network)
            return (
              <TableRow key={w.id} className="border-field-line hover:bg-transparent">
                <TableCell className={TD_CLS}>
                  <p className="text-base leading-6 font-semibold text-ink90">
                    {w.label}
                  </p>
                  <p className="mt-0.5 text-base leading-6 break-all text-ink60">
                    {w.address}
                  </p>
                </TableCell>
                <TableCell className={TD_CLS}>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <ChainIcon network={w.network} />
                    <span className="text-base leading-6">{chain.label}</span>
                  </span>
                </TableCell>
                <TableCell className={TD_CLS}>
                  <WalletStatusBadge status={w.status} />
                </TableCell>
                <TableCell className={TD_CLS}>
                  <div className="flex items-center justify-end gap-4">
                    {w.status === "Unverified" ? (
                      <button
                        type="button"
                        className="text-base leading-6 text-link hover:underline"
                        onClick={() => {
                          setProof("")
                          setVerifying(w)
                        }}
                      >
                        Verify wallet
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-base leading-6 text-link hover:underline"
                        onClick={() => setViewing(w)}
                      >
                        View details
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={"Actions for " + w.label}
                          >
                            <MoreHorizontal className="size-5 text-ink90" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setDraftLabel(w.label)
                            setRenaming(w)
                          }}
                        >
                          <Pencil />
                          Rename wallet
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleting(w)}
                        >
                          <Trash2 />
                          Delete wallet
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Verify wallet - re-runs the ownership challenge on a listed wallet (FSD 6.10) */}
      <Dialog
        open={Boolean(verifying)}
        onOpenChange={(open) => !open && setVerifying(undefined)}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Verify wallet</DialogTitle>
            <DialogDescription>
              {verifying?.label} on {verifying && getNetwork(verifying.network).label}
            </DialogDescription>
          </DialogHeader>
          {verifying && (
            <OwnershipVerification
              key={verifying.id}
              network={verifying.network}
              custodyType={verifying.custodyType}
              providerId={verifying.provider}
              address={verifying.address}
              onProofChange={setProof}
              className="py-2"
            />
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setVerifying(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={!proof}
              onClick={() => {
                if (!verifying) return
                verifyCryptoWallet(verifying.id)
                toast.success("Ownership proof submitted for approval")
                setVerifying(undefined)
              }}
            >
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename - CIB-local label, no maker-checker (FSD FR-2) */}
      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(open) => !open && setRenaming(undefined)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Rename wallet</DialogTitle>
            <DialogDescription>
              Only you see this name. The wallet address does not change.
            </DialogDescription>
          </DialogHeader>
          <LabeledField label="Wallet name" htmlFor="rename-wallet">
            <TextField
              id="rename-wallet"
              value={draftLabel}
              onChange={setDraftLabel}
              maxLength={40}
            />
          </LabeledField>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRenaming(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={!draftLabel.trim()}
              onClick={() => {
                if (!renaming) return
                renameCryptoWallet(renaming.id, draftLabel.trim())
                toast.success("Wallet renamed")
                setRenaming(undefined)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete - request goes to the approver before DK removes it (FSD FR-3) */}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(undefined)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Delete wallet</DialogTitle>
            <DialogDescription>
              {deleting?.label} is removed from your wallet list. Conversions
              already in flight are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleting) return
                removeCryptoWallet(deleting.id)
                toast.success("Wallet deleted")
                setDeleting(undefined)
              }}
            >
              Delete wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View details */}
      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(undefined)}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{viewing?.label}</DialogTitle>
            <DialogDescription>Wallet details</DialogDescription>
          </DialogHeader>
          {viewing && (
            <dl className="flex flex-col">
              <DetailRow label="Wallet address">
                <span className="font-mono text-sm break-all">{viewing.address}</span>
              </DetailRow>
              <DetailRow label="Network">
                <span className="flex items-center justify-end gap-2">
                  <ChainIcon network={viewing.network} />
                  {getNetwork(viewing.network).label}
                </span>
              </DetailRow>
              <DetailRow label="Assets supported">
                {getNetwork(viewing.network).assets.join(", ")}
              </DetailRow>
              <DetailRow label="Wallet custody type">
                {custodyLabel(viewing.custodyType)}
              </DetailRow>
              <DetailRow label="Wallet provider">
                {providerLabel(viewing.provider)}
              </DetailRow>
              <DetailRow label="Wallet purpose">
                {purposeLabel(viewing.purpose)}
              </DetailRow>
              <DetailRow label="Status">
                <WalletStatusBadge status={viewing.status} />
              </DetailRow>
              <DetailRow label="Added">
                {formatTimestamp(viewing.createdAt)}
              </DetailRow>
            </dl>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewing(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-dashed border-field-line py-3 last:border-b-0">
      <dt className="text-sm leading-[22px] text-ink60">{label}</dt>
      <dd className="min-w-0 text-right text-sm leading-[22px] text-ink90">
        {children}
      </dd>
    </div>
  )
}
