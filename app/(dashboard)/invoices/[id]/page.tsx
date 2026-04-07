'use client';

import { useParams, useRouter } from 'next/navigation';
import { useInvoice } from '@/hooks/use-invoices';
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  Receipt,
  Loader2,
  AlertCircle,
  User,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  DRAFT: { color: '#6B8FB8', bg: '#6B8FB8/10', label: 'Draft' },
  SUBMITTED: { color: '#b08b00', bg: '#fed652/10', label: 'Sent' },
  AUTHORISED: { color: '#f77f00', bg: '#f77f00/10', label: 'Outstanding' },
  PAID: { color: '#5C8A65', bg: '#5C8A65/10', label: 'Paid' },
  VOIDED: { color: '#bec3c6', bg: '#bec3c6/10', label: 'Voided' },
};

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
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.DRAFT;
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
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount card */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Invoice Summary</h2>
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
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Reference</h2>
                <p className="text-sm text-foreground">{invoice.reference}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Customer</h2>
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
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Dates</h2>
              <div className="space-y-3">
                <InfoRow icon={Calendar} label="Issue Date" value={formatDate(invoice.date)} />
                <InfoRow icon={Calendar} label="Due Date" value={formatDate(invoice.due_date || '')} />
              </div>
            </div>

            {/* Details */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Details</h2>
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
