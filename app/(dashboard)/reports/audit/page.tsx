"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  FileSearch,
  Search,
  ScrollText,
  User,
  AlertOctagon,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { useAuditLogs, useAuditStats } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";
import { reportsApi } from "@/lib/reports-api";
import {
  ChartGradients,
  EmptyState,
  SectionTitle,
} from "@/components/reports/chart-theme";
import { MetricTile } from "@/components/reports/MetricTile";
import { toast } from "sonner";

const SEVERITY_TONE: Record<string, string> = {
  info: "bg-slate-500/10 text-slate-700",
  warning: "bg-amber-500/10 text-amber-700",
  error: "bg-red-500/10 text-red-700",
  critical: "bg-red-600/15 text-red-800 font-semibold",
};

// Color the action chip by its module prefix (auth., payment., bank., etc.)
function moduleTone(actionType: string): string {
  const mod = actionType.split(".")[0] || "";
  const tones: Record<string, string> = {
    auth: "bg-blue-500/10 text-blue-700",
    payment: "bg-violet-500/10 text-violet-700",
    bank: "bg-indigo-500/10 text-indigo-700",
    banking: "bg-indigo-500/10 text-indigo-700",
    expense: "bg-amber-500/10 text-amber-700",
    bill: "bg-amber-500/10 text-amber-700",
    user: "bg-emerald-500/10 text-emerald-700",
    org: "bg-emerald-500/10 text-emerald-700",
    organization: "bg-emerald-500/10 text-emerald-700",
    erp: "bg-cyan-500/10 text-cyan-700",
    recon: "bg-purple-500/10 text-purple-700",
    security: "bg-red-500/10 text-red-700",
    data: "bg-slate-500/10 text-slate-700",
    investment: "bg-emerald-500/10 text-emerald-700",
    dividend: "bg-emerald-500/10 text-emerald-700",
    sacco: "bg-emerald-500/10 text-emerald-700",
    verification: "bg-cyan-500/10 text-cyan-700",
    wallet: "bg-pink-500/10 text-pink-700",
    system: "bg-slate-500/10 text-slate-700",
  };
  return tones[mod] || "bg-muted text-muted-foreground";
}

export default function AuditTrailPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [days, setDays] = useState("30");
  const [severity, setSeverity] = useState("all");
  const [module, setModule] = useState("all");
  const [actionType, setActionType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp) ? orgsResp : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;

  const listFilters = {
    organization: organizationId,
    severity: severity === "all" ? undefined : severity,
    module: module === "all" ? undefined : module,
    action_type: actionType || undefined,
    search: search || undefined,
    page,
    page_size: 100,
    ordering: "-timestamp",
  };
  const { data, isLoading } = useAuditLogs(listFilters);
  const { data: stats } = useAuditStats(organizationId, parseInt(days));

  const rows = data?.results || [];
  const total = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / 100));

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
    } catch (e: any) {
      toast.error(e?.message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  // Modules surfaced in stats so the user can pick a real value
  const moduleOptions = Object.keys(stats?.by_module || {});
  const actionOptions = Object.keys(stats?.by_action || {});

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Audit Trail"
        subtitle="Every approval-bearing action across the system"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Audit Trail" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? "Downloading…" : "Download CSV"}
        </Button>
      </PageHeader>

      <div className="px-6 py-8 space-y-6">
        <ChartGradients />

        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Severity</label>
              <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Module</label>
              <Select value={module} onValueChange={(v) => { setModule(v); setPage(1); }}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {moduleOptions.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m} ({stats?.by_module[m]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Action type</label>
              <Select value={actionType || "all"} onValueChange={(v) => { setActionType(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a} ({stats?.by_action[a]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[240px]">
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="description, user email, target…"
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Summary */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {!stats ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <MetricTile
                label={`Events (${days}d)`}
                value={stats.total_logs.toLocaleString()}
                icon={ScrollText}
                tone="accent"
                hint={`${stats.recent_count.toLocaleString()} in the last 24h`}
              />
              <MetricTile
                label="Warnings"
                value={(stats.by_severity.warning || 0).toLocaleString()}
                icon={AlertTriangle}
                tone={(stats.by_severity.warning || 0) > 0 ? "warning" : "default"}
              />
              <MetricTile
                label="Errors"
                value={stats.error_count.toLocaleString()}
                icon={AlertOctagon}
                tone={stats.error_count > 0 ? "danger" : "default"}
              />
              <MetricTile
                label="Critical"
                value={stats.critical_count.toLocaleString()}
                icon={AlertOctagon}
                tone={stats.critical_count > 0 ? "danger" : "default"}
                hint="Requires investigation"
              />
            </>
          )}
        </div>

        {/* Event log */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <SectionTitle
              icon={<FileSearch className="h-4 w-4" />}
              title="Event log"
              subtitle={`${total.toLocaleString()} total · page ${page} of ${totalPages}`}
              right={
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!data?.next}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              }
            />
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<ScrollText className="h-5 w-5" />}
                title="No audit events match your filters"
                hint="Widen the period or clear filters to see more events."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-professional">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">When</th>
                      <th className="py-2 font-medium">Action</th>
                      <th className="py-2 font-medium">Severity</th>
                      <th className="py-2 font-medium">User</th>
                      <th className="py-2 font-medium">Module</th>
                      <th className="py-2 font-medium">Target</th>
                      <th className="py-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5 text-xs text-foreground tabular-nums whitespace-nowrap">
                          {new Date(e.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 font-medium font-mono ${moduleTone(e.action_type)}`}
                          >
                            {e.action_type}
                          </span>
                          {!e.success && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 font-medium bg-red-500/10 text-red-700">
                              failed
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 font-medium ${SEVERITY_TONE[e.severity] || ""}`}
                          >
                            {e.severity}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5 text-foreground">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {e.user_name}
                          </div>
                          {e.user_ip && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {e.user_ip}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {e.module || "—"}
                        </td>
                        <td className="py-2.5 text-foreground truncate max-w-[220px]">
                          {e.target_representation || "—"}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground max-w-[320px] truncate">
                          {e.action_description}
                          {e.error_message && (
                            <div className="text-red-600 text-[11px] mt-0.5">
                              {e.error_message}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCardBody>
        </ContentCard>
      </div>
    </div>
  );
}
