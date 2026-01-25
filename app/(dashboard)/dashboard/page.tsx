/**
 * Financial Dashboard
 *
 * Uses the consistent Centry design system with enhanced UI components.
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
import {
  ContentCard,
  ContentCardHeader,
  ContentCardFooter,
} from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { StatusBadge } from '@/components/layout/status-badge';
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

  // Get organization currency
  const currentOrganization = organizations?.find((org: any) => org.id === selectedOrganizationId);
  const organizationCurrency = currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  const statsBarData = [
    { label: 'Total Payable', value: `${organizationCurrency} ${formatCompactNumber(totalOpenAmount)}`, color: STATUS_COLORS.awaiting_payment.bg },
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
        <div className="grid gap-6 lg:grid-cols-5 animate-fade-in-up">
          {/* Bills to Pay */}
          <ContentCard className="lg:col-span-3" noPadding>
            <ContentCardHeader className="px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#49a034]/10">
                    <CreditCard className="h-4 w-4 text-[#49a034]" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Upcoming Bills</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {openBills.length} pending
                  </span>
                  {overdueBills.length > 0 && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      {overdueBills.length} overdue
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-[#49a034] h-8 btn-press"
                  onClick={() => router.push('/bills')}
                >
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </ContentCardHeader>

            {openBills.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">All caught up!</p>
                <p className="text-xs text-gray-500 mt-1">No bills awaiting payment</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 animate-stagger">
                  {openBills.slice(0, 6).map((bill: Payable) => (
                    <BillItem key={bill.id} bill={bill} />
                  ))}
                </div>

                {openBills.length > 6 && (
                  <ContentCardFooter>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-gray-500 hover:text-[#49a034] h-8 btn-press"
                      onClick={() => router.push('/bills')}
                    >
                      View {openBills.length - 6} more bills
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </ContentCardFooter>
                )}
              </>
            )}
          </ContentCard>

          {/* Recent Activity */}
          <ContentCard className="lg:col-span-2" noPadding>
            <ContentCardHeader className="px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <Receipt className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-[#49a034] h-8 px-2 btn-press"
                  onClick={() => router.push('/banking/transactions')}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </ContentCardHeader>

            {(loadingImports || loadingExports) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#49a034]" />
              </div>
            ) : (recentImports.length === 0 && recentExports.length === 0) ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Receipt className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No recent activity</p>
                <p className="text-xs text-gray-500 mt-1">Import or export bank statements to see activity here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 animate-stagger">
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
          </ContentCard>
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

  return (
    <div className="px-6 py-3.5 row-interactive cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-colors ${
            isOverdue ? 'bg-orange-100 text-orange-600' : 'bg-[#49a034]/10 text-[#49a034]'
          }`}>
            {bill.vendor_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{bill.vendor_name}</p>
              {isOverdue ? (
                <StatusBadge status="failed" label="Overdue" size="sm" showIcon pulse />
              ) : daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 ? (
                <StatusBadge status="awaiting_approval" label="Soon" size="sm" />
              ) : null}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {dueDate ? (
                isOverdue
                  ? `Was due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              ) : 'No due date'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isOverdue ? 'text-orange-600' : 'text-gray-900'}`}>
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
  const getStatusLabel = () => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'synced' || statusLower === 'processed' || statusLower === 'success') {
      return { status: 'paid', label: 'Done' };
    }
    if (statusLower === 'pending' || statusLower === 'imported') {
      return { status: 'awaiting_approval', label: 'Pending' };
    }
    if (statusLower === 'failed' || statusLower === 'error') {
      return { status: 'failed', label: 'Failed' };
    }
    return null;
  };

  const statusInfo = getStatusLabel();

  return (
    <div className="px-6 py-3.5 row-interactive cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          type === 'import' ? 'bg-blue-100' : 'bg-[#49a034]/10'
        }`}>
          {type === 'import' ? (
            <FileDown className="h-4 w-4 text-blue-600" />
          ) : (
            <FileUp className="h-4 w-4 text-[#49a034]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
            {statusInfo && (
              <StatusBadge
                status={statusInfo.status}
                label={statusInfo.label}
                size="sm"
                showIcon={statusInfo.status === 'failed'}
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle} · {date}</p>
        </div>
      </div>
    </div>
  );
}
