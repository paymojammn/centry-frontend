'use client';

/**
 * Financial Dashboard
 * 
 * Simple overlay showing:
 * - Bills to pay
 * - Payment options (Bank & Mobile Money)
 * - Invoice collections
 * - Bank transaction monitoring
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { useWalletTransactions } from '@/hooks/use-wallet';
import { useOrganizations } from '@/hooks/use-organization';
import { useExpenseStats } from '@/hooks/use-expenses';
import {
  CreditCard,
  Smartphone,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Receipt,
  LayoutDashboard,
  Clock,
  DollarSign,
  Building2
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
    // Clean currency code (remove any "CurrencyCode." prefix if present)
    const cleanCurrency = currencyCode.includes('.') 
      ? currencyCode.split('.').pop() || 'USD'
      : currencyCode || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount.toString()));
  } catch {
    // Fallback to simple format if currency code is invalid
    return `${currencyCode || 'USD'} ${parseFloat(amount.toString()).toLocaleString()}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  // Fetch organizations
  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Fetch data based on selected organization
  const { data: payables, isLoading: loadingPayables, error: payablesError } = usePayables({
    status: 'awaiting_payment',
    organization: selectedOrganizationId || undefined,
  });
  const { data: stats, isLoading: loadingStats, error: statsError } = usePayableStats(selectedOrganizationId || undefined);
  const { data: transactions, isLoading: loadingTransactions } = useWalletTransactions('UGX', 10);
  const { data: expenseStats, isLoading: loadingExpenseStats } = useExpenseStats(selectedOrganizationId || undefined);

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Handle Xero OAuth callback - extract tokens from URL
  useEffect(() => {
    const accessToken = searchParams?.get('access_token');
    const refreshToken = searchParams?.get('refresh_token');

    if (accessToken && refreshToken) {
      console.log('🔐 Xero tokens received, storing...');

      // Store tokens in localStorage
      setAuthToken(accessToken);
      localStorage.setItem('refresh_token', refreshToken);

      // Clean up URL (remove tokens from address bar for security)
      router.replace('/dashboard');

      // Show success message
      toast.success('Successfully signed in with Xero!');
    }
  }, [searchParams, router]);

  if (loadingPayables || loadingStats || orgsLoading) {
    return <DashboardSkeleton />;
  }

  // Handle both array format and paginated format { results: [] }
  const openBills = Array.isArray(payables)
    ? payables
    : (payables as any)?.results || [];

  const overdueBills = openBills.filter(bill => {
    if (!bill.due_date) return false;
    return new Date(bill.due_date) < new Date();
  });

  // Process transactions data
  const walletTransactions = Array.isArray(transactions)
    ? transactions
    : (transactions as any)?.results || [];

  // Helper function to format transaction date
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <LayoutDashboard className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Your financial overview at a glance
                </p>
              </div>
              {/* Organization Selector */}
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
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
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Overview with brand-themed gradients */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Open Bills */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Open Bills</div>
                <div className="text-4xl font-bold text-white">{stats?.total_open || 0}</div>
                {stats?.total_open_amount && (
                  <div className="text-sm text-white/90 mt-1 font-medium">
                    UGX {parseFloat(stats.total_open_amount).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Scheduled */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Scheduled</div>
                <div className="text-4xl font-bold text-white">{stats?.total_scheduled || 0}</div>
              </div>
            </div>

            {/* Paid */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-500 p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Paid</div>
                <div className="text-4xl font-bold text-white">{stats?.total_paid || 0}</div>
              </div>
            </div>

            {/* Overdue */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-400 to-red-500 p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Overdue</div>
                <div className="text-4xl font-bold text-white">{stats?.overdue_count || 0}</div>
                {stats?.overdue_amount && (
                  <div className="text-sm text-white/90 mt-1 font-medium">
                    UGX {parseFloat(stats.overdue_amount).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bills to Pay */}
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#638C80]" />
                  <CardTitle>Bills to Pay</CardTitle>
                </div>
                <CardDescription>
                  {openBills.length} open bills • {overdueBills.length} overdue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {openBills.length === 0 ? (
                  <EmptyState message="No bills to pay" />
                ) : (
                  openBills.slice(0, 5).map((bill) => (
                    <BillItem key={bill.id} bill={bill} />
                  ))
                )}
                {openBills.length > 5 && (
                  <Button variant="ghost" className="w-full hover:bg-[#638C80]/5 hover:text-[#638C80]">
                    View all {openBills.length} bills
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Expenses Overview */}
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-[#638C80]" />
                  <CardTitle>Expenses Overview</CardTitle>
                </div>
                <CardDescription>Employee expense requests and reimbursements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {loadingExpenseStats ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : !expenseStats ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50 text-[#638C80]" />
                    <p className="text-sm">No expense data available</p>
                    <p className="text-xs mt-1">Expense requests will appear here</p>
                  </div>
                ) : (
                  <>
                    <ExpenseMetric
                      icon={<Clock className="h-5 w-5" />}
                      title="Pending Manager Approval"
                      count={expenseStats.pending_manager_approval}
                      amount={expenseStats.pending_manager_amount}
                      color="amber"
                    />
                    <ExpenseMetric
                      icon={<DollarSign className="h-5 w-5" />}
                      title="Pending Finance Approval"
                      count={expenseStats.pending_finance_approval}
                      amount={expenseStats.pending_finance_amount}
                      color="purple"
                    />
                    <ExpenseMetric
                      icon={<Receipt className="h-5 w-5" />}
                      title="Awaiting Receipts"
                      count={expenseStats.awaiting_receipts}
                      amount={expenseStats.awaiting_receipts_amount}
                      color="blue"
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bank Transactions */}
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#638C80]" />
                  <CardTitle>Recent Transactions</CardTitle>
                </div>
                <CardDescription>Wallet activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-6">
                {loadingTransactions ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50 text-[#638C80]" />
                    <p className="text-sm">No transactions yet</p>
                    <p className="text-xs mt-1">Your wallet transactions will appear here</p>
                  </div>
                ) : (
                  walletTransactions.slice(0, 5).map((tx: any) => (
                    <TransactionItem
                      key={tx.id}
                      type={parseFloat(tx.amount) > 0 ? 'inflow' : 'outflow'}
                      description={tx.description || tx.transaction_type || 'Transaction'}
                      amount={Math.abs(parseFloat(tx.amount)).toString()}
                      currency={tx.currency || 'UGX'}
                      date={formatTransactionDate(tx.created_at)}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Invoice Collections */}
            <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#638C80]" />
                  <CardTitle>Invoice Collections</CardTitle>
                </div>
                <CardDescription>Payments received via mobile money</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50 text-[#638C80]" />
                  <p className="text-sm">No collections yet</p>
                  <p className="text-xs mt-1">Payments from customers will appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

function BillItem({ bill }: { bill: Payable }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl transition-all hover:border-[#638C80]/30 hover:shadow-md group">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900 group-hover:text-[#638C80] transition-colors">{bill.vendor_name}</p>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
              Overdue
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{bill.description || 'No description'}</p>
        {bill.due_date && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due: {new Date(bill.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="text-right ml-4">
        <p className="font-bold text-gray-900 text-lg">
          {formatCurrency(bill.amount, bill.currency)}
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" className="text-xs border-gray-200 hover:border-[#638C80] hover:text-[#638C80] hover:shadow-sm transition-all">
            <CreditCard className="h-3 w-3 mr-1" />
            Bank
          </Button>
          <Button size="sm" className="text-xs bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-sm hover:shadow-md transition-all">
            <Smartphone className="h-3 w-3 mr-1" />
            MoMo
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpenseMetric({
  icon,
  title,
  count,
  amount,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  amount: string;
  color: 'amber' | 'purple' | 'blue';
}) {
  const colorClasses = {
    amber: {
      bg: 'from-amber-100 to-amber-50 border-amber-200',
      icon: 'text-amber-600',
      count: 'text-amber-700',
      amount: 'text-amber-600',
    },
    purple: {
      bg: 'from-purple-100 to-purple-50 border-purple-200',
      icon: 'text-purple-600',
      count: 'text-purple-700',
      amount: 'text-purple-600',
    },
    blue: {
      bg: 'from-blue-100 to-blue-50 border-blue-200',
      icon: 'text-blue-600',
      count: 'text-blue-700',
      amount: 'text-blue-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl transition-all hover:border-[#638C80]/30 hover:shadow-md group">
      <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${colors.bg} border rounded-xl flex items-center justify-center shadow-sm`}>
        <div className={colors.icon}>{icon}</div>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 group-hover:text-[#638C80] transition-colors">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className={`text-xs ${colors.count} bg-white border border-gray-200`}>
            {count} {count === 1 ? 'request' : 'requests'}
          </Badge>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${colors.amount}`}>
          UGX {parseFloat(amount || '0').toLocaleString()}
        </p>
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
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl transition-all hover:border-[#638C80]/30 hover:shadow-md group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
          type === 'inflow'
            ? 'bg-gradient-to-br from-green-100 to-green-50 border border-green-200'
            : 'bg-gradient-to-br from-red-100 to-red-50 border border-red-200'
        }`}>
          {type === 'inflow' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 group-hover:text-[#638C80] transition-colors">{description}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {date}
          </p>
        </div>
      </div>
      <p className={`font-bold text-base ${
        type === 'inflow' ? 'text-green-600' : 'text-red-600'
      }`}>
        {type === 'inflow' ? '+' : '-'}{' '}
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
        <CheckCircle2 className="h-10 w-10 text-[#638C80] opacity-50" />
      </div>
      <p className="text-sm text-gray-600 font-medium">{message}</p>
      <p className="text-xs text-gray-500 mt-1">Everything is up to date</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
