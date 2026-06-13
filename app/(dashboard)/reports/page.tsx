"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subMonths, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  Calendar,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  Wallet,
  Receipt,
  AlertOctagon,
  FileX,
  Landmark,
  Inbox,
  Activity,
  ScrollText,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import {
  useFinancialTrends,
  usePipelineOverview,
} from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { ProviderAccountsCard } from "@/components/reports/cards/ProviderAccountsCard";
import { MetricTile } from "@/components/reports/MetricTile";
import {
  AXIS_STYLE,
  CHART_COLORS,
  ChartGradients,
  ChartTooltip,
  EmptyState,
  GRID_STYLE,
  SectionTitle,
  formatCurrencyCompact,
  pickColor,
} from "@/components/reports/chart-theme";
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
// Pipeline bar colors
// ============================================================

const STAGE_COLORS: Record<string, string> = {
  pending_approval: "#D4B35A",
  ready_for_export: "#6B8FB8",
  sent_to_bank: "#D4944A",
  bank_accepted: "#6B9B71",
  bank_rejected: "#B85C5C",
};

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

  const { data: trends, isLoading: loadingTrends } = useFinancialTrends(
    organizationId,
    parseInt(period),
    "payments"
  );
  const { data: overview, isLoading: loadingOverview } = usePipelineOverview(
    organizationId,
    startDate,
    endDate
  );

  // Derived metrics from the unified overview
  const queue = overview?.queue || [];
  const queueByStage = Object.fromEntries(queue.map((s) => [s.stage, s])) as Record<
    string,
    (typeof queue)[number] | undefined
  >;
  const periodAmount = parseFloat(overview?.totals.period.amount_processed || "0");
  const lifetimeAmount = parseFloat(overview?.totals.lifetime.amount_processed || "0");
  const lifetimeCount = overview?.totals.lifetime.bills_count || 0;
  const periodCount = overview?.totals.period.bills_count || 0;
  const inPipelineCount =
    (queueByStage.pending_approval?.count || 0) +
    (queueByStage.ready_for_export?.count || 0) +
    (queueByStage.sent_to_bank?.count || 0);
  const completed = queueByStage.bank_accepted?.count || 0;
  const failed = queueByStage.bank_rejected?.count || 0;
  const decided = completed + failed;
  const successRate = decided > 0 ? Math.round((completed / decided) * 100) : 0;

  const maxPipelineCount = Math.max(...queue.map((s) => s.count), 1);

  // Sparkline series derived from already-loaded data
  const trendSpark = useMemo(
    () => (trends?.trends || []).map((t) => Number(t.income) || 0),
    [trends]
  );
  const periodSpark = useMemo(() => {
    const days = parseInt(period) * 30;
    const today = new Date();
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const t of overview?.recent_transactions || []) {
      const key = t.date.slice(0, 10);
      buckets.set(key, (buckets.get(key) || 0) + parseFloat(t.amount));
    }
    return Array.from(buckets.values());
  }, [overview, period]);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Centry Payments"
        subtitle="End-to-end payment processing across banks and provider accounts"
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
            reportType="pipeline"
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </PageHeader>

      <div className="px-6 py-8 space-y-8">
        <ChartGradients />

        {/* Row 1: Key Pipeline Metrics */}
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
              <MetricTile
                label="Processed by Centry"
                value={formatCurrency(lifetimeAmount)}
                icon={CheckCircle2}
                tone="accent"
                hint={`${lifetimeCount.toLocaleString()} payments lifetime`}
                sparkline={trendSpark.length >= 2 ? trendSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="This Period"
                value={formatCurrency(periodAmount)}
                icon={TrendingUp}
                tone="default"
                hint={`${periodCount.toLocaleString()} payments`}
                sparkline={periodSpark.length >= 2 ? periodSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="In Pipeline"
                value={inPipelineCount.toLocaleString()}
                icon={Clock}
                tone={inPipelineCount > 0 ? "warning" : "default"}
                hint="Awaiting approval, in flight, or pending bank response"
              />
              <MetricTile
                label="Success Rate"
                value={decided > 0 ? `${successRate}%` : "—"}
                icon={RefreshCw}
                tone={
                  decided === 0
                    ? "default"
                    : successRate >= 90
                    ? "success"
                    : successRate >= 70
                    ? "warning"
                    : "danger"
                }
                hint={`${completed} completed · ${failed} failed`}
              />
            </>
          )}
        </div>

        {/* Row 2: Pipeline Breakdown + Payment Channels */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Pipeline */}
          {loadingOverview ? (
            <ChartSkeleton height="h-[280px]" />
          ) : (
            <ContentCard noPadding>
              <ContentCardHeader>
                <SectionTitle
                  icon={<ArrowRightLeft className="h-4 w-4" />}
                  title="Centry Payments Pipeline"
                  subtitle="Where bills sit in the flow right now"
                />
              </ContentCardHeader>
              <ContentCardBody className="space-y-5">
                {queue.map((stage) => {
                  const amount = parseFloat(stage.amount);
                  const color = STAGE_COLORS[stage.stage] || CHART_COLORS.primary;
                  const widthPct =
                    Math.max((stage.count / maxPipelineCount) * 100, stage.count > 0 ? 2 : 0);
                  return (
                    <div key={stage.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm text-foreground">
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-3">
                          {amount > 0 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCurrencyCompact(amount)}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">
                            {stage.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${widthPct}%`,
                            background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </ContentCardBody>
            </ContentCard>
          )}

          {/* Payments by Channel — Bank (SFTP) + each Provider Account */}
          {loadingOverview ? (
            <ChartSkeleton height="h-[280px]" />
          ) : (() => {
            const channels = (overview?.channels || [])
              .map((c, i) => ({
                name: c.label,
                value: parseFloat(c.amount),
                count: c.count,
                fill: pickColor(i),
              }))
              .filter((c) => c.value > 0);
            const total = channels.reduce((s, c) => s + c.value, 0);
            return (
              <ContentCard noPadding>
                <ContentCardHeader>
                  <SectionTitle
                    icon={<CreditCard className="h-4 w-4" />}
                    title="Payments by Channel"
                    subtitle="Bank (SFTP) and each provider account"
                  />
                </ContentCardHeader>
                <ContentCardBody>
                  {channels.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-5 w-5" />}
                      title="No payments this period"
                      hint="Once payments are processed, you'll see how they split across bank and provider accounts."
                    />
                  ) : (
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative w-[180px] h-[180px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={channels}
                              dataKey="value"
                              innerRadius={56}
                              outerRadius={86}
                              paddingAngle={2}
                              stroke="none"
                              isAnimationActive
                              animationDuration={500}
                            >
                              {channels.map((c, i) => (
                                <Cell key={i} fill={c.fill} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={<ChartTooltip />}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Total
                          </span>
                          <span className="text-base font-semibold text-foreground tabular-nums">
                            {formatCurrencyCompact(total)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        {channels.map((c) => {
                          const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
                          return (
                            <div key={c.name} className="flex items-center gap-3">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: c.fill }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground truncate">
                                    {c.name}
                                  </span>
                                  <span className="text-foreground font-medium tabular-nums">
                                    {formatCurrencyCompact(c.value)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1 rounded-full bg-muted/60 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: c.fill,
                                      }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </ContentCardBody>
              </ContentCard>
            );
          })()}
        </div>

        {/* Row 3: Payment Outcomes by Channel + Top Provider Accounts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment Outcomes — grouped per bank / provider account */}
          {loadingOverview ? (
            <ChartSkeleton height="h-[200px]" />
          ) : (() => {
            type OutcomeRow = {
              key: string;
              kind: "bank" | "provider";
              name: string;
              sub: string;
              completed: number;
              failed: number;
              in_flight: number;
            };
            const rows: OutcomeRow[] = [];
            for (const b of overview?.by_bank || []) {
              rows.push({
                // A bank account appears once per currency, so the key (and
                // sub-label) must include currency to stay unique.
                key: `b:${b.bank_account_id}:${b.currency}`,
                kind: "bank",
                name: b.bank_name,
                sub: `${b.account_name} · ${b.currency}`,
                completed: b.accepted_count,
                failed: b.rejected_count,
                in_flight: Math.max(
                  b.sent_count - b.accepted_count - b.rejected_count,
                  0
                ),
              });
            }
            for (const a of overview?.provider_accounts || []) {
              if (
                a.period_completed_count === 0 &&
                a.period_failed_count === 0 &&
                a.period_inflight_count === 0
              ) {
                continue;
              }
              rows.push({
                key: `p:${a.account_id}:${a.currency}`,
                kind: "provider",
                name: a.account_name,
                sub: `${a.provider} · ${a.currency}`,
                completed: a.period_completed_count,
                failed: a.period_failed_count,
                in_flight: a.period_inflight_count,
              });
            }
            rows.sort(
              (x, y) =>
                y.completed + y.failed + y.in_flight -
                (x.completed + x.failed + x.in_flight)
            );

            return (
              <ContentCard noPadding>
                <ContentCardHeader>
                  <SectionTitle
                    icon={<ShieldCheck className="h-4 w-4" />}
                    title="Payment Outcomes by Channel"
                    subtitle="Done · In flight · Failed per account"
                    right={
                      <Link href="/banking/reconciliation">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-primary h-8"
                        >
                          View all
                          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    }
                  />
                </ContentCardHeader>
                <ContentCardBody>
                  {rows.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-5 w-5" />}
                      title="No activity in this period"
                      hint="Outcomes will appear here as bills move through the pipeline."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-professional">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="py-2 font-medium">Channel</th>
                            <th className="py-2 font-medium text-right">Done</th>
                            <th className="py-2 font-medium text-right">In flight</th>
                            <th className="py-2 font-medium text-right">Failed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr
                              key={r.key}
                              className="border-b border-border/40 last:border-0"
                            >
                              <td className="py-2.5">
                                <div className="font-medium text-foreground flex items-center gap-2">
                                  {r.name}
                                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1">
                                    {r.kind}
                                  </span>
                                </div>
                                {r.sub && (
                                  <div className="text-xs text-muted-foreground">
                                    {r.sub}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 text-right tabular-nums text-emerald-600">
                                {r.completed}
                              </td>
                              <td className="py-2.5 text-right tabular-nums text-amber-600">
                                {r.in_flight}
                              </td>
                              <td className="py-2.5 text-right tabular-nums text-red-600">
                                {r.failed}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </ContentCardBody>
              </ContentCard>
            );
          })()}

          {/* Recent Transactions — merged feed of payments + bank exports */}
          {loadingOverview ? (
            <ChartSkeleton height="h-[200px]" />
          ) : (() => {
            const txns = overview?.recent_transactions || [];
            const statusClass = (status: string) => {
              if (["completed", "processed"].includes(status))
                return "text-emerald-600";
              if (["failed", "rejected"].includes(status)) return "text-red-600";
              if (["processing", "uploaded", "approved"].includes(status))
                return "text-amber-600";
              return "text-muted-foreground";
            };
            return (
              <ContentCard noPadding className="h-full">
                <ContentCardHeader>
                  <SectionTitle
                    icon={<ArrowRightLeft className="h-4 w-4" />}
                    title="Recent Transactions"
                    subtitle="Latest 10 across both pipelines"
                    right={
                      <Link href="/payments">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-primary h-8"
                        >
                          View all
                          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    }
                  />
                </ContentCardHeader>
                <ContentCardBody>
                  {txns.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-5 w-5" />}
                      title="No recent transactions"
                      hint="New payments will surface here as they're created."
                    />
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {txns.map((t) => (
                        <li
                          key={`${t.kind}:${t.id}`}
                          className="py-2.5 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">
                              {t.recipient || "—"}
                              {t.kind === "bank" && t.count > 1 && (
                                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                                  · {t.count} payments
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {t.channel} ·{" "}
                              {new Date(t.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold text-foreground tabular-nums">
                              {formatCurrency(parseFloat(t.amount))}
                            </div>
                            <div
                              className={`text-xs ${statusClass(t.status)} capitalize`}
                            >
                              {t.status_label}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </ContentCardBody>
              </ContentCard>
            );
          })()}
        </div>

        {/* Row 5: Throughput trend */}
        {loadingTrends ? (
          <ChartSkeleton />
        ) : (() => {
          const data = (trends?.trends || []).map((t) => ({
            month: t.month,
            label: format(parseISO(t.month), "MMM yyyy"),
            processed: Number(t.income) || 0,
            failed: Number(t.expenses) || 0,
          }));
          return (
            <ContentCard noPadding>
              <ContentCardHeader>
                <SectionTitle
                  icon={<Activity className="h-4 w-4" />}
                  title="Centry Payments Throughput"
                  subtitle="Monthly processed vs failed amount"
                />
              </ContentCardHeader>
              <ContentCardBody>
                {data.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-5 w-5" />}
                    title="No throughput data yet"
                    hint="Trends will appear once you have a few months of activity."
                  />
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid {...GRID_STYLE} />
                        <XAxis dataKey="label" {...AXIS_STYLE} />
                        <YAxis
                          {...AXIS_STYLE}
                          tickFormatter={(v) => formatCurrencyCompact(v)}
                          width={56}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                          formatter={(v) => (
                            <span className="text-muted-foreground">{v}</span>
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="processed"
                          name="Processed"
                          stroke={CHART_COLORS.primary}
                          strokeWidth={2}
                          fill="url(#gradient-primary)"
                          activeDot={{ r: 4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="failed"
                          name="Failed"
                          stroke={CHART_COLORS.danger}
                          strokeWidth={2}
                          fill="url(#gradient-danger)"
                          activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ContentCardBody>
            </ContentCard>
          );
        })()}

        {/* Row 6: Provider Accounts */}
        {loadingOverview ? (
          <ChartSkeleton height="h-[200px]" />
        ) : (
          <ProviderAccountsCard
            accounts={overview?.provider_accounts || []}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Detailed reports — CEO pack */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            CEO reports
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/reports/throughput" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-primary/10 w-fit">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Throughput &amp; Trends
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Volume over time, MoM, by channel
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/concentration" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-[rgb(var(--warning))]/10 w-fit">
                      <ArrowRightLeft className="h-5 w-5 text-[rgb(var(--warning))]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Concentration Risk
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Top recipients, channels, top-3 share
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/liquidity" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 w-fit">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Liquidity &amp; Balances
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cash across provider accounts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/approval-cycle" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-primary/10 w-fit">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Approval Cycle
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bottlenecks, time-to-pay, slowest approvers
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>
          </div>
        </div>

        {/* Detailed reports — Accountant pack */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Accountant reports
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Link href="/reports/settlement" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-primary/10 w-fit">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Daily Settlement
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Per-account daily volume, fees, net debited
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/unreconciled" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-[rgb(var(--warning))]/10 w-fit">
                      <FileX className="h-5 w-5 text-[rgb(var(--warning))]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Unreconciled Register
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sent w/o response, unmatched pain.002, stuck payments
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/fees" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 w-fit">
                      <Receipt className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Fees Ledger
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gateway pass-through fees, per account &amp; effective rate
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/failures" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-red-500/10 w-fit">
                      <AlertOctagon className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Failed Payments
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Every failure with reason — provider, bank, pain.002
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>

            <Link href="/reports/audit" className="block">
              <ContentCard hover className="group cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="p-2 rounded-xl bg-violet-500/10 w-fit">
                      <ScrollText className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Audit Trail
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Every approval-bearing action · downloadable CSV
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
                </div>
              </ContentCard>
            </Link>
          </div>
        </div>

        {/* Row 7: Quick Navigation — Centry Payments actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/payments" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-primary/10 w-fit">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Payments</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Initiate and review payment requests
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
              </div>
            </ContentCard>
          </Link>

          <Link href="/banking/approvals" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 w-fit">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Approvals</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Approve pending payments
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors mt-1" />
              </div>
            </ContentCard>
          </Link>

          <Link href="/banking/provider-accounts" className="block">
            <ContentCard hover className="group cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-[rgb(var(--warning))]/10 w-fit">
                    <Wallet className="h-5 w-5 text-[rgb(var(--warning))]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Provider Accounts</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage gateway and bank credentials
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
