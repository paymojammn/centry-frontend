/**
 * Payment Sources API Client
 * 
 * Handles fetching available payment sources for bills and expenses
 */

import api from './api';
import type { PaymentSourcesResponse } from '@/types/payment-sources';

const BANKING_BASE_URL = '/api/v1/banking';

export interface Bank {
  id: number;
  name: string;
  short_name: string;
  code: string;
  swift_code: string;
  bank_type: string;
  country_code: string;
  country_name: string;
}

export interface BanksResponse {
  banks: Bank[];
  count: number;
}

export const paymentSourcesApi = {
  /**
   * Get all available payment sources for the user's organization
   * @param organizationId - Optional organization ID to fetch payment sources for
   */
  async getPaymentSources(organizationId?: string): Promise<PaymentSourcesResponse> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization', organizationId);

    const queryString = params.toString();
    const url = `${BANKING_BASE_URL}/payment-sources/${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<PaymentSourcesResponse>(url);
    return response;
  },

  /**
   * Get list of banks for dropdown selection
   * @param country - Optional country code filter (e.g., 'UG', 'KE')
   * @param search - Optional search query
   */
  async getBanks(country?: string, search?: string): Promise<BanksResponse> {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (search) params.append('search', search);
    
    const queryString = params.toString();
    const url = `${BANKING_BASE_URL}/banks/${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get<BanksResponse>(url);
    return response;
  },
};
