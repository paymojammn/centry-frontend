/**
 * React Query hooks for Bills and Payment Events
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { billsApi, paymentEventsApi } from '@/lib/bills-api';
import type {
  Bill,
  BillStats,
  BillFilters,
  PaymentEvent,
  PaymentEventStats,
  PaymentEventFilters,
  ApprovePaymentsResponse,
  RejectPaymentsResponse,
  GenerateFileResponse,
  DenyPaymentsResponse,
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

/**
 * Hook to approve payments
 */
export function useApprovePayments() {
  const queryClient = useQueryClient();

  return useMutation<ApprovePaymentsResponse, Error, number[]>({
    mutationFn: (paymentEventIds) => paymentEventsApi.approvePayments(paymentEventIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
      queryClient.invalidateQueries({ queryKey: ['payment-event-stats'] });
    },
  });
}

/**
 * Hook to reject payments
 */
export function useRejectPayments() {
  const queryClient = useQueryClient();

  return useMutation<RejectPaymentsResponse, Error, { ids: number[]; reason?: string }>({
    mutationFn: ({ ids, reason }) => paymentEventsApi.rejectPayments(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
      queryClient.invalidateQueries({ queryKey: ['payment-event-stats'] });
    },
  });
}

/**
 * Hook to generate payment file
 */
export function useGeneratePaymentFile() {
  const queryClient = useQueryClient();

  return useMutation<
    GenerateFileResponse,
    Error,
    { paymentEventIds: number[]; sourceBankAccountId: number; fileFormat: 'csv' | 'xml' }
  >({
    mutationFn: ({ paymentEventIds, sourceBankAccountId, fileFormat }) =>
      paymentEventsApi.generatePaymentFile(paymentEventIds, sourceBankAccountId, fileFormat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
      queryClient.invalidateQueries({ queryKey: ['payment-event-stats'] });
    },
  });
}

/**
 * Hook to deny payments (cancel and restore bill to payable)
 */
export function useDenyPayments() {
  const queryClient = useQueryClient();

  return useMutation<DenyPaymentsResponse, Error, { ids: number[]; reason?: string }>({
    mutationFn: ({ ids, reason }) => paymentEventsApi.denyPayments(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
      queryClient.invalidateQueries({ queryKey: ['payment-event-stats'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}
