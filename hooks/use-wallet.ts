/**
 * Wallet React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/lib/wallet-api';
import type { LoadWalletRequest, SavePaymentMethodRequest, TransferRequest } from '@/types/wallet';

/**
 * Hook to fetch all user wallets
 */
export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletApi.getWallets(),
  });
}

/**
 * Hook to fetch wallet balance
 */
export function useWalletBalance(currency: string = 'UGX') {
  return useQuery({
    queryKey: ['wallet-balance', currency],
    queryFn: () => walletApi.getBalance(currency),
  });
}

/**
 * Hook to fetch wallet transactions
 */
export function useWalletTransactions(currency: string = 'UGX', limit: number = 50) {
  return useQuery({
    queryKey: ['wallet-transactions', currency, limit],
    queryFn: () => walletApi.getTransactions(currency, limit),
  });
}

/**
 * Hook to load money into wallet
 */
export function useLoadWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.loadWallet,
    onSuccess: () => {
      // Invalidate wallet queries to refetch balance and transactions
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}

/**
 * Hook to fetch saved payment methods
 */
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: walletApi.getPaymentMethods,
  });
}

/**
 * Hook to save a payment method
 */
export function useSavePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.savePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}

/**
 * Hook to update a payment method
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ methodId, data }: { methodId: string; data: SavePaymentMethodRequest }) => 
      walletApi.updatePaymentMethod(methodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}

/**
 * Hook to delete a payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.deletePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
}

// ============ Department Wallet Hooks ============

/**
 * Hook to fetch unique department names for an organization
 * Used to populate dropdown when creating new wallets
 */
export function useDepartmentNames(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['department-names', organizationId],
    queryFn: () => walletApi.getDepartmentNames(organizationId!),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch department wallets for an organization
 */
export function useDepartmentWallets(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['department-wallets', organizationId],
    queryFn: () => walletApi.getDepartmentWallets(organizationId!),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch department wallet balance
 */
export function useDepartmentWalletBalance(walletId: string | undefined) {
  return useQuery({
    queryKey: ['department-wallet-balance', walletId],
    queryFn: () => walletApi.getDepartmentWalletBalance(walletId!),
    enabled: !!walletId,
  });
}

/**
 * Hook to fetch department wallet transactions
 */
export function useDepartmentWalletTransactions(walletId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['department-wallet-transactions', walletId, limit],
    queryFn: () => walletApi.getDepartmentWalletTransactions(walletId!, limit),
    enabled: !!walletId,
  });
}

/**
 * Hook to fetch linked accounts for a department wallet
 */
export function useLinkedAccounts(walletId: string | undefined) {
  return useQuery({
    queryKey: ['linked-accounts', walletId],
    queryFn: () => walletApi.getLinkedAccounts(walletId!),
    enabled: !!walletId,
  });
}

/**
 * Hook to preview transfer fees
 */
export function useFeePreview(walletId: string | undefined, amount: string) {
  return useQuery({
    queryKey: ['fee-preview', walletId, amount],
    queryFn: () => walletApi.previewFee(walletId!, amount),
    enabled: !!walletId && !!amount && parseFloat(amount) > 0,
  });
}

/**
 * Hook to link an account to department wallet
 */
export function useLinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, accountType, accountId }: {
      walletId: string;
      accountType: 'mobile_money' | 'bank';
      accountId: string;
    }) => walletApi.linkAccount(walletId, accountType, accountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallets'] });
    },
  });
}

/**
 * Hook to unlink an account from department wallet
 */
export function useUnlinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, accountType }: {
      walletId: string;
      accountType: 'mobile_money' | 'bank';
    }) => walletApi.unlinkAccount(walletId, accountType),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallets'] });
    },
  });
}

/**
 * Hook to make a transfer from department wallet
 */
export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, request }: { walletId: string; request: TransferRequest }) =>
      walletApi.transfer(walletId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-wallet-balance', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallet-transactions', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallets'] });
    },
  });
}

/**
 * Hook to fetch pending approvals
 */
export function usePendingApprovals(walletId: string | undefined) {
  return useQuery({
    queryKey: ['pending-approvals', walletId],
    queryFn: () => walletApi.getPendingApprovals(walletId!),
    enabled: !!walletId,
  });
}

/**
 * Hook to approve a pending transaction
 */
export function useApproveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, transactionId, note }: {
      walletId: string;
      transactionId: string;
      note?: string;
    }) => walletApi.approveTransaction(walletId, transactionId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallet-balance', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallet-transactions', variables.walletId] });
    },
  });
}

/**
 * Hook to reject a pending transaction
 */
export function useRejectTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, transactionId, reason }: {
      walletId: string;
      transactionId: string;
      reason: string;
    }) => walletApi.rejectTransaction(walletId, transactionId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals', variables.walletId] });
      queryClient.invalidateQueries({ queryKey: ['department-wallet-transactions', variables.walletId] });
    },
  });
}

/**
 * Hook to fetch department wallet statistics
 */
export function useDepartmentWalletStatistics(walletId: string | undefined, period: number = 30) {
  return useQuery({
    queryKey: ['department-wallet-statistics', walletId, period],
    queryFn: () => walletApi.getDepartmentWalletStatistics(walletId!, period),
    enabled: !!walletId,
  });
}

/**
 * Hook to create a department wallet
 */
export function useCreateDepartmentWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: walletApi.createDepartmentWallet,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['department-wallets', variables.organization_id] });
    },
  });
}

/**
 * Hook to fetch organization accounts (mobile money and bank)
 */
export function useOrganizationAccounts(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-accounts', organizationId],
    queryFn: () => walletApi.getOrganizationAccounts(organizationId!),
    enabled: !!organizationId,
  });
}
