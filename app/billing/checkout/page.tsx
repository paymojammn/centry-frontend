'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/config/brand';
import {
  getSubscriptionPlans,
  getBillingPaymentMethods,
  startCheckout,
  getCheckoutStatus,
  SubscriptionPlan,
  BillingPaymentMethod,
  CheckoutSessionResponse,
} from '@/lib/billing-api';
import { getOrganizations } from '@/lib/organization-api';
import {
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiSmartphoneLine,
  RiBankLine,
  RiExchangeDollarLine,
} from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CheckoutStep = 'method' | 'phone' | 'processing' | 'success' | 'failed';

const METHOD_ICONS: Record<string, typeof RiSmartphoneLine> = {
  mtn: RiSmartphoneLine,
  airtel: RiSmartphoneLine,
  ozow: RiBankLine,
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';
  // Per-org billing: carried from the paywall redirect via /billing/subscribe.
  const orgId = searchParams.get('organization_id') || undefined;
  const [orgName, setOrgName] = useState<string | null>(null);

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [methods, setMethods] = useState<BillingPaymentMethod[]>([]);
  const [manualAvailable, setManualAvailable] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<BillingPaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [loading, setLoading] = useState(true);

  // Load the plan plus the rails we can actually charge. These are our own
  // provider accounts, not whatever the customer has linked — and the methods
  // endpoint sits under /api/billing/ so an expired trial can still load it.
  useEffect(() => {
    Promise.all([getSubscriptionPlans(), getBillingPaymentMethods()])
      .then(([plans, methodsResp]) => {
        setPlan(plans.find((p) => p.code === planCode) || plans[0] || null);
        setMethods(methodsResp.methods || []);
        setManualAvailable(Boolean(methodsResp.manual?.available));
      })
      .catch((err: any) => {
        setLoadError(err?.message || 'We could not load this page. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [planCode]);

  // Name the org being paid for — in a multi-org account the payer must
  // see which company this subscription lands on.
  useEffect(() => {
    if (!orgId) return;
    getOrganizations()
      .then((resp) => {
        const org = (resp.results ?? []).find((o) => o.id === orgId);
        if (org) setOrgName(org.name);
      })
      .catch(() => {
        // Best-effort label; checkout still works without it.
      });
  }, [orgId]);

  // Poll for status when processing
  useEffect(() => {
    if (step !== 'processing' || !session) return;
    const interval = setInterval(async () => {
      try {
        const status = await getCheckoutStatus(session.session_id);
        if (status.status === 'completed') { setStep('success'); clearInterval(interval); }
        else if (status.status === 'failed' || status.status === 'expired') {
          setFailureReason(status.failure_reason || 'Payment was not completed');
          setStep('failed');
          clearInterval(interval);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, session]);

  const price = plan
    ? billingCycle === 'annual' ? plan.annual_price : plan.monthly_price
    : '0';

  const fmtPrice = (p: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(p));

  const goManual = () =>
    router.push(
      `/billing/checkout/manual?plan=${planCode}&cycle=${billingCycle}` +
        (orgId ? `&organization_id=${orgId}` : '')
    );

  const handleMethodSelect = (method: BillingPaymentMethod) => {
    setSelectedMethod(method);
    setError('');
    if (method.requires_phone) {
      setStep('phone');
    } else {
      handlePay(method);
    }
  };

  const handlePay = async (methodOverride?: BillingPaymentMethod) => {
    const method = methodOverride || selectedMethod;
    if (!method || !plan) return;

    if (method.requires_phone && !phone.match(/^\d{10,15}$/)) {
      setError('Enter a valid phone number (e.g. 256701234567)');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const result = await startCheckout(
        plan.code, billingCycle, method.code,
        method.requires_phone ? phone : undefined,
        orgId
      );
      setSession(result);

      if (result.redirect_url) {
        window.location.href = result.redirect_url;
        return;
      }
      if (result.status === 'failed') {
        setFailureReason('Failed to initiate payment. Please try again.');
        setStep('failed');
      }
    } catch (err: any) {
      setFailureReason(err.message || 'Something went wrong');
      setStep('failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !plan) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <RiCloseLine className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Checkout is unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {loadError || 'That plan could not be found.'}
          </p>
          <Button onClick={() => router.push('/billing/subscribe')}>Back to plans</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-[rgb(var(--brand-dark))] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src={BRAND.logo.mini} alt="" className="w-6 h-6" />
            </div>
            <span className="text-lg font-semibold">{BRAND.name}</span>
          </div>
          <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
            <RiArrowLeftLine className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Order summary */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold tracking-widest uppercase text-primary">{plan.name}</p>
              <span className="text-xs text-muted-foreground capitalize">{billingCycle}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">{fmtPrice(price)}</span>
              <span className="text-sm text-muted-foreground">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
            </div>
            {orgName && (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                For organization: <span className="font-medium text-foreground">{orgName}</span>
              </p>
            )}
          </div>

          {/* Step: Choose payment method */}
          {step === 'method' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Choose payment method</h2>
              <p className="text-sm text-muted-foreground mb-6">Select how you&apos;d like to pay for your subscription.</p>

              {methods.length === 0 && !manualAvailable ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No payment methods are available right now. Please contact support and we&apos;ll take payment directly.
                </p>
              ) : (
                <div className="space-y-2">
                  {methods.map((method) => {
                    const Icon = METHOD_ICONS[method.provider] || RiExchangeDollarLine;
                    return (
                      <button
                        key={method.code}
                        onClick={() => handleMethodSelect(method)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/40 hover:shadow-sm transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-background ring-1 ring-border">
                          <Icon className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                        <RiArrowRightSLine className="w-5 h-5 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}

                  {manualAvailable && (
                    <button
                      onClick={goManual}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-foreground/40 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-background ring-1 ring-border">
                        <RiBankLine className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">Bank transfer or deposit</p>
                        <p className="text-xs text-muted-foreground">Pay into our account, then tell us the reference</p>
                      </div>
                      <RiArrowRightSLine className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step: Phone number */}
          {step === 'phone' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Enter your phone number</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You&apos;ll receive a USSD prompt on your {selectedMethod?.name} phone.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Phone number</label>
                <Input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="256701234567"
                  className="h-12" autoFocus
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Include country code</p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('method'); setError(''); }}
                  className="px-5 py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <Button onClick={() => handlePay()} className="flex-1 py-3">
                  Pay {fmtPrice(price)}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiLoader4Line className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Waiting for payment</h2>
              {selectedMethod?.requires_phone ? (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    Check your <strong>{selectedMethod?.name}</strong> phone for the USSD prompt.
                  </p>
                  <p className="text-sm text-muted-foreground">Approve the payment of <strong>{fmtPrice(price)}</strong>.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Redirecting to payment page...</p>
              )}
              <p className="mt-6 text-xs text-muted-foreground">This page updates automatically.</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiCheckLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment successful!</h2>
              <p className="text-sm text-muted-foreground mb-6">Your <strong>{plan.name}</strong> subscription is now active.</p>
              <Button onClick={() => router.push('/dashboard')} className="px-8">Go to Dashboard</Button>
            </div>
          )}

          {/* Step: Failed */}
          {step === 'failed' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <RiCloseLine className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment failed</h2>
              <p className="text-sm text-muted-foreground mb-6">{failureReason}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setStep('method'); setSession(null); setFailureReason(''); }}
                  className="px-6 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Try Again
                </button>
                <Button onClick={() => router.push('/billing/subscribe')}>Change Plan</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
