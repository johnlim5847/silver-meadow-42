import { Construction } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { PageShell } from "@/components/shell/page-shell"

export default function Page() {
  return (
    <PageShell title="Convert" breadcrumb={["Crypto", "Convert"]} className="mt-6">
      <div className="-mx-12 border-t border-field-line" />
      <EmptyState
        icon={Construction}
        title="Screen under construction"
        hint="Buy and sell (A1 on-ramp, A2 off-ramp) is the next screen in this module."
        className="py-24"
      />
    </PageShell>
  )
}
