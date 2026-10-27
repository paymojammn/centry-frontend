'use client';

/**
 * Match sheet — one inflow against the organization's open invoices.
 *
 * Suggested invoices with a confidence pill and "Confirm match"; a "Split
 * across invoices" mode with amount inputs that must sum to the credit;
 * "Search other invoice" over the unified /erp/invoices/ list; "Unmatch" and
 * "Post to ERP" for rows that already carry a match.
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Search, Split, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { formatCurrencyFull } from '@/components/reports/chart-theme';
import {
  allocationsBalance,
  useConfirmMatch,
  useOpenInvoiceSearch,
  usePostToErp,
  useSuggestedInvoices,
  useUnmatch,
  type CollectionAllocation,
  type CollectionErp,
  type CollectionInflow,
  type OpenInvoiceRow,
  type SuggestedInvoice,
} from '@/hooks/use-collections';
import { ConfidencePill, ErpPill, SourcePill, StatusPill, erpLabel } from './pills';

interface SplitRow {
  erp: CollectionErp;
  invoice_id: string;
  reference: string;
  contact: string;
  amount_due: number;
  amount: string;
}

interface MatchSheetProps {
  row: CollectionInflow | null;
  organizationId?: string;
  onClose: () => void;
}

const money = (v: number, ccy: string) => formatCurrencyFull(v, ccy);
const day = (d: string | null | undefined) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');
const apiError = (e: unknown) => (e instanceof Error ? e.message : 'Request failed');

export function MatchSheet({ row, organizationId, onClose }: MatchSheetProps) {
  const credit = Number(row?.credit_amount ?? row?.amount ?? 0);
  const ccy = row?.currency || '';
  const editable = !!row && row.match_status !== 'posted';

  const [split, setSplit] = useState(false);
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [search, setSearch] = useState('');

  const suggestions = useSuggestedInvoices(editable ? row?.id : undefined);
  const found = useOpenInvoiceSearch(organizationId, search);
  const confirm = useConfirmMatch();
  const unmatch = useUnmatch();
  const postToErp = usePostToErp();

  // Reset the sheet's working state whenever a different inflow opens.
  useEffect(() => {
    setSplit(false);
    setRows([]);
    setSearch('');
  }, [row?.id]);

  const balance = useMemo(() => allocationsBalance(rows, credit), [rows, credit]);

  const addRow = (inv: { erp: CollectionErp; id: string; reference: string; contact: string; amount_due: number }) => {
    setRows((prev) => {
      if (prev.some((r) => r.erp === inv.erp && r.invoice_id === inv.id)) return prev;
      const used = prev.reduce((s, r) => s + (Number(r.amount) || 0), 0);
      const remaining = Math.max(0, Math.round((credit - used) * 100) / 100);
      return [...prev, { ...inv, invoice_id: inv.id, amount: String(Math.min(remaining, inv.amount_due)) }];
    });
    setSplit(true);
  };

  const submit = (allocations: CollectionAllocation[]) => {
    if (!row) return;
    confirm.mutate(
      { transactionId: row.id, allocations },
      {
        onSuccess: (res) => {
          toast.success(res.message || 'Match confirmed');
          onClose();
        },
        onError: (e) => toast.error(apiError(e)),
      },
    );
  };

  const confirmSingle = (s: SuggestedInvoice) => {
    if (credit > s.amount_due + 0.005) {
      // More came in than this invoice is owed — it has to be split.
      addRow({ erp: s.erp, id: s.id, reference: s.reference, contact: s.contact, amount_due: s.amount_due });
      toast.message('The credit exceeds this invoice — allocate the rest to another invoice.');
      return;
    }
    submit([{ erp: s.erp, invoice_id: s.id, amount: credit }]);
  };

  const fromSearch = (inv: OpenInvoiceRow) =>
    addRow({
      erp: inv.provider,
      id: String(inv.id),
      reference: inv.invoice_number || inv.reference,
      contact: inv.customer_name,
      amount_due: Number(inv.amount_due) || 0,
    });

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">
                {money(credit, ccy)} <span className="text-muted-foreground font-normal">received</span>
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                <SourcePill row={row} />
                <StatusPill row={row} />
                <ErpPill erp={row.matched_erp} />
                <span>{day(row.received_at || row.transaction_date)}</span>
              </SheetDescription>
            </SheetHeader>

            <dl className="grid grid-cols-3 gap-2 text-xs border-y border-border py-3">
              <dt className="text-muted-foreground">Payer</dt>
              <dd className="col-span-2 text-foreground">
                {row.counterparty_name || '—'}
                {row.counterparty_phone ? ` · ${row.counterparty_phone}` : ''}
              </dd>
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="col-span-2 font-mono text-foreground break-all">{row.reference || '—'}</dd>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="col-span-2 text-foreground">{row.description || '—'}</dd>
            </dl>

            {row.match_allocations?.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">Matched to</h3>
                <ul className="divide-y divide-border rounded-lg border border-border text-xs">
                  {row.match_allocations.map((a) => (
                    <li key={`${a.erp}-${a.invoice_id}`} className="flex items-center justify-between px-3 py-2">
                      <span className="text-foreground">
                        {a.reference || a.invoice_id}
                        <span className="ml-2 text-muted-foreground">{erpLabel(a.erp)}</span>
                        {a.payment_id && <span className="ml-2 text-muted-foreground">· receipt {a.payment_id}</span>}
                      </span>
                      <span className="tabular-nums text-foreground">{money(Number(a.amount), ccy)}</span>
                    </li>
                  ))}
                </ul>
                {row.sync_error && <p className="text-xs text-danger-700">{row.sync_error}</p>}
              </section>
            )}

            {editable && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground">Suggested invoices</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSplit((v) => !v)}>
                    <Split className="h-3.5 w-3.5 mr-1" />
                    {split ? 'Single match' : 'Split across invoices'}
                  </Button>
                </div>
                {suggestions.isLoading ? (
                  <LoadingState />
                ) : (suggestions.data?.matches || []).length === 0 ? (
                  <EmptyState icon={Search} title="No suggestions" description="Search for the invoice below." />
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {(suggestions.data?.matches || []).map((s) => (
                      <li key={`${s.erp}-${s.id}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">{s.reference}</span>
                            <ErpPill erp={s.erp} />
                          </div>
                          <div className="text-muted-foreground truncate">
                            {s.contact || '—'} · due {day(s.due_date)} · {money(s.amount_due, s.currency || ccy)} due
                          </div>
                        </div>
                        <ConfidencePill confidence={s.confidence} partial={s.partial} />
                        {split ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => addRow({ erp: s.erp, id: s.id, reference: s.reference, contact: s.contact, amount_due: s.amount_due })}
                          >
                            Add
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs" disabled={confirm.isPending} onClick={() => confirmSingle(s)}>
                            Confirm match
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {editable && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground">Search other invoice</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Invoice number or customer"
                    className="h-9 pl-9 text-xs"
                    aria-label="Search open invoices"
                  />
                </div>
                {search && (
                  found.isLoading ? (
                    <LoadingState />
                  ) : (found.data || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">No open invoice matches “{search}”.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {(found.data || []).map((inv) => (
                        <li key={`${inv.provider}-${inv.id}`} className="flex items-center gap-3 px-3 py-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">{inv.invoice_number || inv.reference}</span>
                              <ErpPill erp={inv.provider} />
                            </div>
                            <div className="text-muted-foreground truncate">
                              {inv.customer_name || '—'} · due {day(inv.due_date)} · {money(Number(inv.amount_due), inv.currency || ccy)} due
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fromSearch(inv)}>
                            {split ? 'Add' : 'Use'}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </section>
            )}

            {editable && split && (
              <section className="space-y-2 rounded-lg border border-border p-3">
                <h3 className="text-xs font-semibold text-foreground">Allocations</h3>
                {rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add invoices from the suggestions or the search above.</p>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((r, i) => (
                      <li key={`${r.erp}-${r.invoice_id}`} className="flex items-center gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{r.reference}</div>
                          <div className="text-muted-foreground truncate">
                            {r.contact || erpLabel(r.erp)} · {money(r.amount_due, ccy)} due
                          </div>
                        </div>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={r.amount_due}
                          step="0.01"
                          value={r.amount}
                          aria-label={`Amount for ${r.reference}`}
                          onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, amount: e.target.value } : p)))}
                          className="h-8 w-32 text-right text-xs tabular-nums"
                        />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Remove" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <span className={balance.balanced ? 'text-success-700' : 'text-warning-700'}>
                    {balance.balanced
                      ? 'Allocations match the credit'
                      : balance.diff > 0
                        ? `${money(balance.diff, ccy)} still to allocate`
                        : `${money(-balance.diff, ccy)} over the credit`}
                  </span>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    disabled={!balance.balanced || rows.length === 0 || confirm.isPending}
                    onClick={() => submit(rows.map((r) => ({ erp: r.erp, invoice_id: r.invoice_id, amount: Number(r.amount) })))}
                  >
                    {confirm.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Confirm split
                  </Button>
                </div>
              </section>
            )}

            {row.match_status !== 'unmatched' && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                {editable && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unmatch.isPending}
                    onClick={() =>
                      unmatch.mutate(row.id, {
                        onSuccess: () => {
                          toast.success('Match removed');
                          onClose();
                        },
                        onError: (e) => toast.error(apiError(e)),
                      })
                    }
                  >
                    Unmatch
                  </Button>
                )}
                {(row.match_status === 'matched' || row.match_status === 'reviewed') && (
                  <Button
                    size="sm"
                    disabled={postToErp.isPending}
                    onClick={() =>
                      postToErp.mutate(row.id, {
                        onSuccess: (res) => {
                          toast.success(res.message || 'Receipt posted to ERP');
                          onClose();
                        },
                        onError: (e) => toast.error(apiError(e)),
                      })
                    }
                  >
                    {postToErp.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Post to {erpLabel(row.matched_erp) || 'ERP'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
