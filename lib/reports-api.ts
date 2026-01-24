/**
 * Reports API Client
 *
 * Handles all reports-related API requests
 */

import api from './api';
import type {
  DashboardOverview,
  ExpenseAnalytics,
  FinancialOverview,
  TransactionReport,
  DepartmentBreakdown,
  AIInsightsResponse,
  NLQueryRequest,
  NLQueryResponse,
  PredictionResponse,
  ExportRequest,
  SavedReport,
  SaveReportRequest,
  ReportFilters,
} from '@/types/reports';

const REPORTS_BASE_URL = '/api/v1/reports';

export const reportsApi = {
  /**
   * Get dashboard overview metrics
   */
  async getDashboard(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<DashboardOverview> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get<DashboardOverview>(`${REPORTS_BASE_URL}/dashboard/?${params}`);
  },

  /**
   * Get financial overview
   */
  async getFinancialOverview(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<FinancialOverview> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get<FinancialOverview>(`${REPORTS_BASE_URL}/financial/?${params}`);
  },

  /**
   * Get financial trends
   */
  async getFinancialTrends(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<{ period: { start_date: string; end_date: string }; trends: Array<{ date: string; inflow: string; outflow: string }> }> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get(`${REPORTS_BASE_URL}/financial/trends/?${params}`);
  },

  /**
   * Get expense analytics
   */
  async getExpenseAnalytics(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<ExpenseAnalytics> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.category) params.append('category', filters.category);

    return api.get<ExpenseAnalytics>(`${REPORTS_BASE_URL}/expenses/?${params}`);
  },

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<{ period: { start_date: string; end_date: string }; by_category: Array<{ category: string; total: string; count: number; avg_amount: string }> }> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get(`${REPORTS_BASE_URL}/expenses/by-category/?${params}`);
  },

  /**
   * Get expenses by department
   */
  async getExpensesByDepartment(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<{ departments: DepartmentBreakdown[] }> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get(`${REPORTS_BASE_URL}/expenses/by-department/?${params}`);
  },

  /**
   * Get transaction report
   */
  async getTransactionReport(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<TransactionReport> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.transaction_type) params.append('type', filters.transaction_type);
    if (filters?.wallet_id) params.append('wallet_id', filters.wallet_id);

    return api.get<TransactionReport>(`${REPORTS_BASE_URL}/transactions/?${params}`);
  },

  /**
   * Get cash flow data
   */
  async getCashFlow(
    organizationId: string,
    filters?: ReportFilters
  ): Promise<{ period: { start_date: string; end_date: string }; cash_flow: Array<{ date: string; deposits: string; withdrawals: string; transfers_in: string; transfers_out: string }> }> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    return api.get(`${REPORTS_BASE_URL}/transactions/cash-flow/?${params}`);
  },

  // AI Endpoints

  /**
   * Get AI-generated insights
   */
  async getAIInsights(organizationId: string): Promise<AIInsightsResponse> {
    return api.get<AIInsightsResponse>(
      `${REPORTS_BASE_URL}/ai/insights/?organization_id=${organizationId}`
    );
  },

  /**
   * Process natural language query
   */
  async processNLQuery(request: NLQueryRequest): Promise<NLQueryResponse> {
    return api.post<NLQueryResponse>(`${REPORTS_BASE_URL}/ai/query/`, request);
  },

  /**
   * Get spending predictions
   */
  async getPredictions(organizationId: string): Promise<PredictionResponse> {
    return api.get<PredictionResponse>(
      `${REPORTS_BASE_URL}/ai/predictions/?organization_id=${organizationId}`
    );
  },

  /**
   * Dismiss an AI insight
   */
  async dismissInsight(
    organizationId: string,
    insightId: string
  ): Promise<{ status: string }> {
    return api.post(`${REPORTS_BASE_URL}/ai/insights/dismiss/`, {
      organization_id: organizationId,
      insight_id: insightId,
    });
  },

  // Export Endpoints

  /**
   * Export report to specified format
   * Returns a blob URL for download
   */
  async exportReport(request: ExportRequest): Promise<Blob> {
    const response = await fetch(`${REPORTS_BASE_URL}/export/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth headers from the api module
      },
      body: JSON.stringify(request),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },

  // Saved Reports

  /**
   * Get saved reports for organization
   */
  async getSavedReports(organizationId: string): Promise<SavedReport[]> {
    return api.get<SavedReport[]>(
      `${REPORTS_BASE_URL}/saved/?organization_id=${organizationId}`
    );
  },

  /**
   * Save a new report configuration
   */
  async saveReport(request: SaveReportRequest): Promise<SavedReport> {
    return api.post<SavedReport>(`${REPORTS_BASE_URL}/saved/`, request);
  },

  /**
   * Delete a saved report
   */
  async deleteSavedReport(reportId: string): Promise<void> {
    await api.del(`${REPORTS_BASE_URL}/saved/${reportId}/`);
  },
};
