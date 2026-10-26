"use client";

/**
 * Concentration — where completed payment value piles up: by recipient,
 * provider channel or currency. Share of the period total, top N only.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Network, PieChart, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportRow, ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportPieChart } from "@/components/reports/charts/ReportCharts";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useConcentrationReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type Dimension = "recipient" | "channel" | "currency";

const DIMENSION_LABEL: Record<Dimension, string> = {
  recipient: "Recipient",
  channel: "Channel",
  currency: "Currency",
};

/** Slices beyond this many collapse into "Other" so the donut stays legible. */
const PIE_SLICES = 7;

export default function ConcentrationReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("90d");
  const [dimension, setDimension] = useState<Dimension>("recipient");
  const [topN, setTopN] = useState("10");
  const [includeBulk, setIncludeBulk] = useState("true");

  const organizationId = org.organizationId || undefined;

  const { data, isLoading } = useConcentrationReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    dimension,
    top_n: parseInt(topN),
    include_bulk: includeBulk === "true",
  });

  const entries = useMemo(() => data?.entries || [], [data]);
  const totalCompleted = parseFloat(data?.totals.total_completed_amount || "0");
  const top3 = data?.totals.top3_pct ?? 0;
  const top5 = data?.totals.top5_pct ?? 0;
  const largest = entries[0];

  const pieData = useMemo(() => {
    const head = entries.slice(0, PIE_SLICES).map((e) => ({ name: e.label, value: parseFloat(e.amount) }));
    const tail = entries.slice(PIE_SLICES);
    if (tail.length) {
      head.push({ name: `Other (${tail.length})`, value: tail.reduce((s, e) => s + parseFloat(e.amount), 0) });
    }
    return head;
  }, [entries]);

  return (
    <ReportShell
      title="Concentration"
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
      filters={
        <>
          <Select value={dimension} onValueChange={(v) => setDimension(v as Dimension)}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recipient">By recipient</SelectItem>
              <SelectItem value="channel">By channel (provider account)</SelectItem>
              <SelectItem value="currency">By currency</SelectItem>
            </SelectContent>
          </Select>
          <Select value={topN} onValueChange={setTopN}>
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
          {dimension === "recipient" && (
            <Select value={includeBulk} onValueChange={setIncludeBulk}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Include bulk</SelectItem>
                <SelectItem value="false">Exclude bulk</SelectItem>
              </SelectContent>
            </Select>
          )}
        </>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Completed"
              value={formatCurrencyCompact(totalCompleted)}
              hint={`${entries.length} ${DIMENSION_LABEL[dimension].toLowerCase()}${entries.length === 1 ? "" : "s"} shown · ${period.label.toLowerCase()}`}
              icon={Users}
            />
            <MetricTile
              label="Largest share"
              value={largest ? `${largest.share}%` : "—"}
              hint={largest ? largest.label : "No completed payments"}
              icon={Network}
            />
            <MetricTile
              label="Top 3 share"
              value={`${top3}%`}
              hint="Above 60% is concentrated"
              icon={AlertTriangle}
              tone={top3 >= 60 ? "warning" : "default"}
            />
            <MetricTile
              label="Top 5 share"
              value={`${top5}%`}
              hint="Above 80% is concentrated"
              icon={AlertTriangle}
              tone={top5 >= 80 ? "warning" : "default"}
            />
          </ReportSummary>

          <ReportRow>
            <ReportSection
              title="Share of completed value"
              subtitle={`Top ${data?.filters.top_n ?? topN} by ${DIMENSION_LABEL[dimension].toLowerCase()}`}
              icon={<PieChart className="h-4 w-4" />}
              padded
            >
              <ReportPieChart
                data={pieData}
                height={300}
                emptyTitle="No completed payments"
                emptyHint="Nothing completed in this period to break down."
              />
            </ReportSection>

            <ReportSection
              title={`Top ${data?.filters.top_n ?? topN} by amount`}
              subtitle="Completed payments, largest first"
              icon={<Network className="h-4 w-4" />}
            >
              {entries.length === 0 ? (
                <EmptyState icon={Network} title="No completed payments" description="Nothing completed in this period to break down." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th className="text-right">#</th>
                        <th>{DIMENSION_LABEL[dimension]}</th>
                        <th className="text-right">Payments</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e, i) => (
                        <tr key={`${e.label}-${i}`}>
                          <td className="cell-muted text-right">{i + 1}</td>
                          <td className="cell-primary truncate max-w-[260px]">
                            {e.label}
                            {e.sub && <span className="cell-sub">{e.sub}</span>}
                          </td>
                          <td className="cell-amount">{e.count.toLocaleString()}</td>
                          <td className="cell-amount">{formatCurrencyCompact(parseFloat(e.amount))}</td>
                          <td className="cell-amount">{e.share}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          </ReportRow>
        </>
      )}
    </ReportShell>
  );
}
