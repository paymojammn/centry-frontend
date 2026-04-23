/**
 * Wallet API Client
 *
 * Handles all wallet-related API requests
 */

import api from './api';
import type {
  Wallet,
  WalletBalance,
  WalletTransaction,
  LoadWalletRequest,
  LoadWalletResponse,
  SavedPaymentMethod,
  SavePaymentMethodRequest,
  DepartmentWallet,
  DepartmentWalletTransaction,
  LinkedAccountsResponse,
  TransferRequest,
  TransferResponse,
  FeePreview,
  PendingApproval,
} from '@/types/wallet';

const WALLET_BASE_URL = '/api/v1/wallet';

export const walletApi = {
  /**
   * Get all wallets for authenticated user
   */
  async getWallets(): Promise<Wallet[]> {
    const response = await api.get<Wallet[]>(`${WALLET_BASE_URL}/`);
    return response;
  },

  /**
   * Get wallet balance for specific currency
   */
  async getBalance(currency: string = 'UGX'): Promise<WalletBalance> {
    const response = await api.get<WalletBalance>(
      `${WALLET_BASE_URL}/balance/?currency=${currency}`
    );
    return response;
  },

  /**
   * Get wallet transactions
   */
  async getTransactions(
    currency: string = 'UGX',
    limit: number = 50
  ): Promise<WalletTransaction[]> {
    const response = await api.get<WalletTransaction[]>(
      `${WALLET_BASE_URL}/transactions/?currency=${currency}&limit=${limit}`
    );
    return response;
  },

  /**
   * Load money into wallet
   */
  async loadWallet(request: LoadWalletRequest): Promise<LoadWalletResponse> {
    const response = await api.post<LoadWalletResponse>(
      `${WALLET_BASE_URL}/load/`,
      request
    );
    return response;
  },

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(): Promise<SavedPaymentMethod[]> {
    const response = await api.get<SavedPaymentMethod[]>(
      `${WALLET_BASE_URL}/payment_methods/`
    );
    return response;
  },

  /**
   * Save a new payment method
   */
  async savePaymentMethod(request: SavePaymentMethodRequest): Promise<SavedPaymentMethod> {
    const response = await api.post<SavedPaymentMethod>(
      `${WALLET_BASE_URL}/save_payment_method/`,
      request
    );
    return response;
  },

  /**
   * Update an existing payment method
   */
  async updatePaymentMethod(methodId: string, request: SavePaymentMethodRequest): Promise<SavedPaymentMethod> {
    const response = await api.put<SavedPaymentMethod>(
      `${WALLET_BASE_URL}/payment_methods/${methodId}/`,
      request
    );
    return response;
  },

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethod(methodId: string): Promise<void> {
    await api.del(`${WALLET_BASE_URL}/payment_methods/${methodId}/delete/`);
  },

  // ============ Department Wallet API ============

  /**
   * Get unique department names from existing wallets for an organization
   * Used to populate dropdown when creating new wallets
   */
  async getDepartmentNames(organizationId: string): Promise<{ department_names: string[] }> {
    const response = await api.get<{ department_names: string[] }>(
      `${WALLET_BASE_URL}/departments/department_names/?organization_id=${organizationId}`
    );
    return response;
  },

  /**
   * Get all department wallets for an organization
   */
  async getDepartmentWallets(organizationId: string): Promise<DepartmentWallet[]> {
    const response = await api.get<DepartmentWallet[]>(
      `${WALLET_BASE_URL}/departments/?organization_id=${organizationId}`
    );
    return response;
  },

  /**
   * Get department wallet balance
   */
  async getDepartmentWalletBalance(walletId: string): Promise<{
    wallet_id: string;
    name: string;
    currency: string;
    balance: string;
    monthly_budget: string | null;
    transaction_limit: string | null;
    status: string;
  }> {
    const response = await api.get(`${WALLET_BASE_URL}/departments/${walletId}/balance/`);
    return response;
  },

  /**
   * Get department wallet transactions
   */
  async getDepartmentWalletTransactions(
    walletId: string,
    limit: number = 50
  ): Promise<DepartmentWalletTransaction[]> {
    const response = await api.get<DepartmentWalletTransaction[]>(
      `${WALLET_BASE_URL}/departments/${walletId}/transactions/?limit=${limit}`
    );
    return response;
  },

  /**
   * Get linked accounts for a department wallet
   */
  async getLinkedAccounts(walletId: string): Promise<LinkedAccountsResponse> {
    const response = await api.get<LinkedAccountsResponse>(
      `${WALLET_BASE_URL}/departments/${walletId}/linked_accounts/`
    );
    return response;
  },

  /**
   * Link an account to department wallet
   */
  async linkAccount(
    walletId: string,
    accountType: 'mobile_money' | 'bank',
    accountId: string
  ): Promise<{ wallet_id: string; linked_accounts: LinkedAccountsResponse['current_linked_accounts']; message: string }> {
    const response = await api.post(
      `${WALLET_BASE_URL}/departments/${walletId}/link_account/`,
      { account_type: accountType, account_id: accountId }
    );
    return response;
  },

  /**
   * Unlink an account from department wallet
   */
  async unlinkAccount(
    walletId: string,
    accountType: 'mobile_money' | 'bank'
  ): Promise<{ wallet_id: string; linked_accounts: LinkedAccountsResponse['current_linked_accounts']; message: string }> {
    const response = await api.post(
      `${WALLET_BASE_URL}/departments/${walletId}/unlink_account/`,
      { account_type: accountType }
    );
    return response;
  },

  /**
   * Preview transfer fees
   */
  async previewFee(walletId: string, amount: string): Promise<FeePreview> {
    const response = await api.get<FeePreview>(
      `${WALLET_BASE_URL}/departments/${walletId}/fee_preview/?amount=${amount}`
    );
    return response;
  },

  /**
   * Make a transfer from department wallet
   */
  async transfer(walletId: string, request: TransferRequest): Promise<TransferResponse> {
    const response = await api.post<TransferResponse>(
      `${WALLET_BASE_URL}/departments/${walletId}/transfer/`,
      request
    );
    return response;
  },

  /**
   * Get pending approvals for a department wallet
   */
  async getPendingApprovals(walletId: string): Promise<PendingApproval[]> {
    const response = await api.get<PendingApproval[]>(
      `${WALLET_BASE_URL}/departments/${walletId}/pending_approvals/`
    );
    return response;
  },

  /**
   * Approve a pending transaction
   */
  async approveTransaction(
    walletId: string,
    transactionId: string,
    note?: string
  ): Promise<{
    transaction_id: string;
    wallet_id: string;
    amount: string;
    new_balance: string;
    status: string;
    approved_by: string;
    approved_at: string;
  }> {
    const response = await api.post(
      `${WALLET_BASE_URL}/departments/${walletId}/approve/${transactionId}/`,
      note ? { note } : {}
    );
    return response;
  },

  /**
   * Reject a pending transaction
   */
  async rejectTransaction(
    walletId: string,
    transactionId: string,
    reason: string
  ): Promise<{
    transaction_id: string;
    wallet_id: string;
    status: string;
    reason: string;
    rejected_by: string;
  }> {
    const response = await api.post(
      `${WALLET_BASE_URL}/departments/${walletId}/reject/${transactionId}/`,
      { reason }
    );
    return response;
  },

  /**
   * Get department wallet statistics
   */
  async getDepartmentWalletStatistics(
    walletId: string,
    period: number = 30
  ): Promise<Record<string, unknown>> {
    const response = await api.get(
      `${WALLET_BASE_URL}/departments/${walletId}/statistics/?period=${period}`
    );
    return response;
  },

  /**
   * Create a new department wallet
   */
  async createDepartmentWallet(data: {
    organization_id: string;
    name: string;
    wallet_type?: string;
    description?: string;
    currency?: string;
    monthly_budget?: string;
    initial_balance?: string;
    linked_provider_account_id?: string;
    linked_bank_account_id?: string;
    fee_percentage?: string;
    flat_fee?: string;
  }): Promise<DepartmentWallet & { initial_transaction_id?: string }> {
    const response = await api.post<DepartmentWallet>(
      `${WALLET_BASE_URL}/departments/`,
      data
    );
    return response;
  },

  /**
   * Get available accounts for an organization (for creating/linking wallets)
   */
  async getOrganizationAccounts(organizationId: string): Promise<{
    mobile_money_accounts: Array<{
      id: string;
      account_name: string;
      phone_number: string;
      provider: string | null;
      provider_name: string | null;
      balance: string;
      currency: string;
      is_default: boolean;
    }>;
    bank_accounts: Array<{
      id: string;
      account_name: string;
      account_number: string;
      bank_name: string | null;
      account_type: string;
      balance: string;
      currency: string;
      is_default: boolean;
    }>;
  }> {
    const response = await api.get(
      `/api/v1/erp/organizations/${organizationId}/accounts/`
    );
    return response;
  },
};
