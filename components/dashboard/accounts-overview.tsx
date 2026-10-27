/**
 * Dashboard · Accounts
 *
 * Active bank and mobile-money accounts with the balance their latest
 * statement (MT940 / camt.053) or provider sync reported. One MetricTile per
 * currency for the total available (never summed across currencies), then a
 * `.table-professional` grid, one row per account. Balances are read-only
 * everywhere: they only ever come from statements.
 */

'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Landmark } from 'lucide-react';
import { ContentCard } from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { MetricTile } from '@/components/reports/MetricTile';
import { EmptyState, formatCurrencyCompact } from '@/components/reports/chart-theme';
import { useAccountsOverview, type OverviewAccount } from '@/hooks/use-banking';

const NEUTRAL_PILL = 'bg-neutral-500/10 text-neutral-700 border-neutral-500/20';

export function formatAsOf(iso: string | null | undefined): string {
  if (!iso) return 'No statement yet';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? 'No statement yet' : format(d, 'dd MMM yyyy');
}

export function formatAmount(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function AccountRow({ account }: { account: OverviewAccount }) {
  return (
    <tr>
      <td className="cell-primary">
        <span className="block truncate max-w-[240px]">{account.name}</span>
        <span className="cell-sub">
          {account.account_number_masked ||
            (account.kind === 'mobile_money' ? 'Mobile money' : '—')}
          {account.is_default ? ' · Default' : ''}
        </span>
      </td>
      <td className="cell-muted">
        <span className="block truncate max-w-[200px]">{account.institution || '—'}</span>
      </td>
      <td className="cell-currency">{account.currency || '—'}</td>
      <td className="cell-amount">{formatAmount(account.balance)}</td>
      <td className="cell-amount">{formatAmount(account.booked_balance)}</td>
      <td className="cell-muted whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          {formatAsOf(account.balance_as_of)}
          {account.is_stale && <span className={`status-pill ${NEUTRAL_PILL}`}>Stale</span>}
        </span>
      </td>
    </tr>
  );
}

export function AccountsOverview({ organizationId }: { organizationId?: string }) {
  const { data, isLoading } = useAccountsOverview(organizationId);
  const accounts = data?.accounts || [];
  const totals = Object.entries(data?.totals_by_currency || {});

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Accounts
        </h2>
        {data && accounts.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            Statement balances · {plural(data.active_count, 'active account')}
            {data.stale_count > 0 ? ` · ${data.stale_count} stale` : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <ContentCard noPadding>
          <LoadingState />
        </ContentCard>
      ) : accounts.length === 0 ? (
        <ContentCard noPadding>
          <EmptyState
            icon={<Landmark className="h-5 w-5" />}
            title="No active accounts"
            hint="Balances appear here once an active bank or mobile money account has a statement."
          />
          <div className="pb-6 -mt-4 text-center">
            <Link
              href="/banking/accounts"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage accounts
            </Link>
          </div>
        </ContentCard>
      ) : (
        <div className="space-y-4">
          {totals.length > 0 && (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {totals.map(([currency, t]) => (
                <MetricTile
                  key={currency}
                  label={`Available · ${currency}`}
                  value={formatCurrencyCompact(Number(t.available || 0), currency)}
                  icon={Landmark}
                  tone={t.stale_count > 0 ? 'warning' : 'default'}
                  hint={`${plural(t.account_count, 'account')} · as of ${formatAsOf(t.latest_as_of)}`}
                />
              ))}
            </div>
          )}
          <ContentCard noPadding>
            <div className="table-scroll-container">
              <table className="table-professional">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Bank / provider</th>
                    <th className="cell-currency">Ccy</th>
                    <th className="text-right">Available</th>
                    <th className="text-right">Booked</th>
                    <th>As of</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <AccountRow key={`${account.kind}:${account.id}`} account={account} />
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>
        </div>
      )}
    </section>
  );
}
