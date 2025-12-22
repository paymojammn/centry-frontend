/**
 * Currency Conversion Hook
 * Handles exchange rates and currency conversions with multiple provider support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ExchangeRate,
  ConvertAmountRequest,
  ConvertAmountResponse,
  ExchangeRateRequest,
  SupportedCurrency,
  ConversionTransaction
} from '@/types/currency';

const CURRENCY_API_BASE = '/api/payments/currency';

// ============================================================================
// API Functions
// ============================================================================

async function getExchangeRate(request: ExchangeRateRequest): Promise<ExchangeRate> {
  const response = await api.post(
    `${CURRENCY_API_BASE}/conversion/get_rate/`,
    request
  );
  return response.data;
}

async function convertAmount(request: ConvertAmountRequest): Promise<ConvertAmountResponse> {
  const response = await api.post(
    `${CURRENCY_API_BASE}/conversion/convert/`,
    request
  );
  return response.data;
}

async function getSupportedCurrencies(): Promise<SupportedCurrency[]> {
  const response = await api.get(
    `${CURRENCY_API_BASE}/conversion/supported_currencies/`
  );
  return response.data;
}

async function getConversionHistory(organizationId: number): Promise<ConversionTransaction[]> {
  const response = await api.get(
    `${CURRENCY_API_BASE}/conversion/history/`,
    {
      params: { organization_id: organizationId }
    }
  );
  return response.data;
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Get exchange rate between two currencies
 */
export function useExchangeRate(
  fromCurrency: string | undefined,
  toCurrency: string | undefined,
  options?: {
    forceRefresh?: boolean;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ['exchangeRate', fromCurrency, toCurrency, options?.forceRefresh],
    queryFn: () => {
      if (!fromCurrency || !toCurrency) {
        throw new Error('Both currencies are required');
      }
      return getExchangeRate({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        force_refresh: options?.forceRefresh
      });
    },
    enabled: Boolean(fromCurrency && toCurrency && (options?.enabled !== false)),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
}

/**
 * Convert amount from one currency to another
 */
export function useConvertAmount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: convertAmount,
    onSuccess: (data, variables) => {
      // Update the exchange rate cache
      queryClient.setQueryData(
        ['exchangeRate', variables.from_currency, variables.to_currency, false],
        {
          from_currency: variables.from_currency,
          to_currency: variables.to_currency,
          rate: data.rate,
          provider_name: data.provider,
          timestamp: data.rate_timestamp
        }
      );
    },
  });
}

/**
 * Get list of supported currencies
 */
export function useSupportedCurrencies() {
  return useQuery({
    queryKey: ['supportedCurrencies'],
    queryFn: getSupportedCurrencies,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Get conversion transaction history
 */
export function useConversionHistory(
  organizationId: number | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['conversionHistory', organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      return getConversionHistory(organizationId);
    },
    enabled: Boolean(organizationId && (options?.enabled !== false)),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency amount with proper symbol and locale
 */
export function formatCurrencyAmount(
  amount: string | number,
  currency: string,
  locale: string = 'en-US'
): string {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Calculate converted amount client-side (for instant feedback)
 */
export function calculateConversion(
  amount: number,
  rate: number,
  margin: number = 0
): number {
  const rateWithMargin = rate * (1 + margin);
  return amount * rateWithMargin;
}

/**
 * Check if two currencies are the same
 */
export function isSameCurrency(currency1: string, currency2: string): boolean {
  return currency1.toUpperCase() === currency2.toUpperCase();
}

/**
 * Get currency symbol from code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    UGX: 'UGX',
    KES: 'KSh',
    TZS: 'TSh',
    RWF: 'RWF',
    ZAR: 'R',
  };
  return symbols[currencyCode.toUpperCase()] || currencyCode;
}
