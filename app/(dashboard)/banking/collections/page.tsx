'use client';

/**
 * Collections — bank and mobile-money inflows matched to open invoices in
 * every connected ERP, confirmed by the client, then posted as receipts.
 *
 * Report scaffold: summary tiles (Received / Unmatched / Suggested / Posted),
 * then the Inflows grid with status filter pills; a row opens the match sheet.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowDownToLine, Inbox, Loader2, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/layout/loading-state';
import { EmptyState } from '@/components/layout/empty-state';
import { MetricTile } from '@/components/reports/MetricTile';
import { ReportSection, ReportShell, ReportSummary } from '@/components/reports/report-shell';
import { formatCurrencyFull } from '@/components/reports/chart-theme';
import { StatusPills } from '@/components/payments/status-pills';
import { useReportOrganization, useReportPeriod } from '@/hooks/use-report-context';
import {
  totalsFor,
  useBulkPost,
  useCollectionInflows,
  useCollectionsSummary,
  type CollectionInflow,
} from '@/hooks/use-collections';
import { MatchSheet } from '@/components/banking/collections/match-sheet';
import { ErpPill, SourcePill, StatusPill } from '@/components/banking/collections/pills';

type Filter = 'all' | 'unmatched' | 'suggested' | 'matched' | 'posted';

/** Plain number for `.cell-amount`; the ISO code sits in `.cell-currency`. */
const amount = (v: string | number | null | undefined) =>
  Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const day = (d: string | null | undefined) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');

export default function CollectionsPage() {
  const org = useReportOrganization();
  const ccy = org.currency;
  const period = useReportPeriod('30d');
  const organizationId = org.organizationId || undefined;

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CollectionInflow | null>(null);

  const summary = useCollectionsSummary(organizationId, period.startDate, period.endDate);
  const inflows = useCollectionInflows({
    organizationId,
    status: filter,
    dateFrom: period.startDate,
    dateTo: period.endDate,
    search: search || undefined,
  });
  const bulkPost = useBulkPost();

  const rows = inflows.data?.results || [];
  const t = summary.data?.totals;
  const received = totalsFor(t?.received, ccy);
  const unmatched = totalsFor(t?.unmatched, ccy);
  const suggested = totalsFor(t?.suggested, ccy);
  const matched = totalsFor(t?.matched, ccy);
  const posted = totalsFor(t?.posted, ccy);
  const open = totalsFor(t?.open_invoices, ccy);
  // Currencies other than the org's reporting currency still count; say so in the hint.
  const otherCurrencies = (summary.data?.currencies || []).filter((c) => c !== ccy);

  const pills = useMemo(
    () => [
      { value: 'all', label: 'All', count: received.count },
      { value: 'unmatched', label: 'Unmatched', count: unmatched.count },
      { value: 'suggested', label: 'Suggested', count: suggested.count },
      { value: 'matched', label: 'Matched', count: matched.count },
      { value: 'posted', label: 'Posted', count: posted.count },
    ],
    [received.count, unmatched.count, suggested.count, matched.count, posted.count],
  );

  const postMatched = () => {
    if (!organizationId) return;
    bulkPost.mutate(
      { organizationId },
      {
        onSuccess: (res) => {
          if (res.posted_count === 0 && res.failed_count === 0) {
            toast.message('Nothing to post — confirm some matches first.');
          } else if (res.failed_count === 0) {
            toast.success(`Posted ${res.posted_count} receipt${res.posted_count === 1 ? '' : 's'} to ERP`);
          } else {
            const first = res.results.find((r) => !r.success)?.errors?.[0];
            toast.error(`Posted ${res.posted_count}, ${res.failed_count} failed${first ? `: ${first}` : ''}`);
          }
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <ReportShell
      title="Collections"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href="/banking/export?tab=statements">
              <Upload className="h-3.5 w-3.5" />
              Import statement
            </Link>
          </Button>
          <Button size="sm" onClick={postMatched} disabled={!organizationId || bulkPost.isPending || matched.count === 0}>
            {bulkPost.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post matched to ERP
          </Button>
        </>
      }
    >
      {summary.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Received"
              value={formatCurrencyFull(received.amount, ccy)}
              hint={`${received.count} inflow${received.count === 1 ? '' : 's'} · ${formatCurrencyFull(open.amount, ccy)} open on ${open.count} invoice${open.count === 1 ? '' : 's'}${otherCurrencies.length ? ` · also ${otherCurrencies.join(', ')}` : ''}`}
              icon={ArrowDownToLine}
            />
            <MetricTile
              label="Unmatched"
              value={formatCurrencyFull(unmatched.amount, ccy)}
              hint={`${unmatched.count} to review`}
              icon={Inbox}
              tone={unmatched.count > 0 ? 'warning' : 'default'}
              onClick={() => setFilter('unmatched')}
            />
            <MetricTile
              label="Suggested"
              value={formatCurrencyFull(suggested.amount, ccy)}
              hint={`${suggested.count} awaiting confirmation`}
              icon={Inbox}
              tone={suggested.count > 0 ? 'info' : 'default'}
              onClick={() => setFilter('suggested')}
            />
            <MetricTile
              label="Posted"
              value={formatCurrencyFull(posted.amount, ccy)}
              hint={`${posted.count} receipt${posted.count === 1 ? '' : 's'} in ERP · ${matched.count} matched, not yet posted`}
              icon={Send}
              tone={posted.count > 0 ? 'success' : 'default'}
              onClick={() => setFilter('posted')}
            />
          </ReportSummary>

          <ReportSection
            title="Inflows"
            subtitle="Bank statement credits and mobile money pay-ins for the period"
            icon={<ArrowDownToLine className="h-4 w-4" />}
          >
            <StatusPills
              pills={pills}
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Payer, reference…"
            />
            {inflows.isLoading ? (
              <LoadingState />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={filter === 'all' ? 'No inflows in this period' : `No ${filter} inflows`}
                description="Import a bank statement or collect a mobile money payment and it will appear here."
              />
            ) : (
              <div className="table-scroll-container">
                <table className="table-professional">
                  <thead>
                    <tr>
                      <th>Received</th>
                      <th>Payer</th>
                      <th>Reference</th>
                      <th>Source</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                        <td className="cell-muted whitespace-nowrap">{day(r.received_at || r.transaction_date)}</td>
                        <td className="cell-primary max-w-[260px] truncate">
                          {r.counterparty_name || r.description || '—'}
                          {(r.counterparty_phone || (r.counterparty_name && r.description)) && (
                            <span className="cell-sub">{r.counterparty_phone || r.description}</span>
                          )}
                        </td>
                        <td className="cell-muted font-mono text-xs max-w-[180px] truncate">{r.reference || '—'}</td>
                        <td><SourcePill row={r} /></td>
                        <td className="cell-currency">{r.currency}</td>
                        <td className="cell-amount">{amount(r.credit_amount ?? r.amount)}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <StatusPill row={r} />
                            {r.matched_to_reference && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{r.matched_to_reference}</span>
                            )}
                            <ErpPill erp={r.matched_erp} />
                          </div>
                        </td>
                        <td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}
                          >
                            {r.match_status === 'posted' ? 'View' : r.match_status === 'unmatched' ? 'Match' : 'Review'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>
        </>
      )}

      <MatchSheet row={selected} organizationId={organizationId} onClose={() => setSelected(null)} />
    </ReportShell>
  );
}
