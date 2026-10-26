"use client";

/**
 * Reports hub.
 *
 * Not a second dashboard: four headline numbers for the period, then every
 * report as a card, grouped the same way the sidebar groups them. The main
 * dashboard already shows the pipeline; this page is for finding a report.
 */

import Link from "next/link";
import { useMemo } from "react";
import {
  Activity,
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
import { ExportButton } from "@/components/reports/export/ExportButton";
import { LoadingState } from "@/components/layout/loading-state";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useFinancialTrends, usePipelineOverview } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

interface ReportLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const REPORTS: ReportLink[] = [
  { title: "Payments", description: "Volume over time, settlement and fees by account, top recipients", href: "/reports/payments", icon: Receipt },
  { title: "Exceptions", description: "Pending approvals, failed payments and unreconciled bank files", href: "/reports/exceptions", icon: AlertTriangle },
  { title: "Expenses", description: "Bill spend over time, by status and by vendor", href: "/reports/expenses", icon: BarChart3 },
];

export default function ReportsPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const organizationId = org.organizationId || undefined;
  const months = Math.max(1, Math.ceil(period.days / 30));

  const { data: overview, isLoading } = usePipelineOverview(organizationId, period.startDate, period.endDate);
  const { data: trends } = useFinancialTrends(organizationId, months, "payments");

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

  return (
    <ReportShell
      title="Reports"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      actions={
        organizationId && (
          <ExportButton organizationId={organizationId} reportType="pipeline" startDate={period.startDate} endDate={period.endDate} />
        )
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <ReportSummary>
          <MetricTile
            label="Processed"
            value={formatCurrencyCompact(periodAmount)}
            hint={`${periodCount.toLocaleString()} payments · ${period.label.toLowerCase()}`}
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
            hint={failed > 0 ? "See the Failures report" : "No failures in this period"}
            icon={RefreshCw}
            tone={failed > 0 ? "danger" : "default"}
          />
        </ReportSummary>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-forest/25 hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <r.icon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{r.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.description}</p>
          </Link>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Activity className="h-3 w-3" /> Figures refresh every few minutes; exports use the selected period. The audit trail lives under Organization.
      </p>
    </ReportShell>
  );
}
