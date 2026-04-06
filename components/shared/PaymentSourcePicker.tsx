'use client';

import type { PaymentSource } from '@/types/payment-sources';
import {
  Smartphone,
  Phone,
  Building2,
  CreditCard,
  Globe,
  Wallet,
} from 'lucide-react';

const PROVIDER_ICONS: Record<string, typeof Smartphone> = {
  mtn: Smartphone,
  airtel: Phone,
  ozow: CreditCard,
  paystack: Globe,
  netcash: CreditCard,
};

const PROVIDER_COLORS: Record<string, string> = {
  mtn: '#FFCC00',
  airtel: '#ED1C24',
  ozow: '#00A8E8',
  paystack: '#00C3F7',
  netcash: '#00A651',
};

interface PaymentSourcePickerProps {
  sources: PaymentSource[];
  mode: 'collection' | 'disbursement';
  onSelect: (source: PaymentSource) => void;
  selectedId?: string;
  emptyMessage?: string;
}

/**
 * Shared payment source picker used across:
 * - Invoice collection (payins)
 * - Bill payments (payouts)
 * - Subscription checkout
 *
 * Filters sources by capability (collection vs disbursement).
 */
export default function PaymentSourcePicker({
  sources,
  mode,
  onSelect,
  selectedId,
  emptyMessage = 'No payment methods available. Link a provider account to your organization.',
}: PaymentSourcePickerProps) {
  const filtered = sources.filter((s) =>
    mode === 'collection' ? s.supports_collection : s.supports_disbursement
  );

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((source) => {
        const Icon = source.type === 'bank_account'
          ? Building2
          : PROVIDER_ICONS[source.provider] || Wallet;
        const isSelected = selectedId === source.id;
        const color = PROVIDER_COLORS[source.provider];

        return (
          <button
            key={source.id}
            onClick={() => onSelect(source)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-dark))] bg-muted/30'
                : 'border-border hover:border-[rgb(var(--brand-dark))]/40 hover:shadow-sm'
            }`}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: color ? `${color}15` : undefined }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: color || 'var(--foreground)' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{source.name}</p>
              <p className="text-xs text-muted-foreground">
                {source.type === 'mobile_money' && source.phone_number
                  ? source.phone_number
                  : source.type === 'bank_account' && source.account_number
                    ? `${source.bank_name || ''} ••${source.account_number.slice(-4)}`
                    : source.provider_name || source.provider}
              </p>
            </div>
            <div className="text-right shrink-0">
              {source.balance && parseFloat(source.balance) > 0 ? (
                <p className="text-xs font-medium text-foreground">
                  {source.currency} {parseFloat(source.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              ) : (
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {source.region || source.currency}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
