"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface PageTab {
  label: string
  value: string
}

interface PageTabsProps {
  tabs: PageTab[]
  /** Active tab value */
  value: string
  onChange?: (value: string) => void
  className?: string
}

/**
 * Underline tab row per Figma "normalTabs" (node 7272:113234): 48px row on
 * white with a full-width hairline (rgba(0,9,50,0.12)) under it. Active tab:
 * 14px semibold rgba(0,0,0,0.9) with a 4px navy #113264 bottom bar. Inactive:
 * 14px regular ink60.
 */
export function PageTabs({ tabs, value, onChange, className }: PageTabsProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-start border-b border-field-line bg-white",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={cn(
              "flex h-full items-center border-b-4 px-2 outline-none",
              active ? "border-navy" : "border-transparent"
            )}
          >
            <span
              className={cn(
                "rounded-[3px] px-2 py-[5px] text-sm leading-[22px] whitespace-nowrap transition-colors",
                active
                  ? "font-semibold text-ink90"
                  : "text-ink60 hover:text-ink90"
              )}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
