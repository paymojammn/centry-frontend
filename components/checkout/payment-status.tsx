'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';

type StatusType = 'processing' | 'success' | 'failed' | 'pending';

interface PaymentStatusProps {
  status: StatusType;
  message?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
  canRetry?: boolean;
}

const STATUS_CONFIG: Record<
  StatusType,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    iconBgColor: string;
  }
> = {
  processing: {
    icon: <Loader2 className="size-8 animate-spin text-primary" />,
    title: 'Processing payment',
    description: 'Please wait while we process your payment...',
    iconBgColor: 'bg-primary/10',
  },
  pending: {
    icon: <Clock className="size-8 text-amber-500" />,
    title: 'Awaiting confirmation',
    description: 'Please complete the payment on your device',
    iconBgColor: 'bg-amber-50',
  },
  success: {
    icon: <CheckCircle2 className="size-8 text-green-600" />,
    title: 'Payment successful',
    description: 'Your payment has been processed successfully',
    iconBgColor: 'bg-green-50',
  },
  failed: {
    icon: <XCircle className="size-8 text-destructive" />,
    title: 'Payment failed',
    description: 'We could not process your payment',
    iconBgColor: 'bg-destructive/10',
  },
};

export function PaymentStatus({
  status,
  message,
  onRetry,
  onCancel,
  canRetry = true,
}: PaymentStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="text-center py-8 space-y-6">
      {/* Status Icon */}
      <div className="flex justify-center">
        <div
          className={cn(
            'size-20 rounded-full flex items-center justify-center',
            config.iconBgColor
          )}
        >
          {config.icon}
        </div>
      </div>

      {/* Status Text */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
        <p className="text-sm text-gray-500">{message || config.description}</p>
      </div>

      {/* Actions */}
      {status === 'failed' && canRetry && (
        <div className="flex flex-col gap-3 pt-4">
          {onRetry && (
            <Button onClick={onRetry} className="w-full" size="lg">
              <RefreshCw className="size-4 mr-2" />
              Try again
            </Button>
          )}
          {onCancel && (
            <Button onClick={onCancel} variant="outline" className="w-full" size="lg">
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Processing indicator for mobile money */}
      {(status === 'processing' || status === 'pending') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-center gap-2">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <div className="size-2 rounded-full bg-primary animate-pulse delay-100" />
            <div className="size-2 rounded-full bg-primary animate-pulse delay-200" />
          </div>
          <p className="text-xs text-gray-400">Do not close this page</p>
        </div>
      )}
    </div>
  );
}
