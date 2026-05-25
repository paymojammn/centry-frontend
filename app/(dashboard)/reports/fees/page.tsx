"use client";

import { useState, useEffect } from "react";
import { format, subDays, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Calendar, Receipt, Percent } from "lucide-react";
import {
  AXIS_STYLE,
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
import { useFeesLedgerReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export default function FeesLedgerReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState("30");
  const [status, setStatus] = useState<"completed" | "all">("completed");
  const [accountId, setAccountId] = useState("all");

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

  const { data, isLoading } = useFeesLedgerReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    status,
    account_id: accountId === "all" ? undefined : accountId,
  });

  const accounts = data?.accounts || [];
  const daily = (data?.daily || []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), "MMM d"),
    amount: parseFloat(d.amount),
    estimated_fee: parseFloat(d.estimated_fee),
  }));

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Fees Ledger"
        subtitle="Gateway pass-through fees by provider account"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Fees" }]}
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
        <ChartGradients />
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed only</SelectItem>
                  <SelectItem value="all">All (incl. pending)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Provider account</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.account_id} value={a.account_id}>
                      {a.account_name} ({a.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ContentCard>

        {/* Totals */}
        <div className="grid gap-5 md:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <MetricTile
                label="Total volume"
                value={formatCurrencyCompact(parseFloat(data?.totals.amount || "0"))}
                icon={Receipt}
                hint="Gross processed"
                sparkline={daily.map((d) => d.amount)}
                sparklineKind="area"
              />
              <MetricTile
                label="Total fees"
                value={formatCurrencyCompact(parseFloat(data?.totals.fees || "0"))}
                icon={Receipt}
                tone="accent"
                hint="Estimated pass-through"
                sparkline={daily.map((d) => d.estimated_fee)}
                sparklineKind="area"
              />
              <MetricTile
                label="Effective rate"
                value={`${data?.totals.effective_rate_pct ?? 0}%`}
                icon={Percent}
                hint="Fees ÷ volume"
              />
            </>
          )}
        </div>

        {/* Daily chart */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <SectionTitle
              icon={<Receipt className="h-4 w-4" />}
              title="Daily volume vs estimated fee"
              subtitle="Bar pairs by day in the selected window"
            />
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[260px]" />
            ) : daily.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-5 w-5" />}
                title="No fee data"
                hint="Pick a wider period or check that the selected account has activity."
              />
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                      dataKey="amount"
                      name="Volume"
                      fill="url(#bar-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="estimated_fee"
                      name="Est. fees"
                      fill="url(#bar-info)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ContentCardBody>
        </ContentCard>

        {/* Per-account table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Per-account ledger
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[200px]" />
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No accounts</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium text-right">#</th>
                      <th className="py-2 font-medium text-right">Volume</th>
                      <th className="py-2 font-medium text-right">Fee config</th>
                      <th className="py-2 font-medium text-right">Fees</th>
                      <th className="py-2 font-medium text-right">Eff. rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.account_id} className="border-b border-border/40 last:border-0">
                        <td className="py-2.5">
                          <div className="font-medium text-foreground">{a.account_name}</div>
                          <div className="text-xs text-muted-foreground">{a.provider}</div>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{a.count}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatCurrency(parseFloat(a.amount))}
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground tabular-nums">
                          {a.fee_percentage}% + {a.fee_fixed}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {formatCurrency(parseFloat(a.fees))}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {a.effective_rate_pct}%
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
