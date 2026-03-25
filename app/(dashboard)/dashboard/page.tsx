/**
 * Financial Dashboard — Centry
 *
 * Premium fintech dashboard with:
 * - Cash position overview
 * - Action items (needs attention)
 * - Payment pipeline funnel
 * - Payables aging + Currency exposure
 * - Upcoming bills + Recent activity
 * - Quick actions bar
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { useImportStats, useExportStats, usePaymentPipelineStats, useBankResponseStats } from '@/hooks/use-banking';
import { useOrganizations } from '@/hooks/use-organization';
import { useAccountBalances, useReportsDashboard, usePayablesAging, useCurrencyExposure } from '@/hooks/use-reports';
import { useExpenseStats } from '@/hooks/use-expenses';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ChevronRight,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileDown,
  FileUp,
  Flame,
  Loader2,
  Receipt,
  RefreshCw,
  Send,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Payable } from '@/types/purchases';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { StatCard } from '@/components/layout/stat-card';
import {
  ContentCard,
  ContentCardHeader,
  ContentCardFooter,
} from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { StatusBadge } from '@/components/layout/status-badge';
import { STATUS_COLORS } from '@/lib/theme';

// ─── Helpers ───

function formatCurrency(amount: string | number, currencyCode?: string): string {
  try {
    const clean = (currencyCode || 'UGX').replace('CurrencyCode.', '');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: clean,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount.toString()));
  } catch {
    return `${currencyCode || 'UGX'} ${parseFloat(amount.toString()).toLocaleString()}`;
  }
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toLocaleString();
}

function formatActivityDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Colors ───

const AGING_COLORS = ['#6B9B71', '#D4B35A', '#D4944A', '#B85C5C'];
const PIPELINE_COLORS = {
  pending_approval: '#D4B35A',
  processing: '#6B8FB8',
  sent: '#D4944A',
  success: '#6B9B71',
  failed: '#B85C5C',
  synced: '#5C8A65',
};

// ─── Main Page ───

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good morning');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

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

  const orgId = selectedOrganizationId || undefined;

  // Data hooks
  const { data: payables, isLoading: loadingPayables } = usePayables({ status: 'awaiting_payment', organization: orgId });
  const { data: payableStats } = usePayableStats(orgId);
  const { data: pipelineStats } = usePaymentPipelineStats(orgId);
  const { data: bankResponseStats } = useBankResponseStats(orgId);
  const { data: accountBalances } = useAccountBalances(orgId);
  const { data: dashboardStats } = useReportsDashboard(orgId);
  const { data: agingData } = usePayablesAging(orgId);
  const { data: currencyData } = useCurrencyExposure(orgId);
  const { data: expenseStats } = useExpenseStats(orgId);
  const { data: importStats, isLoading: loadingImports } = useImportStats({ organizationId: orgId });
  const { data: exportStats, isLoading: loadingExports } = useExportStats({ organizationId: orgId });

  if (orgsLoading) return <LoadingState fullPage />;

  const openBills = Array.isArray(payables) ? payables : (payables as any)?.results || [];
  const overdueBills = openBills.filter((bill: Payable) => bill.due_date && new Date(bill.due_date) < new Date());

  // Cash position
  const totalsByPrimary = (accountBalances as any)?.totals_by_currency || {};
  const bankBalance = Object.entries(totalsByPrimary).reduce((sum, [, val]) => sum + Number(val), 0);
  const txns = (dashboardStats as any)?.transactions || {};
  const inflows = Number(txns.credits || 0);
  const outflows = Math.abs(Number(txns.debits || 0));
  const dayInMonth = new Date().getDate();
  const burnRate = dayInMonth > 0 ? Math.round((outflows / dayInMonth) * 30) : 0;

  // Action items
  const billsToApprove = Number(payableStats?.total_awaiting_approval || 0);
  const failedPayments = (pipelineStats?.failed || 0) + (pipelineStats?.rejected || 0);
  const pendingExpenses = Number((expenseStats as any)?.pending_manager_count || 0) + Number((expenseStats as any)?.pending_finance_count || 0);
  const overdueCount = Number(payableStats?.overdue_count || overdueBills.length || 0);

  // Pipeline — full lifecycle from approval through reconciliation
  const bankAccepted = bankResponseStats?.successful_transactions || 0;
  const bankPending = bankResponseStats?.pending_transactions || 0;
  const bankRejected = bankResponseStats?.rejected_transactions || 0;
  const pipeline = [
    { label: 'Pending Approval', count: pipelineStats?.pending_approval || 0, amount: Number(pipelineStats?.total_amount_pending_approval || 0), color: PIPELINE_COLORS.pending_approval },
    { label: 'Ready for Export', count: pipelineStats?.processing || 0, amount: Number(pipelineStats?.total_amount_processing || 0), color: PIPELINE_COLORS.processing },
    { label: 'Sent to Bank', count: (pipelineStats?.pending || 0) + (pipelineStats?.sent || 0), amount: Number(pipelineStats?.total_amount_pending || 0) + Number(pipelineStats?.total_amount_sent || 0), color: PIPELINE_COLORS.sent },
    { label: 'Bank Accepted', count: bankAccepted, amount: 0, color: PIPELINE_COLORS.success },
    { label: 'Completed', count: pipelineStats?.success || 0, amount: 0, color: PIPELINE_COLORS.success },
    { label: 'Synced to ERP', count: pipelineStats?.synced_count || 0, amount: 0, color: PIPELINE_COLORS.synced },
  ];
  const pipelineMax = Math.max(...pipeline.map(p => p.count || 1));

  const recentImports = importStats?.recent_imports || [];
  const recentExports = exportStats?.recent_exports || [];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))] pb-20">
      <PageHeader
        title={greeting}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <PageContainer>
        <div className="space-y-6 animate-fade-in-up">

          {/* ─── Section 1: Cash Position ─── */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Bank Balance"
              value={formatCompact(bankBalance)}
              subtext="Across all accounts"
              icon={Wallet}
              variant="accent"
            />
            <StatCard
              label="Inflows"
              value={formatCompact(inflows)}
              subtext="This month"
              icon={ArrowDownRight}
              iconColor="#6B9B71"
              iconBgColor="rgba(107, 155, 113, 0.1)"
            />
            <StatCard
              label="Outflows"
              value={formatCompact(outflows)}
              subtext="This month"
              icon={ArrowUpRight}
              iconColor="#D4944A"
              iconBgColor="rgba(212, 148, 74, 0.1)"
            />
            <StatCard
              label="Burn Rate"
              value={`${formatCompact(burnRate)}/mo`}
              subtext="Projected monthly spend"
              icon={Flame}
              iconColor="#B85C5C"
              iconBgColor="rgba(184, 92, 92, 0.1)"
            />
          </div>

          {/* ─── Section 2: Action Items ─── */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Bills to Approve', count: billsToApprove, icon: CreditCard, color: '#D4B35A', href: '/bills' },
              { label: 'Overdue Bills', count: overdueCount, icon: AlertTriangle, color: '#B85C5C', href: '/bills' },
              { label: 'Ready for Export', count: pipelineStats?.processing || 0, icon: Send, color: '#6B8FB8', href: '/banking/export' },
              { label: 'Failed Payments', count: failedPayments + bankRejected, icon: Zap, color: '#B85C5C', href: '/payments' },
              { label: 'Pending Expenses', count: pendingExpenses, icon: Receipt, color: '#D4944A', href: '/expenses' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 p-4 rounded-xl border bg-card text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  item.count > 0 ? 'border-l-4' : 'border-border'
                }`}
                style={item.count > 0 ? { borderLeftColor: item.color } : undefined}
              >
                <div className="p-2 rounded-lg" style={{ backgroundColor: item.count > 0 ? `${item.color}15` : 'rgb(var(--page-bg-subtle))' }}>
                  {item.count > 0 ? (
                    <item.icon className="h-4 w-4" style={{ color: item.color }} />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground leading-tight">{item.count}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              </button>
            ))}
          </div>

          {/* ─── Section 3: Payment Pipeline ─── */}
          <ContentCard noPadding>
            <ContentCardHeader className="px-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Send className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Payment Pipeline</h2>
              </div>
            </ContentCardHeader>
            <div className="px-6 pb-5 space-y-2.5">
              {pipeline.map((stage) => {
                const width = pipelineMax > 0 ? Math.max((stage.count / pipelineMax) * 100, stage.count > 0 ? 3 : 0) : 0;
                return (
                  <div key={stage.label} className="flex items-center gap-4">
                    <p className="text-xs text-muted-foreground w-32 shrink-0">{stage.label}</p>
                    <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{ width: `${width}%`, backgroundColor: stage.color }}
                      />
                    </div>
                    <div className="text-right shrink-0 w-28">
                      <span className="text-xs font-semibold text-foreground">{stage.count}</span>
                      {stage.amount > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">
                          {formatCompact(stage.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(failedPayments > 0 || bankRejected > 0) && (
                <div className="flex items-center gap-4 pt-1 border-t border-border/50">
                  <p className="text-xs text-destructive w-32 shrink-0 font-medium">Failed / Rejected</p>
                  <div className="flex-1 h-6 bg-destructive/5 rounded-md overflow-hidden">
                    <div className="h-full rounded-md bg-destructive/70" style={{ width: `${Math.max(((failedPayments + bankRejected) / (pipelineMax || 1)) * 100, 5)}%` }} />
                  </div>
                  <div className="text-right shrink-0 w-28">
                    <span className="text-xs font-semibold text-destructive">{failedPayments + bankRejected}</span>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>

          {/* ─── Section 4: Aging + Currency ─── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payables Aging */}
            <ContentCard noPadding>
              <ContentCardHeader className="px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#D4B35A]/10">
                      <Banknote className="h-4 w-4 text-[#D4B35A]" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Payables Aging</h2>
                  </div>
                  {agingData && (
                    <span className="text-xs text-muted-foreground">{agingData.bill_count} bills</span>
                  )}
                </div>
              </ContentCardHeader>
              <div className="px-6 pb-5">
                {agingData ? (
                  <div className="space-y-3">
                    {/* Stacked bar */}
                    <div className="flex h-8 rounded-lg overflow-hidden">
                      {agingData.buckets.map((bucket, i) => (
                        <div
                          key={bucket.label}
                          className="transition-all duration-500"
                          style={{
                            width: `${bucket.percentage || 0}%`,
                            backgroundColor: AGING_COLORS[i],
                            minWidth: Number(bucket.amount) > 0 ? '3%' : '0%',
                          }}
                        />
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2">
                      {agingData.buckets.map((bucket, i) => (
                        <div key={bucket.label} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: AGING_COLORS[i] }} />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{bucket.label}</p>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(bucket.amount, 'UGX')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-border/50 text-right">
                      <p className="text-xs text-muted-foreground">Total Open</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(agingData.total, 'UGX')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Currency Exposure */}
            <ContentCard noPadding>
              <ContentCardHeader className="px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#6B8FB8]/10">
                      <DollarSign className="h-4 w-4 text-[#6B8FB8]" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Currency Exposure</h2>
                  </div>
                </div>
              </ContentCardHeader>
              <div className="px-6 pb-5">
                {currencyData ? (
                  <div className="space-y-3">
                    {currencyData.currencies.map((cur) => {
                      const colors: Record<string, string> = { UGX: '#5C8A65', USD: '#6B8FB8', EUR: '#D4B35A', GBP: '#9B9B9F' };
                      const color = colors[cur.code] || '#9B9B9F';
                      return (
                        <div key={cur.code} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-sm font-semibold text-foreground">{cur.code}</span>
                              <span className="text-xs text-muted-foreground">{cur.count} bills</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-foreground">{formatCurrency(cur.amount, cur.code)}</span>
                              {cur.code !== 'UGX' && (
                                <span className="text-[10px] text-muted-foreground ml-1.5">≈ {formatCurrency(cur.ugx_amount, 'UGX')}</span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cur.percentage}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-border/50 text-right">
                      <p className="text-xs text-muted-foreground">Total Payables (UGX)</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(currencyData.total_ugx, 'UGX')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </ContentCard>
          </div>

          {/* ─── Section 5: Bills + Activity ─── */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Upcoming Bills */}
            <ContentCard className="lg:col-span-3" noPadding>
              <ContentCardHeader className="px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Upcoming Bills</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{openBills.length}</span>
                    {overdueBills.length > 0 && (
                      <span className="text-xs text-[#D4944A] bg-[#D4944A]/10 px-2 py-0.5 rounded-full">{overdueBills.length} overdue</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/bills')}>
                    View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </ContentCardHeader>
              {loadingPayables ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : openBills.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No bills awaiting payment</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {openBills
                      .sort((a: Payable, b: Payable) => {
                        const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                        const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                        return aDate - bDate;
                      })
                      .slice(0, 8)
                      .map((bill: Payable) => (
                        <BillItem key={bill.id} bill={bill} />
                      ))}
                  </div>
                  {openBills.length > 8 && (
                    <ContentCardFooter>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/bills')}>
                        View {openBills.length - 8} more <ChevronRight className="h-4 w-4 ml-1" />
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
                    <div className="p-1.5 rounded-lg bg-[#6B8FB8]/10">
                      <Receipt className="h-4 w-4 text-[#6B8FB8]" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
                  </div>
                </div>
              </ContentCardHeader>
              {(loadingImports || loadingExports) ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (recentImports.length === 0 && recentExports.length === 0) ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Import or export bank statements to see activity</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentImports.slice(0, 4).map((imp: any) => (
                    <ActivityItem
                      key={`import-${imp.id}`}
                      type="import"
                      title={imp.original_filename || 'Bank Statement'}
                      subtitle={`${imp.transactions_count} transactions`}
                      status={imp.status}
                      date={formatActivityDate(imp.imported_at)}
                    />
                  ))}
                  {recentExports.slice(0, 4).map((exp: any) => (
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
        </div>
      </PageContainer>

      {/* ─── Quick Actions Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-center gap-3">
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/bills')}>
            <CreditCard className="h-3.5 w-3.5" /> Pay Bills
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/banking/export')}>
            <Send className="h-3.5 w-3.5" /> Export to Bank
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/banking/transactions')}>
            <Upload className="h-3.5 w-3.5" /> Upload Statement
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/expenses')}>
            <Receipt className="h-3.5 w-3.5" /> New Expense
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/bills')}>
            <RefreshCw className="h-3.5 w-3.5" /> Sync Xero
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Item ───

function BillItem({ bill }: { bill: Payable }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();
  const dueDate = bill.due_date ? new Date(bill.due_date) : null;
  const today = new Date();
  const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="px-6 py-3.5 row-interactive cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold ${
            isOverdue ? 'bg-[#D4944A]/10 text-[#D4944A]' : 'bg-primary/10 text-primary'
          }`}>
            {bill.vendor_name?.charAt(0).toUpperCase() || 'V'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate">{bill.vendor_name}</p>
              {isOverdue ? (
                <StatusBadge status="failed" label="Overdue" size="sm" showIcon pulse />
              ) : daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 ? (
                <StatusBadge status="awaiting_approval" label={daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d`} size="sm" />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dueDate ? (isOverdue ? `Was due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`) : 'No due date'}
            </p>
          </div>
        </div>
        <p className={`text-sm font-semibold ${isOverdue ? 'text-[#D4944A]' : 'text-foreground'}`}>
          {formatCurrency(bill.amount, bill.currency)}
        </p>
      </div>
    </div>
  );
}

// ─── Activity Item ───

function ActivityItem({ type, title, subtitle, status, date }: { type: 'import' | 'export'; title: string; subtitle: string; status: string; date: string }) {
  const statusLower = status?.toLowerCase() || '';
  const statusInfo = (statusLower === 'synced' || statusLower === 'processed' || statusLower === 'success')
    ? { status: 'paid', label: 'Done' }
    : (statusLower === 'pending' || statusLower === 'imported')
    ? { status: 'awaiting_approval', label: 'Pending' }
    : (statusLower === 'failed' || statusLower === 'error')
    ? { status: 'failed', label: 'Failed' }
    : null;

  return (
    <div className="px-6 py-3.5 row-interactive cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type === 'import' ? 'bg-[#6B8FB8]/10' : 'bg-primary/10'}`}>
          {type === 'import' ? <FileDown className="h-4 w-4 text-[#6B8FB8]" /> : <FileUp className="h-4 w-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{title}</p>
            {statusInfo && <StatusBadge status={statusInfo.status} label={statusInfo.label} size="sm" showIcon={statusInfo.status === 'failed'} />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle} · {date}</p>
        </div>
      </div>
    </div>
  );
}
