"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Calendar, AlertOctagon, Search } from "lucide-react";
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
import { useFailuresReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number, currency: string = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

const SOURCE_LABEL: Record<string, string> = {
  provider: "Provider",
  bank: "Bank file",
  pain002: "pain.002",
};

const SOURCE_COLOR: Record<string, string> = {
  provider: "bg-amber-500/10 text-amber-700",
  bank: "bg-red-500/10 text-red-700",
  pain002: "bg-purple-500/10 text-purple-700",
};

export default function FailuresReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState("30");
  const [source, setSource] = useState<"all" | "provider" | "bank" | "pain002">("all");
  const [reasonQuery, setReasonQuery] = useState("");

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp) ? orgsResp : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(subDays(new Date(), parseInt(periodDays)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading } = useFailuresReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    source,
    reason_contains: reasonQuery || undefined,
  });

  const rows = data?.rows || [];
  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Failed Payments Register"
        subtitle="Every failed or rejected payment with the reason given"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Failures" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="px-6 py-8 space-y-6">
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Source</label>
              <Select value={source} onValueChange={(v) => setSource(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="provider">Provider (gateway)</SelectItem>
                  <SelectItem value="bank">Bank file</SelectItem>
                  <SelectItem value="pain002">pain.002 rejections</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Reason contains</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={reasonQuery}
                  onChange={(e) => setReasonQuery(e.target.value)}
                  placeholder="text search"
                  className="w-[260px] pl-8"
                />
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Summary per source */}
        <div className="grid gap-5 md:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            ["provider", "bank", "pain002"].map((k) => (
              <StatCard
                key={k}
                label={`${SOURCE_LABEL[k]} failures`}
                value={summary[k]?.count ?? 0}
                icon={AlertOctagon}
                variant={(summary[k]?.count ?? 0) > 0 ? "danger" : "default"}
                subtext={formatCurrency(parseFloat(summary[k]?.amount || "0"))}
              />
            ))
          )}
        </div>

        {/* Register table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Register
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No failures in this window — clean run.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-professional">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Source</th>
                      <th className="py-2 font-medium">Channel</th>
                      <th className="py-2 font-medium">Recipient</th>
                      <th className="py-2 font-medium text-right">Amount</th>
                      <th className="py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.source}:${r.id}`} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 text-foreground tabular-nums text-xs">
                          {new Date(r.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${SOURCE_COLOR[r.source] || ""}`}
                          >
                            {SOURCE_LABEL[r.source] || r.source}
                          </span>
                        </td>
                        <td className="py-2.5 text-foreground">{r.channel}</td>
                        <td className="py-2.5 text-foreground truncate max-w-[200px]">
                          {r.recipient || "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatCurrency(parseFloat(r.amount), r.currency || "UGX")}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground max-w-[280px] truncate">
                          {r.reason || "—"}
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
