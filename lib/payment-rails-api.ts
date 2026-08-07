/**
 * Payment Rails API Client
 *
 * "Which countries can this org move money in, and over which rails?" —
 * shared by the Pay In and Pay Out pages to drive their country/rail pickers.
 */

import api from './api';

export type RailCapability = 'payin' | 'payout';

export interface PaymentRail {
  id: string;
  provider: string;
  provider_display: string;
  name: string;
  country: string;
  is_default: boolean;
  environment: 'sandbox' | 'production';
  is_live: boolean;
  capabilities: string[];
  /** False when the platform can't execute this rail for this capability yet. */
  supported: boolean;
  unsupported_reason: string;
}

export interface RailCountry {
  code: string;
  name: string;
  currency: string;
  phone_code: string;
  rails: PaymentRail[];
}

export interface PaymentRailsResponse {
  capability: RailCapability;
  countries: RailCountry[];
}

export const paymentRailsApi = {
  async list(
    organizationId: string,
    capability: RailCapability
  ): Promise<PaymentRailsResponse> {
    return api.get(
      `/api/v1/payments/api/payment-rails/?organization_id=${organizationId}&capability=${capability}`
    );
  },
};

export default paymentRailsApi;
