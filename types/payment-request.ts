/**
 * Payment Request Types
 *
 * Types for payment requests with approval workflow
 */

export type PaymentRequestStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

export type PaymentType = 'single' | 'bulk';

export type PaymentMethod = 'mobile_money' | 'bank' | 'wallet';

export interface PaymentRecipient {
  name: string;
  phone: string;
  amount: number;
}

export interface PaymentRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  payment_type: PaymentType;
  payment_type_display: string;
  payment_method: PaymentMethod;
  payment_method_display: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_account_number: string;
  recipient_bank_name: string;
  amount: string;
  currency: string;
  recipients: PaymentRecipient[] | null;
  total_recipients: number;
  description: string;
  source_wallet: string | null;
  source_wallet_name: string | null;
  source_mobile_money_account: string | null;
  status: PaymentRequestStatus;
  status_display: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_notes: string;
  rejected_by: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  processed_at: string | null;
  payment_reference: string;
  processing_error: string;
}

export interface CreatePaymentRequestPayload {
  organization_id: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_account_number?: string;
  recipient_bank_name?: string;
  amount?: number;
  currency?: string;
  recipients?: PaymentRecipient[];
  description?: string;
  source_wallet_id?: string;
}

export interface PaymentRequestStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  total_pending_amount: string;
}

export interface PaymentRequestFilters {
  organization_id?: string;
  status?: PaymentRequestStatus | 'all';
  payment_type?: PaymentType;
  my_requests?: boolean;
}
