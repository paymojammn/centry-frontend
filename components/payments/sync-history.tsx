"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  History as HistoryIcon,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SyncedTransaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
  credit_amount: number | null;
  debit_amount: number | null;
  currency: string;
  matched_to_type: string;
  matched_to_reference: string;
  erp_payment_id: string;
  posted_to_erp_at: string;
  transaction_type: string;
  match_confidence: number;
}

export function SyncHistory() {
  const { data: transactions, isLoading } = useQuery<{results: SyncedTransaction[]}>({
    queryKey: ["sync-history"],
    queryFn: async () => {
      const response = await api.get<{results: SyncedTransaction[]}>(
        "/api/v1/banking/transactions/?match_status=posted"
      );
      return response;
    },
  });

  const syncedTransactions = transactions?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Sync History</h2>
          <p className="text-sm text-gray-600 mt-1">
            View all transactions that have been posted to your ERP
          </p>
        </div>
        {syncedTransactions.length > 0 && (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            {syncedTransactions.length} synced
          </Badge>
        )}
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-6 border border-gray-100 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : syncedTransactions.length === 0 ? (
        <div className="text-center py-12 border border-gray-100 rounded-lg bg-gray-50">
          <HistoryIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No sync history yet
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Transactions synced to your ERP will appear here with their posting details.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {syncedTransactions.map((transaction) => {
            const amount = transaction.credit_amount || transaction.debit_amount || 0;
            const isCredit = transaction.transaction_type === "CREDIT";

            return (
              <div
                key={transaction.id}
                className="p-6 border border-gray-100 rounded-lg hover:shadow-md transition-shadow duration-200 bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">
                          {transaction.description}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="h-4 w-4 text-[#638C80]" />
                        <span className="font-medium text-gray-700">
                          {transaction.matched_to_reference}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize ml-1">
                          {transaction.matched_to_type}
                        </Badge>
                      </div>

                      {transaction.erp_payment_id && (
                        <button className="flex items-center gap-1.5 text-[#638C80] hover:text-[#4f7068] transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">
                            View in ERP
                          </span>
                        </button>
                      )}

                      <span className="text-xs text-gray-500">
                        Synced {format(new Date(transaction.posted_to_erp_at), "MMM dd 'at' h:mm a")}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={`text-lg font-bold ${
                        isCredit ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(amount, transaction.currency)}
                    </div>
                    <Badge className="mt-2 bg-green-50 text-green-700 border-green-200 text-xs">
                      Posted
                    </Badge>
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
