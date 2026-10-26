"use client";

/**
 * Approval cycle — what is waiting for approval, how long approvals take,
 * and which approvers are the bottleneck.
 */

import { useState } from "react";
import { AlertCircle, Clock, Hourglass, Timer, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart } from "@/components/reports/charts/ReportCharts";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useApprovalCycleReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

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

export default function ApprovalCycleReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("90d");
  const [status, setStatus] = useState("all");
  const [minAmount, setMinAmount] = useState("");

  const organizationId = org.organizationId || undefined;

  const { data, isLoading } = useApprovalCycleReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    status: status === "all" ? undefined : status,
    min_amount: minAmount || undefined,
  });

  const approvers = data?.approvers || [];
  const pendingCount = data?.pending.count ?? 0;
  const oldestAge = ageHours(data?.pending.oldest_at);
  const chartData = approvers.map((a) => ({ name: a.name, hours: a.avg_hours ?? 0 }));

  return (
    <ReportShell
      title="Approval cycle"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min amount (UGX)"
            className="h-9 w-[170px]"
            aria-label="Minimum amount in UGX"
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
              label="Pending approvals"
              value={pendingCount.toLocaleString()}
              hint={`${formatCurrencyCompact(parseFloat(data?.pending.amount || "0"))} waiting`}
              icon={Clock}
              tone={pendingCount > 0 ? "warning" : "default"}
            />
            <MetricTile
              label="Oldest pending"
              value={oldestAge === null ? "—" : `${formatHours(oldestAge)} ago`}
              hint={oldestAge === null ? "Nothing waiting" : "Time since the bill was created"}
              icon={Hourglass}
              tone={oldestAge !== null && oldestAge > 48 ? "danger" : "default"}
            />
            <MetricTile
              label="Avg time to approve"
              value={formatHours(data?.averages.avg_hours_to_approve)}
              hint={`Sample of ${(data?.averages.sample_size ?? 0).toLocaleString()} approvals`}
              icon={AlertCircle}
            />
            <MetricTile
              label="Avg time to execute"
              value={formatHours(data?.averages.avg_hours_to_execute)}
              hint="From approval to processed"
              icon={Timer}
            />
          </ReportSummary>

          <ReportSection
            title="Average approval time by approver"
            subtitle="Hours from submission to approval, slowest first"
            icon={<Timer className="h-4 w-4" />}
            padded
          >
            <ReportBarChart
              data={chartData}
              xKey="name"
              series={[{ key: "hours", label: "Avg hours" }]}
              valueFormatter={(v) => formatHours(v)}
              height={240}
              emptyTitle="No approval activity"
              emptyHint="No approvals were recorded in this period."
            />
          </ReportSection>

          <ReportSection
            title="Approvers"
            subtitle="Slowest first"
            icon={<Users className="h-4 w-4" />}
          >
            {approvers.length === 0 ? (
              <EmptyState icon={Users} title="No approval activity" description="No approvals were recorded in this period." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Approver</th>
                      <th className="text-right">Approved</th>
                      <th className="text-right">Approved amount</th>
                      <th className="text-right">Avg time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvers.map((a) => (
                      <tr key={a.user_id}>
                        <td className="cell-primary">{a.name}</td>
                        <td className="cell-amount">{a.approved_count.toLocaleString()}</td>
                        <td className="cell-amount">{formatCurrencyCompact(parseFloat(a.approved_amount))}</td>
                        <td className="cell-amount">{formatHours(a.avg_hours)}</td>
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
