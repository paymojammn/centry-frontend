'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/config/brand';
import {
  getSubscriptionPlans,
  startCheckout,
  getCheckoutStatus,
  SubscriptionPlan,
  PaymentMethodCode,
  CheckoutSessionResponse,
} from '@/lib/billing-api';
import { paymentSourcesApi } from '@/lib/payment-sources-api';
import type { PaymentSource } from '@/types/payment-sources';
import PaymentSourcePicker from '@/components/shared/PaymentSourcePicker';
import {
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowLeftLine,
} from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CheckoutStep = 'method' | 'phone' | 'processing' | 'success' | 'failed';

/**
 * Map a unified PaymentSource to the billing checkout PaymentMethodCode.
 */
function sourceToMethodCode(source: PaymentSource): PaymentMethodCode {
  if (source.type === 'mobile_money') {
    return source.provider === 'airtel' ? 'airtel_money' : 'mtn_momo';
  }
  if (source.type === 'ozow') return 'ozow_eft';
  // bank_account, paystack, netcash — fall back to manual for now
  return 'mtn_momo'; // should not happen if source picker filters correctly
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [step, setStep] = useState<CheckoutStep>('method');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [loading, setLoading] = useState(true);

  // Load plan + Centry's payment sources (from BILLING_ORGANIZATION_ID org)
  useEffect(() => {
    Promise.all([
      getSubscriptionPlans(),
      paymentSourcesApi.getPaymentSources(), // No org param = Centry's default / user's org
    ]).then(([plans, sourcesResp]) => {
      setPlan(plans.find((p) => p.code === planCode) || plans[0] || null);
      setSources(sourcesResp.sources || []);
      setLoading(false);
    });
  }, [planCode]);

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

  const handleSourceSelect = (source: PaymentSource) => {
    setSelectedSource(source);
    setError('');
    if (source.type === 'bank_account') {
      // Bank account = manual payment (show bank details page)
      router.push(`/billing/checkout/manual?plan=${planCode}&cycle=${billingCycle}`);
      return;
    }
    if (source.requires_phone) {
      setStep('phone');
    } else {
      handlePay(source);
    }
  };

  const handlePay = async (sourceOverride?: PaymentSource) => {
    const source = sourceOverride || selectedSource;
    if (!source || !plan) return;

    if (source.requires_phone && !phone.match(/^\d{10,15}$/)) {
      setError('Enter a valid phone number (e.g. 256701234567)');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const methodCode = sourceToMethodCode(source);
      const result = await startCheckout(
        plan.code, billingCycle, methodCode,
        source.requires_phone ? phone : undefined
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

  if (loading || !plan) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
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
            <span className="text-lg font-semibold">Centry</span>
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
          </div>

          {/* Step: Choose payment source */}
          {step === 'method' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Choose payment method</h2>
              <p className="text-sm text-muted-foreground mb-6">Select how you'd like to pay for your subscription.</p>
              <PaymentSourcePicker
                sources={sources}
                mode="collection"
                onSelect={handleSourceSelect}
                emptyMessage="No payment methods available. Please contact support."
              />
            </div>
          )}

          {/* Step: Phone number */}
          {step === 'phone' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Enter your phone number</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You'll receive a USSD prompt on your {selectedSource?.provider === 'mtn' ? 'MTN' : 'Airtel'} phone.
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
              {selectedSource?.type === 'ozow' ? (
                <p className="text-sm text-muted-foreground">Redirecting to payment page...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    Check your <strong>{selectedSource?.name}</strong> phone for the USSD prompt.
                  </p>
                  <p className="text-sm text-muted-foreground">Approve the payment of <strong>{fmtPrice(price)}</strong>.</p>
                </>
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
