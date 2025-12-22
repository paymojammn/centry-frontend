"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface MatchedTransaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
  credit_amount: number | null;
  debit_amount: number | null;
  currency: string;
  match_status: string;
  matched_to_type: string;
  matched_to_reference: string;
  matched_to_id: string;
  match_confidence: number;
  transaction_type: string;
}

export function MatchedTransactions() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery<{results: MatchedTransaction[]}>({
    queryKey: ["matched-transactions"],
    queryFn: async () => {
      const response = await api.get<{results: MatchedTransaction[]}>(
        "/api/v1/banking/transactions/?match_status=matched"
      );
      return response;
    },
  });

  const unmatchMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      await api.post(`/api/v1/banking/transactions/${transactionId}/unmatch/`);
    },
    onSuccess: () => {
      toast.success("Match removed successfully");
      queryClient.invalidateQueries({ queryKey: ["matched-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["unmatched-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-summary"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to remove match");
    },
  });

  const bulkSyncMutation = useMutation({
    mutationFn: async (transactionIds: number[]) => {
      const response = await api.post<{synced_count: number; failed_count: number}>(
        "/api/v1/banking/transactions/bulk-sync-to-erp/",
        { transaction_ids: transactionIds }
      );
      return response;
    },
    onSuccess: (data) => {
      toast.success(
        `Successfully synced ${data.synced_count} transaction(s) to ERP`
      );
      if (data.failed_count > 0) {
        toast.error(`${data.failed_count} transaction(s) failed to sync`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["matched-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["sync-history"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-summary"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to sync transactions");
    },
  });

  const matchedTransactions = transactions?.results || [];

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === matchedTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(matchedTransactions.map((tx) => tx.id));
    }
  };

  const handleBulkSync = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select transactions to sync");
      return;
    }
    bulkSyncMutation.mutate(selectedIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Matched Transactions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and sync matched transactions to your ERP
          </p>
        </div>
        {matchedTransactions.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedIds.length} of {matchedTransactions.length} selected
            </span>
            <Button
              onClick={handleBulkSync}
              disabled={selectedIds.length === 0 || bulkSyncMutation.isPending}
              className="bg-[#638C80] hover:bg-[#4f7068] text-white"
            >
              {bulkSyncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Sync Selected to ERP
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 border border-gray-100 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : matchedTransactions.length === 0 ? (
        <div className="text-center py-12 border border-gray-100 rounded-lg bg-gray-50">
          <CheckCircle2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No matched transactions
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Transactions you match will appear here, ready to be synced to your ERP.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          {matchedTransactions.length > 1 && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                checked={selectedIds.length === matchedTransactions.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-gray-700">
                Select all transactions
              </span>
            </div>
          )}

          {/* Transactions */}
          {matchedTransactions.map((transaction) => {
            const amount = transaction.credit_amount || transaction.debit_amount || 0;
            const isCredit = transaction.transaction_type === "CREDIT";
            const isSelected = selectedIds.includes(transaction.id);

            return (
              <div
                key={transaction.id}
                className={`p-6 border rounded-lg transition-all duration-200 ${
                  isSelected
                    ? "border-[#638C80] bg-[#638C80]/5 shadow-md"
                    : "border-gray-100 hover:border-[#638C80]/30 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(transaction.id)}
                    className="mt-1"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">
                          {transaction.description}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          isCredit ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(amount, transaction.currency)}
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="h-4 w-4 text-[#638C80]" />
                        <span className="text-sm font-medium text-gray-700">
                          Matched to:
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {transaction.matched_to_type}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-black">
                          {transaction.matched_to_reference}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-xs font-semibold text-[#638C80] bg-[#638C80]/10"
                        >
                          {Math.round(transaction.match_confidence * 100)}% confidence
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unmatchMutation.mutate(transaction.id)}
                          disabled={unmatchMutation.isPending}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
