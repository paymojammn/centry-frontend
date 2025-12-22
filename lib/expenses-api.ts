/**
 * Expenses API Client
 *
 * Handles all expense/petty cash related API requests
 */

import api from './api';
import type {
  Expense,
  ExpenseStats,
  ExpenseFilters,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ApproveExpenseRequest,
  PayExpenseRequest,
  PayExpenseResponse,
} from '@/types/expense';

const EXPENSES_BASE_URL = '/api/v1/expenses';

export const expensesApi = {
  /**
   * Get all expenses with filters
   */
  async getExpenses(filters?: ExpenseFilters): Promise<{ results: Expense[]; count: number }> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.payment_status && filters.payment_status !== 'all')
      params.append('payment_status', filters.payment_status);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.organization) params.append('organization', filters.organization);
    if (filters?.employee) params.append('employee', filters.employee);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const queryString = params.toString();
    const url = queryString ? `${EXPENSES_BASE_URL}/?${queryString}` : `${EXPENSES_BASE_URL}/`;

    const response = await api.get<{ results: Expense[]; count: number }>(url);
    return response;
  },

  /**
   * Get expense statistics
   */
  async getExpenseStats(organizationId?: string): Promise<ExpenseStats> {
    const params = organizationId ? `?organization=${organizationId}` : '';
    const response = await api.get<ExpenseStats>(`${EXPENSES_BASE_URL}/stats/${params}`);
    return response;
  },

  /**
   * Get a single expense by ID
   */
  async getExpense(expenseId: string): Promise<Expense> {
    const response = await api.get<Expense>(`${EXPENSES_BASE_URL}/${expenseId}/`);
    return response;
  },

  /**
   * Create a new expense
   */
  async createExpense(request: CreateExpenseRequest): Promise<Expense> {
    const formData = new FormData();
    formData.append('organization_id', request.organization_id);
    formData.append('type', request.type);
    formData.append('category', request.category);
    formData.append('amount', request.amount);
    formData.append('currency', request.currency);
    formData.append('description', request.description);
    formData.append('date', request.date);

    // Add workflow-specific fields
    if (request.phone_number) {
      formData.append('phone_number', request.phone_number);
    }
    if (request.payment_method) {
      formData.append('payment_method', request.payment_method);
    }
    if (request.advance_request_id) {
      formData.append('advance_request_id', request.advance_request_id);
    }

    // Add receipt files
    if (request.receipt_files) {
      request.receipt_files.forEach((file, index) => {
        formData.append(`receipt_${index}`, file);
      });
    }

    // Don't set Content-Type header manually - browser will set it with boundary
    const response = await api.post<Expense>(`${EXPENSES_BASE_URL}/`, formData);
    return response;
  },

  /**
   * Update an expense
   */
  async updateExpense(expenseId: string, request: UpdateExpenseRequest): Promise<Expense> {
    const response = await api.put<Expense>(`${EXPENSES_BASE_URL}/${expenseId}/`, request);
    return response;
  },

  /**
   * Delete an expense
   */
  async deleteExpense(expenseId: string): Promise<void> {
    await api.del(`${EXPENSES_BASE_URL}/${expenseId}/`);
  },

  /**
   * Submit expense for approval
   */
  async submitExpense(expenseId: string): Promise<Expense> {
    const response = await api.post<Expense>(`${EXPENSES_BASE_URL}/${expenseId}/submit/`, {});
    return response;
  },

  /**
   * Approve or reject an expense (dual approval workflow)
   */
  async approveExpense(request: ApproveExpenseRequest): Promise<Expense> {
    const response = await api.post<Expense>(
      `${EXPENSES_BASE_URL}/${request.expense_id}/approve/`,
      {
        approved: request.approved,
        rejection_reason: request.rejection_reason,
        approval_level: request.approval_level || 'manager',
      }
    );
    return response;
  },

  /**
   * Pay approved expenses
   */
  async payExpenses(request: PayExpenseRequest): Promise<PayExpenseResponse> {
    const response = await api.post<PayExpenseResponse>(`${EXPENSES_BASE_URL}/pay/`, request);
    return response;
  },

  /**
   * Get payment methods for expenses
   */
  async getPaymentProviders(): Promise<any> {
    const response = await api.get(`${EXPENSES_BASE_URL}/payment_providers/`);
    return response;
  },
};
