"use client"

import * as React from "react"
import { NotebookPen } from "lucide-react"

import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/**
 * Mount once in the root layout. Renders children plus the floating
 * build-notes toggle button (pinned to the right edge, vertically centered).
 * Note state lives in the app store.
 */
export function BuildNotesProvider({ children }: { children: React.ReactNode }) {
  const on = useAppStore((s) => s.buildNotesOn)
  const toggle = useAppStore((s) => s.toggleBuildNotes)

  return (
    <>
      {children}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "fixed right-6 top-1/2 z-50 flex h-10 -translate-y-1/2 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg transition-colors",
          on
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-navy text-white hover:bg-navy-deep"
        )}
      >
        <NotebookPen className="size-4" />
        {on ? "Build notes on" : "Build notes"}
      </button>
    </>
  )
}

export interface BuildNoteProps {
  /** English note text (first) */
  en: string
  /** Chinese note text (below the English) */
  zh: string
  /** Optional API contract line, e.g. "POST /clients/{clientNo}/transactions" */
  api?: string
  /** Marks behavior no source defines — renders a bilingual TBD badge */
  tbd?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Wrap any block. When build notes are ON, draws a dashed amber outline around
 * the children and shows a bilingual note card beneath them. When OFF, renders
 * children untouched.
 */
export function BuildNote({ en, zh, api, tbd, className, children }: BuildNoteProps) {
  const on = useAppStore((s) => s.buildNotesOn)

  if (!on) return <>{children}</>

  return (
    <div
      className={cn(
        "relative rounded-lg outline-2 outline-offset-4 outline-amber-400/80 outline-dashed",
        className
      )}
    >
      {children}
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
        {tbd && (
          <span className="mb-1.5 inline-flex items-center rounded-full border border-amber-300 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            TBD / 待定
          </span>
        )}
        <p className="text-xs leading-relaxed text-amber-900">{en}</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800/90">{zh}</p>
        {api && (
          <p className="mt-1.5 font-mono text-[11px] text-amber-700">
            API: {api}
          </p>
        )}
      </div>
    </div>
  )
}
