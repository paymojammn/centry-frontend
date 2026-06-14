import api from './api';

const BASE_URL = '/api/v1/banking/provider-accounts';

export interface ProviderAccount {
  id: string;
  organization_id: string;
  organization_name: string;
  provider: string;
  provider_display: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  active_environment: 'sandbox' | 'production';
  is_live: boolean;
  capabilities: string[];
  country: string;
  timeout: number;
  fee_percentage: string;
  fee_fixed: string;
  balance: string;
  balance_currency: string;
  balance_synced_at: string | null;
  has_sandbox_credentials: boolean;
  has_production_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderAccountsResponse {
  results: ProviderAccount[];
  count: number;
}

export type ProviderAccountEditable = Partial<
  Pick<
    ProviderAccount,
    | 'is_active'
    | 'is_default'
    | 'name'
    | 'active_environment'
    | 'fee_percentage'
    | 'fee_fixed'
    | 'timeout'
    | 'balance'
    | 'balance_currency'
  >
>;

export const providerAccountsApi = {
  async list(organizationId?: string): Promise<ProviderAccountsResponse> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organization', organizationId);
    const qs = params.toString();
    return api.get<ProviderAccountsResponse>(`${BASE_URL}/${qs ? `?${qs}` : ''}`);
  },

  async update(id: string, patch: ProviderAccountEditable): Promise<ProviderAccount> {
    return api.patch<ProviderAccount>(`${BASE_URL}/${id}/`, patch);
  },

  // Pull the live balance from the provider's API into the account.
  async syncBalance(
    accountId: string,
  ): Promise<{ success: boolean; balance?: string; currency?: string; error?: string }> {
    return api.post('/api/v1/banking/sync-balance/', { account_id: accountId });
  },
};
