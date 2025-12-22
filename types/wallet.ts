/**
 * Wallet Types
 * 
 * Types for user wallet management
 */

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  balance: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: string;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  provider?: string;
  external_ref?: string;
  created_at: string;
  updated_at?: string;
  meta?: Record<string, unknown>;
}

export interface WalletBalance {
  wallet_id: string;
  currency: string;
  balance: string;
  status: string;
}

export interface LoadWalletRequest {
  amount: string;
  currency: string;
  method: 'mobile_money' | 'bank';
  provider: string;
  phone_number?: string;
  account_number?: string;
  bank_name?: string;
}

export interface LoadWalletResponse {
  success: boolean;
  transaction_id: string;
  wallet_id: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  message: string;
  instructions?: {
    account_number: string;
    bank_name: string;
    reference: string;
    amount: string;
    currency: string;
  };
  error?: string;
}

export interface SavedPaymentMethod {
  id: string;
  method_type: 'mobile_money' | 'bank';
  provider: string;
  nickname: string;
  phone_number?: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  is_default: boolean;
  created_at: string;
}

export interface SavePaymentMethodRequest {
  method_type: 'mobile_money' | 'bank';
  provider: string;
  nickname: string;
  phone_number?: string;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  is_default?: boolean;
}
