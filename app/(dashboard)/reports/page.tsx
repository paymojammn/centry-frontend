"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Calendar,
  CreditCard,
  FileText,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import {
  useCEODashboard,
  useFinancialTrends,
} from "@/hooks/use-reports";
import {
  usePaymentPipelineStats,
  useBankResponseStats,
} from "@/hooks/use-banking";
import { useOrganizations } from "@/hooks/use-organization";
import { PageHeader } from "@/components/layout/page-header";
import { TrendChart } from "@/components/reports/charts/TrendChart";
import { PaymentChannelsChart } from "@/components/reports/charts/PaymentChannelsChart";
import { ExportButton } from "@/components/reports/export/ExportButton";
import Link from "next/link";

// ============================================================
// Helpers
// ============================================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton({ height = "h-[350px]" }: { height?: string }) {
  return (
    <ContentCard noPadding>
      <ContentCardHeader>
        <Skeleton className="h-5 w-36" />
      </ContentCardHeader>
      <ContentCardBody>
        <Skeleton className={`${height} w-full rounded-lg`} />
      </ContentCardBody>
    </ContentCard>
  );
}

// ============================================================
// Pipeline bar colors (muted fintech palette)
// ============================================================

const PIPELINE_STAGES = [
  { key: "pending_approval", label: "Pending Approval", color: "#D4B35A" },
  { key: "processing", label: "Ready for Export", color: "#6B8FB8" },
  { key: "sent_to_bank", label: "Sent to Bank", color: "#D4944A" },
  { key: "accepted", label: "Bank Accepted", color: "#6B9B71" },
  { key: "failed", label: "Failed / Rejected", color: "#B85C5C" },
  { key: "synced", label: "Synced to ERP", color: "rgb(var(--brand-primary))" },
] as const;

// ============================================================
// Page
// ============================================================

