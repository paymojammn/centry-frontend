'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSubscriptionStatus } from '@/lib/billing-api';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify subscription was activated
    async function verifySubscription() {
      try {
        const status = await getSubscriptionStatus();

        if (status.is_active) {
          // Give user time to see success message, then redirect
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
        } else {
          setError(
            'Subscription activation is pending. Please wait a moment and refresh.'
          );
        }
      } catch (err) {
        console.error('Failed to verify subscription:', err);
        setError('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    }

    verifySubscription();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Activating your subscription...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20 rounded-lg p-6">
            <svg
              className="h-12 w-12 text-[rgb(var(--warning))] mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-[rgb(var(--warning))]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-[rgb(var(--warning))] text-white rounded-lg hover:opacity-90"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-card rounded-xl shadow-lg p-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Subscription Activated!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your subscription is now active. You have full access to all
            features.
          </p>

          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard in 3 seconds...
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    </div>
  );
}
