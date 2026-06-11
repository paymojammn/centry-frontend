'use client';

import { useParams, useRouter } from 'next/navigation';
import { useInvoice } from '@/hooks/use-invoices';
import { usePaymentEvents } from '@/hooks/use-bills';
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  Send,
  Receipt,
  Loader2,
  AlertCircle,
  User,
  Mail,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { PaymentEvent } from '@/types/bill';

const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) return currency.split('.').pop() || currency;
  return currency;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Number(params.id);
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  // Collection attempts (direction IN) for this invoice + their provider
  // responses. Endpoint may return a raw array or a { results } envelope.
  const { data: collectionsResponse } = usePaymentEvents({ invoice_id: invoiceId, direction: 'IN' });
  const collections: PaymentEvent[] = Array.isArray(collectionsResponse)
    ? collectionsResponse
    : (collectionsResponse as { results?: PaymentEvent[] } | undefined)?.results || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Invoice not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const currency = cleanCurrencyCode(invoice.currency);
  const statusMap: Record<string, string> = {
    DRAFT: 'draft',
    SUBMITTED: 'awaiting_approval',
    AUTHORISED: 'awaiting_payment',
    PAID: 'paid',
    VOIDED: 'failed',
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatAmount = (a: string) =>
    parseFloat(a).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isOutstanding = invoice.status === 'AUTHORISED';
  const amountDue = parseFloat(invoice.amount_due);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Invoices
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {invoice.invoice_number ? `Invoice #${invoice.invoice_number}` : 'Invoice'}
                </h1>
                <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={statusMap[invoice.status] || 'draft'} />
              {isOutstanding && (
                <Button size="sm" className="btn-press">
                  <Send className="h-4 w-4 mr-2" /> Send Reminder
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount card */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </span>
                  Invoice Summary
                </h2>
                {invoice.sent_to_contact && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    <Mail className="h-3 w-3" /> Sent to customer
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <InfoRow icon={DollarSign} label="Subtotal" value={`${currency} ${formatAmount(invoice.subtotal)}`} />
                <InfoRow icon={DollarSign} label="Tax" value={`${currency} ${formatAmount(invoice.total_tax)}`} />
                <div className="border-t border-border pt-3">
                  <InfoRow icon={DollarSign} label="Total" value={`${currency} ${formatAmount(invoice.total)}`} bold />
                </div>
                {amountDue > 0 && (
                  <div className="bg-muted rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Amount Due</span>
                      <span className="text-lg font-bold text-foreground">{currency} {formatAmount(invoice.amount_due)}</span>
                    </div>
                  </div>
                )}
                {parseFloat(invoice.amount_paid) > 0 && (
                  <InfoRow icon={CheckCircle2} label="Amount Paid" value={`${currency} ${formatAmount(invoice.amount_paid)}`} success />
                )}
              </div>
            </div>

            {/* Reference info */}
            {invoice.reference && (
              <div className="bg-card border border-border rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-4 w-4" />
                  </span>
                  Reference
                </h2>
                <p className="text-sm text-foreground">{invoice.reference}</p>
              </div>
            )}

            {/* Collections & provider responses */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  Collections
                </h2>
                <span className="text-xs text-muted-foreground">
                  {collections.length} attempt{collections.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {collections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No collection attempts yet.</p>
                ) : (
                  collections.map((p) => <CollectionEventCard key={p.id} p={p} />)
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <User className="h-4 w-4" />
                </span>
                Customer
              </h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{invoice.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.organization_name}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Calendar className="h-4 w-4" />
                </span>
                Dates
              </h2>
              <div className="space-y-3">
                <InfoRow icon={Calendar} label="Issue Date" value={formatDate(invoice.date)} />
                <InfoRow icon={Calendar} label="Due Date" value={formatDate(invoice.due_date || '')} />
              </div>
            </div>

            {/* Details */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2.5">
                <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="h-4 w-4" />
                </span>
                Details
              </h2>
              <div className="space-y-3">
                <InfoRow icon={FileText} label="Invoice Number" value={invoice.invoice_number || '-'} />
                <InfoRow icon={Receipt} label="Type" value={invoice.invoice_type === 'ACCREC' ? 'Sales Invoice' : 'Bill'} />
                <InfoRow icon={Building2} label="Currency" value={currency} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Collection attempt + provider response -----
function cleanCcy(c?: string): string {
  return c ? String(c).split('.').pop() || c : '';
}

function CollectionEventCard({ p }: { p: PaymentEvent }) {
  const link = p.payment_link && p.payment_link.startsWith('http') ? p.payment_link : '';
  const failed = p.provider_status === 'ERROR_PAYMENT' || p.provider_status === 'FAILED_PAYMENT';
  const errorMsg = failed ? p.payout_error || p.rejection_reason || '' : '';
  const rows: Array<[string, string]> = [];
  if (p.provider_reference) rows.push(['Reference', p.provider_reference]);
  if (p.approved_by_name) rows.push(['Approved by', p.approved_by_name]);
  if (p.bank_status_description) rows.push(['Bank status', p.bank_status_description]);

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {p.method_display || p.method}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
              {p.created_by_name ? ` · ${p.created_by_name}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium text-foreground tabular-nums">
            {cleanCcy(p.currency)} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <StatusBadge status={p.provider_status} size="sm" />
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg.replace(/^Payout failed:\s*/i, '')}</span>
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted transition-colors"
        >
          <span className="text-muted-foreground truncate">{link}</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </a>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1 border-t border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">{k}</span>
              <span className="text-foreground truncate text-right" title={v}>
                {v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  bold,
  success,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  bold?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${success ? 'text-primary' : 'text-muted-foreground/60'}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-sm ${bold ? 'font-bold text-foreground' : success ? 'font-medium text-primary' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
