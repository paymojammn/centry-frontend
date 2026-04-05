'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSubscriptionPlans,
  getSubscriptionStatus,
  redirectToCheckout,
  exchangeAuthCode,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/lib/billing-api';
import { RiCheckLine, RiCloseLine, RiArrowRightLine, RiShieldStarLine } from '@remixicon/react';

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);

  // Derive context: is this a trial-expired user or a fresh signup?
  const reason = searchParams.get('reason');
  const isExpired = reason === 'trial_expired' || subStatus?.status === 'expired';
  const isCancelled = reason === 'cancelled' || subStatus?.status === 'cancelled';

  // Exchange auth code if present (from OAuth redirect)
  useEffect(() => {
    const authCode = searchParams.get('auth_code');
    if (!authCode) return;

    exchangeAuthCode(authCode)
      .then((response) => {
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);

        // Clean URL but preserve plan/cycle/reason
        const url = new URL(window.location.href);
        url.searchParams.delete('auth_code');
        url.searchParams.delete('subscription_required');
        window.history.replaceState({}, '', url.toString());
      })
      .catch(() => {
        setError('Authentication failed. Please try logging in again.');
      });
  }, [searchParams]);

  // Load plans + subscription status
  useEffect(() => {
    async function load() {
      try {
        const [plansList, status] = await Promise.allSettled([
          getSubscriptionPlans(),
          getSubscriptionStatus(),
        ]);

        if (plansList.status === 'fulfilled') {
          setPlans(plansList.value);

          // Pre-select from URL or default to first plan
          const urlPlan = searchParams.get('plan');
          const urlCycle = searchParams.get('cycle');
          if (urlCycle === 'annual' || urlCycle === 'monthly') setBillingCycle(urlCycle);

          const match = plansList.value.find((p) =>
            urlPlan ? p.code === urlPlan : p.is_featured
          );
          setSelectedPlan(match?.code ?? plansList.value[0]?.code ?? null);
        } else {
          setError('Failed to load subscription plans');
        }

        if (status.status === 'fulfilled') {
          setSubStatus(status.value);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [searchParams]);

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setProcessingCheckout(true);
    setError(null);
    try {
      await redirectToCheckout(selectedPlan, billingCycle);
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setProcessingCheckout(false);
    }
  };

  const fmtPrice = (price: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(
      parseFloat(price)
    );

  const fmtFee = (fee: string) => {
    const n = parseFloat(fee);
    return n > 0 ? `${n}%` : 'Custom';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--brand-dark))] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Header bar */}
      <header className="bg-[rgb(var(--brand-dark))] text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[rgb(var(--brand-dark))] font-bold text-lg">C</span>
            </div>
            <span className="text-lg font-semibold">Centry</span>
          </div>
          <a href="/auth/login" className="text-sm text-white/70 hover:text-white transition-colors">
            Sign in
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Context banner for expired/cancelled users */}
        {(isExpired || isCancelled) && (
          <div className="mb-8 bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20 rounded-xl p-5 flex items-start gap-4">
            <RiShieldStarLine className="w-6 h-6 text-[rgb(var(--warning))] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                {isExpired ? 'Your trial has ended' : 'Your subscription was cancelled'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isExpired
                  ? 'Choose a plan below to continue using Centry. Your data is safe — pick up right where you left off.'
                  : 'Resubscribe to regain access to your organization and payment data.'}
              </p>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            {isExpired || isCancelled ? 'Pick a plan to continue' : 'Choose your plan'}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {isExpired || isCancelled
              ? 'All plans include the same enterprise payment rails. Pick the tier that matches your scale.'
              : 'Start with a 14-day free trial. No credit card required. Upgrade anytime.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-center text-sm">{error}</p>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-muted p-1 rounded-xl inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-2 text-primary text-xs font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
            const isSelected = selectedPlan === plan.code;
            const isContactSales = plan.cta_label?.toLowerCase().includes('contact');

            return (
              <div
                key={plan.id}
                onClick={() => !isContactSales && setSelectedPlan(plan.code)}
                className={`relative bg-card rounded-2xl transition-all ${
                  isContactSales ? '' : 'cursor-pointer'
                } ${
                  isSelected && !isContactSales
                    ? 'ring-2 ring-[rgb(var(--brand-dark))] shadow-lg'
                    : 'border border-border hover:border-[rgb(var(--brand-dark))]/40'
                } ${plan.is_featured ? 'border-2 border-[rgb(var(--brand-dark))]' : ''}`}
              >
                {plan.is_featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[rgb(var(--brand-dark))] text-white text-xs font-semibold px-4 py-1 rounded-full tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-7">
                  {/* Tier name */}
                  <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">
                    {plan.name}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-foreground">{fmtPrice(price)}</span>
                    <span className="text-sm text-muted-foreground">
                      /{billingCycle === 'annual' ? 'yr' : 'mo'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {fmtPrice(String(parseFloat(price) / 12))}/mo billed annually
                    </p>
                  )}
                  {billingCycle === 'monthly' && <div className="mb-3" />}

                  {/* Transaction fee */}
                  <div className="bg-muted rounded-lg px-4 py-3 mb-5">
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                      Transaction fee
                    </p>
                    <p className="text-base font-bold text-foreground">{fmtFee(plan.transaction_fee)} per payment</p>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.highlight_features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80">
                        <RiCheckLine className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}

                    {plan.excluded_features.length > 0 && (
                      <>
                        <li className="border-t border-border pt-3" aria-hidden />
                        {plan.excluded_features.map((feat, i) => (
                          <li key={`ex-${i}`} className="flex items-start gap-2.5 text-sm text-muted-foreground/50">
                            <RiCloseLine className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </>
                    )}
                  </ul>

                  {/* CTA */}
                  {isContactSales ? (
                    <a
                      href="mailto:sales@getcentry.app"
                      className="block w-full py-3 px-4 rounded-xl text-center text-sm font-semibold border-2 border-[rgb(var(--brand-dark))] text-[rgb(var(--brand-dark))] hover:bg-muted transition-colors"
                    >
                      {plan.cta_label || 'Contact Sales'}
                    </a>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlan(plan.code);
                      }}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-[rgb(var(--brand-dark))] text-white shadow-sm'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select Plan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subscribe / Checkout button */}
        {selectedPlan && !plans.find((p) => p.code === selectedPlan)?.cta_label?.toLowerCase().includes('contact') && (
          <div className="mt-10 text-center">
            <button
              onClick={handleSubscribe}
              disabled={processingCheckout}
              className="inline-flex items-center gap-2 px-10 py-4 bg-[rgb(var(--brand-dark))] text-white text-base font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {processingCheckout ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  {isExpired || isCancelled ? 'Subscribe Now' : 'Start Free Trial'}
                  <RiArrowRightLine className="w-5 h-5" />
                </>
              )}
            </button>
            {!isExpired && !isCancelled && (
              <p className="mt-3 text-sm text-muted-foreground">No credit card required for trial. Cancel anytime.</p>
            )}
          </div>
        )}

        {/* Footer link */}
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <a href="/auth/login" className="text-[rgb(var(--brand-dark))] hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
