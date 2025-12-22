"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Search
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

  // Filter by search term
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
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Synced
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "SKIPPED":
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            Skipped
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load transactions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
            <Search className="h-5 w-5 text-[#638C80]" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Transactions</CardTitle>
            <CardDescription className="mt-0.5">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search description, reference, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl shadow-sm transition-all focus:bg-white focus:border-[#638C80] focus:ring-2 focus:ring-[#638C80]/20"
            />
          </div>
          <Select value={transactionType} onValueChange={setTransactionType}>
            <SelectTrigger className="w-full sm:w-[150px] h-11 bg-gray-50 border-gray-200 rounded-xl">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="DEBIT">Debit</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={syncFilter} onValueChange={setSyncFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-11 bg-gray-50 border-gray-200 rounded-xl">
              <SelectValue placeholder="Sync Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Search className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                  <TableHead className="font-semibold text-gray-600">Date</TableHead>
                  <TableHead className="font-semibold text-gray-600">Description</TableHead>
                  <TableHead className="font-semibold text-gray-600">Reference</TableHead>
                  <TableHead className="font-semibold text-gray-600">Type</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx, index) => (
                  <TableRow
                    key={tx.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="font-medium text-gray-700">
                      {format(new Date(tx.transaction_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="truncate block text-gray-800">{tx.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {tx.reference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                        tx.transaction_type === "DEBIT"
                          ? 'bg-red-50 text-red-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {tx.transaction_type === "DEBIT" ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs font-medium">
                          {tx.transaction_type}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${tx.transaction_type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                        {tx.currency} {parseFloat(tx.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getSyncStatusBadge(tx.sync_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
