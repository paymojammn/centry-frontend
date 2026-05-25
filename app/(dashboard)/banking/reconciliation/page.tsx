"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations } from "@/hooks/use-organization";
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
  Upload,
  RotateCcw,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  Download,
  FileText,
  FileSpreadsheet,
  Printer,
  Link,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportData, type ExportColumn, type ExportFormat } from "@/lib/export";
import { format } from "date-fns";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

interface TransactionStatus {
  id: number;
  original_end_to_end_id: string;
  original_instruction_id: string;
  payment_event_id: number;
  payment_event_amount: string;
  creditor_name: string;
  vendor_name: string;
  invoice_number: string;
  bill_reference: string;
  bill_total: string | null;
  bill_amount_due: string | null;
  bill_date: string | null;
  bill_due_date: string | null;
  source_bank_account_name: string;
  payment_method: string | null;
  synced_to_xero: boolean;
  status: "ACSP" | "PDNG" | "RJCT" | "ACWC";
  status_display: string;
  status_code: string;
  status_description: string;
  additional_info: string[];
  original_amount: string;
  original_currency: string;
  created_at: string;
}

// ============================================================
// Status config
// ============================================================

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ACSP: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: CheckCircle2,
  },
  ACWC: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    icon: CheckCircle2,
  },
  RJCT: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-700 border-red-500/20",
    icon: XCircle,
  },
  PDNG: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    icon: Clock,
  },
};

// ============================================================
// Page
// ============================================================

