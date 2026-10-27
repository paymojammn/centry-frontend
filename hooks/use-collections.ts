/**
 * Collections matching — inflows (bank statement credits and mobile money
 * pay-ins) against open invoices in every connected ERP.
 *
 * Backend: /api/v1/banking/collections/summary/ and the match / unmatch /
 * post_to_erp / bulk_post actions on /api/v1/banking/transactions/.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';

export type CollectionStatus = 'unmatched' | 'suggested' | 'matched' | 'reviewed' | 'posted';
export type CollectionErp = 'xero' | 'erpnext' | 'qbo' | '';

export interface CollectionAllocation {
  erp: CollectionErp;
  invoice_id: string;
  amount: string | number;
  reference?: string;
  contact?: string;
  payment_id?: string;
}

export interface CollectionInflow {
  id: number;
  transaction_date: string;
  received_at: string | null;
  description: string;
  reference: string;
  external_id: string;
  currency: string;
  credit_amount: string | null;
  amount: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  source_type: 'bank' | 'mobile_money' | 'credit_card' | 'payment_gateway' | 'pos' | 'other';
  source_provider: string;
  bank_name: string;
  counterparty_name: string;
  counterparty_phone: string;
  match_status: CollectionStatus;
  matched_erp: CollectionErp;
  matched_to_type: string;
  matched_to_id: string;
  matched_to_reference: string;
  matched_amount: string | null;
  match_confidence: number;
  match_allocations: CollectionAllocation[];
  erp_payment_id: string;
  posted_to_erp_at: string | null;
  sync_error: string;
  organization: string;
}

export interface SuggestedInvoice {
  type: 'invoice' | 'bill';
  erp: CollectionErp;
  id: string;
  external_id?: string;
  reference: string;
  invoice_number?: string;
  amount: number;
  amount_due: number;
  total: number;
  currency?: string;
  date: string | null;
  due_date: string | null;
  contact: string;
  confidence: number;
  rules_applied: string[];
  partial?: boolean;
  status: string;
}

/** {currency: {count, amount}} */
export type CurrencyTotals = Record<string, { count: number; amount: string }>;

export interface CollectionsSummary {
  organization: string;
  currencies: string[];
  by_status: Record<'unmatched' | 'suggested' | 'matched' | 'posted', CurrencyTotals>;
  totals: {
    received: CurrencyTotals;
    unmatched: CurrencyTotals;
    suggested: CurrencyTotals;
    matched: CurrencyTotals;
    posted: CurrencyTotals;
    open_invoices: CurrencyTotals;
  };
  by_source: CurrencyTotals;
  total_transactions: number;
}

export interface PostResult {
  transaction_id: number;
  success: boolean;
  status: string;
  posted: CollectionAllocation[];
  errors: string[];
}

export interface BulkPostResult {
  posted_count: number;
  failed_count: number;
  results: PostResult[];
}

const TX = '/api/v1/banking/transactions';

/** Count + amount for one currency out of a per-currency map (first currency wins). */
export function totalsFor(totals: CurrencyTotals | undefined, currency: string) {
  const row = totals?.[currency];
  return { count: row?.count ?? 0, amount: Number(row?.amount ?? 0) };
}

/** Sum of allocation amounts and how far it is from the credit (both in minor-unit tolerance). */
export function allocationsBalance(allocations: { amount: string | number }[], credit: number) {
  const total = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const diff = Math.round((credit - total) * 100) / 100;
  return { total, diff, balanced: Math.abs(diff) < 0.005 };
}

export function useCollectionsSummary(organizationId?: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (organizationId) params.append('organization', organizationId);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  return useQuery<CollectionsSummary>({
    queryKey: ['collections-summary', organizationId, dateFrom, dateTo],
    queryFn: () => get(`/api/v1/banking/collections/summary/?${params.toString()}`),
    enabled: !!organizationId,
  });
}

export function useCollectionInflows(filters: {
  organizationId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  params.append('transaction_type', 'CREDIT');
  if (filters.organizationId) params.append('organization', filters.organizationId);
  if (filters.status && filters.status !== 'all') params.append('match_status', filters.status);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  if (filters.search) params.append('search', filters.search);
  return useQuery<{ results: CollectionInflow[]; count: number }>({
    queryKey: ['collection-inflows', params.toString()],
    queryFn: () => get(`${TX}/?${params.toString()}`),
    enabled: !!filters.organizationId,
  });
}

export function useSuggestedInvoices(transactionId?: number) {
  return useQuery<{ transaction_id: number; matches: SuggestedInvoice[]; count: number }>({
    queryKey: ['collection-suggestions', transactionId],
    queryFn: () => get(`${TX}/${transactionId}/suggest_matches/`),
    enabled: !!transactionId,
  });
}

/** Open invoices from every ERP, filtered client-side by number / customer. */
export function useOpenInvoiceSearch(organizationId?: string, search?: string) {
  const params = new URLSearchParams({ status: 'outstanding' });
  if (organizationId) params.append('organization', organizationId);
  return useQuery<{ results: OpenInvoiceRow[] } | OpenInvoiceRow[], Error, OpenInvoiceRow[]>({
    queryKey: ['collection-open-invoices', organizationId],
    queryFn: () => get(`/api/v1/erp/invoices/?${params.toString()}`),
    enabled: !!organizationId && !!search,
    select: (data) => {
      const rows: OpenInvoiceRow[] = Array.isArray(data) ? data : data.results ?? [];
      const q = (search || '').trim().toLowerCase();
      if (!q) return rows.slice(0, 20);
      return rows
        .filter(
          (r) =>
            r.invoice_number?.toLowerCase().includes(q) ||
            r.customer_name?.toLowerCase().includes(q) ||
            r.reference?.toLowerCase().includes(q),
        )
        .slice(0, 20);
    },
  });
}

export interface OpenInvoiceRow {
  id: number | string;
  provider: CollectionErp;
  invoice_number: string;
  reference: string;
  customer_name: string;
  currency: string;
  amount_due: string;
  due_date: string | null;
}

function useInvalidateCollections() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['collection-inflows'] });
    queryClient.invalidateQueries({ queryKey: ['collections-summary'] });
    queryClient.invalidateQueries({ queryKey: ['collection-suggestions'] });
  };
}

export function useConfirmMatch() {
  const invalidate = useInvalidateCollections();
  return useMutation<
    { status: string; message: string; transaction: CollectionInflow },
    Error,
    { transactionId: number; allocations: CollectionAllocation[]; notes?: string }
  >({
    mutationFn: ({ transactionId, allocations, notes }) =>
      post(`${TX}/${transactionId}/match/`, { allocations, notes }),
    onSuccess: invalidate,
  });
}

export function useUnmatch() {
  const invalidate = useInvalidateCollections();
  return useMutation<{ status: string; message: string }, Error, number>({
    mutationFn: (transactionId) => post(`${TX}/${transactionId}/unmatch/`, {}),
    onSuccess: invalidate,
  });
}

export function usePostToErp() {
  const invalidate = useInvalidateCollections();
  return useMutation<PostResult & { message: string }, Error, number>({
    mutationFn: (transactionId) => post(`${TX}/${transactionId}/post_to_erp/`, {}),
    onSuccess: invalidate,
  });
}

export function useBulkPost() {
  const invalidate = useInvalidateCollections();
  return useMutation<BulkPostResult, Error, { organizationId: string; transactionIds?: number[] }>({
    mutationFn: ({ organizationId, transactionIds }) =>
      post(`${TX}/bulk_post/`, { organization: organizationId, transaction_ids: transactionIds }),
    onSuccess: invalidate,
  });
}
