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
        <p className="text-sm text-muted-foreground mb-1">Amount to pay</p>
        <p className="text-4xl font-bold text-foreground">
          {formatCurrency(amount, session.currency)}
        </p>
      </div>

      {/* Order Details */}
      {session.description && (
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{session.description}</p>
        </div>
      )}

      {/* Reference */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Reference</span>
        <span className="font-mono text-foreground">{session.reference}</span>
      </div>
    </div>
  );
}
