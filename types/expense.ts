/**
 * Expense (Petty Cash) Types
 *
 * Represents expenses/petty cash requests submitted by employees
 */

export interface Expense {
  id: string;
  organization_id: string;
  organization_name: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  category: ExpenseCategory;
  amount: string;
  currency: string;
  description: string;
  date: string;
  type: ExpenseType;
  status: ExpenseStatus;
  payment_status: ExpensePaymentStatus;
  paid_amount?: string;
  remaining_amount?: string;
  receipt_url?: string;
  receipt_urls?: string[];
  payment_method?: 'mobile_money' | 'bank' | 'wallet' | 'cash';
  payment_reference?: string;
  payment_date?: string;
  phone_number?: string;
  // Manager approval (Flow 2 & 3)
  manager_approved_by?: string;
  manager_approved_at?: string;
  manager_rejection_reason?: string;
  // Finance approval (Flow 4)
  finance_approved_by?: string;
  finance_approved_at?: string;
  finance_rejection_reason?: string;
  // Linked advance request (Flow 3 accountability)
  advance_request_id?: string;
  // ERP sync (Flow 4)
  synced_to_erp: boolean;
  erp_sync_date?: string;
  erp_reference?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseType =
  | 'advance_request'  // Flow 2: Request money upfront
  | 'reimbursement';   // Flow 3: Claim back spent money

export type ExpenseStatus =
  | 'draft'
  | 'submitted'
  | 'pending_manager_approval'    // Flow 2 & 3: Waiting for manager
  | 'manager_approved'            // Flow 3 only: Manager approved, awaiting receipts
  | 'pending_finance_approval'    // Flow 4: Awaiting finance approval
  | 'approved'                    // Fully approved
  | 'rejected'
  | 'cancelled';

export type ExpensePaymentStatus =
  | 'unpaid'
  | 'processing'
  | 'partial'
  | 'paid'
  | 'failed';

export type ExpenseCategory =
  | 'transport'
  | 'meals'
  | 'accommodation'
  | 'office_supplies'
  | 'communication'
  | 'utilities'
  | 'entertainment'
  | 'training'
  | 'medical'
  | 'marketing'
  | 'maintenance'
  | 'other';

export interface ExpenseStats {
  total_expenses: number;
  total_amount: string;
  // Flow 2: Advance requests
  pending_advance_requests: number;
  pending_advance_amount: string;
  approved_advances: number;
  approved_advances_amount: string;
  // Flow 3: Awaiting accountability
  awaiting_receipts: number;
  awaiting_receipts_amount: string;
  // Flow 3: Manager approval
  pending_manager_approval: number;
  pending_manager_amount: string;
  // Flow 4: Finance approval
  pending_finance_approval: number;
  pending_finance_amount: string;
  // General
  approved: number;
  approved_amount: string;
  paid: number;
  paid_amount: string;
  rejected: number;
  rejected_amount: string;
  synced_to_erp: number;
  by_category: {
    category: ExpenseCategory;
    count: number;
    amount: string;
  }[];
  by_type: {
    type: ExpenseType;
    count: number;
    amount: string;
  }[];
}

export interface ExpenseFilters {
  type?: ExpenseType | 'all';
  status?: ExpenseStatus | 'all';
  payment_status?: ExpensePaymentStatus | 'all';
  category?: ExpenseCategory | 'all';
  organization?: string;
  employee?: string;
  start_date?: string;
  end_date?: string;
  needs_receipts?: boolean;  // Flow 3: Show advances needing accountability
  pending_my_approval?: boolean;  // Show items pending current user's approval
}

export interface CreateExpenseRequest {
  organization_id: string;
  type: ExpenseType;  // advance_request or reimbursement
  category: ExpenseCategory;
  amount: string;
  currency: string;
  description: string;
  date: string;
  phone_number?: string;  // For advance requests with mobile money
  payment_method?: 'mobile_money' | 'bank' | 'wallet';  // For advance requests
  receipt_files?: File[];  // For reimbursements
  advance_request_id?: string;  // Link accountability to advance
}

export interface UpdateExpenseRequest {
  category?: ExpenseCategory;
  amount?: string;
  description?: string;
  date?: string;
  status?: ExpenseStatus;
}

export interface ApproveExpenseRequest {
  expense_id: string;
  approved: boolean;
  rejection_reason?: string;
  approval_level?: 'manager' | 'finance';  // Which approval level
}

export interface PayExpenseRequest {
  expense_ids: string[];
  payment_method: 'mobile_money' | 'bank' | 'wallet';
  payment_provider?: string;
  phone_number?: string;
  account_number?: string;
  bank_name?: string;
  use_wallet?: boolean;
}

export interface PayExpenseResult {
  expense_id: string;
  success: boolean;
  reference?: string;
  error_message?: string;
}

export interface PayExpenseResponse {
  success: boolean;
  results: PayExpenseResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: 'transport', label: 'Transport', icon: '🚗' },
  { value: 'meals', label: 'Meals & Entertainment', icon: '🍽️' },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { value: 'office_supplies', label: 'Office Supplies', icon: '📎' },
  { value: 'communication', label: 'Communication', icon: '📞' },
  { value: 'utilities', label: 'Utilities', icon: '💡' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎉' },
  { value: 'training', label: 'Training & Development', icon: '📚' },
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📝' },
];

// Payment Request Types
export type PaymentRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PaymentRequestMethod = 'wallet' | 'mobile_money' | 'bank';

export interface ExpensePaymentRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  expense: {
    id: string;
    category: ExpenseCategory;
    description: string;
    date: string;
    employee_id: string;
    employee_name: string;
    employee_email: string;
  };
  payment_method: PaymentRequestMethod;
  amount: string;
  currency: string;
  status: PaymentRequestStatus;
  // Source accounts
  source_wallet?: {
    id: string;
    name: string;
    balance: string;
  };
  source_mobile_money_account?: {
    id: string;
    account_name: string;
    phone_number: string;
  };
  source_bank_account?: {
    id: string;
    account_name: string;
    account_number: string;
  };
  // Destination
  destination_phone?: string;
  destination_bank_account_name?: string;
  destination_bank_account_number?: string;
  destination_bank_name?: string;
  // Tracking
  requested_by?: {
    id: string;
    name: string;
    email: string;
  };
  requested_at?: string;
  approved_by?: {
    id: string;
    name: string;
  };
  approved_at?: string;
  rejection_reason?: string;
  processed_by?: {
    id: string;
    name: string;
  };
  processed_at?: string;
  payment_reference?: string;
  provider_reference?: string;
  failure_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequestPayload {
  expense_id: string;
  payment_method: PaymentRequestMethod;
  // Optional partial payment amount
  amount?: string;
  // For wallet payments
  source_wallet_id?: string;
  // For mobile money payments (ProviderAccount with provider=mtn/airtel/safaricom)
  source_provider_account_id?: string;
  destination_phone?: string;
  // For bank payments
  source_bank_account_id?: string;
  destination_bank_account_name?: string;
  destination_bank_account_number?: string;
  destination_bank_name?: string;
  notes?: string;
}

export interface PaymentRequestStats {
  pending: { count: number; amount: string };
  approved: { count: number; amount: string };
  processing: { count: number; amount: string };
  completed: { count: number; amount: string };
  failed: { count: number; amount: string };
  rejected: { count: number; amount: string };
}
