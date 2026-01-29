// Reports API Client

import { get, post } from "./api";
import type {
  DashboardStats,
  FinancialOverview,
  BalanceTrend,
  ExpenseReport,
  TransactionReport,
  AccountBalances,
  ReportFilters,
  ExportParams,
} from "@/types/reports";

const BASE_URL = "/api/v1/reports";

export const reportsApi = {
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
};
