/**
 * Lending API Client
 *
 * Loan book, schedules, repayments and disbursements mirrored from the
 * connected ERPNext (Frappe Lending) site, plus repay/disburse write-through.
 * All endpoints live under the erp_erpnext app (/api/v1/erpnext/).
 */

import { get, post } from './api';
import type {
  Loan,
  LoanDetail,
  LoanDisbursement,
  LoanDueRow,
  LoanFilters,
  LoanPushResult,
  LoanRepayment,
  LoanStats,
  RecordDisbursementPayload,
  RecordRepaymentPayload,
} from '@/types/lending';

const BASE = '/api/v1/erpnext';

/** DRF list endpoints are paginated globally — unwrap `{count, results}` or pass arrays through. */
function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export const lendingApi = {
  /** List loans (optionally filtered by ERPNext status / organization). */
  async getLoans(filters?: LoanFilters): Promise<Loan[]> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.organization) params.append('organization', filters.organization);
    const qs = params.toString();
    return unwrap(await get<Loan[] | { results: Loan[] }>(`${BASE}/loans/${qs ? `?${qs}` : ''}`));
  },

  /** Get one loan with schedule, repayments and disbursements. */
  async getLoan(loanId: string): Promise<LoanDetail> {
    return get(`${BASE}/loans/${loanId}/`);
  },

  /** Loan book stats for dashboard tiles. */
  async getStats(organizationId?: string): Promise<LoanStats> {
    const qs = organizationId ? `?organization=${organizationId}` : '';
    return get(`${BASE}/loans/stats/${qs}`);
  },

  /** Collection-run worklist: loans with unpaid installments due by `on`. */
  async getDue(on?: string, organizationId?: string): Promise<LoanDueRow[]> {
    const params = new URLSearchParams();
    if (on) params.append('on', on);
    if (organizationId) params.append('organization', organizationId);
    const qs = params.toString();
    return get(`${BASE}/loans/due/${qs ? `?${qs}` : ''}`);
  },

  /** Sync the loan book from the connected ERP (generic connections endpoint). */
  async syncLoans(
    connectionId: string
  ): Promise<{ status: string; synced_count: number; message: string }> {
    return post(`/api/v1/erp/connections/${connectionId}/sync_loans/`);
  },

  /** Record a repayment — posts a Loan Repayment doc to ERPNext. */
  async recordRepayment(loanId: string, payload: RecordRepaymentPayload): Promise<LoanPushResult> {
    return post(`${BASE}/loans/${loanId}/repay/`, payload);
  },

  /** Record a disbursement — posts a Loan Disbursement doc to ERPNext. */
  async recordDisbursement(
    loanId: string,
    payload: RecordDisbursementPayload
  ): Promise<LoanPushResult> {
    return post(`${BASE}/loans/${loanId}/disburse/`, payload);
  },

  /** Org-wide repayments ledger (optionally for one loan). */
  async getRepayments(loanId?: string): Promise<LoanRepayment[]> {
    return unwrap(
      await get<LoanRepayment[] | { results: LoanRepayment[] }>(
        `${BASE}/loan-repayments/${loanId ? `?loan=${loanId}` : ''}`
      )
    );
  },

  /** Org-wide disbursements ledger (optionally for one loan / organization). */
  async getDisbursements(loanId?: string, organizationId?: string): Promise<LoanDisbursement[]> {
    const params = new URLSearchParams();
    if (loanId) params.append('loan', loanId);
    if (organizationId) params.append('organization', organizationId);
    const qs = params.toString();
    return unwrap(
      await get<LoanDisbursement[] | { results: LoanDisbursement[] }>(
        `${BASE}/loan-disbursements/${qs ? `?${qs}` : ''}`
      )
    );
  },
};

export default lendingApi;
