"use client";

/**
 * Throughput — how much was processed over time, bank vs provider rails.
 * Built on the shared report scaffold; data comes from useThroughputReport,
 * channel options from usePipelineOverview.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Activity, Hash, TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart } from "@/components/reports/charts/ReportCharts";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { formatCurrencyCompact, formatCurrencyFull } from "@/components/reports/chart-theme";
import { usePipelineOverview, useThroughputReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type Granularity = "day" | "week" | "month";

const GRANULARITY_LABEL: Record<Granularity, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

export default function ThroughputReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("90d");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");

  const organizationId = org.organizationId || undefined;

  // Channel options come from the pipeline overview (bank + provider accounts).
  // by_bank is split per currency, so dedupe bank accounts by id to avoid
  // duplicate option keys (e.g. bank:2 for both the UGX and USD rows).
  const { data: overview } = usePipelineOverview(organizationId, period.startDate, period.endDate);
  const bankOptions = Array.from(
    new Map(
      (overview?.by_bank || []).map((b) => [
        b.bank_account_id,
        {
          value: `bank:${b.bank_account_id}`,
          label: `Bank · ${b.bank_name}${b.account_name ? " · " + b.account_name : ""}`,
        },
      ])
    ).values()
  );
  const channelOptions = [
    { value: "all", label: "All channels" },
    { value: "bank", label: "Banks (all)" },
    { value: "provider", label: "Provider accounts (all)" },
    ...bankOptions,
    ...(overview?.provider_accounts || []).map((a) => ({
      value: `provider:${a.account_id}`,
      label: `Provider · ${a.account_name} (${a.provider})`,
    })),
  ];

  const { data, isLoading } = useThroughputReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    granularity,
    channel,
    status,
  });

  const currentAmount = parseFloat(data?.totals.amount || "0");
  const prevAmount = parseFloat(data?.totals.prev_amount || "0");
  const momPct: number | null = data?.totals.mom_pct ?? null;

  const series = (data?.series || []).map((s) => {
    const d = parseISO(s.bucket);
    return {
      ...s,
      label: granularity === "month" ? format(d, "MMM yyyy") : format(d, "dd MMM"),
      periodLabel: granularity === "month" ? format(d, "MMM yyyy") : format(d, "dd MMM yyyy"),
      bank: parseFloat(s.bank_amount) || 0,
      provider: parseFloat(s.provider_amount) || 0,
      total: parseFloat(s.total_amount) || 0,
    };
  });
  const paymentCount = series.reduce((sum, s) => sum + s.total_count, 0);

  return (
    <ReportShell
      title="Throughput"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-9 w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed only</SelectItem>
              <SelectItem value="in_flight">In flight</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
      actions={
        organizationId && (
          <ExportButton organizationId={organizationId} reportType="pipeline" startDate={period.startDate} endDate={period.endDate} />
        )
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="This period"
              value={formatCurrencyCompact(currentAmount)}
              hint={period.label}
              icon={TrendingUp}
              trend={momPct !== null ? { value: momPct, positiveIsGood: true } : undefined}
              sparkline={series.length >= 2 ? series.map((s) => s.total) : undefined}
            />
            <MetricTile
              label="Payments"
              value={paymentCount.toLocaleString()}
              hint={series.length ? `${Math.round(paymentCount / series.length).toLocaleString()} per ${granularity} on average` : "No payments in this period"}
              icon={Hash}
            />
            <MetricTile
              label="Prior period"
              value={formatCurrencyCompact(prevAmount)}
              hint={`Same length, immediately before · ${period.days} days`}
              icon={Activity}
            />
            <MetricTile
              label="Change vs prior"
              value={momPct === null ? "—" : `${momPct > 0 ? "+" : ""}${momPct}%`}
              hint="Period over period"
              icon={momPct !== null && momPct < 0 ? TrendingDown : TrendingUp}
              tone={momPct === null || momPct === 0 ? "default" : momPct > 0 ? "success" : "danger"}
            />
          </ReportSummary>

          <ReportSection
            title={`${GRANULARITY_LABEL[granularity]} throughput`}
            subtitle="Bank and provider rails stacked; the bar height is the total"
            icon={<Activity className="h-4 w-4" />}
            padded
          >
            <ReportBarChart
              data={series}
              xKey="label"
              height={320}
              series={[
                { key: "bank", label: "Bank (SFTP)", stackId: "rail" },
                { key: "provider", label: "Provider accounts", stackId: "rail" },
              ]}
              emptyTitle="No throughput in this period"
              emptyHint="Adjust the period or filters to see data."
            />
          </ReportSection>

          <ReportSection title="Detail" subtitle={`One row per ${granularity}`}>
            {series.length === 0 ? (
              <EmptyState icon={Activity} title="No throughput" description="Nothing was processed in the selected period." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th className="text-right">Bank payments</th>
                      <th className="text-right">Bank amount</th>
                      <th className="text-right">Provider payments</th>
                      <th className="text-right">Provider amount</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.bucket}>
                        <td className="cell-primary whitespace-nowrap">{s.periodLabel}</td>
                        <td className="cell-amount cell-muted">{s.bank_count.toLocaleString()}</td>
                        <td className="cell-amount">{formatCurrencyFull(s.bank)}</td>
                        <td className="cell-amount cell-muted">{s.provider_count.toLocaleString()}</td>
                        <td className="cell-amount">{formatCurrencyFull(s.provider)}</td>
                        <td className="cell-amount">{formatCurrencyFull(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>
        </>
      )}
    </ReportShell>
  );
}
