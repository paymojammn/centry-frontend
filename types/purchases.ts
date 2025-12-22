// types/purchases.ts
/**
 * TypeScript types for purchases/bills system
 */

export interface Vendor {
  id: number;
  org: string;
  organization_name: string;
  name: string;
  email?: string;
  phone?: string;
  external_refs?: Record<string, string>;
}

export type PayableStatus = 'open' | 'scheduled' | 'paid' | 'failed';

export interface Payable {
  id: number;
  org: string;
  organization_name: string;
  vendor: number;
  vendor_name: string;
  currency: string;
  amount: string; // Decimal as string
  due_date: string | null;
  description: string;
  source_connection: number;
  connection_name: string;
  external_refs?: Record<string, string>;
  status: PayableStatus;
  created_at: string;
  updated_at: string;
}

export type PaymentRail = 'mtn_momo' | 'airtel' | 'bank';
export type PaymentIntentStatus = 'created' | 'pending' | 'succeeded' | 'failed';

export interface PaymentIntent {
  id: string;
  org: string;
  payable: number;
  rail: PaymentRail;
  amount: string;
  currency: string;
  metadata?: Record<string, any>;
  status: PaymentIntentStatus;
  idempotency_key: string;
  external_refs?: Record<string, string>;
  created_by: number | null;
  created_at: string;
}

export interface PayableStats {
  total_open: number;
  total_open_amount: string;
  total_scheduled: number;
  total_paid: number;
  overdue_count: number;
  overdue_amount: string;
}

export interface CreatePaymentIntentData {
  payable: number;
  rail: PaymentRail;
  amount: string;
  currency: string;
  metadata?: Record<string, any>;
}
