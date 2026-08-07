/**
 * Collection Requests React Query Hooks (Pay In)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/collections-api';
import type {
  CollectionRequestFilters,
  CreateCollectionRequestPayload,
} from '@/types/collection-request';
import { toast } from 'sonner';

export const collectionKeys = {
  all: ['collection-requests'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: (filters?: CollectionRequestFilters) => [...collectionKeys.lists(), filters] as const,
  details: () => [...collectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...collectionKeys.details(), id] as const,
  stats: (organizationId?: string) => [...collectionKeys.all, 'stats', organizationId] as const,
  providers: (organizationId?: string) =>
    [...collectionKeys.all, 'providers', organizationId] as const,
};

/** Poll while anything is still in flight so payer approvals land on their own. */
const IN_FLIGHT_STATUSES = new Set(['draft', 'processing']);

export function useCollectionRequests(filters?: CollectionRequestFilters) {
  return useQuery({
    queryKey: collectionKeys.list(filters),
    queryFn: () => collectionsApi.getCollectionRequests(filters),
    enabled: !!filters?.organization_id,
    refetchInterval: (query) => {
      const results = query.state.data?.results ?? [];
      return results.some((r) => IN_FLIGHT_STATUSES.has(r.status)) ? 10_000 : false;
    },
  });
}

export function useCollectionRequest(requestId?: string) {
  return useQuery({
    queryKey: collectionKeys.detail(requestId || ''),
    queryFn: () => collectionsApi.getCollectionRequest(requestId!),
    enabled: !!requestId,
    refetchInterval: (query) =>
      query.state.data && IN_FLIGHT_STATUSES.has(query.state.data.status) ? 5_000 : false,
  });
}

export function useCollectionStats(organizationId?: string) {
  return useQuery({
    queryKey: collectionKeys.stats(organizationId),
    queryFn: () => collectionsApi.getStats(organizationId),
    enabled: !!organizationId,
  });
}

export function useCollectionProviders(organizationId?: string) {
  return useQuery({
    queryKey: collectionKeys.providers(organizationId),
    queryFn: () => collectionsApi.getProviders(organizationId!),
    enabled: !!organizationId,
  });
}

export function useCreateCollectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCollectionRequestPayload) =>
      collectionsApi.createCollectionRequest(payload),
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      const count = request.total_payers;
      toast.success(
        count > 1
          ? `Payment request sent to ${count} numbers`
          : 'Payment request sent — awaiting approval on the payer’s phone'
      );
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send payment request');
    },
  });
}

export function useDispatchCollectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => collectionsApi.dispatchCollectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      toast.success('Collection dispatched');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to dispatch collection');
    },
  });
}

export function useRefreshCollectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => collectionsApi.refreshCollectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to refresh status');
    },
  });
}

export function useRetryCollectionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, itemId }: { requestId: string; itemId: string }) =>
      collectionsApi.retryItem(requestId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      toast.success('Request re-sent');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to retry');
    },
  });
}

export function useDeleteCollectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => collectionsApi.deleteCollectionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      toast.success('Collection request deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete collection request');
    },
  });
}
