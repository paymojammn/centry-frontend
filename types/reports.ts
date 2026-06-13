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
  report_type:
    | "expenses"
    | "transactions"
    | "financial"
    | "payment-transactions"
    | "pipeline";
  format: "csv" | "excel" | "pdf";
  start_date?: string;
  end_date?: string;
  status?: string;
  method?: string;
}

export type PipelineStageKey =
  | "pending_approval"
  | "ready_for_export"
  | "sent_to_bank"
  | "bank_accepted"
  | "bank_rejected";

export interface PipelineQueueStage {
  stage: PipelineStageKey;
  label: string;
  count: number;
  amount: string;
}

export interface PipelineByBankRow {
  bank_account_id: string;
  bank_name: string;
  account_name: string;
  currency: string;
  sent_count: number;
  sent_amount: string;
  accepted_count: number;
  accepted_amount: string;
  rejected_count: number;
  acceptance_rate: number | null;
}

export interface PipelineProviderAccount {
  account_id: string;
  account_name: string;
  provider: string;
  environment: string;
  is_active: boolean;
  currency: string;
  balance: string;
  balance_synced_at: string | null;
  period_completed_count: number;
  period_completed_amount: string;
  period_inflight_count: number;
  period_inflight_amount: string;
  period_failed_count: number;
}

export interface PipelineChannel {
  kind: "bank" | "provider";
  label: string;
  amount: string;
  count: number;
}

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
}

export interface CashFlowSeries {
  currency: string;
  series: CashFlowPoint[];
  total_inflow: number;
  total_outflow: number;
}

export interface PipelineTotalsBucket {
  bills_count: number;
  amount_processed: string;
  currency?: string;
}

export interface PipelineRecentTransaction {
  kind: "bank" | "provider";
  id: string;
  date: string;
  channel: string;
  recipient: string;
  amount: string;
  currency: string;
  count: number;
  status: string;
  status_label: string;
}

export interface PipelineOverview {
  period: { start_date: string; end_date: string };
  totals: { period: PipelineTotalsBucket; lifetime: PipelineTotalsBucket };
  queue: PipelineQueueStage[];
  by_bank: PipelineByBankRow[];
  provider_accounts: PipelineProviderAccount[];
  channels: PipelineChannel[];
  cash_flow_series: CashFlowSeries[];
  recent_transactions: PipelineRecentTransaction[];
}

// =====================================================================
// Detail reports — CEO pack
// =====================================================================

export interface ThroughputBucket {
  bucket: string;
  bank_count: number;
  bank_amount: string;
  provider_count: number;
  provider_amount: string;
  total_amount: string;
  total_count: number;
}

export interface ThroughputReport {
  period: { start_date: string; end_date: string; granularity: string };
  filters: { channel: string; status: string };
  series: ThroughputBucket[];
  totals: { amount: string; prev_amount: string; mom_pct: number | null };
}

export interface ConcentrationEntry {
  label: string;
  sub: string;
  amount: string;
  count: number;
  share: number;
}

export interface ConcentrationReport {
  period: { start_date: string; end_date: string };
  filters: { dimension: string; top_n: number; include_bulk: boolean };
  entries: ConcentrationEntry[];
  totals: { total_completed_amount: string; top3_pct: number; top5_pct: number };
}

export interface LiquidityAccount {
  account_id: string;
  name: string;
  provider: string;
  provider_code: string;
  environment: string;
  is_active: boolean;
  is_default: boolean;
  currency: string;
  balance: string;
  balance_synced_at: string | null;
  fee_percentage: string;
  fee_fixed: string;
}

export interface LiquidityReport {
  filters: { currency: string; environment: string; active_only: boolean };
  totals_by_currency: { currency: string; amount: string }[];
  accounts: LiquidityAccount[];
  account_count: number;
}

export interface ApprovalApprover {
  user_id: string;
  name: string;
  approved_count: number;
  approved_amount: string;
  avg_hours: number | null;
}

