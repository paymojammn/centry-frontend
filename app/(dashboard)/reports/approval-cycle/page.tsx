"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Calendar, Clock, AlertCircle, Hourglass } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { useApprovalCycleReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

function formatHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function formatRelative(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const ageHrs = (Date.now() - d.getTime()) / 3_600_000;
  return formatHours(ageHrs) + " ago";
}

export default function ApprovalCycleReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [period, setPeriod] = useState("3");
  const [status, setStatus] = useState("all");
  const [minAmount, setMinAmount] = useState("");

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp) ? orgsResp : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(subMonths(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading } = useApprovalCycleReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    status: status === "all" ? undefined : status,
    min_amount: minAmount || undefined,
  });

  const approvers = data?.approvers || [];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Approval Cycle"
        subtitle="Pending approvals and bottlenecks in the payment workflow"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Approval Cycle" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last month</SelectItem>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="px-6 py-8 space-y-6">
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Min amount (UGX)</label>
              <Input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-[180px]"
              />
            </div>
          </div>
        </ContentCard>

        {/* Stat row */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                label="Pending approvals"
                value={data?.pending.count ?? 0}
                icon={Clock}
                variant={
                  (data?.pending.count ?? 0) > 0 ? "warning" : "default"
                }
                subtext={formatCurrency(parseFloat(data?.pending.amount || "0"))}
              />
              <StatCard
                label="Oldest pending"
                value={formatRelative(data?.pending.oldest_at ?? null)}
                icon={Hourglass}
                variant={
                  data?.pending.oldest_at &&
                  (Date.now() - new Date(data.pending.oldest_at).getTime()) /
                    3_600_000 >
                    48
                    ? "danger"
                    : "default"
                }
                subtext="Time since created"
              />
              <StatCard
                label="Avg time to approve"
                value={formatHours(data?.averages.avg_hours_to_approve ?? null)}
                icon={AlertCircle}
                subtext={`Sample: ${data?.averages.sample_size ?? 0}`}
              />
              <StatCard
                label="Avg time to execute"
                value={formatHours(data?.averages.avg_hours_to_execute ?? null)}
                subtext="From approval to processed"
              />
            </>
          )}
        </div>

        {/* Approvers table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Approvers — slowest first
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : approvers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No approval activity in this window
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-professional">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Approver</th>
                      <th className="py-2 font-medium text-right">Approved #</th>
                      <th className="py-2 font-medium text-right">Approved amount</th>
                      <th className="py-2 font-medium text-right">Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvers.map((a) => (
                      <tr
                        key={a.user_id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2.5 text-foreground">{a.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{a.approved_count}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatCurrency(parseFloat(a.approved_amount))}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatHours(a.avg_hours)}
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
