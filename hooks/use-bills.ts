/**
 * React Query hooks for Bills and Payment Events
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { billsApi, paymentEventsApi } from '@/lib/bills-api';
import type {
  Bill,
  BillStats,
  BillFilters,
  PaymentEvent,
  PaymentEventStats,
  PaymentEventFilters,
} from '@/types/bill';

/**
 * Hook to fetch all bills
 */
export function useBills(filters?: BillFilters): UseQueryResult<Bill[], Error> {
  return useQuery({
    queryKey: ['bills', filters],
    queryFn: () => billsApi.getBills(filters),
  });
}

/**
 * Hook to fetch a single bill
 */
export function useBill(id: number): UseQueryResult<Bill, Error> {
  return useQuery({
    queryKey: ['bill', id],
    queryFn: () => billsApi.getBill(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch bill statistics
 */
export function useBillStats(organizationId?: string): UseQueryResult<BillStats, Error> {
  return useQuery({
    queryKey: ['bill-stats', organizationId],
    queryFn: () => billsApi.getBillStats(organizationId),
  });
}

/**
 * Hook to fetch payment providers
 */
export function usePaymentProviders(countryCode: string = 'UG') {
  return useQuery({
    queryKey: ['payment-providers', countryCode],
    queryFn: () => billsApi.getPaymentProviders(countryCode),
  });
}

// ==========================================
// Payment Events (Processing Queue) Hooks
// ==========================================

/**
 * Hook to fetch payment events (processing queue)
 */
export function usePaymentEvents(
  filters?: PaymentEventFilters
): UseQueryResult<PaymentEvent[], Error> {
  return useQuery({
    queryKey: ['payment-events', filters],
    queryFn: () => paymentEventsApi.getPaymentEvents(filters),
    refetchInterval: 30000, // Refresh every 30 seconds to get status updates
  });
}

/**
 * Hook to fetch a single payment event
 */
export function usePaymentEvent(id: number): UseQueryResult<PaymentEvent, Error> {
  return useQuery({
    queryKey: ['payment-event', id],
    queryFn: () => paymentEventsApi.getPaymentEvent(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch payment event statistics
 */
export function usePaymentEventStats(
  organizationId?: string
): UseQueryResult<PaymentEventStats, Error> {
  return useQuery({
    queryKey: ['payment-event-stats', organizationId],
    queryFn: () => paymentEventsApi.getPaymentEventStats(organizationId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
