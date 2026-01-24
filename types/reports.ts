/**
 * Reports Types
 */

// Dashboard Overview
export interface DashboardOverview {
  period: DatePeriod;
  expenses: ExpenseSummary;
  wallets: WalletSummary;
  transactions: TransactionSummary;
}

export interface DatePeriod {
  start_date: string;
  end_date: string;
}

export interface ExpenseSummary {
  total_amount: string;
  approved_amount: string;
  pending_amount: string;
  count: number;
  previous_period_total: string;
  change_percent: number;
}

export interface WalletSummary {
  total_balance: string;
  wallet_count: number;
  department_wallets: number;
  general_wallets: number;
}

export interface TransactionSummary {
  total_inflow: string;
  total_outflow: string;
  net_flow: string;
  transaction_count: number;
}

// Expense Analytics
export interface ExpenseAnalytics {
  period: DatePeriod;
  by_category: CategoryBreakdown[];
  by_status: StatusBreakdown[];
  by_employee: EmployeeBreakdown[];
  daily_trend: DailyTrend[];
  top_expenses: TopExpense[];
}

export interface CategoryBreakdown {
  category: string;
  total: string;
  count: number;
  avg_amount: string;
}

export interface StatusBreakdown {
  status: string;
  total: string;
  count: number;
}

export interface EmployeeBreakdown {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  total: string;
  count: number;
}

export interface DailyTrend {
  day: string;
  total: string;
  count: number;
}

export interface TopExpense {
  id: string;
  category: string;
  amount: string;
  currency: string;
  description: string;
  date: string;
  employee_name: string;
  status_display: string;
}

// Financial Overview
export interface FinancialOverview {
  period: DatePeriod;
  summary: FinancialSummary;
  trends: FinancialTrend[];
  wallet_balances: WalletBalance[];
}

export interface FinancialSummary {
  total_income: string;
  total_expenses: string;
  expense_claims: string;
  net_position: string;
}

export interface FinancialTrend {
  date: string;
  inflow: string;
  outflow: string;
}

export interface WalletBalance {
  id: string;
  name: string;
  wallet_type: string;
  balance: string;
  currency: string;
  monthly_budget: string | null;
}

// Transaction Report
export interface TransactionReport {
  period: DatePeriod;
  summary: Record<string, { total: string; count: number }>;
  cash_flow: CashFlowData[];
  transactions: TransactionItem[];
}

export interface CashFlowData {
  date: string;
  deposits: string;
  withdrawals: string;
  transfers_in: string;
  transfers_out: string;
}

export interface TransactionItem {
  id: string;
  wallet_name: string;
  transaction_type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  reference: string;
  initiated_by: string | null;
  created_at: string;
}

// Department Breakdown
export interface DepartmentBreakdown {
  department: string;
  wallet_id: string;
  current_balance: string;
  monthly_budget: string | null;
  total_spent: string;
  total_received: string;
  budget_utilization: number | null;
}

// AI Insights
export interface AIInsight {
  id: string;
  type: 'anomaly' | 'trend' | 'recommendation' | 'prediction' | 'summary';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  suggestion: string;
  created_at: string;
  is_dismissed: boolean;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  generated_at: string;
}

// Natural Language Query
export interface NLQueryRequest {
  organization_id: string;
  query: string;
}

export interface NLQueryResponse {
  query: string;
  filters: Record<string, string>;
  response_type: string;
  success: boolean;
  error: string | null;
  data?: DashboardOverview | ExpenseAnalytics | TransactionReport | FinancialOverview;
}

// Predictions
export interface PredictionResponse {
  period: string;
  predictions: CategoryPrediction[];
  total_predicted_spend: string;
  confidence: 'low' | 'medium' | 'high';
  key_factors: string[];
  generated_at: string;
}

export interface CategoryPrediction {
  category: string;
  estimated_amount: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

// Export
export interface ExportRequest {
  organization_id: string;
  report_type: 'dashboard' | 'expenses' | 'transactions' | 'financial';
  format: 'csv' | 'pdf' | 'excel';
  filters?: {
    start_date?: string;
    end_date?: string;
    category?: string;
    transaction_type?: string;
    wallet_id?: string;
  };
}

// Saved Reports
export interface SavedReport {
  id: string;
  name: string;
  description: string;
  report_type: string;
  filters: Record<string, unknown>;
  is_scheduled: boolean;
  schedule_frequency: string | null;
  created_at: string;
}

export interface SaveReportRequest {
  organization_id: string;
  name: string;
  description?: string;
  report_type: string;
  filters: Record<string, unknown>;
  is_scheduled?: boolean;
  schedule_frequency?: string;
  schedule_recipients?: string[];
}

// Report Filters
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  category?: string;
  status?: string;
  transaction_type?: string;
  wallet_id?: string;
  employee_id?: string;
}