export default function ReportsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [period, setPeriod] = useState("3");

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(subMonths(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data: ceo, isLoading: loadingCEO } = useCEODashboard(organizationId, startDate, endDate);
  const { data: trends, isLoading: loadingTrends } = useFinancialTrends(organizationId, parseInt(period));
  const { data: pipeline, isLoading: loadingPipeline } = usePaymentPipelineStats(organizationId);
  const { data: bankResponses, isLoading: loadingBank } = useBankResponseStats(organizationId);

  // Derived metrics
  const totalProcessed = pipeline?.success || 0;
  const pendingPipeline = (pipeline?.pending_approval || 0) + (pipeline?.processing || 0) + (pipeline?.pending || 0);
  const totalResponded = (bankResponses?.successful_transactions || 0) + (bankResponses?.rejected_transactions || 0);
  const acceptanceRate = totalResponded > 0
    ? Math.round((bankResponses!.successful_transactions / totalResponded) * 100)
    : 0;
  const syncTotal = (pipeline?.synced_count || 0) + (pipeline?.not_synced_count || 0);
  const syncRate = syncTotal > 0
    ? Math.round((pipeline!.synced_count / syncTotal) * 100)
    : 0;

  // Pipeline bar data
  const pipelineData = [
    { ...PIPELINE_STAGES[0], count: pipeline?.pending_approval || 0, amount: parseFloat(pipeline?.total_amount_pending_approval || "0") },
    { ...PIPELINE_STAGES[1], count: pipeline?.processing || 0, amount: parseFloat(pipeline?.total_amount_processing || "0") },
    { ...PIPELINE_STAGES[2], count: (pipeline?.pending || 0) + (pipeline?.sent || 0), amount: parseFloat(pipeline?.total_amount_pending || "0") + parseFloat(pipeline?.total_amount_sent || "0") },
    { ...PIPELINE_STAGES[3], count: bankResponses?.successful_transactions || 0, amount: 0 },
    { ...PIPELINE_STAGES[4], count: (pipeline?.failed || 0) + (pipeline?.rejected || 0) + (bankResponses?.rejected_transactions || 0), amount: 0 },
    { ...PIPELINE_STAGES[5], count: pipeline?.synced_count || 0, amount: 0 },
  ];
  const maxPipelineCount = Math.max(...pipelineData.map((d) => d.count), 1);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Reports"
        subtitle="Payment pipeline analytics"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
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
            reportType="financial"
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Row 1: Key Pipeline Metrics */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {loadingPipeline || loadingBank ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Total Processed"
                value={totalProcessed}
                icon={CheckCircle2}
                variant="accent"
                subtext={formatCurrency(parseFloat(pipeline?.total_amount_sent || "0"))}
              />
              <StatCard
                label="In Pipeline"
                value={pendingPipeline}
                icon={Clock}
                variant={pendingPipeline > 0 ? "warning" : "default"}
                subtext="Across approval, export & bank"
              />
              <StatCard
                label="Bank Acceptance"
                value={`${acceptanceRate}%`}
                icon={TrendingUp}
                subtext={`${bankResponses?.successful_transactions || 0} of ${totalResponded} transactions`}
              />
              <StatCard
                label="ERP Sync Rate"
                value={`${syncRate}%`}
                icon={RefreshCw}
                subtext={`${pipeline?.synced_count || 0} synced, ${pipeline?.not_synced_count || 0} pending`}
              />
            </>
          )}
        </div>

        {/* Row 2: Pipeline Breakdown + Payment Channels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Pipeline */}
          {loadingPipeline || loadingBank ? (
            <ChartSkeleton height="h-[280px]" />
          ) : (
            <ContentCard noPadding>
              <ContentCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Payment Pipeline</h3>
                </div>
              </ContentCardHeader>
              <ContentCardBody className="space-y-4">
                {pipelineData.map((stage) => (
                  <div key={stage.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{stage.label}</span>
                      <div className="flex items-center gap-2">
                        {stage.amount > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(stage.amount)}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-foreground tabular-nums w-8 text-right">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(stage.count / maxPipelineCount) * 100}%`,
                          backgroundColor: stage.color,
                          minWidth: stage.count > 0 ? "8px" : "0px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </ContentCardBody>
            </ContentCard>
          )}

          {/* Payment Channels */}
          {loadingCEO ? (
            <ChartSkeleton height="h-[280px]" />
          ) : (
            <ContentCard noPadding>
              <ContentCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Payments by Channel</h3>
                </div>
              </ContentCardHeader>
              <ContentCardBody>
                {ceo?.payment_channels && ceo.payment_channels.length > 0 ? (
                  <PaymentChannelsChart data={ceo.payment_channels} />
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                    No channel data yet
                  </div>
                )}
              </ContentCardBody>
            </ContentCard>
          )}
        </div>

        {/* Row 3: Bank Responses + Top Vendors */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bank Response Summary */}
          {loadingBank ? (
            <ChartSkeleton height="h-[200px]" />
          ) : (
            <ContentCard noPadding>
              <ContentCardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Bank Responses</h3>
                  </div>
                  <Link href="/banking/reconciliation">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8">
                      View all
                      <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </ContentCardHeader>
              <ContentCardBody className="space-y-4">
                {(() => {
                  const totalTxn = bankResponses?.total_transactions || 0;
                  const rows = [
                    {
                      label: "Accepted",
                      count: bankResponses?.successful_transactions || 0,
                      color: "#6B9B71",
                      bgClass: "bg-emerald-500/10",
                    },
                    {
                      label: "Rejected",
                      count: bankResponses?.rejected_transactions || 0,
                      color: "#B85C5C",
                      bgClass: "bg-red-500/10",
                    },
                    {
                      label: "Pending",
                      count: bankResponses?.pending_transactions || 0,
                      color: "#D4B35A",
                      bgClass: "bg-amber-500/10",
                    },
                  ];

                  if (totalTxn === 0) {
                    return (
                      <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
                        No bank responses yet
                      </div>
                    );
                  }

                  return rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.bgClass}`}
                      >
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: row.color }}
                        >
                          {row.count}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground">{row.label}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {totalTxn > 0 ? Math.round((row.count / totalTxn) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${totalTxn > 0 ? (row.count / totalTxn) * 100 : 0}%`,
                              backgroundColor: row.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </ContentCardBody>
            </ContentCard>
          )}

          {/* Top Vendors */}
          {loadingCEO ? (
            <ChartSkeleton height="h-[200px]" />
          ) : (
            <ContentCard noPadding className="h-full">
              <ContentCardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[rgb(var(--warning))]/10">
                    <TrendingUp className="h-4 w-4 text-[rgb(var(--warning))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Top Vendors</h3>
                </div>
              </ContentCardHeader>
              <ContentCardBody className="space-y-4">
                {ceo?.top_vendors && ceo.top_vendors.length > 0 ? (
                  (() => {
                    const maxAmount = Math.max(...ceo.top_vendors.map((v) => v.total_paid));
                    return ceo.top_vendors.map((vendor, i) => (
                      <div key={vendor.vendor_name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground truncate max-w-[60%]">
                            {vendor.vendor_name}
                          </span>
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {formatCurrency(vendor.total_paid)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${maxAmount > 0 ? (vendor.total_paid / maxAmount) * 100 : 0}%`,
                                backgroundColor: `rgb(var(--brand-primary) / ${1 - i * 0.15})`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                            {vendor.bill_count} bills
                          </span>
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                  <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
                    No vendor data yet
                  </div>
                )}
              </ContentCardBody>
            </ContentCard>
          )}
        </div>

        {/* Row 4: Financial Trends */}
        {loadingTrends ? (
          <ChartSkeleton />
        ) : (
          <TrendChart data={trends?.trends || []} title="Financial Trends" />
        )}

        {/* Row 5: Quick Navigation */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/banking/transactions" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-primary/10 w-fit">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Transactions</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      View all outgoing payments
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
              </div>
            </ContentCard>
          </Link>

          <Link href="/banking/reconciliation" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 w-fit">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Reconciliation</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bank responses & ERP sync
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
              </div>
            </ContentCard>
          </Link>

          <Link href="/bills" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-[rgb(var(--warning))]/10 w-fit">
                    <FileText className="h-5 w-5 text-[rgb(var(--warning))]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Bills</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage bills & approvals
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
              </div>
            </ContentCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
