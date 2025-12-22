/**
 * Currency Conversion Types
 */

export interface CurrencyConversionProvider {
  id: number;
  name: string;
  display_name: string;
  is_active: boolean;
  priority: number;
  rate_limit: number;
  calls_made_this_month: number;
  success_rate: string;
  can_make_call: boolean;
}

export interface ExchangeRate {
  id: number;
  provider: number;
  provider_name: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  inverse_rate: string;
  timestamp: string;
  expires_at: string | null;
  is_expired: boolean;
  metadata: Record<string, any>;
}

export interface ConversionTransaction {
  id: number;
  organization: number;
  user: number | null;
  from_currency: string;
  to_currency: string;
  original_amount: string;
  converted_amount: string;
  exchange_rate: number;
  rate_value: string;
  provider: number;
  provider_name: string;
  purpose: string;
  conversion_fee: string;
  margin_applied: string;
  status: string;
  reference_number: string;
  external_reference: string | null;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, any>;
}

export interface SupportedCurrency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
}

export interface ConvertAmountRequest {
  amount: string | number;
  from_currency: string;
  to_currency: string;
  margin?: string | number;
}

export interface ConvertAmountResponse {
  original_amount: string;
  converted_amount: string;
  rate: string;
  rate_with_margin: string;
  margin: string;
  from_currency: string;
  to_currency: string;
  provider: string;
  rate_timestamp: string;
}

export interface ExchangeRateRequest {
  from_currency: string;
  to_currency: string;
  force_refresh?: boolean;
}
