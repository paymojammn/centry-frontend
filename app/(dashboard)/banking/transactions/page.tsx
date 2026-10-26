"use client";

/**
 * Banking → Payments
 *
 * The outgoing bank-payment ledger: every PaymentEvent Centry has routed
 * out of a bank account, with created / approved / bank-response dates.
 * Uses the shared `.table-professional` grid and `.status-pill` vocabulary
 * so it reads the same as the Files tab and the Bills queues.
 */

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizations } from "@/hooks/use-organization";
import { useBankAccounts } from "@/hooks/use-banking";
import { ContentCard } from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RefreshCw,
  ArrowUpFromLine,
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportData, type ExportColumn, type ExportFormat } from "@/lib/export";
import { format } from "date-fns";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

interface PaymentEvent {
  id: number;
  amount: string;
  currency: string;
  method: string;
  method_display: string;
  vendor_name: string;
  account_name: string;
  bank_name_display: string;
  bill_number: string;
  bill_reference: string;
  provider_status: string;
  status_display: string;
  source_bank_account_name: string;
  created_by_name: string;
  approved_by_name: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  bank_status_updated_at: string | null;
}

// ============================================================
// Status vocabulary — one label + semantic tint per provider status.
// Shared wording with the Files tab: Ready / Awaiting bank / Processed /
// Failed / Pending approval / Rejected.
// ============================================================

const PILL_SUCCESS = "bg-success-500/10 text-success-700 border-success-500/20";
const PILL_WARNING = "bg-warning-500/10 text-warning-700 border-warning-500/20";
const PILL_DANGER = "bg-danger-500/10 text-danger-700 border-danger-500/20";
const PILL_INFO = "bg-info-500/10 text-info-700 border-info-500/20";
const PILL_NEUTRAL = "bg-muted text-muted-foreground border-border";

const PAYMENT_STATUS: Record<string, { label: string; pill: string }> = {
  PENDING_APPROVAL: { label: "Pending approval", pill: PILL_WARNING },
  PROCESSING: { label: "Ready", pill: PILL_WARNING },
  PENDING: { label: "Awaiting bank", pill: PILL_INFO },
  SENT_PAYMENT: { label: "Awaiting bank", pill: PILL_INFO },
  SUCCESS_PAYMENT: { label: "Processed", pill: PILL_SUCCESS },
  FAILED_PAYMENT: { label: "Failed", pill: PILL_DANGER },
  ERROR_PAYMENT: { label: "Failed", pill: PILL_DANGER },
  REJECTED: { label: "Rejected", pill: PILL_DANGER },
};

const statusLabel = (p: PaymentEvent) =>
  PAYMENT_STATUS[p.provider_status]?.label || p.status_display || p.provider_status;

function PaymentStatus({ payment }: { payment: PaymentEvent }) {
  const s = PAYMENT_STATUS[payment.provider_status];
  return (
    <span className={`status-pill ${s?.pill || PILL_NEUTRAL}`}>{statusLabel(payment)}</span>
  );
}

// Status groups behind the summary cards and filter pills.
const PROCESSED = ["SUCCESS_PAYMENT"];
const IN_FLIGHT = ["PENDING_APPROVAL", "PROCESSING", "SENT_PAYMENT", "PENDING"];
const FAILED = ["FAILED_PAYMENT", "ERROR_PAYMENT", "REJECTED"];

// Filter pill value → provider statuses it covers.
const PILL_FILTERS: { value: string; label: string; statuses: string[] }[] = [
  { value: "PENDING_APPROVAL", label: "Pending approval", statuses: ["PENDING_APPROVAL"] },
  { value: "PROCESSING", label: "Ready", statuses: ["PROCESSING"] },
  { value: "SENT_PAYMENT", label: "Awaiting bank", statuses: ["SENT_PAYMENT", "PENDING"] },
  { value: "SUCCESS_PAYMENT", label: "Processed", statuses: ["SUCCESS_PAYMENT"] },
  { value: "FAILED_PAYMENT", label: "Failed", statuses: ["FAILED_PAYMENT", "ERROR_PAYMENT"] },
  { value: "REJECTED", label: "Rejected", statuses: ["REJECTED"] },
];

// ============================================================
// Formatting helpers
// ============================================================

