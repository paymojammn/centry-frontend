'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, CreditCard, Smartphone, Building2, QrCode, Ticket } from 'lucide-react';
import { PaymentProvider, PaymentMethod } from '@/lib/checkout-api';

// Method icons based on code
function getMethodIcon(code: string) {
  switch (code) {
    case 'card':
    case 'credit_card':
      return <CreditCard className="size-[18px]" />;
    case 'momo':
    case 'mobile_money':
      return <Smartphone className="size-[18px]" />;
    case 'bank_transfer':
    case 'instant_eft':
    case 'eft':
      return <Building2 className="size-[18px]" />;
    case 'qr':
    case 'qr_code':
    case 'crypto_qr':
      return <QrCode className="size-[18px]" />;
    case 'ussd':
      return <span className="text-[11px] font-bold tracking-tight">*#</span>;
    case 'ott_voucher':
    case 'bluvoucher':
    case 'onevoucher':
      return <Ticket className="size-[18px]" />;
    default:
      return <CreditCard className="size-[18px]" />;
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
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[60px] rounded-xl bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-slate-400">
          No payment methods available for this country.
        </p>
      </div>
    );
  }

  // Flatten all methods across providers into a single list for cleaner display
  const allMethods = providers.flatMap((provider) =>
    provider.methods.map((method) => ({
      ...method,
      provider: provider.provider,
      providerName: provider.name,
      providerColor: provider.color,
    }))
  );

  return (
    <div className="space-y-2">
      {allMethods.map((method) => {
        const isSelected =
          selectedProvider === method.provider &&
          selectedMethod === method.code;

        return (
          <button
            key={`${method.provider}-${method.code}`}
            onClick={() => onSelect(method.provider, method.code)}
            className={cn(
              'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all duration-150',
              isSelected
                ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            )}
          >
            {/* Method Icon */}
            <div
              className={cn(
                'size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              {getMethodIcon(method.code)}
            </div>

            {/* Method Details */}
            <div className="flex-1 text-left min-w-0">
              <p
                className={cn(
                  'text-sm font-medium leading-tight',
                  isSelected ? 'text-primary' : 'text-slate-700'
                )}
              >
                {method.name}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">
                {method.description}
              </p>
            </div>

            {/* Provider badge */}
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full shrink-0 border border-slate-100">
              {method.providerName}
            </span>

            {/* Selection Indicator */}
            <div
              className={cn(
                'size-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                isSelected
                  ? 'border-primary bg-primary scale-100'
                  : 'border-slate-300 bg-white scale-90'
              )}
            >
              {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
