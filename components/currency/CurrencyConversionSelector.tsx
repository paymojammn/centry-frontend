/**
 * Currency Conversion Selector Component
 * Shows real-time exchange rates and conversion details
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, Info } from 'lucide-react';
import {
  useExchangeRate,
  useSupportedCurrencies,
  calculateConversion,
  formatCurrencyAmount,
  isSameCurrency,
} from '@/hooks/use-currency-conversion';

interface CurrencyConversionSelectorProps {
  fromCurrency: string;
  toCurrency: string;
  amount: string | number;
  onCurrencyChange?: (currency: string) => void;
  onConversionChange?: (data: {
    originalCurrency: string;
    targetCurrency: string;
    originalAmount: number;
    convertedAmount: number;
    rate: number;
  }) => void;
  showSelector?: boolean;
  margin?: number;
}

export function CurrencyConversionSelector({
  fromCurrency,
  toCurrency,
  amount,
  onCurrencyChange,
  onConversionChange,
  showSelector = true,
  margin = 0,
}: CurrencyConversionSelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(toCurrency);
  const [forceRefresh, setForceRefresh] = useState(false);

  const needsConversion = !isSameCurrency(fromCurrency, selectedCurrency);

  const { data: rate, isLoading, error, refetch } = useExchangeRate(
    fromCurrency,
    selectedCurrency,
    {
      enabled: needsConversion,
      forceRefresh,
    }
  );

  const { data: currencies } = useSupportedCurrencies();

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const convertedAmount = rate && needsConversion
    ? calculateConversion(numAmount, parseFloat(rate.rate), margin)
    : numAmount;

  useEffect(() => {
    if (rate && needsConversion && onConversionChange) {
      onConversionChange({
        originalCurrency: fromCurrency,
        targetCurrency: selectedCurrency,
        originalAmount: numAmount,
        convertedAmount: convertedAmount,
        rate: parseFloat(rate.rate),
      });
    }
  }, [rate, needsConversion, fromCurrency, selectedCurrency, numAmount, convertedAmount, onConversionChange]);

  const handleRefresh = async () => {
    setForceRefresh(true);
    await refetch();
    setForceRefresh(false);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    }
  };

  if (!needsConversion) {
    return (
      <div className="text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-[#638C80]">✓</span>
          <span>Payment currency matches bill currency ({fromCurrency})</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
      {/* Currency Selector */}
      {showSelector && currencies && currencies.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Currency
          </label>
          <select
            value={selectedCurrency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
          >
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name} ({currency.symbol})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Conversion Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Currency Conversion</span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-[#638C80] hover:text-[#4f7068] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading && (
          <div className="text-sm text-gray-500">Loading exchange rate...</div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Unable to fetch exchange rate. Please try again.</span>
            </div>
          </div>
        )}

        {rate && !isLoading && !error && (
          <>
            {/* Conversion Details */}
            <div className="bg-white p-3 rounded border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-black">
                    {formatCurrencyAmount(numAmount, fromCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">{fromCurrency}</div>
                </div>

                <ArrowRight className="h-5 w-5 text-[#638C80] mx-3" />

                <div className="text-center flex-1">
                  <div className="text-lg font-bold text-[#638C80]">
                    {formatCurrencyAmount(convertedAmount, selectedCurrency)}
                  </div>
                  <div className="text-xs text-gray-500">{selectedCurrency}</div>
                </div>
              </div>

              {/* Exchange Rate Info */}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Exchange Rate:</span>
                  <span className="font-medium">
                    1 {fromCurrency} = {parseFloat(rate.rate).toFixed(4)} {selectedCurrency}
                  </span>
                </div>
                {margin > 0 && (
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Margin:</span>
                    <span className="font-medium">{(margin * 100).toFixed(2)}%</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Provider:</span>
                  <span>{rate.provider_name}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Updated:</span>
                  <span>{new Date(rate.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <div className="flex items-start gap-2 text-xs text-blue-800">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Exchange rates are updated in real-time. The final amount charged may vary slightly depending on your payment provider.
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
