"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Calendar, Landmark, Wallet, Receipt } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { useSettlementReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number, currency: string = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export default function SettlementReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState("30");
  const [accountKind, setAccountKind] = useState<"all" | "provider" | "bank">("all");
  const [currency, setCurrency] = useState("");

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

  const { data, isLoading } = useSettlementReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    account_kind: accountKind,
    currency: currency || undefined,
  });

  const rows = data?.rows || [];
  const totals = data?.totals;

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Daily Settlement"
        subtitle="Per-day, per-account payments processed, fees, and net debited"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Settlement" }]}
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
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Account kind</label>
              <Select value={accountKind} onValueChange={(v) => setAccountKind(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="provider">Provider only</SelectItem>
                  <SelectItem value="bank">Bank only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="e.g. UGX"
                maxLength={3}
                className="w-[120px]"
              />
            </div>
          </div>
        </ContentCard>

        {/* Totals */}
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
              <StatCard
                label="Payments processed"
                value={totals?.count ?? 0}
                icon={Receipt}
                variant="accent"
                subtext="Across all accounts in period"
              />
              <StatCard
                label="Gross amount"
                value={formatCurrency(parseFloat(totals?.amount || "0"))}
                icon={Landmark}
                subtext="Sum of completed amounts"
              />
              <StatCard
                label="Estimated fees"
                value={formatCurrency(parseFloat(totals?.fees || "0"))}
                subtext="Gateway pass-through fees"
              />
              <StatCard
                label="Net debited"
                value={formatCurrency(parseFloat(totals?.net_debited || "0"))}
                icon={Wallet}
                subtext="Gross + fees"
              />
            </>
          )}
        </div>

        {/* Daily table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <h3 className="text-sm font-semibold text-foreground">
              Daily activity per account
            </h3>
          </ContentCardHeader>
          <ContentCardBody>
            {isLoading ? (
              <Skeleton className="h-[280px]" />
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No settlement activity in this window
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-professional">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Account</th>
                      <th className="py-2 font-medium">Cur</th>
                      <th className="py-2 font-medium text-right"># Paid</th>
                      <th className="py-2 font-medium text-right">Amount</th>
                      <th className="py-2 font-medium text-right">Fees</th>
                      <th className="py-2 font-medium text-right">Net debited</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={`${r.date}:${r.account_id}:${i}`}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2.5 text-foreground tabular-nums">{r.date}</td>
                        <td className="py-2.5">
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {r.account_name}
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1">
                              {r.account_kind}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{r.provider}</div>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">{r.currency}</td>
                        <td className="py-2.5 text-right tabular-nums">{r.count}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {formatCurrency(parseFloat(r.amount), r.currency || "UGX")}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {parseFloat(r.fees) > 0
                            ? formatCurrency(parseFloat(r.fees), r.currency || "UGX")
                            : "—"}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-foreground">
                          {formatCurrency(parseFloat(r.net_debited), r.currency || "UGX")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCardBody>
        </ContentCard>

        {/* Current balances snapshot */}
        {data && data.current_balances.length > 0 && (
          <ContentCard noPadding>
            <ContentCardHeader>
              <h3 className="text-sm font-semibold text-foreground">
                Current provider balances (snapshot)
              </h3>
            </ContentCardHeader>
            <ContentCardBody>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {data.current_balances.map((b) => (
                  <div
                    key={b.account_id}
                    className="border border-border rounded-lg p-3 flex justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-foreground">{b.account_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Synced {b.synced_at
                          ? new Date(b.synced_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "never"}
                      </div>
                    </div>
                    <div className="text-right tabular-nums text-foreground font-semibold">
                      {b.currency} {formatCurrency(parseFloat(b.balance), b.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </ContentCardBody>
          </ContentCard>
        )}
      </div>
    </div>
  );
}
