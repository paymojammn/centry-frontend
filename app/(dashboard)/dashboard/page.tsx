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
  useExportStats,
} from '@/hooks/use-banking';
import { useOrganizations } from '@/hooks/use-organization';
import {
  usePipelineOverview,
} from '@/hooks/use-reports';
import { useInvoiceStats } from '@/hooks/use-invoices';
import {
  ArrowUpRight,
  ChevronRight,
  CheckCircle,
  CreditCard,
  FileUp,
  FileText,
  Send,
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
  pending_approval: 'var(--color-warning-400)',
  processing: 'var(--color-info)',
  sent: 'var(--color-ochre)',
  success: 'var(--color-success)',
  failed: 'var(--color-danger)',
  synced: 'var(--color-forest)',
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

  // Restore the last-selected org so reloads don't snap back to the
  // alphabetically-first org (often an empty demo org with no payment
  // data). Falls back to the first org only when nothing is persisted.
  useEffect(() => {
    if (selectedOrganizationId || !organizations?.length) return;
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem('selectedOrganizationId')
        : null;
    const savedIsValid = saved && organizations.some((o: any) => o.id === saved);
    setSelectedOrganizationId(savedIsValid ? saved : organizations[0].id);
  }, [organizations, selectedOrganizationId]);

  const handleOrganizationChange = (id: string) => {
    setSelectedOrganizationId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOrganizationId', id);
    }
  };

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
  // Outgoing bill-payment pipeline — scope to OUT so the stage counts don't
  // include incoming invoice collections (IN).
  const { data: pipelineStats } = usePaymentPipelineStats(orgId, 'OUT');
  const { data: bankResponseStats } = useBankResponseStats(orgId);
  const { data: invoiceStats } = useInvoiceStats(orgId);
  // Bank payment-export files awaiting SFTP upload (the Pay tab "Ready" pill).
  const { data: exportStats } = useExportStats({ organizationId: orgId || undefined });
  // Outward-payment data — drives Latest Payment Events, Payments by
  // Channel, and By Bank cards. Default 90-day window from the service.
  const { data: pipelineOverview, isLoading: loadingPipeline } =
    usePipelineOverview(orgId);

  if (orgsLoading) return <LoadingState fullPage />;

  const openBills = Array.isArray(payables) ? payables : (payables as any)?.results || [];
  const overdueBills = openBills.filter((bill: Payable) => bill.due_date && new Date(bill.due_date) < new Date());

  // Cash flow — all-time successful Centry collections (IN) and bill payments
  // (OUT) per currency, so every tile matches the Invoice/Bill Payments "Paid"
  // pills. FX is never summed: we render one row per currency (local + USD).
  const cashFlowSeries = pipelineOverview?.cash_flow_series || [];
  const primaryCcyData =
    cashFlowSeries.length > 0
      ? [...cashFlowSeries].sort(
          (a, b) =>
            b.total_inflow + b.total_outflow - (a.total_inflow + a.total_outflow)
        )[0]
      : null;
  const localCurrency =
    cashFlowSeries.find((c) => c.currency !== 'USD')?.currency ||
    (primaryCcyData && primaryCcyData.currency !== 'USD'
      ? primaryCcyData.currency
      : 'UGX');

  const nowDate = new Date();
  const dayOfMonth = nowDate.getDate();
  const daysInMonth = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    0
  ).getDate();

  const inflowsByCcy = pipelineOverview?.inflows_by_currency || {};
  const outflowsByCcy = pipelineOverview?.outflows_by_currency || {};
  const cashFlowFor = (ccy: string) => {
    const inflow = Number(inflowsByCcy[ccy] || 0);
    const outflow = Number(outflowsByCcy[ccy] || 0);
    const series = cashFlowSeries.find((c) => c.currency === ccy)?.series || [];
    // Burn rate = this month's realized outflow projected to a full month.
    const monthOutflow = series.length ? series[series.length - 1].outflow || 0 : 0;
    const burn = dayOfMonth > 0 ? (monthOutflow / dayOfMonth) * daysInMonth : 0;
    return {
      ccy,
      inflow,
      outflow,
      net: inflow - outflow,
      burn,
      inflowSpark: series.map((p) => p.inflow),
      outflowSpark: series.map((p) => p.outflow),
    };
  };
  const cashFlowCurrencies = [localCurrency, 'USD'];

  // Action items — Centry-internal counters only
  // Matches the /erp/bills processing-queue "Failed" pill (OUT payment events:
  // FAILED_PAYMENT + ERROR_PAYMENT + REJECTED).
  const failedPayments = (pipelineStats?.failed || 0) + (pipelineStats?.rejected || 0);
  // Outstanding sales invoices awaiting payment.
  const pendingInvoices = Number(invoiceStats?.outstanding_count || 0);
  // Bank files generated but not yet uploaded (matches the export Pay tab
  // "Ready" pill: status generated or pending).
  const bankFilesReady = (exportStats?.by_status || [])
    .filter((s) => s.status === 'pending' || s.status === 'generated')
    .reduce((sum, s) => sum + (s.count || 0), 0);

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
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title={greeting}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={handleOrganizationChange}
        isLoadingOrgs={orgsLoading}
      >
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => router.push('/banking/export')}>
          <Send className="h-3.5 w-3.5" /> Export to bank
        </Button>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => router.push('/erp/bills')}>
          <CreditCard className="h-3.5 w-3.5" /> Pay bills
        </Button>
      </PageHeader>

      <div className="px-6 py-6">
        <ChartGradients />
        <div className="space-y-8 animate-fade-in-up">

          {/* ─── Section 1: Needs attention (top row) ─── */}
          {/* All counts come from Centry-internal data (PaymentEvents,
              pain.002 bank responses, expenses). Each tile is a clickable
              MetricTile so the card style stays uniform with the rest of
              the app — non-zero counts carry the tone-coloured left stripe. */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Needs attention
            </h2>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {([
                {
                  label: 'Awaiting Approval',
                  count: pipelineStats?.pending_approval || 0,
                  icon: CreditCard,
                  href: '/erp/bills?tab=processing&queue_status=PENDING_APPROVAL',
                  tone: 'warning' as const,
                },
                {
                  label: 'Bank Files',
                  count: bankFilesReady,
                  icon: Send,
                  href: '/banking/export?tab=sftp-export&status=ready',
                  tone: 'accent' as const,
                },
                {
                  label: 'Failed Bill Payments',
                  count: failedPayments,
                  icon: Zap,
                  href: '/erp/bills?tab=processing&queue_status=FAILED_PAYMENT,ERROR_PAYMENT,REJECTED',
                  tone: 'danger' as const,
                },
                {
                  label: 'Pending Invoices',
                  count: pendingInvoices,
                  icon: FileText,
                  href: '/erp/invoices',
                  tone: 'warning' as const,
                },
              ]).map((item) => (
                <MetricTile
                  key={item.label}
                  label={item.label}
                  value={item.count.toLocaleString()}
                  icon={item.count > 0 ? item.icon : CheckCircle}
                  tone={item.count > 0 ? item.tone : 'default'}
                  hint={item.count > 0 ? 'Click to review' : 'All caught up'}
                  onClick={() => router.push(item.href)}
                />
              ))}
            </div>
          </div>

          {/* ─── Section 2: Cash flow ─── */}
          {/* All-time successful Centry collections (IN) and bill payments (OUT)
              per currency — each tile matches the Invoice/Bill Payments "Paid"
              pills. One row per currency (local + USD); FX is never summed.
              Sparklines show the 6-month trend; Burn rate projects this month's
              realized outflow to a full month. */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cash flow
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Through Centry · per currency
              </span>
            </div>
            <ContentCard noPadding>
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Currency</th>
                    <th className="text-right">Collected</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowCurrencies.map((ccy) => {
                    const r = cashFlowFor(ccy);
                    return (
                      <tr key={ccy}>
                        <td className="cell-primary">{ccy}</td>
                        <td className="cell-amount">{formatCompact(r.inflow)}</td>
                        <td className="cell-amount">{formatCompact(r.outflow)}</td>
                        <td className={`cell-amount ${r.net >= 0 ? 'text-success' : 'text-danger'}`}>
                          {r.net >= 0 ? '+' : '−'}
                          {formatCompact(Math.abs(r.net))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ContentCard>
          </div>

          {/* ─── Payment Pipeline ─── */}
          <div>
            <ContentCard noPadding>
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

          </div>

          {/* ─── Latest Payment Events + Upcoming Bills ─── */}
          {/* Both cards source from /api/v1/reports/pipeline-overview/
              which merges PaymentRequest (gateway pipeline) +
              BankPaymentExport (SFTP/pain.001 pipeline). No ERP data. */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ContentCard noPadding>
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
                <LoadingState />
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

            {/* Upcoming Bills */}
            <ContentCard noPadding>
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
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/erp/bills')}>
                      View all <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  }
                />
              </ContentCardHeader>
              {loadingPayables ? (
                <LoadingState />
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
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/erp/bills')}>
                        View {openBills.length - 8} more <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </ContentCardFooter>
                  )}
                </>
              )}
            </ContentCard>

          </div>
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
            isOverdue ? 'bg-warning-500/10 text-warning-700' : 'bg-primary/10 text-primary'
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
        <p className={`text-sm font-semibold ${isOverdue ? 'text-warning-700' : 'text-foreground'}`}>
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
    event.kind === 'bank' ? 'bg-info-500/10' : 'bg-primary/10';
  const iconColor =
    event.kind === 'bank' ? 'text-info-700' : 'text-primary';
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
