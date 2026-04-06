/**
 * React Query hooks for Sales Invoices (Receivables)
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { invoicesApi, Invoice, InvoiceStats, InvoiceFilters } from '@/lib/invoices-api';

export function useCollectionEvents(organizationId?: string): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['collection-events', organizationId],
    queryFn: async () => {
      const result = await invoicesApi.getCollectionEvents({ organization: organizationId });
      return result ?? [];
    },
    refetchInterval: 15000, // Poll every 15s for status updates
  });
}

export function useInvoices(filters?: InvoiceFilters): UseQueryResult<Invoice[], Error> {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const result = await invoicesApi.getInvoices(filters);
      return result ?? [];
    },
  });
}

export function useInvoice(id: number): UseQueryResult<Invoice, Error> {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceStats(organizationId?: string): UseQueryResult<InvoiceStats, Error> {
  return useQuery({
    queryKey: ['invoice-stats', organizationId],
    queryFn: async () => {
      const result = await invoicesApi.getInvoiceStats(organizationId);
      return result ?? {
        total_outstanding: '0',
        outstanding_count: 0,
        overdue_amount: '0',
        overdue_count: 0,
        total_paid: '0',
        total_invoices: 0,
      };
    },
  });
}
