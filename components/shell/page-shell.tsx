import * as React from "react"
import { Bell, ChevronDown, ChevronRight, CircleHelp, UserRound } from "lucide-react"

import { COMPANY } from "@/lib/mock"
import { cn } from "@/lib/utils"

interface PageShellProps {
  /** Page title, 36px semibold. Rendered verbatim — payment screens pass Title Case. */
  title: string
  /** Optional trail above the title, e.g. ["Crypto", "Wallets"]. Last item is the current page. */
  breadcrumb?: string[]
  /** Optional header actions (e.g. the Maker/Checker role toggle), rendered left of the bell cluster */
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Standard page frame per the Figma payment frames (node 7272:113225):
 * 36px/44 semibold title at 40px from the top, bell + help + user chip
 * top-right, content container 1076px wide at a 1440 viewport (48px gutters).
 * Content wrapper defaults to mt-8; payment screens pass className="mt-10"
 * for the exact 40px title-to-tabs gap.
 */
export function PageShell({
  title,
  breadcrumb,
  actions,
  className,
  children,
}: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1172px] px-12 pt-10 pb-16">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex items-center gap-1 text-sm leading-[22px] text-ink60"
        >
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb}>
              {i > 0 && <ChevronRight className="size-4 text-ink40" />}
              <span className={i === breadcrumb.length - 1 ? "text-ink90" : undefined}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-4">
        <h1 className="flex-1 truncate text-[36px] leading-[44px] font-semibold text-ink90">
          {title}
        </h1>
        {actions}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="flex size-8 items-center justify-center rounded-[3px] text-heading transition-colors hover:bg-soft"
          >
            <Bell className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label="Help"
            className="flex size-8 items-center justify-center rounded-[3px] text-heading transition-colors hover:bg-soft"
          >
            <CircleHelp className="size-6" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-[3px] px-1.5 py-[5px] transition-colors hover:bg-soft"
          >
            <UserRound className="size-6 text-navy" strokeWidth={1.75} />
            <span className="text-sm leading-[22px] whitespace-nowrap text-navy">
              {COMPANY.name} · Client {COMPANY.clientNo}
            </span>
            <ChevronDown className="size-4 text-navy" />
          </button>
        </div>
      </div>
      <div className={cn("mt-8", className)}>{children}</div>
    </div>
  )
}
