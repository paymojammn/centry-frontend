"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganizations } from "@/hooks/use-organization";
import {
  useBankPaymentExports,
  useERPConnections,
  useUploadBankFile,
  useAutoReconcile,
  useBankAccounts,
} from "@/hooks/use-banking";
import {
  Search,
  Building2,
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  RefreshCw,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<"imports" | "exports">("imports");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportStatusFilter, setExportStatusFilter] = useState("all");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsData } = useERPConnections();
  const { data: bankAccountsData } = useBankAccounts(selectedOrganizationId || undefined);

  const erpConnections = erpConnectionsData?.connections || [];
  const bankAccounts = (bankAccountsData as any)?.results || [];
  const uploadMutation = useUploadBankFile();
  const autoReconcileMutation = useAutoReconcile();

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Fetch imported transactions
  const { data: transactionsData, isLoading: importsLoading } = useQuery<{ results: ImportedTransaction[] }>({
    queryKey: ["bank-transactions", searchQuery, typeFilter, statusFilter, selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (typeFilter !== "all") params.append("transaction_type", typeFilter);
      if (statusFilter !== "all") params.append("match_status", statusFilter);
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId && activeTab === "imports",
  });

  // Fetch exports
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

  // Stats
  const importStats = {
    total: importedTransactions.length,
    debits: importedTransactions.filter(t => t.transaction_type === "DEBIT").reduce((s, t) => s + t.amount, 0),
    credits: importedTransactions.filter(t => t.transaction_type === "CREDIT").reduce((s, t) => s + t.amount, 0),
    posted: importedTransactions.filter(t => t.match_status === "posted").length,
  };

  const exportStats = {
    files: exports.length,
    payments: exports.reduce((s, e) => s + e.payment_count, 0),
    amount: exports.reduce((s, e) => s + parseFloat(e.total_amount), 0),
    uploaded: exports.filter(e => e.status === "uploaded").length,
  };

  const filteredExports = exports.filter(exp => {
    const matchesSearch = !searchQuery || exp.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = exportStatusFilter === "all" || exp.status === exportStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleFileUpload = async () => {
    if (!selectedFile || !selectedBankAccount) {
      toast.error("Please select a file and bank account");
      return;
    }
    const erpConnection = erpConnections.find((c: any) => c.organization?.id === selectedOrganizationId);
    if (!erpConnection) {
      toast.error("No ERP connection found");
      return;
    }
    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        bank_account: parseInt(selectedBankAccount),
        erp_connection: erpConnection.id,
      });
      toast.success("Bank statement uploaded!");
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedBankAccount("");
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    } catch (error: any) {
      toast.error(error.message || "Upload failed");
    }
  };

  const handleAutoReconcile = async () => {
    if (!selectedOrganizationId) return;
    const erpConnection = erpConnections.find((c: any) => c.organization?.id === selectedOrganizationId);
    if (!erpConnection) {
      toast.error("No ERP connection found");
      return;
    }
    try {
      const result = await autoReconcileMutation.mutateAsync({
        organization: selectedOrganizationId,
        erp_connection: erpConnection.id,
        min_confidence: 0.7,
        auto_apply: false,
      });
      toast.success(`Found ${(result as any).matches_found || 0} matches`);
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
    } catch (error: any) {
      toast.error(error.message || "Auto-reconcile failed");
    }
  };

  const toggleTransaction = (id: string) => {
    setSelectedTransactions(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTransactions(
      selectedTransactions.length === importedTransactions.length
        ? []
        : importedTransactions.map(t => t.id)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={(value) => {
                  setSelectedOrganizationId(value);
                  setSelectedExportId(null);
                }}
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
                onClick={() => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] })}
                className="h-9"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setUploadDialogOpen(true)}
                className="h-9 bg-[#638C80] hover:bg-[#547568]"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => { setActiveTab("imports"); setSearchQuery(""); }}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "imports"
                  ? "border-[#638C80] text-[#638C80]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4 inline mr-2" />
              Imported ({importStats.total})
            </button>
            <button
              onClick={() => { setActiveTab("exports"); setSearchQuery(""); }}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "exports"
                  ? "border-[#638C80] text-[#638C80]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4 inline mr-2" />
              Exported ({exportStats.files})
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {activeTab === "imports" ? (
            <div className="flex items-center gap-6 text-sm">
              <StatPill label="Total" value={importStats.total} color="blue" />
              <StatPill label="Debits" value={`-${formatCurrency(importStats.debits, "UGX")}`} color="orange" />
              <StatPill label="Credits" value={`+${formatCurrency(importStats.credits, "UGX")}`} color="green" />
              <StatPill label="Posted" value={importStats.posted} color="teal" />
              {selectedTransactions.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="secondary" className="bg-[#638C80]/10 text-[#638C80]">
                    {selectedTransactions.length} selected
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-6 text-sm">
              <StatPill label="Files" value={exportStats.files} color="blue" />
              <StatPill label="Payments" value={exportStats.payments} color="amber" />
              <StatPill label="Total" value={formatCurrency(exportStats.amount, "UGX")} color="orange" />
              <StatPill label="Uploaded" value={exportStats.uploaded} color="green" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "imports" ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-white border-gray-200"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-9 bg-white border-gray-200">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 bg-white border-gray-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoReconcile}
                  disabled={autoReconcileMutation.isPending}
                  className="h-9"
                >
                  {autoReconcileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Auto Match
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {importsLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : importedTransactions.length === 0 ? (
                <div className="p-12 text-center">
                  <ArrowDownToLine className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No transactions found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="w-10 px-4 py-3">
                        <Checkbox
                          checked={selectedTransactions.length === importedTransactions.length && importedTransactions.length > 0}
                          onCheckedChange={selectAll}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importedTransactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className={`hover:bg-gray-50 ${selectedTransactions.includes(txn.id) ? 'bg-[#638C80]/5' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedTransactions.includes(txn.id)}
                            onCheckedChange={() => toggleTransaction(txn.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {format(new Date(txn.transaction_date), "dd MMM yyyy")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                              {txn.description}
                            </p>
                            {txn.counterparty_name && (
                              <p className="text-xs text-gray-500">{txn.counterparty_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">
                            {txn.source_provider || txn.bank_name || txn.source_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            txn.transaction_type === "DEBIT"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-green-50 text-green-600"
                          }`}>
                            {txn.transaction_type === "DEBIT" ? "OUT" : "IN"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${
                            txn.transaction_type === "DEBIT" ? "text-gray-900" : "text-green-600"
                          }`}>
                            {txn.transaction_type === "DEBIT" ? "-" : "+"}
                            {formatCurrency(txn.amount, txn.currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={txn.match_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Exports Tab */
          <div className="grid grid-cols-2 gap-6">
            {/* Export Files */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 bg-white border-gray-200"
                  />
                </div>
                <Select value={exportStatusFilter} onValueChange={setExportStatusFilter}>
                  <SelectTrigger className="w-[120px] h-9 bg-white border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="uploaded">Uploaded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {exportsLoading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : filteredExports.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No export files</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {filteredExports.map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedExportId(exp.id)}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          selectedExportId === exp.id
                            ? "bg-[#638C80]/5 border-l-2 border-l-[#638C80]"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{exp.file_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {exp.bank_account?.account_name} · {exp.payment_count} payments
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(new Date(exp.created_at), "dd MMM yyyy, HH:mm")}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(parseFloat(exp.total_amount), exp.currency)}
                            </p>
                            <ExportStatusBadge status={exp.status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payments */}
            <div>
              <div className="flex items-center gap-2 mb-4 h-9">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedExportId ? `${exportPayments.length} Payments` : "Select a file"}
                </span>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {!selectedExportId ? (
                  <div className="p-12 text-center">
                    <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Select a file to view payments</p>
                  </div>
                ) : paymentsLoading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : exportPayments.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm text-gray-500">No payments</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {exportPayments.map((payment) => (
                      <div key={payment.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{payment.beneficiary_name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {payment.beneficiary_account && `${payment.beneficiary_account} · `}
                              {payment.beneficiary_bank}
                            </p>
                            {payment.bill_number && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Bill: {payment.bill_number}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              -{formatCurrency(parseFloat(payment.amount), payment.currency)}
                            </p>
                            {payment.payment_date && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {format(new Date(payment.payment_date), "dd MMM")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Bank Statement</DialogTitle>
            <DialogDescription>
              Upload CSV, Excel, MT940, or CAMT.053 files
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bank Account</label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">File</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  selectedFile ? "border-[#638C80] bg-[#638C80]/5" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.xml,.mt940,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {selectedFile ? (
                  <div>
                    <FileText className="h-6 w-6 mx-auto text-[#638C80] mb-2" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setSelectedFile(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleFileUpload}
              disabled={!selectedFile || !selectedBankAccount || uploadMutation.isPending}
              className="bg-[#638C80] hover:bg-[#547568]"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600",
    orange: "text-orange-600",
    green: "text-green-600",
    teal: "text-[#638C80]",
    amber: "text-amber-600",
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${colors[color] || "text-gray-900"}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unmatched: "bg-amber-50 text-amber-600",
    suggested: "bg-blue-50 text-blue-600",
    matched: "bg-green-50 text-green-600",
    posted: "bg-[#638C80]/10 text-[#638C80]",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded font-medium ${styles[status] || "bg-gray-50 text-gray-600"}`}>
      {status}
    </span>
  );
}

function ExportStatusBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; icon: React.ReactNode }> = {
    pending: { style: "bg-amber-50 text-amber-600", icon: <Clock className="h-3 w-3" /> },
    generated: { style: "bg-blue-50 text-blue-600", icon: <FileText className="h-3 w-3" /> },
    uploaded: { style: "bg-green-50 text-green-600", icon: <CheckCircle2 className="h-3 w-3" /> },
    failed: { style: "bg-red-50 text-red-600", icon: <XCircle className="h-3 w-3" /> },
  };
  const { style, icon } = config[status] || { style: "bg-gray-50 text-gray-600", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded font-medium mt-1 ${style}`}>
      {icon}
      {status}
    </span>
  );
}
