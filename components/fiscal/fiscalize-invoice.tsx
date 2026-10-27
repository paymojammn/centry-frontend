'use client';

/**
 * "Fiscalize" on ERP outgoing invoices. Shown only when the organization has
 * the `fiscalization` feature AND an active fiscal connection; when a fiscal
 * document already exists for the invoice its status / FDN is shown instead.
 */

import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import Link from 'next/link';
import { Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fiscalKeys, useFiscalConnections, useFiscalDocuments, useFiscalizeInvoice } from '@/hooks/use-fiscal';
import { fiscalApi } from '@/lib/fiscal-api';
import { useOrgFeatures } from '@/hooks/use-user';
import {
  canRetry,
  documentSourceKey,
  findDocumentForSource,
  fiscalSourceForInvoice,
  isFiscalizableInvoiceStatus,
  sourceInvoiceTypes,
  indexDocumentsBySource,
  type FiscalSourceRef,
} from '@/lib/fiscal';
import type { FiscalConnection, FiscalDocument } from '@/types/fiscal';
import { FiscalConnectionSelect } from './connection-select';
import { FiscalStatusBadge } from './fiscal-status-badge';

/** Feature + active connections for an organization. */
export function useFiscalInvoiceSupport(organizationId?: string | null) {
  const { hasFeature, isLoading } = useOrgFeatures(organizationId);
  const featureOn = !isLoading && !!organizationId && hasFeature('fiscalization');
  const { data } = useFiscalConnections(organizationId, { enabled: featureOn });
  const connections = useMemo(() => (data?.results ?? []).filter((c) => c.is_active), [data]);
  return { enabled: featureOn && connections.length > 0, connections };
}

/**
 * Newest fiscal document per source invoice for a list of ERP invoices.
 *
 * The documents API filters `source_invoice_type` / `source_invoice_id`
 * exactly but takes one value each (no comma lists), so the list page makes
 * one call per source invoice type on screen (usually one: the org's ERP),
 * capped at the API's max page size, and indexes the result on
 * `source_invoice_type:source_invoice_id`.
 */
export function useFiscalDocumentsBySource(
  organizationId: string | null | undefined,
  invoices: { id: number | string; provider?: string | null }[],
  enabled: boolean,
) {
  const types = sourceInvoiceTypes(invoices);
  const results = useQueries({
    queries: types.map((source_invoice_type) => {
      const filters = { organization: organizationId || undefined, source_invoice_type, page_size: 200 };
      return {
        queryKey: fiscalKeys.documentList(filters),
        queryFn: () => fiscalApi.getDocuments(filters),
        enabled: enabled && !!organizationId,
      };
    }),
  });
  const docs = results.flatMap((r) => r.data?.results ?? []);
  const dataKey = results.map((r) => r.dataUpdatedAt).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => indexDocumentsBySource(docs), [dataKey]);
}

/** The fiscal document for one source invoice: one exact API call. */
export function useFiscalDocumentForInvoice(
  organizationId: string | null | undefined,
  source: FiscalSourceRef | null,
  enabled: boolean,
): FiscalDocument | undefined {
  const { data } = useFiscalDocuments(
    {
      organization: organizationId || undefined,
      source_invoice_type: source?.source_invoice_type,
      source_invoice_id: source?.source_invoice_id,
      page_size: 20,
    },
    { enabled: enabled && !!source },
  );
  // Newest first by default (credit notes for the same source sort above).
  return source ? findDocumentForSource(data?.results ?? [], source) : undefined;
}

export function InvoiceFiscalStatus({ document }: { document: FiscalDocument }) {
  return (
    <Link
      href="/fiscal/documents"
      className="inline-flex items-center gap-1.5"
      title={document.fdn ? `FDN ${document.fdn}` : document.error_message || document.status_label}
    >
      <FiscalStatusBadge status={document.status} label={document.status_label} size="sm" />
      {document.fdn && <span className="font-mono text-xs text-muted-foreground">{document.fdn}</span>}
    </Link>
  );
}

export function FiscalizeInvoiceButton({
  source,
  connections,
  invoiceLabel,
  existing,
  size = 'sm',
  className,
}: {
  source: FiscalSourceRef;
  connections: FiscalConnection[];
  invoiceLabel?: string;
  /** A document already on file; only error / rejected ones may be resubmitted. */
  existing?: FiscalDocument;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState('');
  const fiscalize = useFiscalizeInvoice();
  if (connections.length === 0) return null;
  if (existing && !canRetry(existing)) return null;

  const connectionId = connections.some((c) => c.id === picked) ? picked : (connections[0]?.id ?? '');

  const submit = () =>
    fiscalize.mutate({ connection_id: connectionId, ...source }, { onSuccess: () => setOpen(false) });

  // Events from the portalled dialog bubble through the React tree; keep
  // them away from clickable table rows this button may sit in.
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <Button size={size} variant="outline" className={className} onClick={() => setOpen(true)}>
        <Stamp className="h-3.5 w-3.5 mr-1" /> {existing ? 'Re-fiscalize' : 'Fiscalize'}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fiscalize invoice</DialogTitle>
            <DialogDescription>
              Submit {invoiceLabel ? `invoice ${invoiceLabel}` : 'this invoice'} to the tax authority. The result
              appears under Fiscalization → Documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <label htmlFor="fiscalize-connection" className="text-sm font-medium text-foreground">
              Fiscal connection
            </label>
            <FiscalConnectionSelect
              id="fiscalize-connection"
              connections={connections}
              value={connectionId}
              onChange={setPicked}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={fiscalize.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={fiscalize.isPending}>
              {fiscalize.isPending ? 'Submitting…' : 'Fiscalize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
}

/** Row cell for the ERP invoice list: fiscal status (if any) + Fiscalize. */
export function InvoiceFiscalCell({
  invoice,
  connections,
  documentsBySource,
}: {
  invoice: { id: number | string; provider?: string | null; invoice_number?: string; status?: string };
  connections: FiscalConnection[];
  documentsBySource: Map<string, FiscalDocument>;
}) {
  const source = fiscalSourceForInvoice(invoice);
  if (!source) return null;
  const doc = documentsBySource.get(documentSourceKey(source));
  return (
    <>
      {doc && <InvoiceFiscalStatus document={doc} />}
      {isFiscalizableInvoiceStatus(invoice.status) && (
        <FiscalizeInvoiceButton
        source={source}
        connections={connections}
        invoiceLabel={invoice.invoice_number}
        existing={doc}
        className="h-7 px-2.5 text-xs font-normal"
        />
      )}
    </>
  );
}
