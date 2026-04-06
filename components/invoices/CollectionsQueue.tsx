/**
 * Collections Queue — shows initiated invoice collections with status,
 * payment links, and provider responses.
 *
 * Mirrors the ProcessingQueue pattern from bills but for direction=IN.
 */

'use client';

import { useState, useMemo } from 'react';
import { useCollectionEvents } from '@/hooks/use-invoices';
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
} from 'lucide-react';
import { StatusDot } from '@/components/ui/status-badge';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_APPROVAL: { label: 'Pending', color: '#b08b00', bg: '#fed652' },
  PROCESSING: { label: 'Processing', color: '#4E97D1', bg: '#4E97D1' },
  SENT_PAYMENT: { label: 'Sent', color: '#f77f00', bg: '#f77f00' },
  SUCCESS_PAYMENT: { label: 'Paid', color: '#49a034', bg: '#49a034' },
  FAILED_PAYMENT: { label: 'Failed', color: '#dc2626', bg: '#dc2626' },
  ERROR_PAYMENT: { label: 'Failed', color: '#dc2626', bg: '#dc2626' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#dc2626' },
  PENDING: { label: 'Pending', color: '#bec3c6', bg: '#bec3c6' },
};

const METHOD_ICONS: Record<string, typeof Smartphone> = {
  mtn_momo: Smartphone,
  airtel_momo: Phone,
  bank_transfer: Building2,
};

interface CollectionsQueueProps {
  organizationId: string | null;
}

export default function CollectionsQueue({ organizationId }: CollectionsQueueProps) {
  const { data: events, isLoading } = useCollectionEvents(organizationId || undefined);
  const [statusFilter, setStatusFilter] = useState('all');
  const [copied, setCopied] = useState('');

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

                  {/* Payment Link */}
                  <td className="py-3 px-4">
                    {hasLink ? (
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
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
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
    </div>
  );
}
