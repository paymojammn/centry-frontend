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
  Sparkles
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
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-3">
            <div className="p-2 bg-[#638C80]/10 rounded-lg">
              <Receipt className="h-7 w-7 text-[#638C80]" />
            </div>
            Bank Reconciliation
          </h1>
          <p className="text-gray-600 mt-2 ml-[52px]">
            Match bank transactions with invoices and bills
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Organization Selector */}
          <Select
            value={selectedOrganizationId || undefined}
            onValueChange={setSelectedOrganizationId}
            disabled={orgsLoading || !organizations?.length}
          >
            <SelectTrigger className="w-[280px] border-gray-200 shadow-sm">
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
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
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
            className="gap-2"
            variant={activeConnectionId ? 'default' : 'secondary'}
            title={
              !selectedOrganizationId
                ? 'Select an organization first'
                : !activeConnectionId
                  ? 'No ERP connection for this organization'
                  : isSyncing
                    ? 'Syncing invoices...'
                    : 'Sync invoices from Xero'
            }
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Invoices'}
          </Button>

          {/* Auto Reconcile Button */}
          <Button
            onClick={handleAutoReconcile}
            disabled={isAutoReconciling || !activeConnectionId}
            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            title={
              !selectedOrganizationId
                ? 'Select an organization first'
                : !activeConnectionId
                  ? 'No ERP connection for this organization'
                  : isAutoReconciling
                    ? 'AI matching in progress...'
                    : 'Auto-match transactions using AI'
            }
          >
            <Sparkles className={`h-4 w-4 ${isAutoReconciling ? 'animate-pulse' : ''}`} />
            {isAutoReconciling ? 'Matching...' : 'AI Auto-Reconcile'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">To Reconcile</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {stats?.unmatched_count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatCurrency(stats?.total_unmatched_amount || 0, "KES")}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {stats?.matched_count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Awaiting reconciliation</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reconciled</p>
              <p className="text-2xl font-bold text-[#638C80] mt-2">
                {stats?.posted_count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">Posted to ERP</p>
            </div>
            <div className="p-3 bg-[#638C80]/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-[#638C80]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Bank Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by Bank:</label>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-[250px]">
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

      {/* Two-column reconciliation layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Bank Transactions */}
        <Card className="border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-black flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#638C80]" />
              Unmatched Transactions ({unmatchedTransactions.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Bank transactions awaiting reconciliation
            </p>
          </div>
          <div className="p-6">
            {unmatchedLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading transactions...
              </div>
            ) : unmatchedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No transactions to reconcile</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {unmatchedTransactions.map((transaction) => (
                  <Card key={transaction.id} className="p-4 border border-gray-200 hover:border-[#638C80] transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={transaction.transaction_type === "DEBIT" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {transaction.transaction_type}
                          </Badge>
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
                        <p className={`text-lg font-semibold ${transaction.transaction_type === "DEBIT" ? "text-red-600" : "text-green-600"}`}>
                          {transaction.transaction_type === "DEBIT" ? "-" : "+"}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Invoices & Bills */}
        <Card className="border-gray-100 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-black flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#638C80]" />
              Invoices & Bills
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Outstanding invoices and paid bills awaiting reconciliation
            </p>
          </div>
          <div className="p-6">
            {itemsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading items...
              </div>
            ) : (!reconciliationItems?.invoices?.length && !reconciliationItems?.bills?.length) ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items to reconcile</h3>
                <p className="text-gray-500">Sync invoices and bills from Xero to see them here</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Sales Invoices */}
                {reconciliationItems?.invoices && reconciliationItems.invoices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                      Sales Invoices ({reconciliationItems.invoices.length})
                    </h3>
                    <div className="space-y-2">
                      {reconciliationItems.invoices.map((invoice: any) => (
                        <Card key={invoice.id} className="p-4 border border-green-200 bg-green-50/30 hover:border-green-400 transition-colors cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-green-100 text-green-800">INVOICE</Badge>
                                <span className="text-xs text-gray-600">#{invoice.invoice_number}</span>
                              </div>
                              <p className="font-medium text-gray-900">{invoice.contact}</p>
                              <p className="text-xs text-gray-600">
                                Due: {invoice.due_date ? format(new Date(invoice.due_date), "MMM dd, yyyy") : "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(invoice.amount_due, invoice.currency_code)}
                              </p>
                              <Badge className="bg-orange-100 text-orange-800 text-xs">{invoice.status}</Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bills Awaiting Reconciliation */}
                {reconciliationItems?.bills && reconciliationItems.bills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      Bills Paid via Bank ({reconciliationItems.bills.length})
                    </h3>
                    <div className="space-y-2">
                      {reconciliationItems.bills.map((bill: any) => (
                        <Card key={bill.id} className="p-4 border border-red-200 bg-red-50/30 hover:border-red-400 transition-colors cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-red-100 text-red-800">BILL</Badge>
                                <span className="text-xs text-gray-600">#{bill.invoice_number}</span>
                              </div>
                              <p className="font-medium text-gray-900">{bill.contact}</p>
                              <p className="text-xs text-gray-600">
                                Paid: {formatCurrency(bill.amount_paid, bill.currency_code)} via {bill.payment_method}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-red-600">
                                -{formatCurrency(bill.amount_paid, bill.currency_code)}
                              </p>
                              <Badge className="bg-[#638C80]/20 text-[#638C80] text-xs">{bill.status}</Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
