/**
 * Bill Detail Page
 * 
 * Displays detailed information about a specific bill
 */

'use client';

import { useBill, usePaymentEvents } from '@/hooks/use-bills';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { PaymentEvent } from '@/types/bill';

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const billId = parseInt(params?.id as string);
  
  const { data: bill, isLoading, error } = useBill(billId);
  const { data: payments = [] } = usePaymentEvents({ bill_id: billId, direction: 'OUT' });

  if (isLoading) {
    return <BillDetailSkeleton />;
  }

  if (error || !bill) {
    return (
      <div className="container py-8">
        <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Bill</h3>
          <p className="text-muted-foreground mb-2">{error?.message || 'Bill not found'}</p>
          {billId && (
            <p className="text-sm text-muted-foreground">Bill ID: {billId}</p>
          )}
          <Button onClick={() => router.push('/bills')} className="mt-4">
            Back to Bills
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    'PAID': { color: 'bg-primary/10 text-primary', icon: CheckCircle2 },
    'AUTHORISED': { color: 'bg-[#6B8FB8]/10 text-[#6B8FB8]', icon: Clock },
    'VOIDED': { color: 'bg-destructive/10 text-destructive', icon: XCircle },
  };

  const statusInfo = statusConfig[bill.status as keyof typeof statusConfig] || {
    color: 'bg-muted text-foreground',
    icon: FileText
  };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/bills')}
          aria-label="Back to bills"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Bill Details</h1>
          <p className="text-muted-foreground mt-1">
            Invoice #{bill.invoice_number || bill.invoice_id}
          </p>
        </div>
        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${statusInfo.color}`}>
          <StatusIcon className="h-4 w-4" />
          {bill.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Summary */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Bill Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow 
                label="Invoice Number" 
                value={bill.invoice_number || 'N/A'} 
                icon={<FileText className="h-4 w-4 text-primary" />}
              />
              <InfoRow 
                label="Reference" 
                value={bill.reference || 'No reference'} 
                icon={<FileText className="h-4 w-4 text-primary" />}
              />
              <InfoRow 
                label="Invoice Date" 
                value={bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'} 
                icon={<Calendar className="h-4 w-4 text-primary" />}
              />
              <InfoRow 
                label="Due Date" 
                value={bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'} 
                icon={<Calendar className="h-4 w-4 text-primary" />}
              />
              <InfoRow 
                label="Description" 
                value={bill.description} 
                icon={<FileText className="h-4 w-4 text-primary" />}
              />
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Financial Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">
                  {bill.currency} {parseFloat(bill.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="text-muted-foreground">Tax</span>
                <span className="text-foreground font-medium">
                  {bill.currency} {parseFloat(bill.total_tax).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">
                  {bill.currency} {parseFloat(bill.total).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-primary font-medium">
                  {bill.currency} {parseFloat(bill.amount_paid).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">
                  {bill.status === 'PAID' ? 'Total Amount' : 'Amount Due'}
                </span>
                <span className="text-2xl font-bold text-primary">
                  {bill.currency} {parseFloat(
                    bill.status === 'PAID' ? bill.total : bill.amount_due
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payments & provider responses */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Payments</h2>
              <span className="text-xs text-muted-foreground">
                {payments.length} attempt{payments.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="p-6 space-y-3">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment attempts yet.</p>
              ) : (
                payments.map((p) => <PaymentEventCard key={p.id} p={p} />)
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Vendor</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{bill.vendor_name}</div>
                  <div className="text-sm text-muted-foreground">Vendor</div>
                </div>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Organization</h2>
            </div>
            <div className="p-6 space-y-3">
              <InfoRow 
                label="Name" 
                value={bill.organization_name} 
                icon={<Building2 className="h-4 w-4 text-primary" />}
              />
              <InfoRow 
                label="Connection" 
                value={bill.connection_name} 
                icon={<FileText className="h-4 w-4 text-primary" />}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border border-border rounded-lg shadow-sm p-6 space-y-3">
            <Button className="w-full">
              <DollarSign className="h-4 w-4" />
              Schedule Payment
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Payment attempt + provider response -----
function cleanCcy(c?: string): string {
  return c ? String(c).split('.').pop() || c : '';
}

function PaymentEventCard({ p }: { p: PaymentEvent }) {
  const d = p.payout_details || {};
  const recipient = `${d.first_name || ''} ${d.surname || ''}`.trim() || d.account_name || '';
  const rows: Array<[string, string]> = [];
  if (p.provider_reference) rows.push(['Reference', p.provider_reference]);
  if (d.payout_method_slug) rows.push(['Payout method', d.payout_method_slug]);
  if (recipient) rows.push(['Recipient', recipient]);
  if (d.mobile) rows.push(['Mobile', d.mobile]);
  if (d.account_number) rows.push(['Account', `••${d.account_number.slice(-4)}`]);
  if (p.approved_by_name) rows.push(['Approved by', p.approved_by_name]);
  if (p.bank_status_description) rows.push(['Bank status', p.bank_status_description]);

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center size-8 rounded-lg bg-background ring-1 ring-border shrink-0">
            <CreditCard className="h-4 w-4 text-foreground" />
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

      {/* Provider failure reason */}
      {p.provider_status === 'ERROR_PAYMENT' && p.payout_error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{p.payout_error.replace(/^Payout failed:\s*/i, '')}</span>
        </div>
      )}

      {/* Request / response details */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1 border-t border-border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">{k}</span>
              <span className="text-foreground truncate text-right" title={v}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-foreground font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

// Loading Skeleton
function BillDetailSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
        </div>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="h-6 bg-muted animate-pulse rounded w-1/4 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="h-6 bg-muted animate-pulse rounded w-1/2 mb-4" />
              <div className="h-12 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
