/**
 * Wallet Types
 *
 * Types for user and department wallet management
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

// ============ Department Wallet Types ============

export interface LinkedAccount {
  type: 'mobile_money' | 'bank';
  id: string;
  name: string;
  phone_number?: string;
  account_number?: string;
  provider?: string;
  bank_name?: string;
  balance: string;
  currency: string;
}

export interface DepartmentWallet {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  wallet_type: 'department' | 'project' | 'team' | 'general';
  description: string;
  currency: string;
  balance: string;
  monthly_budget: string | null;
  transaction_limit: string | null;
  status: 'active' | 'suspended' | 'closed';
  is_manager: boolean;
  is_member: boolean;
  can_manage: boolean;
  requires_approval: boolean;
  approval_threshold: string | null;
  fee_percentage: string;
  flat_fee: string;
  linked_accounts: LinkedAccount[];
  has_linked_account: boolean;
  created_at: string;
}

export interface DepartmentWalletTransaction {
  id: string;
  transaction_type: 'account_transfer' | 'expense_payment' | 'bill_payment' | 'refund' | 'fee';
  amount: string;
  fee_amount: string;
  total_amount: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled';
  reference: string;
  provider_reference?: string;
  description: string;
  source_type?: 'mobile_money' | 'bank' | 'wallet';
  destination_type?: 'mobile_money' | 'bank' | 'wallet';
  initiated_by: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
}

export interface AvailableMobileMoneyAccount {
  id: string;
  account_name: string;
  phone_number: string;
  provider: string | null;
  provider_name: string | null;
  balance: string;
  currency: string;
  is_default: boolean;
  is_linked: boolean;
}

export interface AvailableBankAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string | null;
  account_type: string;
  balance: string;
  currency: string;
  is_default: boolean;
  is_linked: boolean;
}

export interface LinkedAccountsResponse {
  wallet_id: string;
  organization_id: string;
  current_linked_accounts: LinkedAccount[];
  available_mobile_money_accounts: AvailableMobileMoneyAccount[];
  available_bank_accounts: AvailableBankAccount[];
  admin_links: {
    add_mobile_money_account: string;
    add_bank_account: string;
  };
}

export interface TransferRequest {
  amount: string;
  destination_type: 'mobile_money' | 'bank' | 'wallet';
  destination_phone?: string;
  destination_account_number?: string;
  destination_bank_name?: string;
  destination_account_name?: string;
  destination_bank_id?: string;
  destination_wallet_id?: string;
  description: string;
  source_type: 'mobile_money' | 'bank';
}

export interface TransferResponse {
  transaction_id: string;
  wallet_id: string;
  amount: string;
  fee_amount: string;
  fee_percentage: string;
  total_amount: string;
  status: string;
  requires_approval: boolean;
  reference: string;
  source_type: string;
  destination_type: string;
}

export interface FeePreview {
  wallet_id: string;
  principal_amount: string;
  fee_percentage: string;
  flat_fee: string;
  calculated_fee: string;
  total_amount: string;
  currency: string;
}

export interface PendingApproval {
  id: string;
  transaction_type: string;
  amount: string;
  status: string;
  reference: string;
  description: string;
  expense_id: string | null;
  expense_description: string | null;
  initiated_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string;
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
