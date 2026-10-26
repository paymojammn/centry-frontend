"use client";

/**
 * Unreconciled register — pipeline items with no confirmation or match:
 * bank files with no pain.002, pain.002 lines that matched nothing, and
 * provider payments stuck in PROCESSING.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, FileSearch, FileX, Hourglass } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useUnreconciledReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type Bucket = "all" | "bank_no_response" | "bank_unmatched" | "provider_stuck";

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

/** Age chip: warning once past the min-age threshold, danger after two days. */
function AgePill({ hours }: { hours: number }) {
  const tone =
    hours >= 48
      ? "bg-danger-500/10 text-danger-700 border-danger-500/20"
      : "bg-warning-500/10 text-warning-700 border-warning-500/20";
  const label = hours >= 48 ? `${(hours / 24).toFixed(1)}d` : `${hours.toFixed(1)}h`;
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

export default function UnreconciledReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("90d");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [minAge, setMinAge] = useState("24");

  const organizationId = org.organizationId || undefined;

  const { data, isLoading } = useUnreconciledReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    bucket,
    min_age_hours: parseInt(minAge) || 0,
  });

  const sections = data?.sections || {};
  const summary = data?.summary || {};
  const noResponse = summary.bank_no_response?.count ?? 0;
  const unmatched = summary.bank_unmatched?.count ?? 0;
  const stuck = summary.provider_stuck?.count ?? 0;
  const openItems = noResponse + unmatched + stuck;
  const openAmount =
    parseFloat(summary.bank_no_response?.amount || "0") +
    parseFloat(summary.bank_unmatched?.amount || "0") +
    parseFloat(summary.provider_stuck?.amount || "0");

  const show = (b: Bucket) => bucket === "all" || bucket === b;

  return (
    <ReportShell
      title="Unreconciled"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
            <SelectTrigger className="h-9 w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buckets</SelectItem>
              <SelectItem value="bank_no_response">Bank — no pain.002 response</SelectItem>
              <SelectItem value="bank_unmatched">Bank — unmatched pain.002</SelectItem>
              <SelectItem value="provider_stuck">Provider — stuck processing</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              placeholder="24"
              className="h-9 w-[90px]"
              aria-label="Minimum age in hours"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">hrs min age</span>
          </div>
        </>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Open items"
              value={openItems.toLocaleString()}
              hint={`${formatCurrencyCompact(openAmount)} · older than ${parseInt(minAge) || 0}h`}
              icon={FileSearch}
            />
            <MetricTile
              label="Bank — no response"
              value={noResponse.toLocaleString()}
              hint={`${formatCurrencyCompact(parseFloat(summary.bank_no_response?.amount || "0"))} awaiting pain.002`}
              icon={FileX}
              tone={noResponse > 0 ? "warning" : "default"}
            />
            <MetricTile
              label="Bank — unmatched"
              value={unmatched.toLocaleString()}
              hint={`${formatCurrencyCompact(parseFloat(summary.bank_unmatched?.amount || "0"))} with no payment`}
              icon={AlertTriangle}
              tone={unmatched > 0 ? "danger" : "default"}
            />
            <MetricTile
              label="Provider — stuck"
              value={stuck.toLocaleString()}
              hint={`${formatCurrencyCompact(parseFloat(summary.provider_stuck?.amount || "0"))} still processing`}
              icon={Hourglass}
              tone={stuck > 0 ? "warning" : "default"}
            />
          </ReportSummary>

          {show("bank_no_response") && (
            <ReportSection
              title="Bank exports awaiting pain.002"
              subtitle="Files uploaded to the bank with no status report back"
              icon={<FileX className="h-4 w-4" />}
            >
              {!sections.bank_no_response?.length ? (
                <EmptyState icon={FileX} title="All bank uploads have responses" description="Every file sent in this period has a pain.002 on record." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th>Uploaded</th>
                        <th>File</th>
                        <th>Bank</th>
                        <th className="text-right">Payments</th>
                        <th className="cell-currency">Ccy</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.bank_no_response.map((r) => (
                        <tr key={r.id}>
                          <td className="cell-muted whitespace-nowrap"><DateCell iso={r.uploaded_at} /></td>
                          <td className="cell-primary font-mono text-xs truncate max-w-[280px]">{r.filename}</td>
                          <td>
                            {r.bank}
                            <span className="cell-sub">{r.account_name}</span>
                          </td>
                          <td className="cell-amount">{r.payment_count}</td>
                          <td className="cell-currency">{r.currency}</td>
                          <td className="cell-amount">{formatCurrencyCompact(parseFloat(r.amount), r.currency)}</td>
                          <td className="text-right"><AgePill hours={r.age_hours} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          )}

          {show("bank_unmatched") && (
            <ReportSection
              title="Unmatched pain.002 lines"
              subtitle="Bank status lines that did not match any payment"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              {!sections.bank_unmatched?.length ? (
                <EmptyState icon={AlertTriangle} title="No unmatched bank responses" description="Every pain.002 line in this period matched a payment." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th>Received</th>
                        <th>EndToEnd ID</th>
                        <th>Instruction ID</th>
                        <th>Status</th>
                        <th className="cell-currency">Ccy</th>
                        <th className="text-right">Amount</th>
                        <th>Source file</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.bank_unmatched.map((r) => (
                        <tr key={r.id}>
                          <td className="cell-muted whitespace-nowrap"><DateCell iso={r.received_at} /></td>
                          <td className="cell-primary font-mono text-xs">{r.end_to_end_id || "—"}</td>
                          <td className="cell-muted font-mono text-xs">{r.instruction_id || "—"}</td>
                          <td>
                            <span className="status-pill bg-muted text-muted-foreground border-border uppercase">{r.status}</span>
                            {r.status_description && <span className="cell-sub">{r.status_description}</span>}
                          </td>
                          <td className="cell-currency">{r.currency || "UGX"}</td>
                          <td className="cell-amount">{formatCurrencyCompact(parseFloat(r.amount), r.currency || "UGX")}</td>
                          <td className="cell-muted font-mono text-xs truncate max-w-[240px]">{r.source_file}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          )}

          {show("provider_stuck") && (
            <ReportSection
              title="Provider payments stuck in processing"
              subtitle="Sent to the provider but never confirmed or failed"
              icon={<Hourglass className="h-4 w-4" />}
            >
              {!sections.provider_stuck?.length ? (
                <EmptyState icon={Hourglass} title="No stuck provider payments" description="Every provider payment in this period reached a final state." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th>Created</th>
                        <th>Recipient</th>
                        <th>Provider</th>
                        <th>Reference</th>
                        <th className="cell-currency">Ccy</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.provider_stuck.map((r) => (
                        <tr key={r.id}>
                          <td className="cell-muted whitespace-nowrap"><DateCell iso={r.created_at} /></td>
                          <td className="cell-primary">{r.recipient || "—"}</td>
                          <td>{r.provider}</td>
                          <td className="cell-muted font-mono text-xs">{r.payment_reference || "—"}</td>
                          <td className="cell-currency">{r.currency}</td>
                          <td className="cell-amount">{formatCurrencyCompact(parseFloat(r.amount), r.currency)}</td>
                          <td className="text-right"><AgePill hours={r.age_hours} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          )}
        </>
      )}
    </ReportShell>
  );
}
