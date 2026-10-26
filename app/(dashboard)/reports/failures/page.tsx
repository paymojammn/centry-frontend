"use client";

/**
 * Failures — every failed or rejected payment with the reason given.
 * Built on the shared report scaffold; data comes from useFailuresReport.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertOctagon, Building2, FileWarning, ShieldAlert } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useFailuresReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type Source = "all" | "provider" | "bank" | "pain002";

// One vocabulary for where a failure was reported, and its pill tint.
const SOURCES: { key: Exclude<Source, "all">; label: string; pill: string; icon: typeof AlertOctagon }[] = [
  { key: "provider", label: "Provider", pill: "bg-warning-500/10 text-warning-700 border-warning-500/20", icon: ShieldAlert },
  { key: "bank", label: "Bank file", pill: "bg-danger-500/10 text-danger-700 border-danger-500/20", icon: Building2 },
  { key: "pain002", label: "pain.002", pill: "bg-info-500/10 text-info-700 border-info-500/20", icon: FileWarning },
];
const NEUTRAL_PILL = "bg-muted text-muted-foreground border-border";

function SourcePill({ source }: { source: string }) {
  const s = SOURCES.find((x) => x.key === source);
  return <span className={`status-pill ${s?.pill || NEUTRAL_PILL}`}>{s?.label || source}</span>;
}

/** Plain number for `.cell-amount`; the currency code sits in its own `.cell-currency` cell. */
const amount = (v: string | number) =>
  Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export default function FailuresReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const [source, setSource] = useState<Source>("all");
  const [reasonQuery, setReasonQuery] = useState("");

  const organizationId = org.organizationId || undefined;
  const { data, isLoading } = useFailuresReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    source,
    reason_contains: reasonQuery || undefined,
  });

  const rows = data?.rows || [];
  const summary = data?.summary || {};
  const totalCount = SOURCES.reduce((n, s) => n + (summary[s.key]?.count ?? 0), 0);
  const totalAmount = SOURCES.reduce((n, s) => n + (parseFloat(summary[s.key]?.amount || "0") || 0), 0);

  return (
    <ReportShell
      title="Failures"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={source} onValueChange={(v) => setSource(v as Source)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="provider">Provider (gateway)</SelectItem>
              <SelectItem value="bank">Bank file</SelectItem>
              <SelectItem value="pain002">pain.002 rejections</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={reasonQuery}
            onChange={(e) => setReasonQuery(e.target.value)}
            placeholder="Reason contains…"
            aria-label="Reason contains"
            className="h-9 w-56"
          />
        </>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Failed payments"
              value={totalCount.toLocaleString()}
              hint={totalCount > 0 ? `${formatCurrencyCompact(totalAmount)} · ${period.label.toLowerCase()}` : `No failures · ${period.label.toLowerCase()}`}
              icon={AlertOctagon}
              tone={totalCount > 0 ? "danger" : "default"}
            />
            {SOURCES.map((s) => {
              const count = summary[s.key]?.count ?? 0;
              return (
                <MetricTile
                  key={s.key}
                  label={`${s.label} failures`}
                  value={count.toLocaleString()}
                  hint={count > 0 ? formatCurrencyCompact(parseFloat(summary[s.key]?.amount || "0")) : "None in this period"}
                  icon={s.icon}
                />
              );
            })}
          </ReportSummary>

          <ReportSection title="Register" subtitle="Failed and rejected payments with the reason given">
            {rows.length === 0 ? (
              <EmptyState
                icon={AlertOctagon}
                title="No failures"
                description={reasonQuery ? "No failures match that reason in the selected period." : "Clean run — nothing failed or was rejected in the selected period."}
              />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Channel</th>
                      <th>Recipient</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const d = new Date(r.date);
                      const valid = !Number.isNaN(d.getTime());
                      return (
                        <tr key={`${r.source}:${r.id}`}>
                          <td className="cell-muted whitespace-nowrap">
                            {valid ? format(d, "dd MMM yyyy") : r.date}
                            {valid && <span className="cell-sub">{format(d, "HH:mm")}</span>}
                          </td>
                          <td>
                            <SourcePill source={r.source} />
                          </td>
                          <td className="cell-muted">{r.channel || "—"}</td>
                          <td className="cell-primary">
                            <span className="block truncate max-w-[220px]" title={r.recipient || undefined}>
                              {r.recipient || "—"}
                            </span>
                          </td>
                          <td className="cell-currency">{r.currency}</td>
                          <td className="cell-amount">{amount(r.amount)}</td>
                          <td className="cell-muted">
                            <span className="block truncate max-w-[320px]" title={r.reason || undefined}>
                              {r.reason || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
