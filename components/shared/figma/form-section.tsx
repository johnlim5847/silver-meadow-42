import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface FormSectionProps {
  /** Section heading, 24px semibold ink90 (Figma node 7272:113257 "From") */
  title: string
  /** Optional right-side action, e.g. <FormSectionLink icon={UsersRound}>Select a Beneficiary</FormSectionLink> */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Form section per the Figma payment frames: 24px/32 semibold heading with an
 * optional action slot on the right, then content 16px below. Stack sections
 * with gap-10 (40px) on the page.
 */
export function FormSection({ title, action, className, children }: FormSectionProps) {
  return (
    <section className={cn("flex w-full flex-col gap-4", className)}>
      <div className="flex items-center justify-center gap-2.5">
        <h2 className="min-w-0 flex-1 text-2xl leading-8 font-semibold text-ink90">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

interface FormSectionLinkProps {
  icon?: LucideIcon
  onClick?: () => void
  className?: string
  children: React.ReactNode
}

/**
 * The borderless navy pill action next to a section heading ("Select a
 * Beneficiary", Figma node 7272:113624): h-36 px-12 gap-4 rounded pill, 20px
 * icon, 14px regular #113264 text. Not link blue — navy.
 */
export function FormSectionLink({
  icon: Icon,
  onClick,
  className,
  children,
}: FormSectionLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 py-[5px] text-sm leading-[22px] text-navy transition-colors hover:bg-black/[0.04]",
        className
      )}
    >
      {Icon && <Icon className="size-5" strokeWidth={1.75} />}
      {children}
    </button>
  )
}
