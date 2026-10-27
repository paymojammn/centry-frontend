'use client';

import { AlertCircle, Stamp } from 'lucide-react';
import { fiscalSourceForInvoice, isFiscalizableInvoiceStatus } from '@/lib/fiscal';
import type { Invoice } from '@/lib/invoices-api';
import { FiscalStatusBadge } from './fiscal-status-badge';
import { FiscalizeInvoiceButton, useFiscalDocumentForInvoice, useFiscalInvoiceSupport } from './fiscalize-invoice';

/** Fiscal status + Fiscalize action on the ERP invoice detail page. */
export function InvoiceFiscalCard({ invoice }: { invoice: Invoice }) {
  const { enabled, connections } = useFiscalInvoiceSupport(invoice.org);
  const source = fiscalSourceForInvoice(invoice);
  const doc = useFiscalDocumentForInvoice(invoice.org, source, enabled);

  if (!enabled || !source) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2.5">
        <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
          <Stamp className="h-4 w-4" />
        </span>
        Fiscalization
      </h2>
      {doc ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <FiscalStatusBadge status={doc.status} label={doc.status_label} size="sm" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">FDN</span>
            <span className="text-sm font-mono text-foreground break-all text-right">{doc.fdn || '—'}</span>
          </div>
          {doc.verification_code && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Verification</span>
              <span className="text-sm font-mono text-foreground break-all text-right">{doc.verification_code}</span>
            </div>
          )}
          {doc.error_message && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{doc.error_message}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">Not fiscalized yet.</p>
      )}
      {isFiscalizableInvoiceStatus(invoice.status) && (
        <div className="mt-3">
          <FiscalizeInvoiceButton
            source={source}
            connections={connections}
            invoiceLabel={invoice.invoice_number}
            existing={doc}
          />
        </div>
      )}
    </div>
  );
}
