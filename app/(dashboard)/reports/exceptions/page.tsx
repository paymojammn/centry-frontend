"use client";

/**
 * Exceptions — the "what needs attention" report. One page for the three
 * things an operator has to act on: payments waiting for approval, payments
 * that failed or were rejected, and pipeline items nobody has reconciled.
 * Replaces the approval-cycle, failures and unreconciled pages.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertOctagon, AlertTriangle, Clock, FileSearch, FileX } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useApprovalCycleReport, useFailuresReport, useUnreconciledReport } from "@/hooks/use-reports";
import { usePendingPaymentRequests } from "@/hooks/use-payment-requests";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";
import type { PaymentRequest } from "@/types/payment-request";
import type { UnreconciledReport } from "@/types/reports";

type Show = "all" | "approvals" | "failures" | "unreconciled";

// Semantic pill tints — the same vocabulary the status columns use elsewhere.
const PILL = {
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  danger: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
} as const;

// Where a failure was reported.
const SOURCES: Record<string, { label: string; pill: string }> = {
  provider: { label: "Provider", pill: PILL.warning },
  bank: { label: "Bank file", pill: PILL.danger },
  pain002: { label: "pain.002", pill: PILL.info },
};

type UnrecBucket = keyof UnreconciledReport["sections"];

// The three unreconciled buckets, now rows of one table.
const BUCKETS: Record<UnrecBucket, { label: string; pill: string }> = {
  bank_no_response: { label: "Awaiting bank", pill: PILL.warning },
  bank_unmatched: { label: "Unmatched", pill: PILL.danger },
  provider_stuck: { label: "Stuck", pill: PILL.warning },
};

/** Plain number for `.cell-amount`; the currency code sits in its own `.cell-currency` cell. */
const amount = (v: string | number) =>
  Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

