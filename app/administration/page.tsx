import { Construction } from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { EmptyState } from "@/components/shared/empty-state"

export default function Page() {
  return (
    <PageShell title="Administration">
      <EmptyState
        icon={Construction}
        title="Screen under construction"
        hint="This screen is being built as part of the demo."
      />
    </PageShell>
  )
}
