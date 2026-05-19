"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  ContentCard,
  ContentCardHeader,
} from "@/components/layout/content-card";
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
  PROCESSING: "Ready for File",
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

  // Fetch outgoing payments
  const { data, isLoading } = useQuery<{ results: PaymentEvent[] }>({
    queryKey: [
      "outgoing-payments",
      search,
      statusFilter,
      accountFilter,
      startDate,
      endDate,
      selectedOrganizationId,
    ],
    queryFn: () => {
      const p = new URLSearchParams();
      p.append("direction", "OUT");
      if (search) p.append("search", search);
      if (statusFilter !== "all") p.append("status", statusFilter);
      if (accountFilter !== "all") p.append("source_bank_account", accountFilter);
      if (selectedOrganizationId) p.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/xero/payments/?${p.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const payments = data?.results || [];

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

  // Client-side date filter (API may not support date range on this endpoint)
  const filteredPayments = payments.filter((p) => {
    if (startDate && new Date(p.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(p.created_at) > new Date(endDate + "T23:59:59"))
      return false;
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
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[160px] h-9">
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="PROCESSING">Ready for File</SelectItem>
              <SelectItem value="PENDING">Sent to Bank</SelectItem>
              <SelectItem value="SUCCESS_PAYMENT">Paid</SelectItem>
              <SelectItem value="FAILED_PAYMENT">Failed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-[135px]"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-[135px]"
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

        {/* Table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Outgoing Payments
              </h3>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {filteredPayments.length}
                </Badge>
              )}
            </div>
          </ContentCardHeader>

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
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Recipient</div>
                <div className="col-span-2">Account</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Created by</div>
              </div>
              <div className="divide-y divide-border/50 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredPayments.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-3 px-6 py-3 items-center text-sm hover:bg-muted/30 transition-colors"
                  >
                    <div className="col-span-2 text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy")}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {p.vendor_name || p.account_name || "—"}
                      </p>
                      {p.bill_number && (
                        <p className="text-xs text-muted-foreground truncate">
                          Bill #{p.bill_number}
                        </p>
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {p.source_bank_account_name || p.bank_name_display || "—"}
                      </p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(parseFloat(p.amount), p.currency)}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span
                        className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium border ${
                          STATUS_STYLES[p.provider_status] ||
                          "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {STATUS_LABELS[p.provider_status] || p.status_display || p.provider_status}
                      </span>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {p.created_by_name || "—"}
                      </p>
                      {p.approved_by_name && (
                        <p className="text-xs text-muted-foreground/60 truncate">
                          Approved: {p.approved_by_name}
                        </p>
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
