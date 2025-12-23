'use client';

/**
 * Financial Dashboard
 *
 * Simple overview showing:
 * - Key metrics (Open Bills, Scheduled, Paid, Overdue)
 * - Bills to pay
 * - Recent transactions
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
    }).format(parseFloat(amount.toString()));
  } catch {
    return `${currencyCode || 'USD'} ${parseFloat(amount.toString()).toLocaleString()}`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

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
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Financial overview at a glance
              </p>
            </div>

            <Select
              value={selectedOrganizationId || undefined}
              onValueChange={setSelectedOrganizationId}
              disabled={orgsLoading || !organizations?.length}
            >
              <SelectTrigger className="w-[220px]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
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

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Receipt className="h-5 w-5" />}
              label="Open Bills"
              value={stats?.total_open || 0}
              subValue={stats?.total_open_amount ? `UGX ${parseFloat(stats.total_open_amount).toLocaleString()}` : undefined}
              color="blue"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Scheduled"
              value={stats?.total_scheduled || 0}
              color="amber"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Paid"
              value={stats?.total_paid || 0}
              color="green"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" />}
              label="Overdue"
              value={stats?.overdue_count || 0}
              subValue={stats?.overdue_amount ? `UGX ${parseFloat(stats.overdue_amount).toLocaleString()}` : undefined}
              color="red"
            />
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bills to Pay */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900">Bills to Pay</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {openBills.length} open {overdueBills.length > 0 && `• ${overdueBills.length} overdue`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-900"
                    onClick={() => router.push('/bills')}
                  >
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {openBills.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No bills to pay</p>
                  </div>
                ) : (
                  openBills.slice(0, 5).map((bill: Payable) => (
                    <BillItem key={bill.id} bill={bill} />
                  ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-gray-900">Recent Transactions</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Wallet activity</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-900"
                    onClick={() => router.push('/wallet')}
                  >
                    View all
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {loadingTransactions ? (
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded" />
                    ))}
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No transactions yet</p>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  color: 'blue' | 'amber' | 'green' | 'red';
}

function StatCard({ icon, label, value, subValue, color }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function BillItem({ bill }: { bill: Payable }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();

  return (
    <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 text-sm truncate">{bill.vendor_name}</p>
            {isOverdue && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                Overdue
              </span>
            )}
          </div>
          {bill.due_date && (
            <p className="text-xs text-gray-500 mt-0.5">
              Due {new Date(bill.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <p className="font-medium text-gray-900 text-sm ml-4">
          {formatCurrency(bill.amount, bill.currency)}
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
    <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded-lg ${
            type === 'inflow' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {type === 'inflow' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{description}</p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
        </div>
        <p className={`font-medium text-sm ml-4 ${
          type === 'inflow' ? 'text-green-600' : 'text-red-600'
        }`}>
          {type === 'inflow' ? '+' : '-'} {formatCurrency(amount, currency)}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <Skeleton className="h-10 w-[220px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
