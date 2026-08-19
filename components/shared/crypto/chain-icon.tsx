import * as React from "react"

import type { CryptoNetwork } from "@/lib/crypto"
import { cn } from "@/lib/utils"

/**
 * Chain glyph used in the wallet table, the network picker and the review
 * card. Inline SVG so the demo stays self-contained — no remote assets.
 */
export function ChainIcon({
  network,
  className,
}: {
  network: CryptoNetwork
  className?: string
}) {
  if (network === "SOL") {
    return (
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full bg-black",
          className
        )}
      >
        <svg
          viewBox="0 0 397.7 311.7"
          className="size-[13px]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dk-sol-gradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
          <g fill="url(#dk-sol-gradient)">
            <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
            <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
            <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
          </g>
        </svg>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eceef2]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[13px]" aria-hidden="true">
        <g fill="#1c2024">
          <path d="M12 2 6.2 11.7 12 9.1Z" opacity=".55" />
          <path d="M12 2v7.1l5.8 2.6Z" />
          <path d="M12 16.1 6.2 12.8 12 22Z" opacity=".55" />
          <path d="M12 22v-5.9l5.8-3.3Z" />
          <path d="M12 15 6.2 11.7 12 9.1Z" opacity=".3" />
          <path d="M12 9.1v5.9l5.8-3.3Z" opacity=".8" />
        </g>
      </svg>
    </span>
  )
}

const PROVIDER_MARKS: Record<string, { bg: string; fg: string }> = {
  metamask: { bg: "#f6851b", fg: "#ffffff" },
  rabby: { bg: "#7084ff", fg: "#ffffff" },
  safe: { bg: "#12ff80", fg: "#0b1a12" },
  phantom: { bg: "#ab9ff2", fg: "#ffffff" },
  solflare: { bg: "#fc7227", fg: "#ffffff" },
  backpack: { bg: "#e33e3f", fg: "#ffffff" },
  ledger: { bg: "#1c2024", fg: "#ffffff" },
  coinbase: { bg: "#0052ff", fg: "#ffffff" },
  kraken: { bg: "#5741d9", fg: "#ffffff" },
  binance: { bg: "#f0b90b", fg: "#1c2024" },
  okx: { bg: "#1c2024", fg: "#ffffff" },
  other: { bg: "#e6e9ed", fg: "#60646c" },
}

/** Wallet-provider mark. Phantom gets its ghost, the rest get a lettered chip. */
export function ProviderIcon({
  provider,
  label,
  className,
}: {
  provider: string
  label: string
  className?: string
}) {
  const mark = PROVIDER_MARKS[provider] ?? PROVIDER_MARKS.other

  if (provider === "phantom") {
    return (
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          className
        )}
        style={{ backgroundColor: mark.bg }}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            fill="#ffffff"
            d="M20 12.4c0 4.2-3.7 7.6-8.3 7.6-3.9 0-7.2-2.5-8.1-5.8-.2-.7.4-1.3 1.1-1.3h1.7c.5 0 .9.3 1.1.8.5 1.5 1.9 2.5 3.6 2.5H12c-.7-.6-1.1-1.4-1.1-2.3 0-1.8 1.5-3.2 3.4-3.2s3.4 1.4 3.4 3.2c0 .3 0 .5-.1.8h.9c.8 0 1.5-.6 1.5-1.4v-.4c0-4-3.4-7.3-7.7-7.3-4.5 0-8.1 3.4-8.1 7.5 0 .4-.3.7-.7.7s-.7-.3-.7-.7C2.8 8.1 7 4 12.2 4 17.5 4 20 7.9 20 12.4Z"
          />
          <circle cx="9.6" cy="11.6" r="1.1" fill="#ffffff" />
          <circle cx="13.2" cy="11.6" r="1.1" fill="#ffffff" />
        </svg>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        className
      )}
      style={{ backgroundColor: mark.bg, color: mark.fg }}
      aria-hidden="true"
    >
      {label.charAt(0).toUpperCase()}
    </span>
  )
}
