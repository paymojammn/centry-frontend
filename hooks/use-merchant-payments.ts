'use client';

import { useQuery } from '@tanstack/react-query';
import { merchantPaymentsApi } from '@/lib/merchant-payments-api';
import type { PayinFilters, PayoutFilters } from '@/types/merchant-payment';

const KEYS = {
  payins: (f?: PayinFilters) => ['merchant-payments', 'payins', f] as const,
  payouts: (f?: PayoutFilters) => ['merchant-payments', 'payouts', f] as const,
  balances: (orgId?: string) => ['merchant-payments', 'balances', orgId] as const,
};

export function useMerchantPayins(filters?: PayinFilters) {
  return useQuery({
    queryKey: KEYS.payins(filters),
    queryFn: () => merchantPaymentsApi.listPayins(filters),
  });
}

export function useMerchantPayouts(filters?: PayoutFilters) {
  return useQuery({
    queryKey: KEYS.payouts(filters),
    queryFn: () => merchantPaymentsApi.listPayouts(filters),
  });
}

export function useMerchantBalances(organizationId?: string) {
  return useQuery({
    queryKey: KEYS.balances(organizationId),
    queryFn: () => merchantPaymentsApi.listBalances(organizationId),
  });
}
