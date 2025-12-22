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
    queryFn: async () => {
      try {
        console.log('🔄 Fetching payment sources for organization:', organizationId);
        const data = await paymentSourcesApi.getPaymentSources(organizationId);
        console.log('✅ Payment sources received:', data);
        return data;
      } catch (error) {
        console.error('❌ Error fetching payment sources:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
    enabled: !!organizationId, // Only fetch if organization is provided
  });
}
