/**
 * Expenses React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi, paymentRequestsApi } from '@/lib/expenses-api';
import type {
  ExpenseFilters,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ApproveExpenseRequest,
  PayExpenseRequest,
  CreatePaymentRequestPayload,
  PaymentRequestStatus,
} from '@/types/expense';
import { toast } from 'sonner';

// Query keys
export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters?: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  stats: (orgId?: string) => [...expenseKeys.all, 'stats', orgId] as const,
};

export const paymentRequestKeys = {
  all: ['payment-requests'] as const,
  lists: () => [...paymentRequestKeys.all, 'list'] as const,
  list: (filters?: { status?: PaymentRequestStatus | 'all'; organization_id?: string }) =>
    [...paymentRequestKeys.lists(), filters] as const,
  pending: (orgId?: string) => [...paymentRequestKeys.all, 'pending', orgId] as const,
  stats: (orgId?: string) => [...paymentRequestKeys.all, 'stats', orgId] as const,
  detail: (id: string) => [...paymentRequestKeys.all, 'detail', id] as const,
};

/**
 * Get expenses with filters
 */
export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => expensesApi.getExpenses(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get expense statistics
 */
export function useExpenseStats(organizationId?: string) {
  return useQuery({
    queryKey: expenseKeys.stats(organizationId),
    queryFn: () => expensesApi.getExpenseStats(organizationId),
    staleTime: 60000, // 1 minute
    enabled: !!organizationId,
  });
}

/**
 * Get single expense
 */
export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: expenseKeys.detail(expenseId),
    queryFn: () => expensesApi.getExpense(expenseId),
    enabled: !!expenseId,
  });
}

/**
 * Create expense mutation
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateExpenseRequest) => expensesApi.createExpense(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create expense');
    },
  });
}

/**
 * Update expense mutation
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, request }: { expenseId: string; request: UpdateExpenseRequest }) =>
      expensesApi.updateExpense(expenseId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.expenseId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update expense');
    },
  });
}

/**
 * Delete expense mutation
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete expense');
    },
  });
}

/**
 * Upload receipts for an expense (for accountability)
 */
export function useUploadReceipts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, files }: { expenseId: string; files: File[] }) =>
      expensesApi.uploadReceipts(expenseId, files),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.expenseId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Receipts uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload receipts');
    },
  });
}

/**
 * Submit expense for approval
 */
export function useSubmitExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseId: string) => expensesApi.submitExpense(expenseId),
    onSuccess: (_, expenseId) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(expenseId) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit expense');
    },
  });
}

/**
 * Approve/reject expense
 */
export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ApproveExpenseRequest) => expensesApi.approveExpense(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.expense_id) });
      queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success(variables.approved ? 'Expense approved' : 'Expense rejected');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to process approval');
    },
  });
}

/**
 * Pay expenses
 */
export function usePayExpenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PayExpenseRequest) => expensesApi.payExpenses(request),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wallet'] }); // Invalidate wallet balance

      if (response.success) {
        toast.success(
          `Successfully paid ${response.summary.successful} of ${response.summary.total} expenses`
        );
      } else {
        toast.error(`Payment failed for ${response.summary.failed} expenses`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to process payments');
    },
  });
}

// ============================================================
// Payment Request Hooks
// ============================================================

/**
 * Get payment requests with filters
 */
export function usePaymentRequests(filters?: {
  status?: PaymentRequestStatus | 'all';
  organization_id?: string;
}) {
  return useQuery({
    queryKey: paymentRequestKeys.list(filters),
    queryFn: () => paymentRequestsApi.getPaymentRequests(filters),
    staleTime: 30000,
  });
}

/**
 * Get pending payment requests (approval queue)
 */
export function usePendingPaymentRequests(organizationId?: string) {
  return useQuery({
    queryKey: paymentRequestKeys.pending(organizationId),
    queryFn: () => paymentRequestsApi.getPendingPaymentRequests(organizationId),
    staleTime: 30000,
  });
}

/**
 * Get payment request statistics
 */
export function usePaymentRequestStats(organizationId?: string) {
  return useQuery({
    queryKey: paymentRequestKeys.stats(organizationId),
    queryFn: () => paymentRequestsApi.getPaymentRequestStats(organizationId),
    staleTime: 60000,
  });
}

/**
 * Create payment request mutation
 */
export function useCreatePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePaymentRequestPayload) =>
      paymentRequestsApi.createPaymentRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Payment request submitted for approval');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create payment request');
    },
  });
}

/**
 * Approve payment request mutation
 */
export function useApprovePaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, notes }: { requestId: string; notes?: string }) =>
      paymentRequestsApi.approvePaymentRequest(requestId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Payment request approved');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to approve payment request');
    },
  });
}

/**
 * Reject payment request mutation
 */
export function useRejectPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      paymentRequestsApi.rejectPaymentRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Payment request rejected');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to reject payment request');
    },
  });
}

/**
 * Process payment request mutation
 */
export function useProcessPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => paymentRequestsApi.processPaymentRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Payment processed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Payment processing failed');
    },
  });
}

/**
 * Cancel payment request mutation
 */
export function useCancelPaymentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => paymentRequestsApi.cancelPaymentRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Payment request cancelled');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel payment request');
    },
  });
}
