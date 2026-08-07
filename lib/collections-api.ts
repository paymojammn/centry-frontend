/**
 * Collections API Client (Pay In)
 *
 * Wraps the org-scoped collection-request endpoints — the inbound mirror of
 * `payment-requests-api.ts`.
 */

import api from './api';
import type {
  CollectionProviderAccount,
  CollectionRequest,
  CollectionRequestFilters,
  CollectionRequestSummary,
  CollectionStats,
  CreateCollectionRequestPayload,
} from '@/types/collection-request';

const BASE_URL = '/api/v1/payments/api/collection-requests';

export const collectionsApi = {
  /**
   * List collection requests with filters
   */
  async getCollectionRequests(
    filters?: CollectionRequestFilters
  ): Promise<{ results: CollectionRequestSummary[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.organization_id) params.append('organization_id', filters.organization_id);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.collection_type) params.append('collection_type', filters.collection_type);
    if (filters?.my_requests) params.append('my_requests', 'true');

    const queryString = params.toString();
    return api.get(queryString ? `${BASE_URL}/?${queryString}` : `${BASE_URL}/`);
  },

  /**
   * Get one collection request, including per-payer items
   */
  async getCollectionRequest(requestId: string): Promise<CollectionRequest> {
    return api.get(`${BASE_URL}/${requestId}/`);
  },

  /**
   * Collection statistics for the pay-in dashboard
   */
  async getStats(organizationId?: string): Promise<CollectionStats> {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    return api.get(`${BASE_URL}/stats/${params}`);
  },

  /**
   * Provider accounts this organisation can collect through
   */
  async getProviders(
    organizationId: string
  ): Promise<{ results: CollectionProviderAccount[] }> {
    return api.get(`${BASE_URL}/providers/?organization_id=${organizationId}`);
  },

  /**
   * Create a collection request. Dispatches the request-to-pay push unless
   * `dispatch: false` is passed.
   */
  async createCollectionRequest(
    payload: CreateCollectionRequestPayload
  ): Promise<CollectionRequest> {
    return api.post(`${BASE_URL}/`, payload);
  },

  /**
   * Send the push for a request created as a draft
   */
  async dispatchCollectionRequest(requestId: string): Promise<CollectionRequest> {
    return api.post(`${BASE_URL}/${requestId}/dispatch_request/`, {});
  },

  /**
   * Poll the provider for every payer still awaiting approval
   */
  async refreshCollectionRequest(requestId: string): Promise<CollectionRequest> {
    return api.post(`${BASE_URL}/${requestId}/refresh/`, {});
  },

  /**
   * Re-send the push to one failed payer
   */
  async retryItem(requestId: string, itemId: string): Promise<CollectionRequest> {
    return api.post(`${BASE_URL}/${requestId}/items/${itemId}/retry/`, {});
  },

  /**
   * Delete a draft collection request
   */
  async deleteCollectionRequest(requestId: string): Promise<void> {
    return api.del(`${BASE_URL}/${requestId}/`);
  },
};

export default collectionsApi;
