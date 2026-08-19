"use client"

import * as React from "react"

import { PageTabs } from "@/components/shared/figma/page-tabs"
import { PageShell } from "@/components/shell/page-shell"

import { AddWalletFlow } from "./add-wallet-flow"
import { WalletList } from "./wallet-list"

const TABS = [
  { label: "Your wallets", value: "list" },
  { label: "Add new wallet", value: "add" },
]

export default function Page() {
  const [tab, setTab] = React.useState("list")
  /** Remounts the wizard so leaving and re-entering starts clean. */
  const [runId, setRunId] = React.useState(0)

  const openAdd = () => {
    setRunId((n) => n + 1)
    setTab("add")
  }

  return (
    <PageShell
      title="Wallets"
      breadcrumb={["Crypto", "Wallets"]}
      className={tab === "add" ? "mt-6 pb-[144px]" : "mt-6 pb-24"}
    >
      <div className="-mx-12 border-t border-field-line" />
      <PageTabs
        tabs={TABS}
        value={tab}
        onChange={(value) => (value === "add" ? openAdd() : setTab(value))}
        className="mt-6"
      />
      {tab === "list" ? (
        <WalletList onAdd={openAdd} />
      ) : (
        <AddWalletFlow key={runId} onFinish={() => setTab("list")} />
      )}
    </PageShell>
  )
}
