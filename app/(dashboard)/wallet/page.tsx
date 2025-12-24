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
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Ban
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadWalletModal from '@/components/wallet/LoadWalletModal';
import SavedPaymentMethods from '@/components/wallet/SavedPaymentMethods';
import type { WalletTransaction } from '@/types/wallet';

export default function WalletPage() {
  const [currency] = useState('UGX');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useWalletBalance(currency);
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useWalletTransactions(currency);

  const handleRefresh = () => {
    refetchBalance();
    refetchTransactions();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <WalletIcon className="h-8 w-8" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Wallet</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Manage your account balance and transactions
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                className="bg-white/95 backdrop-blur-sm text-[#638C80] hover:bg-white shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Balance Card - More sophisticated design */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-lg">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#638C80]/5 via-transparent to-transparent"></div>

            <div className="relative p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-[#638C80]/10 rounded-2xl">
                    <WalletIcon className="w-8 h-8 text-[#638C80]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Available Balance</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${balance?.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <p className="text-xs text-gray-500">
                        {balance?.status === 'active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsLoadModalOpen(true)}
                  size="lg"
                >
                  <Plus className="w-5 h-5" />
                  Load Money
                </Button>
              </div>

              <div className="space-y-2">
                {balanceLoading ? (
                  <div className="h-14 bg-gray-100 animate-pulse rounded-xl w-72" />
                ) : (
                  <div className="text-5xl font-bold text-gray-900 tracking-tight">
                    {currency} {parseFloat(balance?.balance || '0').toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}
                <p className="text-gray-500 text-sm">
                  Use your balance to pay bills and make purchases across the platform
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats - More refined design */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Deposits */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    Income
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Total Deposits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currency} {calculateTotalDeposits(transactions || [])}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"></div>
            </div>

            {/* Total Payments */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <ArrowDownRight className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    Expense
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currency} {calculateTotalPayments(transactions || [])}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-400"></div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    Processing
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {currency} {calculatePending(transactions || [])}
                  </p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400"></div>
            </div>
          </div>

          {/* Transactions with clean design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
              <p className="text-sm text-gray-500 mt-1">Track all your wallet activity</p>
            </div>

            {transactionsLoading ? (
              <TransactionsLoadingSkeleton />
            ) : !transactions || transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <WalletIcon className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Transactions Yet</h3>
                <p className="text-gray-600 mb-6">
                  Start by loading money into your wallet
                </p>
                <Button
                  type="button"
                  onClick={() => setIsLoadModalOpen(true)}
                  size="lg"
                >
                  <Plus className="w-5 h-5" />
                  Load Money
                </Button>
              </div>
            ) : (
              <TransactionsTable transactions={transactions} />
            )}
          </div>

          {/* Saved Payment Methods */}
          <SavedPaymentMethods />

          <LoadWalletModal
            isOpen={isLoadModalOpen}
            onClose={() => setIsLoadModalOpen(false)}
            currency={currency}
            countryCode="UG"
          />
        </div>
      </div>
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
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'deposit':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          icon: <TrendingUp className="w-4 h-4" />
        };
      case 'payment':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          icon: <TrendingDown className="w-4 h-4" />
        };
      case 'withdrawal':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: <TrendingDown className="w-4 h-4" />
        };
      case 'refund':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          icon: <RefreshCw className="w-4 h-4" />
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          icon: <DollarSign className="w-4 h-4" />
        };
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Provider
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Reference
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const config = getTypeConfig(tx.type);

            return (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${config.bg} rounded-lg`}>
                      <div className={config.text}>
                        {config.icon}
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${config.text} capitalize`}>
                      {tx.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-semibold ${
                    tx.type === 'deposit' || tx.type === 'refund'
                      ? 'text-emerald-600'
                      : 'text-gray-900'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'refund' ? '+' : '-'}
                    {tx.currency} {parseFloat(tx.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(tx.status === 'success' || tx.status === 'completed') && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  )}
                  {tx.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  )}
                  {tx.status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Processing
                    </span>
                  )}
                  {tx.status === 'failed' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      <XCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                  {tx.status === 'cancelled' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                      <Ban className="w-3 h-3" />
                      Cancelled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-600 font-medium uppercase">
                    {tx.provider || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium">
                      {new Date(tx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {new Date(tx.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-xs font-mono bg-gray-50 text-gray-600 px-2.5 py-1 rounded border border-gray-200">
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
          <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3" />
            <div className="h-3 bg-gray-50 animate-pulse rounded w-1/4" />
          </div>
          <div className="h-5 bg-gray-100 animate-pulse rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}
