'use client';

import { useState } from 'react';
import { AlertCircle, Ban, ExternalLink, Printer, QrCode, RefreshCw, RotateCcw } from 'lucide-react';
import { LoadingState } from '@/components/layout/loading-state';
import { Button } from '@/components/ui/button';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  useFiscalDocument,
  useFiscalReceipt,
  useRefreshFiscalDocument,
  useRetryFiscalDocument,
} from '@/hooks/use-fiscal';
import { canCancel, canRefresh, canRetry, countryLabel } from '@/lib/fiscal';
import type { FiscalDocument } from '@/types/fiscal';
import { CancelDocumentDialog } from './cancel-document-dialog';
import { FiscalStatusBadge } from './fiscal-status-badge';
import { JsonBlock } from './json-block';
import { ReceiptDialog } from './receipt-dialog';

function formatAmount(amount: string | number | null | undefined): string {
  const n = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  if (Number.isNaN(n)) return String(amount ?? '');
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm text-foreground text-right break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

/** Fiscal document drawer: result codes, envelopes and actions. */
export function DocumentDetailSheet({ documentId, onClose }: { documentId: string | null; onClose: () => void }) {
  const { data: doc, isLoading, error } = useFiscalDocument(documentId);
  const retry = useRetryFiscalDocument();
  const refresh = useRefreshFiscalDocument();
  const receipt = useFiscalReceipt();
  const [receiptHtml, setReceiptHtml] = useState<string | null>(null);
  const [cancelDoc, setCancelDoc] = useState<FiscalDocument | null>(null);

  const openReceipt = (id: string) => receipt.mutate(id, { onSuccess: (html) => setReceiptHtml(html) });

  return (
    <>
      <Sheet open={!!documentId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{doc ? doc.invoice_number || doc.instance_invoice_id : 'Fiscal document'}</SheetTitle>
            <SheetDescription>
              {doc ? `${doc.kind === 'credit_note' ? 'Credit note' : 'Invoice'} · ${countryLabel(doc.country_code)}` : ' '}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-5">
            {isLoading ? (
              <LoadingState />
            ) : error || !doc ? (
              <div className="py-12 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Could not load this document</p>
                <p className="text-sm text-muted-foreground mt-1">{error?.message || 'Please try again.'}</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <FiscalStatusBadge status={doc.status} label={doc.status_label} />
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {doc.currency} {formatAmount(doc.total_amount)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canRetry(doc) && (
                    <Button size="sm" onClick={() => retry.mutate(doc.id)} disabled={retry.isPending}>
                      <RotateCcw className={`h-4 w-4 mr-2 ${retry.isPending ? 'animate-spin' : ''}`} /> Retry
                    </Button>
                  )}
                  {canRefresh(doc) && (
                    <Button size="sm" variant="outline" onClick={() => refresh.mutate(doc.id)} disabled={refresh.isPending}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${refresh.isPending ? 'animate-spin' : ''}`} /> Refresh status
                    </Button>
                  )}
                  {doc.fdn && (
                    <Button size="sm" variant="outline" onClick={() => openReceipt(doc.id)} disabled={receipt.isPending}>
                      <Printer className="h-4 w-4 mr-2" /> {receipt.isPending ? 'Loading…' : 'Print receipt'}
                    </Button>
                  )}
                  {canCancel(doc) && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelDoc(doc)}>
                      <Ban className="h-4 w-4 mr-2" /> Cancel / credit note
                    </Button>
                  )}
                </div>

                {doc.error_message && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{doc.error_message}</span>
                  </div>
                )}

                <section className="rounded-lg border border-border px-4 py-2 divide-y divide-border">
                  <Row label="FDN" value={doc.fdn} mono />
                  <Row label="Verification code" value={doc.verification_code} mono />
                  <Row label="Anti-fake code" value={doc.anti_fake_code} mono />
                  {doc.approval_reference && <Row label="Approval reference" value={doc.approval_reference} mono />}
                  <Row label="Upload code" value={doc.upload_code} />
                  <Row label="Upload description" value={doc.upload_desc} />
                </section>

                {doc.qr_code && (
                  <section className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <QrCode className="h-4 w-4 text-primary" /> QR code
                    </div>
                    {/* No QR library in the app: the printable receipt renders the image. */}
                    <p className="text-xs font-mono text-muted-foreground break-all">{doc.qr_code}</p>
                    <Button size="sm" variant="ghost" className="px-0 text-primary" onClick={() => openReceipt(doc.id)}>
                      View on receipt <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </section>
                )}

                <section className="rounded-lg border border-border px-4 py-2 divide-y divide-border">
                  <Row label="Buyer" value={doc.buyer_name} />
                  <Row label="Instance invoice ID" value={doc.instance_invoice_id} mono />
                  <Row label="Connection" value={doc.connection_label} />
                  <Row label="Environment" value={doc.environment?.toUpperCase()} />
                  <Row label="Source" value={doc.source_system ? `${doc.source_system} · ${doc.source_invoice_id}` : ''} />
                  <Row label="Written back" value={doc.written_back_at ? new Date(doc.written_back_at).toLocaleString() : ''} />
                  <Row label="Created" value={new Date(doc.created_at).toLocaleString()} />
                  <Row label="Updated" value={new Date(doc.updated_at).toLocaleString()} />
                </section>

                <div className="space-y-2">
                  <JsonBlock title="Request" data={doc.request_data} />
                  <JsonBlock title="Response" data={doc.response_data} />
                  <JsonBlock title="Canonical invoice" data={doc.canonical_data} />
                </div>
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ReceiptDialog
        html={receiptHtml}
        title={doc?.fdn ? `Receipt · FDN ${doc.fdn}` : undefined}
        onClose={() => setReceiptHtml(null)}
      />
      <CancelDocumentDialog document={cancelDoc} onClose={() => setCancelDoc(null)} />
    </>
  );
}
