"use client";

/**
 * Banking → ERP Sync
 *
 * Bank-accepted payments (pain.002 ACSP/ACWC) waiting to be posted to the
 * ERP, next to the ones still awaiting the bank and the ones it rejected.
 * One grid, one status filter; ready rows are synced in bulk from the
 * toolbar or one at a time from the row action.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganizations } from "@/hooks/use-organization";
import { ContentCard } from "@/components/layout/content-card";
import { StatCard } from "@/components/layout/stat-card";
import { PageHeader } from "@/components/layout/page-header";
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

type Filter = "all" | "ready" | "synced" | "pending" | "failed";

// ============================================================
// Status vocabulary (shared with the other banking grids)
// ============================================================

// Semantic status-pill tints (success / warning / danger / info / neutral).
const PILL = {
  success: "bg-success-500/10 text-success-700 border-success-500/20",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  danger: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
} as const;

// Bank-side (pain.002) status. ACSP and ACWC both mean the bank processed it.
const BANK_STATUS: Record<string, { label: string; pill: string }> = {
  ACSP: { label: "Processed", pill: PILL.success },
  ACWC: { label: "Processed", pill: PILL.success },
  PDNG: { label: "Awaiting bank", pill: PILL.warning },
  RJCT: { label: "Failed", pill: PILL.danger },
};

const EXPORT_STATUS_LABELS: Record<string, string> = {
  ACSP: "Processed",
  ACWC: "Processed (warnings)",
  RJCT: "Failed",
  PDNG: "Awaiting bank",
};

function BankStatus({ status }: { status: string }) {
  const s = BANK_STATUS[status] || { label: status, pill: PILL.neutral };
  return <span className={`status-pill ${s.pill}`}>{s.label}</span>;
}

function ErpStatus({ synced }: { synced: boolean }) {
  return synced ? (
    <span className={`status-pill ${PILL.success}`}>Synced</span>
  ) : (
    <span className={`status-pill ${PILL.neutral}`}>Not synced</span>
  );
}

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

function formatAmount(amount: string): string {
  return parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const isAccepted = (t: TransactionStatus) =>
  t.status === "ACSP" || t.status === "ACWC";
// Ready = the bank processed it and the ERP has not been told yet.
const isReady = (t: TransactionStatus) => isAccepted(t) && !t.synced_to_xero;

const matchesFilter = (t: TransactionStatus, f: Filter) => {
  switch (f) {
    case "ready":
      return isReady(t);
    case "synced":
      return t.synced_to_xero;
    case "pending":
      return t.status === "PDNG";
    case "failed":
      return t.status === "RJCT";
    default:
      return true;
  }
};

// ============================================================
// Page
// ============================================================

export default function BankReconciliationPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
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
    queryKey: ["bank-response-transactions", selectedOrganizationId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedOrganizationId)
        p.append("organization", selectedOrganizationId);
      // Status is filtered client-side so the pill/tile counts stay accurate.
      return api.get(
        `/api/v1/banking/export-statuses/all-transactions/?${p.toString()}`
      );
    },
    enabled: !!selectedOrganizationId,
  });

  const transactions = data?.results || [];

  // Client-side filtering
  const filtered = transactions.filter((t) => {
    if (!matchesFilter(t, filter)) return false;
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
    if (startDate && new Date(t.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(t.created_at) > new Date(endDate + "T23:59:59"))
      return false;
    return true;
  });

  // Counts (whole list, so the tiles and pills don't shrink as you filter)
  const count = (f: Filter) => transactions.filter((t) => matchesFilter(t, f)).length;
  const counts = {
    all: transactions.length,
    ready: count("ready"),
    synced: count("synced"),
    pending: count("pending"),
    failed: count("failed"),
  };
  const share = (n: number) =>
    counts.all > 0
      ? `${Math.round((n / counts.all) * 100)}% of ${counts.all} responses`
      : "No bank responses yet";

  const pills: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "ready", label: "Ready", count: counts.ready },
    { value: "synced", label: "Synced", count: counts.synced },
    { value: "pending", label: "Awaiting bank", count: counts.pending },
    { value: "failed", label: "Failed", count: counts.failed },
  ];

  // Selectable = accepted transactions that haven't been synced yet
  const selectableIds = filtered.filter(isReady).map((t) => t.id);
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
    const failures: string[] = [];
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
        const reason =
          err?.response?.data?.error || err?.message || "Unknown error";
        console.error("[BulkPost] Failed for payment event", txn.payment_event_id, ":", err?.response?.data || err?.message || err);
        failures.push(`Payment #${txn.payment_event_id}: ${reason}`);
      }
    }
    setBulkPosting(false);
    setSelected([]);
    if (ok > 0) {
      toast.success(`Posted ${ok} of ${selectedValid.length} payments to ERP`);
    }
    if (failures.length > 0) {
      // Surface the actual Xero/ERP errors (e.g. "Payments can only be made
      // against Authorised documents") instead of silently swallowing them.
      const distinct = Array.from(new Set(failures));
      toast.error(
        `Failed to post ${failures.length} of ${selectedValid.length} payments`,
        { description: distinct.join("\n") }
      );
    }
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
  // The payment event currently being posted, so only its row shows a spinner.
  const postingId = postToErpMutation.isPending ? postToErpMutation.variables : undefined;

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
  const requeueingId = requeueMutation.isPending ? requeueMutation.variables : undefined;

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
    filter !== "all" || startDate !== "" || endDate !== "" || search !== "";

  const clearFilters = () => {
    setFilter("all");
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  // Export
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
    { header: "Bank Status", accessor: (r) => EXPORT_STATUS_LABELS[r.status as string] || (r.status as string) || "", width: 14 },
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

  const tiles: {
    key: Filter;
    label: string;
    value: number;
    icon: typeof Upload;
    variant: "info" | "success" | "warning" | "danger";
  }[] = [
    { key: "ready", label: "Ready to sync", value: counts.ready, icon: Upload, variant: "info" },
    { key: "synced", label: "Synced", value: counts.synced, icon: CheckCircle2, variant: "success" },
    { key: "pending", label: "Awaiting bank", value: counts.pending, icon: Clock, variant: "warning" },
    { key: "failed", label: "Failed", value: counts.failed, icon: XCircle, variant: "danger" },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="ERP Sync"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "ERP Sync" },
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
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 py-6">
        {/* Summary — each tile also toggles the matching grid filter. */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          {tiles.map((t) => {
            const active = filter === t.key;
            return (
              <StatCard
                key={t.key}
                label={t.label}
                value={t.value}
                subtext={share(t.value)}
                icon={t.icon}
                variant={t.value > 0 ? t.variant : "default"}
                onClick={() => setFilter(active ? "all" : t.key)}
                className={active ? "ring-2 ring-primary/40" : ""}
              />
            );
          })}
        </div>

        <ContentCard noPadding>
          {/* Toolbar: status pills + search/dates + selection actions */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {pills.map((p) => {
              const active = filter === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => setFilter(p.value)}
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
              <div className="relative w-44">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[135px]"
                aria-label="From date"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[135px]"
                aria-label="To date"
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
              {selectableIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="h-9"
                >
                  {selectedValid.length === selectableIds.length
                    ? "Deselect all"
                    : `Select all (${selectableIds.length})`}
                </Button>
              )}
              {selectedValid.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkPost}
                  disabled={bulkPosting}
                  className="h-9"
                >
                  {bulkPosting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Sync {selectedValid.length} to ERP
                </Button>
              )}
            </div>
          </div>

          {/* Body */}
          {isLoading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title={hasFilters ? "No payments match your filters" : "No bank responses yet"}
              description={
                hasFilters
                  ? "Try adjusting your filters"
                  : "Upload payment files to the bank to receive responses here"
              }
            />
          ) : (
            <div className="table-scroll-container">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th className="w-10" />
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Bill</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Amount</th>
                    <th>Reason</th>
                    <th>Bank</th>
                    <th>ERP</th>
                    <th className="text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((txn) => {
                    const ready = isReady(txn);
                    const isSelected = selected.includes(txn.id);
                    return (
                      <tr key={txn.id} className={isSelected ? "is-selected" : undefined}>
                        <td>
                          {ready && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggle(txn.id)}
                              aria-label="Select payment"
                            />
                          )}
                        </td>
                        <td className="cell-muted whitespace-nowrap">
                          <DateCell iso={txn.created_at} />
                        </td>
                        <td className="cell-primary">
                          <span className="block truncate max-w-[220px]">
                            {txn.vendor_name || txn.creditor_name || "—"}
                          </span>
                          <span className="cell-sub truncate max-w-[220px]">
                            {[txn.payment_method, txn.source_bank_account_name]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="block truncate max-w-[160px]">
                            {txn.invoice_number || "—"}
                          </span>
                          {txn.bill_reference && (
                            <span className="cell-sub truncate max-w-[160px]">
                              {txn.bill_reference}
                            </span>
                          )}
                          {txn.bill_due_date && (
                            <span className="cell-sub">
                              Due {format(new Date(txn.bill_due_date), "dd MMM yyyy")}
                            </span>
                          )}
                        </td>
                        <td className="cell-currency">{txn.original_currency}</td>
                        <td className="cell-amount">{formatAmount(txn.original_amount)}</td>
                        <td className="cell-muted">
                          <span className="block truncate max-w-[240px]">
                            {txn.status_description || "—"}
                          </span>
                          {txn.status_code && txn.status_code !== "NARR" && (
                            <span className="cell-sub font-mono">{txn.status_code}</span>
                          )}
                        </td>
                        <td>
                          <BankStatus status={txn.status} />
                        </td>
                        <td>
                          <ErpStatus synced={txn.synced_to_xero} />
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {ready && txn.payment_event_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-muted-foreground hover:text-primary"
                                onClick={() => postToErpMutation.mutate(txn.payment_event_id)}
                                disabled={postToErpMutation.isPending || bulkPosting}
                                title="Post this payment to the ERP"
                              >
                                {postingId === txn.payment_event_id ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                )}
                                Sync
                              </Button>
                            )}
                            {txn.status === "RJCT" && txn.payment_event_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-muted-foreground hover:text-primary"
                                onClick={() => requeueMutation.mutate(txn.payment_event_id)}
                                disabled={requeueMutation.isPending}
                                title="Queue this payment for the next export batch"
                              >
                                {requeueingId === txn.payment_event_id ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                )}
                                Re-queue
                              </Button>
                            )}
                          </div>
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
