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
    <div className="space-y-4">
      {/* Amount Display */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
        <p className="text-4xl font-bold text-gray-900">
          {formatCurrency(amount, session.currency)}
        </p>
      </div>

      {/* Order Details */}
      {session.description && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">{session.description}</p>
        </div>
      )}

      {/* Reference */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Reference</span>
        <span className="font-mono text-gray-900">{session.reference}</span>
      </div>
    </div>
  );
}
