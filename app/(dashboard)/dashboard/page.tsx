'use client';

/**
 * Financial Dashboard
 * Expert-level UI with visual hierarchy, subtle animations, and polished components
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { useWalletTransactions } from '@/hooks/use-wallet';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Calendar,
  Sparkles,
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
    return <DashboardSkeleton />;
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

  const selectedOrg = organizations.find((org: any) => org.id === selectedOrganizationId);
  const totalOpenAmount = stats?.total_open_amount ? parseFloat(stats.total_open_amount) : 0;
  const overdueAmount = stats?.overdue_amount ? parseFloat(stats.overdue_amount) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">👋</span>
                <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
              </div>
              <p className="text-gray-500">
                Here's what's happening with your finances today
              </p>
            </div>

            <Select
              value={selectedOrganizationId || undefined}
              onValueChange={setSelectedOrganizationId}
              disabled={orgsLoading || !organizations?.length}
            >
              <SelectTrigger className="w-full sm:w-[240px] bg-white border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-white" />
                  </div>
                  <SelectValue placeholder="Select organization" />
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

          {/* Primary Stats - Hero Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Payables - Featured Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#638C80] to-[#4a6b62] rounded-2xl p-6 text-white shadow-lg shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-white/70 text-sm font-medium">Total Payables</p>
                      <p className="text-xs text-white/50">{stats?.total_open || 0} open bills</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => router.push('/bills')}
                  >
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold tracking-tight">
                      UGX {formatCompactNumber(totalOpenAmount)}
                    </p>
                    <p className="text-white/60 text-sm mt-1">
                      Awaiting payment
                    </p>
                  </div>
                  {overdueAmount > 0 && (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded-full">
                        <AlertCircle className="h-3.5 w-3.5 text-red-200" />
                        <span className="text-sm font-medium text-red-100">
                          {formatCompactNumber(overdueAmount)} overdue
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <QuickStatCard
              icon={<Clock className="h-5 w-5" />}
              label="Scheduled"
              value={stats?.total_scheduled || 0}
              color="mustard"
              trend={stats?.total_scheduled > 0 ? 'up' : undefined}
            />
            <QuickStatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Paid This Month"
              value={stats?.total_paid || 0}
              color="green"
              trend="up"
            />
          </div>

          {/* Secondary Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStatCard
              icon={<Receipt className="h-4 w-4" />}
              label="Open Bills"
              value={stats?.total_open || 0}
              color="blue"
            />
            <MiniStatCard
              icon={<AlertCircle className="h-4 w-4" />}
              label="Overdue"
              value={stats?.overdue_count || 0}
              color="orange"
              highlight={stats?.overdue_count > 0}
            />
            <MiniStatCard
              icon={<Calendar className="h-4 w-4" />}
              label="Due This Week"
              value={openBills.filter((b: Payable) => {
                if (!b.due_date) return false;
                const dueDate = new Date(b.due_date);
                const today = new Date();
                const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                return dueDate >= today && dueDate <= weekFromNow;
              }).length}
              color="teal"
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Bills to Pay - Larger */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] flex items-center justify-center shadow-lg shadow-[#4E97D1]/20">
                      <CreditCard className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Upcoming Bills</h2>
                      <p className="text-xs text-gray-500">
                        {openBills.length} pending {overdueBills.length > 0 && (
                          <span className="text-red-500 font-medium">• {overdueBills.length} overdue</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-900 gap-1"
                    onClick={() => router.push('/bills')}
                  >
                    View all
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {openBills.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">All caught up!</p>
                    <p className="text-sm text-gray-500">No bills awaiting payment</p>
                  </div>
                ) : (
                  openBills.slice(0, 6).map((bill: Payable, index: number) => (
                    <BillItem key={bill.id} bill={bill} index={index} />
                  ))
                )}
              </div>

              {openBills.length > 6 && (
                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-600 hover:text-gray-900"
                    onClick={() => router.push('/bills')}
                  >
                    View {openBills.length - 6} more bills
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Transactions - Sidebar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                      <Sparkles className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Activity</h2>
                      <p className="text-xs text-gray-500">Recent transactions</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-900 gap-1 h-8 px-2"
                    onClick={() => router.push('/wallet')}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {loadingTransactions ? (
                  <div className="p-4 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="h-7 w-7 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  walletTransactions.slice(0, 6).map((tx: any) => (
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

interface QuickStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  trend?: 'up' | 'down';
}

function QuickStatCard({ icon, label, value, color, trend }: QuickStatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5',
      icon: 'bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-[#638C80]/30',
      text: 'text-[#638C80]',
    },
    blue: {
      bg: 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/5',
      icon: 'bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-[#4E97D1]/30',
      text: 'text-[#4E97D1]',
    },
    green: {
      bg: 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/5',
      icon: 'bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-[#49a034]/30',
      text: 'text-[#49a034]',
    },
    orange: {
      bg: 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/5',
      icon: 'bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-[#f77f00]/30',
      text: 'text-[#f77f00]',
    },
    mustard: {
      bg: 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/5',
      icon: 'bg-gradient-to-br from-[#fed652] to-[#e6c149] shadow-[#fed652]/30',
      text: 'text-[#d4a843]',
    },
  };

  const styles = colorStyles[color];

  return (
    <div className={`${styles.bg} rounded-2xl p-5 border border-white/50`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${styles.icon} shadow-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${styles.text}`}>
            {trend === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

interface MiniStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  highlight?: boolean;
}

function MiniStatCard({ icon, label, value, color, highlight }: MiniStatCardProps) {
  const colorStyles = {
    teal: 'bg-[#638C80]/10 text-[#638C80] border-[#638C80]/20',
    blue: 'bg-[#4E97D1]/10 text-[#4E97D1] border-[#4E97D1]/20',
    green: 'bg-[#49a034]/10 text-[#49a034] border-[#49a034]/20',
    orange: 'bg-[#f77f00]/10 text-[#f77f00] border-[#f77f00]/20',
    mustard: 'bg-[#fed652]/20 text-[#d4a843] border-[#fed652]/30',
  };

  return (
    <div className={`bg-white rounded-xl p-4 border ${highlight ? 'border-[#f77f00]/30 bg-[#f77f00]/5' : 'border-gray-100'} flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-lg ${colorStyles[color]} flex items-center justify-center border`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className={`text-xl font-bold ${highlight ? 'text-[#f77f00]' : 'text-gray-900'}`}>{value}</p>
      </div>
    </div>
  );
}

function BillItem({ bill, index }: { bill: Payable; index: number }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();
  const dueDate = bill.due_date ? new Date(bill.due_date) : null;
  const today = new Date();
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const getDueBadge = () => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    if (daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#fed652]/20 text-[#d4a843]">
          Due soon
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className="px-6 py-4 hover:bg-gray-50/50 transition-all cursor-pointer group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
            isOverdue
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600 group-hover:bg-[#638C80]/10 group-hover:text-[#638C80]'
          } transition-colors`}>
            {bill.vendor_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-medium text-gray-900 text-sm truncate">{bill.vendor_name}</p>
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
          <p className={`font-semibold text-sm ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(bill.amount, bill.currency)}
          </p>
          <p className="text-xs text-gray-400">{bill.currency?.split('.').pop() || 'UGX'}</p>
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
    <div className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          type === 'inflow'
            ? 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/20'
            : 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/20'
        }`}>
          {type === 'inflow' ? (
            <TrendingUp className="h-4.5 w-4.5 text-[#49a034]" />
          ) : (
            <TrendingDown className="h-4.5 w-4.5 text-[#f77f00]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{description}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <p className={`font-semibold text-sm whitespace-nowrap ${
          type === 'inflow' ? 'text-[#49a034]' : 'text-[#f77f00]'
        }`}>
          {type === 'inflow' ? '+' : '-'}{formatCurrency(amount, currency)}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100/50">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-[240px]" />
          </div>

          {/* Hero Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="lg:col-span-2 h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>

          {/* Mini Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="lg:col-span-3 h-96 rounded-2xl" />
            <Skeleton className="lg:col-span-2 h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
