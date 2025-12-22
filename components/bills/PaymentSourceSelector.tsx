'use client';

import { Building2, Smartphone, CheckCircle2, ChevronRight } from 'lucide-react';
import type { PaymentSource } from '@/types/payment-sources';

interface PaymentSourceSelectorProps {
  sources: PaymentSource[];
  selectedSource: PaymentSource | null;
  onSelect: (source: PaymentSource) => void;
  billCurrency?: string;
  billAmount?: number;
}

export default function PaymentSourceSelector({
  sources,
  selectedSource,
  onSelect,
  billCurrency,
  billAmount
}: PaymentSourceSelectorProps) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return Smartphone;
      case 'bank_account':
        return Building2;
      default:
        return Building2;
    }
  };

  const getGradient = (type: string, isSelected: boolean) => {
    if (isSelected) {
      switch (type) {
        case 'mobile_money':
          return 'from-[#638C80] to-[#4f7068]';
        case 'bank_account':
          return 'from-blue-600 to-blue-700';
        default:
          return 'from-gray-600 to-gray-700';
      }
    }
    return 'from-white to-white';
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'border-[#638C80]/30 hover:border-[#638C80]';
      case 'bank_account':
        return 'border-blue-200 hover:border-blue-500';
      default:
        return 'border-gray-200 hover:border-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank_account':
        return 'Bank Account';
      default:
        return 'Payment Source';
    }
  };

  // Don't filter by currency - show all sources and use currency conversion
  const filteredSources = sources;

  if (filteredSources.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Smartphone className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Sources Available</h3>
        <p className="text-gray-500">
          Please add mobile money accounts or bank accounts in the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredSources.map((source) => {
        // Compare by both type and ID since different types can have same ID
        const isSelected = selectedSource !== null && 
          source.type === selectedSource.type && 
          String(source.id) === String(selectedSource.id);
        const Icon = getIcon(source.type);
        const hasBalance = parseFloat(source.balance) > 0;
        const needsConversion = billCurrency && source.currency !== billCurrency;
        
        return (
          <button
            key={`${source.type}-${source.id}`}
            onClick={() => onSelect(source)}
            className={`
              relative w-full text-left rounded-xl border-2 transition-all duration-200
              ${isSelected 
                ? `bg-gradient-to-br ${getGradient(source.type, true)} border-transparent shadow-lg scale-[1.02]` 
                : `bg-white ${getBorderColor(source.type)} hover:shadow-md`
              }
            `}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                  ${isSelected 
                    ? 'bg-white/20 backdrop-blur-sm' 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100'
                  }
                `}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className={`text-base font-semibold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {source.name}
                      </h4>
                      <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {getTypeLabel(source.type)}
                      </p>
                    </div>
                    
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="flex-shrink-0 ml-3">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-[#638C80]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account details */}
                  <div className={`space-y-1 text-sm ${isSelected ? 'text-white/90' : 'text-gray-600'}`}>
                    {source.type === 'mobile_money' && (
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{source.provider_name} • {source.phone_number}</span>
                      </div>
                    )}
                    {source.type === 'bank_account' && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{source.bank_name} • {source.account_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Balance Info */}
                  <div className="mt-3 pt-3 border-t border-gray-200/20">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        Available Balance
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {source.currency} {parseFloat(source.balance).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                        {source.is_default && (
                          <span className={`
                            text-[10px] font-semibold px-2 py-0.5 rounded-full
                            ${isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                            }
                          `}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Currency conversion note */}
                  {needsConversion && billAmount && (
                    <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 font-medium">
                        💱 Currency conversion: {billCurrency} {billAmount.toLocaleString()} → {source.currency}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Conversion rate will be applied at payment time
                      </p>
                    </div>
                  )}

                  {/* Insufficient balance warning */}
                  {!hasBalance && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800 font-medium">
                        ⚠️ Insufficient balance. Please top up this account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subtle arrow indicator on hover */}
            {!isSelected && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
