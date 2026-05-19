/**
 * Collections Queue — shows initiated invoice collections with status,
 * payment links, and provider responses.
 *
 * Mirrors the ProcessingQueue pattern from bills but for direction=IN.
 */

'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCollectionEvents } from '@/hooks/use-invoices';
import { useApprovePayments, useRejectPayments } from '@/hooks/use-bills';
import { useHasPermission } from '@/hooks/use-user';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Smartphone,
  Phone,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Send,
  X,
} from 'lucide-react';
import { StatusDot } from '@/components/ui/status-badge';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_APPROVAL: { label: 'Pending', color: '#b08b00', bg: '#fed652' },
  PROCESSING: { label: 'Processing', color: '#6B8FB8', bg: '#6B8FB8' },
  SENT_PAYMENT: { label: 'Sent', color: '#f77f00', bg: '#f77f00' },
  SUCCESS_PAYMENT: { label: 'Paid', color: '#5C8A65', bg: '#5C8A65' },
  FAILED_PAYMENT: { label: 'Failed', color: '#dc2626', bg: '#dc2626' },
  ERROR_PAYMENT: { label: 'Failed', color: '#dc2626', bg: '#dc2626' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#dc2626' },
  PENDING: { label: 'Pending', color: '#bec3c6', bg: '#bec3c6' },
};

const METHOD_ICONS: Record<string, typeof Smartphone> = {
  mtn_momo: Smartphone,
  airtel_momo: Phone,
  bank_transfer: Building2,
  ozow_eft: CreditCard,
  onegate: CreditCard,
};

interface CollectionsQueueProps {
  organizationId: string | null;
}

// Locked FX rates older than this are flagged as potentially stale.
const FX_STALE_HOURS = 24;

