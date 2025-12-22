"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowRightLeft, 
  Calendar,
  DollarSign,
  Filter,
  Search,
  Smartphone,
  Building2,
  CreditCard
} from "lucide-react";
import { api } from "@/lib/api";
import { MatchingModal } from "./matching-modal";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: number;
  transaction_date: string;
  description: string;
  amount: number;
  credit_amount: number | null;
  debit_amount: number | null;
  currency: string;
  source_type: string;
  source_provider: string;
  counterparty_name: string;
  match_status: string;
  transaction_type: string;
  reference: string;
}

const sourceIcons: Record<string, any> = {
  bank: Building2,
  mobile_money: Smartphone,
  credit_card: CreditCard,
};

export function ReconciliationDashboard() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions, isLoading, refetch } = useQuery<{results: Transaction[]}>({
    queryKey: ["unmatched-transactions", sourceFilter],
    queryFn: async () => {
      const sourceParam = sourceFilter !== "all" ? `&source_type=${sourceFilter}` : "";
      const response = await api.get<{results: Transaction[]}>(
        `/api/v1/banking/transactions/?match_status=unmatched${sourceParam}`
      );
      return response;
    },
  });

  const filteredTransactions = transactions?.results?.filter((tx) =>
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.counterparty_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.reference?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Reconciliation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Match unmatched transactions to invoices and bills
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#638C80]/20 focus:border-[#638C80]"
          />
        </div>
        
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-[200px] border-gray-200">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="bank">Bank Statements</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="credit_card">Credit Cards</SelectItem>
          </SelectContent>
        </Select>
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
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12 border border-gray-100 rounded-lg bg-gray-50">
          <ArrowRightLeft className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No unmatched transactions
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            All transactions have been matched or there are no transactions to reconcile.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => {
            const SourceIcon = sourceIcons[transaction.source_type] || Building2;
            const amount = transaction.credit_amount || transaction.debit_amount || 0;
            const isCredit = transaction.transaction_type === "CREDIT";

            return (
              <div
                key={transaction.id}
                className="group p-6 border border-gray-100 rounded-lg hover:border-[#638C80]/30 hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-[#638C80]/10 transition-colors">
                        <SourceIcon className="h-4 w-4 text-gray-600 group-hover:text-[#638C80]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">
                          {transaction.description}
                        </h3>
                        {transaction.counterparty_name && (
                          <p className="text-sm text-gray-600 truncate">
                            {transaction.counterparty_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                      </div>
                      {transaction.source_provider && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.source_provider}
                        </Badge>
                      )}
                      {transaction.reference && (
                        <span className="text-xs text-gray-500">
                          Ref: {transaction.reference}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount & Action */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${
                          isCredit ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(amount, transaction.currency)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {isCredit ? "Received" : "Paid"}
                      </div>
                    </div>

                    <Button
                      onClick={() => setSelectedTransaction(transaction)}
                      className="bg-[#638C80] hover:bg-[#4f7068] text-white shadow-sm"
                    >
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Match
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Matching Modal */}
      {selectedTransaction && (
        <MatchingModal
          transaction={selectedTransaction}
          open={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSuccess={() => {
            setSelectedTransaction(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
