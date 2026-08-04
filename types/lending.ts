/**
 * Lending types — ERPNext (Frappe Lending) loan book mirrored by the backend.
 *
 * Shapes mirror erp_erpnext lending serializers (/api/v1/erpnext/loans/ etc.).
 */

export type LoanStatus =
  | 'Draft'
  | 'Sanctioned'
  | 'Partially Disbursed'
  | 'Disbursed'
  | 'Active'
  | 'Loan Closure Requested'
  | 'Closed'
  | 'Settled'
  | 'Written Off';

export interface Loan {
  id: string;
  erpnext_name: string;
  applicant_type: string;
  applicant: string;
  applicant_name: string;
  loan_product: string;
  company: string;
  posting_date: string | null;
  currency: string;
  loan_amount: string;
  rate_of_interest: string;
  disbursed_amount: string;
  total_payment: string;
  total_amount_paid: string;
  outstanding_amount: string;
  next_due_date: string | null;
  status: LoanStatus;
  docstatus: number;
  /** Deep link to the Loan doc on the Frappe site. */
  desk_url: string;
  created_at: string;
  updated_at: string;
}

export interface LoanScheduleRow {
  id: string;
  idx: number;
  payment_date: string;
  principal_amount: string;
  interest_amount: string;
  total_payment: string;
  balance_loan_amount: string;
}

export interface LoanRepayment {
  id: string;
  erpnext_name: string;
  against_loan: string;
  posting_date: string;
  amount_paid: string;
  principal_amount_paid: string;
  reference_number: string;
  docstatus: number;
  /** Deep link to the Loan Repayment doc on the Frappe site. */
  desk_url: string;
  created_at: string;
}

export interface LoanDisbursement {
  id: string;
  erpnext_name: string;
  against_loan: string;
  /** Mirrored Paymoja loan id (null when the loan isn't synced). */
  loan: string | null;
  applicant_name: string;
  currency: string;
  disbursement_date: string;
  disbursed_amount: string;
  reference_number: string;
  docstatus: number;
  /** Deep link to the Loan Disbursement doc on the Frappe site. */
  desk_url: string;
  created_at: string;
}

export interface LoanDetail extends Loan {
  schedule_rows: LoanScheduleRow[];
  repayments: LoanRepayment[];
  disbursements: LoanDisbursement[];
}

/** Collection-run worklist row (GET /loans/due/). */
export interface LoanDueRow {
  loan_id: string;
  erpnext_name: string;
  applicant: string;
  applicant_name: string;
  loan_product: string;
  currency: string;
  installments_due: number;
  cumulative_due: string;
  total_amount_paid: string;
  amount_due: string;
  last_due_date: string;
  days_overdue: number;
}

export interface LoanStats {
  total: number;
  open: number;
  closed: number;
  outstanding_amount: string;
  due_today: string;
}

export interface RecordRepaymentPayload {
  amount: string;
  posting_date?: string;
  reference?: string;
}

export interface RecordDisbursementPayload {
  amount: string;
  disbursement_date?: string;
  reference?: string;
}

/** Response of the repay/disburse write-through actions. */
export interface LoanPushResult {
  detail: string;
  name: string;
  loan: Loan;
}

export interface LoanFilters {
  status?: LoanStatus | 'all';
  organization?: string;
}
