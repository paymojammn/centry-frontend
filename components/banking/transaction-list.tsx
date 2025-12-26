"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Search,
  List
} from "lucide-react";
import { useBankTransactions } from "@/hooks/use-banking";
import { format } from "date-fns";

interface TransactionListProps {
  fileImportId?: number;
  organizationId?: string;
}

export function TransactionList({ fileImportId, organizationId }: TransactionListProps) {
  const [transactionType, setTransactionType] = useState<string>("all");
  const [syncFilter, setSyncFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useBankTransactions({
    file_import: fileImportId,
    transaction_type: transactionType !== "all" ? transactionType : undefined,
    is_synced: syncFilter === "synced" ? true : syncFilter === "pending" ? false : undefined,
    organizationId,
  });

  const transactions = data?.results || [];

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tx.description.toLowerCase().includes(search) ||
      tx.reference.toLowerCase().includes(search) ||
      tx.amount.includes(searchTerm)
    );
  });

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "SYNCED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Synced
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case "SKIPPED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            <Clock className="h-3 w-3" />
            Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Transactions</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Transactions</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Failed to load transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900">Transactions</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search description, reference, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-white border-gray-200"
            />
          </div>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 bg-white border-gray-200">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="DEBIT">Debit</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={syncFilter} onValueChange={setSyncFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 bg-white border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No transactions found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Description</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Reference</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Type</th>
              <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Amount</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">
                  {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                </td>
                <td className="px-6 py-3 max-w-xs">
                  <span className="text-sm text-gray-900 truncate block">{tx.description}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                    {tx.reference}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    tx.transaction_type === "DEBIT"
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {tx.transaction_type === "DEBIT" ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                    {tx.transaction_type}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <span className={`text-sm font-medium ${tx.transaction_type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                    {tx.currency} {parseFloat(tx.amount).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {getSyncStatusBadge(tx.sync_status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
