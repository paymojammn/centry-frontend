/**
 * React Query hooks for OneGate (CallPay) flows.
 *
 * - useOneGatePayoutMethods: live, per-account OTT-Payouts methods for the
 *   bills modal OneGate rail. Each row carries `rsa_id_required` so the rail
 *   can show the recipient ID field only when the chosen method needs it.
 */

import { useQuery } from '@tanstack/react-query';
import { onegateApi, type OneGatePayoutRow } from '@/lib/onegate-api';

// Methods reflect what the merchant is enabled for and change rarely; cache
// per account so reopening the bills modal doesn't re-hit OneGate every render.
const METHODS_STALE_MS = 10 * 60 * 1000;

export function useOneGatePayoutMethods(
  onegateAccountId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;
  return useQuery<{ success: boolean; methods: OneGatePayoutRow[] }, Error, OneGatePayoutRow[]>({
    queryKey: ['onegate-payout-methods', onegateAccountId],
    queryFn: () => onegateApi.listPayoutMethods(onegateAccountId!),
    enabled: enabled && Boolean(onegateAccountId),
    staleTime: METHODS_STALE_MS,
    select: (data) => data.methods ?? [],
  });
}
