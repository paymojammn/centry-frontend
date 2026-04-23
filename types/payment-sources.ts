/**
 * Unified Payment Source Types
 *
 * Every provider account linked to an organization produces a PaymentSource.
 * Each source declares what it supports (collection, disbursement) so the UI
 * can show the right options for invoices (payins), bills (payouts), and
 * subscription checkout.
 */

export type PaymentSourceType = 'mobile_money' | 'bank_account' | 'ozow' | 'paystack' | 'netcash';

/**
 * Which backend model backs this source. Determines which ID field to send
 * when paying: `provider_account_id` (unified ProviderAccount) or
 * `bank_account_id` (BankAccount).
 */
export type PaymentSourceModel = 'provider_account' | 'bank_account';

export interface PaymentSource {
  id: string;
  source_model?: PaymentSourceModel;
  type: PaymentSourceType;
  name: string;
  provider: string;             // e.g. 'mtn', 'airtel', 'ozow', 'stanbic'
  provider_name?: string;       // e.g. 'MTN Uganda Production'
  currency: string;
  balance?: string;
  phone_number?: string;        // for mobile money
  account_number?: string;      // for bank accounts
  bank_name?: string;
  bank_code?: string;
  swift_code?: string;
  is_default: boolean;
  environment?: string;         // 'sandbox' | 'production'
  region?: string;              // 'Uganda', 'South Africa', etc.
  country_codes?: string[];     // ISO codes the provider supports, e.g. ['ZA']
  supports_collection: boolean;
  supports_disbursement: boolean;
  requires_phone: boolean;
  // Currency conversion (when source currency differs from org default)
  conversion_rate?: number;
  conversion_to?: string;
  conversion_provider?: string;
}

export interface PaymentSourcesResponse {
  sources: PaymentSource[];
  // Legacy format (backwards compat)
  mobile_money_accounts: PaymentSource[];
  bank_accounts: PaymentSource[];
  total_sources: number;
}
