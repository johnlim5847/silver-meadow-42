"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Banknote,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Coins,
  House,
  SlidersHorizontal,
  SquareUserRound,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

interface NavChild {
  label: string
  href: string
}

interface NavGroup {
  label: string
  icon: LucideIcon
  href?: string
  children?: NavChild[]
  /** Group renders expanded on first load (Figma shows Payment open on every payment frame) */
  defaultOpen?: boolean
}

const NAV_MAIN: NavGroup[] = [
  { label: "Home", icon: House, href: "/" },
  { label: "Account", icon: SquareUserRound, href: "/account" },
  {
    label: "Payment",
    icon: Banknote,
    defaultOpen: true,
    children: [
      { label: "Transfer to Own Account", href: "/payments/own-account" },
      { label: "Intrabank Transfer", href: "/payments/intrabank" },
      { label: "Interbank Transfer", href: "/payments/interbank" },
      { label: "Batch Payment", href: "/payments/batch" },
      { label: "Payroll Payment", href: "/payments/payroll" },
      { label: "Payment Inquiry", href: "/payments/inquiry" },
      { label: "Beneficiary List", href: "/payments/beneficiaries" },
      { label: "Payment Template", href: "/payments/templates" },
    ],
  },
  {
    label: "Crypto",
    icon: Coins,
    children: [
      { label: "Convert", href: "/crypto/convert" },
      { label: "Wallets", href: "/crypto/wallets" },
    ],
  },
  {
    label: "Task Center",
    icon: ClipboardList,
    children: [{ label: "Payment Request", href: "/requests/payments" }],
  },
  { label: "Loan", icon: CircleDollarSign, href: "/loan" },
]

const NAV_BOTTOM: NavGroup[] = [
  { label: "Administration", icon: SlidersHorizontal, href: "/administration" },
]

function groupContains(group: NavGroup, pathname: string): boolean {
  return group.children?.some((c) => pathname.startsWith(c.href)) ?? false
}

function NavItem({
  group,
  pathname,
  /** True when a different group owns the current route, so defaultOpen stands down */
  otherGroupActive,
}: {
  group: NavGroup
  pathname: string
  otherGroupActive: boolean
}) {
  const [open, setOpen] = React.useState(
    () =>
      groupContains(group, pathname) ||
      ((group.defaultOpen ?? false) && !otherGroupActive)
  )
  const Icon = group.icon

  if (!group.children) {
    const active =
      group.href === "/" ? pathname === "/" : pathname.startsWith(group.href!)
    return (
      <Link
        href={group.href!}
        className={cn(
          "flex h-[38px] items-center gap-2 rounded-[8px] p-2 text-sm leading-[22px] tracking-[-0.084px] text-heading transition-colors",
          active ? "bg-nav-active" : "hover:bg-black/[0.04]"
        )}
      >
        <Icon className="size-6 shrink-0 text-heading" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
      </Link>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] w-full items-center gap-2 rounded-[8px] p-2 text-sm leading-[22px] tracking-[-0.084px] text-heading transition-colors hover:bg-black/[0.04]"
      >
        <Icon className="size-6 shrink-0 text-heading" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "size-5 shrink-0 text-heading transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-1 flex flex-col gap-1">
          {group.children.map((child) => {
            const active = pathname.startsWith(child.href)
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex h-[38px] items-center rounded-[8px] p-2 pl-9 text-sm leading-[22px] text-ink90 transition-colors",
                  active ? "bg-nav-active" : "hover:bg-black/[0.04]"
                )}
              >
                <span className="truncate">{child.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const activeGroup = [...NAV_MAIN, ...NAV_BOTTOM].find((g) =>
    groupContains(g, pathname)
  )

  return (
    <aside className="sticky top-0 flex h-screen w-[268px] shrink-0 flex-col overflow-y-auto bg-sidebar-shell">
      <div className="px-6 pt-8 pb-4">
        <div className="flex h-11 items-start pt-[13px]">
          <Link href="/" className="relative block h-[27px] w-[105px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/dk-logo-symbol.svg"
              alt=""
              className="absolute top-0 left-0 h-[26.5px] w-[30px]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/dk-logo-text.svg"
              alt="DK bank"
              className="absolute top-0 right-0 h-[27px] w-[72.5px]"
            />
          </Link>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-2 px-4 py-2">
        {NAV_MAIN.map((group) => (
          <NavItem
            key={group.label}
            group={group}
            pathname={pathname}
            otherGroupActive={Boolean(activeGroup) && activeGroup !== group}
          />
        ))}
        <div className="mt-auto" />
        {NAV_BOTTOM.map((group) => (
          <NavItem
            key={group.label}
            group={group}
            pathname={pathname}
            otherGroupActive={Boolean(activeGroup) && activeGroup !== group}
          />
        ))}
      </nav>
      <div className="h-4 shrink-0" />
    </aside>
  )
}