function isFxStale(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return false;
  const t = new Date(fetchedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return (Date.now() - t) > FX_STALE_HOURS * 60 * 60 * 1000;
}

export default function CollectionsQueue({ organizationId }: CollectionsQueueProps) {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useCollectionEvents(organizationId || undefined);
  const [statusFilter, setStatusFilter] = useState('all');
  const [copied, setCopied] = useState('');
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [sendLinkTarget, setSendLinkTarget] = useState<any | null>(null);

  const hasApprovePermission = useHasPermission('payments.approve');
  const approvePayments = useApprovePayments();
  const rejectPayments = useRejectPayments();

  const generateLinkMutation = useMutation({
    mutationFn: async (eventId: number) => {
      setGeneratingId(eventId);
      return api.post<{ success: boolean; payment_link: string }>(`/api/v1/xero/payments/${eventId}/generate-link/`, {});
    },
    onSuccess: (data, eventId) => {
      if (data.payment_link) {
        navigator.clipboard.writeText(data.payment_link);
        setCopied(String(eventId));
        setTimeout(() => setCopied(''), 3000);
        toast.success('Payment link copied to clipboard');
      }
      queryClient.invalidateQueries({ queryKey: ['collection-events'] });
    },
    onError: (err: Error) => toast.error(err?.message || 'Failed to generate payment link'),
    onSettled: () => setGeneratingId(null),
  });

  const handleApprove = async (eventId: number) => {
    setActingId(eventId);
    try {
      const result = await approvePayments.mutateAsync([eventId]);
      const failed = (result.results || []).filter(
        (r: { success: boolean; error?: string }) => !r.success,
      );
      if (failed.length) {
        toast.error(failed[0]?.error || 'Approval failed');
      } else {
        toast.success('Collection approved');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Approval failed');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (eventId: number) => {
    setActingId(eventId);
    try {
      await rejectPayments.mutateAsync({ ids: [eventId], reason: '' });
      toast.success('Collection rejected');
    } catch (err: any) {
      toast.error(err?.message || 'Reject failed');
    } finally {
      setActingId(null);
    }
  };

  const collections = events || [];

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return collections;
    return collections.filter((e: any) => e.provider_status === statusFilter);
  }, [collections, statusFilter]);

  // Status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of collections) {
      c[e.provider_status] = (c[e.provider_status] || 0) + 1;
    }
    return c;
  }, [collections]);

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const cleanCurrency = (c: string) => {
    if (!c) return 'USD';
    return c.includes('.') ? c.split('.').pop()! : c;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-16">
        <Send className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No collections initiated</p>
        <p className="text-sm text-muted-foreground mt-1">Select invoices and collect payment to see them here</p>
      </div>
    );
  }

  return (
    <div>
      {/* Status pills */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            statusFilter === 'all' ? 'bg-foreground text-card' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({collections.length})
        </button>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={statusFilter === status ? { backgroundColor: cfg.bg } : undefined}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-professional">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Customer</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Invoice</th>
              <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Method</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Payment Link</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((e: any) => {
              const cfg = STATUS_CONFIG[e.provider_status] || STATUS_CONFIG.PENDING;
              const MethodIcon = METHOD_ICONS[e.method] || CreditCard;
              const hasLink = e.payment_link && e.payment_link.startsWith('http');

              return (
                <tr key={e.id} className="transition-colors hover:bg-muted">
                  {/* Customer */}
                  <td className="py-3 px-4">
                    <div className="text-sm font-medium text-foreground">
                      {e.customer_name || e.vendor_name || '-'}
                    </div>
                    {e.phone_number && (
                      <div className="text-xs text-muted-foreground">{e.phone_number}</div>
                    )}
                  </td>

                  {/* Invoice */}
                  <td className="py-3 px-4">
                    <span className="text-sm text-foreground">
                      {e.invoice_number || e.bill_number || '-'}
                    </span>
                    {(e.invoice_reference || e.bill_reference) && (
                      <div className="text-xs text-muted-foreground">{e.invoice_reference || e.bill_reference}</div>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-foreground">
                      {cleanCurrency(e.currency)} {parseFloat(e.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </td>

                  {/* Method */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <MethodIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-foreground">{e.method_display || e.method}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${cfg.bg}15`, color: cfg.color }}
                    >
                      {cfg.label === 'Paid' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : cfg.label === 'Failed' || cfg.label === 'Rejected' ? (
                        <AlertCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {cfg.label}
                    </span>
                    {e.provider_reference && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]" title={e.provider_reference}>
                        Ref: {e.provider_reference}
                      </div>
                    )}
                  </td>

                  {/* Payment Link / Approval */}
                  <td className="py-3 px-4">
                    {e.provider_status === 'PENDING_APPROVAL' ? (
                      hasApprovePermission ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApprove(e.id)}
                            disabled={actingId === e.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {actingId === e.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(e.id)}
                            disabled={actingId === e.id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Awaiting approval</span>
                      )
                    ) : hasLink ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyLink(e.payment_link, String(e.id))}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-border hover:bg-muted transition-colors"
                          title="Copy payment link"
                        >
                          {copied === String(e.id) ? (
                            <><Check className="h-3 w-3 text-primary" /> Copied</>
                          ) : (
                            <><Copy className="h-3 w-3" /> Copy</>
                          )}
                        </button>
                        <a
                          href={e.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Open payment link"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                        <a
                          href={`mailto:?subject=Payment for Invoice ${e.invoice_number || ''}&body=Please complete your payment: ${e.payment_link}`}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Send via email"
                        >
                          <Send className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                      </div>
                    ) : ['PROCESSING', 'SENT_PAYMENT'].includes(e.provider_status) ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSendLinkTarget(e)}
                          disabled={generatingId === e.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {generatingId === e.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                          ) : (
                            <><Send className="h-3 w-3" /> Send Link</>
                          )}
                        </button>
                        {e.fx_rate && isFxStale(e.fx_fetched_at) && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                            title={`FX rate locked ${formatDate(e.fx_fetched_at)} — over ${FX_STALE_HOURS}h old`}
                          >
                            <AlertCircle className="h-2.5 w-2.5" />
                            Stale FX
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="py-3 px-4">
                    <div className="text-xs text-muted-foreground">{formatDate(e.created_at)}</div>
                    {e.created_by_name && (
                      <div className="text-[10px] text-muted-foreground">by {e.created_by_name}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Send Link confirmation dialog */}
      <Dialog open={!!sendLinkTarget} onOpenChange={(open) => !open && setSendLinkTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send payment link</DialogTitle>
            <DialogDescription>
              A hosted-checkout URL will be generated and copied to your clipboard.
              Share it with the customer to complete payment.
            </DialogDescription>
          </DialogHeader>
          {sendLinkTarget && (() => {
            const t = sendLinkTarget;
            const stale = t.fx_rate && isFxStale(t.fx_fetched_at);
            const settleCcy = t.fx_source_currency || 'ZAR';
            const settleAmt = t.fx_source_amount
              ? parseFloat(t.fx_source_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
              : null;
            return (
              <div className="py-2 space-y-3">
                <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
                  <div className="font-medium text-foreground">
                    {t.customer_name || t.vendor_name || `Event #${t.id}`}
                  </div>
                  {t.invoice_number && (
                    <div className="text-xs text-muted-foreground">Invoice {t.invoice_number}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Provider: {t.method === 'onegate' ? 'CallPay / OneGate' : 'Ozow'}
                  </div>
                </div>

                <div className="rounded-md border border-border px-3 py-2 text-sm space-y-1">
                  <div className="flex justify-between text-foreground">
                    <span className="text-muted-foreground">Invoice amount</span>
                    <span className="font-medium">
                      {cleanCurrency(t.currency)}{' '}
                      {parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {t.fx_rate && settleAmt && (
                    <>
                      <div className="flex justify-between text-foreground">
                        <span className="text-muted-foreground">Customer pays</span>
                        <span className="font-medium">
                          {settleCcy} {settleAmt}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          Rate: 1 {cleanCurrency(t.currency)} = {parseFloat(t.fx_rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {settleCcy}
                        </span>
                        <span>
                          {t.fx_manual ? 'manual' : `via ${t.fx_provider || 'auto'}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {stale && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      FX rate locked {formatDate(t.fx_fetched_at)} — over {FX_STALE_HOURS}h old.
                      The market may have moved since approval; double-check before sending.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendLinkTarget(null)}
              disabled={generatingId === sendLinkTarget?.id}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => sendLinkTarget && generateLinkMutation.mutate(sendLinkTarget.id, {
                onSuccess: () => setSendLinkTarget(null),
              })}
              disabled={generatingId === sendLinkTarget?.id}
              className="text-white"
              style={{ backgroundColor: '#5C8A65' }}
            >
              {generatingId === sendLinkTarget?.id ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              Generate & Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
