/**
 * Payment Source Types
 * 
 * Types for payment sources (Mobile Money Accounts and Bank Accounts)
 */

export type PaymentSourceType = 'mobile_money' | 'bank_account';

export interface MobileMoneySource {
  id: string;
  type: 'mobile_money';
  name: string;
  provider: string;  // e.g., 'mtn', 'airtel'
  provider_name: string;  // e.g., 'MTN Uganda Sandbox'
  phone_number: string;
  currency: string;
  balance: string;
  is_default: boolean;
  environment: 'sandbox' | 'production';
}

export interface BankAccountSource {
  id: string;
  type: 'bank_account';
  name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  balance: string;
  is_default: boolean;
}

export type PaymentSource = MobileMoneySource | BankAccountSource;

export interface PaymentSourcesResponse {
  mobile_money_accounts: MobileMoneySource[];
  bank_accounts: BankAccountSource[];
  total_sources: number;
}