export default function BankReconciliationPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [syncedFilter, setSyncedFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);

  const queryClient = useQueryClient();
  const { data: orgsRes, isLoading: orgsLoading } = useOrganizations();

  const organizations = Array.isArray(orgsRes)
    ? orgsRes
    : (orgsRes as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Fetch all pain.002 transaction statuses
  const { data, isLoading } = useQuery<{
    results: TransactionStatus[];
    total_count: number;
  }>({
    queryKey: [
      "bank-response-transactions",
      statusFilter,
      selectedOrganizationId,
    ],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedOrganizationId)
        p.append("organization", selectedOrganizationId);
      if (statusFilter !== "all") p.append("status", statusFilter);
      const result = await api.get(
        `/api/v1/banking/export-statuses/all-transactions/?${p.toString()}`
      );
      console.log("[Recon] Fetched transactions:", result);
      return result;
    },
    enabled: !!selectedOrganizationId,
  });

  const transactions = data?.results || [];

  // Client-side filtering
  const filtered = transactions.filter((t) => {
    // Search
    if (search) {
      const q = search.toLowerCase();
      const matches =
        (t.vendor_name || t.creditor_name || "").toLowerCase().includes(q) ||
        (t.invoice_number || "").toLowerCase().includes(q) ||
        (t.bill_reference || "").toLowerCase().includes(q) ||
        t.original_end_to_end_id.toLowerCase().includes(q) ||
        (t.status_description || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Date range
    if (startDate && new Date(t.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(t.created_at) > new Date(endDate + "T23:59:59"))
      return false;
    // Synced filter
    if (syncedFilter === "synced" && !t.synced_to_xero)
      return false;
    if (syncedFilter === "unsynced" && t.synced_to_xero)
      return false;
    return true;
  });

  // Counts
  const counts = {
    accepted: transactions.filter(
      (t) => t.status === "ACSP" || t.status === "ACWC"
    ).length,
    rejected: transactions.filter((t) => t.status === "RJCT").length,
    pending: transactions.filter((t) => t.status === "PDNG").length,
  };

  // Selectable = accepted transactions that haven't been synced yet
  const selectableIds = filtered
    .filter(
      (t) =>
        (t.status === "ACSP" || t.status === "ACWC") &&
        !t.synced_to_xero
    )
    .map((t) => t.id);

  const selectedValid = selected.filter((id) => selectableIds.includes(id));

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const selectAll = () => {
    if (selectedValid.length === selectableIds.length) {
      setSelected([]);
    } else {
      setSelected(selectableIds);
    }
  };

  // Bulk post to ERP
  const [bulkPosting, setBulkPosting] = useState(false);
  const handleBulkPost = async () => {
    if (selectedValid.length === 0) return;
    setBulkPosting(true);
    let ok = 0;
    for (const id of selectedValid) {
      const txn = transactions.find((t) => t.id === id);
      if (!txn?.payment_event_id) continue;
      try {
        console.log("[BulkPost] Posting payment event", txn.payment_event_id, "for txn", txn.id, txn);
        const res = await api.post(
          `/api/v1/xero/payments/${txn.payment_event_id}/sync-to-xero/`
        );
        console.log("[BulkPost] Success:", res);
        ok++;
      } catch (err: any) {
        console.error("[BulkPost] Failed for payment event", txn.payment_event_id, ":", err?.response?.data || err?.message || err);
      }
    }
    setBulkPosting(false);
    setSelected([]);
    toast.success(`Posted ${ok} of ${selectedValid.length} payments to ERP`);
    queryClient.invalidateQueries({
      queryKey: ["bank-response-transactions"],
    });
  };

  // Post single payment to ERP
  const postToErpMutation = useMutation({
    mutationFn: async (paymentEventId: number) => {
      console.log("[PostToERP] Posting payment event", paymentEventId);
      const res = await api.post(`/api/v1/xero/payments/${paymentEventId}/sync-to-xero/`);
      console.log("[PostToERP] Success:", res);
      return res;
    },
    onSuccess: () => {
      toast.success("Payment posted to ERP");
      queryClient.invalidateQueries({
        queryKey: ["bank-response-transactions"],
      });
    },
    onError: (err: any) => {
      console.error("[PostToERP] Error:", err?.response?.data || err?.message || err);
      toast.error(err?.response?.data?.error || "Failed to post payment to ERP");
    },
  });

  // Re-queue a failed payment
  const requeueMutation = useMutation({
    mutationFn: async (paymentEventId: number) =>
      api.post(`/api/v1/xero/payments/${paymentEventId}/requeue/`),
    onSuccess: () => {
      toast.success("Payment re-queued for next export batch");
      queryClient.invalidateQueries({
        queryKey: ["bank-response-transactions"],
      });
    },
    onError: () => toast.error("Failed to re-queue payment"),
  });

  // Re-link unlinked payment records
  const relinkMutation = useMutation({
    mutationFn: async () => {
      console.log("[Relink] Starting relink for org", selectedOrganizationId);
      const res = await api.post("/api/v1/banking/export-statuses/relink-payments/", {
        organization: selectedOrganizationId,
      });
      console.log("[Relink] Response:", res);
      return res;
    },
    onSuccess: (data: any) => {
      const msg =
        data?.data?.message || data?.message || "Payments re-linked";
      console.log("[Relink] Success:", data);
      toast.success(msg);
      queryClient.invalidateQueries({
        queryKey: ["bank-response-transactions"],
      });
    },
    onError: (err: any) => {
      console.error("[Relink] Error:", err?.response?.data || err?.message || err);
      toast.error("Failed to re-link payments");
    },
  });

  const hasFilters =
    statusFilter !== "all" ||
    syncedFilter !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    search !== "";

  // Export
  const STATUS_LABELS: Record<string, string> = {
    ACSP: "Accepted",
    ACWC: "Accepted (warnings)",
    RJCT: "Rejected",
    PDNG: "Pending",
  };

  const exportColumns: ExportColumn[] = [
    { header: "Date", accessor: (r) => format(new Date(r.created_at as string), "dd MMM yyyy"), width: 14 },
    { header: "Vendor", accessor: (r) => (r.vendor_name as string) || (r.creditor_name as string) || "", width: 30 },
    { header: "Bill #", accessor: "invoice_number", width: 14 },
    { header: "Reference", accessor: "bill_reference", width: 16 },
    { header: "Bill Total", accessor: (r) => r.bill_total ? formatCurrency(parseFloat(r.bill_total as string), r.original_currency as string) : "", width: 16 },
    { header: "Due Date", accessor: (r) => r.bill_due_date ? format(new Date(r.bill_due_date as string), "dd MMM yyyy") : "", width: 14 },
    { header: "Payment Method", accessor: "payment_method", width: 16 },
    { header: "Bank Account", accessor: "source_bank_account_name", width: 24 },
    { header: "Amount", accessor: (r) => formatCurrency(parseFloat(r.original_amount as string), r.original_currency as string), width: 18 },
    { header: "Currency", accessor: "original_currency", width: 8 },
    { header: "Bank Status", accessor: (r) => STATUS_LABELS[r.status as string] || (r.status as string) || "", width: 14 },
    { header: "Status Code", accessor: "status_code", width: 12 },
    { header: "Reason", accessor: "status_description", width: 36 },
    { header: "Synced to ERP", accessor: (r) => (r.synced_to_xero as boolean) ? "Yes" : "No", width: 12 },
  ];

  const handleExport = (fmt: ExportFormat) => {
    if (filtered.length === 0) {
      toast.error("No data to export");
      return;
    }
    const dateSuffix = format(new Date(), "yyyy-MM-dd");
    exportData(
      filtered as unknown as Record<string, unknown>[],
      exportColumns,
      `Reconciliation_${dateSuffix}`,
      fmt
    );
    if (fmt !== "pdf") toast.success(`Exported ${filtered.length} records as ${fmt.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Sync to ERP"
        subtitle="Post bank-accepted payments to your ERP"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Sync to ERP" },
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
            onClick={() => relinkMutation.mutate()}
            disabled={relinkMutation.isPending || !selectedOrganizationId}
            className="h-9"
          >
            {relinkMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link className="h-4 w-4 mr-2" />
            )}
            Re-link Payments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["bank-response-transactions"],
              })
            }
            className="h-9"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 py-8 space-y-5">
        {/* Summary KPI tiles — clickable to filter the grid by status.
            Active tile gets a sage ring so the filter state is visible. */}
        <div className="flex items-stretch gap-3">
          <div className="grid grid-cols-3 gap-3 flex-1">
            {[
              {
                key: "ACSP",
                label: "Accepted",
                value: counts.accepted,
                icon: CheckCircle2,
                tone: {
                  bg: "bg-emerald-500/10",
                  text: "text-emerald-700",
                  ring: "ring-emerald-500/20",
                },
              },
              {
                key: "RJCT",
                label: "Rejected",
                value: counts.rejected,
                icon: XCircle,
                tone: {
                  bg: "bg-red-500/10",
                  text: "text-red-700",
                  ring: "ring-red-500/20",
                },
              },
              {
                key: "PDNG",
                label: "Pending",
                value: counts.pending,
                icon: Clock,
                tone: {
                  bg: "bg-amber-500/10",
                  text: "text-amber-700",
                  ring: "ring-amber-500/20",
                },
              },
            ].map((t) => {
              const Icon = t.icon;
              const total = counts.accepted + counts.rejected + counts.pending;
              const pct = total > 0 ? Math.round((t.value / total) * 100) : 0;
              const active = statusFilter === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() =>
                    setStatusFilter(active ? "all" : t.key)
                  }
                  className={`text-left bg-card rounded-xl border p-4 transition-all group hover:shadow-sm ${
                    active
                      ? "border-primary/30 ring-1 ring-primary/20"
                      : "border-border hover:border-foreground/10"
                  }`}
                >
                  <div
                    className={`size-8 rounded-lg ${t.tone.bg} ring-1 ${t.tone.ring} flex items-center justify-center`}
                  >
                    <Icon className={`h-4 w-4 ${t.tone.text}`} />
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                      {t.label}
                    </p>
                    <p className="text-2xl font-normal text-foreground tabular-nums mt-1 leading-none">
                      {t.value}
                    </p>
                    <p className="text-[12px] text-muted-foreground mt-1.5">
                      {total > 0 ? `${pct}% of responses` : "no data"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bulk action card — same height as tiles, only visible when
              user has selected accepted-not-yet-synced rows. */}
          {selectedValid.length > 0 && (
            <div className="bg-card rounded-xl border border-primary/30 ring-1 ring-primary/15 p-4 flex flex-col justify-between min-w-[200px]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  Selected
                </p>
                <p className="text-2xl font-normal text-foreground tabular-nums mt-1 leading-none">
                  {selectedValid.length}
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleBulkPost}
                disabled={bulkPosting}
                className="h-8 mt-3"
              >
                {bulkPosting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                )}
                Post to ERP
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vendor, bill, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="ACSP">Accepted</SelectItem>
              <SelectItem value="RJCT">Rejected</SelectItem>
              <SelectItem value="PDNG">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={syncedFilter} onValueChange={setSyncedFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All ERP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ERP sync</SelectItem>
              <SelectItem value="synced">Synced to ERP</SelectItem>
              <SelectItem value="unsynced">Not synced</SelectItem>
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
              onClick={() => {
                setStatusFilter("all");
                setSyncedFilter("all");
                setStartDate("");
                setEndDate("");
                setSearch("");
              }}
              className="h-9 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}

          {selectableIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="h-9 ml-auto"
            >
              {selectedValid.length === selectableIds.length
                ? "Deselect all"
                : `Select all accepted (${selectableIds.length})`}
            </Button>
          )}
        </div>

        {/* Table */}
        <ContentCard noPadding>
          <ContentCardHeader>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-normal text-foreground">
                Bank Responses
              </h3>
              {!isLoading && (
                <Badge variant="secondary" className="text-xs">
                  {filtered.length}
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                <FileCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-normal text-foreground">
                No bank responses found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "Export payment files to receive bank responses"}
              </p>
            </div>
          ) : (
            /* Single table — the wrapper is the scroll container and
               .table-professional already makes <thead th> sticky, so the
               header stays pinned while the body scrolls. Two tables drift
               apart under HTML auto-layout (Currency lands under Amount,
               Amount lands under Reason). One table = one column flow. */
            <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
              <table className="w-full table-professional">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[88px]" />
                  <col />
                  <col className="w-[140px]" />
                  <col className="w-[48px]" />
                  <col className="w-[110px]" />
                  <col />
                  <col className="w-[100px]" />
                  <col className="w-[132px]" />
                </colgroup>
                <thead>
                  <tr>
                    <th />
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Bill</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Amount</th>
                    <th>Reason</th>
                    <th className="text-right pr-6">Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                    {filtered.map((txn) => {
                      const cfg = STATUS_CONFIG[txn.status];
                      const Icon = cfg?.icon;
                      const isAccepted =
                        txn.status === "ACSP" || txn.status === "ACWC";
                      const isRejected = txn.status === "RJCT";
                      const isSynced = txn.synced_to_xero;
                      const isSelectable = isAccepted && !isSynced;
                      const isSelected = selected.includes(txn.id);

                      return (
                        <tr key={txn.id} className={isSelected ? "is-selected" : ""}>
                          {/* Checkbox */}
                          <td>
                            {isSelectable && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggle(txn.id)}
                              />
                            )}
                          </td>

                          {/* Date */}
                          <td className="cell-muted tabular-nums whitespace-nowrap">
                            {format(new Date(txn.created_at), "dd MMM yy")}
                          </td>

                          {/* Vendor */}
                          <td className="cell-primary max-w-0">
                            <div className="truncate">
                              {txn.vendor_name || txn.creditor_name || "—"}
                            </div>
                            <span className="cell-sub truncate">
                              {[txn.payment_method, txn.source_bank_account_name]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </td>

                          {/* Bill */}
                          <td>
                            <div className="truncate">
                              {txn.invoice_number || "—"}
                            </div>
                            {txn.bill_reference && (
                              <span className="cell-sub truncate">
                                {txn.bill_reference}
                              </span>
                            )}
                            {txn.bill_due_date && (
                              <span className="cell-sub truncate">
                                Due {format(new Date(txn.bill_due_date), "dd MMM yy")}
                              </span>
                            )}
                          </td>

                          {/* Currency */}
                          <td className="cell-currency">{txn.original_currency}</td>

                          {/* Amount */}
                          <td className="cell-amount">
                            {parseFloat(txn.original_amount).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* Reason */}
                          <td className="cell-muted max-w-0">
                            <div className="truncate">
                              {txn.status_description || "—"}
                            </div>
                            {txn.status_code && txn.status_code !== "NARR" && (
                              <span className="cell-sub font-mono truncate">
                                {txn.status_code}
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="text-right pr-6">
                            {isSynced && (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Synced
                              </span>
                            )}
                            {isAccepted && !isSynced && txn.payment_event_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                  postToErpMutation.mutate(txn.payment_event_id)
                                }
                                disabled={postToErpMutation.isPending}
                              >
                                {postToErpMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3 mr-1" />
                                )}
                                Post to ERP
                              </Button>
                            )}
                            {isRejected && txn.payment_event_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() =>
                                  requeueMutation.mutate(txn.payment_event_id)
                                }
                                disabled={requeueMutation.isPending}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Re-queue
                              </Button>
                            )}
                          </td>

                          {/* Status (last column) */}
                          <td>
                            <span
                              className={`status-pill ${
                                cfg?.className ||
                                "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {Icon && <Icon className="h-3 w-3 shrink-0" />}
                              {cfg?.label || txn.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
