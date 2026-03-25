// Reports API Client

import { get, post } from "./api";
import type {
  CEODashboard,
  DashboardStats,
  FinancialOverview,
  BalanceTrend,
  ExpenseReport,
  TransactionReport,
  AccountBalances,
  PaymentTransactionsReport,
  PaymentTransactionListResponse,
  PaymentTransactionFilters,
  ReportFilters,
  ExportParams,
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
    months: number = 6
  ): Promise<{ trends: BalanceTrend[] }> => {
    return get<{ trends: BalanceTrend[] }>(`${BASE_URL}/financial/trends/`, {
      params: { organization: organizationId, months },
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
