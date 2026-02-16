'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValrPaymentProps {
  qrCodeUrl: string;
  paymentLink: string;
  webLink?: string;
  expiresAt: string;
  amount: string;
  currency: string;
  receiveCurrency: string;
  onExpired?: () => void;
  status?: 'pending' | 'processing' | 'completed';
}

export function ValrPayment({
  qrCodeUrl,
  paymentLink,
  webLink,
  expiresAt,
  amount,
  currency,
  receiveCurrency,
  onExpired,
  status = 'pending',
}: ValrPaymentProps) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [expired, setExpired] = React.useState(false);

  // Calculate and update countdown
  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      return diff;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setExpired(true);
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle open VALR app
  const handleOpenApp = () => {
    if (paymentLink) {
      window.location.href = paymentLink;
    }
  };

  // Handle open web payment
  const handleOpenWeb = () => {
    if (webLink) {
      window.open(webLink, '_blank');
    }
  };

  if (status === 'completed') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="size-20 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-10 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Payment received</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your {receiveCurrency} payment has been confirmed
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="size-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
          <Clock className="size-10 text-amber-500" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Payment expired</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This QR code has expired. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00D4AA]/10 rounded-full mb-3">
          <div className="size-2 rounded-full bg-[#00D4AA] animate-pulse" />
          <span className="text-sm font-medium text-[#00D4AA]">
            Pay with {receiveCurrency}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Scan QR code to pay
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Open your VALR app and scan this code
        </p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center">
        <div className="relative p-4 bg-card rounded-xl border-2 border-border shadow-sm">
          {qrCodeUrl ? (
            <Image
              src={qrCodeUrl}
              alt="VALR Payment QR Code"
              width={200}
              height={200}
              className="rounded-lg"
              priority
            />
          ) : (
            <div className="size-[200px] flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
            </div>
          )}
          {status === 'processing' && (
            <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="size-8 animate-spin text-[#00D4AA] mx-auto" />
                <p className="text-sm font-medium text-foreground">Confirming...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-muted rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-medium text-foreground">
            {amount} {currency}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pay with</span>
          <span className="font-medium text-foreground">{receiveCurrency}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Expires in</span>
          <span
            className={cn(
              'font-mono font-medium',
              timeLeft <= 60 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleOpenApp}
          size="lg"
          className="w-full bg-[#00D4AA] hover:bg-[#00B894] text-white"
        >
          <ExternalLink className="size-4 mr-2" />
          Open VALR App
        </Button>
        {webLink && (
          <Button
            onClick={handleOpenWeb}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Pay on Web
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground/60 text-center">
          Don&apos;t have VALR?{' '}
          <a
            href="https://www.valr.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D4AA] hover:underline"
          >
            Download the app
          </a>
        </p>
      </div>
    </div>
  );
}
