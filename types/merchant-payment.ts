/**
 * Merchant Payment types — payins, payouts, balances.
 *
 * These map to the new unified PSP models (centry-merchant) exposed via
 * org-scoped endpoints at /api/v1/payments/.
 */

export type PayinStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PayoutStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected';

export type PayinMethod = 'mobile_money' | 'card' | 'bank_transfer' | 'crypto';
export type PayoutMethod = 'mobile_money' | 'bank_transfer' | 'wallet';

export interface MerchantPayin {
  id: string;
  merchant: string;
  merchant_name: string;
  country_account: string;
  country_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  amount: string;
  currency: string;
  currency_code: string;
  payment_method: PayinMethod;
  method_display: string;
  gateway: string;
  gateway_transaction_id: string;
  centry_fee: string;
  gateway_fee: string;
  fee_amount: string;
  net_amount: string;
  status: PayinStatus;
  status_display: string;
  failure_reason: string;
  reference: string;
  description: string;
  create_invoice: boolean;
  invoice: string | null;
  invoice_number: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface MerchantPayout {
  id: string;
  merchant: string;
  merchant_name: string;
  country_account: string;
  country_code: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  recipient_account_number: string;
  recipient_bank_name: string;
  recipient_bank_code: string;
  amount: string;
  currency: string;
  currency_code: string;
  payment_method: PayoutMethod;
  method_display: string;
  gateway: string;
  gateway_transaction_id: string;
  centry_fee: string;
  gateway_fee: string;
  fee_amount: string;
  net_amount: string;
  status: PayoutStatus;
  status_display: string;
  failure_reason: string;
  payment_reference: string;
  reference: string;
  description: string;
  create_bill: boolean;
  bill: string | null;
  bill_number: string | null;
  is_bulk: boolean;
  required_approvals: number;
  approval_count: number;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  metadata: Record<string, unknown>;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  processed_at: string | null;
}

export interface MerchantBalance {
  id: string;
  merchant: string;
  country_account: string;
  country_code: string;
  country_name: string;
  currency: string;
  currency_code: string;
  available_balance: string;
  pending_balance: string;
  reserved_balance: string;
  total_balance: string;
  lifetime_payin_volume: string;
  lifetime_payout_volume: string;
  lifetime_centry_fees: string;
  lifetime_gateway_fees: string;
  last_movement_at: string | null;
  updated_at: string;
}

export interface PayinFilters {
  organization_id?: string;
  status?: PayinStatus;
  limit?: number;
  offset?: number;
}

export interface PayoutFilters {
  organization_id?: string;
  status?: PayoutStatus;
  limit?: number;
  offset?: number;
}

export interface PaginatedPayins {
  count: number;
  results: MerchantPayin[];
}

export interface PaginatedPayouts {
  count: number;
  results: MerchantPayout[];
}
