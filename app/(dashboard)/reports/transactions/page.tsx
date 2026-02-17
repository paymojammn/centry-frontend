"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subMonths, formatDistanceToNow } from "date-fns";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Smartphone,
  Landmark,
  Upload,
  List,
  BarChart3,
  User,
  ShieldCheck,
  Download,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import {
  usePaymentTransactions,
  usePaymentTransactionList,
} from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/reports/export/ExportButton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type {
  ChannelBreakdown,
  PaymentFile,
  PaymentTransaction,
} from "@/types/reports";

// ============================================================
// Constants
// ============================================================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const STATUS_COLORS: Record<string, string> = {
  Success: "#10b981",
  Failed: "#ef4444",
  Processing: "#f59e0b",
};

const CHANNEL_ICONS: Record<string, typeof Landmark> = {
  bank_transfer: Landmark,
  mtn_momo: Smartphone,
  airtel_momo: Smartphone,
  cash: Send,
  card: Send,
};

const BANK_STATUS_MAP: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ACSP: { label: "Accepted", variant: "default" },
  RCVD: { label: "Received", variant: "secondary" },
  PDNG: { label: "Pending", variant: "outline" },
  PART: { label: "Partial", variant: "outline" },
  RJCT: { label: "Rejected", variant: "destructive" },
  pending: { label: "Awaiting", variant: "secondary" },
  uploaded: { label: "Uploaded", variant: "secondary" },
  processed: { label: "Processed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  SUCCESS_PAYMENT: {
    label: "Success",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  FAILED_PAYMENT: {
    label: "Failed",
    className: "bg-red-500/10 text-red-700 border-red-500/20",
  },
  ERROR_PAYMENT: {
    label: "Error",
    className: "bg-red-500/10 text-red-700 border-red-500/20",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-700 border-red-500/20",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  PENDING: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  SENT_PAYMENT: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  mtn_momo: "MTN MoMo",
  airtel_momo: "Airtel Money",
  cash: "Cash",
  card: "Card",
};

// ============================================================
// Skeleton helpers
// ============================================================

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
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

function TableSkeleton() {
  return (
    <ContentCard noPadding>
      <ContentCardHeader>
        <Skeleton className="h-5 w-48" />
      </ContentCardHeader>
      <div className="p-6 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </ContentCard>
  );
}

// ============================================================
// Overview Tab Components
// ============================================================

function ChannelStatusCard({ channel }: { channel: ChannelBreakdown }) {
  const Icon = CHANNEL_ICONS[channel.method] || Send;
  const total = channel.total_count;
  const succPct = total > 0 ? (channel.successful.count / total) * 100 : 0;
  const failPct = total > 0 ? (channel.failed.count / total) * 100 : 0;
  const pendPct = total > 0 ? (channel.pending.count / total) * 100 : 0;

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {channel.channel}
            </p>
            <p className="text-xs text-muted-foreground">
              {channel.total_count} payments
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(channel.total_amount)}
        </p>
      </div>

      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex mb-2.5">
        {succPct > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${succPct}%` }}
          />
        )}
        {failPct > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${failPct}%` }}
          />
        )}
        {pendPct > 0 && (
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${pendPct}%` }}
          />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          {channel.successful.count}
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <XCircle className="h-3 w-3" />
          {channel.failed.count}
        </span>
        <span className="flex items-center gap-1 text-amber-600">
          <Clock className="h-3 w-3" />
          {channel.pending.count}
        </span>
        <span className="ml-auto text-muted-foreground">
          {succPct.toFixed(0)}% success
        </span>
      </div>
    </div>
  );
}

function StatusDonut({
  data,
}: {
  data: Array<{ status: string; count: number; amount: number }>;
}) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: d.status,
      value: d.count,
      amount: d.amount,
      fill: STATUS_COLORS[d.status] || "#94a3b8",
    }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No payment data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-[130px] h-[130px] shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={60}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} payments`,
                name,
              ]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                backgroundColor: "rgb(var(--card-bg))",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{total}</p>
            <p className="text-[10px] text-muted-foreground">total</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm text-foreground">{item.name}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground ml-1.5">
                ({formatCurrency(item.amount)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileRow({ file }: { file: PaymentFile }) {
  const bankStatus =
    BANK_STATUS_MAP[file.bank_status] ||
    BANK_STATUS_MAP[file.status] || {
      label: file.status,
      variant: "secondary" as const,
    };
  const displayName =
    file.filename.length > 40
      ? file.filename.slice(0, 18) + "..." + file.filename.slice(-18)
      : file.filename;
  const totalResolved =
    file.successful_count + file.failed_count + file.pending_count;

  return (
    <div className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center hover:bg-muted/30 transition-colors">
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <div className="p-1.5 rounded-lg bg-muted shrink-0">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-medium text-foreground truncate"
            title={file.filename}
          >
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {file.bank_account_name || "—"}
          </p>
        </div>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-foreground">
          {format(new Date(file.created_at), "dd MMM yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(file.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
      <div className="col-span-2 text-right">
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(file.total_amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {file.payment_count} payments
        </p>
      </div>
      <div className="col-span-2">
        {totalResolved > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
              {file.successful_count > 0 && (
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${(file.successful_count / file.payment_count) * 100}%`,
                  }}
                />
              )}
              {file.failed_count > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${(file.failed_count / file.payment_count) * 100}%`,
                  }}
                />
              )}
              {file.pending_count > 0 && (
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${(file.pending_count / file.payment_count) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span className="text-emerald-600">
                {file.successful_count}ok
              </span>
              <span className="text-red-500">{file.failed_count}fail</span>
              <span className="text-amber-600">
                {file.pending_count}wait
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Awaiting response
          </span>
        )}
      </div>
      <div className="col-span-2 text-right">
        <Badge variant={bankStatus.variant} className="text-xs">
          {bankStatus.label}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================
// Transactions Tab Components
// ============================================================

function TransactionRow({ txn }: { txn: PaymentTransaction }) {
  const statusBadge = STATUS_BADGE_MAP[txn.status] || {
    label: txn.status_label,
    className: "bg-muted text-muted-foreground",
  };
  const Icon = CHANNEL_ICONS[txn.method] || Send;

  return (
    <div className="grid grid-cols-12 gap-3 px-6 py-3 items-center hover:bg-muted/30 transition-colors text-sm">
      {/* Date */}
      <div className="col-span-2">
        <p className="font-medium text-foreground">
          {format(new Date(txn.date), "dd MMM yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(txn.date), "HH:mm")}
        </p>
      </div>

      {/* Recipient */}
      <div className="col-span-2 min-w-0">
        <p className="font-medium text-foreground truncate" title={txn.recipient}>
          {txn.recipient}
        </p>
        <p className="text-xs text-muted-foreground truncate" title={txn.reference}>
          {txn.reference}
        </p>
      </div>

      {/* Channel */}
      <div className="col-span-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {CHANNEL_LABELS[txn.method] || txn.channel}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="col-span-2 text-right">
        <p className="font-semibold text-foreground tabular-nums">
          {formatCurrencyFull(txn.amount)}
        </p>
        <p className="text-xs text-muted-foreground">{txn.currency}</p>
      </div>

      {/* Status */}
      <div className="col-span-1">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Initiated By */}
      <div className="col-span-2">
        {txn.initiated_by ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground truncate" title={txn.initiated_by.email}>
              {txn.initiated_by.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Approved By */}
      <div className="col-span-2">
        {txn.approved_by ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="text-xs text-foreground truncate" title={txn.approved_by.email}>
              {txn.approved_by.name}
            </span>
          </div>
        ) : txn.rejected_by ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
            <span
              className="text-xs text-red-600 truncate"
              title={txn.rejected_by.reason || txn.rejected_by.email}
            >
              {txn.rejected_by.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

type TabKey = "overview" | "transactions";

export default function TransactionReportsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [period, setPeriod] = useState("3");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  const { data: organizationsResponse, isLoading: orgsLoading } =
    useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(
    subMonths(new Date(), parseInt(period)),
    "yyyy-MM-dd"
  );
  const endDate = format(new Date(), "yyyy-MM-dd");

  // Overview data
  const { data: report, isLoading: loadingOverview } = usePaymentTransactions(
    organizationId,
    startDate,
    endDate
  );

  // Transaction list data (only fetch when on transactions tab)
  const listFilters = useMemo(
    () =>
      organizationId
        ? {
            organization: organizationId,
            start_date: startDate,
            end_date: endDate,
            ...(statusFilter !== "all" && { status: statusFilter }),
            ...(methodFilter !== "all" && { method: methodFilter }),
          }
        : undefined,
    [organizationId, startDate, endDate, statusFilter, methodFilter]
  );

  const { data: listData, isLoading: loadingList } =
    usePaymentTransactionList(activeTab === "transactions" ? listFilters : undefined);

  const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "transactions", label: "All Transactions", icon: List },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Transaction Reports"
        subtitle="Payment processing & bank submissions"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Transactions" },
        ]}
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
            reportType={activeTab === "transactions" ? "payment-transactions" : "transactions"}
            startDate={startDate}
            endDate={endDate}
            status={activeTab === "transactions" && statusFilter !== "all" ? statusFilter : undefined}
            method={activeTab === "transactions" && methodFilter !== "all" ? methodFilter : undefined}
          />
        )}
      </PageHeader>

      {/* Tab Sub-menu */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.key === "transactions" && listData && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                      {listData.total_count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ============================== */}
        {/* OVERVIEW TAB                   */}
        {/* ============================== */}
        {activeTab === "overview" && (
          <>
            {/* Row 1: Overview Stats */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {loadingOverview ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    label="Submitted"
                    value={formatCurrency(
                      report?.overview.total_submitted.amount || 0
                    )}
                    icon={Send}
                    variant="accent"
                    trend={{ value: report?.overview.change || 0 }}
                    subtext={`${report?.overview.total_submitted.count || 0} payments`}
                  />
                  <StatCard
                    label="Successful"
                    value={formatCurrency(
                      report?.overview.successful.amount || 0
                    )}
                    icon={CheckCircle2}
                    iconColor="#10b981"
                    iconBgColor="#10b98115"
                    subtext={`${report?.overview.successful.count || 0} payments cleared`}
                  />
                  <StatCard
                    label="Failed"
                    value={formatCurrency(
                      report?.overview.failed.amount || 0
                    )}
                    icon={XCircle}
                    variant={
                      report?.overview.failed.count ? "danger" : "default"
                    }
                    subtext={`${report?.overview.failed.count || 0} payments rejected`}
                  />
                  <StatCard
                    label="Processing"
                    value={formatCurrency(
                      report?.overview.processing.amount || 0
                    )}
                    icon={Clock}
                    variant={
                      report?.overview.processing.count
                        ? "warning"
                        : "default"
                    }
                    subtext={`${report?.overview.processing.count || 0} awaiting response`}
                  />
                </>
              )}
            </div>

            {/* Row 2: Channel Breakdown + Status Donut */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {loadingOverview ? (
                  <ChartSkeleton height="h-[280px]" />
                ) : (
                  <ContentCard noPadding>
                    <ContentCardHeader>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Landmark className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Performance by Channel
                        </h3>
                      </div>
                    </ContentCardHeader>
                    <ContentCardBody>
                      {report?.by_channel &&
                      report.by_channel.length > 0 ? (
                        <div className="space-y-3">
                          {report.by_channel.map((ch) => (
                            <ChannelStatusCard
                              key={ch.method}
                              channel={ch}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                          No payment channel data yet
                        </div>
                      )}
                    </ContentCardBody>
                  </ContentCard>
                )}
              </div>

              <div>
                {loadingOverview ? (
                  <ChartSkeleton height="h-[200px]" />
                ) : (
                  <ContentCard noPadding className="h-full">
                    <ContentCardHeader>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[rgb(var(--warning))]/10">
                          <CheckCircle2 className="h-4 w-4 text-[rgb(var(--warning))]" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Status Breakdown
                        </h3>
                      </div>
                    </ContentCardHeader>
                    <ContentCardBody>
                      <StatusDonut
                        data={report?.status_distribution || []}
                      />
                    </ContentCardBody>
                  </ContentCard>
                )}
              </div>
            </div>

            {/* Row 3: Recent Payment Files */}
            {loadingOverview ? (
              <TableSkeleton />
            ) : report?.recent_files &&
              report.recent_files.length > 0 ? (
              <ContentCard noPadding>
                <ContentCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Recent Payment Files
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {report.recent_files.length}
                      </Badge>
                    </div>
                  </div>
                </ContentCardHeader>
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <div className="col-span-4">File</div>
                  <div className="col-span-2">Submitted</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-2">Results</div>
                  <div className="col-span-2 text-right">Bank Status</div>
                </div>
                <div className="divide-y divide-border/50">
                  {report.recent_files.map((file) => (
                    <FileRow key={file.id} file={file} />
                  ))}
                </div>
              </ContentCard>
            ) : (
              <ContentCard>
                <div className="text-center py-16">
                  <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No payment files yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Payment files will appear here once submitted to your bank
                  </p>
                </div>
              </ContentCard>
            )}
          </>
        )}

        {/* ============================== */}
        {/* TRANSACTIONS TAB               */}
        {/* ============================== */}
        {activeTab === "transactions" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filters:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Success
                    </span>
                  </SelectItem>
                  <SelectItem value="failed">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Failed
                    </span>
                  </SelectItem>
                  <SelectItem value="processing">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Processing
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="bank_transfer">
                    <span className="flex items-center gap-2">
                      <Landmark className="h-3.5 w-3.5" />
                      Bank Transfer
                    </span>
                  </SelectItem>
                  <SelectItem value="mtn_momo">
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5" />
                      MTN MoMo
                    </span>
                  </SelectItem>
                  <SelectItem value="airtel_momo">
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5" />
                      Airtel Money
                    </span>
                  </SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
              {(statusFilter !== "all" || methodFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setMethodFilter("all");
                  }}
                  className="text-xs text-muted-foreground"
                >
                  Clear filters
                </Button>
              )}
              <div className="ml-auto text-sm text-muted-foreground">
                {loadingList ? (
                  <Skeleton className="h-4 w-24 inline-block" />
                ) : (
                  `${listData?.total_count || 0} transactions`
                )}
              </div>
            </div>

            {/* Transaction Table */}
            {loadingList ? (
              <TableSkeleton />
            ) : listData?.transactions &&
              listData.transactions.length > 0 ? (
              <ContentCard noPadding>
                <ContentCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <List className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Payment Transactions
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {listData.total_count}
                      </Badge>
                    </div>
                  </div>
                </ContentCardHeader>

                {/* Table header */}
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Recipient</div>
                  <div className="col-span-1">Channel</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2">Initiated By</div>
                  <div className="col-span-2">Approved By</div>
                </div>

                <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
                  {listData.transactions.map((txn) => (
                    <TransactionRow key={txn.id} txn={txn} />
                  ))}
                </div>
              </ContentCard>
            ) : (
              <ContentCard>
                <div className="text-center py-16">
                  <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-4">
                    <List className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    No transactions found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statusFilter !== "all" || methodFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Payment transactions will appear here once processed"}
                  </p>
                </div>
              </ContentCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
