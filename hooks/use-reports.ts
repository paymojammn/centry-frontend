/**
 * Reports React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/lib/reports-api';
import type {
  ReportFilters,
  NLQueryRequest,
  ExportRequest,
  SaveReportRequest,
} from '@/types/reports';

/**
 * Hook to fetch dashboard overview
 */
export function useReportsDashboard(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-dashboard', organizationId, filters],
    queryFn: () => reportsApi.getDashboard(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch financial overview
 */
export function useFinancialOverview(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-financial', organizationId, filters],
    queryFn: () => reportsApi.getFinancialOverview(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch financial trends
 */
export function useFinancialTrends(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-financial-trends', organizationId, filters],
    queryFn: () => reportsApi.getFinancialTrends(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch expense analytics
 */
export function useExpenseAnalytics(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-expenses', organizationId, filters],
    queryFn: () => reportsApi.getExpenseAnalytics(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch expenses by category
 */
export function useExpensesByCategory(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-expenses-category', organizationId, filters],
    queryFn: () => reportsApi.getExpensesByCategory(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch expenses by department
 */
export function useExpensesByDepartment(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-expenses-department', organizationId, filters],
    queryFn: () => reportsApi.getExpensesByDepartment(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch transaction report
 */
export function useTransactionReport(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-transactions', organizationId, filters],
    queryFn: () => reportsApi.getTransactionReport(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch cash flow data
 */
export function useCashFlow(
  organizationId: string | undefined,
  filters?: ReportFilters
) {
  return useQuery({
    queryKey: ['reports-cash-flow', organizationId, filters],
    queryFn: () => reportsApi.getCashFlow(organizationId!, filters),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch AI insights
 */
export function useAIInsights(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['reports-ai-insights', organizationId],
    queryFn: () => reportsApi.getAIInsights(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for natural language query
 */
export function useNaturalLanguageQuery() {
  return useMutation({
    mutationFn: (request: NLQueryRequest) => reportsApi.processNLQuery(request),
  });
}

/**
 * Hook to fetch predictions
 */
export function usePredictions(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['reports-predictions', organizationId],
    queryFn: () => reportsApi.getPredictions(organizationId!),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to dismiss an AI insight
 */
export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      insightId,
    }: {
      organizationId: string;
      insightId: string;
    }) => reportsApi.dismissInsight(organizationId, insightId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['reports-ai-insights', variables.organizationId],
      });
    },
  });
}

/**
 * Hook to export a report
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async (request: ExportRequest) => {
      const blob = await reportsApi.exportReport(request);
      return { blob, format: request.format, reportType: request.report_type };
    },
    onSuccess: ({ blob, format, reportType }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const extension = format === 'excel' ? 'xlsx' : format;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `${reportType}_report_${timestamp}.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to fetch saved reports
 */
export function useSavedReports(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['saved-reports', organizationId],
    queryFn: () => reportsApi.getSavedReports(organizationId!),
    enabled: !!organizationId,
  });
}

/**
 * Hook to save a report configuration
 */
export function useSaveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SaveReportRequest) => reportsApi.saveReport(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-reports', variables.organization_id],
      });
    },
  });
}

/**
 * Hook to delete a saved report
 */
export function useDeleteSavedReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      organizationId,
    }: {
      reportId: string;
      organizationId: string;
    }) => reportsApi.deleteSavedReport(reportId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['saved-reports', variables.organizationId],
      });
    },
  });
}
