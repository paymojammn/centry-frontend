/**
 * Payment Sources React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { paymentSourcesApi } from '@/lib/payment-sources-api';

/**
 * Hook to fetch all available payment sources
 * @param organizationId - Optional organization ID to fetch payment sources for
 */
export function usePaymentSources(organizationId?: string) {
  return useQuery({
    queryKey: ['payment-sources', organizationId],
    queryFn: () => paymentSourcesApi.getPaymentSources(organizationId),
    retry: 1,
    staleTime: 30000,
    enabled: !!organizationId,
  });
}
