/**
 * Checkout React Query Hooks
 *
 * Hooks for managing checkout state and API calls.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { checkoutApi, InitiatePaymentRequest } from '@/lib/checkout-api';

/**
 * Hook to fetch checkout session info
 */
export function useCheckoutSession(token: string | undefined) {
  return useQuery({
    queryKey: ['checkout-session', token],
    queryFn: () => checkoutApi.getCheckoutInfo(token!),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch payment methods for a country
 */
export function usePaymentMethods(token: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: ['checkout-methods', token, country],
    queryFn: () => checkoutApi.getPaymentMethods(token!, country!),
    enabled: !!token && !!country,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to initiate a payment
 */
export function useInitiatePayment(token: string) {
  return useMutation({
    mutationFn: (data: InitiatePaymentRequest) => checkoutApi.initiatePayment(token, data),
  });
}

/**
 * Hook to poll payment status
 */
export function usePaymentStatus(token: string | undefined, enabled: boolean = false) {
  return useQuery({
    queryKey: ['checkout-status', token],
    queryFn: () => checkoutApi.getPaymentStatus(token!),
    enabled: !!token && enabled,
    refetchInterval: 3000, // Poll every 3 seconds when enabled
    refetchIntervalInBackground: true,
  });
}
