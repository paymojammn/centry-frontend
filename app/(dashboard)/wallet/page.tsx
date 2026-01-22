/**
 * Wallet Page
 *
 * Manage wallet balance and transactions
 */

'use client';

import { useState } from 'react';
import { useWalletBalance, useWalletTransactions } from '@/hooks/use-wallet';
import {
  Wallet as WalletIcon,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Ban,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import LoadWalletModal from '@/components/wallet/LoadWalletModal';
import SavedPaymentMethods from '@/components/wallet/SavedPaymentMethods';
import type { WalletTransaction } from '@/types/wallet';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { ContentCard, ContentCardHeader } from '@/components/layout/content-card';

export default function WalletPage() {
  const [currency] = useState('UGX');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useWalletBalance(currency);
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useWalletTransactions(currency);

  const handleRefresh = () => {
    refetchBalance();
    refetchTransactions();
  };

  // Calculate stats
  const totalDeposits = calculateTotalDeposits(transactions || []);
  const totalPayments = calculateTotalPayments(transactions || []);
  const pendingAmount = calculatePending(transactions || []);

  // Filter transactions
  const filteredTransactions = transactions?.filter((tx) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        tx.type?.toLowerCase().includes(query) ||
        tx.provider?.toLowerCase().includes(query) ||
        tx.external_ref?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== 'all' && tx.type !== typeFilter) {
      return false;
    }
    
    return true;
  }) || [];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PageHeader
        title="Wallet"
        subtitle="Manage your account balance and transactions"
      >
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="h-9 btn-press"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button
          onClick={() => setIsLoadModalOpen(true)}
          size="sm"
          className="h-9 btn-press"
        >
          <Plus className="h-4 w-4 mr-2" />
          Load Money
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Balance & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          {/* Main Balance Card */}
          <StatCard
            label="Available Balance"
            value={balanceLoading ? '...' : `${currency} ${parseFloat(balance?.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            subtext={balance?.status === 'active' ? 'Wallet is active' : 'Wallet is inactive'}
            icon={WalletIcon}
            iconColor="#49a034"
            iconBgColor="rgba(73, 160, 52, 0.1)"
            variant="accent"
          />

          {/* Total Deposits */}
          <StatCard
            label="Total Deposits"
            value={`${currency} ${totalDeposits}`}
            subtext="All successful deposits"
            icon={ArrowUpRight}
            iconColor="#10b981"
            iconBgColor="rgba(16, 185, 129, 0.1)"
          />

          {/* Total Payments */}
          <StatCard
            label="Total Payments"
            value={`${currency} ${totalPayments}`}
            subtext="Bills and purchases"
            icon={ArrowDownRight}
            iconColor="#3b82f6"
            iconBgColor="rgba(59, 130, 246, 0.1)"
          />

          {/* Pending */}
          <StatCard
            label="Pending"
            value={`${currency} ${pendingAmount}`}
            subtext="Processing transactions"
            icon={Clock}
            variant={parseFloat(pendingAmount.replace(/,/g, '')) > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Recent Transactions */}
        <ContentCard className="mb-6 animate-fade-in-up" noPadding>
          <ContentCardHeader className="px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#49a034]/10">
                  <WalletIcon className="h-4 w-4 text-[#49a034]" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredTransactions?.length || 0} total
                </span>
              </div>
            </div>
          </ContentCardHeader>

          {/* Filters - Clean toolbar */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions, providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white border-gray-200 text-sm text-gray-900"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 text-sm text-gray-900">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 text-sm text-gray-900">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {transactionsLoading ? (
            <TransactionsLoadingSkeleton />
          ) : !filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <WalletIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'No matching transactions' 
                  : 'No Transactions Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by loading money into your wallet'}
              </p>
              {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                <Button
                  type="button"
                  onClick={() => setIsLoadModalOpen(true)}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Load Money
                </Button>
              )}
            </div>
          ) : (
            <TransactionsTable transactions={filteredTransactions} />
          )}
        </ContentCard>

        {/* Saved Payment Methods */}
        <div className="animate-fade-in-up">
          <SavedPaymentMethods />
        </div>
      </div>

      <LoadWalletModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        currency={currency}
        countryCode="UG"
      />
    </div>
  );
}

// Helper functions
function calculateTotalDeposits(transactions: WalletTransaction[]): string {
  const total = transactions
    .filter(t => t.type === 'deposit' && t.status === 'success')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function calculateTotalPayments(transactions: WalletTransaction[]): string {
  const total = transactions
    .filter(t => t.type === 'payment' && t.status === 'success')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function calculatePending(transactions: WalletTransaction[]): string {
  const total = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Transactions Table Component
interface TransactionsTableProps {
  transactions: WalletTransaction[];
}

function TransactionsTable({ transactions }: TransactionsTableProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return TrendingUp;
      case 'payment':
        return TrendingDown;
      case 'withdrawal':
        return TrendingDown;
      case 'refund':
        return RefreshCw;
      default:
        return DollarSign;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return { bg: '#10b981', light: 'rgba(16, 185, 129, 0.1)' };
      case 'payment':
        return { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)' };
      case 'withdrawal':
        return { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.1)' };
      case 'refund':
        return { bg: '#8b5cf6', light: 'rgba(139, 92, 246, 0.1)' };
      default:
        return { bg: '#6b7280', light: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeInitials = (type: string): string => {
    return type.substring(0, 2).toUpperCase();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-professional">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Type</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Provider</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Date</th>
            <th className="text-right text-xs font-medium text-gray-600 py-3 px-4">Amount</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Status</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const TypeIcon = getTypeIcon(tx.type);
            const typeColor = getTypeColor(tx.type);

            return (
              <tr
                key={tx.id}
                className="transition-colors hover:bg-gray-50"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: typeColor.light }}
                    >
                      <TypeIcon className="h-4 w-4" style={{ color: typeColor.bg }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">{tx.type}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm font-medium text-gray-900 uppercase">
                    {tx.provider || 'N/A'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{formatDate(tx.created_at)}</span>
                    <span className="text-xs text-gray-400">{formatTime(tx.created_at)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className={`text-sm font-medium ${
                    tx.type === 'deposit' || tx.type === 'refund'
                      ? 'text-emerald-600'
                      : 'text-gray-900'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}
                    {tx.currency} {parseFloat(tx.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(tx.status)}
                </td>
                <td className="py-3 px-4">
                  <code className="text-xs font-mono bg-gray-50 text-gray-600 dark:text-gray-900 px-2.5 py-1 rounded border border-gray-200">
                    {tx.external_ref || tx.id.slice(0, 8)}
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Loading Skeleton
function TransactionsLoadingSkeleton() {
  return (
    <div className="p-8 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded w-1/3" />
            <div className="h-3 bg-gray-50 dark:bg-zinc-800/50 animate-pulse rounded w-1/4" />
          </div>
          <div className="h-5 bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}
