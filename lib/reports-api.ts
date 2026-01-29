// Reports API Client

import { apiClient } from "./api-client";
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
    const response = await apiClient.get(`${BASE_URL}/dashboard/`, {
      params: { organization: organizationId },
    });
    return response.data;
  },

  // Financial Reports
  getFinancialOverview: async (
    filters: ReportFilters
  ): Promise<FinancialOverview> => {
    const response = await apiClient.get(`${BASE_URL}/financial/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
    return response.data;
  },

  getFinancialTrends: async (
    organizationId: string,
    months: number = 6
  ): Promise<{ trends: BalanceTrend[] }> => {
    const response = await apiClient.get(`${BASE_URL}/financial/trends/`, {
      params: { organization: organizationId, months },
    });
    return response.data;
  },

  // Expense Reports
  getExpenseReport: async (filters: ReportFilters): Promise<ExpenseReport> => {
    const response = await apiClient.get(`${BASE_URL}/expenses/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
    return response.data;
  },

  getExpenseTrend: async (
    filters: ReportFilters
  ): Promise<{ trend: Array<{ period: string; total: number; count: number }> }> => {
    const response = await apiClient.get(`${BASE_URL}/expenses/trend/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
        granularity: filters.granularity || "month",
      },
    });
    return response.data;
  },

  // Transaction Reports
  getTransactionReport: async (
    filters: ReportFilters
  ): Promise<TransactionReport> => {
    const response = await apiClient.get(`${BASE_URL}/transactions/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
      },
    });
    return response.data;
  },

  getCashFlow: async (
    filters: ReportFilters
  ): Promise<{ cash_flow: Array<{ period: string; credits: number; debits: number; net: number }> }> => {
    const response = await apiClient.get(`${BASE_URL}/transactions/cash-flow/`, {
      params: {
        organization: filters.organization,
        start_date: filters.start_date,
        end_date: filters.end_date,
        granularity: filters.granularity || "month",
      },
    });
    return response.data;
  },

  // Account Balances
  getAccountBalances: async (
    organizationId: string
  ): Promise<AccountBalances> => {
    const response = await apiClient.get(`${BASE_URL}/accounts/`, {
      params: { organization: organizationId },
    });
    return response.data;
  },

  // Export
  exportReport: async (params: ExportParams): Promise<Blob> => {
    const response = await apiClient.post(`${BASE_URL}/export/`, params, {
      responseType: "blob",
    });
    return response.data;
  },
};
