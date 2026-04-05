/**
 * React Query hooks for Sales Invoices (Receivables)
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { invoicesApi, Invoice, InvoiceStats, InvoiceFilters } from '@/lib/invoices-api';

export function useInvoices(filters?: InvoiceFilters): UseQueryResult<Invoice[], Error> {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getInvoices(filters),
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
    queryFn: () => invoicesApi.getInvoiceStats(organizationId),
  });
}
