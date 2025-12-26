"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizations } from "@/hooks/use-organization";
import { useSyncInvoices, useERPConnections } from "@/hooks/use-erp";
import { useAutoReconcile, useAutoReconcileStatus } from "@/hooks/use-banking";
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  FileText,
  Check,
  X,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
  transaction_type: "DEBIT" | "CREDIT";
  currency: string;
  match_status: string;
  source_type: string;
  source_provider: string;
  counterparty_name: string;
  bank_name: string;
  file_import_name: string;
}

interface ReconciliationStats {
  unmatched_count: number;
  suggested_count: number;
  matched_count: number;
  posted_count: number;
  total_unmatched_amount: number;
}

interface SuggestedTransaction extends BankTransaction {
  matched_to_type: string;
  matched_to_id: string;
  matched_to_reference: string;
  matched_amount: number;
  match_confidence: number;
  match_rules_applied: string[];
  debit_amount: number;
  credit_amount: number;
}

export default function BankReconciliationPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [reconcileTaskId, setReconcileTaskId] = useState<string | undefined>();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncInvoices, isPending: isSyncing } = useSyncInvoices();
  const { mutate: autoReconcile, isPending: isAutoReconciling } = useAutoReconcile();
  const { data: reconcileStatus } = useAutoReconcileStatus(reconcileTaskId);

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    const orgConnection = erpConnections?.find(
      (conn: any) => conn.organization?.id === selectedOrganizationId && conn.is_active
    );
    setActiveConnectionId(orgConnection?.id || null);
  }, [selectedOrganizationId, erpConnections]);

  // API Queries
  const { data: stats } = useQuery<ReconciliationStats>({
    queryKey: ["bank-reconciliation-stats", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/reconciliation_summary/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const { data: reconciliationItems, isLoading: itemsLoading } = useQuery<{
    invoices: any[];
    bills: any[];
    total_invoices: number;
    total_bills: number;
  }>({
    queryKey: ["reconciliation-items", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/reconciliation_items/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const { data: unmatchedData, isLoading: unmatchedLoading } = useQuery<{ results: BankTransaction[] }>({
    queryKey: ["bank-transactions-unmatched", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "unmatched");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const { data: suggestedData } = useQuery<{ results: SuggestedTransaction[] }>({
    queryKey: ["bank-transactions-suggested", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "suggested");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const { data: matchedData } = useQuery<{ results: BankTransaction[] }>({
    queryKey: ["bank-transactions-matched", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "matched");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const unmatchedTransactions = unmatchedData?.results || [];
  const suggestedTransactions = suggestedData?.results || [];
  const matchedTransactions = matchedData?.results || [];

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ transactionId, matchType, matchId, amount }: {
      transactionId: string;
      matchType: string;
      matchId: string;
      amount: number;
    }) => {
      await api.post(`/api/v1/banking/transactions/${transactionId}/match/`, {
        match_type: matchType,
        match_id: matchId,
        amount: amount,
      });
      return api.post(`/api/v1/banking/transactions/${transactionId}/post_to_xero/`);
    },
    onSuccess: () => {
      toast.success('Payment posted to Xero');
      handleTransactionUpdate();
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return api.post(`/api/v1/banking/transactions/${transactionId}/unmatch/`);
    },
    onSuccess: () => {
      toast.success('Match rejected');
      handleTransactionUpdate();
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleTransactionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-unmatched"] });
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-suggested"] });
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-matched"] });
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-posted"] });
    queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-stats"] });
  };

  const handleSyncInvoices = () => {
    if (activeConnectionId) {
      syncInvoices(activeConnectionId);
    } else {
      toast.error('No active ERP connection');
    }
  };

  const handleAutoReconcile = () => {
    if (!selectedOrganizationId || !activeConnectionId) {
      toast.error('Select an organization with an active connection');
      return;
    }
    autoReconcile(
      { organization: selectedOrganizationId, erp_connection: activeConnectionId, min_confidence: 0.7, auto_apply: true },
      {
        onSuccess: (data) => {
          setReconcileTaskId(data.task_id);
          toast.info('Auto-reconciliation started...');
        },
        onError: (error: any) => toast.error(`Failed: ${error.message}`),
      }
    );
  };

  useEffect(() => {
    if (reconcileStatus?.status === 'SUCCESS') {
      const result = reconcileStatus.result;
      if (result) {
        toast.success(`Matched ${result.matched_count} transactions, ${result.suggested_count} suggestions`);
        setReconcileTaskId(undefined);
        handleTransactionUpdate();
      }
    } else if (reconcileStatus?.status === 'FAILURE') {
      toast.error(`Failed: ${reconcileStatus.error || 'Unknown error'}`);
      setReconcileTaskId(undefined);
    }
  }, [reconcileStatus]);

  const totalToReconcile = (stats?.unmatched_count || 0) + (stats?.suggested_count || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Bank Reconciliation</h1>
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading}
              >
                <SelectTrigger className="w-[200px] h-9 text-sm bg-gray-50 border-gray-200">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select org" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncInvoices}
                disabled={isSyncing || !activeConnectionId}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button
                size="sm"
                onClick={handleAutoReconcile}
                disabled={isAutoReconciling || !!reconcileTaskId || !activeConnectionId}
                className="h-9 bg-[#638C80] hover:bg-[#547568]"
              >
                <Sparkles className={`h-4 w-4 mr-2 ${(isAutoReconciling || reconcileTaskId) ? 'animate-pulse' : ''}`} />
                Auto Match
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-6">
            <StatPill
              label="To Reconcile"
              value={totalToReconcile}
              color="orange"
              showDot={totalToReconcile > 0}
            />
            <StatPill label="Suggested" value={stats?.suggested_count || 0} color="amber" />
            <StatPill label="Matched" value={stats?.matched_count || 0} color="blue" />
            <StatPill label="Posted" value={stats?.posted_count || 0} color="green" />
            <div className="ml-auto text-sm text-gray-500">
              {formatCurrency(stats?.total_unmatched_amount || 0, "UGX")} unreconciled
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Suggested Matches - Priority Section */}
        {suggestedTransactions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-medium text-gray-700">
                Suggested Matches ({suggestedTransactions.length})
              </h2>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {suggestedTransactions.map((txn) => {
                const amount = txn.debit_amount || txn.credit_amount || 0;
                const confidence = Math.round((txn.match_confidence || 0) * 100);
                const isExpanded = expandedTransaction === txn.id;

                return (
                  <div key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        {/* Transaction */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              {format(new Date(txn.transaction_date), "dd MMM")}
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {txn.description}
                            </span>
                          </div>
                          {txn.counterparty_name && (
                            <p className="text-xs text-gray-500 mt-0.5">{txn.counterparty_name}</p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className={`text-right min-w-[100px] ${
                          txn.transaction_type === "DEBIT" ? "text-gray-900" : "text-green-600"
                        }`}>
                          <span className="text-sm font-medium">
                            {txn.transaction_type === "DEBIT" ? "-" : "+"}
                            {formatCurrency(amount, txn.currency)}
                          </span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />

                        {/* Matched Item */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs h-5 px-1.5 bg-gray-50">
                              {txn.matched_to_type === 'invoice' ? 'INV' : 'BILL'}
                            </Badge>
                            <span className="text-sm text-gray-900">#{txn.matched_to_reference}</span>
                            <Badge className="text-xs h-5 px-1.5 bg-amber-100 text-amber-700 border-0">
                              {confidence}%
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => approveMutation.mutate({
                              transactionId: txn.id,
                              matchType: txn.matched_to_type,
                              matchId: txn.matched_to_id,
                              amount: txn.matched_amount || amount,
                            })}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => rejectMutation.mutate(txn.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-gray-400"
                            onClick={() => setExpandedTransaction(isExpanded ? null : txn.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex gap-6 text-xs text-gray-500">
                            <div>
                              <span className="text-gray-400">Match rules:</span>{' '}
                              {txn.match_rules_applied?.map(r => r.replace(/_/g, ' ')).join(', ') || 'None'}
                            </div>
                            <div>
                              <span className="text-gray-400">Bank:</span> {txn.source_provider || 'Unknown'}
                            </div>
                            <div>
                              <span className="text-gray-400">Reference:</span> {txn.reference || 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Unmatched Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-medium text-gray-700">
                  Bank Transactions ({unmatchedTransactions.length})
                </h2>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {unmatchedLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto" />
                </div>
              ) : unmatchedTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {unmatchedTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {format(new Date(txn.transaction_date), "dd MMM")}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              txn.transaction_type === "DEBIT"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-green-50 text-green-600"
                            }`}>
                              {txn.transaction_type === "DEBIT" ? "OUT" : "IN"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium truncate mt-0.5">
                            {txn.description}
                          </p>
                          {txn.counterparty_name && (
                            <p className="text-xs text-gray-500 truncate">{txn.counterparty_name}</p>
                          )}
                        </div>
                        <div className={`text-right ml-4 ${
                          txn.transaction_type === "DEBIT" ? "text-gray-900" : "text-green-600"
                        }`}>
                          <p className="text-sm font-semibold">
                            {txn.transaction_type === "DEBIT" ? "-" : "+"}
                            {formatCurrency(txn.amount, txn.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invoices & Bills */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-medium text-gray-700">
                  Invoices & Bills ({(reconciliationItems?.total_invoices || 0) + (reconciliationItems?.total_bills || 0)})
                </h2>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {itemsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto" />
                </div>
              ) : (!reconciliationItems?.invoices?.length && !reconciliationItems?.bills?.length) ? (
                <div className="p-8 text-center">
                  <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No items to match</p>
                  <p className="text-xs text-gray-400 mt-1">Sync from Xero to see items</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {/* Invoices */}
                  {reconciliationItems?.invoices?.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-50 text-green-600">
                              INV
                            </span>
                            <span className="text-xs text-gray-500">#{inv.invoice_number}</span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium truncate mt-0.5">
                            {inv.contact}
                          </p>
                          <p className="text-xs text-gray-500">
                            Due {inv.due_date ? format(new Date(inv.due_date), "dd MMM") : "N/A"}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-green-600">
                            +{formatCurrency(inv.amount_due, inv.currency_code)}
                          </p>
                          <span className="text-xs text-gray-400">{inv.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Bills */}
                  {reconciliationItems?.bills?.map((bill: any) => (
                    <div
                      key={bill.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-50 text-orange-600">
                              BILL
                            </span>
                            <span className="text-xs text-gray-500">#{bill.invoice_number}</span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium truncate mt-0.5">
                            {bill.contact}
                          </p>
                          <p className="text-xs text-gray-500">
                            Paid {formatCurrency(bill.amount_paid, bill.currency_code)}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-gray-900">
                            -{formatCurrency(bill.amount_paid, bill.currency_code)}
                          </p>
                          <span className="text-xs text-gray-400">{bill.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Matched Transactions (Pending Post) */}
        {matchedTransactions.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-medium text-gray-700">
                Matched - Pending Post ({matchedTransactions.length})
              </h2>
            </div>
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {matchedTransactions.map((txn) => (
                  <div key={txn.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {format(new Date(txn.transaction_date), "dd MMM")}
                        </span>
                        <span className="text-sm text-gray-900">{txn.description}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-medium ${
                          txn.transaction_type === "DEBIT" ? "text-gray-900" : "text-green-600"
                        }`}>
                          {txn.transaction_type === "DEBIT" ? "-" : "+"}
                          {formatCurrency(txn.amount, txn.currency)}
                        </span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                          Matched
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Pill Component
function StatPill({
  label,
  value,
  color,
  showDot = false
}: {
  label: string;
  value: number;
  color: 'orange' | 'amber' | 'blue' | 'green';
  showDot?: boolean;
}) {
  const colors = {
    orange: 'text-orange-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
  };

  return (
    <div className="flex items-center gap-2">
      {showDot && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${colors[color]}`}>{value}</span>
    </div>
  );
}
