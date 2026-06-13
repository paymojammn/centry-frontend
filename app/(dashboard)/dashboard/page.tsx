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
  Landmark,
  Loader2,
  Receipt,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
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
import { CashFlowCard } from '@/components/reports/cards/CashFlowCard';
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
  const { data: pipelineStats } = usePaymentPipelineStats(orgId);
  const { data: bankResponseStats } = useBankResponseStats(orgId);
  const { data: bankAccountsData } = useBankAccounts(orgId);
  const { data: sftpCredsData } = useAllSFTPCredentials(orgId);
  const { data: expenseStats } = useExpenseStats(orgId);
  // Live system activity counters for the "Today" pulse card.
  const { data: auditStats } = useAuditStats(orgId, 1);
  // Outward-payment data — drives Latest Payment Events, Payments by
  // Channel, and By Bank cards. Default 90-day window from the service.
  const { data: pipelineOverview, isLoading: loadingPipeline } =
    usePipelineOverview(orgId);

  if (orgsLoading) return <LoadingState fullPage />;

  const openBills = Array.isArray(payables) ? payables : (payables as any)?.results || [];
  const overdueBills = openBills.filter((bill: Payable) => bill.due_date && new Date(bill.due_date) < new Date());

  // Funding accounts — one card per account, in the account's own
  // currency. Sources of truth:
  //   • SFTPCredential (banking_integrations) — gates which BankAccounts
  //     count as "wired" (i.e. actually push pain.001 over SFTP, covering
  //     both SWIFT and local-rails payments).
  //   • ProviderAccount (payments) — every gateway funding account
  //     (Ozow / MoMo / Airtel / Paystack / OneGate / Netcash).
  // Per-account so we never sum across currencies.
  const sftpBankAccountIds = new Set<string>(
    ((sftpCredsData as any)?.results || [])
      .filter((c: any) => c.is_active && c.bank_account?.id)
      .map((c: any) => String(c.bank_account.id))
  );
  const bankAccounts = ((bankAccountsData as any)?.results || []) as Array<{
    id: number;
    balance: string | null;
    currency: string;
  }>;
  const bankBalanceById = new Map<string, { balance: number; currency: string }>(
    bankAccounts.map((a) => [
      String(a.id),
      {
        balance: parseFloat(a.balance ?? '0') || 0,
        currency: (a.currency || '').replace('CurrencyCode.', '').toUpperCase() || 'UGX',
      },
    ])
  );

  // pipeline-overview's period defaults to 90 days; divide by 3 to get a
  // monthly run-rate on each account, then runway from balance ÷ run-rate.
  const periodStart = pipelineOverview?.period?.start_date
    ? new Date(pipelineOverview.period.start_date)
    : null;
  const periodEnd = pipelineOverview?.period?.end_date
    ? new Date(pipelineOverview.period.end_date)
    : null;
  const periodDays =
    periodStart && periodEnd
      ? Math.max(
          Math.round((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1,
          1
        )
      : 90;
  const periodLabel = periodDays === 90 ? '90d' : `${periodDays}d`;

  type FundingCard = {
    key: string;
    bankName: string;
    accountName: string;
    currency: string;
    balance: number | null;
    accepted: number;
    acceptedCount: number;
    monthly: number;
    runwayDays: number | null;
    iconKind: 'bank' | 'provider';
  };

  function runwayLabelFor(days: number | null): string {
    if (days === null) return '—';
    if (days > 365) return `${(days / 365).toFixed(1)}y`;
    if (days > 60) return `${(days / 30).toFixed(1)}mo`;
    return `${days}d`;
  }
  function toneFor(days: number | null): 'success' | 'warning' | 'danger' | 'default' {
    if (days === null) return 'default';
    if (days < 30) return 'danger';
    if (days < 90) return 'warning';
    return 'success';
  }

  const bankCards: FundingCard[] = (pipelineOverview?.by_bank || [])
    .filter((b) => sftpBankAccountIds.size === 0 || sftpBankAccountIds.has(b.bank_account_id))
    .map((b) => {
      const accepted = parseFloat(b.accepted_amount || '0') || 0;
      const monthly = (accepted / periodDays) * 30;
      const ba = bankBalanceById.get(b.bank_account_id);
      const balance = ba ? ba.balance : null;
      const currency = b.currency || ba?.currency || 'UGX';
      const days = balance !== null && monthly > 0 ? Math.floor(balance / (monthly / 30)) : null;
      return {
        key: `bank:${b.bank_account_id}:${currency}`,
        bankName: b.bank_name,
        accountName: b.account_name,
        currency,
        balance,
        accepted,
        acceptedCount: b.accepted_count,
        monthly,
        runwayDays: days,
        iconKind: 'bank' as const,
      };
    });

  const providerCards: FundingCard[] = (pipelineOverview?.provider_accounts || []).map((p) => {
    const accepted = parseFloat(p.period_completed_amount || '0') || 0;
    const monthly = (accepted / periodDays) * 30;
    const balance = parseFloat(p.balance || '0');
    const currency = (p.currency || 'UGX').toUpperCase();
    const days = monthly > 0 ? Math.floor(balance / (monthly / 30)) : null;
    return {
      key: `prov:${p.account_id}`,
      bankName: p.provider,
      accountName: p.account_name,
      currency,
      balance: Number.isFinite(balance) ? balance : null,
      accepted,
      acceptedCount: p.period_completed_count,
      monthly,
      runwayDays: days,
      iconKind: 'provider' as const,
    };
  });

  const fundingCards = [...bankCards, ...providerCards].sort(
    (a, b) => b.accepted - a.accepted
  );

  // Month-to-date cash flow — single-currency summary so we never sum
  // across FX. We pick the org's primary operating currency (highest
  // 6-month volume in cash_flow_series) and read its current-month bucket.
  // The monthly TruncMonth bucket for the current month *is* month-to-date,
  // since it only contains transactions from the 1st through today.
  const cashFlowSeries = pipelineOverview?.cash_flow_series || [];
  const primaryCcyData =
    cashFlowSeries.length > 0
      ? [...cashFlowSeries].sort(
          (a, b) =>
            b.total_inflow + b.total_outflow - (a.total_inflow + a.total_outflow)
        )[0]
      : null;
  const mtdCurrency = primaryCcyData?.currency || 'UGX';
  const mtdSeries = primaryCcyData?.series || [];
  const mtdPoint = mtdSeries[mtdSeries.length - 1];
  const mtdPrev = mtdSeries[mtdSeries.length - 2];
  const inflows = mtdPoint?.inflow || 0;
  const outflows = mtdPoint?.outflow || 0;
  const netFlow = inflows - outflows;
  const prevNet = mtdPrev ? mtdPrev.inflow - mtdPrev.outflow : 0;
  const netFlowChange =
    prevNet !== 0
      ? Math.round(((netFlow - prevNet) / Math.abs(prevNet)) * 1000) / 10
      : netFlow > 0
      ? 100
      : 0;
  const nowDate = new Date();
  const dayOfMonth = nowDate.getDate();
  const daysInMonth = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    0
  ).getDate();
  // Project this month's realized outflow to a full-month burn rate.
  const burnRate = dayOfMonth > 0 ? (outflows / dayOfMonth) * daysInMonth : 0;
  // Sparkline heartbeats — full 6-month inflow / outflow history.
  const inflowSpark = mtdSeries.map((p) => p.inflow);
  const outflowSpark = mtdSeries.map((p) => p.outflow);

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
        onOrganizationChange={handleOrganizationChange}
        isLoadingOrgs={orgsLoading}
      />

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
                  href: '/payments/processing',
                  tone: 'warning' as const,
                },
                {
                  label: 'Ready for Export',
                  count: pipelineStats?.processing || 0,
                  icon: Send,
                  href: '/banking/export',
                  tone: 'accent' as const,
                },
                {
                  label: 'Failed Payments',
                  count: failedPayments + bankRejected,
                  icon: Zap,
                  href: '/payments',
                  tone: 'danger' as const,
                },
                {
                  label: 'Pending Expenses',
                  count: pendingExpenses,
                  icon: Receipt,
                  href: '/expenses',
                  tone: 'warning' as const,
                },
              ]).map((item) => (
                <MetricTile
                  key={item.label}
                  label={item.label}
                  value={item.count.toLocaleString()}
                  icon={item.count > 0 ? item.icon : CheckCircle}
                  tone={item.count > 0 ? item.tone : 'success'}
                  hint={item.count > 0 ? 'Click to review' : 'All caught up'}
                  onClick={() => router.push(item.href)}
                />
              ))}
            </div>
          </div>

          {/* ─── Section 2: Month-to-date cash flow ─── */}
          {/* Single-currency summary (org's primary operating currency) so
              UGX and USD never get summed. Sourced from cash_flow_series
              (XeroPaymentEvent realized IN/OUT) — the current-month bucket
              is month-to-date. Sparklines show the 6-month history. */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Month-to-date cash flow
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {mtdCurrency}
              </span>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricTile
                label="Inflows"
                value={`${mtdCurrency} ${formatCompact(inflows)}`}
                hint="Collected this month"
                icon={ArrowDownRight}
                tone="success"
                sparkline={inflowSpark.length >= 2 ? inflowSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="Outflows"
                value={`${mtdCurrency} ${formatCompact(outflows)}`}
                hint="Paid out this month"
                icon={ArrowUpRight}
                tone="warning"
                sparkline={outflowSpark.length >= 2 ? outflowSpark : undefined}
                sparklineKind="area"
              />
              <MetricTile
                label="Net position"
                value={`${netFlow >= 0 ? '+' : '−'}${mtdCurrency} ${formatCompact(Math.abs(netFlow))}`}
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
                value={`${mtdCurrency} ${formatCompact(burnRate)}/mo`}
                hint="Projected monthly spend"
                icon={Flame}
                tone="danger"
              />
            </div>
          </div>

          {/* ─── Section 3: Funding accounts ─── */}
          {/* One card per account in its own currency — no FX mixing.
              Primary number = accepted payments through that account
              over the pipeline-overview period (default 90d). Each card
              also carries the account's balance, derived monthly run-rate
              and per-account runway. Sources:
                • bank rows  → SFTPCredential-wired BankAccount + by_bank
                • provider rows → ProviderAccount + provider_accounts. */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Funding accounts
              </h2>
              <span className="text-[11px] text-muted-foreground">
                Accepted payments · last {periodLabel}
              </span>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {loadingPipeline ? (
                <div className="col-span-full flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : fundingCards.length === 0 ? (
                <MetricTile
                  label="No funding accounts"
                  value="—"
                  hint="Wire an SFTP bank account or add a ProviderAccount"
                  icon={Wallet}
                  tone="accent"
                />
              ) : (
                fundingCards.map((c) => {
                  const balanceLine =
                    c.balance === null
                      ? 'Balance not synced'
                      : `Bal ${c.currency} ${formatCompact(c.balance)}`;
                  const runwayLine =
                    c.monthly > 0
                      ? `~${c.currency} ${formatCompact(c.monthly)}/mo · ${runwayLabelFor(c.runwayDays)}`
                      : `${c.acceptedCount} accepted`;
                  return (
                    <MetricTile
                      key={c.key}
                      label={`${c.bankName} · ${c.accountName || '—'}`}
                      value={`${c.currency} ${formatCompact(c.accepted)}`}
                      hint={balanceLine}
                      footer={
                        <span className="text-[11px] text-muted-foreground">
                          {runwayLine}
                        </span>
                      }
                      icon={c.iconKind === 'bank' ? Landmark : Wallet}
                      tone={toneFor(c.runwayDays)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* ─── Cash flow graphs — one card per currency ─── */}
          {/* Realized monthly inflow vs outflow from cash_flow_series
              (XeroPaymentEvent IN/OUT). Separate UGX / USD cards so the
              two never share a y-axis. */}
          {!loadingPipeline && (pipelineOverview?.cash_flow_series?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Cash flow
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {pipelineOverview!.cash_flow_series.map((cf) => (
                  <CashFlowCard key={cf.currency} data={cf} />
                ))}
              </div>
            </div>
          )}

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
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/erp/bills')}>
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
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-primary h-8" onClick={() => router.push('/erp/bills')}>
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
                          key={`${b.bank_account_id}:${b.currency}`}
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
                              {b.currency} {formatCompact(sent)}
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
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => router.push('/erp/bills')}>
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
