"use client";

/**
 * Settlement — per day, per account: payments processed, fees and net debited.
 * Built on the shared report scaffold; data comes from useSettlementReport.
 */

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Landmark, Receipt, Scale, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart } from "@/components/reports/charts/ReportCharts";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import { useSettlementReport } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";

type AccountKind = "all" | "provider" | "bank";

/** Plain number for `.cell-amount`; the currency code sits in its own `.cell-currency` cell. */
const amount = (v: string | number) =>
  Number(v || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

const day = (iso: string, pattern = "dd MMM yyyy") => {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? iso : format(d, pattern);
};

export default function SettlementReportPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("30d");
  const [accountKind, setAccountKind] = useState<AccountKind>("all");
  const [currency, setCurrency] = useState("");

  const organizationId = org.organizationId || undefined;
  const { data, isLoading } = useSettlementReport(organizationId, {
    start_date: period.startDate,
    end_date: period.endDate,
    account_kind: accountKind,
    currency: currency || undefined,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const totals = data?.totals;
  const balances = data?.current_balances || [];

  // One bar per day: gross amount and fees across the selected accounts.
  const daily = useMemo(() => {
    const byDate = new Map<string, { date: string; amount: number; fees: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.date) || { date: r.date, amount: 0, fees: 0 };
      cur.amount += parseFloat(r.amount) || 0;
      cur.fees += parseFloat(r.fees) || 0;
      byDate.set(r.date, cur);
    }
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, label: day(d.date, "dd MMM") }));
  }, [rows]);

  const chartCurrency = currency || rows[0]?.currency || "UGX";

  return (
    <ReportShell
      title="Settlement"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={accountKind} onValueChange={(v) => setAccountKind(v as AccountKind)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              <SelectItem value="provider">Provider only</SelectItem>
              <SelectItem value="bank">Bank only</SelectItem>
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
              label="Payments processed"
              value={(totals?.count ?? 0).toLocaleString()}
              hint={`Across ${accountKind === "all" ? "all" : accountKind} accounts · ${period.label.toLowerCase()}`}
              icon={Receipt}
            />
            <MetricTile
              label="Gross amount"
              value={formatCurrencyCompact(parseFloat(totals?.amount || "0"), chartCurrency)}
              hint="Sum of completed payment amounts"
              icon={Landmark}
            />
            <MetricTile
              label="Estimated fees"
              value={formatCurrencyCompact(parseFloat(totals?.fees || "0"), chartCurrency)}
              hint="Gateway pass-through fees"
              icon={Scale}
            />
            <MetricTile
              label="Net debited"
              value={formatCurrencyCompact(parseFloat(totals?.net_debited || "0"), chartCurrency)}
              hint="Gross amount plus fees"
              icon={Wallet}
            />
          </ReportSummary>

          <ReportSection
            title="Daily settlement"
            subtitle="Gross amount and fees per day across the selected accounts"
            icon={<Landmark className="h-4 w-4" />}
            padded
          >
            <ReportBarChart
              data={daily}
              xKey="label"
              series={[
                { key: "amount", label: "Amount", stackId: "s" },
                { key: "fees", label: "Fees", stackId: "s" },
              ]}
              valueFormatter={(v) => formatCurrencyCompact(v, chartCurrency)}
              emptyTitle="No settlement activity in this period"
            />
          </ReportSection>

          <ReportSection title="Daily activity per account" subtitle="One row per day, per account">
            {rows.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="No settlement activity"
                description="Nothing was processed for these accounts in the selected period."
              />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Account</th>
                      <th className="text-right">Paid</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Fees</th>
                      <th className="text-right">Net debited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.date}:${r.account_id}:${i}`}>
                        <td className="cell-muted whitespace-nowrap">{day(r.date)}</td>
                        <td className="cell-primary">
                          {r.account_name}
                          <span className="cell-sub">
                            {r.account_kind === "bank" ? "Bank" : "Provider"}
                            {r.provider ? ` · ${r.provider}` : ""}
                          </span>
                        </td>
                        <td className="cell-amount">{r.count.toLocaleString()}</td>
                        <td className="cell-currency">{r.currency}</td>
                        <td className="cell-amount">{amount(r.amount)}</td>
                        <td className="cell-amount cell-muted">{parseFloat(r.fees) > 0 ? amount(r.fees) : "—"}</td>
                        <td className="cell-amount">{amount(r.net_debited)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          {balances.length > 0 && (
            <ReportSection title="Current provider balances" subtitle="Snapshot at the last balance sync">
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Last synced</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b) => (
                      <tr key={b.account_id}>
                        <td className="cell-primary">{b.account_name}</td>
                        <td className="cell-muted whitespace-nowrap">
                          {b.synced_at ? (
                            <>
                              {format(new Date(b.synced_at), "dd MMM yyyy")}
                              <span className="cell-sub">{format(new Date(b.synced_at), "HH:mm")}</span>
                            </>
                          ) : (
                            "Never"
                          )}
                        </td>
                        <td className="cell-currency">{b.currency}</td>
                        <td className="cell-amount">{amount(b.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>
          )}
        </>
      )}
    </ReportShell>
  );
}
