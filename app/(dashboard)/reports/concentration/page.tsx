"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Calendar, AlertTriangle, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { useConcentrationReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export default function ConcentrationReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [period, setPeriod] = useState("3");
  const [dimension, setDimension] = useState<"recipient" | "channel" | "currency">("recipient");
  const [topN, setTopN] = useState("10");
  const [includeBulk, setIncludeBulk] = useState("true");

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

  const { data, isLoading } = useConcentrationReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    dimension,
    top_n: parseInt(topN),
    include_bulk: includeBulk === "true",
  });

  const entries = data?.entries || [];
  const maxAmount = Math.max(...entries.map((e) => parseFloat(e.amount)), 1);
  const totalCompleted = parseFloat(data?.totals.total_completed_amount || "0");

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Concentration Risk"
        subtitle="Who and what your payments concentrate on"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Concentration" }]}
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
        {organizationId && (
          <ExportButton
            organizationId={organizationId}
            reportType="pipeline"
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </PageHeader>

      <div className="px-6 py-8 space-y-6">
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Group by</label>
              <Select value={dimension} onValueChange={(v) => setDimension(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recipient">Recipient</SelectItem>
                  <SelectItem value="channel">Channel (provider account)</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Top N</label>
              <Select value={topN} onValueChange={setTopN}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dimension === "recipient" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Bulk payments</label>
                <Select value={includeBulk} onValueChange={setIncludeBulk}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Include</SelectItem>
                    <SelectItem value="false">Exclude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ContentCard>

        {/* Stat row */}
        <div className="grid gap-5 md:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                label="Total completed in period"
                value={formatCurrency(totalCompleted)}
                icon={Users}
                variant="accent"
                subtext={`${entries.length} entries shown`}
              />
              <StatCard
                label="Top 3 share"
                value={`${data?.totals.top3_pct ?? 0}%`}
                icon={AlertTriangle}
                variant={(data?.totals.top3_pct ?? 0) >= 60 ? "warning" : "default"}
                subtext="Concentration in top 3"
              />
              <StatCard
                label="Top 5 share"
                value={`${data?.totals.top5_pct ?? 0}%`}
                variant={(data?.totals.top5_pct ?? 0) >= 80 ? "warning" : "default"}
                subtext="Concentration in top 5"
              />
            </>
          )}
        </div>

        {/* Table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Top {data?.filters.top_n ?? topN} by amount
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : entries.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No completed payments in this window
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((e, i) => {
                  const amt = parseFloat(e.amount);
                  return (
                    <div key={`${e.label}-${i}`} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate max-w-[55%]">
                          {e.label}
                          {e.sub && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                              {e.sub}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                            {e.count} pmts
                          </span>
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(amt)}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {e.share}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(amt / maxAmount) * 100}%`,
                            backgroundColor: `rgb(var(--brand-primary) / ${1 - i * 0.08})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ContentCardBody>
        </ContentCard>
      </div>
    </div>
  );
}
