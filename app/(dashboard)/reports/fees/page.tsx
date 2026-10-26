"use client";

/**
 * Fees report — gateway pass-through fees by provider account over a period.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Coins, Hash, Percent, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart } from "@/components/reports/charts/ReportCharts";
import { formatCurrencyCompact, formatCurrencyFull } from "@/components/reports/chart-theme";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { useFeesLedgerReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

export default function FeesReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const organizationId = org.organizationId || undefined;

  const [status, setStatus] = useState<"completed" | "all">("completed");
  const [accountId, setAccountId] = useState("all");

  const { data, isLoading } = useFeesLedgerReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    status,
    account_id: accountId === "all" ? undefined : accountId,
  });

  const accounts = data?.accounts || [];
  const daily = (data?.daily || []).map((d) => ({
    label: format(parseISO(d.date), "dd MMM"),
    count: d.count,
    amount: parseFloat(d.amount),
    estimated_fee: parseFloat(d.estimated_fee),
  }));
  const totalAmount = parseFloat(data?.totals.amount || "0");
  const totalFees = parseFloat(data?.totals.fees || "0");
  const txCount = daily.reduce((s, d) => s + d.count, 0);

  const filters = (
    <>
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="completed">Completed only</SelectItem>
          <SelectItem value="all">All (incl. pending)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={accountId} onValueChange={setAccountId}>
        <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.account_id} value={a.account_id}>
              {a.account_name} ({a.provider})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <ReportShell
      title="Fees"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={filters}
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Volume"
              value={formatCurrencyCompact(totalAmount)}
              hint={`Gross processed · ${period.label.toLowerCase()}`}
              icon={Receipt}
              sparkline={daily.length >= 2 ? daily.map((d) => d.amount) : undefined}
            />
            <MetricTile
              label="Fees"
              value={formatCurrencyCompact(totalFees)}
              hint="Estimated pass-through"
              icon={Coins}
              sparkline={daily.length >= 2 ? daily.map((d) => d.estimated_fee) : undefined}
            />
            <MetricTile
              label="Effective rate"
              value={`${data?.totals.effective_rate_pct ?? 0}%`}
              hint="Fees ÷ volume"
              icon={Percent}
            />
            <MetricTile
              label="Transactions"
              value={txCount.toLocaleString()}
              hint={status === "completed" ? "Completed payments" : "Including pending"}
              icon={Hash}
            />
          </ReportSummary>

          <ReportSection
            title="Daily volume vs estimated fee"
            subtitle="Per day in the selected period"
            icon={<Coins className="h-4 w-4" />}
            padded
          >
            <ReportBarChart
              data={daily}
              xKey="label"
              series={[
                { key: "amount", label: "Volume" },
                { key: "estimated_fee", label: "Est. fees" },
              ]}
              emptyTitle="No fee data"
              emptyHint="Pick a wider period or check that the selected account has activity."
            />
          </ReportSection>

          <ReportSection title="Per-account ledger" subtitle="Volume, configured fee and estimated fees per provider account">
            {accounts.length === 0 ? (
              <EmptyState icon={Coins} title="No accounts" description="No provider account had activity in this period." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th className="text-right">Payments</th>
                      <th className="text-right">Volume</th>
                      <th className="text-right">Fee config</th>
                      <th className="text-right">Fees</th>
                      <th className="text-right">Eff. rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.account_id}>
                        <td className="cell-primary">
                          {a.account_name}
                          <span className="cell-sub">{a.provider}</span>
                        </td>
                        <td className="cell-amount">{a.count.toLocaleString()}</td>
                        <td className="cell-amount">{formatCurrencyFull(parseFloat(a.amount))}</td>
                        <td className="cell-amount cell-muted">{a.fee_percentage}% + {a.fee_fixed}</td>
                        <td className="cell-amount">{formatCurrencyFull(parseFloat(a.fees))}</td>
                        <td className="cell-amount">{a.effective_rate_pct}%</td>
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
