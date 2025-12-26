'use client';

/**
 * Financial Dashboard
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { useWalletTransactions } from '@/hooks/use-wallet';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowUpRight,
  CreditCard,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Payable } from '@/types/purchases';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';

// Helper to safely format currency
function formatCurrency(amount: string | number, currencyCode: string): string {
  try {
    const cleanCurrency = currencyCode.includes('.')
      ? currencyCode.split('.').pop() || 'USD'
      : currencyCode || 'USD';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount.toString()));
  } catch {
    return `${currencyCode || 'USD'} ${parseFloat(amount.toString()).toLocaleString()}`;
  }
}

// Format large numbers with K/M suffix
function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good morning');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const { data: payables, isLoading: loadingPayables } = usePayables({
    status: 'awaiting_payment',
    organization: selectedOrganizationId || undefined,
  });
  const { data: stats, isLoading: loadingStats } = usePayableStats(selectedOrganizationId || undefined);
  const { data: transactions, isLoading: loadingTransactions } = useWalletTransactions('UGX', 10);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Handle Xero OAuth callback
  useEffect(() => {
    const accessToken = searchParams?.get('access_token');
    const refreshToken = searchParams?.get('refresh_token');

    if (accessToken && refreshToken) {
      setAuthToken(accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      router.replace('/dashboard');
      toast.success('Successfully signed in with Xero!');
    }
  }, [searchParams, router]);

  if (loadingPayables || loadingStats || orgsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const openBills = Array.isArray(payables)
    ? payables
    : (payables as any)?.results || [];

  const overdueBills = openBills.filter((bill: Payable) => {
    if (!bill.due_date) return false;
    return new Date(bill.due_date) < new Date();
  });

  const walletTransactions = Array.isArray(transactions)
    ? transactions
    : (transactions as any)?.results || [];

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalOpenAmount = stats?.total_open_amount ? parseFloat(stats.total_open_amount) : 0;
  const overdueAmount = stats?.overdue_amount ? parseFloat(stats.overdue_amount) : 0;

  const dueThisWeek = openBills.filter((b: Payable) => {
    if (!b.due_date) return false;
    const dueDate = new Date(b.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{greeting}</h1>
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-gray-50 border-gray-200">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500 hidden sm:block">
              Here's what's happening with your finances today
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Total Payable:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                UGX {formatCompactNumber(totalOpenAmount)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Open Bills:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {stats?.total_open || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Overdue:</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                (stats?.overdue_count || 0) > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {stats?.overdue_count || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Due This Week:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-amber-50 text-amber-700">
                {dueThisWeek}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Scheduled:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                {stats?.total_scheduled || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Paid:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-700">
                {stats?.total_paid || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Bills to Pay */}
          <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-900">Upcoming Bills</h2>
                  <span className="text-xs text-gray-500">
                    {openBills.length} pending
                    {overdueBills.length > 0 && (
                      <span className="text-orange-600 ml-1">· {overdueBills.length} overdue</span>
                    )}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-900 h-8"
                  onClick={() => router.push('/bills')}
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {openBills.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No bills awaiting payment</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {openBills.slice(0, 6).map((bill: Payable) => (
                    <BillItem key={bill.id} bill={bill} />
                  ))}
                </div>

                {openBills.length > 6 && (
                  <div className="px-6 py-3 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-500 hover:text-gray-900 h-8"
                      onClick={() => router.push('/bills')}
                    >
                      View {openBills.length - 6} more bills
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-gray-400" />
                  <h2 className="text-sm font-medium text-gray-900">Recent Activity</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-900 h-8 px-2"
                  onClick={() => router.push('/wallet')}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : walletTransactions.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {walletTransactions.slice(0, 6).map((tx: any) => (
                  <TransactionItem
                    key={tx.id}
                    type={parseFloat(tx.amount) > 0 ? 'inflow' : 'outflow'}
                    description={tx.description || tx.transaction_type || 'Transaction'}
                    amount={Math.abs(parseFloat(tx.amount)).toString()}
                    currency={tx.currency || 'UGX'}
                    date={formatTransactionDate(tx.created_at)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BillItem({ bill }: { bill: Payable }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();
  const dueDate = bill.due_date ? new Date(bill.due_date) : null;
  const today = new Date();
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const getDueBadge = () => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    if (daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
          Soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="px-6 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
            isOverdue ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'
          }`}>
            {bill.vendor_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{bill.vendor_name}</p>
              {getDueBadge()}
            </div>
            <p className="text-xs text-gray-500">
              {dueDate ? (
                isOverdue
                  ? `Was due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              ) : 'No due date'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${isOverdue ? 'text-orange-600' : 'text-gray-900'}`}>
            {formatCurrency(bill.amount, bill.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

function TransactionItem({
  type,
  description,
  amount,
  currency,
  date,
}: {
  type: 'inflow' | 'outflow';
  description: string;
  amount: string;
  currency: string;
  date: string;
}) {
  return (
    <div className="px-6 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          type === 'inflow' ? 'bg-green-50' : 'bg-orange-50'
        }`}>
          {type === 'inflow' ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-orange-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{description}</p>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
        <p className={`text-sm font-medium ${
          type === 'inflow' ? 'text-green-600' : 'text-orange-600'
        }`}>
          {type === 'inflow' ? '+' : '-'}{formatCurrency(amount, currency)}
        </p>
      </div>
    </div>
  );
}
