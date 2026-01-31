'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, CreditCard, Smartphone, Building2, QrCode } from 'lucide-react';
import { PaymentProvider, PaymentMethod } from '@/lib/checkout-api';

// Provider icons
const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  paystack: (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <path d="M4.5 12h15M4.5 6h15M4.5 18h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  netcash: (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 12h.01M10 12h.01" />
    </svg>
  ),
  mtn: (
    <div className="size-6 rounded-full bg-yellow-400 flex items-center justify-center">
      <span className="text-[10px] font-bold text-black">MTN</span>
    </div>
  ),
  airtel: (
    <div className="size-6 rounded-full bg-red-600 flex items-center justify-center">
      <span className="text-[8px] font-bold text-white">AIR</span>
    </div>
  ),
};

// Method icons based on code
function getMethodIcon(code: string) {
  switch (code) {
    case 'card':
    case 'credit_card':
      return <CreditCard className="size-5" />;
    case 'momo':
    case 'mobile_money':
      return <Smartphone className="size-5" />;
    case 'bank_transfer':
    case 'instant_eft':
      return <Building2 className="size-5" />;
    case 'qr':
    case 'qr_code':
      return <QrCode className="size-5" />;
    case 'ussd':
      return (
        <span className="text-xs font-bold tracking-tight">*#</span>
      );
    default:
      return <CreditCard className="size-5" />;
  }
}

interface PaymentMethodListProps {
  providers: PaymentProvider[];
  selectedProvider: string | null;
  selectedMethod: string | null;
  onSelect: (provider: string, method: string) => void;
  loading?: boolean;
}

export function PaymentMethodList({
  providers,
  selectedProvider,
  selectedMethod,
  onSelect,
  loading = false,
}: PaymentMethodListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          No payment methods available for this country.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <div key={provider.provider} className="space-y-2">
          {/* Provider Header */}
          <div className="flex items-center gap-2 px-1">
            <div style={{ color: provider.color }}>
              {PROVIDER_ICONS[provider.provider] || <CreditCard className="size-5" />}
            </div>
            <span className="text-sm font-medium text-gray-700">{provider.name}</span>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            {provider.methods.map((method) => {
              const isSelected =
                selectedProvider === provider.provider &&
                selectedMethod === method.code;

              return (
                <button
                  key={`${provider.provider}-${method.code}`}
                  onClick={() => onSelect(provider.provider, method.code)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-lg border transition-all',
                    'hover:border-gray-300 hover:bg-gray-50',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-gray-200 bg-white'
                  )}
                >
                  {/* Method Icon */}
                  <div
                    className={cn(
                      'size-10 rounded-full flex items-center justify-center',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {getMethodIcon(method.code)}
                  </div>

                  {/* Method Details */}
                  <div className="flex-1 text-left">
                    <p
                      className={cn(
                        'font-medium',
                        isSelected ? 'text-primary' : 'text-gray-900'
                      )}
                    >
                      {method.name}
                    </p>
                    <p className="text-sm text-gray-500">{method.description}</p>
                  </div>

                  {/* Selection Indicator */}
                  <div
                    className={cn(
                      'size-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 bg-white'
                    )}
                  >
                    {isSelected && <Check className="size-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
