"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BankReconciliationItem } from "@/components/banking/bank-reconciliation-item";
import { useOrganizations } from "@/hooks/use-organization";
import { useSyncInvoices, useERPConnections } from "@/hooks/use-erp";
import { useAutoReconcile } from "@/hooks/use-banking";
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
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
  matched_count: number;
  posted_count: number;
  total_unmatched_amount: number;
}

export default function BankReconciliationPage() {
  const [activeTab, setActiveTab] = useState("reconcile");
  const [bankFilter, setBankFilter] = useState("all");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse, isLoading: connectionsLoading } = useERPConnections();
  const { mutate: syncInvoices, isPending: isSyncing } = useSyncInvoices();
  const { mutate: autoReconcile, isPending: isAutoReconciling } = useAutoReconcile();

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Extract connections from paginated response
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Find active ERP connection for selected organization
  useEffect(() => {
    if (!selectedOrganizationId) return;

    // Find connection for selected organization
    const orgConnection = erpConnections?.find(
      (conn: any) => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    if (orgConnection) {
      setActiveConnectionId(orgConnection.id);
    } else {
      setActiveConnectionId(null);
    }
  }, [selectedOrganizationId, erpConnections]);

  // Fetch reconciliation summary stats
  const { data: stats } = useQuery<ReconciliationStats>({
    queryKey: ["bank-reconciliation-stats", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/transactions/reconciliation-summary/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  // Fetch invoices and bills for reconciliation
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

  // Fetch unmatched transactions
  const { data: unmatchedData, isLoading: unmatchedLoading } = useQuery<{ results: BankTransaction[] }>({
    queryKey: ["bank-transactions-unmatched", bankFilter, selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "unmatched");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      if (bankFilter !== "all") params.append("source_provider", bankFilter);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  // Fetch matched transactions
  const { data: matchedData, isLoading: matchedLoading } = useQuery<{ results: BankTransaction[] }>({
    queryKey: ["bank-transactions-matched", bankFilter, selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "matched");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      if (bankFilter !== "all") params.append("source_provider", bankFilter);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  // Fetch posted transactions
  const { data: postedData, isLoading: postedLoading } = useQuery<{ results: BankTransaction[] }>({
    queryKey: ["bank-transactions-posted", bankFilter, selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "posted");
      params.append("source_type", "bank");
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      if (bankFilter !== "all") params.append("source_provider", bankFilter);
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const unmatchedTransactions = unmatchedData?.results || [];
  const matchedTransactions = matchedData?.results || [];
  const postedTransactions = postedData?.results || [];

  // Fetch available banks for filter
  const { data: banksData } = useQuery({
    queryKey: ["bank-providers"],
    queryFn: () => api.get("/api/v1/banking/providers/"),
  });

  // Handle both array format and paginated format { results: [] }
  const banks = Array.isArray(banksData)
    ? banksData
    : (banksData as any)?.results || [];

  const handleTransactionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-unmatched"] });
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-matched"] });
    queryClient.invalidateQueries({ queryKey: ["bank-transactions-posted"] });
    queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-stats"] });
  };

  const handleSyncInvoices = () => {
    // Use the active connection ID we found
    if (activeConnectionId) {
      syncInvoices(activeConnectionId);
    } else {
      // Show error toast if no connection found
      toast.error('No active ERP connection found for this organization');
    }
  };

  const handleAutoReconcile = () => {
    if (!selectedOrganizationId || !activeConnectionId) {
      toast.error('Please select an organization with an active ERP connection');
      return;
    }

    autoReconcile(
      {
        organization: selectedOrganizationId,
        erp_connection: activeConnectionId,
        min_confidence: 0.7,
        auto_apply: true,
      },
      {
        onSuccess: (data: any) => {
          toast.success(
            `Auto-reconciled ${data.matched_count} transactions! ${data.suggested_count} suggestions created.`
          );
        },
        onError: (error: any) => {
          toast.error(`Auto-reconcile failed: ${error.message}`);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
                <p className="text-sm text-gray-500">
                  Match bank transactions with invoices and bills
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Organization Selector */}
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[220px] bg-white border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select organization" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        {org.external_id?.startsWith('xero_') && (
                          <span className="text-[10px] bg-[#49a034]/10 text-[#49a034] px-1.5 py-0.5 rounded">
                            Xero
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sync Invoices Button */}
              <Button
                onClick={handleSyncInvoices}
                disabled={isSyncing || !activeConnectionId}
                variant="outline"
                className="bg-[#638C80] border-[#638C80] text-white hover:bg-[#547568] hover:border-[#547568]"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Invoices'}
              </Button>

              {/* Auto Reconcile Button */}
              <Button
                onClick={handleAutoReconcile}
                disabled={isAutoReconciling || !activeConnectionId}
              >
                <Sparkles className={`h-4 w-4 ${isAutoReconciling ? 'animate-pulse' : ''}`} />
                {isAutoReconciling ? 'Matching...' : 'AI Auto-Reconcile'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Unmatched - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#638C80] via-[#5a8073] to-[#4a6b62] rounded-2xl p-6 text-white shadow-xl shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">To Reconcile</span>
                  </div>
                  {(stats?.unmatched_count || 0) > 0 && (
                    <div className="flex items-center gap-1 text-[#f77f00] text-xs font-medium bg-[#f77f00]/20 px-2 py-1 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Needs Attention
                    </div>
                  )}
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {formatCurrency(stats?.total_unmatched_amount || 0, "KES")}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {stats?.unmatched_count || 0} transactions awaiting reconciliation
                </p>
              </div>
            </div>

            {/* Matched */}
            <StatCard
              icon={Clock}
              label="Matched"
              value={(stats?.matched_count || 0).toString()}
              color="mustard"
              subtitle="Awaiting posting"
            />

            {/* Reconciled */}
            <StatCard
              icon={CheckCircle2}
              label="Reconciled"
              value={(stats?.posted_count || 0).toString()}
              color="green"
              subtitle="Posted to ERP"
            />
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStatCard
              label="Unmatched"
              value={(stats?.unmatched_count || 0).toString()}
              icon={AlertCircle}
              color="orange"
            />
            <MiniStatCard
              label="Matched"
              value={(stats?.matched_count || 0).toString()}
              icon={Clock}
              color="mustard"
            />
            <MiniStatCard
              label="Posted"
              value={(stats?.posted_count || 0).toString()}
              icon={CheckCircle2}
              color="green"
            />
            <MiniStatCard
              label="Invoices"
              value={(reconciliationItems?.total_invoices || 0).toString()}
              icon={Receipt}
              color="blue"
            />
          </div>

          {/* Bank Filter */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Bank:</label>
              <Select value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger className="w-[250px] h-10 bg-white border-gray-200">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {banks.map((bank: any) => (
                    <SelectItem key={bank.id} value={bank.name}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Two-column reconciliation layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Bank Transactions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-lg shadow-[#f77f00]/30 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Unmatched Transactions ({unmatchedTransactions.length})
                    </h2>
                    <p className="text-sm text-gray-500">
                      Bank transactions awaiting reconciliation
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {unmatchedLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading transactions...</p>
                  </div>
                ) : unmatchedTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#49a034]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-[#49a034]" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-500 text-sm">No transactions to reconcile</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {unmatchedTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 rounded-xl border border-gray-200 hover:border-[#638C80] transition-colors cursor-pointer bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                transaction.transaction_type === "DEBIT"
                                  ? "bg-[#f77f00]/10 text-[#f77f00]"
                                  : "bg-[#49a034]/10 text-[#49a034]"
                              }`}>
                                {transaction.transaction_type}
                              </span>
                              <span className="text-sm text-gray-600">
                                {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            {transaction.counterparty_name && (
                              <p className="text-sm text-gray-600">{transaction.counterparty_name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${
                              transaction.transaction_type === "DEBIT" ? "text-[#f77f00]" : "text-[#49a034]"
                            }`}>
                              {transaction.transaction_type === "DEBIT" ? "-" : "+"}
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Invoices & Bills */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-lg shadow-[#4E97D1]/30 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Invoices & Bills</h2>
                    <p className="text-sm text-gray-500">
                      Outstanding invoices and paid bills awaiting reconciliation
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {itemsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading items...</p>
                  </div>
                ) : (!reconciliationItems?.invoices?.length && !reconciliationItems?.bills?.length) ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items to reconcile</h3>
                    <p className="text-gray-500 text-sm">Sync invoices and bills from Xero to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {/* Sales Invoices */}
                    {reconciliationItems?.invoices && reconciliationItems.invoices.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4 text-[#49a034]" />
                          Sales Invoices ({reconciliationItems.invoices.length})
                        </h3>
                        <div className="space-y-2">
                          {reconciliationItems.invoices.map((invoice: any) => (
                            <div key={invoice.id} className="p-4 rounded-xl border border-[#49a034]/30 bg-[#49a034]/5 hover:border-[#49a034] transition-colors cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#49a034]/10 text-[#49a034]">
                                      INVOICE
                                    </span>
                                    <span className="text-xs text-gray-600">#{invoice.invoice_number}</span>
                                  </div>
                                  <p className="font-medium text-gray-900">{invoice.contact}</p>
                                  <p className="text-xs text-gray-600">
                                    Due: {invoice.due_date ? format(new Date(invoice.due_date), "MMM dd, yyyy") : "N/A"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-[#49a034]">
                                    {formatCurrency(invoice.amount_due, invoice.currency_code)}
                                  </p>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f77f00]/10 text-[#f77f00]">
                                    {invoice.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bills Awaiting Reconciliation */}
                    {reconciliationItems?.bills && reconciliationItems.bills.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-[#f77f00]" />
                          Bills Paid via Bank ({reconciliationItems.bills.length})
                        </h3>
                        <div className="space-y-2">
                          {reconciliationItems.bills.map((bill: any) => (
                            <div key={bill.id} className="p-4 rounded-xl border border-[#f77f00]/30 bg-[#f77f00]/5 hover:border-[#f77f00] transition-colors cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#f77f00]/10 text-[#f77f00]">
                                      BILL
                                    </span>
                                    <span className="text-xs text-gray-600">#{bill.invoice_number}</span>
                                  </div>
                                  <p className="font-medium text-gray-900">{bill.contact}</p>
                                  <p className="text-xs text-gray-600">
                                    Paid: {formatCurrency(bill.amount_paid, bill.currency_code)} via {bill.payment_method}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-[#f77f00]">
                                    -{formatCurrency(bill.amount_paid, bill.currency_code)}
                                  </p>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#638C80]/10 text-[#638C80]">
                                    {bill.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component - Using Centry colors
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5',
      icon: 'bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-[#638C80]/30',
      text: 'text-[#638C80]',
      border: 'border-[#638C80]/20',
    },
    blue: {
      bg: 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/5',
      icon: 'bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-[#4E97D1]/30',
      text: 'text-[#4E97D1]',
      border: 'border-[#4E97D1]/20',
    },
    green: {
      bg: 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/5',
      icon: 'bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-[#49a034]/30',
      text: 'text-[#49a034]',
      border: 'border-[#49a034]/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/5',
      icon: 'bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-[#f77f00]/30',
      text: 'text-[#f77f00]',
      border: 'border-[#f77f00]/20',
    },
    mustard: {
      bg: 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/5',
      icon: 'bg-gradient-to-br from-[#fed652] to-[#e6c149] shadow-[#fed652]/30',
      text: 'text-[#d4a843]',
      border: 'border-[#fed652]/20',
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} rounded-2xl p-5 border ${style.border} shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${style.icon} shadow-lg flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${style.text}`}>{value}</div>
      {subtitle && (
        <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Mini Stat Card Component - Using Centry colors
interface MiniStatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
}

function MiniStatCard({ label, value, icon: Icon, color }: MiniStatCardProps) {
  const colorStyles = {
    teal: 'text-[#638C80] bg-[#638C80]/10',
    blue: 'text-[#4E97D1] bg-[#4E97D1]/10',
    green: 'text-[#49a034] bg-[#49a034]/10',
    orange: 'text-[#f77f00] bg-[#f77f00]/10',
    mustard: 'text-[#d4a843] bg-[#fed652]/20',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${colorStyles[color]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
