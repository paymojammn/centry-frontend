"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

import { ContentCard } from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useERPConnections } from "@/hooks/use-erp";
import { useLoanStats, useLoans, useSyncLoans } from "@/hooks/use-lending";
import { useOrganizations } from "@/hooks/use-organization";
import { formatCurrency } from "@/lib/utils";
import type { Loan } from "@/types/lending";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  Disbursed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  "Partially Disbursed": "bg-blue-500/10 text-blue-700 border-blue-500/20",
  Sanctioned: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Draft: "bg-muted text-muted-foreground border-border",
  "Loan Closure Requested": "bg-amber-500/10 text-amber-700 border-amber-500/20",
  Closed: "bg-muted text-muted-foreground border-border",
  Settled: "bg-muted text-muted-foreground border-border",
  "Written Off": "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_PILLS = [
  "all",
  "Sanctioned",
  "Partially Disbursed",
  "Disbursed",
  "Active",
  "Closed",
] as const;

export default function LendingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  // Organization selection — same pattern as /erp/bills: default to the
  // first org (the one an ERPNext sign-in just created/connected).
  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = useMemo(
    () =>
      Array.isArray(organizationsResponse)
        ? organizationsResponse
        : (organizationsResponse as { results?: { id: string; name: string }[] })?.results || [],
    [organizationsResponse]
  );

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Resolve the selected org's active ERP connection (drives the Sync button).
  const { data: erpConnectionsResponse } = useERPConnections();
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as unknown as { results?: unknown[] })?.results || [];
  const activeConnection = (erpConnections as {
    id: string;
    is_active: boolean;
    organization?: { id: string };
  }[]).find((conn) => conn.organization?.id === selectedOrganizationId && conn.is_active);
  const activeConnectionId = activeConnection?.id || null;

  const { data: loans = [], isLoading } = useLoans(
    selectedOrganizationId ? { organization: selectedOrganizationId } : undefined
  );
  const { data: stats } = useLoanStats(selectedOrganizationId || undefined);
  const { mutate: syncLoans, isPending: isSyncing } = useSyncLoans();

  // Pick the loan book up right after an ERPNext sign-in: when the org has an
  // active connection but no loans mirrored yet, trigger one sync automatically.
  const autoSynced = useRef(false);
  useEffect(() => {
    if (autoSynced.current) return;
    if (!activeConnectionId || isLoading || loans.length > 0) return;
    autoSynced.current = true;
    syncLoans(activeConnectionId);
  }, [activeConnectionId, isLoading, loans.length, syncLoans]);

  const searchLower = search.trim().toLowerCase();
  const filteredLoans = loans.filter((loan) => {
    if (statusFilter !== "all" && loan.status !== statusFilter) return false;
    if (searchLower) {
      const hay = [loan.erpnext_name, loan.applicant_name, loan.applicant, loan.loan_product]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  const statusCount = (status: string) =>
    status === "all" ? loans.length : loans.filter((l) => l.status === status).length;

  const currency = loans[0]?.currency || "UGX";

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Loan Book"
        subtitle="Loans synced from your ERP"
        breadcrumbs={[{ label: "Lending" }, { label: "Loans" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/lending/collections">Collections due</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeConnectionId && syncLoans(activeConnectionId)}
            disabled={isSyncing || !activeConnectionId}
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 py-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard
            label="Loans"
            value={stats?.total ?? loans.length}
            icon={Banknote}
            variant="accent"
          />
          <StatCard
            label="Open"
            value={stats?.open ?? "—"}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            label="Outstanding"
            value={
              stats ? formatCurrency(parseFloat(stats.outstanding_amount) || 0, currency) : "—"
            }
            icon={Wallet}
            variant="info"
          />
          <StatCard
            label="Due today"
            value={stats ? formatCurrency(parseFloat(stats.due_today) || 0, currency) : "—"}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        <ContentCard noPadding>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {STATUS_PILLS.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                    active
                      ? "bg-foreground text-card"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status === "all" ? "All" : status} ({statusCount(status)})
                </button>
              );
            })}
            <div className="ml-auto relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search loans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                <Banknote className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {isSyncing ? "Syncing loan book from your ERP..." : "No loans found"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isSyncing
                  ? "This runs automatically after an ERPNext sign-in."
                  : activeConnectionId
                    ? "No loans in the connected ERP yet — use Sync to refresh."
                    : "Connect ERPNext for this organization to mirror its loan book."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <div className="col-span-2">Loan</div>
                <div className="col-span-3">Applicant</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-right">Outstanding</div>
                <div className="col-span-1">Next due</div>
                <div className="col-span-2">Status</div>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredLoans.map((loan: Loan) => (
                  <Link
                    key={loan.id}
                    href={`/lending/loans/${loan.id}`}
                    className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="text-foreground truncate">{loan.erpnext_name}</p>
                      {loan.loan_product && (
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {loan.loan_product}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-foreground truncate">
                        {loan.applicant_name || loan.applicant || "—"}
                      </p>
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-foreground">
                      {formatCurrency(parseFloat(loan.loan_amount) || 0, loan.currency)}
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-foreground">
                      {formatCurrency(parseFloat(loan.outstanding_amount) || 0, loan.currency)}
                    </div>
                    <div className="col-span-1 text-muted-foreground tabular-nums">
                      {loan.next_due_date
                        ? format(new Date(loan.next_due_date), "dd MMM")
                        : "—"}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`status-pill ${
                          STATUS_STYLES[loan.status] ||
                          "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
