// Reports Hooks

import { useQuery, useMutation } from "@tanstack/react-query";
import { reportsApi } from "@/lib/reports-api";
import type { ReportFilters, ExportParams, PaymentTransactionFilters } from "@/types/reports";

// CEO Dashboard
export function useCEODashboard(
  organizationId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ["reports", "ceo-dashboard", organizationId, startDate, endDate],
    queryFn: () => reportsApi.getCEODashboard(organizationId!, startDate, endDate),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Dashboard
export function useReportsDashboard(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["reports", "dashboard", organizationId],
    queryFn: () => reportsApi.getDashboard(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Financial Reports
export function useFinancialOverview(filters: ReportFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "financial", filters],
    queryFn: () => reportsApi.getFinancialOverview(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFinancialTrends(
  organizationId: string | undefined,
  months: number = 6
) {
  return useQuery({
    queryKey: ["reports", "financial", "trends", organizationId, months],
    queryFn: () => reportsApi.getFinancialTrends(organizationId!, months),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Expense Reports
export function useExpenseReport(filters: ReportFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "expenses", filters],
    queryFn: () => reportsApi.getExpenseReport(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExpenseTrend(filters: ReportFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "expenses", "trend", filters],
    queryFn: () => reportsApi.getExpenseTrend(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

// Transaction Reports
export function useTransactionReport(filters: ReportFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "transactions", filters],
    queryFn: () => reportsApi.getTransactionReport(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

// Payment Transactions
export function usePaymentTransactions(
  organizationId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ["reports", "payment-transactions", organizationId, startDate, endDate],
    queryFn: () => reportsApi.getPaymentTransactions(organizationId!, startDate, endDate),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Payment Transaction List (individual records with filters)
export function usePaymentTransactionList(filters: PaymentTransactionFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "payment-transaction-list", filters],
    queryFn: () => reportsApi.getPaymentTransactionList(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCashFlow(filters: ReportFilters | undefined) {
  return useQuery({
    queryKey: ["reports", "transactions", "cashflow", filters],
    queryFn: () => reportsApi.getCashFlow(filters!),
    enabled: !!filters?.organization,
    staleTime: 1000 * 60 * 5,
  });
}

// Payables Aging
export function usePayablesAging(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["reports", "payables-aging", organizationId],
    queryFn: () => reportsApi.getPayablesAging(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Currency Exposure
export function useCurrencyExposure(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["reports", "currency-exposure", organizationId],
    queryFn: () => reportsApi.getCurrencyExposure(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Account Balances
export function useAccountBalances(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["reports", "accounts", organizationId],
    queryFn: () => reportsApi.getAccountBalances(organizationId!),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Export
export function useExportReport() {
  return useMutation({
    mutationFn: async (params: ExportParams) => {
      const blob = await reportsApi.exportReport(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Determine filename based on type and format
      const extension = params.format === "excel" ? "xlsx" : params.format;
      link.download = `${params.report_type}_report.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return blob;
    },
  });
}
