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

export interface ExportParams {
  organization: string;
  report_type: "expenses" | "transactions" | "financial";
  format: "csv" | "excel" | "pdf";
  start_date?: string;
  end_date?: string;
}
