"use client";

import { useState, useEffect } from "react";
import { Wallet, AlertCircle } from "lucide-react";
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
import { useLiquidityReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number, currency: string = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

function formatRelative(ts: string | null): string {
  if (!ts) return "never";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function LiquidityReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"all" | "sandbox" | "production">("all");
  const [activeOnly, setActiveOnly] = useState("true");
  const [currency, setCurrency] = useState("all");

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp) ? orgsResp : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;

  const { data, isLoading } = useLiquidityReport(organizationId, {
    currency: currency === "all" ? undefined : currency,
    environment,
    active_only: activeOnly === "true",
  });

  const accounts = data?.accounts || [];
  const totals = data?.totals_by_currency || [];
  const distinctCurrencies = Array.from(
    new Set(accounts.map((a) => a.currency).filter(Boolean))
  );
  const staleThresholdHours = 24;
  const staleCount = accounts.filter((a) => {
    if (!a.balance_synced_at) return true;
    const ageHrs = (Date.now() - new Date(a.balance_synced_at).getTime()) / 3_600_000;
    return ageHrs > staleThresholdHours;
  }).length;

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Liquidity & Balances"
        subtitle="Cash available across provider accounts"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Liquidity" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <div className="px-6 py-8 space-y-6">
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Environment</label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={activeOnly} onValueChange={setActiveOnly}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active only</SelectItem>
                  <SelectItem value="false">All (incl. inactive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {distinctCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ContentCard>

        {/* Totals by currency */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              {totals.map((t) => (
                <StatCard
                  key={t.currency}
                  label={`Total ${t.currency}`}
                  value={formatCurrency(parseFloat(t.amount), t.currency)}
                  icon={Wallet}
                  variant="accent"
                  subtext={`${accounts.filter((a) => a.currency === t.currency).length} accounts`}
                />
              ))}
              <StatCard
                label="Stale balances"
                value={staleCount}
                icon={AlertCircle}
                variant={staleCount > 0 ? "warning" : "default"}
                subtext={`Not synced in 24h+ (of ${accounts.length})`}
              />
            </>
          )}
        </div>

        {/* Accounts table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Provider accounts
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No accounts match the current filters
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium">Provider</th>
                      <th className="py-2 font-medium">Env</th>
                      <th className="py-2 font-medium text-right">Balance</th>
                      <th className="py-2 font-medium text-right">Synced</th>
                      <th className="py-2 font-medium text-right">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr
                        key={a.account_id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2.5">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {a.name}
                            {a.is_default && (
                              <span className="text-[10px] uppercase tracking-wide text-primary border border-primary/30 rounded px-1">
                                default
                              </span>
                            )}
                            {!a.is_active && (
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1">
                                inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-foreground">{a.provider}</td>
                        <td className="py-2.5 text-xs uppercase text-muted-foreground">{a.environment}</td>
                        <td className="py-2.5 text-right tabular-nums text-foreground">
                          {a.currency} {formatCurrency(parseFloat(a.balance), a.currency || "UGX")}
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground">
                          {formatRelative(a.balance_synced_at)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground">
                          {parseFloat(a.fee_percentage) > 0 || parseFloat(a.fee_fixed) > 0
                            ? `${a.fee_percentage}% + ${a.fee_fixed}`
                            : "—"}
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