/** "Currency.UGX" → "UGX" (the API sometimes serialises the enum name). */
const cleanCcy = (currency: string | null | undefined) =>
  currency ? String(currency).split(".").pop() || "" : "";

const formatAmount = (amount: string) =>
  (parseFloat(amount) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

function DateCell({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  const d = new Date(iso);
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm")}</span>
    </>
  );
}

// ============================================================
// Page
// ============================================================

export default function BankTransactionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);

  const queryClient = useQueryClient();
  const { data: orgsRes, isLoading: orgsLoading } = useOrganizations();
  const { data: bankAccountsData } = useBankAccounts(
    selectedOrganizationId || undefined
  );

  const bankAccounts = (bankAccountsData as any)?.results || [];
  const organizations = Array.isArray(orgsRes)
    ? orgsRes
    : (orgsRes as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Fetch outgoing payments. Only org + direction are sent to the API —
  // the XeroPaymentEventViewSet ignores `search` and `source_bank_account`,
  // and the legacy/current status enums don't line up cleanly with what the
  // pills show. Doing all four user filters client-side avoids silent
  // no-ops and keeps the UI honest.
  const { data, isLoading } = useQuery<{ results: PaymentEvent[] }>({
    queryKey: ["outgoing-payments", selectedOrganizationId],
    queryFn: () => {
      const p = new URLSearchParams();
      p.append("direction", "OUT");
      if (selectedOrganizationId) p.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/xero/payments/?${p.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const payments = data?.results || [];

  // Summary + pill counts/amounts (from all payments, so totals stay accurate).
  const inStatuses = (statuses: string[]) =>
    payments.filter((p) => statuses.includes(p.provider_status));
  const statusCount = (statuses: string[]) => inStatuses(statuses).length;
  const fmtTotal = (list: PaymentEvent[], fallback: string) => {
    const total = list.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (!total) return fallback;
    const ccy = cleanCcy(list[0]?.currency);
    return `${ccy} ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim();
  };
  const statusAmount = (statuses: string[], fallback: string) =>
    fmtTotal(inStatuses(statuses), fallback);

  const processedCount = statusCount(PROCESSED);
  const inFlightCount = statusCount(IN_FLIGHT);
  const failedCount = statusCount(FAILED);

  const hasFilters =
    statusFilter !== "all" ||
    accountFilter !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    search !== "";

  const clearFilters = () => {
    setStatusFilter("all");
    setAccountFilter("all");
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  const activePill = PILL_FILTERS.find((f) => f.value === statusFilter);

  // Client-side: search across the user-visible fields, account/status enums,
  // and the date range. Keeps the dataset honest — the user sees exactly
  // what the filters say.
  const searchLower = search.trim().toLowerCase();
  const filteredPayments = payments.filter((p) => {
    if (startDate && new Date(p.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(p.created_at) > new Date(endDate + "T23:59:59"))
      return false;
    if (statusFilter !== "all") {
      const allowed = activePill?.statuses || [statusFilter];
      if (!allowed.includes(p.provider_status)) return false;
    }
    if (accountFilter !== "all") {
      // accountFilter holds the bank-account id as a string. The payment
      // response carries the name (source_bank_account_name) rather than
      // the id, so resolve via the cached account list.
      const acct = (bankAccounts as any[]).find(
        (a: any) => String(a.id) === accountFilter,
      );
      const wantName = acct?.account_name;
      if (
        wantName &&
        p.source_bank_account_name !== wantName &&
        p.bank_name_display !== wantName
      ) {
        return false;
      }
    }
    if (searchLower) {
      const hay = [
        p.vendor_name,
        p.account_name,
        p.bill_number,
        p.bill_reference,
        p.source_bank_account_name,
        p.bank_name_display,
        p.created_by_name,
        p.approved_by_name,
        p.method_display,
        p.status_display,
        statusLabel(p),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(searchLower)) return false;
    }
    return true;
  });

  // Export
  const exportColumns: ExportColumn[] = [
    { header: "Date", accessor: (r) => format(new Date(r.created_at as string), "dd MMM yyyy"), width: 14 },
    { header: "Recipient", accessor: (r) => (r.vendor_name as string) || (r.account_name as string) || "", width: 30 },
    { header: "Bill #", accessor: "bill_number", width: 14 },
    { header: "Account", accessor: (r) => (r.source_bank_account_name as string) || (r.bank_name_display as string) || "", width: 24 },
    { header: "Amount", accessor: (r) => formatCurrency(parseFloat(r.amount as string), r.currency as string), width: 18 },
    { header: "Currency", accessor: "currency", width: 8 },
    { header: "Status", accessor: (r) => statusLabel(r as unknown as PaymentEvent), width: 16 },
    { header: "Created By", accessor: "created_by_name", width: 20 },
    { header: "Approved By", accessor: (r) => (r.approved_by_name as string) || "", width: 20 },
  ];

  const handleExport = (fmt: ExportFormat) => {
    if (filteredPayments.length === 0) {
      toast.error("No data to export");
      return;
    }
    const dateSuffix = format(new Date(), "yyyy-MM-dd");
    exportData(
      filteredPayments as unknown as Record<string, unknown>[],
      exportColumns,
      `Payments_${dateSuffix}`,
      fmt
    );
    if (fmt !== "pdf") toast.success(`Exported ${filteredPayments.length} payments as ${fmt.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Payments"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Payments" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <Printer className="mr-2 h-4 w-4" />
                Print / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["outgoing-payments"] })
            }
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 py-6">
        {/* Summary row — colour only on the state-like cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6 animate-fade-in-up">
          <StatCard
            label="Total payments"
            value={payments.length}
            subtext={fmtTotal(payments, "No outgoing payments yet")}
            icon={ArrowUpFromLine}
          />
          <StatCard
            label="Processed"
            value={processedCount}
            subtext={statusAmount(PROCESSED, "Nothing processed yet")}
            icon={CheckCircle2}
            variant={processedCount > 0 ? "success" : "default"}
          />
          <StatCard
            label="In progress"
            value={inFlightCount}
            subtext={statusAmount(IN_FLIGHT, "Nothing in flight")}
            icon={Clock}
            variant={inFlightCount > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Failed"
            value={failedCount}
            subtext={statusAmount(FAILED, "No failures")}
            icon={XCircle}
            variant={failedCount > 0 ? "danger" : "default"}
          />
        </div>

        <ContentCard noPadding>
          {/* Toolbar: status pills + account / search / date range */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {[
              { value: "all", label: "All", count: payments.length },
              ...PILL_FILTERS.map((f) => ({
                value: f.value,
                label: f.label,
                count: statusCount(f.statuses),
              })),
            ].map((p) => {
              const active = statusFilter === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setStatusFilter(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
                  }`}
                >
                  {p.label} ({p.count})
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search..."
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
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <LoadingState />
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon={ArrowUpFromLine}
              title={hasFilters ? "No payments match your filters" : "No payments yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters"
                  : "Outgoing bank payments will appear here once bills are paid"
              }
            />
          ) : (
            <div className="table-scroll-container">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Created</th>
                    <th>Recipient</th>
                    <th>Account</th>
                    <th>Approved</th>
                    <th>Bank response</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Amount</th>
                    <th>Created by</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-muted whitespace-nowrap">
                        <DateCell iso={p.created_at} />
                      </td>
                      <td className="cell-primary">
                        <span className="block truncate max-w-[240px]">
                          {p.vendor_name || p.account_name || "—"}
                        </span>
                        {(p.bill_number || p.bill_reference) && (
                          <span className="cell-sub truncate max-w-[240px]">
                            {p.bill_number ? `Bill #${p.bill_number}` : p.bill_reference}
                          </span>
                        )}
                      </td>
                      <td className="cell-muted">
                        <span className="block truncate max-w-[160px]">
                          {p.source_bank_account_name || p.bank_name_display || "—"}
                        </span>
                      </td>
                      <td className="cell-muted whitespace-nowrap">
                        <DateCell iso={p.approved_at || p.rejected_at} />
                      </td>
                      <td className="cell-muted whitespace-nowrap">
                        <DateCell iso={p.bank_status_updated_at} />
                      </td>
                      <td className="cell-currency">{cleanCcy(p.currency)}</td>
                      <td className="cell-amount">{formatAmount(p.amount)}</td>
                      <td className="cell-muted">
                        <span className="block truncate max-w-[140px]">
                          {p.created_by_name || "—"}
                        </span>
                        {p.approved_by_name && (
                          <span className="cell-sub truncate max-w-[140px]">
                            Approved by {p.approved_by_name}
                          </span>
                        )}
                      </td>
                      <td>
                        <PaymentStatus payment={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
