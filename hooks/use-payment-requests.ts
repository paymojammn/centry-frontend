/**
 * Payment Requests React Query Hooks
 *
 * Hooks for payment request CRUD and approval workflow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentRequestsApi } from '@/lib/payment-requests-api';
import type {
  PaymentRequest,
  CreatePaymentRequestPayload,
  PaymentRequestFilters,
} from '@/types/payment-request';
import { toast } from 'sonner';

// Query keys
export const paymentRequestKeys = {
  all: ['payment-requests'] as const,
  lists: () => [...paymentRequestKeys.all, 'list'] as const,
  list: (filters?: PaymentRequestFilters) => [...paymentRequestKeys.lists(), filters] as const,
  details: () => [...paymentRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentRequestKeys.details(), id] as const,
  stats: (organizationId?: string) => [...paymentRequestKeys.all, 'stats', organizationId] as const,
  pending: (organizationId?: string) => [...paymentRequestKeys.all, 'pending', organizationId] as const,
};

/**
 * Get payment requests with filters
 */
export function usePaymentRequests(filters?: PaymentRequestFilters) {
  return useQuery({
    queryKey: paymentRequestKeys.list(filters),
    queryFn: () => paymentRequestsApi.getPaymentRequests(filters),
    enabled: !!filters?.organization_id,
  });
}

/**
 * Get a single payment request
 */
export function usePaymentRequest(requestId: string) {
  return useQuery({
    queryKey: paymentRequestKeys.detail(requestId),
    queryFn: () => paymentRequestsApi.getPaymentRequest(requestId),
    enabled: !!requestId,
  });
}

/**
 * Get payment request statistics
 */
export function usePaymentRequestStats(organizationId?: string) {
  return useQuery({
    queryKey: paymentRequestKeys.stats(organizationId),
    queryFn: () => paymentRequestsApi.getStats(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Get pending payment requests for approval
 */
export function usePendingPaymentRequests(organizationId?: string) {
  return useQuery({
    queryKey: paymentRequestKeys.pending(organizationId),
    queryFn: () => paymentRequestsApi.getPendingRequests(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Create a new payment request
 */
export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePaymentRequestPayload) =>
      paymentRequestsApi.createPaymentRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment request created');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create payment request');
    },
  });
}

/**
 * Update a payment request
 */
export function useUpdatePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: string;
      payload: Partial<CreatePaymentRequestPayload>;
    }) => paymentRequestsApi.updatePaymentRequest(requestId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.lists() });
      toast.success('Payment request updated');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update payment request');
    },
  });
}

/**
 * Delete a payment request
 */
export function useDeletePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => paymentRequestsApi.deletePaymentRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment request deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete payment request');
    },
  });
}

/**
 * Submit payment request for approval
 */
export function useSubmitPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => paymentRequestsApi.submitForApproval(requestId),
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.detail(requestId) });
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment request submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit payment request');
    },
  });
}

/**
 * Approve a payment request
 */
export function useApprovePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string }) =>
      paymentRequestsApi.approveRequest(requestId, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment request approved');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to approve payment request');
    },
  });
}

/**
 * Reject a payment request
 */
export function useRejectPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      paymentRequestsApi.rejectRequest(requestId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.detail(variables.requestId) });
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment request rejected');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reject payment request');
    },
  });
}

/**
 * Process an approved payment request
 */
export function useProcessPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => paymentRequestsApi.processRequest(requestId),
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.detail(requestId) });
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      toast.success('Payment processed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to process payment');
    },
  });
}
