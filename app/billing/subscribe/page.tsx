'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/config/brand';
import {
  getSubscriptionPlans,
  getSubscriptionStatus,
  exchangeAuthCode,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/lib/billing-api';
import { getOrganizations } from '@/lib/organization-api';
import type { Organization } from '@/types/organization';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

/** Human label + tone for an org's billing state in the picker. */
function billingBadge(org: Organization): { label: string; ok: boolean } {
  if (org.billing_active !== false) {
    return { label: org.billing_status === 'trial' ? 'Trial' : 'Active', ok: true };
  }
  const labels: Record<string, string> = {
    trial: 'Trial expired',
    expired: 'Expired',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    none: 'No subscription',
  };
  return { label: labels[org.billing_status ?? ''] ?? 'Inactive', ok: false };
}
import { RiCheckLine, RiCloseLine, RiArrowRightLine, RiShieldStarLine } from '@remixicon/react';

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Derive context: is this a trial-expired user or a fresh signup?
  // The redirect reason seeds the banner, but once the selected org's real
  // status is loaded it wins — switching orgs in the picker must not keep
  // showing the previous org's "trial ended" banner.
  const reason = searchParams.get('reason');
  // Billing is per-org — the paywall redirect names the org that was denied
  // (often not the primary one). Everything on this page targets that org,
  // and in a multi-org account the picker below lets the user re-aim it.
  // NOTE: deliberately unfiltered — an org needing resubscription is exactly
  // the one the dashboard's (billing-active-only) switcher no longer offers.
  const [orgId, setOrgId] = useState<string | undefined>(
    searchParams.get('organization_id') || undefined
  );
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const isExpired = subStatus
    ? subStatus.status === 'expired' || (subStatus.is_trial && !subStatus.is_active)
    : reason === 'trial_expired' || reason === 'expired';
  const isCancelled = subStatus ? subStatus.status === 'cancelled' : reason === 'cancelled';
  const isSuspended = subStatus ? subStatus.status === 'suspended' : reason === 'suspended';
  const needsPlan = isExpired || isCancelled || isSuspended;

  // Check if already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) setIsLoggedIn(true);
  }, []);

  // Exchange auth code if present (from OAuth redirect)
  useEffect(() => {
    const authCode = searchParams.get('auth_code');
    if (!authCode) return;

    exchangeAuthCode(authCode)
      .then((response) => {
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        setIsLoggedIn(true);

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
        const [plansList] = await Promise.allSettled([getSubscriptionPlans()]);

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

      } finally {
        setLoading(false);
      }
    }

    load();
  }, [searchParams]);

  // Load the user's organizations so the picker can show what's being
  // renewed. Default the target org: URL param first, then the org that
  // actually needs payment, then the first org.
  useEffect(() => {
    if (!isLoggedIn) return;
    getOrganizations()
      .then((resp) => {
        const list = resp.results ?? [];
        setOrgs(list);
        setOrgId((current) => {
          if (current && list.some((o) => o.id === current)) return current;
          const needsPayment = list.find((o) => o.billing_active === false);
          return needsPayment?.id ?? list[0]?.id ?? current;
        });
      })
      .catch(() => {
        // Org list unavailable — the page still works against the primary org.
      });
  }, [isLoggedIn]);

  // The banner and plan CTA reflect the SELECTED org's subscription.
  useEffect(() => {
    if (!isLoggedIn) return;
    getSubscriptionStatus(orgId)
      .then(setSubStatus)
      .catch(() => setSubStatus(null));
  }, [isLoggedIn, orgId]);

  const selectedOrg = orgs.find((o) => o.id === orgId);

  const handleOrgChange = (id: string) => {
    setOrgId(id);
    // Keep the URL shareable/refreshable and drop the stale redirect reason —
    // the freshly fetched status now drives the banner.
    const url = new URL(window.location.href);
    url.searchParams.set('organization_id', id);
    url.searchParams.delete('reason');
    window.history.replaceState({}, '', url.toString());
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    const org = orgId ? `&organization_id=${orgId}` : '';
    router.push(`/billing/checkout?plan=${selectedPlan}&cycle=${billingCycle}${org}`);
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
    <div className="min-h-screen w-full flex flex-col bg-muted/30">
      {/* Header bar */}
      <header className="bg-[rgb(var(--brand-dark))] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src={BRAND.logo.mini} alt="" className="w-6 h-6" />
            </div>
            <span className="text-lg font-semibold">{BRAND.name}</span>
          </div>
          {isLoggedIn ? (
            <a href="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors">
              Dashboard
            </a>
          ) : (
            <a href="/auth/login" className="text-sm text-white/70 hover:text-white transition-colors">
              Sign in
            </a>
          )}
        </div>
      </header>

      {/* Main content — vertically centered on the remaining viewport */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          {/* Context banner for expired/cancelled users */}
          {needsPlan && (
            <div className="max-w-2xl mx-auto mb-8 bg-[rgb(var(--warning))]/10 border border-[rgb(var(--warning))]/20 rounded-xl p-5 flex items-start gap-4">
              <RiShieldStarLine className="w-6 h-6 text-[rgb(var(--warning))] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">
                  {isSuspended
                    ? 'Your subscription is suspended'
                    : isExpired
                    ? 'Your trial has ended'
                    : 'Your subscription was cancelled'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isSuspended
                    ? 'There was a problem collecting your last payment. Complete a payment below to reactivate your access.'
                    : isExpired
                    ? `Choose a plan below to continue using ${BRAND.name}. Your data is safe — pick up right where you left off.`
                    : 'Resubscribe to regain access to your organization and payment data.'}
                </p>
              </div>
            </div>
          )}

          {/* Which organization is being subscribed — critical in a
              multi-org account, where the org needing renewal is exactly the
              one the dashboard switcher no longer offers. */}
          {isLoggedIn && orgs.length > 0 && (
            <div className="max-w-md mx-auto mb-10">
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Subscribing for</p>
                  {orgs.length === 1 ? (
                    <p className="text-sm font-semibold text-foreground truncate">
                      {orgs[0]?.name}
                    </p>
                  ) : (
                    <Select value={orgId ?? ''} onValueChange={handleOrgChange}>
                      <SelectTrigger className="h-9 w-full bg-card border-border text-sm">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {orgs.map((org) => {
                          const badge = billingBadge(org);
                          return (
                            <SelectItem key={org.id} value={org.id}>
                              <span className="flex items-center gap-2">
                                <span>{org.name}</span>
                                <span
                                  className={
                                    badge.ok
                                      ? 'text-xs text-emerald-600'
                                      : 'text-xs text-amber-600'
                                  }
                                >
                                  {badge.label}
                                </span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedOrg && (
                  <span
                    className={
                      billingBadge(selectedOrg).ok
                        ? 'text-xs font-medium text-emerald-600 shrink-0'
                        : 'text-xs font-medium text-amber-600 shrink-0'
                    }
                  >
                    {billingBadge(selectedOrg).label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Payment plans</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              {needsPlan ? 'Pick a plan to continue' : 'Simple, transparent pricing'}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {needsPlan
                ? 'All plans include the same enterprise payment rails. Pick the tier that matches your scale.'
                : 'The same enterprise payment rails — for every business. Start with a 14-day free trial, no credit card required.'}
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

          {/* Plans grid — equal-height cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => {
              const price = billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
              const isSelected = selectedPlan === plan.code;
              const isContactSales = plan.cta_label?.toLowerCase().includes('contact');

              return (
                <div
                  key={plan.id}
                  onClick={() => !isContactSales && setSelectedPlan(plan.code)}
                  className={`relative bg-card rounded-2xl flex flex-col transition-all ${
                    isContactSales ? '' : 'cursor-pointer'
                  } ${
                    isSelected && !isContactSales
                      ? 'ring-2 ring-[rgb(var(--brand-dark))] shadow-lg'
                      : plan.is_featured
                        ? 'border-2 border-[rgb(var(--brand-dark))] shadow-md'
                        : 'border border-border hover:border-[rgb(var(--brand-dark))]/40 hover:shadow-md'
                  }`}
                >
                  {plan.is_featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-[rgb(var(--brand-dark))] text-white text-xs font-semibold px-4 py-1 rounded-full tracking-wide whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-7 flex flex-col flex-1">
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
                    {billingCycle === 'annual' ? (
                      <p className="text-xs text-muted-foreground mb-4">
                        {fmtPrice(String(parseFloat(price) / 12))}/mo billed annually
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-4">billed monthly</p>
                    )}

                    {/* Transaction fee */}
                    <div className="bg-muted/60 rounded-lg px-4 py-3 mb-5">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                        Transaction fee
                      </p>
                      <p className="text-base font-bold text-foreground">{fmtFee(plan.transaction_fee)} per payment</p>
                    </div>

                    {/* Feature list — grows to fill card */}
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

                    {/* CTA — always at the bottom */}
                    {isContactSales ? (
                      <a
                        href={`mailto:${BRAND.email.sales}`}
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
                className="inline-flex items-center gap-2 px-10 py-4 bg-[rgb(var(--brand-dark))] text-white text-base font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg"
              >
                {isExpired || isCancelled ? 'Subscribe Now' : isLoggedIn ? 'Subscribe Now' : 'Continue to Payment'}
                <RiArrowRightLine className="w-5 h-5" />
              </button>
              {!isExpired && !isCancelled && !isLoggedIn && (
                <p className="mt-3 text-sm text-muted-foreground">14-day free trial available. Cancel anytime.</p>
              )}
            </div>
          )}

          {/* Footer link */}
          <div className="mt-8 text-center">
            {isLoggedIn ? (
              <p className="text-sm text-muted-foreground">
                <a href="/dashboard" className="text-[rgb(var(--brand-dark))] hover:underline font-medium">
                  Back to Dashboard
                </a>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <a href="/auth/login" className="text-[rgb(var(--brand-dark))] hover:underline font-medium">
                  Sign in
                </a>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