function formatHours(h: number | null | undefined): string {
  if (h === null || h === undefined) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function ageHours(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 3_600_000;
}

function DateCell({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <>—</>;
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm")}</span>
    </>
  );
}

/** Age chip: warning while waiting, danger once past two days. */
function AgePill({ hours }: { hours: number | null }) {
  if (hours === null) return <span className={`status-pill ${PILL.neutral}`}>—</span>;
  return (
    <span className={`status-pill ${hours >= 48 ? PILL.danger : PILL.warning}`}>{formatHours(hours)}</span>
  );
}

function SourcePill({ source }: { source: string }) {
  const s = SOURCES[source];
  return <span className={`status-pill ${s?.pill || PILL.neutral}`}>{s?.label || source}</span>;
}

function BucketPill({ bucket }: { bucket: UnrecBucket }) {
  const b = BUCKETS[bucket];
  return <span className={`status-pill ${b.pill}`}>{b.label}</span>;
}

// One row shape for the three unreconciled buckets so they share a table.
interface UnrecRow {
  key: string;
  bucket: UnrecBucket;
  at: string;
  primary: string;
  sub?: string;
  detail: string;
  currency: string;
  amount: string;
  ageHours: number | null;
}

function flattenUnreconciled(sections: UnreconciledReport["sections"], fallbackCurrency: string): UnrecRow[] {
  const rows: UnrecRow[] = [];
  for (const r of sections.bank_no_response || []) {
    rows.push({
      key: `nr:${r.id}`,
      bucket: "bank_no_response",
      at: r.uploaded_at,
      primary: r.filename,
      sub: [r.bank, r.account_name].filter(Boolean).join(" · "),
      detail: `${r.payment_count.toLocaleString()} payments`,
      currency: r.currency,
      amount: r.amount,
      ageHours: r.age_hours,
    });
  }
  for (const r of sections.bank_unmatched || []) {
    rows.push({
      key: `um:${r.id}`,
      bucket: "bank_unmatched",
      at: r.received_at,
      primary: r.end_to_end_id || r.instruction_id || "—",
      sub: r.source_file,
      detail: [r.status, r.status_description].filter(Boolean).join(" · ") || "—",
      currency: r.currency || fallbackCurrency,
      amount: r.amount,
      ageHours: ageHours(r.received_at),
    });
  }
  for (const r of sections.provider_stuck || []) {
    rows.push({
      key: `st:${r.id}`,
      bucket: "provider_stuck",
      at: r.created_at,
      primary: r.recipient || "—",
      sub: r.provider,
      detail: r.payment_reference || "—",
      currency: r.currency,
      amount: r.amount,
      ageHours: r.age_hours,
    });
  }
  return rows;
}

const waitingSince = (r: PaymentRequest) => r.submitted_at || r.created_at;

export default function ExceptionsReportPage() {
  const org = useReportOrganization();
  const ccy = org.currency;
  const period = useReportPeriod("30d");
  const [show, setShow] = useState<Show>("all");
  const [reasonQuery, setReasonQuery] = useState("");
  const [minAge, setMinAge] = useState("24");

  const organizationId = org.organizationId || undefined;
  const visible = (s: Exclude<Show, "all">) => show === "all" || show === s;

  // Counts and oldest-pending age come from the report; the per-request rows
  // come from the same pending endpoint the approval queue uses.
  const approvals = useApprovalCycleReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
  });
  const pending = usePendingPaymentRequests(organizationId);
  const failures = useFailuresReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    source: "all",
    reason_contains: reasonQuery || undefined,
  });
  const unreconciled = useUnreconciledReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    bucket: "all",
    min_age_hours: parseInt(minAge) || 0,
  });

  // Approvals
  const pendingCount = approvals.data?.pending.count ?? 0;
  const oldestAge = ageHours(approvals.data?.pending.oldest_at);
  const pendingRows = [...(pending.data?.results || [])].sort(
    (a, b) => new Date(waitingSince(a)).getTime() - new Date(waitingSince(b)).getTime()
  );

  // Failures
  const failureRows = failures.data?.rows || [];
  const failureSummary = failures.data?.summary || {};
  const failedCount = Object.keys(SOURCES).reduce((n, k) => n + (failureSummary[k]?.count ?? 0), 0);
  const failedAmount = Object.keys(SOURCES).reduce(
    (n, k) => n + (parseFloat(failureSummary[k]?.amount || "0") || 0),
    0
  );

  // Unreconciled
  const unrecSummary = unreconciled.data?.summary || {};
  const noResponse = unrecSummary.bank_no_response?.count ?? 0;
  const noResponseAmount = parseFloat(unrecSummary.bank_no_response?.amount || "0");
  const unmatched = unrecSummary.bank_unmatched?.count ?? 0;
  const stuck = unrecSummary.provider_stuck?.count ?? 0;
  const unrecRows = flattenUnreconciled(unreconciled.data?.sections || {}, ccy);
  const minAgeHours = parseInt(minAge) || 0;

  const summaryLoading = approvals.isLoading || failures.isLoading || unreconciled.isLoading;

  return (
    <ReportShell
      title="Exceptions"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <Select value={show} onValueChange={(v) => setShow(v as Show)}>
          <SelectTrigger className="h-9 w-[170px]" aria-label="Show">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exceptions</SelectItem>
            <SelectItem value="approvals">Approvals</SelectItem>
            <SelectItem value="failures">Failures</SelectItem>
            <SelectItem value="unreconciled">Unreconciled</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {summaryLoading ? (
        <LoadingState />
      ) : (
        <ReportSummary>
          <MetricTile
            label="Pending approvals"
            value={pendingCount.toLocaleString()}
            hint={oldestAge === null ? "Nothing waiting" : `Oldest has waited ${formatHours(oldestAge)}`}
            icon={Clock}
            tone={pendingCount > 0 ? "warning" : "default"}
          />
          <MetricTile
            label="Failed payments"
            value={failedCount.toLocaleString()}
            hint={
              failedCount > 0
                ? `${formatCurrencyCompact(failedAmount, ccy)} · ${period.label.toLowerCase()}`
                : `No failures · ${period.label.toLowerCase()}`
            }
            icon={AlertOctagon}
            tone={failedCount > 0 ? "danger" : "default"}
          />
          <MetricTile
            label="Awaiting bank response"
            value={noResponse.toLocaleString()}
            hint={
              noResponse > 0
                ? `${formatCurrencyCompact(noResponseAmount, ccy)} in ${noResponse.toLocaleString()} ${noResponse === 1 ? "file" : "files"} without pain.002`
                : `No files older than ${minAgeHours}h`
            }
            icon={FileX}
            tone={noResponse > 0 ? "warning" : "default"}
          />
          <MetricTile
            label="Unmatched / stuck"
            value={(unmatched + stuck).toLocaleString()}
            hint={`${unmatched.toLocaleString()} bank ${unmatched === 1 ? "line" : "lines"} · ${stuck.toLocaleString()} provider ${stuck === 1 ? "payment" : "payments"}`}
            icon={AlertTriangle}
            tone={unmatched + stuck > 0 ? "danger" : "default"}
          />
        </ReportSummary>
      )}

      {visible("approvals") && (
        <ReportSection
          title="Pending approvals"
          subtitle="Payment requests waiting for an approver, oldest first"
          icon={<Clock className="h-4 w-4" />}
        >
          {pending.isLoading ? (
            <LoadingState />
          ) : pendingRows.length === 0 ? (
            <EmptyState icon={Clock} title="Nothing pending" description="No payment requests are waiting for approval." />
          ) : (
            <div className="table-scroll-container">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Request / recipient</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Waiting</th>
                    <th>Requested by</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">
                        <span className="block truncate max-w-[260px]" title={r.recipient_name || undefined}>
                          {r.payment_type === "bulk"
                            ? `${r.total_recipients.toLocaleString()} recipients`
                            : r.recipient_name || "—"}
                        </span>
                        {r.description && (
                          <span className="cell-sub truncate max-w-[260px]" title={r.description}>
                            {r.description}
                          </span>
                        )}
                      </td>
                      <td className="cell-currency">{r.currency}</td>
                      <td className="cell-amount">{amount(r.amount)}</td>
                      <td className="text-right">
                        <AgePill hours={ageHours(waitingSince(r))} />
                      </td>
                      <td className="cell-muted">{r.created_by_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      )}

      {visible("failures") && (
        <ReportSection
          title="Failed and rejected"
          subtitle="Every failed or rejected payment with the reason given"
          icon={<AlertOctagon className="h-4 w-4" />}
          right={
            <Input
              value={reasonQuery}
              onChange={(e) => setReasonQuery(e.target.value)}
              placeholder="Reason contains…"
              aria-label="Reason contains"
              className="h-8 w-56"
            />
          }
        >
          {failures.isLoading ? (
            <LoadingState />
          ) : failureRows.length === 0 ? (
            <EmptyState
              icon={AlertOctagon}
              title="Nothing failed"
              description={
                reasonQuery
                  ? "No failures match that reason in the selected period."
                  : "Clean run — nothing failed or was rejected in the selected period."
              }
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
                  {failureRows.map((r) => (
                    <tr key={`${r.source}:${r.id}`}>
                      <td className="cell-muted whitespace-nowrap">
                        <DateCell iso={r.date} />
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      )}

      {visible("unreconciled") && (
        <ReportSection
          title="Unreconciled"
          subtitle="Bank files with no pain.002, bank lines that matched nothing, provider payments still processing"
          icon={<FileSearch className="h-4 w-4" />}
          right={
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="24"
                className="h-8 w-[80px]"
                aria-label="Minimum age in hours"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">hrs min age</span>
            </div>
          }
        >
          {unreconciled.isLoading ? (
            <LoadingState />
          ) : unrecRows.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="Nothing unreconciled"
              description={`Every item older than ${minAgeHours}h in the selected period is matched or confirmed.`}
            />
          ) : (
            <div className="table-scroll-container">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Bucket</th>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Detail</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {unrecRows.map((r) => (
                    <tr key={r.key}>
                      <td>
                        <BucketPill bucket={r.bucket} />
                      </td>
                      <td className="cell-muted whitespace-nowrap">
                        <DateCell iso={r.at} />
                      </td>
                      <td className="cell-primary">
                        <span className="block truncate max-w-[260px] font-mono text-xs" title={r.primary}>
                          {r.primary}
                        </span>
                        {r.sub && (
                          <span className="cell-sub truncate max-w-[260px]" title={r.sub}>
                            {r.sub}
                          </span>
                        )}
                      </td>
                      <td className="cell-muted">
                        <span className="block truncate max-w-[240px]" title={r.detail}>
                          {r.detail}
                        </span>
                      </td>
                      <td className="cell-currency">{r.currency}</td>
                      <td className="cell-amount">{amount(r.amount)}</td>
                      <td className="text-right">
                        <AgePill hours={r.ageHours} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      )}
    </ReportShell>
  );
}
