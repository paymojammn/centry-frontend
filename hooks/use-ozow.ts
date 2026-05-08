/**
 * React Query hooks for the Ozow Payouts flow.
 *
 * - useOzowBanks: list banks for the bill modal picker
 * - useCreateOzowPayout: submit a payout
 * - useOzowPayoutStatus: poll status as a fallback to the notification webhook
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ozowApi,
  type OzowBank,
  type OzowBanksResponse,
  type OzowPayoutCreatePayload,
  type OzowPayoutCreateResponse,
  type OzowPayoutStatusResponse,
} from '@/lib/ozow-api';

// Banks rarely change. Cache aggressively per provider account + rtc flag so
// reopening the bills modal doesn't re-hit Ozow on every render.
const BANKS_STALE_MS = 24 * 60 * 60 * 1000;

export function useOzowBanks(
  ozowAccountId: string | undefined,
  options: { rtcOnly?: boolean; enabled?: boolean } = {},
) {
  const { rtcOnly = false, enabled = true } = options;
  return useQuery<OzowBanksResponse, Error, OzowBank[]>({
    queryKey: ['ozow-banks', ozowAccountId, rtcOnly],
    queryFn: () => ozowApi.listBanks({ ozowAccountId, rtcOnly }),
    enabled: enabled && Boolean(ozowAccountId),
    staleTime: BANKS_STALE_MS,
    select: (data) => data.banks ?? [],
  });
}

export function useCreateOzowPayout() {
  return useMutation<OzowPayoutCreateResponse, Error, OzowPayoutCreatePayload>({
    mutationFn: (payload) => ozowApi.createPayout(payload),
  });
}

/**
 * Polls the Ozow status endpoint while the payout is non-terminal.
 *
 * Terminal payout statuses (per Ozow docs):
 *   4 = PayoutProcessingError, 5 = PayoutComplete, 90 = Returned, 99 = Cancelled
 *
 * Webhook is the primary signal; this hook is the recommended backup.
 */
const TERMINAL_STATUS_CODES = new Set([4, 5, 90, 99]);

export function useOzowPayoutStatus(
  payoutId: string | undefined,
  options: { ozowAccountId?: string; enabled?: boolean; pollMs?: number } = {},
) {
  const { ozowAccountId, enabled = true, pollMs = 5000 } = options;
  return useQuery<OzowPayoutStatusResponse, Error>({
    queryKey: ['ozow-payout-status', payoutId, ozowAccountId],
    queryFn: () => ozowApi.getPayoutStatus(payoutId!, ozowAccountId),
    enabled: enabled && Boolean(payoutId),
    refetchInterval: (query) => {
      const code = query.state.data?.status_code;
      if (code != null && TERMINAL_STATUS_CODES.has(code)) return false;
      return pollMs;
    },
  });
}
