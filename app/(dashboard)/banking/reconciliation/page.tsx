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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
  source_bank_account_name: string;
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
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedOrganizationId)
        p.append("organization", selectedOrganizationId);
      if (statusFilter !== "all") p.append("status", statusFilter);
      return api.get(
        `/api/v1/banking/export-statuses/all-transactions/?${p.toString()}`
      );
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
        await api.post(
          `/api/v1/xero/payments/${txn.payment_event_id}/sync-to-xero/`
        );
        ok++;
      } catch {
        // continue
      }
    }
    setBulkPosting(false);
    setSelected([]);
    toast.success(`Posted ${ok} of ${selectedValid.length} payments to ERP`);
    queryClient.invalidateQueries({
      queryKey: ["bank-response-transactions"],
    });
  };

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

  const hasFilters =
    statusFilter !== "all" ||
    syncedFilter !== "all" ||
    startDate !== "" ||
    endDate !== "" ||
    search !== "";

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Reconciliation"
        subtitle="Bank responses for exported payments"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Reconciliation" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
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
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {/* Summary bar + bulk action */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-6">
            <span className="text-muted-foreground">
              Accepted{" "}
              <span className="font-semibold text-emerald-600">
                {counts.accepted}
              </span>
            </span>
            <span className="text-muted-foreground">
              Rejected{" "}
              <span className="font-semibold text-red-600">
                {counts.rejected}
              </span>
            </span>
            <span className="text-muted-foreground">
              Pending{" "}
              <span className="font-semibold text-amber-600">
                {counts.pending}
              </span>
            </span>
          </div>

          {selectedValid.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedValid.length} selected
              </Badge>
              <Button
                size="sm"
                onClick={handleBulkPost}
                disabled={bulkPosting}
                className="h-8"
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
              <h3 className="text-sm font-semibold text-foreground">
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
              <p className="text-sm font-medium text-foreground">
                No bank responses found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "Export payment files to receive bank responses"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                <div className="col-span-1" />
                <div className="col-span-1">Date</div>
                <div className="col-span-2">Vendor</div>
                <div className="col-span-2">Bill</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Reason</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              <div className="divide-y divide-border/50 max-h-[calc(100vh-380px)] overflow-y-auto">
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
                    <div
                      key={txn.id}
                      className={`grid grid-cols-12 gap-3 px-6 py-3 items-center text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1">
                        {isSelectable && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggle(txn.id)}
                          />
                        )}
                      </div>

                      {/* Date */}
                      <div className="col-span-1 text-muted-foreground text-xs">
                        {format(new Date(txn.created_at), "dd MMM yyyy")}
                      </div>

                      {/* Vendor */}
                      <div className="col-span-2 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {txn.vendor_name || txn.creditor_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {txn.source_bank_account_name || txn.creditor_name}
                        </p>
                      </div>

                      {/* Bill */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {txn.invoice_number}
                        </p>
                        {txn.bill_reference && (
                          <p className="text-xs text-muted-foreground truncate">
                            {txn.bill_reference}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="col-span-2 text-right">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCurrency(
                            parseFloat(txn.original_amount),
                            txn.original_currency
                          )}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                            cfg?.className ||
                            "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {Icon && <Icon className="h-3 w-3" />}
                          {cfg?.label || txn.status}
                        </span>
                      </div>

                      {/* Reason */}
                      <div className="col-span-2 min-w-0">
                        {txn.status_code && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {txn.status_code}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {txn.status_description || "—"}
                        </p>
                      </div>

                      {/* Action */}
                      <div className="col-span-1 text-right">
                        {isSynced && (
                          <span className="text-xs text-emerald-600 font-medium">
                            Synced to ERP
                          </span>
                        )}
                        {isRejected && (
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
