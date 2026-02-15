/**
 * Mobile Money Reconciliation Page
 *
 * Uses the consistent Centry design system with enhanced UI components.
 */

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentReconciliationItem } from '@/components/payments/payment-reconciliation-item';
import {
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/layout/page-header';
import { StatsBar } from '@/components/layout/stats-bar';
import { PageContainer } from '@/components/layout/page-container';
import { ContentCard } from '@/components/layout/content-card';
import { useOrganizations } from '@/hooks/use-organization';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
  transaction_type: 'DEBIT' | 'CREDIT';
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
  const [activeTab, setActiveTab] = useState('reconcile');
  const queryClient = useQueryClient();

  // Get organization for currency
  const { data: organizationsResponse } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];
  const currentOrganization = organizations?.[0];
  const organizationCurrency = currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  // Fetch reconciliation summary stats
  const { data: stats } = useQuery<ReconciliationStats>({
    queryKey: ['reconciliation-stats'],
    queryFn: () => api.get('/api/v1/banking/transactions/reconciliation-summary/'),
  });

  // Fetch unmatched transactions (all sources)
  const { data: unmatchedData, isLoading: unmatchedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ['transactions-unmatched'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('match_status', 'unmatched');
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  // Fetch matched transactions
  const { data: matchedData, isLoading: matchedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ['transactions-matched'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('match_status', 'matched');
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  // Fetch posted transactions
  const { data: postedData, isLoading: postedLoading } = useQuery<{ results: Transaction[] }>({
    queryKey: ['transactions-posted'],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('match_status', 'posted');
      return api.get(`/api/v1/banking/transactions/?${params.toString()}`);
    },
  });

  const unmatchedTransactions = unmatchedData?.results || [];
  const matchedTransactions = matchedData?.results || [];
  const postedTransactions = postedData?.results || [];

  const handleTransactionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions-unmatched'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-matched'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-posted'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-stats'] });
  };

  // Stats bar data
  const statsBarData = [
    {
      label: 'To Reconcile',
      value: stats?.unmatched_count || 0,
      color: '#f59e0b',
      variant: (stats?.unmatched_count || 0) > 0 ? 'warning' as const : 'default' as const,
    },
    {
      label: 'Unmatched Amount',
      value: formatCurrency(stats?.total_unmatched_amount || 0, organizationCurrency),
      color: '#f59e0b',
    },
    {
      label: 'Matched',
      value: stats?.matched_count || 0,
      color: 'rgb(var(--brand-primary))',
    },
    {
      label: 'Reconciled',
      value: stats?.posted_count || 0,
      color: 'rgb(var(--brand-primary))',
    },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Mobile Money"
        subtitle="Match mobile money transactions with invoices and bills"
      />

      <StatsBar stats={statsBarData} />

      <PageContainer>
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-fade-in-up">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px] bg-muted p-1">
            <TabsTrigger
              value="reconcile"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <AlertCircle className="h-4 w-4" />
              <span>To Reconcile ({unmatchedTransactions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="matched"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Clock className="h-4 w-4" />
              <span>Matched ({matchedTransactions.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Reconciled ({postedTransactions.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* To Reconcile Tab */}
          <TabsContent value="reconcile" className="space-y-4">
            {unmatchedLoading ? (
              <ContentCard>
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </ContentCard>
            ) : unmatchedTransactions.length === 0 ? (
              <ContentCard>
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No transactions to reconcile</p>
                </div>
              </ContentCard>
            ) : (
              <div className="space-y-4 animate-stagger">
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
              <ContentCard>
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </ContentCard>
            ) : matchedTransactions.length === 0 ? (
              <ContentCard>
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No matched transactions</p>
                  <p className="text-xs text-muted-foreground mt-1">Transactions you match will appear here</p>
                </div>
              </ContentCard>
            ) : (
              <div className="space-y-4 animate-stagger">
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
              <ContentCard>
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </ContentCard>
            ) : postedTransactions.length === 0 ? (
              <ContentCard>
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No reconciled transactions</p>
                  <p className="text-xs text-muted-foreground mt-1">Reconciled transactions will appear here</p>
                </div>
              </ContentCard>
            ) : (
              <div className="space-y-4 animate-stagger">
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
      </PageContainer>
    </div>
  );
}
