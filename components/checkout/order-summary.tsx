'use client';

import * as React from 'react';
import { formatCurrency } from '@/lib/utils';
import { CheckoutSession } from '@/lib/checkout-api';

interface OrderSummaryProps {
  session: CheckoutSession;
}

export function OrderSummary({ session }: OrderSummaryProps) {
  const amount = parseFloat(session.amount);

  return (
    <div className="space-y-3">
      {/* Amount Display */}
      <div className="text-center py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
          Amount due
        </p>
        <p className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {formatCurrency(amount, session.currency)}
        </p>
      </div>

      {/* Description + Reference */}
      <div className="bg-slate-50 rounded-xl p-3.5 space-y-2">
        {session.description && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">For</span>
            <span className="font-medium text-slate-700">{session.description}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Reference</span>
          <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
            {session.reference}
          </span>
        </div>
      </div>
    </div>
  );
}
