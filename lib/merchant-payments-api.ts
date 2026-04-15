/**
 * Merchant Payments API client.
 *
 * Adapter for the unified PSP endpoints (org-scoped) so the ERP portal
 * can list payins, payouts, and balances across all merchants the user
 * has access to.
 */

import { get } from './api';
import type {
  MerchantBalance,
  PaginatedPayins,
  PaginatedPayouts,
  PayinFilters,
  PayoutFilters,
} from '@/types/merchant-payment';

function buildQuery(filters?: Record<string, unknown> | object): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    params.append(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const merchantPaymentsApi = {
  listPayins: (filters?: PayinFilters): Promise<PaginatedPayins> =>
    get<PaginatedPayins>(`/api/v1/payments/payins/${buildQuery(filters)}`),

  listPayouts: (filters?: PayoutFilters): Promise<PaginatedPayouts> =>
    get<PaginatedPayouts>(`/api/v1/payments/payouts/${buildQuery(filters)}`),

  listBalances: (organizationId?: string): Promise<MerchantBalance[]> =>
    get<MerchantBalance[]>(
      `/api/v1/payments/balances/${buildQuery({ organization_id: organizationId })}`,
    ),
};

export default merchantPaymentsApi;
