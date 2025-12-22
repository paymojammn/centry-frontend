"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrganizations } from "@/hooks/use-organization";
import { useBankPaymentExports } from "@/hooks/use-banking";
import {
  Receipt,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Loader2,
  FileText,
  Wallet,
  CheckCircle2,
  User,
  Clock,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface ImportedTransaction {
  id: string;
  transaction_date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
  transaction_type: "DEBIT" | "CREDIT";
  currency: string;
  sync_status: string;
  match_status: string;
  source_type: string;
  source_provider: string;
  counterparty_name: string;
  bank_name: string;
  file_import_name: string;
  created_at: string;
}

interface ExportedPayment {
  id: number;
  reference: string;
  amount: string;
  currency: string;
  beneficiary_name: string;
  beneficiary_account: string;
  beneficiary_bank: string;
  bill_number: string;
  bill_description: string;
  payment_date: string;
  status: string;
  bank_reference: string;
  processed_at: string | null;
  error_message: string;
}

interface BankPaymentExport {
  id: number;
  file_name: string;
  total_amount: string;
  currency: string;
  payment_count: number;
  status: string;
  created_at: string;
  bank_account: {
    id: number;
    account_name: string;
    bank_name: string;
  };
}

export default function BankTransactionsPage() {
  const [activeTab, setActiveTab] = useState("imports");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [exportStatusFilter, setExportStatusFilter] = useState("all");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Fetch imported transactions
  const { data: transactionsData, isLoading: importsLoading } = useQuery<{ results: ImportedTransaction[] }>({
    queryKey: ["bank-transactions", searchQuery, typeFilter, statusFilter, sourceFilter, selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter !== "all") params.append("transaction_type", typeFilter);
      if (statusFilter !== "all") params.append("match_status", statusFilter);
      if (sourceFilter !== "all") params.append("source_type", sourceFilter);
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);

      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId && activeTab === "imports",
  });

  // Fetch exported payments
  const { data: exportsData, isLoading: exportsLoading } = useBankPaymentExports({
    organizationId: selectedOrganizationId || undefined,
  });

  // Fetch payments for selected export
  const { data: exportPaymentsData, isLoading: paymentsLoading } = useQuery<{ results: ExportedPayment[] }>({
    queryKey: ["export-payments", selectedExportId],
    queryFn: () => api.get(`/api/v1/banking/exports/${selectedExportId}/payments/`),
    enabled: !!selectedExportId && activeTab === "exports",
  });

  const importedTransactions = transactionsData?.results || [];
  const exports = exportsData?.results || [];
  const exportPayments = exportPaymentsData?.results || [];

  // Calculate import stats
  const importStats = {
    total: importedTransactions.length,
    total_debit: importedTransactions
      .filter((t) => t.transaction_type === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0),
    total_credit: importedTransactions
      .filter((t) => t.transaction_type === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0),
    posted: importedTransactions.filter((t) => t.match_status === "posted").length,
  };

  // Calculate export stats
  const exportStats = {
    total_exports: exports.length,
    total_payments: exports.reduce((sum, e) => sum + e.payment_count, 0),
    total_amount: exports.reduce((sum, e) => sum + parseFloat(e.total_amount), 0),
    uploaded: exports.filter((e) => e.status === "uploaded").length,
  };

  // Filter exports
  const filteredExports = exports.filter((exp) => {
    const matchesSearch = searchQuery === "" ||
      exp.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.bank_account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = exportStatusFilter === "all" || exp.status === exportStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTransactionTypeBadge = (type: string) => {
    if (type === "DEBIT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Debit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
        <ArrowDownCircle className="h-3.5 w-3.5" />
        Credit
      </span>
    );
  };

  const getMatchStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon?: React.ReactNode }> = {
      unmatched: { bg: "bg-amber-50", text: "text-amber-700", label: "Unmatched" },
      suggested: { bg: "bg-blue-50", text: "text-blue-700", label: "Suggested" },
      matched: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Matched" },
      reviewed: { bg: "bg-purple-50", text: "text-purple-700", label: "Reviewed" },
      posted: { bg: "bg-[#638C80]/10", text: "text-[#638C80]", label: "Posted", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    };
    const badge = badges[status] || { bg: "bg-gray-50", text: "text-gray-700", label: status };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${badge.bg} ${badge.text} text-xs font-medium`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getExportStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pending", icon: <Clock className="h-3.5 w-3.5" /> },
      generated: { bg: "bg-blue-50", text: "text-blue-700", label: "Generated", icon: <FileText className="h-3.5 w-3.5" /> },
      uploaded: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Uploaded", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      processed: { bg: "bg-[#638C80]/10", text: "text-[#638C80]", label: "Processed", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      failed: { bg: "bg-red-50", text: "text-red-700", label: "Failed", icon: <XCircle className="h-3.5 w-3.5" /> },
    };
    const badge = badges[status] || { bg: "bg-gray-50", text: "text-gray-700", label: status, icon: null };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${badge.bg} ${badge.text} text-xs font-medium`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "mobile_money":
        return <Wallet className="h-4 w-4 text-purple-500" />;
      case "credit_card":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "bank":
        return <Building2 className="h-4 w-4 text-[#638C80]" />;
      case "payment_gateway":
        return <Receipt className="h-4 w-4 text-orange-500" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Receipt className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-white">Transactions</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  View all imported and exported bank transactions.
                </p>
              </div>

              {/* Organization Selector */}
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={(value) => {
                  setSelectedOrganizationId(value);
                  setSelectedExportId(null);
                }}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[280px] bg-white/95 backdrop-blur-sm border-white/20 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#638C80]" />
                    <SelectValue placeholder="Select organization..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        {org.external_id?.startsWith('xero_') && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                            Xero
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            setSearchQuery("");
          }} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
              <TabsList className="bg-gray-50 p-1 rounded-xl w-full grid grid-cols-2 gap-1">
                <TabsTrigger
                  value="imports"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-[#638C80] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 transition-all hover:text-[#638C80]"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Imported Transactions
                </TabsTrigger>
                <TabsTrigger
                  value="exports"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-[#638C80] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 transition-all hover:text-[#638C80]"
                >
                  <ArrowUpFromLine className="h-4 w-4 mr-2" />
                  Exported Payments
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Imported Transactions Tab */}
            <TabsContent value="imports" className="space-y-6">
              {/* Import Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-[#4E97D1] mt-2">{importStats.total}</p>
                    </div>
                    <div className="p-3 bg-[#4E97D1]/10 rounded-lg">
                      <Receipt className="h-6 w-6 text-[#4E97D1]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Debits</p>
                      <p className="text-2xl font-bold text-[#f77f00] mt-2">
                        {formatCurrency(importStats.total_debit, "KES")}
                      </p>
                    </div>
                    <div className="p-3 bg-[#f77f00]/10 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-[#f77f00]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Credits</p>
                      <p className="text-2xl font-bold text-[#49a034] mt-2">
                        {formatCurrency(importStats.total_credit, "KES")}
                      </p>
                    </div>
                    <div className="p-3 bg-[#49a034]/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-[#49a034]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Posted to ERP</p>
                      <p className="text-2xl font-bold text-[#638C80] mt-2">{importStats.posted}</p>
                    </div>
                    <div className="p-3 bg-[#638C80]/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-[#638C80]" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Import Transactions Card */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                      <ArrowDownToLine className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold text-gray-900">Imported Transactions</CardTitle>
                      <CardDescription className="mt-0.5">Bank statement transactions synced from your accounts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by description, reference, or counterparty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl shadow-sm transition-all focus:bg-white focus:border-[#638C80] focus:ring-2 focus:ring-[#638C80]/20"
                      />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] h-11 bg-gray-50 border-gray-200 rounded-xl">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="DEBIT">Debit</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[150px] h-11 bg-gray-50 border-gray-200 rounded-xl">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="unmatched">Unmatched</SelectItem>
                        <SelectItem value="matched">Matched</SelectItem>
                        <SelectItem value="posted">Posted</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-full sm:w-[180px] h-11 bg-gray-50 border-gray-200 rounded-xl">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="payment_gateway">Payment Gateway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Loading/Empty/Table */}
                  {importsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-[#638C80]" />
                    </div>
                  ) : importedTransactions.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <ArrowDownToLine className="h-8 w-8 text-gray-300" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No imported transactions</h3>
                      <p className="text-gray-500 text-sm">
                        {searchQuery || typeFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all"
                          ? "Try adjusting your filters"
                          : "Import bank statements to see transactions here"}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80 border-b border-gray-100">
                            <TableHead className="font-semibold text-gray-600">Date</TableHead>
                            <TableHead className="font-semibold text-gray-600">Description</TableHead>
                            <TableHead className="font-semibold text-gray-600">Source</TableHead>
                            <TableHead className="font-semibold text-gray-600">Type</TableHead>
                            <TableHead className="text-right font-semibold text-gray-600">Amount</TableHead>
                            <TableHead className="text-right font-semibold text-gray-600">Balance</TableHead>
                            <TableHead className="font-semibold text-gray-600">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importedTransactions.map((transaction, index) => (
                            <TableRow
                              key={transaction.id}
                              className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              }`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-gray-100 rounded-lg">
                                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-800">
                                    {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-800">{transaction.description}</p>
                                  {transaction.reference && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                        {transaction.reference}
                                      </span>
                                    </p>
                                  )}
                                  {transaction.counterparty_name && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {transaction.counterparty_name}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-gray-100 rounded-lg">
                                    {getSourceIcon(transaction.source_type)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {transaction.source_provider || transaction.bank_name || transaction.source_type}
                                    </p>
                                    {transaction.file_import_name && (
                                      <p className="text-xs text-gray-500">
                                        {transaction.file_import_name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`font-semibold ${
                                    transaction.transaction_type === "DEBIT"
                                      ? "text-red-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {transaction.transaction_type === "DEBIT" ? "-" : "+"}
                                  {formatCurrency(transaction.amount, transaction.currency)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-sm font-medium text-gray-700">
                                  {formatCurrency(transaction.balance, transaction.currency)}
                                </span>
                              </TableCell>
                              <TableCell>{getMatchStatusBadge(transaction.match_status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Exported Payments Tab */}
            <TabsContent value="exports" className="space-y-6">
              {/* Export Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Export Files</p>
                      <p className="text-2xl font-bold text-[#4E97D1] mt-2">{exportStats.total_exports}</p>
                    </div>
                    <div className="p-3 bg-[#4E97D1]/10 rounded-lg">
                      <FileText className="h-6 w-6 text-[#4E97D1]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Payments</p>
                      <p className="text-2xl font-bold text-[#fed652] mt-2">{exportStats.total_payments}</p>
                    </div>
                    <div className="p-3 bg-[#fed652]/10 rounded-lg">
                      <ArrowUpFromLine className="h-6 w-6 text-[#fed652]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-[#f77f00] mt-2">
                        {formatCurrency(exportStats.total_amount, "UGX")}
                      </p>
                    </div>
                    <div className="p-3 bg-[#f77f00]/10 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-[#f77f00]" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Uploaded to Bank</p>
                      <p className="text-2xl font-bold text-[#49a034] mt-2">{exportStats.uploaded}</p>
                    </div>
                    <div className="p-3 bg-[#49a034]/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-[#49a034]" />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Export Files List */}
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-50 rounded-xl">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Export Files</CardTitle>
                        <CardDescription className="mt-0.5">Select a file to view its payments</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Search & Filter */}
                    <div className="flex gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search export files..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl shadow-sm transition-all focus:bg-white focus:border-[#638C80] focus:ring-2 focus:ring-[#638C80]/20"
                        />
                      </div>
                      <Select value={exportStatusFilter} onValueChange={setExportStatusFilter}>
                        <SelectTrigger className="w-[140px] h-11 bg-gray-50 border-gray-200 rounded-xl">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="generated">Generated</SelectItem>
                          <SelectItem value="uploaded">Uploaded</SelectItem>
                          <SelectItem value="processed">Processed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Export Files List */}
                    {exportsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#638C80]" />
                      </div>
                    ) : filteredExports.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <ArrowUpFromLine className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No export files</h3>
                        <p className="text-gray-500 text-sm">Export payments from Bills to see them here</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {filteredExports.map((exp) => (
                          <div
                            key={exp.id}
                            onClick={() => setSelectedExportId(exp.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedExportId === exp.id
                                ? "border-[#638C80] bg-[#638C80]/5 shadow-md"
                                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  selectedExportId === exp.id ? "bg-[#638C80]/10" : "bg-gray-100"
                                }`}>
                                  <FileText className={`h-4 w-4 ${
                                    selectedExportId === exp.id ? "text-[#638C80]" : "text-gray-500"
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800 text-sm">{exp.file_name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {exp.bank_account?.account_name} • {exp.payment_count} payments
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {format(new Date(exp.created_at), "MMM dd, yyyy 'at' HH:mm")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 text-sm">
                                  {formatCurrency(parseFloat(exp.total_amount), exp.currency)}
                                </p>
                                <div className="mt-1">
                                  {getExportStatusBadge(exp.status)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Export Payments Detail */}
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-50 rounded-xl">
                        <User className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-semibold text-gray-900">Payments</CardTitle>
                        <CardDescription className="mt-0.5">
                          {selectedExportId ? `${exportPayments.length} payment(s) in selected file` : "Select an export file to view payments"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {!selectedExportId ? (
                      <div className="text-center py-12">
                        <div className="p-4 bg-amber-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
                        <p className="text-gray-500 text-sm">Select an export file from the list to view its payments</p>
                      </div>
                    ) : paymentsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#638C80]" />
                      </div>
                    ) : exportPayments.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                        <p className="text-gray-500 text-sm">This export file has no linked payments</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {exportPayments.map((payment, index) => (
                          <div
                            key={payment.id}
                            className={`p-4 rounded-xl border border-gray-100 ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <User className="h-4 w-4 text-gray-500" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{payment.beneficiary_name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {payment.beneficiary_account && `${payment.beneficiary_account} • `}
                                    {payment.beneficiary_bank}
                                  </p>
                                  {payment.bill_number && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Bill: <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{payment.bill_number}</span>
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    Ref: <span className="font-mono">{payment.reference}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-red-600">
                                  -{formatCurrency(parseFloat(payment.amount), payment.currency)}
                                </p>
                                <div className="mt-1">
                                  {getExportStatusBadge(payment.status === "included" ? "generated" : payment.status)}
                                </div>
                                {payment.payment_date && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
