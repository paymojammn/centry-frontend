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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
            <CheckCircle className="h-3 w-3" />
            Synced
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4944A]/10 text-[#D4944A]">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case "SKIPPED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
            <Clock className="h-3 w-3" />
            Skipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-medium text-foreground">Transactions</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-medium text-foreground">Transactions</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-[#D4944A] mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-medium text-foreground">Transactions</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-border bg-muted/50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search description, reference, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-card border-border"
            />
          </div>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 bg-card border-border">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="DEBIT">Debit</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={syncFilter} onValueChange={setSyncFilter}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 bg-card border-border">
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
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Date</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Description</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Reference</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Type</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted">
                <td className="px-6 py-3 text-sm text-foreground">
                  {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                </td>
                <td className="px-6 py-3 max-w-xs">
                  <span className="text-sm text-foreground truncate block">{tx.description}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                    {tx.reference}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    tx.transaction_type === "DEBIT"
                      ? 'bg-destructive/5 text-destructive'
                      : 'bg-primary/5 text-primary'
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
                  <span className={`text-sm font-medium ${tx.transaction_type === "DEBIT" ? "text-destructive" : "text-primary"}`}>
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
