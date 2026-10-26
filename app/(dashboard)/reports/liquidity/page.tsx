"use client";

/**
 * Liquidity report — cash available across provider accounts right now.
 * No time dimension: the balances are whatever the last sync returned.
 */

import { useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Landmark, Wallet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { formatCurrencyCompact, formatCurrencyFull } from "@/components/reports/chart-theme";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { useLiquidityReport } from "@/hooks/use-reports";
import { useReportOrganization } from "@/hooks/use-report-context";

const STALE_AFTER_HOURS = 24;

function hoursSince(ts: string | null): number | null {
  if (!ts) return null;
  const t = new Date(ts).getTime();
  return isNaN(t) ? null : (Date.now() - t) / 3_600_000;
}

/** "just now" / "12m ago" / "3h ago" / "2d ago"; "never" when there is no sync. */
function formatRelative(ts: string | null): string {
  const hrs = hoursSince(ts);
  if (hrs === null) return ts ? "—" : "never";
  const mins = Math.round(hrs * 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function LiquidityReportPage() {
  const org = useReportOrganization();
  const organizationId = org.organizationId || undefined;

  const [environment, setEnvironment] = useState<"all" | "sandbox" | "production">("all");
  const [activeOnly, setActiveOnly] = useState("true");
  const [currency, setCurrency] = useState("all");

  const { data, isLoading } = useLiquidityReport(organizationId, {
    currency: currency === "all" ? undefined : currency,
    environment,
    active_only: activeOnly === "true",
  });

  const accounts = data?.accounts || [];
  const totals = data?.totals_by_currency || [];
  const distinctCurrencies = Array.from(new Set(accounts.map((a) => a.currency).filter(Boolean)));
  const isStale = (ts: string | null) => {
    const hrs = hoursSince(ts);
    return hrs === null || hrs > STALE_AFTER_HOURS;
  };
  const staleCount = accounts.filter((a) => isStale(a.balance_synced_at)).length;
  const inactiveCount = accounts.filter((a) => !a.is_active).length;

  const filters = (
    <>
      <Select value={environment} onValueChange={(v) => setEnvironment(v as typeof environment)}>
        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All environments</SelectItem>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="sandbox">Sandbox</SelectItem>
        </SelectContent>
      </Select>
      <Select value={activeOnly} onValueChange={setActiveOnly}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Active only</SelectItem>
          <SelectItem value="false">All (incl. inactive)</SelectItem>
        </SelectContent>
      </Select>
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All currencies</SelectItem>
          {distinctCurrencies.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <ReportShell
      title="Liquidity"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      filters={filters}
    >
      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            {totals.map((t) => {
              const n = accounts.filter((a) => a.currency === t.currency).length;
              return (
                <MetricTile
                  key={t.currency}
                  label={`Total ${t.currency}`}
                  value={formatCurrencyCompact(parseFloat(t.amount), t.currency)}
                  hint={`${n} ${n === 1 ? "account" : "accounts"} · ${environment === "all" ? "all environments" : environment}`}
                  icon={Wallet}
                />
              );
            })}
            <MetricTile
              label="Accounts"
              value={accounts.length.toLocaleString()}
              hint={inactiveCount > 0 ? `${inactiveCount} inactive included` : "Provider accounts in view"}
              icon={Landmark}
            />
            <MetricTile
              label="Stale balances"
              value={staleCount.toLocaleString()}
              hint={`Not synced in ${STALE_AFTER_HOURS}h+ (of ${accounts.length})`}
              icon={AlertCircle}
              tone={staleCount > 0 ? "warning" : "default"}
            />
          </ReportSummary>

          <ReportSection title="Provider accounts" subtitle="Balance at last sync, per account">
            {accounts.length === 0 ? (
              <EmptyState icon={Wallet} title="No accounts match" description="Change the environment, status or currency filters to see accounts." />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Provider</th>
                      <th>Environment</th>
                      <th className="text-right">Balance</th>
                      <th>Synced</th>
                      <th className="text-right">Fee config</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => {
                      const stale = isStale(a.balance_synced_at);
                      const hasFee = parseFloat(a.fee_percentage) > 0 || parseFloat(a.fee_fixed) > 0;
                      return (
                        <tr key={a.account_id}>
                          <td className="cell-primary">
                            <span className="flex items-center gap-2">
                              {a.name}
                              {a.is_default && (
                                <span className="status-pill min-w-0 bg-info-500/10 text-info-700 border-info-500/20">Default</span>
                              )}
                              {!a.is_active && (
                                <span className="status-pill min-w-0 bg-muted text-muted-foreground border-border">Inactive</span>
                              )}
                            </span>
                          </td>
                          <td className="cell-muted">{a.provider}</td>
                          <td className="cell-muted capitalize">{a.environment}</td>
                          <td className="cell-amount">{formatCurrencyFull(parseFloat(a.balance), a.currency || "UGX")}</td>
                          <td className={stale ? "text-warning-700 whitespace-nowrap" : "cell-muted whitespace-nowrap"}>
                            {formatRelative(a.balance_synced_at)}
                            {a.balance_synced_at && hoursSince(a.balance_synced_at) !== null && (
                              <span className="cell-sub">{format(new Date(a.balance_synced_at), "dd MMM yyyy HH:mm")}</span>
                            )}
                          </td>
                          <td className="cell-amount cell-muted">{hasFee ? `${a.fee_percentage}% + ${a.fee_fixed}` : "—"}</td>
                        </tr>
                      );
                    })}
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
