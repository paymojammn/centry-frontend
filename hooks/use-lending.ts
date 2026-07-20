/**
 * Lending React Query Hooks
 *
 * Loan book grids and repay/disburse mutations over the ERPNext mirror.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lendingApi } from '@/lib/lending-api';
import type {
  LoanFilters,
  RecordDisbursementPayload,
  RecordRepaymentPayload,
} from '@/types/lending';
import { toast } from 'sonner';

// Query keys
export const lendingKeys = {
  all: ['lending'] as const,
  loans: () => [...lendingKeys.all, 'loans'] as const,
  loanList: (filters?: LoanFilters) => [...lendingKeys.loans(), filters] as const,
  loan: (id: string) => [...lendingKeys.all, 'loan', id] as const,
  stats: (organizationId?: string) => [...lendingKeys.all, 'stats', organizationId] as const,
  due: (on?: string, organizationId?: string) =>
    [...lendingKeys.all, 'due', on, organizationId] as const,
  repayments: (loanId?: string) => [...lendingKeys.all, 'repayments', loanId] as const,
  disbursements: (loanId?: string, organizationId?: string) =>
    [...lendingKeys.all, 'disbursements', loanId, organizationId] as const,
};

export function useLoans(filters?: LoanFilters) {
  return useQuery({
    queryKey: lendingKeys.loanList(filters),
    queryFn: () => lendingApi.getLoans(filters),
    enabled: !!filters?.organization,
  });
}

export function useLoan(loanId: string) {
  return useQuery({
    queryKey: lendingKeys.loan(loanId),
    queryFn: () => lendingApi.getLoan(loanId),
    enabled: !!loanId,
  });
}

export function useLoanStats(organizationId?: string) {
  return useQuery({
    queryKey: lendingKeys.stats(organizationId),
    queryFn: () => lendingApi.getStats(organizationId),
    enabled: !!organizationId,
  });
}

export function useDueLoans(on?: string, organizationId?: string) {
  return useQuery({
    queryKey: lendingKeys.due(on, organizationId),
    queryFn: () => lendingApi.getDue(on, organizationId),
    enabled: !!organizationId,
  });
}

/** Sync the loan book from the org's ERP connection (like bills sync). */
export function useSyncLoans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => lendingApi.syncLoans(connectionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lendingKeys.all });
      toast.success(data.message || `Synced ${data.synced_count} loans successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync loans: ${error.message}`);
    },
  });
}

export function useLoanRepayments(loanId?: string) {
  return useQuery({
    queryKey: lendingKeys.repayments(loanId),
    queryFn: () => lendingApi.getRepayments(loanId),
  });
}

export function useLoanDisbursements(loanId?: string, organizationId?: string) {
  return useQuery({
    queryKey: lendingKeys.disbursements(loanId, organizationId),
    queryFn: () => lendingApi.getDisbursements(loanId, organizationId),
    enabled: !!loanId || !!organizationId,
  });
}

/** Everything a posting invalidates: the loan, all grids, stats, worklist. */
function invalidateLending(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: lendingKeys.all });
}

export function useRecordRepayment(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordRepaymentPayload) => lendingApi.recordRepayment(loanId, payload),
    onSuccess: (result) => {
      invalidateLending(queryClient);
      toast.success(`Repayment posted to ERPNext (${result.name})`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to post repayment');
    },
  });
}

export function useRecordDisbursement(loanId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordDisbursementPayload) =>
      lendingApi.recordDisbursement(loanId, payload),
    onSuccess: (result) => {
      invalidateLending(queryClient);
      toast.success(`Disbursement posted to ERPNext (${result.name})`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to post disbursement');
    },
  });
}
