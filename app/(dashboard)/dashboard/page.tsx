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
import { Button } from '@/components/ui/button';
import { usePayables } from '@/hooks/use-purchases';
import {
  usePaymentPipelineStats,
  useBankResponseStats,
  useBankAccounts,
  useAllSFTPCredentials,
} from '@/hooks/use-banking';
import { useOrganizations } from '@/hooks/use-organization';
import {
  useReportsDashboard,
  useFinancialTrends,
  useAuditStats,
  usePipelineOverview,
} from '@/hooks/use-reports';
import { useExpenseStats } from '@/hooks/use-expenses';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ChevronRight,
  CheckCircle,
  CreditCard,
  FileUp,
  Flame,
  Loader2,
  Receipt,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Timer,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Payable } from '@/types/purchases';
import type { PipelineRecentTransaction } from '@/types/reports';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import {
  ContentCard,
  ContentCardHeader,
  ContentCardFooter,
} from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { StatusBadge } from '@/components/layout/status-badge';
import { MetricTile } from '@/components/reports/MetricTile';
import {
  ChartGradients,
  EmptyState,
  SectionTitle,
} from '@/components/reports/chart-theme';

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
  const { data: pipelineStats } = usePaymentPipelineStats(orgId);
  const { data: bankResponseStats } = useBankResponseStats(orgId);
  const { data: bankAccountsData } = useBankAccounts(orgId);
  const { data: sftpCredsData } = useAllSFTPCredentials(orgId);
  const { data: dashboardStats } = useReportsDashboard(orgId);
  const { data: expenseStats } = useExpenseStats(orgId);
  // Sparkline source: monthly payment throughput from Centry's pipeline.
  const { data: trends } = useFinancialTrends(orgId, 6, 'payments');
  // Live system activity counters for the "Today" pulse card.
  const { data: auditStats } = useAuditStats(orgId, 1);
  // Outward-payment data — drives Latest Payment Events, Payments by
  // Channel, and By Bank cards. Default 90-day window from the service.
  const { data: pipelineOverview, isLoading: loadingPipeline } =
    usePipelineOverview(orgId);

  if (orgsLoading) return <LoadingState fullPage />;

  const openBills = Array.isArray(payables) ? payables : (payables as any)?.results || [];
  const overdueBills = openBills.filter((bill: Payable) => bill.due_date && new Date(bill.due_date) < new Date());

  // Cash position — only count BankAccounts that have at least one
  // active SFTP credential (i.e. are wired up to actually pull statements
  // / push payments). Group by currency so UGX and USD live in their own
  // cards instead of being summed into a meaningless single number.
  const sftpBankAccountIds = new Set<number>(
    ((sftpCredsData as any)?.results || [])
      .filter((c: any) => c.is_active && c.bank_account?.id)
      .map((c: any) => c.bank_account.id as number)
  );
  const bankAccounts = ((bankAccountsData as any)?.results || []) as Array<{
    id: number;
    balance: string | null;
    currency: string;
  }>;
  const sftpAccounts = bankAccounts.filter((a) => sftpBankAccountIds.has(a.id));
  const sftpBalancesByCurrency = sftpAccounts.reduce<Record<string, { sum: number; count: number }>>(
    (acc, a) => {
      const ccy =
        (a.currency || '').replace('CurrencyCode.', '').toUpperCase() || 'UGX';
      const amount = parseFloat(a.balance ?? '0') || 0;
      if (!acc[ccy]) acc[ccy] = { sum: 0, count: 0 };
      acc[ccy].sum += amount;
      acc[ccy].count += 1;
      return acc;
    },
    {}
  );
  const sftpCurrencyEntries = Object.entries(sftpBalancesByCurrency).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  const txns = (dashboardStats as any)?.transactions || {};
  const inflows = Number(txns.credits || 0);
  const outflows = Math.abs(Number(txns.debits || 0));
  const netFlow = inflows - outflows;
  const netFlowChange = Number(txns.change || 0); // MoM % change on net flow
  const dayInMonth = new Date().getDate();
  const burnRate = dayInMonth > 0 ? Math.round((outflows / dayInMonth) * 30) : 0;

  // Sparkline series — last 6 months of processed throughput, useful as a
  // visual heartbeat under the inflow / outflow tiles.
  const throughputSpark = (trends?.trends || []).map((t) => Number(t.income) || 0);
  const failedSpark = (trends?.trends || []).map((t) => Number(t.expenses) || 0);

  // Cash runway — at the current monthly burn, how many days of cover do
  // we have across all SFTP-wired bank accounts (UGX-equivalent)?
  // We approximate by summing UGX balance directly + roughly assuming
  // non-UGX accounts at parity (we don't have FX rates here).
  const totalSftpBalance = sftpCurrencyEntries.reduce((s, [, a]) => s + a.sum, 0);
  const dailyBurn = burnRate / 30;
  const runwayDays =
    dailyBurn > 0 ? Math.floor(totalSftpBalance / dailyBurn) : null;
  const runwayLabel =
    runwayDays === null
      ? '—'
      : runwayDays > 365
      ? `${(runwayDays / 365).toFixed(1)}y`
      : runwayDays > 60
      ? `${(runwayDays / 30).toFixed(1)}mo`
      : `${runwayDays}d`;
  const runwayTone: 'success' | 'warning' | 'danger' | 'default' =
    runwayDays === null
      ? 'default'
      : runwayDays < 30
      ? 'danger'
      : runwayDays < 90
      ? 'warning'
      : 'success';

  // Action items — Centry-internal counters only
  const failedPayments = (pipelineStats?.failed || 0) + (pipelineStats?.rejected || 0);
  const pendingExpenses = Number((expenseStats as any)?.pending_manager_count || 0) + Number((expenseStats as any)?.pending_finance_count || 0);

  // Pipeline — full lifecycle from approval through reconciliation
  const bankAccepted = bankResponseStats?.successful_transactions || 0;
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

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))] pb-20">
      <PageHeader
        title={greeting}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <div className="px-6 py-6">
        <ChartGradients />
        <div className="space-y-8 animate-fade-in-up">

          {/* ─── Hero: Cash Position ─── */}
          {/* Per-currency bank balances drawn only from SFTP-wired
              accounts (the ones the bank actually pulls statements for). */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Cash position
            </h2>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {sftpCurrencyEntries.length === 0 ? (
                <MetricTile
                  label="Bank balance"
                  value="—"
                  hint="No SFTP-configured accounts"
                  icon={Wallet}
                  tone="accent"
                />
              ) : (
                sftpCurrencyEntries.map(([ccy, agg]) => (
                  <MetricTile
                    key={ccy}
                    label={`Bank balance · ${ccy}`}
                    value={`${ccy} ${formatCompact(agg.sum)}`}
                    hint={`${agg.count} SFTP account${agg.count === 1 ? '' : 's'}`}
                    icon={Wallet}
                    tone="accent"
                  />
                ))
              )}
              <MetricTile
                label="Cash runway"
                value={runwayLabel}
                icon={Timer}
                tone={runwayTone}
                hint={
                  runwayDays === null
                    ? 'No burn this month yet'
                    : `at ${formatCompact(burnRate)}/mo burn`
                }
              />
            </div>
          </div>

          {/* ─── Cash Flow ─── */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Month-to-date cash flow
            </h2>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label="Inflows"
                value={formatCompact(inflows)}
                hint="Bank credits this month"
                icon={ArrowDownRight}
                tone="success"
                sparkline={throughputSpark.length >= 2 ? throughputSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="Outflows"
                value={formatCompact(outflows)}
                hint="Bank debits this month"
                icon={ArrowUpRight}
                tone="warning"
                sparkline={failedSpark.length >= 2 ? failedSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="Net position"
                value={`${netFlow >= 0 ? '+' : ''}${formatCompact(netFlow)}`}
                hint="Inflows − outflows"
                icon={Scale}
                tone={netFlow >= 0 ? 'success' : 'danger'}
                trend={
                  Number.isFinite(netFlowChange)
                    ? { value: netFlowChange, positiveIsGood: true }
                    : undefined
                }
              />
              <MetricTile
                label="Burn rate"
                value={`${formatCompact(burnRate)}/mo`}
                hint="Projected monthly spend"
                icon={Flame}
                tone="danger"
              />
            </div>
          </div>

          {/* ─── Section 2: Action Items ─── */}
          {/* All counts come from Centry-internal data (PaymentEvents,
              pain.002 bank responses, expenses). */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Needs attention
            </h2>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Awaiting Approval', count: pipelineStats?.pending_approval || 0, icon: CreditCard, color: '#D4B35A', href: '/payments/processing' },
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
          </div>

          {/* ─── Section 3: Payment Pipeline + Today's Pulse ─── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <ContentCard noPadding className="lg:col-span-2">
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<Send className="h-4 w-4" />}
                  title="Payment Pipeline"
                  subtitle="Where bills sit in the flow right now"
                />
              </ContentCardHeader>
              <div className="px-6 pb-5 space-y-3.5">
                {pipeline.map((stage) => {
                  const width = pipelineMax > 0 ? Math.max((stage.count / pipelineMax) * 100, stage.count > 0 ? 3 : 0) : 0;
                  return (
                    <div key={stage.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-sm text-foreground">{stage.label}</span>
                        </div>
                        <div className="flex items-baseline gap-3">
                          {stage.amount > 0 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatCompact(stage.amount)}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">
                            {stage.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${width}%`,
                            background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}cc 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(failedPayments > 0 || bankRejected > 0) && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        <span className="text-sm text-destructive font-medium">Failed / Rejected</span>
                      </div>
                      <span className="text-sm font-semibold text-destructive tabular-nums w-10 text-right">
                        {failedPayments + bankRejected}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-destructive/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-destructive/70"
                        style={{ width: `${Math.max(((failedPayments + bankRejected) / (pipelineMax || 1)) * 100, 5)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Today's Pulse — live system activity (last 24h) */}
            <ContentCard noPadding>
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Today's Pulse"
                  subtitle="System activity, last 24h"
                />
              </ContentCardHeader>
              <div className="px-6 pb-5 space-y-3.5">
                {!auditStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : auditStats.recent_count === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Quiet so far"
                    hint="No actions logged in the last 24 hours."
                  />
                ) : (
                  (() => {
                    const total = auditStats.recent_count || 1;
                    const rows = [
                      {
                        label: 'Events',
                        value: auditStats.recent_count,
                        color: 'rgb(var(--brand-primary))',
                      },
                      {
                        label: 'Warnings',
                        value: auditStats.by_severity?.warning || 0,
                        color: '#d97706',
                      },
                      {
                        label: 'Errors',
                        value: auditStats.error_count || 0,
                        color: '#dc2626',
                      },
                      {
                        label: 'Critical',
                        value: auditStats.critical_count || 0,
                        color: '#991b1b',
                      },
                    ];
                    return rows.map((r) => (
                      <div key={r.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: r.color }}
                            />
                            <span className="text-sm text-foreground">{r.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {r.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min((r.value / total) * 100, 100)}%`,
                              background: `linear-gradient(90deg, ${r.color} 0%, ${r.color}cc 100%)`,
                            }}
                          />
                        </div>
                      </div>
                    ));
                  })()
                )}
                <div className="pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-primary h-8"
                    onClick={() => router.push('/reports/audit')}
                  >
                    View audit trail
                    <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </ContentCard>
          </div>

          {/* ─── Section 4: Latest Payment Events + Payments by Channel ─── */}
          {/* Both cards source from /api/v1/reports/pipeline-overview/
              which merges PaymentRequest (gateway pipeline) +
              BankPaymentExport (SFTP/pain.001 pipeline). No ERP data. */}
          <div className="grid gap-6 lg:grid-cols-5">
            <ContentCard noPadding className="lg:col-span-3">
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<Send className="h-4 w-4" />}
                  title="Latest Payment Events"
                  subtitle="Most recent gateway payments and bank exports"
                  right={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-primary h-8"
                      onClick={() => router.push('/reports')}
                    >
                      View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  }
                />
              </ContentCardHeader>
              {loadingPipeline ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !pipelineOverview?.recent_transactions?.length ? (
                <EmptyState
                  icon={<Send className="h-5 w-5" />}
                  title="No payment events yet"
                  hint="New payments will surface here as they're created."
                />
              ) : (
                <div className="divide-y divide-border">
                  {pipelineOverview.recent_transactions.slice(0, 8).map((t) => (
                    <PaymentEventItem key={`${t.kind}:${t.id}`} event={t} />
                  ))}
                </div>
              )}
            </ContentCard>

            <ContentCard noPadding className="lg:col-span-2">
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<CreditCard className="h-4 w-4" />}
                  title="Payments by Channel"
                  subtitle="Bank (SFTP) and each provider account"
                />
              </ContentCardHeader>
              <div className="px-6 pb-5">
                {loadingPipeline ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !pipelineOverview?.channels?.length ? (
                  <EmptyState
                    icon={<CreditCard className="h-5 w-5" />}
                    title="No payments this period"
                    hint="Channel breakdown shows once payments are processed."
                  />
                ) : (
                  (() => {
                    const channels = pipelineOverview.channels;
                    const total = channels.reduce(
                      (s, c) => s + parseFloat(c.amount || '0'),
                      0
                    );
                    const colors = [
                      'rgb(var(--brand-primary))',
                      '#6366f1',
                      '#0891b2',
                      '#16a34a',
                      '#d97706',
                      '#db2777',
                    ];
                    return (
                      <div className="space-y-3">
                        {channels.map((c, i) => {
                          const amount = parseFloat(c.amount || '0');
                          const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                          const color = colors[i % colors.length];
                          return (
                            <div key={c.label} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm text-foreground truncate">
                                    {c.label}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2 shrink-0">
                                  <span className="text-sm font-semibold text-foreground tabular-nums">
                                    {formatCompact(amount)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">
                                    {pct}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            </ContentCard>
          </div>

          {/* ─── Section 5: Bills + Activity ─── */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Upcoming Bills */}
            <ContentCard className="lg:col-span-3" noPadding>
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<CreditCard className="h-4 w-4" />}
                  title="Upcoming Bills"
                  subtitle={
                    overdueBills.length > 0
                      ? `${openBills.length} open · ${overdueBills.length} overdue`
                      : `${openBills.length} open`
                  }
                  right={
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/bills')}>
                      View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  }
                />
              </ContentCardHeader>
              {loadingPayables ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : openBills.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="h-5 w-5" />}
                  title="All caught up"
                  hint="No bills awaiting payment."
                />
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

            {/* Payments by Bank — backend: pipeline-overview.by_bank
                (BankPaymentExport grouped by source bank account) */}
            <ContentCard className="lg:col-span-2" noPadding>
              <ContentCardHeader className="px-6">
                <SectionTitle
                  icon={<Banknote className="h-4 w-4" />}
                  title="Payments by Bank"
                  subtitle="Sent volume per provider account"
                />
              </ContentCardHeader>
              <div className="px-6 pb-5">
                {loadingPipeline ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !pipelineOverview?.by_bank?.length ? (
                  <EmptyState
                    icon={<Banknote className="h-5 w-5" />}
                    title="No bank activity yet"
                    hint="Bank-level totals appear once exports are sent."
                  />
                ) : (
                  <div className="space-y-3">
                    {pipelineOverview.by_bank.slice(0, 6).map((b) => {
                      const sent = parseFloat(b.sent_amount || '0');
                      const decided = b.accepted_count + b.rejected_count;
                      const rate =
                        decided > 0
                          ? Math.round((b.accepted_count / decided) * 100)
                          : null;
                      return (
                        <div
                          key={b.bank_account_id}
                          className="flex items-center justify-between gap-3 py-1"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {b.bank_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {b.account_name || '—'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-foreground tabular-nums">
                              {formatCompact(sent)}
                            </p>
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {b.sent_count} sent
                              {rate !== null && (
                                <span className="ml-1.5 text-emerald-600">
                                  · {rate}% accepted
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </ContentCard>
          </div>
        </div>
      </div>

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
            <Upload className="h-3.5 w-3.5" /> Transactions
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/banking/reconciliation')}>
            <RefreshCw className="h-3.5 w-3.5" /> Sync to ERP
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

// ─── Payment Event Item ───
// Renders one row in the Latest Payment Events feed. Source: backend
// pipeline-overview.recent_transactions (PaymentRequest +
// BankPaymentExport merged chronologically).

function PaymentEventItem({ event }: { event: PipelineRecentTransaction }) {
  const amount = parseFloat(event.amount || '0');
  const statusLower = event.status?.toLowerCase() || '';
  const statusInfo =
    statusLower === 'completed' || statusLower === 'processed'
      ? { status: 'paid', label: 'Done' }
      : statusLower === 'failed' || statusLower === 'rejected'
      ? { status: 'failed', label: event.status_label }
      : statusLower === 'processing' || statusLower === 'uploaded' || statusLower === 'approved'
      ? { status: 'awaiting_approval', label: event.status_label }
      : { status: 'pending', label: event.status_label };

  const iconBg =
    event.kind === 'bank' ? 'bg-[#6B8FB8]/10' : 'bg-primary/10';
  const iconColor =
    event.kind === 'bank' ? 'text-[#6B8FB8]' : 'text-primary';
  const Icon = event.kind === 'bank' ? FileUp : Send;

  return (
    <div className="px-6 py-3.5 row-interactive cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {event.recipient || '—'}
              {event.kind === 'bank' && event.count > 1 && (
                <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                  · {event.count} payments
                </span>
              )}
            </p>
            {statusInfo && (
              <StatusBadge
                status={statusInfo.status}
                label={statusInfo.label}
                size="sm"
                showIcon={statusInfo.status === 'failed'}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {event.channel} · {formatActivityDate(event.date)}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">
          {event.currency || ''} {formatCompact(amount)}
        </p>
      </div>
    </div>
  );
}
