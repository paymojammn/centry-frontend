// hooks/use-purchases.ts
/**
 * React Query hooks for purchases/bills data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPayables,
  getPayable,
  getPayableStats,
  getVendors,
  getPaymentIntents,
  createPaymentIntent,
} from '@/lib/purchases-api';
import type { CreatePaymentIntentData } from '@/types/purchases';

/**
 * Payables (Bills/Expenses)
 */
export function usePayables(params?: {
  status?: string;
  vendor?: number;
  organization?: string;
}) {
  return useQuery({
    queryKey: ['payables', params],
    queryFn: () => getPayables(params),
  });
}

export function usePayable(id: number | null) {
  return useQuery({
    queryKey: ['payables', id],
    queryFn: () => getPayable(id!),
    enabled: !!id,
  });
}

export function usePayableStats(organizationId?: string) {
  return useQuery({
    queryKey: ['payables', 'stats', organizationId],
    queryFn: () => getPayableStats(organizationId),
  });
}

/**
 * Vendors
 */
export function useVendors(organizationId?: string) {
  return useQuery({
    queryKey: ['vendors', organizationId],
    queryFn: () => getVendors(organizationId),
  });
}

/**
 * Payment Intents
 */
export function usePaymentIntents(params?: {
  payable?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['payment-intents', params],
    queryFn: () => getPaymentIntents(params),
  });
}

export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentIntentData) => createPaymentIntent(data),
    onSuccess: () => {
      // Invalidate payment intents and payables queries
      queryClient.invalidateQueries({ queryKey: ['payment-intents'] });
      queryClient.invalidateQueries({ queryKey: ['payables'] });
    },
  });
}
