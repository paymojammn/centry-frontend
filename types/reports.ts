// Reports Types

export interface DashboardStats {
  expenses: {
    total: number;
    count: number;
    change: number;
  };
  transactions: {
    credits: number;
    debits: number;
    net_flow: number;
    change: number;
  };
  period: {
    start: string;
    end: string;
  };
}

export interface FinancialOverview {
  income: {
    total: number;
    from_transactions: number;
  };
  expenses: {
    total: number;
    paid: number;
    pending: number;
  };
  cash_flow: {
    inflow: number;
    outflow: number;
    net: number;
  };
  net_position: number;
  period: {
    start: string;
    end: string;
  };
}

export interface BalanceTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ExpenseSummary {
  total_amount: number;
  count: number;
  avg_amount: number;
  by_status: Array<{
    status: string;
    total: number;
    count: number;
  }>;
  by_currency: Array<{
    currency: string;
    total: number;
    count: number;
  }>;
}

export interface ExpenseByVendor {
  vendor__id: string;
  vendor__name: string;
  total: number;
  count: number;
}

export interface ExpenseTrend {
  period: string;
  total: number;
  count: number;
}

export interface TransactionSummary {
  total_credits: number;
  credit_count: number;
  total_debits: number;
  debit_count: number;
  net_flow: number;
}

export interface CashFlowData {
  period: string;
  credits: number;
  debits: number;
  net: number;
  count: number;
}

export interface AccountBalance {
  id: string;
  name: string;
  account_number: string;
  currency: string;
  balance: number;
}

export interface AccountBalances {
  accounts: AccountBalance[];
  totals_by_currency: Record<string, number>;
}

export interface ExpenseReport {
  summary: ExpenseSummary;
  by_vendor: ExpenseByVendor[];
  trend: ExpenseTrend[];
}

export interface TransactionReport {
  summary: TransactionSummary;
  trend: CashFlowData[];
}

export interface ReportFilters {
  organization: string;
  start_date?: string;
  end_date?: string;
  granularity?: "day" | "week" | "month";
}

// CEO Dashboard Types

export interface BillsSummary {
  total_paid: number;
  paid_count: number;
  change: number;
  total_pending: number;
  pending_count: number;
  overdue_amount: number;
  overdue_count: number;
}

export interface PaymentChannel {
  channel: string;
  amount: number;
  count: number;
}

export interface PendingBill {
  id: string;
  invoice_number: string;
  vendor_name: string;
  amount: number;
  amount_due: number;
  currency: string;
  due_date: string | null;
  is_overdue: boolean;
}

export interface TopVendor {
  vendor_name: string;
  total_paid: number;
  bill_count: number;
}

export interface CEODashboard {
  bills_summary: BillsSummary;
  payment_channels: PaymentChannel[];
  pending_bills: PendingBill[];
  top_vendors: TopVendor[];
  pending_approvals: number;
}

// Payment Transactions Report Types

export interface PaymentOverview {
  total_submitted: { amount: number; count: number };
  successful: { amount: number; count: number };
  failed: { amount: number; count: number };
  processing: { amount: number; count: number };
  change: number;
}

export interface ChannelBreakdown {
  channel: string;
  method: string;
  total_amount: number;
  total_count: number;
  successful: { amount: number; count: number };
  failed: { amount: number; count: number };
  pending: { amount: number; count: number };
}

export interface PaymentFile {
  id: string;
  filename: string;
  created_at: string;
  uploaded_at: string | null;
  payment_count: number;
  total_amount: number;
  currency: string;
  status: string;
  bank_account_name: string;
  successful_count: number;
  failed_count: number;
  pending_count: number;
  bank_status: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
  amount: number;
}

export interface PaymentTransactionsReport {
  overview: PaymentOverview;
  by_channel: ChannelBreakdown[];
  recent_files: PaymentFile[];
  status_distribution: StatusDistribution[];
}

// Individual Payment Transaction (from list endpoint)

export interface UserInfo {
  name: string;
  email: string;
}

export interface RejectedByInfo extends UserInfo {
  reason: string;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  method: string;
  channel: string;
  amount: number;
  currency: string;
  status: string;
  status_label: string;
  recipient: string;
  reference: string;
  note: string;
  initiated_by: UserInfo | null;
  approved_by: UserInfo | null;
  rejected_by: RejectedByInfo | null;
}

export interface PaymentTransactionListResponse {
  transactions: PaymentTransaction[];
  total_count: number;
}

export interface PaymentTransactionFilters {
  organization: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  method?: string;
}

export interface ExportParams {
  organization: string;
  report_type: "expenses" | "transactions" | "financial" | "payment-transactions";
  format: "csv" | "excel" | "pdf";
  start_date?: string;
  end_date?: string;
  status?: string;
  method?: string;
}
