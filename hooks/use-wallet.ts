/**
 * Wallet React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '@/lib/wallet-api';
import type { LoadWalletRequest, SavePaymentMethodRequest } from '@/types/wallet';

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
