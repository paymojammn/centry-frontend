"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "@/hooks/use-organization";
import { useBankAccounts } from "@/hooks/use-banking";
import { ContentCard } from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
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
import { StatCard } from "@/components/layout/stat-card";
import { PILL_COLORS } from "@/lib/theme";
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
}

// ============================================================
// Status styles
// ============================================================

const STATUS_STYLES: Record<string, string> = {
  SUCCESS_PAYMENT: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  SENT_PAYMENT: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  PENDING_APPROVAL: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  FAILED_PAYMENT: "bg-red-500/10 text-red-700 border-red-500/20",
  ERROR_PAYMENT: "bg-red-500/10 text-red-700 border-red-500/20",
  REJECTED: "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "Pending Approval",
  PROCESSING: "Ready to Pay",
  PENDING: "Sent to Bank",
  SENT_PAYMENT: "Sent to Bank",
  SUCCESS_PAYMENT: "Paid",
  FAILED_PAYMENT: "Failed",
  ERROR_PAYMENT: "Error",
  REJECTED: "Rejected",
};

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
  // dropdown shows. Doing all four user filters client-side avoids silent
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
  const statusCount = (statuses: string[]) =>
    payments.filter((p) => statuses.includes(p.provider_status)).length;
  const fmtAmount = (list: PaymentEvent[]) => {
    const total = list.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    if (!total) return "—";
    const ccy = list[0]?.currency ? String(list[0].currency).split(".").pop() : "";
    return `${ccy} ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };
  const statusAmount = (statuses: string[]) =>
    fmtAmount(payments.filter((p) => statuses.includes(p.provider_status)));
  const PAID = ["SUCCESS_PAYMENT"];
  const IN_FLIGHT = ["PENDING_APPROVAL", "PROCESSING", "SENT_PAYMENT", "PENDING"];
  const FAILED = ["FAILED_PAYMENT", "ERROR_PAYMENT", "REJECTED"];

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

  // Client-side: search across the user-visible fields, account/status enums,
  // and the date range. Keeps the dataset honest — the user sees exactly
  // what the filters say.
  const searchLower = search.trim().toLowerCase();
  const filteredPayments = payments.filter((p) => {
    if (startDate && new Date(p.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(p.created_at) > new Date(endDate + "T23:59:59"))
      return false;
    if (statusFilter !== "all" && p.provider_status !== statusFilter) return false;
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
        STATUS_LABELS[p.provider_status] || p.provider_status,
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
    { header: "Status", accessor: (r) => STATUS_LABELS[r.provider_status as string] || (r.status_display as string) || "", width: 16 },
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
      `Transactions_${dateSuffix}`,
      fmt
    );
    if (fmt !== "pdf") toast.success(`Exported ${filteredPayments.length} transactions as ${fmt.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Transactions"
        subtitle="Outgoing payment records"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Transactions" },
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

      <div className="px-6 py-8 space-y-5">
        {/* Summary cards (bills-page style) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard
            label="Total payments"
            value={payments.length}
            subtext={fmtAmount(payments)}
            icon={ArrowUpFromLine}
            variant="accent"
          />
          <StatCard
            label="Paid"
            value={statusCount(PAID)}
            subtext={statusAmount(PAID)}
            icon={CheckCircle2}
            iconColor="#5C8A65"
            iconBgColor="#E8F5E5"
            variant="success"
          />
          <StatCard
            label="In progress"
            value={statusCount(IN_FLIGHT)}
            subtext={statusAmount(IN_FLIGHT)}
            icon={Clock}
            iconColor="#b87a00"
            iconBgColor="#FFF6E0"
            variant="warning"
          />
          <StatCard
            label="Failed"
            value={statusCount(FAILED)}
            subtext={statusAmount(FAILED)}
            icon={XCircle}
            iconColor="#dc2626"
            iconBgColor="#FEE2E2"
            variant={statusCount(FAILED) > 0 ? "danger" : "default"}
          />
        </div>

        {/* Table card — status pills header + grid (bills-grid style) */}
        <ContentCard noPadding>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {([
              { value: "all", label: "All", count: payments.length },
              { value: "PENDING_APPROVAL", label: "Pending Approval", count: statusCount(["PENDING_APPROVAL"]) },
              { value: "PROCESSING", label: "Ready to Pay", count: statusCount(["PROCESSING"]) },
              { value: "SENT_PAYMENT", label: "Sent to Bank", count: statusCount(["SENT_PAYMENT"]) },
              { value: "SUCCESS_PAYMENT", label: "Paid", count: statusCount(["SUCCESS_PAYMENT"]) },
              { value: "FAILED_PAYMENT", label: "Failed", count: statusCount(["FAILED_PAYMENT"]) },
              { value: "ERROR_PAYMENT", label: "Error", count: statusCount(["ERROR_PAYMENT"]) },
              { value: "REJECTED", label: "Rejected", count: statusCount(["REJECTED"]) },
            ]).map((p) => {
              const active = statusFilter === p.value;
              const color = p.value === "all" ? undefined : PILL_COLORS[p.value.toLowerCase()];
              return (
                <button
                  key={p.value}
                  onClick={() => setStatusFilter(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                    active
                      ? color
                        ? "text-white"
                        : "bg-foreground text-card"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                  style={active && color ? { backgroundColor: color } : undefined}
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

          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                <ArrowUpFromLine className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No payments found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "No outgoing payments yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Recipient</div>
                <div className="col-span-1">Account</div>
                <div className="col-span-1 text-right">Ccy</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1">Created by</div>
                <div className="col-span-2">Status</div>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredPayments.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                  >
                    <div className="col-span-2 text-muted-foreground tabular-nums">
                      {format(new Date(p.created_at), "dd MMM yyyy")}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-foreground truncate">
                        {p.vendor_name || p.account_name || "—"}
                      </p>
                      {p.bill_number && (
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          Bill #{p.bill_number}
                        </p>
                      )}
                    </div>
                    <div className="col-span-1 min-w-0">
                      <p className="text-[12px] text-muted-foreground truncate">
                        {p.source_bank_account_name || p.bank_name_display || "—"}
                      </p>
                    </div>
                    <div className="col-span-1 text-right text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                      {p.currency}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="tabular-nums text-foreground">
                        {parseFloat(p.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="col-span-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {p.created_by_name || "—"}
                      </p>
                      {p.approved_by_name && (
                        <p className="text-xs text-muted-foreground/60 truncate">
                          Approved: {p.approved_by_name}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`status-pill ${
                          STATUS_STYLES[p.provider_status] ||
                          "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {STATUS_LABELS[p.provider_status] || p.status_display || p.provider_status}
                      </span>
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
