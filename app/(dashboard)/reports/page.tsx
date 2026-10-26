"use client";

/**
 * Reports hub.
 *
 * Four headline tiles for the last 30 days, then one card per report that
 * already carries that report's own headline numbers — so the page is useful
 * on its own and each card is an honest preview of what's behind it.
 * No filters here: filtering belongs to the reports.
 */

import Link from "next/link";
import { useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  Receipt,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ContentCard } from "@/components/layout/content-card";
import { LoadingState } from "@/components/layout/loading-state";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import {
  useApprovalCycleReport,
  useExpenseReport,
  useFailuresReport,
  useFinancialTrends,
  usePipelineOverview,
  useUnreconciledReport,
} from "@/hooks/use-reports";
import { useReportOrganization } from "@/hooks/use-report-context";
import { cn } from "@/lib/utils";

const DAYS = 30;

interface Stat {
  label: string;
  value: string;
  tone?: "warning" | "danger";
}

function ReportCard({
  icon: Icon,
  title,
  description,
  href,
  stats,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  stats: Stat[];
}) {
  return (
    <ContentCard noPadding className="flex flex-col">
      <div className="flex items-start gap-3 px-6 pt-5 pb-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage/20 text-forest">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px border-y border-border bg-border">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-6 py-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums tracking-tight",
                s.tone === "danger" ? "text-danger-700" : s.tone === "warning" ? "text-warning-700" : "text-foreground"
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>
      <Link
        href={href}
        className="group flex items-center justify-between px-6 py-3.5 text-sm font-medium text-primary transition-colors hover:bg-sage/10"
      >
        Open report
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </ContentCard>
  );
}

export default function ReportsPage() {
  const org = useReportOrganization();
  const ccy = org.currency;
  const organizationId = org.organizationId || undefined;
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), DAYS), "yyyy-MM-dd");
  const range = { start_date: startDate, end_date: endDate };

  const { data: overview, isLoading } = usePipelineOverview(organizationId, startDate, endDate);
  const { data: trends } = useFinancialTrends(organizationId, 1, "payments");
  const { data: approvals } = useApprovalCycleReport(organizationId, range);
  const { data: failures } = useFailuresReport(organizationId, range);
  const { data: unreconciled } = useUnreconciledReport(organizationId, range);
  const { data: expenses } = useExpenseReport(organizationId ? { organization: organizationId, ...range } : undefined);

  const queue = overview?.queue || [];
  const stage = Object.fromEntries(queue.map((s) => [s.stage, s.count])) as Record<string, number | undefined>;
  const periodAmount = parseFloat(overview?.totals.period.amount_processed || "0");
  const periodCount = overview?.totals.period.bills_count || 0;
  const inPipeline = (stage.pending_approval || 0) + (stage.ready_for_export || 0) + (stage.sent_to_bank || 0);
  const completed = stage.bank_accepted || 0;
  const failed = stage.bank_rejected || 0;
  const decided = completed + failed;
  const successRate = decided > 0 ? Math.round((completed / decided) * 100) : 0;
  const spark = useMemo(() => (trends?.trends || []).map((t) => Number(t.income) || 0), [trends]);

  const pendingApprovals = approvals?.pending.count ?? 0;
  const failedCount = Object.values(failures?.summary || {}).reduce((s, v) => s + (v.count || 0), 0);
  const unreconciledCount = Object.values(unreconciled?.summary || {}).reduce((s, v) => s + (v.count || 0), 0);
  const spend = expenses?.summary;

  return (
    <ReportShell
      title="Reports"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
    >
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last {DAYS} days</h2>
        {isLoading ? (
          <LoadingState />
        ) : (
          <ReportSummary>
            <MetricTile
              label="Processed"
              value={formatCurrencyCompact(periodAmount, ccy)}
              hint={`${periodCount.toLocaleString()} payments`}
              icon={CheckCircle2}
              sparkline={spark.length >= 2 ? spark : undefined}
            />
            <MetricTile
              label="In pipeline"
              value={inPipeline.toLocaleString()}
              hint="Awaiting approval, in flight or at the bank"
              icon={Clock}
              tone={inPipeline > 0 ? "warning" : "default"}
            />
            <MetricTile
              label="Success rate"
              value={decided > 0 ? `${successRate}%` : "—"}
              hint={`${completed.toLocaleString()} completed · ${failed.toLocaleString()} failed`}
              icon={Gauge}
              tone={decided === 0 ? "default" : successRate >= 90 ? "success" : successRate >= 70 ? "warning" : "danger"}
            />
            <MetricTile
              label="Failed"
              value={failed.toLocaleString()}
              hint={failed > 0 ? "See Exceptions" : "No failures"}
              icon={RefreshCw}
              tone={failed > 0 ? "danger" : "default"}
            />
          </ReportSummary>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reports</h2>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <ReportCard
            icon={Receipt}
            title="Payments"
            description="Volume over time, settlement and fees by account, top recipients."
            href="/reports/payments"
            stats={[
              { label: "Processed", value: formatCurrencyCompact(periodAmount, ccy) },
              { label: "Payments", value: periodCount.toLocaleString() },
              { label: "Success", value: decided > 0 ? `${successRate}%` : "—" },
            ]}
          />
          <ReportCard
            icon={AlertTriangle}
            title="Exceptions"
            description="Pending approvals, failed payments and unreconciled bank files."
            href="/reports/exceptions"
            stats={[
              { label: "Approvals", value: pendingApprovals.toLocaleString(), tone: pendingApprovals > 0 ? "warning" : undefined },
              { label: "Failed", value: failedCount.toLocaleString(), tone: failedCount > 0 ? "danger" : undefined },
              { label: "Unreconciled", value: unreconciledCount.toLocaleString(), tone: unreconciledCount > 0 ? "warning" : undefined },
            ]}
          />
          <ReportCard
            icon={BarChart3}
            title="Expenses"
            description="Bill spend over time, by status and by vendor."
            href="/reports/expenses"
            stats={[
              { label: "Spend", value: formatCurrencyCompact(spend?.total_amount ?? 0, ccy) },
              { label: "Bills", value: (spend?.count ?? 0).toLocaleString() },
              { label: "Avg bill", value: formatCurrencyCompact(spend?.avg_amount ?? 0, ccy) },
            ]}
          />
        </div>
      </div>
    </ReportShell>
  );
}
