'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCheckoutStatus } from '@/lib/billing-api';
import { RiLoader4Line, RiCheckLine, RiCloseLine } from '@remixicon/react';

/**
 * Ozow return page — customer lands here after completing (or abandoning) bank payment.
 * Polls the checkout session for final status.
 */
export default function CheckoutReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [failureReason, setFailureReason] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('failed');
      setFailureReason('No session found');
      return;
    }

    let attempts = 0;
    const maxAttempts = 20; // 60 seconds max

    const poll = setInterval(async () => {
      attempts++;
      try {
        const result = await getCheckoutStatus(sessionId);
        if (result.status === 'completed') {
          setStatus('success');
          clearInterval(poll);
        } else if (result.status === 'failed' || result.status === 'expired') {
          setFailureReason(result.failure_reason || 'Payment was not completed');
          setStatus('failed');
          clearInterval(poll);
        } else if (attempts >= maxAttempts) {
          setFailureReason('Payment verification timed out. If you completed the payment, it may still process shortly.');
          setStatus('failed');
          clearInterval(poll);
        }
      } catch {
        if (attempts >= maxAttempts) {
          setFailureReason('Unable to verify payment status');
          setStatus('failed');
          clearInterval(poll);
        }
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [sessionId]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-6">
      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <RiLoader4Line className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Verifying payment...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <RiCheckLine className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Payment successful!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your subscription is now active. Welcome to Centry.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <RiCloseLine className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Payment not confirmed</h2>
            <p className="text-sm text-muted-foreground mb-6">{failureReason}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/billing/subscribe')}
                className="px-6 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
