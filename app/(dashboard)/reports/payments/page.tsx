"use client";

/**
 * Payments — one report for how much was processed, where it went and what
 * it cost. Combines the former Throughput (trend, bank vs provider, vs prior
 * period), Settlement (per-account processed / fees / net debited), Fees
 * (volume, estimated fees, effective rate) and Concentration (share of value
 * by recipient) reports on the shared scaffold.
 */

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Activity, Coins, Hash, Landmark, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/layout";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportRow, ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart } from "@/components/reports/charts/ReportCharts";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { formatCurrencyCompact, formatCurrencyFull } from "@/components/reports/chart-theme";
import {
  useConcentrationReport,
  useFeesLedgerReport,
  usePipelineOverview,
  useSettlementReport,
  useThroughputReport,
} from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type Granularity = "day" | "week" | "month";

/** Recipients shown in the ranked table. */
const TOP_RECIPIENTS = 10;

/** Plain number for `.cell-amount`; the currency code sits in its own `.cell-currency` cell. */
const amount = (v: string | number) => Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

interface AccountAggregate {
  key: string;
  account_name: string;
  account_kind: "provider" | "bank";
  provider: string;
  currency: string;
  count: number;
  amount: number;
  fees: number;
  net_debited: number;
}

export default function PaymentsReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [channel, setChannel] = useState("all");
  const [currency, setCurrency] = useState("");

  const organizationId = org.organizationId || undefined;

  // Channel options come from the pipeline overview (bank + provider accounts).
  // by_bank is split per currency, so dedupe bank accounts by id to avoid
  // duplicate option keys (e.g. bank:2 for both the UGX and USD rows).
  const { data: overview } = usePipelineOverview(organizationId, period.startDate, period.endDate);
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
    ...(overview?.provider_accounts || []).map((a) => ({
      value: `provider:${a.account_id}`,
      label: `Provider · ${a.account_name} (${a.provider})`,
    })),
  ];

  const { data: throughput, isLoading: loadingThroughput } = useThroughputReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    granularity,
    channel,
    status: "all",
  });
  const { data: settlement, isLoading: loadingSettlement } = useSettlementReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    account_kind: "all",
    currency: currency || undefined,
  });
  const { data: fees, isLoading: loadingFees } = useFeesLedgerReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    status: "completed",
    account_id: undefined,
  });
  const { data: concentration, isLoading: loadingConcentration } = useConcentrationReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    dimension: "recipient",
    top_n: TOP_RECIPIENTS,
    include_bulk: true,
  });
  const isLoading = loadingThroughput || loadingSettlement || loadingFees || loadingConcentration;

  // Throughput: trend over time, bank vs provider, vs the prior period.
  const currentAmount = parseFloat(throughput?.totals.amount || "0");
  const prevAmount = parseFloat(throughput?.totals.prev_amount || "0");
  const momPct: number | null = throughput?.totals.mom_pct ?? null;
  const series = (throughput?.series || []).map((s) => {
    const d = parseISO(s.bucket);
    return {
      ...s,
      label: granularity === "month" ? format(d, "MMM yyyy") : format(d, "dd MMM"),
      bank: parseFloat(s.bank_amount) || 0,
      provider: parseFloat(s.provider_amount) || 0,
      total: parseFloat(s.total_amount) || 0,
    };
  });
  const paymentCount = series.reduce((sum, s) => sum + s.total_count, 0);

  // Fees ledger: estimated pass-through fees and the effective rate.
  const totalFees = parseFloat(fees?.totals.fees || "0");
  const effectiveRate = fees?.totals.effective_rate_pct ?? 0;
  const feeAccounts = fees?.accounts || [];

  // Settlement: collapse per-day rows into one row per account (per currency)
  // for the period, largest first.
  const settlementRows = useMemo(() => settlement?.rows || [], [settlement]);
  const accounts = useMemo<AccountAggregate[]>(() => {
    const byAccount = new Map<string, AccountAggregate>();
    for (const r of settlementRows) {
      const key = `${r.account_id}:${r.currency}`;
      const cur = byAccount.get(key) || {
        key,
        account_name: r.account_name,
        account_kind: r.account_kind,
        provider: r.provider,
        currency: r.currency,
        count: 0,
        amount: 0,
        fees: 0,
        net_debited: 0,
      };
      cur.count += r.count;
      cur.amount += parseFloat(r.amount) || 0;
      cur.fees += parseFloat(r.fees) || 0;
      cur.net_debited += parseFloat(r.net_debited) || 0;
      byAccount.set(key, cur);
    }
    return Array.from(byAccount.values()).sort((a, b) => b.amount - a.amount);
  }, [settlementRows]);

  // Concentration: share of completed value by recipient.
  const recipients = (concentration?.entries || []).slice(0, TOP_RECIPIENTS);

  return (
    <ReportShell
      title="Payments"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-9 w-[240px]">
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
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="Ccy"
            maxLength={3}
            aria-label="Currency"
            className="h-9 w-24"
          />
        </>
      }
      actions={
        organizationId && (
          <ExportButton organizationId={organizationId} reportType="pipeline" startDate={period.startDate} endDate={period.endDate} />
        )
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Processed"
              value={formatCurrencyCompact(currentAmount)}
              hint={`${paymentCount.toLocaleString()} payments · ${period.label.toLowerCase()}`}
              icon={TrendingUp}
              sparkline={series.length >= 2 ? series.map((s) => s.total) : undefined}
            />
            <MetricTile
              label="Change vs prior period"
              value={momPct === null ? "—" : `${momPct > 0 ? "+" : ""}${momPct}%`}
              hint={`Prior ${period.days} days · ${formatCurrencyCompact(prevAmount)}`}
              icon={momPct !== null && momPct < 0 ? TrendingDown : TrendingUp}
              tone={momPct === null || momPct === 0 ? "default" : momPct > 0 ? "success" : "danger"}
            />
            <MetricTile
              label="Estimated fees"
              value={formatCurrencyCompact(totalFees)}
              hint={`${effectiveRate}% effective rate`}
              icon={Coins}
            />
            <MetricTile
              label="Payments"
              value={paymentCount.toLocaleString()}
              hint={`${Math.round(paymentCount / period.days).toLocaleString()} per day on average`}
              icon={Hash}
            />
          </ReportSummary>

          <ReportSection
            title="Volume over time"
            subtitle="Bank and provider rails stacked; the bar height is the total"
            icon={<Activity className="h-4 w-4" />}
            padded
            right={
              <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <ReportBarChart
              data={series}
              xKey="label"
              height={320}
              series={[
                { key: "bank", label: "Bank (SFTP)", stackId: "rail" },
                { key: "provider", label: "Provider accounts", stackId: "rail" },
              ]}
              emptyTitle="No payments in this period"
              emptyHint="Adjust the period or filters to see data."
            />
          </ReportSection>

          <ReportSection title="By account" subtitle="Processed, estimated fees and net debited per account for the period" icon={<Landmark className="h-4 w-4" />}>
            {accounts.length === 0 ? (
              <EmptyState icon={Landmark} title="No settlement activity" description="Nothing was processed for these accounts in the selected period." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th className="text-right">Payments</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Est. fees</th>
                      <th className="text-right">Net debited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.key}>
                        <td className="cell-primary">
                          {a.account_name}
                          <span className="cell-sub">
                            {a.account_kind === "bank" ? "Bank" : "Provider"}
                            {a.provider ? ` · ${a.provider}` : ""}
                          </span>
                        </td>
                        <td className="cell-amount">{a.count.toLocaleString()}</td>
                        <td className="cell-currency">{a.currency}</td>
                        <td className="cell-amount">{amount(a.amount)}</td>
                        <td className="cell-amount cell-muted">{a.fees > 0 ? amount(a.fees) : "—"}</td>
                        <td className="cell-amount">{amount(a.net_debited)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          <ReportRow>
            <ReportSection title="Top recipients" subtitle={`Top ${TOP_RECIPIENTS} by completed value, largest first`} icon={<Users className="h-4 w-4" />}>
              {recipients.length === 0 ? (
                <EmptyState icon={Users} title="No completed payments" description="Nothing completed in this period to break down." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th className="text-right">#</th>
                        <th>Recipient</th>
                        <th className="text-right">Payments</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipients.map((e, i) => (
                        <tr key={`${e.label}-${i}`}>
                          <td className="cell-muted text-right">{i + 1}</td>
                          <td className="cell-primary truncate max-w-[260px]">
                            {e.label}
                            {e.sub && <span className="cell-sub">{e.sub}</span>}
                          </td>
                          <td className="cell-amount">{e.count.toLocaleString()}</td>
                          <td className="cell-amount">{formatCurrencyFull(parseFloat(e.amount))}</td>
                          <td className="cell-amount">{e.share}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            <ReportSection title="Fees by account" subtitle="Volume, estimated fees and effective rate per provider account" icon={<Coins className="h-4 w-4" />}>
              {feeAccounts.length === 0 ? (
                <EmptyState icon={Coins} title="No fee data" description="No provider account had completed activity in this period." />
              ) : (
                <div className="table-scroll-container">
                  <table className="table-professional">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th className="text-right">Volume</th>
                        <th className="text-right">Fees</th>
                        <th className="text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeAccounts.map((a) => (
                        <tr key={a.account_id}>
                          <td className="cell-primary">
                            {a.account_name}
                            <span className="cell-sub">{a.provider}</span>
                          </td>
                          <td className="cell-amount">{formatCurrencyFull(parseFloat(a.amount))}</td>
                          <td className="cell-amount">{formatCurrencyFull(parseFloat(a.fees))}</td>
                          <td className="cell-amount">{a.effective_rate_pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          </ReportRow>
        </>
      )}
    </ReportShell>
  );
}
