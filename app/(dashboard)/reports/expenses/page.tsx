"use client";

/**
 * Expenses report — bill spend over a period: trend, by status, by vendor.
 */

import { format, isValid, parseISO } from "date-fns";
import { BarChart3, CalendarDays, FileText, Users, Wallet } from "lucide-react";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportRow, ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportAreaChart, ReportBarChart, ReportPieChart } from "@/components/reports/charts/ReportCharts";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { formatCurrencyCompact, formatCurrencyFull } from "@/components/reports/chart-theme";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { useExpenseReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

/** "pending_approval" → "Pending approval". */
const humanize = (s: string) => (s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "Unknown");

/** Trend periods come back as "yyyy-MM" or "yyyy-MM-dd"; show the shortest label that still reads. */
function periodLabel(p: string): string {
  const d = parseISO(p);
  if (!isValid(d)) return p;
  return p.length <= 7 ? format(d, "MMM yyyy") : format(d, "dd MMM");
}

export default function ExpensesReportPage() {
  const org = useReportOrganization();
  const ccy = org.currency;
  const period = useReportPeriod("90d");
  const organizationId = org.organizationId || undefined;

  const { data, isLoading } = useExpenseReport(
    organizationId ? { organization: organizationId, start_date: period.startDate, end_date: period.endDate } : undefined
  );

  const summary = data?.summary;
  const total = summary?.total_amount || 0;
  const count = summary?.count || 0;
  const vendors = data?.by_vendor || [];
  const topVendor = vendors[0];
  const trend = (data?.trend || []).map((t) => ({ label: periodLabel(t.period), total: t.total, count: t.count }));
  const byStatus = (summary?.by_status || []).map((s) => ({ name: humanize(s.status), value: s.total }));
  const topVendors = vendors.slice(0, 8).map((v) => ({ name: v.vendor__name || "Unknown vendor", total: v.total }));

  return (
    <ReportShell
      title="Expenses"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      actions={
        organizationId && (
          <ExportButton organizationId={organizationId} reportType="expenses" startDate={period.startDate} endDate={period.endDate} />
        )
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Total spend"
              value={formatCurrencyCompact(total, ccy)}
              hint={`${period.label.toLowerCase()} · avg ${formatCurrencyCompact(summary?.avg_amount || 0, ccy)} per bill`}
              icon={Wallet}
              sparkline={trend.length >= 2 ? trend.map((t) => t.total) : undefined}
            />
            <MetricTile
              label="Bills"
              value={count.toLocaleString()}
              hint={`${vendors.length.toLocaleString()} ${vendors.length === 1 ? "vendor" : "vendors"}`}
              icon={FileText}
            />
            <MetricTile
              label="Top vendor"
              value={topVendor ? topVendor.vendor__name || "Unknown vendor" : "—"}
              hint={topVendor && total > 0 ? `${formatCurrencyCompact(topVendor.total, ccy)} · ${Math.round((topVendor.total / total) * 100)}% of spend` : "No bills in this period"}
              icon={Users}
            />
            <MetricTile
              label="Avg per day"
              value={formatCurrencyCompact(total / period.days, ccy)}
              hint={`Over ${period.days} ${period.days === 1 ? "day" : "days"}`}
              icon={CalendarDays}
            />
          </ReportSummary>

          <ReportSection title="Spend over time" subtitle="Bill totals per period" icon={<BarChart3 className="h-4 w-4" />} padded>
            <ReportAreaChart
              data={trend}
              xKey="label"
              series={[{ key: "total", label: "Spend" }]}
              emptyTitle="No spend in this period"
              emptyHint="Pick a wider period or another organization."
            />
          </ReportSection>

          <ReportRow>
            <ReportSection title="By status" subtitle="Where the money is in the bill lifecycle" padded>
              <ReportPieChart data={byStatus} emptyTitle="No bills in this period" />
            </ReportSection>
            <ReportSection title="Top vendors" subtitle="Eight largest by total billed" padded>
              <ReportBarChart
                data={topVendors}
                xKey="name"
                series={[{ key: "total", label: "Total" }]}
                height={260}
                emptyTitle="No vendors in this period"
              />
            </ReportSection>
          </ReportRow>

          <ReportSection title="Expenses by vendor" subtitle="Every vendor billed in the period">
            {vendors.length === 0 ? (
              <EmptyState icon={Users} title="No expense data" description="No bills were recorded for this organization in the selected period." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th className="text-right">Bills</th>
                      <th className="text-right">Share</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => (
                      <tr key={v.vendor__id || "unknown"}>
                        <td className="cell-primary">{v.vendor__name || "Unknown vendor"}</td>
                        <td className="cell-amount">{v.count.toLocaleString()}</td>
                        <td className="cell-amount cell-muted">{total > 0 ? `${((v.total / total) * 100).toFixed(1)}%` : "—"}</td>
                        <td className="cell-amount">{formatCurrencyFull(v.total, ccy)}</td>
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
