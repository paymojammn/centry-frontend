"use client";

/**
 * Audit trail — the system-wide security.AuditLog: who did what, when,
 * with severity. Stats follow the period; the event list is paged and
 * filtered by severity, module, action and free text.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertOctagon, AlertTriangle, Download, ScrollText, Search } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { useAuditLogs, useAuditStats } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";
import { reportsApi } from "@/lib/reports-api";

const PAGE_SIZE = 100;

const SEVERITY_PILL: Record<string, string> = {
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  error: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  critical: "bg-danger-500/10 text-danger-700 border-danger-500/20",
};

function SeverityPill({ severity }: { severity: string }) {
  const pill = SEVERITY_PILL[severity] || "bg-muted text-muted-foreground border-border";
  return <span className={`status-pill ${pill} capitalize`}>{severity}</span>;
}

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
  const [severity, setSeverity] = useState("all");
  const [module, setModule] = useState("all");
  const [actionType, setActionType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const organizationId = org.organizationId || undefined;

  const { data, isLoading } = useAuditLogs({
    organization: organizationId,
    severity: severity === "all" ? undefined : severity,
    module: module === "all" ? undefined : module,
    action_type: actionType || undefined,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
    ordering: "-timestamp",
  });
  const { data: stats } = useAuditStats(organizationId, period.days);

  const rows = data?.results || [];
  const total = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const warnings = stats?.by_severity.warning || 0;
  const errors = stats?.error_count || 0;
  const critical = stats?.critical_count || 0;

  // Modules and actions surfaced in stats so the user can pick a real value.
  const moduleOptions = Object.keys(stats?.by_module || {});
  const actionOptions = Object.keys(stats?.by_action || {});

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await reportsApi.downloadAuditLogs({
        organization: organizationId,
        severity: severity === "all" ? "" : severity,
        module: module === "all" ? "" : module,
        action_type: actionType,
        search,
        ordering: "-timestamp",
      });
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
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      actions={
        <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading…" : "Download CSV"}
        </Button>
      }
      filters={
        <>
          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {moduleOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m} ({stats?.by_module[m]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionType || "all"} onValueChange={(v) => { setActionType(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a} ({stats?.by_action[a]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search description, user, target…"
              className="h-9 w-[260px] pl-8"
              aria-label="Search audit events"
            />
          </div>
        </>
      }
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
        subtitle={`${total.toLocaleString()} events · page ${page} of ${totalPages}`}
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
            description="Clear a filter or widen the search to see more events."
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
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
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
                      {e.user_name || "—"}
                      {e.user_ip && <span className="cell-sub font-mono">{e.user_ip}</span>}
                    </td>
                    <td className="cell-muted">{e.module || "—"}</td>
                    <td className="truncate max-w-[220px]">{e.target_representation || "—"}</td>
                    <td className="cell-muted max-w-[320px] truncate">
                      {e.action_description}
                      {e.error_message && <span className="cell-sub text-danger-600">{e.error_message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </ReportShell>
  );
}
