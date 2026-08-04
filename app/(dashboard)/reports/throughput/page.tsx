"use client";

import { useState, useEffect } from "react";
import { format, subMonths, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, Activity } from "lucide-react";
import {
  AXIS_STYLE,
  CHART_COLORS,
  ChartGradients,
  ChartTooltip,
  EmptyState,
  GRID_STYLE,
  SectionTitle,
  formatCurrencyCompact,
} from "@/components/reports/chart-theme";
import { MetricTile } from "@/components/reports/MetricTile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/reports/export/ExportButton";
import {
  useThroughputReport,
  usePipelineOverview,
} from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export default function ThroughputReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [period, setPeriod] = useState("6");
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp)
    ? orgsResp
    : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(subMonths(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  // Pull channel options from pipeline overview (bank accounts + provider accounts)
  const { data: overview } = usePipelineOverview(organizationId, startDate, endDate);
  // by_bank is split per currency, so dedupe bank accounts by id to avoid
  // duplicate option keys (e.g. bank:2 for both the UGX and USD rows).
  const bankOptions = Array.from(
    new Map(
      (overview?.by_bank || []).map((b) => [
        b.bank_account_id,
        {
          value: `bank:${b.bank_account_id}`,
          label: `Bank · ${b.bank_name}${b.account_name ? " · " + b.account_name : ""}`,
        },
      ])
    ).values()
  );
  const channelOptions = [
    { value: "all", label: "All channels" },
    { value: "bank", label: "Banks (all)" },
    { value: "provider", label: "Provider accounts (all)" },
    ...bankOptions,
    ...((overview?.provider_accounts || []).map((a) => ({
      value: `provider:${a.account_id}`,
      label: `Provider · ${a.account_name} (${a.provider})`,
    }))),
  ];

  const { data, isLoading } = useThroughputReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    granularity,
    channel,
    status,
  });

  const currentAmount = parseFloat(data?.totals.amount || "0");
  const prevAmount = parseFloat(data?.totals.prev_amount || "0");
  const momPct: number | null = data?.totals.mom_pct ?? null;

  const series = (data?.series || []).map((s) => ({
    ...s,
    label:
      granularity === "month"
        ? format(parseISO(s.bucket), "MMM yyyy")
        : granularity === "week"
        ? format(parseISO(s.bucket), "MMM d")
        : format(parseISO(s.bucket), "MMM d"),
    bank: parseFloat(s.bank_amount),
    provider: parseFloat(s.provider_amount),
    total: parseFloat(s.total_amount),
  }));

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Throughput & Trends"
        subtitle="How much Paymoja has processed over time"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Throughput" }]}
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
        <ChartGradients />
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Granularity</label>
              <Select
                value={granularity}
                onValueChange={(v) => setGranularity(v as any)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Channel</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed only</SelectItem>
                  <SelectItem value="in_flight">In flight</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ContentCard>

        {/* Stat row */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <div className="h-28 rounded-xl border bg-card p-4"><Skeleton className="h-full w-full" /></div>
              <div className="h-28 rounded-xl border bg-card p-4"><Skeleton className="h-full w-full" /></div>
              <div className="h-28 rounded-xl border bg-card p-4"><Skeleton className="h-full w-full" /></div>
            </>
          ) : (
            <>
              <MetricTile
                label="This period"
                value={formatCurrencyCompact(currentAmount)}
                icon={TrendingUp}
                tone="accent"
                hint={`${series.reduce((s, x) => s + x.total_count, 0)} payments`}
                trend={momPct !== null ? { value: momPct, positiveIsGood: true } : undefined}
                sparkline={series.map((s) => s.total)}
                sparklineKind="area"
              />
              <MetricTile
                label="Prior equivalent period"
                value={formatCurrencyCompact(prevAmount)}
                hint="Same length, immediately before"
              />
              <MetricTile
                label="Change vs prior"
                value={momPct === null ? "—" : `${momPct > 0 ? "+" : ""}${momPct}%`}
                icon={momPct !== null && momPct < 0 ? TrendingDown : TrendingUp}
                tone={
                  momPct === null
                    ? "default"
                    : momPct >= 0
                    ? "success"
                    : "danger"
                }
                hint="Period-over-period"
              />
            </>
          )}
        </div>

        {/* Chart */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <SectionTitle
              icon={<Activity className="h-4 w-4" />}
              title={`Throughput by ${granularity}`}
              subtitle="Bank vs provider stacked, with total line"
            />
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : series.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="No throughput in this window"
                hint="Adjust the period or filters to see data."
              />
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    <Bar
                      dataKey="bank"
                      name="Bank (SFTP)"
                      stackId="a"
                      fill="url(#bar-info)"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="provider"
                      name="Provider accounts"
                      stackId="a"
                      fill="url(#bar-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={CHART_COLORS.warning}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </ContentCardBody>
        </ContentCard>

        {/* Detail table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">Detail</h3>
          </ContentCardHeader>
          <ContentCardBody>
            {series.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No data</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-professional">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Period</th>
                      <th className="py-2 font-medium text-right">Bank #</th>
                      <th className="py-2 font-medium text-right">Bank amount</th>
                      <th className="py-2 font-medium text-right">Provider #</th>
                      <th className="py-2 font-medium text-right">Provider amount</th>
                      <th className="py-2 font-medium text-right">Total amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((s) => (
                      <tr key={s.bucket} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5 text-foreground">{s.label}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.bank_count}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(s.bank)}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.provider_count}</td>
                        <td className="py-2.5 text-right tabular-nums">{formatCurrency(s.provider)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {formatCurrency(s.total)}
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
