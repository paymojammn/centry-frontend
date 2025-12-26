/**
 * Bill (Accounts Payable) Types
 * 
 * Represents bills/invoices that need to be paid to vendors
 */

export interface Bill {
  id: number;
  org: string;
  org_name?: string;
  organization_name: string;
  vendor: number;
  vendor_name: string;
  vendor_phone?: string;  // Vendor's phone number for mobile money payments
  contact_id?: number;  // Xero contact ID for loading bank details from ERP
  currency: string;
  amount: string;
  due_date: string | null;
  description: string;
  source_connection: string;
  connection_name: string;
  status: string;
  payable_status: 'open' | 'scheduled' | 'paid' | 'failed';
  
  // Xero-specific fields
  invoice_id: string;
  invoice_number: string;
  reference: string;
  invoice_type: string;
  date: string | null;
  currency_code: string;
  subtotal: string;
  total_tax: string;
  total: string;
  amount_due: string;
  amount_paid: string;
  created_at: string;
}

export interface BillStats {
  total_all: number;
  total_draft: number;
  total_awaiting_approval: number;
  total_awaiting_payment: number;
  total_awaiting_payment_amount: string;
  total_awaiting_payment_ugx: string;
  total_awaiting_payment_usd: string;
  total_paid: number;
  total_repeating: number;
  overdue_count: number;
  overdue_amount: string;
  overdue_ugx: string;
  overdue_usd: string;
  total_authorised: number;
  total_authorised_amount: string;
}

export interface BillFilters {
  status?: 'all' | 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'paid' | 'repeating';
  organization?: string; // Organization UUID
}

export interface PaymentProvider {
  code: string;
  name: string;
  icon: string;
}

export interface PaymentProviders {
  mobile_money: PaymentProvider[];
  bank: PaymentProvider[];
}

export interface BillPaymentRequest {
  bill_id: string;
  amount: string;
  phone_number?: string;
  account_number?: string;
  bank_name?: string;
}

export interface BillPaymentPayload {
  bills: BillPaymentRequest[];
  payment_method: 'mobile_money' | 'bank' | 'wallet';
  payment_provider: string;
  organization_id: number;
  note?: string;
  use_wallet?: boolean;
}

export interface BillPaymentResult {
  bill_id: string;
  success: boolean;
  reference?: string;
  payment_event_id?: number;
  error_message?: string;
}

export interface BillPaymentResponse {
  success: boolean;
  results: BillPaymentResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export interface WalletBalanceCheck {
  has_sufficient_balance: boolean;
  wallet_balance: string;
  total_required: string;
  remaining_balance: string;
  currency: string;
}

export interface BillPaymentExportResponse {
  success: boolean;
  message: string;
  filename: string;
  file_path: string;
  file_url: string;
  payment_count: number;
  format: string;
  // Currency conversion fields
  requires_conversion?: boolean;
  bank_account_currency?: string;
  mismatched_payments?: Array<{
    payment_event_id: number;
    bill_id: number | null;
    bill_number: string | null;
    amount: number;
    from_currency: string;
    to_currency: string;
  }>;
  prompt?: string;
  error?: string;
}

/**
 * Payment Event (Processing Queue)
 *
 * Represents a payment that has been initiated and is being processed
 */
export type PaymentEventStatus =
  | 'PENDING_APPROVAL'
  | 'PROCESSING'
  | 'PENDING'
  | 'SENT_PAYMENT'
  | 'ERROR_PAYMENT'
  | 'SUCCESS_PAYMENT'
  | 'FAILED_PAYMENT'
  | 'REJECTED';

export type PaymentMethod =
  | 'mtn_momo'
  | 'airtel_momo'
  | 'bank_transfer'
  | 'cash'
  | 'card';

export type PaymentDirection = 'OUT' | 'IN';

export interface PaymentEvent {
  id: number;
  organization_id: string;
  organization_name: string;
  direction: PaymentDirection;
  direction_display: string;
  method: PaymentMethod;
  method_display: string;
  amount: string;
  currency: string;
  // Bill information
  bill_id: number | null;
  bill_number: string | null;
  bill_reference: string | null;
  vendor_name: string | null;
  bill_total: string | null;
  bill_amount_due: string | null;
  // Payment details
  phone_number: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_name_display: string | null;
  swift_code: string;
  note: string;
  // Status
  provider_status: PaymentEventStatus;
  status_display: string;
  provider_reference: string;
  // Xero sync
  xero_payment_id: string;
  synced_to_xero: boolean;
  xero_sync_date: string | null;
  // User info
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  // Approval workflow fields
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by: number | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  source_bank_account: number | null;
  source_bank_account_name: string | null;
}

export interface PaymentEventStats {
  total: number;
  pending_approval: number;
  processing: number;
  pending: number;
  sent: number;
  success: number;
  failed: number;
  rejected: number;
  total_amount_pending_approval: string;
  total_amount_processing: string;
  total_amount_pending: string;
  total_amount_sent: string;
  synced_count: number;
  not_synced_count: number;
}

export interface ApprovePaymentsResponse {
  success: boolean;
  approved_count: number;
  results: Array<{
    id: number;
    success: boolean;
    error?: string;
  }>;
}

export interface RejectPaymentsResponse {
  success: boolean;
  rejected_count: number;
  results: Array<{
    id: number;
    success: boolean;
    error?: string;
  }>;
}

export interface GenerateFileResponse {
  success: boolean;
  file_url: string;
  filename: string;
  payment_count: number;
  total_amount: string;
  message_id?: string;
  error?: string;
}

export interface DenyPaymentsResponse {
  success: boolean;
  denied_count: number;
  results: Array<{
    id: number;
    success: boolean;
    bill_restored?: boolean;
    error?: string;
  }>;
}

export interface PaymentEventFilters {
  organization?: string;
  direction?: PaymentDirection;
  status?: PaymentEventStatus;
  method?: PaymentMethod;
  synced_to_xero?: boolean;
}
