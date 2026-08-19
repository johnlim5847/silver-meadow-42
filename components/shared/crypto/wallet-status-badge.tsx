import type { CryptoWalletStatus } from "@/lib/crypto"
import { cn } from "@/lib/utils"

const STYLES: Record<CryptoWalletStatus, string> = {
  Unverified: "bg-[#f1f2f4] text-ink60",
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
}

/** Wallet lifecycle pill: Unverified → Pending → Approved | Rejected. */
export function WalletStatusBadge({
  status,
  className,
}: {
  status: CryptoWalletStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-sm leading-[18px] whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {status}
    </span>
  )
}
