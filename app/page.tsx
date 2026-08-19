import Link from "next/link"
import {
  ArrowLeftRight,
  ArrowRight,
  Building2,
  ChevronRight,
  Eye,
  FileSearch,
  Landmark,
  MessageCircle,
  TriangleAlert,
  Users,
  Wallet as WalletIcon,
  Zap,
} from "lucide-react"

import { PageShell } from "@/components/shell/page-shell"
import { BuildNote } from "@/components/shared/build-note"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BTN_WALLET,
  formatDate,
  formatMoney,
  formatNumber,
  MCA_ACCOUNT_NUMBER,
  MCA_WALLETS,
  mcaTotalUsd,
  TX_HISTORY,
} from "@/lib/mock"

const QUICK_ACTIONS = [
  { label: "Transfer to own account", href: "/payments/own-account", icon: ArrowLeftRight },
  { label: "Intrabank transfer", href: "/payments/intrabank", icon: Building2 },
  { label: "Interbank transfer", href: "/payments/interbank", icon: Landmark },
  { label: "Batch payment", href: "/payments/batch", icon: Users },
  { label: "Payroll payment", href: "/payments/payroll", icon: WalletIcon },
  { label: "Payment inquiry", href: "/payments/inquiry", icon: FileSearch },
]

function OverviewTile({
  title,
  subtitle,
  amount,
}: {
  title: string
  subtitle: string
  amount: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-black/10 bg-gradient-to-b from-white to-[#f7f7f7] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="text-xs text-secondary-ink">{subtitle}</p>
        </div>
        <ChevronRight className="size-5 text-muted-ink" />
      </div>
      <p className="text-xl leading-[26px] font-semibold text-ink tabular-nums">
        {amount}
      </p>
    </div>
  )
}

function HelpCard({
  icon,
  iconBg,
  title,
  text,
  action,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  text: string
  action: string
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl bg-white p-4">
      <div
        className={`flex size-10 items-center justify-center rounded-[8px] ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted-ink">{text}</p>
      </div>
      <button
        type="button"
        className="flex items-center gap-0.5 text-sm font-medium text-link"
      >
        {action}
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}

export default function HomePage() {
  return (
    <PageShell title="Home">
      <div className="grid grid-cols-[minmax(0,1fr)_321px] items-start gap-12">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Fiat assets */}
          <BuildNote
            en="Balances always display the ISO currency code, never a bare currency symbol."
            zh="余额始终显示 ISO 货币代码，绝不显示单独的货币符号。"
          >
            <section className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl leading-[26px] font-semibold text-heading">
                  Fiat assets
                </h2>
                <Eye className="size-5 text-secondary-ink" strokeWidth={1.75} />
              </div>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList
                  variant="line"
                  className="w-full justify-start gap-5 border-b border-line"
                >
                  <TabsTrigger value="overview" className="flex-none px-1">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="mca" className="flex-none px-1">
                    Multi-currency account
                  </TabsTrigger>
                  <TabsTrigger value="btn" className="flex-none px-1">
                    BTN account
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="pt-5">
                  <div className="flex gap-6">
                    <OverviewTile
                      title="Multi-currency account"
                      subtitle={`${MCA_ACCOUNT_NUMBER} · ${MCA_WALLETS.length} currencies`}
                      amount={formatMoney(mcaTotalUsd(), "USD")}
                    />
                    <OverviewTile
                      title="BTN account"
                      subtitle={BTN_WALLET.accountNumber}
                      amount={formatMoney(BTN_WALLET.balance, "BTN")}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="mca" className="pt-3">
                  <p className="pb-2 text-xs text-muted-ink">
                    Account {MCA_ACCOUNT_NUMBER}
                  </p>
                  <div className="flex flex-col">
                    {MCA_WALLETS.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between border-b border-line py-2.5 last:border-0"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-6 w-11 items-center justify-center rounded-full bg-soft text-[11px] font-medium text-secondary-ink">
                            {w.currency}
                          </span>
                          <span className="text-sm text-ink">
                            {w.currency} wallet
                          </span>
                        </span>
                        <span className="text-sm font-medium text-ink tabular-nums">
                          {formatMoney(w.balance, w.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="btn" className="pt-3">
                  <p className="pb-2 text-xs text-muted-ink">
                    Account {BTN_WALLET.accountNumber}
                  </p>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-6 w-11 items-center justify-center rounded-full bg-soft text-[11px] font-medium text-secondary-ink">
                        BTN
                      </span>
                      <span className="text-sm text-ink">BTN wallet</span>
                    </span>
                    <span className="text-sm font-medium text-ink tabular-nums">
                      {formatMoney(BTN_WALLET.balance, "BTN")}
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </BuildNote>

          {/* Recent transactions */}
          <BuildNote
            en="Recent activity for the client, newest first. Statuses use the A1 vocabulary only: Successful, Failed, Pending."
            zh="客户最近的交易记录，最新在前。状态仅使用 A1 词汇：Successful、Failed、Pending。"
            api="GET /clients/{clientNo}/transactions"
          >
            <section className="rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl leading-[26px] font-semibold text-heading">
                  Recent transactions
                </h2>
                <Link
                  href="/payments/inquiry"
                  className="flex h-[26px] items-center gap-1 rounded-full border border-black/10 bg-white pr-2 pl-2.5 text-xs font-medium text-ink transition-colors hover:bg-soft"
                >
                  View all
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
              <Table className="mt-3 table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-24 text-muted-ink">Date</TableHead>
                    <TableHead className="text-muted-ink">Description</TableHead>
                    <TableHead className="w-30 text-muted-ink">Account</TableHead>
                    <TableHead className="w-36 text-right text-muted-ink">
                      Amount
                    </TableHead>
                    <TableHead className="w-25 text-muted-ink">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TX_HISTORY.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-secondary-ink whitespace-nowrap">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="truncate text-ink">
                        {tx.description}
                      </TableCell>
                      <TableCell className="truncate text-secondary-ink">
                        {tx.account.split(" · ")[0]}
                      </TableCell>
                      <TableCell
                        className={`truncate text-right tabular-nums ${
                          tx.amount > 0 ? "text-emerald-600" : "text-ink"
                        }`}
                      >
                        {tx.amount > 0 ? "+" : "-"}
                        {formatNumber(Math.abs(tx.amount), tx.currency)}{" "}
                        {tx.currency}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          </BuildNote>

          <div className="h-px w-full bg-line" />

          {/* Help cards */}
          <div className="flex gap-5">
            <HelpCard
              icon={<MessageCircle className="size-6 text-link" strokeWidth={1.75} />}
              iconBg="bg-info-tint"
              title="Need help?"
              text="Contact your dedicated account manager or support team 24/7."
              action="Contact support"
            />
            <HelpCard
              icon={<TriangleAlert className="size-6 text-amber-600" strokeWidth={1.75} />}
              iconBg="bg-warm-tint"
              title="Report issue"
              text="Found a bug or security concern? Let us know immediately."
              action="Report issue"
            />
          </div>
        </div>

        {/* Right column: quick actions */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="size-6 text-heading" strokeWidth={1.75} />
            <h2 className="text-xl leading-[26px] font-semibold text-heading">
              Quick actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3 transition-colors hover:bg-shell"
              >
                <action.icon className="size-6 text-ink" strokeWidth={1.75} />
                <span className="text-xs font-medium text-ink">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
          <button
            type="button"
            className="flex h-10 items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-xs font-medium text-muted-ink transition-colors hover:bg-shell"
          >
            More actions
          </button>
        </div>
      </div>
    </PageShell>
  )
}
