"use client";

/**
 * Audit trail — the system-wide security.AuditLog: who did what, when,
 * with severity. The period pills filter BOTH the tiles and the event list
 * (date_from / date_to); the toolbar adds severity, module, action, user
 * email and free text. Every active filter also drives the CSV export, and
 * each row opens a details sheet with the recorded changes and metadata.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertOctagon, AlertTriangle, Download, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { AuditEventSheet, SeverityPill } from "@/components/audit/audit-event-sheet";
import { AuditFilters, EMPTY_AUDIT_FILTERS, type AuditFilterState } from "@/components/audit/audit-filters";
import { useAuditLogs, useAuditStats } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";
import { reportsApi, type AuditLogQuery } from "@/lib/reports-api";
import type { AuditLog } from "@/types/reports";

const PAGE_SIZE = 100;

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <>—</>;
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm:ss")}</span>
    </>
  );
}

export default function AuditTrailPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const [filters, setFilters] = useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const updateFilters = (patch: Partial<AuditFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  // One query object feeds the list, the tiles and the CSV so they can never
  // disagree about which events are in scope.
  const query: AuditLogQuery = {
    organization: org.organizationId || undefined,
    date_from: period.startDate,
    date_to: period.endDate,
    severity: filters.severity === "all" ? undefined : filters.severity,
    module: filters.module === "all" ? undefined : filters.module,
    action_type: filters.actionType || undefined,
    user_email: filters.userEmail || undefined,
    search: filters.search || undefined,
    ordering: "-created_at",
  };

  const { data, isLoading } = useAuditLogs({ ...query, page, page_size: PAGE_SIZE });
  const { data: stats } = useAuditStats(query);

  const rows = data?.results || [];
  const total = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const warnings = stats?.by_severity.warning || 0;
  const errors = stats?.error_count || 0;
  const critical = stats?.critical_count || 0;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await reportsApi.downloadAuditLogs(query);
      toast.success("Audit log downloaded");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ReportShell
      title="Audit trail"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={(id) => { org.setOrganizationId(id); setPage(1); }}
      isLoadingOrgs={org.isLoading}
      period={period}
      actions={
        <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading…" : "Download CSV"}
        </Button>
      }
      filters={<AuditFilters value={filters} onChange={updateFilters} stats={stats} />}
    >
      {!stats ? (
        <LoadingState />
      ) : (
        <ReportSummary>
          <MetricTile
            label="Events"
            value={stats.total_logs.toLocaleString()}
            hint={`${stats.recent_count.toLocaleString()} in the last 24h · ${period.label.toLowerCase()}`}
            icon={ScrollText}
          />
          <MetricTile
            label="Warnings"
            value={warnings.toLocaleString()}
            hint={warnings > 0 ? "Worth a look" : "No warnings in this period"}
            icon={AlertTriangle}
            tone={warnings > 0 ? "warning" : "default"}
          />
          <MetricTile
            label="Errors"
            value={errors.toLocaleString()}
            hint={errors > 0 ? "Failed or errored actions" : "No errors in this period"}
            icon={AlertOctagon}
            tone={errors > 0 ? "danger" : "default"}
          />
          <MetricTile
            label="Critical"
            value={critical.toLocaleString()}
            hint={critical > 0 ? "Requires investigation" : "No critical events in this period"}
            icon={AlertOctagon}
            tone={critical > 0 ? "danger" : "default"}
          />
        </ReportSummary>
      )}

      <ReportSection
        title="Event log"
        subtitle={`${total.toLocaleString()} events · ${period.label.toLowerCase()} · page ${page} of ${totalPages}`}
        icon={<ScrollText className="h-4 w-4" />}
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="ghost" size="sm" disabled={!data?.next} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <LoadingState />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit events match your filters"
            description="Widen the period, clear a filter or broaden the search to see more events."
          />
        ) : (
          <div className="table-scroll-container">
            <table className="table-professional">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Severity</th>
                  <th>User</th>
                  <th>Module</th>
                  <th>Target</th>
                  <th>Description</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr
                    key={e.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(e)}
                    data-state={selected?.id === e.id ? "selected" : undefined}
                  >
                    <td className="cell-muted whitespace-nowrap"><DateCell iso={e.timestamp} /></td>
                    <td className="font-mono text-xs whitespace-nowrap">
                      {e.action_type}
                      {!e.success && (
                        <span className="cell-sub">
                          <span className="status-pill bg-danger-500/10 text-danger-700 border-danger-500/20">Failed</span>
                        </span>
                      )}
                    </td>
                    <td><SeverityPill severity={e.severity} /></td>
                    <td className="cell-primary">
                      {e.user_name || "System"}
                      {e.user_email && e.user_email !== e.user_name && (
                        <span className="cell-sub">{e.user_email}</span>
                      )}
                      {e.user_ip && <span className="cell-sub font-mono">{e.user_ip}</span>}
                    </td>
                    <td className="cell-muted">{e.module || "—"}</td>
                    <td className="truncate max-w-[220px]">{e.target_representation || "—"}</td>
                    <td className="cell-muted max-w-[320px] truncate">
                      {e.action_description}
                      {e.error_message && <span className="cell-sub text-danger-600">{e.error_message}</span>}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}
                        aria-label={`Details for ${e.action_type}`}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>

      <AuditEventSheet event={selected} onClose={() => setSelected(null)} />
    </ReportShell>
  );
}
