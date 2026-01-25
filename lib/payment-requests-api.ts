/**
 * Payment Requests API Client
 *
 * Handles payment request CRUD and approval workflow
 */

import api from './api';
import type {
  PaymentRequest,
  CreatePaymentRequestPayload,
  PaymentRequestStats,
  PaymentRequestFilters,
} from '@/types/payment-request';

const BASE_URL = '/api/v1/payments/api/payment-requests';

export const paymentRequestsApi = {
  /**
   * Get all payment requests with filters
   */
  async getPaymentRequests(
    filters?: PaymentRequestFilters
  ): Promise<{ results: PaymentRequest[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.organization_id) params.append('organization_id', filters.organization_id);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.payment_type) params.append('payment_type', filters.payment_type);
    if (filters?.my_requests) params.append('my_requests', 'true');

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/?${queryString}` : `${BASE_URL}/`;

    return api.get(url);
  },

  /**
   * Get a single payment request
   */
  async getPaymentRequest(requestId: string): Promise<PaymentRequest> {
    return api.get(`${BASE_URL}/${requestId}/`);
  },

  /**
   * Get payment request statistics
   */
  async getStats(organizationId?: string): Promise<PaymentRequestStats> {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    return api.get(`${BASE_URL}/stats/${params}`);
  },

  /**
   * Get pending payment requests for approval
   */
  async getPendingRequests(
    organizationId?: string
  ): Promise<{ results: PaymentRequest[]; count: number; total_amount: string }> {
    const params = organizationId ? `?organization_id=${organizationId}` : '';
    return api.get(`${BASE_URL}/pending/${params}`);
  },

  /**
   * Create a new payment request
   */
  async createPaymentRequest(payload: CreatePaymentRequestPayload): Promise<PaymentRequest> {
    return api.post(`${BASE_URL}/`, payload);
  },

  /**
   * Update a payment request (draft only)
   */
  async updatePaymentRequest(
    requestId: string,
    payload: Partial<CreatePaymentRequestPayload>
  ): Promise<PaymentRequest> {
    return api.patch(`${BASE_URL}/${requestId}/`, payload);
  },

  /**
   * Delete a payment request (draft only)
   */
  async deletePaymentRequest(requestId: string): Promise<void> {
    return api.del(`${BASE_URL}/${requestId}/`);
  },

  /**
   * Submit payment request for approval
   */
  async submitForApproval(requestId: string): Promise<PaymentRequest> {
    return api.post(`${BASE_URL}/${requestId}/submit/`, {});
  },

  /**
   * Approve a payment request
   */
  async approveRequest(requestId: string, notes?: string): Promise<PaymentRequest> {
    return api.post(`${BASE_URL}/${requestId}/approve/`, { notes });
  },

  /**
   * Reject a payment request
   */
  async rejectRequest(requestId: string, reason: string): Promise<PaymentRequest> {
    return api.post(`${BASE_URL}/${requestId}/reject/`, { reason });
  },

  /**
   * Process an approved payment request
   */
  async processRequest(requestId: string): Promise<PaymentRequest> {
    return api.post(`${BASE_URL}/${requestId}/process/`, {});
  },
};
