"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpFromLine,
  Banknote,
  CalendarClock,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";

import { ContentCard } from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useERPConnections } from "@/hooks/use-erp";
import { useLoanDisbursements, useSyncLoans } from "@/hooks/use-lending";
import { useOrganizations } from "@/hooks/use-organization";
import { formatCurrency } from "@/lib/utils";

// Frappe docstatus — the Loan Disbursement doc lifecycle.
const DOCSTATUS_LABELS: Record<number, string> = {
  0: "Draft",
  1: "Submitted",
  2: "Cancelled",
};

const DOCSTATUS_STYLES: Record<number, string> = {
  0: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  1: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  2: "bg-red-500/10 text-red-700 border-red-500/20",
};

export default function DisbursementsPage() {
  const [search, setSearch] = useState("");
  const [docstatusFilter, setDocstatusFilter] = useState<"all" | number>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

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
  const activeConnectionId =
    (erpConnections as { id: string; is_active: boolean; organization?: { id: string } }[]).find(
      (conn) => conn.organization?.id === selectedOrganizationId && conn.is_active
    )?.id || null;

  const { mutate: syncLoans, isPending: isSyncing } = useSyncLoans();
  const { data: disbursements = [], isLoading } = useLoanDisbursements(
    undefined,
    selectedOrganizationId || undefined
  );

  const searchLower = search.trim().toLowerCase();
  const filtered = disbursements.filter((d) => {
    if (docstatusFilter !== "all" && d.docstatus !== docstatusFilter) return false;
    if (startDate && d.disbursement_date < startDate) return false;
    if (endDate && d.disbursement_date > endDate) return false;
    if (searchLower) {
      const hay = [d.erpnext_name, d.against_loan, d.applicant_name, d.reference_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  const currency = disbursements[0]?.currency || "UGX";
  const sum = (list: typeof disbursements) =>
    list.reduce((s, d) => s + (parseFloat(d.disbursed_amount) || 0), 0);
  const submitted = disbursements.filter((d) => d.docstatus === 1);
  const drafts = disbursements.filter((d) => d.docstatus === 0);
  const monthStart = format(new Date(), "yyyy-MM-01");
  const thisMonth = submitted.filter((d) => d.disbursement_date >= monthStart);

  const statusCount = (value: "all" | number) =>
    value === "all"
      ? disbursements.length
      : disbursements.filter((d) => d.docstatus === value).length;

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Disbursements"
        subtitle="Loan Disbursement documents mirrored from your ERP"
        breadcrumbs={[
          { label: "Lending", href: "/lending" },
          { label: "Disbursements" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
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
      </PageHeader>

      <div className="px-6 py-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard
            label="Disbursed"
            value={formatCurrency(sum(submitted), currency)}
            subtext={`${submitted.length} submitted`}
            icon={Banknote}
            variant="accent"
          />
          <StatCard
            label="This month"
            value={formatCurrency(sum(thisMonth), currency)}
            subtext={`${thisMonth.length} disbursements`}
            icon={CalendarClock}
            variant="success"
          />
          <StatCard
            label="Drafts"
            value={drafts.length}
            subtext={drafts.length ? formatCurrency(sum(drafts), currency) : "—"}
            icon={FileText}
            variant={drafts.length > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Documents"
            value={disbursements.length}
            icon={ArrowUpFromLine}
            variant="info"
          />
        </div>

        <ContentCard noPadding>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {([
              { value: "all" as const, label: "All" },
              { value: 1, label: "Submitted" },
              { value: 0, label: "Draft" },
              { value: 2, label: "Cancelled" },
            ]).map((p) => {
              const active = docstatusFilter === p.value;
              return (
                <button
                  key={String(p.value)}
                  onClick={() => setDocstatusFilter(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                    active
                      ? "bg-foreground text-card"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label} ({statusCount(p.value)})
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search disbursements..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[135px] text-sm"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[135px] text-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                <ArrowUpFromLine className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No disbursements found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Loan Disbursement documents appear here after a loan book sync.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Document</div>
                <div className="col-span-2">Loan</div>
                <div className="col-span-2">Applicant</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-320px)] overflow-y-auto">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                  >
                    <div className="col-span-2 text-muted-foreground tabular-nums">
                      {format(new Date(d.disbursement_date), "dd MMM yyyy")}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-foreground truncate">{d.erpnext_name}</p>
                      {d.reference_number && (
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          Ref: {d.reference_number}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      {d.loan ? (
                        <Link
                          href={`/lending/loans/${d.loan}`}
                          className="text-foreground truncate hover:underline block"
                        >
                          {d.against_loan}
                        </Link>
                      ) : (
                        <p className="text-muted-foreground truncate">{d.against_loan || "—"}</p>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-foreground truncate">{d.applicant_name || "—"}</p>
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-foreground">
                      {formatCurrency(parseFloat(d.disbursed_amount) || 0, d.currency || currency)}
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`status-pill ${
                          DOCSTATUS_STYLES[d.docstatus] ||
                          "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {DOCSTATUS_LABELS[d.docstatus] || d.docstatus}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      {d.desk_url && (
                        <a
                          href={d.desk_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in ERPNext"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
