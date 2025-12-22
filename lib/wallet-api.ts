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
  SavePaymentMethodRequest
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
};
