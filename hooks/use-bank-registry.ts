/**
 * React Query hooks for the bank registry maintenance page (/banking/banks).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bankRegistryApi,
  type ListParams,
  type RegistryBankInput,
  type RegistryBranchInput,
} from '@/lib/bank-registry-api';

const KEY = 'bank-registry';

export function useRegistryCountries() {
  return useQuery({
    queryKey: [KEY, 'countries'],
    queryFn: () => bankRegistryApi.getCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegistryBanks(country: string | undefined, params: ListParams) {
  return useQuery({
    queryKey: [KEY, 'banks', country, params],
    queryFn: () => bankRegistryApi.listBanks(country!, params),
    enabled: !!country,
    placeholderData: keepPreviousData,
  });
}

export function useRegistryBranches(bankId: number | undefined, params: ListParams) {
  return useQuery({
    queryKey: [KEY, 'branches', bankId, params],
    queryFn: () => bankRegistryApi.listBranches(bankId!, params),
    enabled: !!bankId,
    placeholderData: keepPreviousData,
  });
}

/**
 * A registry edit must also reach the pickers that read the same data through
 * the lookup endpoints (pay-bills recipient step, vendor bank accounts).
 */
function useInvalidateRegistry() {
  const qc = useQueryClient();
  return () => {
    [KEY, 'banks', 'bank-branches', 'bank-countries', 'provider-branches'].forEach((key) =>
      qc.invalidateQueries({ queryKey: [key] }),
    );
  };
}

export function useSaveBank() {
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: RegistryBankInput }) =>
      id ? bankRegistryApi.updateBank(id, data) : bankRegistryApi.createBank(data),
    onSuccess: invalidate,
  });
}

export function useSaveBranch() {
  const invalidate = useInvalidateRegistry();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: RegistryBranchInput }) =>
      id ? bankRegistryApi.updateBranch(id, data) : bankRegistryApi.createBranch(data),
    onSuccess: invalidate,
  });
}
