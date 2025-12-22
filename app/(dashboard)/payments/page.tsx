"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PaymentReconciliationItem } from "@/components/payments/payment-reconciliation-item";
import { 
  Receipt, 
  AlertCircle,
  CheckCircle2, 
  Clock,
  Wallet
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
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
  counterparty_phone: string;
  bank_name: string;
  file_import_name: string;
}

interface ReconciliationStats {
  unmatched_count: number;
  matched_count: number;
  posted_count: number;
  total_unmatched_amount: number;
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("reconcile");
  const queryClient = useQueryClient();

  // Fetch reconciliation summary stats
  const { data: stats } = useQuery<ReconciliationStats>({
    queryKey: ["reconciliation-stats"],
    queryFn: () => api.get("/api/v1/banking/transactions/reconciliation-summary/"),
  });

  // Fetch unmatched transactions (all sources)
  const { data: unmatchedData, isLoading: unmatchedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ["transactions-unmatched"],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "unmatched");
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  // Fetch matched transactions
  const { data: matchedData, isLoading: matchedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ["transactions-matched"],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "matched");
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  // Fetch posted transactions
  const { data: postedData, isLoading: postedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ["transactions-posted"],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("match_status", "posted");
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  const unmatchedTransactions = unmatchedData?.results || [];
  const matchedTransactions = matchedData?.results || [];
  const postedTransactions = postedData?.results || [];

  const handleTransactionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions-unmatched"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-matched"] });
    queryClient.invalidateQueries({ queryKey: ["transactions-posted"] });
    queryClient.invalidateQueries({ queryKey: ["reconciliation-stats"] });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black flex items-center gap-3">
            <div className="p-2 bg-[#638C80]/10 rounded-lg">
              <Wallet className="h-7 w-7 text-[#638C80]" />
            </div>
            Mobile Money
          </h1>
          <p className="text-gray-600 mt-2 ml-[52px]">
            Match mobile money transactions with invoices and bills
          </p>
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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] bg-gray-50 p-1">
          <TabsTrigger 
            value="reconcile" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#638C80]"
          >
            <AlertCircle className="h-4 w-4" />
            <span>To Reconcile ({unmatchedTransactions.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="matched" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#638C80]"
          >
            <Clock className="h-4 w-4" />
            <span>Matched ({matchedTransactions.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#638C80]"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Reconciled ({postedTransactions.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* To Reconcile Tab */}
        <TabsContent value="reconcile" className="space-y-4">
          {unmatchedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading transactions...
            </div>
          ) : unmatchedTransactions.length === 0 ? (
            <Card className="p-12 text-center border-gray-100">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No transactions to reconcile</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {unmatchedTransactions.map((transaction) => (
                <PaymentReconciliationItem
                  key={transaction.id}
                  transaction={transaction}
                  onUpdate={handleTransactionUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Matched Tab */}
        <TabsContent value="matched" className="space-y-4">
          {matchedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading transactions...
            </div>
          ) : matchedTransactions.length === 0 ? (
            <Card className="p-12 text-center border-gray-100">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matched transactions</h3>
              <p className="text-gray-500">Transactions you match will appear here</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {matchedTransactions.map((transaction) => (
                <PaymentReconciliationItem
                  key={transaction.id}
                  transaction={transaction}
                  onUpdate={handleTransactionUpdate}
                  isMatched={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reconciled Tab */}
        <TabsContent value="history" className="space-y-4">
          {postedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading transactions...
            </div>
          ) : postedTransactions.length === 0 ? (
            <Card className="p-12 text-center border-gray-100">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reconciled transactions</h3>
              <p className="text-gray-500">Reconciled transactions will appear here</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {postedTransactions.map((transaction) => (
                <PaymentReconciliationItem
                  key={transaction.id}
                  transaction={transaction}
                  onUpdate={handleTransactionUpdate}
                  isReconciled={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

