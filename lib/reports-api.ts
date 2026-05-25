// Reports API Client

import { get, post } from "./api";
import type {
  ApprovalCycleReport,
  AuditLogListResponse,
  AuditStats,
  CEODashboard,
  ConcentrationReport,
  DashboardStats,
  FailuresReport,
  FeesLedgerReport,
  FinancialOverview,
  BalanceTrend,
  ExpenseReport,
  TransactionReport,
  AccountBalances,
  LiquidityReport,
  PaymentTransactionsReport,
  PaymentTransactionListResponse,
  PaymentTransactionFilters,
  PipelineOverview,
  ReportFilters,
  ExportParams,
  SettlementReport,
  ThroughputReport,
  UnreconciledReport,
} from "@/types/reports";

const BASE_URL = "/api/v1/reports";

export const reportsApi = {
  // CEO Dashboard
  getCEODashboard: async (
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CEODashboard> => {
    return get<CEODashboard>(`${BASE_URL}/ceo-dashboard/`, {
      params: {
        organization: organizationId,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
  },

  // Pipeline overview — single envelope powering most of /reports
  getPipelineOverview: async (
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PipelineOverview> => {
    return get<PipelineOverview>(`${BASE_URL}/pipeline-overview/`, {
      params: {
        organization: organizationId,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
  },

  // Detail reports — CEO pack
  getThroughputReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      granularity?: "day" | "week" | "month";
      channel?: string;
      status?: string;
    } = {}
  ): Promise<ThroughputReport> => {
    return get<ThroughputReport>(`${BASE_URL}/throughput/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.granularity && { granularity: filters.granularity }),
        ...(filters.channel && { channel: filters.channel }),
        ...(filters.status && { status: filters.status }),
      },
    });
  },

  getConcentrationReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      dimension?: "recipient" | "channel" | "currency";
      top_n?: number;
      include_bulk?: boolean;
    } = {}
  ): Promise<ConcentrationReport> => {
    return get<ConcentrationReport>(`${BASE_URL}/concentration/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.dimension && { dimension: filters.dimension }),
        ...(filters.top_n !== undefined && { top_n: filters.top_n }),
        ...(filters.include_bulk !== undefined && {
          include_bulk: filters.include_bulk ? "true" : "false",
        }),
      },
    });
  },

  getLiquidityReport: async (
    organizationId: string,
    filters: {
      currency?: string;
      environment?: "all" | "sandbox" | "production";
      active_only?: boolean;
    } = {}
  ): Promise<LiquidityReport> => {
    return get<LiquidityReport>(`${BASE_URL}/liquidity/`, {
      params: {
        organization: organizationId,
        ...(filters.currency && { currency: filters.currency }),
        ...(filters.environment && { environment: filters.environment }),
        ...(filters.active_only !== undefined && {
          active_only: filters.active_only ? "true" : "false",
        }),
      },
    });
  },

  getApprovalCycleReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      status?: string;
      approver_id?: string;
      min_amount?: string;
    } = {}
  ): Promise<ApprovalCycleReport> => {
    return get<ApprovalCycleReport>(`${BASE_URL}/approval-cycle/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.status && { status: filters.status }),
        ...(filters.approver_id && { approver_id: filters.approver_id }),
        ...(filters.min_amount && { min_amount: filters.min_amount }),
      },
    });
  },

  // Detail reports — Accountant pack
  getSettlementReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      account_kind?: "all" | "provider" | "bank";
      currency?: string;
    } = {}
  ): Promise<SettlementReport> => {
    return get<SettlementReport>(`${BASE_URL}/settlement/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.account_kind && { account_kind: filters.account_kind }),
        ...(filters.currency && { currency: filters.currency }),
      },
    });
  },

  getUnreconciledReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      bucket?: "all" | "bank_no_response" | "bank_unmatched" | "provider_stuck";
      min_age_hours?: number;
    } = {}
  ): Promise<UnreconciledReport> => {
    return get<UnreconciledReport>(`${BASE_URL}/unreconciled/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.bucket && { bucket: filters.bucket }),
        ...(filters.min_age_hours !== undefined && {
          min_age_hours: filters.min_age_hours,
        }),
      },
    });
  },

  getFeesLedgerReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      status?: "completed" | "all";
      account_id?: string;
    } = {}
  ): Promise<FeesLedgerReport> => {
    return get<FeesLedgerReport>(`${BASE_URL}/fees/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.status && { status: filters.status }),
        ...(filters.account_id && { account_id: filters.account_id }),
      },
    });
  },

  // Audit log — backed by security.AuditLog (canonical system-wide
  // audit trail). Backend endpoint: /api/v1/security/audit-logs/
  getAuditLogs: async (filters: {
    organization?: string;
    action_type?: string;
    severity?: string;
    module?: string;
    user?: number | string;
    success?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
  } = {}): Promise<AuditLogListResponse> => {
    const params: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== "") params[k] = v as string | number | boolean;
    }
    return get<AuditLogListResponse>(`/api/v1/security/audit-logs/`, {
      params,
    });
  },

  getAuditStats: async (organizationId?: string, days = 30): Promise<AuditStats> => {
    const params: Record<string, string | number> = { days };
    if (organizationId) params.organization = organizationId;
    return get<AuditStats>(`/api/v1/security/audit-logs/stats/`, { params });
  },

  // CSV export via the existing security endpoint (limited to 1000 rows).
  // Triggers an authenticated blob download client-side.
  downloadAuditLogs: async (filters: Record<string, string | number | boolean | undefined> = {}): Promise<void> => {
    const params: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== "") params[k] = v;
    }
    const blob = await get<Blob>(`/api/v1/security/audit-logs/export/`, {
      params,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getFailuresReport: async (
    organizationId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      source?: "all" | "provider" | "bank" | "pain002";
      reason_contains?: string;
    } = {}
  ): Promise<FailuresReport> => {
    return get<FailuresReport>(`${BASE_URL}/failures/`, {
      params: {
        organization: organizationId,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.source && { source: filters.source }),
        ...(filters.reason_contains && { reason_contains: filters.reason_contains }),
      },
    });
  },

  // Dashboard
  getDashboard: async (organizationId: string): Promise<DashboardStats> => {
    return get<DashboardStats>(`${BASE_URL}/dashboard/`, {
      params: { organization: organizationId },
    });
  },

  // Financial Reports
  getFinancialOverview: async (
    filters: ReportFilters
  ): Promise<FinancialOverview> => {
    return get<FinancialOverview>(`${BASE_URL}/financial/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
  },

  getFinancialTrends: async (
    organizationId: string,
    months: number = 6,
    source: "default" | "payments" = "default"
  ): Promise<{ trends: BalanceTrend[] }> => {
    return get<{ trends: BalanceTrend[] }>(`${BASE_URL}/financial/trends/`, {
      params: { organization: organizationId, months, source },
    });
  },

  // Expense Reports
  getExpenseReport: async (filters: ReportFilters): Promise<ExpenseReport> => {
    return get<ExpenseReport>(`${BASE_URL}/expenses/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
  },

  getExpenseTrend: async (
    filters: ReportFilters
  ): Promise<{ trend: Array<{ period: string; total: number; count: number }> }> => {
    return get<{ trend: Array<{ period: string; total: number; count: number }> }>(
      `${BASE_URL}/expenses/trend/`,
      {
        params: {
          organization: filters.organization,
          start_date: filters.start_date,
          end_date: filters.end_date,
          granularity: filters.granularity || "month",
        },
      }
    );
  },

  // Transaction Reports
  getTransactionReport: async (
    filters: ReportFilters
  ): Promise<TransactionReport> => {
    return get<TransactionReport>(`${BASE_URL}/transactions/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
  },

  getCashFlow: async (
    filters: ReportFilters
  ): Promise<{ cash_flow: Array<{ period: string; credits: number; debits: number; net: number }> }> => {
    return get<{ cash_flow: Array<{ period: string; credits: number; debits: number; net: number }> }>(
      `${BASE_URL}/transactions/cash-flow/`,
      {
        params: {
          organization: filters.organization,
          start_date: filters.start_date,
          end_date: filters.end_date,
          granularity: filters.granularity || "month",
        },
      }
    );
  },

  // Payment Transactions
  getPaymentTransactions: async (
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaymentTransactionsReport> => {
    return get<PaymentTransactionsReport>(`${BASE_URL}/payment-transactions/`, {
      params: {
        organization: organizationId,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
  },

  // Payment Transaction List (individual records)
  getPaymentTransactionList: async (
    filters: PaymentTransactionFilters
  ): Promise<PaymentTransactionListResponse> => {
    return get<PaymentTransactionListResponse>(`${BASE_URL}/payment-transactions/list/`, {
      params: {
        organization: filters.organization,
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
        ...(filters.status && { status: filters.status }),
        ...(filters.method && { method: filters.method }),
      },
    });
  },

  // Account Balances
  getAccountBalances: async (
    organizationId: string
  ): Promise<AccountBalances> => {
    return get<AccountBalances>(`${BASE_URL}/accounts/`, {
      params: { organization: organizationId },
    });
  },

  // Export
  exportReport: async (params: ExportParams): Promise<Blob> => {
    return post<Blob>(`${BASE_URL}/export/`, params, {
      responseType: "blob",
    });
  },

  // Dashboard widgets
  getPayablesAging: async (organizationId: string) => {
    return get<{
      buckets: Array<{ label: string; days: string; count: number; amount: string; percentage: number }>;
      total: string;
      bill_count: number;
    }>(`${BASE_URL}/payables-aging/`, {
      params: { organization: organizationId },
    });
  },

  getCurrencyExposure: async (organizationId: string) => {
    return get<{
      currencies: Array<{ code: string; count: number; amount: string; ugx_amount: string; rate: string; percentage: number }>;
      total_ugx: string;
    }>(`${BASE_URL}/currency-exposure/`, {
      params: { organization: organizationId },
    });
  },
};
