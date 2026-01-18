/**
 * Financial Dashboard
 *
 * Uses the consistent Centry design system.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { useImportStats, useExportStats } from '@/hooks/use-banking';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Receipt,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  CreditCard,
  FileUp,
  FileDown,
  Loader2,
} from 'lucide-react';
import type { Payable } from '@/types/purchases';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { StatsBar } from '@/components/layout/stats-bar';
import { PageContainer } from '@/components/layout/page-container';
import { ContentCard } from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { STATUS_COLORS, formatCompactNumber } from '@/lib/theme';

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
  const { data: importStats, isLoading: loadingImports } = useImportStats({ organizationId: selectedOrganizationId || undefined });
  const { data: exportStats, isLoading: loadingExports } = useExportStats({ organizationId: selectedOrganizationId || undefined });

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
    return <LoadingState fullPage />;
  }

  const openBills = Array.isArray(payables)
    ? payables
    : (payables as any)?.results || [];

  const overdueBills = openBills.filter((bill: Payable) => {
    if (!bill.due_date) return false;
    return new Date(bill.due_date) < new Date();
  });

  // Combine recent imports and exports for activity feed
  const recentImports = importStats?.recent_imports || [];
  const recentExports = exportStats?.recent_exports || [];

  const formatActivityDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Use currency-converted UGX value (includes both awaiting payment + overdue)
  // Fallback to raw amounts if UGX fields not available (backwards compatibility)
  const totalOpenAmount = stats?.total_open_ugx
    ? parseFloat(stats.total_open_ugx)
    : (stats?.total_open_amount ? parseFloat(stats.total_open_amount) : 0);
  const overdueAmount = stats?.overdue_ugx
    ? parseFloat(stats.overdue_ugx)
    : (stats?.overdue_amount ? parseFloat(stats.overdue_amount) : 0);

  const dueThisWeek = openBills.filter((b: Payable) => {
    if (!b.due_date) return false;
    const dueDate = new Date(b.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= weekFromNow;
  }).length;

  const statsBarData = [
    { label: 'Total Payable', value: `UGX ${formatCompactNumber(totalOpenAmount)}`, color: STATUS_COLORS.awaiting_payment.bg },
    { label: 'Open Bills', value: stats?.total_open || 0, color: STATUS_COLORS.draft.bg },
    { label: 'Overdue', value: stats?.overdue_count || 0, variant: (stats?.overdue_count || 0) > 0 ? 'danger' as const : 'default' as const },
    { label: 'Due This Week', value: dueThisWeek, variant: 'warning' as const },
    { label: 'Paid', value: stats?.total_paid || 0, color: STATUS_COLORS.paid.bg },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PageHeader
        title={greeting}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <StatsBar stats={statsBarData} />

      <PageContainer>
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

          {/* Recent Activity */}
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
                  onClick={() => router.push('/banking/transactions')}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {(loadingImports || loadingExports) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (recentImports.length === 0 && recentExports.length === 0) ? (
              <div className="text-center py-12">
                <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-400 mt-1">Import or export bank statements to see activity here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Recent Imports */}
                {recentImports.slice(0, 3).map((imp: any) => (
                  <ActivityItem
                    key={`import-${imp.id}`}
                    type="import"
                    title={imp.original_filename || 'Bank Statement'}
                    subtitle={`${imp.transactions_count} transactions`}
                    status={imp.status}
                    date={formatActivityDate(imp.imported_at)}
                  />
                ))}
                {/* Recent Exports */}
                {recentExports.slice(0, 3).map((exp: any) => (
                  <ActivityItem
                    key={`export-${exp.id}`}
                    type="export"
                    title={exp.file_name || 'Payment Export'}
                    subtitle={`${exp.payment_count} payments`}
                    status={exp.status}
                    date={formatActivityDate(exp.created_at)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
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

function ActivityItem({
  type,
  title,
  subtitle,
  status,
  date,
}: {
  type: 'import' | 'export';
  title: string;
  subtitle: string;
  status: string;
  date: string;
}) {
  const getStatusBadge = () => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'synced' || statusLower === 'processed' || statusLower === 'success') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          Done
        </span>
      );
    }
    if (statusLower === 'pending' || statusLower === 'imported') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
          Pending
        </span>
      );
    }
    if (statusLower === 'failed' || statusLower === 'error') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          Failed
        </span>
      );
    }
    return null;
  };

  return (
    <div className="px-6 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          type === 'import' ? 'bg-blue-50' : 'bg-[#638C80]/10'
        }`}>
          {type === 'import' ? (
            <FileDown className="h-4 w-4 text-blue-600" />
          ) : (
            <FileUp className="h-4 w-4 text-[#638C80]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-gray-500">{subtitle} · {date}</p>
        </div>
      </div>
    </div>
  );
}
