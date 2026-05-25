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
  months: number = 6,
  source: "default" | "payments" = "default"
) {
  return useQuery({
    queryKey: ["reports", "financial", "trends", organizationId, months, source],
    queryFn: () => reportsApi.getFinancialTrends(organizationId!, months, source),
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

// Pipeline Overview — one envelope feeding the dashboard
export function usePipelineOverview(
  organizationId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ["reports", "pipeline-overview", organizationId, startDate, endDate],
    queryFn: () =>
      reportsApi.getPipelineOverview(organizationId!, startDate, endDate),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

// Detail reports — CEO pack
type ThroughputFilters = Parameters<typeof reportsApi.getThroughputReport>[1];
export function useThroughputReport(
  organizationId: string | undefined,
  filters: ThroughputFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "throughput", organizationId, filters],
    queryFn: () => reportsApi.getThroughputReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type ConcentrationFilters = Parameters<typeof reportsApi.getConcentrationReport>[1];
export function useConcentrationReport(
  organizationId: string | undefined,
  filters: ConcentrationFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "concentration", organizationId, filters],
    queryFn: () => reportsApi.getConcentrationReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type LiquidityFilters = Parameters<typeof reportsApi.getLiquidityReport>[1];
export function useLiquidityReport(
  organizationId: string | undefined,
  filters: LiquidityFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "liquidity", organizationId, filters],
    queryFn: () => reportsApi.getLiquidityReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type ApprovalCycleFilters = Parameters<typeof reportsApi.getApprovalCycleReport>[1];
export function useApprovalCycleReport(
  organizationId: string | undefined,
  filters: ApprovalCycleFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "approval-cycle", organizationId, filters],
    queryFn: () => reportsApi.getApprovalCycleReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

// Accountant pack
type SettlementFilters = Parameters<typeof reportsApi.getSettlementReport>[1];
export function useSettlementReport(
  organizationId: string | undefined,
  filters: SettlementFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "settlement", organizationId, filters],
    queryFn: () => reportsApi.getSettlementReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type UnreconciledFilters = Parameters<typeof reportsApi.getUnreconciledReport>[1];
export function useUnreconciledReport(
  organizationId: string | undefined,
  filters: UnreconciledFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "unreconciled", organizationId, filters],
    queryFn: () => reportsApi.getUnreconciledReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type FeesFilters = Parameters<typeof reportsApi.getFeesLedgerReport>[1];
export function useFeesLedgerReport(
  organizationId: string | undefined,
  filters: FeesFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "fees", organizationId, filters],
    queryFn: () => reportsApi.getFeesLedgerReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
  });
}

type AuditLogFilters = Parameters<typeof reportsApi.getAuditLogs>[0];
export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["reports", "audit-logs", filters],
    queryFn: () => reportsApi.getAuditLogs(filters),
    staleTime: 1000 * 30,
  });
}

export function useAuditStats(organizationId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["reports", "audit-stats", organizationId, days],
    queryFn: () => reportsApi.getAuditStats(organizationId, days),
    staleTime: 1000 * 60,
  });
}

type FailuresFilters = Parameters<typeof reportsApi.getFailuresReport>[1];
export function useFailuresReport(
  organizationId: string | undefined,
  filters: FailuresFilters = {}
) {
  return useQuery({
    queryKey: ["reports", "failures", organizationId, filters],
    queryFn: () => reportsApi.getFailuresReport(organizationId!, filters),
    enabled: !!organizationId,
    staleTime: 1000 * 60,
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