export interface ApprovalCycleReport {
  period: { start_date: string; end_date: string };
  filters: { status: string; approver_id: string; min_amount: string };
  pending: { count: number; amount: string; oldest_at: string | null };
  averages: {
    avg_hours_to_approve: number | null;
    avg_hours_to_execute: number | null;
    sample_size: number;
  };
  approvers: ApprovalApprover[];
}

// =====================================================================
// Detail reports — Accountant pack
// =====================================================================

export interface SettlementRow {
  date: string;
  account_kind: "provider" | "bank";
  account_id: string;
  account_name: string;
  provider: string;
  currency: string;
  count: number;
  amount: string;
  fees: string;
  net_debited: string;
}

export interface SettlementCurrentBalance {
  account_id: string;
  account_name: string;
  currency: string;
  balance: string;
  synced_at: string | null;
}

export interface SettlementReport {
  period: { start_date: string; end_date: string };
  filters: { account_kind: string; currency: string };
  rows: SettlementRow[];
  totals: {
    count: number;
    amount: string;
    fees: string;
    net_debited: string;
  };
  current_balances: SettlementCurrentBalance[];
}

export interface UnreconciledBucketSummary {
  count: number;
  amount: string;
}

export interface UnreconciledReport {
  period: { start_date: string; end_date: string };
  filters: { bucket: string; min_age_hours: number };
  summary: Record<string, UnreconciledBucketSummary>;
  sections: {
    bank_no_response?: Array<{
      id: string;
      filename: string;
      uploaded_at: string;
      bank: string;
      account_name: string;
      payment_count: number;
      amount: string;
      currency: string;
      age_hours: number;
    }>;
    bank_unmatched?: Array<{
      id: string;
      received_at: string;
      end_to_end_id: string;
      instruction_id: string;
      status: string;
      status_description: string;
      amount: string;
      currency: string;
      source_file: string;
    }>;
    provider_stuck?: Array<{
      id: string;
      created_at: string;
      recipient: string;
      amount: string;
      currency: string;
      provider: string;
      age_hours: number;
      payment_reference: string;
    }>;
  };
}

export interface FeesAccountRow {
  account_id: string;
  account_name: string;
  provider: string;
  count: number;
  amount: string;
  fee_percentage: string;
  fee_fixed: string;
  fees: string;
  effective_rate_pct: number;
}

export interface FeesDailyRow {
  date: string;
  count: number;
  amount: string;
  estimated_fee: string;
}

export interface FeesLedgerReport {
  period: { start_date: string; end_date: string };
  filters: { status: string; account_id: string };
  accounts: FeesAccountRow[];
  daily: FeesDailyRow[];
  totals: { amount: string; fees: string; effective_rate_pct: number };
}

export interface FailureRow {
  id: string;
  source: "provider" | "bank" | "pain002";
  date: string;
  channel: string;
  recipient: string;
  amount: string;
  currency: string;
  status: string;
  reason: string;
}

export interface FailuresReport {
  period: { start_date: string; end_date: string };
  filters: { source: string; reason_contains: string };
  summary: Record<string, { count: number; amount: string }>;
  rows: FailureRow[];
}

// Audit log — wired to centry-backend's security.AuditLog (the canonical
// system-wide audit trail). See /api/v1/security/audit-logs/.
export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditLog {
  id: string;
  user: number | null;
  user_name: string;
  user_email: string;
  user_ip: string | null;
  action_type: string;
  action_display: string;
  action_description: string;
  severity: AuditSeverity;
  severity_display: string;
  module: string;
  target_representation: string;
  timestamp: string;
  organization: string | null;
  organization_name: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  success: boolean;
  error_message: string;
}

export interface AuditLogListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLog[];
}

export interface AuditStats {
  total_logs: number;
  by_severity: Record<string, number>;
  by_module: Record<string, number>;
  by_action: Record<string, number>;
  recent_count: number;
  error_count: number;
  critical_count: number;
}
